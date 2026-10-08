package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ServerRegistry 聚合多个 ToolProvider 到同一个 /mcp 端点。
// 工具按 namespace 隔离：注册 namespace="kb" 的 "search" 对外名为 "kb::search"；
// namespace 为空时直接使用本地名。
type ServerRegistry struct {
	mu        sync.RWMutex
	providers map[string]ToolProvider // namespace → provider
	resources ResourceProvider
	prompts   PromptProvider
	tasks     map[string]*Task
}

// NewServerRegistry 创建注册表。
func NewServerRegistry() *ServerRegistry {
	return &ServerRegistry{
		providers: make(map[string]ToolProvider),
		tasks:     make(map[string]*Task),
	}
}

// Register 注册一个命名空间下的工具来源。
func (r *ServerRegistry) Register(namespace string, p ToolProvider) {
	if p == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[namespace] = p
}

// Unregister 移除一个命名空间。
func (r *ServerRegistry) Unregister(namespace string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.providers, namespace)
}

// RegisterResourceProvider 注册资源后端。
func (r *ServerRegistry) RegisterResourceProvider(p ResourceProvider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.resources = p
}

// RegisterPromptProvider 注册提示词后端。
func (r *ServerRegistry) RegisterPromptProvider(p PromptProvider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.prompts = p
}

// Tools 返回聚合后的全部工具（带 namespace 前缀）。
func (r *ServerRegistry) Tools() []Tool {
	r.mu.RLock()
	namespaces := make([]string, 0, len(r.providers))
	for ns := range r.providers {
		namespaces = append(namespaces, ns)
	}
	r.mu.RUnlock()
	sortStrings(namespaces)

	out := make([]Tool, 0)
	for _, ns := range namespaces {
		r.mu.RLock()
		p := r.providers[ns]
		r.mu.RUnlock()
		if p == nil {
			continue
		}
		for _, t := range p.ListTools() {
			if ns != "" {
				t.Name = ns + "::" + t.Name
			}
			out = append(out, t)
		}
	}
	return out
}

// resolveTool 把对外工具名解析为 (provider, 本地名)。
func (r *ServerRegistry) resolveTool(full string) (ToolProvider, string, bool) {
	ns, local := "", full
	if idx := indexOfSeparator(full); idx >= 0 {
		ns, local = full[:idx], full[idx+2:]
	}
	r.mu.RLock()
	p, ok := r.providers[ns]
	r.mu.RUnlock()
	if !ok || p == nil {
		return nil, "", false
	}
	return p, local, true
}

// indexOfSeparator 返回 "::" 的位置；不存在返回 -1。
func indexOfSeparator(s string) int {
	for i := 0; i+1 < len(s); i++ {
		if s[i] == ':' && s[i+1] == ':' {
			return i
		}
	}
	return -1
}

// CreateTask 创建一个长任务句柄（跨调用状态显式建模，不依赖传输层会话）。
func (r *ServerRegistry) CreateTask() *Task {
	t := &Task{
		TaskID:    uuid.NewString(),
		Status:    TaskStatusWorking,
		TTL:       600_000,
		PollAfter: 1000,
		CreatedAt: time.Now().UnixMilli(),
	}
	r.mu.Lock()
	r.tasks[t.TaskID] = t
	r.mu.Unlock()
	return t
}

// Task 返回任务句柄。
func (r *ServerRegistry) Task(id string) (*Task, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.tasks[id]
	if !ok || t == nil {
		return nil, false
	}
	cp := *t
	return &cp, true
}

// Server 是 MCP 服务端，暴露唯一端点 POST /mcp。
type Server struct {
	registry *ServerRegistry
	idem     *idempotencyStore
	dualEra  bool
	now      func() time.Time
}

// ServerOption 配置 Server。
type ServerOption func(*Server)

// WithDualEra 控制是否兼容旧版协议头（默认开启，用于生产 Dual-era 迁移）。
func WithDualEra(enabled bool) ServerOption {
	return func(s *Server) { s.dualEra = enabled }
}

// NewServer 创建 MCP 服务端。
func NewServer(reg *ServerRegistry, opts ...ServerOption) *Server {
	if reg == nil {
		reg = NewServerRegistry()
	}
	s := &Server{
		registry: reg,
		idem:     newIdempotencyStore(10 * time.Minute),
		dualEra:  true,
		now:      time.Now,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(s)
		}
	}
	return s
}

// Registry 返回底层注册表，便于运行时动态注册工具。
func (s *Server) Registry() *ServerRegistry { return s.registry }

