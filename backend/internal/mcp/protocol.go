// Package mcp 实现 MCP（Model Context Protocol）规范版本 **2026-07-28**。
//
// 与旧版（2025-11-25）的关键差异，本包严格遵循：
//  1. 传输只实现 Streamable HTTP：单个端点 POST /mcp；不实现已弃用的 HTTP+SSE，不实现 stdio
//  2. 无状态：没有 initialize 握手，不返回 Mcp-Session-Id，每个请求自包含
//  3. 路由头：MCP-Protocol-Version / Mcp-Method / Mcp-Name，网关无需解析 body 即可路由限流
//  4. 能力发现用 server/discover 取代握手返回值
//  5. MRTR：服务端不反向索取输入，而是返回 input_required + requestState，客户端重发原请求
//  6. 跨调用状态必须显式建模为业务句柄（taskId / browserId），不可依赖传输层会话
//
// MCP 与 A2A 的分工：MCP 是 Agent ↔ 工具（纵向，类 USB-C）；A2A 是 Agent ↔ Agent（横向，类 HTTP）。
package mcp

import (
	"context"
	"encoding/json"
)

// ProtocolVersion 是本实现遵循的规范版本。
const ProtocolVersion = "2026-07-28"

// LegacyProtocolVersions 是仍以 Dual-era 方式兼容的旧版本。
// 迁移期服务端同时接受新旧客户端，并在响应中附带 warning 提示升级。
var LegacyProtocolVersions = []string{"2025-11-25", "2025-06-18", "2025-03-26"}

// 请求头常量。
const (
	HeaderProtocolVersion  = "MCP-Protocol-Version"
	HeaderMethod           = "Mcp-Method"
	HeaderName             = "Mcp-Name"
	HeaderIdempotentReplay = "Mcp-Idempotent-Replay"
)

// JSON-RPC 2.0 版本标识。
const JSONRPCVersion = "2.0"

// 方法名常量。
const (
	MethodDiscover      = "server/discover"
	MethodToolsList     = "tools/list"
	MethodToolsCall     = "tools/call"
	MethodResourcesList = "resources/list"
	MethodResourcesRead = "resources/read"
	MethodPromptsList   = "prompts/list"
	MethodPromptsGet    = "prompts/get"
	MethodTasksGet      = "tasks/get"
	MethodPing          = "ping"
)

// SupportedMethods 是本服务端支持的全部方法。
var SupportedMethods = []string{
	MethodDiscover, MethodToolsList, MethodToolsCall,
	MethodResourcesList, MethodResourcesRead,
	MethodPromptsList, MethodPromptsGet,
	MethodTasksGet, MethodPing,
}

// JSON-RPC 2.0 标准错误码。
const (
	ErrCodeParse          = -32700
	ErrCodeInvalidRequest = -32600
	ErrCodeMethodNotFound = -32601
	ErrCodeInvalidParams  = -32602
	ErrCodeInternal       = -32603
)

// Request 是 JSON-RPC 请求信封。
type Request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// Response 是 JSON-RPC 响应信封。
type Response struct {
	JSONRPC string    `json:"jsonrpc"`
	ID      any       `json:"id"`
	Result  any       `json:"result,omitempty"`
	Error   *RPCError `json:"error,omitempty"`
}

// RPCError 是 JSON-RPC 错误对象，同时实现 error 接口便于 Go 侧传播。
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// Error 实现 error 接口。
func (e *RPCError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

// NewRPCError 构造一个错误对象。
func NewRPCError(code int, message string) *RPCError {
	return &RPCError{Code: code, Message: message}
}

// Tool 是一个工具定义；InputSchema 为标准 JSON Schema。
type Tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema"`
}

// Content 是工具结果中的一个内容块。
type Content struct {
	Type     string `json:"type"` // text / image / resource
	Text     string `json:"text,omitempty"`
	MimeType string `json:"mimeType,omitempty"`
	Data     string `json:"data,omitempty"` // base64（image 时使用）
}

// InputRequest 是 MRTR 下服务端向客户端索取的一项输入。
type InputRequest struct {
	ID       string `json:"id"`
	Type     string `json:"type"` // text / choice / confirm
	Prompt   string `json:"prompt"`
	Required bool   `json:"required"`
}

// InputResponse 是客户端补齐的一项输入。
type InputResponse struct {
	ID    string `json:"id"`
	Value any    `json:"value,omitempty"`
}

// ResultTypeInputRequired 是 MRTR 的非终态结果类型。
const ResultTypeInputRequired = "input_required"

// CallToolResult 是 tools/call 的结果。
type CallToolResult struct {
	Content []Content `json:"content"`
	IsError bool      `json:"isError"`

	// MRTR：需要用户输入时置位，客户端收齐后重发原请求并带上 inputResponses + requestState
	ResultType    string         `json:"resultType,omitempty"`
	InputRequests []InputRequest `json:"inputRequests,omitempty"`
	RequestState  string         `json:"requestState,omitempty"`
}

// RequestMeta 是 params._meta，承载幂等键与追踪信息。
type RequestMeta struct {
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	ProgressToken  string `json:"progressToken,omitempty"`
}

// CallToolParams 是 tools/call 的参数。
type CallToolParams struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments,omitempty"`
	Meta      *RequestMeta   `json:"_meta,omitempty"`

	// MRTR 重发字段
	InputResponses []InputResponse `json:"inputResponses,omitempty"`
	RequestState   string          `json:"requestState,omitempty"`
}

// ToolsListResult 是 tools/list 的结果。
type ToolsListResult struct {
	Tools []Tool `json:"tools"`
}

// Resource 是一个资源描述。
type Resource struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	MimeType    string `json:"mimeType,omitempty"`
	Description string `json:"description,omitempty"`
}

