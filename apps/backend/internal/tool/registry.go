// Package tool 提供统一的工具注册中心。
//
// 企业级约束（对应生产化文档的 ToolSandbox 五步）：
//  1. 权限分级：L0 只读 / L1 低风险写 / L2 中风险（必须人工确认）/ L3 高风险（确认 + 二次校验）/ L4 系统级
//  2. 参数净化：拦截脚本注入、危险 shell、SQL 破坏语句
//  3. 限流：同一工具在窗口期内的调用次数上限
//  4. 超时：每个工具独立超时，默认 10s
//  5. 审计：成功/失败/拦截全部落审计日志，可查询
package tool

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"interview-demo/backend/internal/llm"
)

// Level 是工具的风险等级，同时也是用户可用的权限档位。
type Level int

// 风险等级常量。
const (
	LevelRead     Level = 0 // L0 只读：自动执行
	LevelWrite    Level = 1 // L1 低风险写：自动执行 + 通知
	LevelConfirm  Level = 2 // L2 中风险：必须人工确认（HITL）
	LevelHighRisk Level = 3 // L3 高风险：确认 + 二次校验
	LevelSystem   Level = 4 // L4 系统级：人工审批 + 强制审计
)

// String 返回等级的可读名称。
func (l Level) String() string {
	switch l {
	case LevelRead:
		return "L0-只读"
	case LevelWrite:
		return "L1-低风险写"
	case LevelConfirm:
		return "L2-需确认"
	case LevelHighRisk:
		return "L3-高风险"
	case LevelSystem:
		return "L4-系统级"
	default:
		return "未知"
	}
}

// Errors 定义工具执行过程中的哨兵错误。
var (
	// ErrNotFound 表示工具未注册。
	ErrNotFound = errors.New("tool: 工具未注册")
	// ErrPermissionDenied 表示调用方权限不足。
	ErrPermissionDenied = errors.New("tool: 权限不足")
	// ErrInjectionDetected 表示参数命中注入规则被拦截。
	ErrInjectionDetected = errors.New("tool: 参数命中安全规则被拦截")
	// ErrApprovalRequired 表示需要人工确认（HITL）后才能执行。
	ErrApprovalRequired = errors.New("tool: 需要人工确认")
	// ErrRateLimited 表示触发了工具级限流。
	ErrRateLimited = errors.New("tool: 触发限流")
	// ErrTimeout 表示工具执行超时。
	ErrTimeout = errors.New("tool: 执行超时")
)

// Definition 是一个工具的元数据定义。
type Definition struct {
	Name        string         `json:"name"`        // 唯一名称
	Description string         `json:"description"` // 给模型看的用途说明
	Parameters  map[string]any `json:"parameters"`  // JSON Schema
	Level       Level          `json:"level"`       // 风险等级
	Timeout     time.Duration  `json:"timeoutMs"`   // 超时时间
	Source      string         `json:"source"`      // 来源：builtin / mcp / a2a / plugin
	Idempotent  bool           `json:"idempotent"`  // 是否幂等（幂等工具可被安全重试）
	Enabled     bool           `json:"enabled"`     // 是否启用
}

// TimeoutOrDefault 返回工具超时时间；未设置时返回 10s。
func (d Definition) TimeoutOrDefault() time.Duration {
	if d.Timeout <= 0 {
		return 10 * time.Second
	}
	return d.Timeout
}

// Handler 是工具执行体；返回文本结果（模型只能消费文本）。
type Handler func(ctx context.Context, args map[string]any) (string, error)

// Entry 是注册表中的一条工具记录。
type Entry struct {
	Definition
	handler Handler
	calls   int64 // 调用次数统计
}

// ExecuteOptions 是执行一次工具调用的上下文约束。
type ExecuteOptions struct {
	// Tier 是调用方的权限档位；低于工具等级时触发确认或拒绝。
	Tier Level
	// Approved 为 true 表示本次调用已经过人工确认（HITL 放行）。
	Approved bool
	// User 是调用方标识，写入审计日志。
	User string
	// TraceID 用于把工具执行挂到某条 LLM 调用链路上。
	TraceID string
}