// Handle 是 POST /mcp 的 Gin handler。
//
// 协议约定：
//   - JSON-RPC 业务错误一律返回 HTTP 200，错误放在 body.error
//   - 只有请求体解析失败才返回 400（此时无法确定 id，只能回 null）
//   - 未知协议版本返回 -32600；Mcp-Method 与 body.method 冲突同样返回 -32600
func (s *Server) Handle(c *gin.Context) {
	raw, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			JSONRPC: JSONRPCVersion, ID: nil,
			Error: NewRPCError(ErrCodeParse, "请求体读取失败："+err.Error()),
		})
		return
	}
	var req Request
	if err := json.Unmarshal(raw, &req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			JSONRPC: JSONRPCVersion, ID: nil,
			Error: NewRPCError(ErrCodeParse, "JSON 解析失败："+err.Error()),
		})
		return
	}
	if req.JSONRPC != "" && req.JSONRPC != JSONRPCVersion {
		s.writeResult(c, req.ID, nil, NewRPCError(ErrCodeInvalidRequest, "jsonrpc 必须为 2.0"))
		return
	}

	// 版本协商：缺失按当前版本处理；已知旧版走 Dual-era；完全未知拒绝。
	version := c.GetHeader(HeaderProtocolVersion)
	legacy := false
	if version == "" {
		version = ProtocolVersion
	} else if version != ProtocolVersion {
		if !isLegacyVersion(version) || !s.dualEra {
			s.writeResult(c, req.ID, nil, NewRPCError(ErrCodeInvalidRequest,
				"不支持的协议版本 "+version+"，本服务端为 "+ProtocolVersion))
			return
		}
		legacy = true
	}

	// Mcp-Method 必须与方法名一致（网关据此路由，冲突说明请求被篡改）
	if headerMethod := c.GetHeader(HeaderMethod); headerMethod != "" && headerMethod != req.Method {
		s.writeResult(c, req.ID, nil, NewRPCError(ErrCodeInvalidRequest,
			"请求头 Mcp-Method 与 body.method 不一致"))
		return
	}

	result, rpcErr := s.dispatch(c.Request.Context(), req, c.GetHeader(HeaderName))
	if rpcErr != nil {
		s.writeResult(c, req.ID, nil, rpcErr)
		return
	}
	if legacy {
		result = withWarning(result, "服务端已升级到 MCP "+ProtocolVersion+"，请尽快迁移客户端（当前请求使用 "+version+"）")
		c.Header(HeaderProtocolVersion, ProtocolVersion)
	}
	s.writeResult(c, req.ID, result, nil)
}

// writeResult 统一输出 JSON-RPC 响应。
func (s *Server) writeResult(c *gin.Context, id any, result any, rpcErr *RPCError) {
	c.Header(HeaderProtocolVersion, ProtocolVersion)
	c.JSON(http.StatusOK, Response{JSONRPC: JSONRPCVersion, ID: id, Result: result, Error: rpcErr})
}

// dispatch 按方法名分发。
func (s *Server) dispatch(ctx context.Context, req Request, headerName string) (any, *RPCError) {
	switch req.Method {
	case MethodDiscover:
		return DiscoverResponse{DiscoverResult: DiscoverResult{
			ProtocolVersion: ProtocolVersion,
			ServerInfo:      ServerInfo{Name: ServerName, Version: ServerVersion},
			Capabilities: Capabilities{
				Tools:     &ToolsCapability{ListChanged: true},
				Resources: &ResourcesCapability{Subscribe: false},
				Prompts:   &PromptsCapability{ListChanged: true},
				Tasks:     &TasksCapability{Cancelable: true},
			},
			Methods:    SupportedMethods,
			Extensions: []string{},
		}}, nil

	case MethodToolsList:
		return ToolsListResponse{ToolsListResult: ToolsListResult{Tools: s.registry.Tools()}}, nil

	case MethodToolsCall:
		return s.callTool(ctx, req.Params, headerName)

	case MethodResourcesList:
		p := s.resourceProvider()
		if p == nil {
			return ResourcesListResult{Resources: []Resource{}}, nil
		}
		return ResourcesListResult{Resources: p.ListResources()}, nil

	case MethodResourcesRead:
		p := s.resourceProvider()
		if p == nil {
			return nil, NewRPCError(ErrCodeMethodNotFound, "服务端未配置资源能力")
		}
		var params ReadResourceParams
		if err := decodeParams(req.Params, &params); err != nil {
			return nil, err
		}
		if params.URI == "" {
			return nil, NewRPCError(ErrCodeInvalidParams, "参数 uri 必填")
		}
		contents, err := p.ReadResource(params.URI)
		if err != nil {
			return nil, asRPCError(err)
		}
		return ResourcesReadResult{Contents: contents}, nil

	case MethodPromptsList:
		p := s.promptProvider()
		if p == nil {
			return PromptsListResult{Prompts: []Prompt{}}, nil
		}
		return PromptsListResult{Prompts: p.ListPrompts()}, nil

	case MethodPromptsGet:
		p := s.promptProvider()
		if p == nil {
			return nil, NewRPCError(ErrCodeMethodNotFound, "服务端未配置提示词能力")
		}
		var params GetPromptParams
		if err := decodeParams(req.Params, &params); err != nil {
			return nil, err
		}
		if params.Name == "" {
			return nil, NewRPCError(ErrCodeInvalidParams, "参数 name 必填")
		}
		out, err := p.GetPrompt(params.Name, params.Arguments)
		if err != nil {
			return nil, asRPCError(err)
		}
		return out, nil

	case MethodTasksGet:
		var params TaskParams
		if err := decodeParams(req.Params, &params); err != nil {
			return nil, err
		}
		if params.TaskID == "" {
			return nil, NewRPCError(ErrCodeInvalidParams, "参数 taskId 必填")
		}
		t, ok := s.registry.Task(params.TaskID)
		if !ok {
			return nil, NewRPCError(ErrCodeInvalidParams, "任务不存在："+params.TaskID)
		}
		return t, nil

	case MethodPing:
		return map[string]any{}, nil

	default:
		return nil, NewRPCError(ErrCodeMethodNotFound, "不支持的方法："+req.Method)
	}
}