// ResourceContents 是 resources/read 返回的内容。
type ResourceContents struct {
	URI      string `json:"uri"`
	MimeType string `json:"mimeType,omitempty"`
	Text     string `json:"text,omitempty"`
}

// ResourcesListResult 是 resources/list 的结果。
type ResourcesListResult struct {
	Resources []Resource `json:"resources"`
}

// ResourcesReadResult 是 resources/read 的结果。
type ResourcesReadResult struct {
	Contents []ResourceContents `json:"contents"`
}

// ReadResourceParams 是 resources/read 的参数。
type ReadResourceParams struct {
	URI string `json:"uri"`
}

// PromptArgument 描述提示词的一个参数。
type PromptArgument struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required"`
}

// Prompt 是一个提示词定义。
type Prompt struct {
	Name        string           `json:"name"`
	Description string           `json:"description,omitempty"`
	Arguments   []PromptArgument `json:"arguments,omitempty"`
}

// PromptsListResult 是 prompts/list 的结果。
type PromptsListResult struct {
	Prompts []Prompt `json:"prompts"`
}

// PromptContent 是提示词消息的内容。
type PromptContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// PromptMessage 是提示词渲染出的一条消息。
type PromptMessage struct {
	Role    string        `json:"role"`
	Content PromptContent `json:"content"`
}

// PromptResult 是 prompts/get 的结果。
type PromptResult struct {
	Description string          `json:"description,omitempty"`
	Messages    []PromptMessage `json:"messages"`
}

// GetPromptParams 是 prompts/get 的参数。
type GetPromptParams struct {
	Name      string            `json:"name"`
	Arguments map[string]string `json:"arguments,omitempty"`
}

// TaskStatus 是 MCP Tasks 扩展的任务状态。
type TaskStatus string

// MCP Tasks 状态常量。
const (
	TaskStatusWorking       TaskStatus = "working"
	TaskStatusInputRequired TaskStatus = "input_required"
	TaskStatusCompleted     TaskStatus = "completed"
	TaskStatusFailed        TaskStatus = "failed"
	TaskStatusCancelled     TaskStatus = "cancelled"
)

// Task 是一个长任务句柄（2026-07-28 的 Tasks 正式扩展）。
type Task struct {
	TaskID    string     `json:"taskId"`
	Status    TaskStatus `json:"status"`
	TTL       int        `json:"ttlMs"`
	PollAfter int        `json:"pollAfterMs"`
	CreatedAt int64      `json:"createdAt"`
}

// TaskParams 是 tasks/get 的参数。
type TaskParams struct {
	TaskID string `json:"taskId"`
}

// ServerInfo 描述服务端身份。
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// Capabilities 声明服务端能力。
type Capabilities struct {
	Tools     *ToolsCapability     `json:"tools,omitempty"`
	Resources *ResourcesCapability `json:"resources,omitempty"`
	Prompts   *PromptsCapability   `json:"prompts,omitempty"`
	Tasks     *TasksCapability     `json:"tasks,omitempty"`
}

// ToolsCapability 声明工具能力。
type ToolsCapability struct {
	ListChanged bool `json:"listChanged"`
}

// ResourcesCapability 声明资源能力；2026-07-28 起 subscribe 被 subscriptions/listen 取代。
type ResourcesCapability struct {
	Subscribe bool `json:"subscribe"`
}

// PromptsCapability 声明提示词能力。
type PromptsCapability struct {
	ListChanged bool `json:"listChanged"`
}

// TasksCapability 声明长任务能力。
type TasksCapability struct {
	Cancelable bool `json:"cancelable"`
}

// DiscoverResult 是 server/discover 的结果，取代旧版 initialize 的握手返回值。
type DiscoverResult struct {
	ProtocolVersion string       `json:"protocolVersion"`
	ServerInfo      ServerInfo   `json:"serverInfo"`
	Capabilities    Capabilities `json:"capabilities"`
	Methods         []string     `json:"methods"`
	Extensions      []string     `json:"extensions"`
}

// ServerName 是本服务端的名称标识。
const ServerName = "interview-demo-mcp"

// ServerVersion 是本服务端的版本。
const ServerVersion = "1.0.0"

// DiscoverResponse 是带 Dual-era 提示的能力发现响应。
// 旧版客户端会在顶层额外收到 warning 字段。
type DiscoverResponse struct {
	DiscoverResult
	Warning string `json:"warning,omitempty"`
}

// ToolsListResponse 是带 Dual-era 提示的工具列表响应。
type ToolsListResponse struct {
	ToolsListResult
	Warning string `json:"warning,omitempty"`
}

// CallToolResponse 是带 Dual-era 提示的工具调用响应。
type CallToolResponse struct {
	CallToolResult
	Warning string `json:"warning,omitempty"`
}

// ToolProvider 是工具来源的抽象。
// internal/tool 通过实现该接口接入，本包反向不依赖任何其他业务包。
type ToolProvider interface {
	// ListTools 返回该 provider 暴露的工具（使用本地名，不含 namespace 前缀）。
	ListTools() []Tool
	// CallTool 执行工具；arguments 已确保非 nil。
	// ctx 中可能携带 MRTR 的 inputResponses，用 InputResponsesFrom(ctx) 取出。
	CallTool(ctx context.Context, name string, arguments map[string]any) (*CallToolResult, error)
}

// ResourceProvider 是资源来源的抽象。
type ResourceProvider interface {
	ListResources() []Resource
	ReadResource(uri string) ([]ResourceContents, error)
}

// PromptProvider 是提示词来源的抽象。
type PromptProvider interface {
	ListPrompts() []Prompt
	GetPrompt(name string, arguments map[string]string) (*PromptResult, error)
}