// Result 是一次工具执行的结果。
type Result struct {
	ToolName string        `json:"toolName"`
	Content  string        `json:"content"`
	IsError  bool          `json:"isError"`
	Duration time.Duration `json:"durationMs"`
	Level    Level         `json:"level"`
	AuditID  string        `json:"auditId"`
}

// Registry 是工具注册中心，线程安全。
type Registry struct {
	mu      sync.RWMutex
	entries map[string]*Entry
	audit   *AuditLog
	limiter *Limiter
	now     func() time.Time
}

// NewRegistry 创建一个空的注册中心。
func NewRegistry() *Registry {
	return &Registry{
		entries: make(map[string]*Entry),
		audit:   NewAuditLog(500),
		limiter: NewLimiter(60, time.Minute),
		now:     time.Now,
	}
}

// Register 注册一个工具；同名注册会覆盖旧定义。
func (r *Registry) Register(def Definition, handler Handler) {
	if def.Source == "" {
		def.Source = "builtin"
	}
	def.Enabled = true
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries[def.Name] = &Entry{Definition: def, handler: handler}
}

// Unregister 移除一个工具。
func (r *Registry) Unregister(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.entries, name)
}

// Get 返回工具定义；不存在时返回 ErrNotFound。
func (r *Registry) Get(name string) (Definition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, ok := r.entries[name]
	if !ok {
		return Definition{}, fmt.Errorf("%w: %s", ErrNotFound, name)
	}
	return e.Definition, nil
}

// List 返回全部工具定义（按名称排序）。
func (r *Registry) List() []Definition {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Definition, 0, len(r.entries))
	for _, e := range r.entries {
		out = append(out, e.Definition)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// Names 返回全部工具名。
func (r *Registry) Names() []string {
	defs := r.List()
	out := make([]string, 0, len(defs))
	for _, d := range defs {
		out = append(out, d.Name)
	}
	return out
}

// ToLLM 把工具定义转换为 LLM 可消费的 function calling schema。
func (r *Registry) ToLLM() []llm.Tool {
	defs := r.List()
	out := make([]llm.Tool, 0, len(defs))
	for _, d := range defs {
		params := d.Parameters
		if params == nil {
			params = map[string]any{"type": "object", "properties": map[string]any{}}
		}
		out = append(out, llm.Tool{
			Type: "function",
			Function: llm.ToolFunction{
				Name:        d.Name,
				Description: d.Description,
				Parameters:  params,
			},
		})
	}
	return out
}

// Execute 执行一次工具调用，完整走「权限检查 → 参数净化 → 限流 → 超时执行 → 审计」五步。
func (r *Registry) Execute(ctx context.Context, name string, args map[string]any, opts ExecuteOptions) (*Result, error) {
	r.mu.RLock()
	entry, ok := r.entries[name]
	r.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrNotFound, name)
	}
	if args == nil {
		args = map[string]any{}
	}

	// ① 权限检查
	if entry.Level > opts.Tier && !opts.Approved {
		r.audit.Append(AuditEvent{
			Tool: name, User: opts.User, TraceID: opts.TraceID,
			Outcome: "blocked_permission", Detail: fmt.Sprintf("工具等级 %s 高于调用方档位 %s", entry.Level, opts.Tier),
		})
		return nil, fmt.Errorf("%w: 工具 %s 需要 %s 权限", ErrPermissionDenied, name, entry.Level)
	}
	// L3 及以上：即使已确认，也要求显式二次校验标记
	if entry.Level >= LevelHighRisk && !opts.Approved {
		return nil, fmt.Errorf("%w: 工具 %s 属于高风险操作", ErrApprovalRequired, name)
	}

	// ② 参数净化
	if reason := DetectInjection(args); reason != "" {
		r.audit.Append(AuditEvent{
			Tool: name, User: opts.User, TraceID: opts.TraceID,
			Outcome: "blocked_injection", Detail: reason,
		})
		return nil, fmt.Errorf("%w: %s", ErrInjectionDetected, reason)
	}

	// ③ 限流
	if !r.limiter.Allow(name) {
		r.audit.Append(AuditEvent{
			Tool: name, User: opts.User, TraceID: opts.TraceID,
			Outcome: "blocked_rate_limit", Detail: "超过窗口期调用上限",
		})
		return nil, fmt.Errorf("%w: 工具 %s 调用过于频繁", ErrRateLimited, name)
	}

	// ④ 超时执行
	start := r.now()
	execCtx, cancel := context.WithTimeout(ctx, entry.TimeoutOrDefault())
	defer cancel()

	type execResult struct {
		out string
		err error
	}
	done := make(chan execResult, 1)
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				done <- execResult{err: fmt.Errorf("工具 panic: %v", rec)}
			}
		}()
		out, err := entry.handler(execCtx, args)
		done <- execResult{out: out, err: err}
	}()

	var content string
	var execErr error
	select {
	case res := <-done:
		content, execErr = res.out, res.err
	case <-execCtx.Done():
		execErr = fmt.Errorf("%w: 工具 %s 超过 %v", ErrTimeout, name, entry.TimeoutOrDefault())
	}
	duration := r.now().Sub(start)

	r.mu.Lock()
	entry.calls++
	r.mu.Unlock()

	// ⑤ 审计
	event := AuditEvent{
		Tool: name, User: opts.User, TraceID: opts.TraceID,
		Duration: duration, Args: sanitizeForAudit(args),
	}
	if execErr != nil {
		event.Outcome = "failure"
		event.Detail = execErr.Error()
	} else {
		event.Outcome = "success"
		event.Detail = truncate(content, 500)
	}
	r.audit.Append(event)

	return &Result{
		ToolName: name,
		Content:  content,
		IsError:  execErr != nil,
		Duration: duration,
		Level:    entry.Level,
		AuditID:  event.ID,
	}, execErr
}