// callTool 执行 tools/call：幂等 → 解析 → 执行 → 缓存。
func (s *Server) callTool(ctx context.Context, raw json.RawMessage, headerName string) (any, *RPCError) {
	var params CallToolParams
	if err := decodeParams(raw, &params); err != nil {
		return nil, err
	}
	// 工具名可来自 body，也可来自 Mcp-Name 头（网关路由场景）
	name := params.Name
	if name == "" {
		name = headerName
	}
	if name == "" {
		return nil, NewRPCError(ErrCodeInvalidParams, "缺少工具名（params.name 或请求头 Mcp-Name）")
	}
	if params.Arguments == nil {
		params.Arguments = map[string]any{}
	}

	// MRTR：把客户端补齐的输入放进 ctx 透传给 provider
	if len(params.InputResponses) > 0 {
		ctx = withInputResponses(ctx, params.InputResponses)
	}

	// 幂等：副作用工具必须自带幂等键，重复调用直接回放首次结果
	idemKey := ""
	if params.Meta != nil {
		idemKey = params.Meta.IdempotencyKey
	}
	if idemKey != "" {
		if cached, hit := s.idem.load(idemKey); hit {
			var replay CallToolResult
			if err := json.Unmarshal(cached, &replay); err == nil {
				return CallToolResponse{CallToolResult: replay}, nil
			}
		}
	}

	provider, localName, ok := s.registry.resolveTool(name)
	if !ok {
		return nil, NewRPCError(ErrCodeMethodNotFound, "工具不存在："+name)
	}

	result, err := provider.CallTool(ctx, localName, params.Arguments)
	if err != nil {
		return nil, asRPCError(err)
	}
	if result == nil {
		return nil, NewRPCError(ErrCodeInternal, "工具 "+name+" 返回空结果")
	}

	// 只有终态结果才写入幂等缓存，input_required 这类非终态不缓存
	if idemKey != "" && result.ResultType != ResultTypeInputRequired {
		s.idem.store(idemKey, result)
	}
	return CallToolResponse{CallToolResult: *result}, nil
}

// resourceProvider 返回资源后端（可能为 nil）。
func (s *Server) resourceProvider() ResourceProvider {
	s.registry.mu.RLock()
	defer s.registry.mu.RUnlock()
	return s.registry.resources
}

// promptProvider 返回提示词后端（可能为 nil）。
func (s *Server) promptProvider() PromptProvider {
	s.registry.mu.RLock()
	defer s.registry.mu.RUnlock()
	return s.registry.prompts
}

// decodeParams 把 params 反序列化；为空或 null 时保持零值。
func decodeParams(raw json.RawMessage, out any) *RPCError {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return NewRPCError(ErrCodeInvalidParams, "参数解析失败："+err.Error())
	}
	return nil
}

// asRPCError 把任意 error 转成 RPCError；已是 RPCError 时原样返回。
func asRPCError(err error) *RPCError {
	if err == nil {
		return nil
	}
	var rpcErr *RPCError
	if errors.As(err, &rpcErr) {
		return rpcErr
	}
	return NewRPCError(ErrCodeInternal, err.Error())
}

// isLegacyVersion 判断是否为可兼容的旧版协议。
func isLegacyVersion(v string) bool {
	for _, known := range LegacyProtocolVersions {
		if v == known {
			return true
		}
	}
	return false
}

// withWarning 给结果附加 warning 字段（Dual-era 迁移提示）。
// 通过「重新序列化 + 注入字段」实现，避免为每个响应类型手写一个包装结构。
func withWarning(result any, warning string) any {
	raw, err := json.Marshal(result)
	if err != nil {
		return result
	}
	var generic map[string]any
	if err := json.Unmarshal(raw, &generic); err != nil {
		return result
	}
	generic["warning"] = warning
	return generic
}

// sortStrings 原地升序排序字符串切片。
func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}