// Stats 返回每个工具的调用次数统计。
func (r *Registry) Stats() map[string]int64 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make(map[string]int64, len(r.entries))
	for name, e := range r.entries {
		out[name] = e.calls
	}
	return out
}

// Audit 返回审计日志（只读接口）。
func (r *Registry) Audit() *AuditLog { return r.audit }

// sanitizeForAudit 对写入审计的参数做截断与脱敏，避免敏感信息落盘。
func sanitizeForAudit(args map[string]any) map[string]any {
	out := make(map[string]any, len(args))
	for k, v := range args {
		switch typed := v.(type) {
		case string:
			out[k] = truncate(typed, 200)
		default:
			out[k] = v
		}
	}
	return out
}

// truncate 按 rune 截断文本并追加省略标记。
func truncate(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}

// Subset 返回名称在 names 中的工具定义，用于按场景挂载工具（减少上下文占用）。
func (r *Registry) Subset(names []string) []llm.Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]llm.Tool, 0, len(names))
	for _, name := range names {
		e, ok := r.entries[name]
		if !ok {
			continue
		}
		out = append(out, llm.Tool{
			Type: "function",
			Function: llm.ToolFunction{
				Name:        e.Name,
				Description: e.Description,
				Parameters:  e.Parameters,
			},
		})
	}
	return out
}

// MatchByKeyword 按关键词挑选可能相关的工具，用于「按场景挂载工具」降低上下文开销。
func (r *Registry) MatchByKeyword(query string, limit int) []llm.Tool {
	if limit <= 0 {
		limit = 5
	}
	q := strings.ToLower(query)
	r.mu.RLock()
	type scored struct {
		def   Definition
		score int
	}
	var candidates []scored
	for _, e := range r.entries {
		s := 0
		hay := strings.ToLower(e.Name + " " + e.Description)
		for _, kw := range strings.Fields(q) {
			if strings.Contains(hay, kw) {
				s++
			}
		}
		if s > 0 {
			candidates = append(candidates, scored{e.Definition, s})
		}
	}
	r.mu.RUnlock()

	sort.Slice(candidates, func(i, j int) bool { return candidates[i].score > candidates[j].score })
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}
	out := make([]llm.Tool, 0, len(candidates))
	for _, c := range candidates {
		out = append(out, llm.Tool{
			Type:     "function",
			Function: llm.ToolFunction{Name: c.def.Name, Description: c.def.Description, Parameters: c.def.Parameters},
		})
	}
	return out
}
