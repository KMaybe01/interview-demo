// Package a2a 实现 A2A（Agent2Agent）v1.0 的最小可用版本：
// Agent 之间横向协作的协议（类比 HTTP），与 MCP（Agent ↔ 工具，纵向）互补。
//
// 本包不依赖 internal/agent：执行能力通过 Runner 接口由外部注入，
// 依赖方向保持单向（业务包依赖协议包，协议包不反向依赖业务包）。
package a2a

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// JSONRPCVersion 是 JSON-RPC 版本标识。
const JSONRPCVersion = "2.0"

// 协议方法名。
const (
	MethodMessageSend   = "message/send"
	MethodMessageStream = "message/stream"
	MethodTasksGet      = "tasks/get"
	MethodTasksCancel   = "tasks/cancel"
	MethodTasksList     = "tasks/list"
	MethodAgentGetCard  = "agent/getCard"
	MethodAgentsList    = "agents/list"
)

// JSON-RPC 标准错误码与一个业务扩展码。
const (
	ErrCodeParseError        = -32700
	ErrCodeInvalidRequest    = -32600
	ErrCodeMethodNotFound    = -32601
	ErrCodeInvalidParams     = -32602
	ErrCodeInternalError     = -32603
	ErrCodeTaskNotCancelable = -32001 // 任务已处于终态，不可取消
)

// TaskStatus 是任务状态。
type TaskStatus string

// A2A v1.0 任务状态常量。
const (
	TaskStatusSubmitted     TaskStatus = "submitted"
	TaskStatusWorking       TaskStatus = "working"
	TaskStatusInputRequired TaskStatus = "input-required"
	TaskStatusCompleted     TaskStatus = "completed"
	TaskStatusFailed        TaskStatus = "failed"
	TaskStatusCanceled      TaskStatus = "canceled"
)

// IsTerminal 判断是否为终态（终态不可再迁移、不可取消）。
func (s TaskStatus) IsTerminal() bool {
	return s == TaskStatusCompleted || s == TaskStatusFailed || s == TaskStatusCanceled
}

// CanTransition 判断 from → to 是否为合法迁移。
func (s TaskStatus) CanTransition(to TaskStatus) bool {
	if s.IsTerminal() {
		return false
	}
	switch to {
	case TaskStatusSubmitted:
		return false // 不能回退到 submitted
	case TaskStatusWorking, TaskStatusInputRequired, TaskStatusCompleted, TaskStatusFailed, TaskStatusCanceled:
		return true
	}
	return false
}

// ParseTaskStatus 解析状态字符串。
func ParseTaskStatus(s string) (TaskStatus, bool) {
	switch TaskStatus(strings.ToLower(strings.TrimSpace(s))) {
	case TaskStatusSubmitted:
		return TaskStatusSubmitted, true
	case TaskStatusWorking:
		return TaskStatusWorking, true
	case TaskStatusInputRequired:
		return TaskStatusInputRequired, true
	case TaskStatusCompleted:
		return TaskStatusCompleted, true
	case TaskStatusFailed:
		return TaskStatusFailed, true
	case TaskStatusCanceled:
		return TaskStatusCanceled, true
	}
	return "", false
}

// PartType 是消息片段类型。
type PartType string

// 片段类型常量。
const (
	PartTypeText PartType = "text"
	PartTypeData PartType = "data"
	PartTypeFile PartType = "file"
)

// Part 是消息或产物中的一个片段。
type Part struct {
	Type string         `json:"type"` // text / data / file
	Text string         `json:"text,omitempty"`
	Data map[string]any `json:"data,omitempty"`
	File *FileContent   `json:"file,omitempty"`
}

// FileContent 是文件片段的内容（bytes 与 uri 二选一）。
type FileContent struct {
	Name     string `json:"name,omitempty"`
	MimeType string `json:"mimeType,omitempty"`
	Bytes    string `json:"bytes,omitempty"` // base64
	URI      string `json:"uri,omitempty"`
}

// Message 是 Agent 之间传递的一条消息。
type Message struct {
	Role      string         `json:"role"` // user / agent
	Parts     []Part         `json:"parts"`
	MessageID string         `json:"messageId"`
	TaskID    string         `json:"taskId,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

// Artifact 是任务产出的产物。
type Artifact struct {
	Name      string         `json:"name"`
	Parts     []Part         `json:"parts"`
	Index     int            `json:"index"`
	LastChunk bool           `json:"lastChunk"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

// Task 是一个 A2A 任务。
type Task struct {
	ID        string         `json:"id"`
	AgentID   string         `json:"agentId"`
	SessionID string         `json:"sessionId,omitempty"`
	Status    TaskStatus     `json:"status"`
	History   []Message      `json:"history,omitempty"`
	Artifacts []Artifact     `json:"artifacts,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	Error     *string        `json:"error,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

// MetadataKeyInputRequired 是 input-required 状态下存放提示语的 metadata key。
const MetadataKeyInputRequired = "inputRequired"

// Skill 描述 Agent 的一项能力。
type Skill struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Description  string         `json:"description"`
	Tags         []string       `json:"tags,omitempty"`
	Examples     []string       `json:"examples,omitempty"`
	InputSchema  map[string]any `json:"inputSchema,omitempty"`
	OutputSchema map[string]any `json:"outputSchema,omitempty"`
}

// Provider 描述 Agent 的提供方。
type Provider struct {
	Organization string `json:"organization,omitempty"`
	URL          string `json:"url,omitempty"`
}

// Capabilities 声明 Agent 的能力开关。
type Capabilities struct {
	Streaming              bool `json:"streaming"`
	PushNotifications      bool `json:"pushNotifications"`
	StateTransitionHistory bool `json:"stateTransitionHistory"`
}

// Authentication 声明 Agent 接受的认证方式。
type Authentication struct {
	Schemes     []string `json:"schemes"` // none / bearer / api-key / oauth2
	Credentials string   `json:"credentials,omitempty"`
}

// AgentCard 是 Agent 的能力名片，发布于 /.well-known/agent.json。
type AgentCard struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	Description        string          `json:"description,omitempty"`
	URL                string          `json:"url,omitempty"`
	Version            string          `json:"version,omitempty"`
	Provider           *Provider       `json:"provider,omitempty"`
	Capabilities       Capabilities    `json:"capabilities"`
	Authentication     *Authentication `json:"authentication,omitempty"`
	Skills             []Skill         `json:"skills"`
	DefaultInputModes  []string        `json:"defaultInputModes,omitempty"`
	DefaultOutputModes []string        `json:"defaultOutputModes,omitempty"`
}

// Runner 是任务执行器；由 internal/agent 等业务包实现。
//
// 约定：
//   - 正常返回 → 任务置 completed，返回的 Artifact 追加到 Task.Artifacts
//   - 返回 ErrInputRequired（可用 NewInputRequired 构造）→ 任务置 input-required，等待客户端补充
//   - 返回 context.Canceled → 任务置 canceled
//   - 其他 error → 任务置 failed
type Runner interface {
	Run(ctx context.Context, task *Task, input []Part) ([]Artifact, error)
}

// RunnerFunc 让普通函数实现 Runner。
type RunnerFunc func(ctx context.Context, task *Task, input []Part) ([]Artifact, error)

// Run 实现 Runner 接口。
func (f RunnerFunc) Run(ctx context.Context, task *Task, input []Part) ([]Artifact, error) {
	return f(ctx, task, input)
}

// ErrInputRequired 是「需要补充输入」的哨兵错误。
var ErrInputRequired = errors.New("a2a: 需要补充输入")

// InputRequiredError 携带提示语的 ErrInputRequired。
type InputRequiredError struct {
	Prompt string
}

// Error 实现 error 接口。
func (e *InputRequiredError) Error() string {
	if e.Prompt == "" {
		return ErrInputRequired.Error()
	}
	return e.Prompt
}

// Unwrap 让 errors.Is(err, ErrInputRequired) 成立。
func (e *InputRequiredError) Unwrap() error { return ErrInputRequired }

// NewInputRequired 构造一个带提示语的「需要补充输入」错误。
func NewInputRequired(prompt string) error { return &InputRequiredError{Prompt: prompt} }

// InputRequiredPrompt 从错误中取出提示语；非该类错误返回空串。
func InputRequiredPrompt(err error) string {
	var e *InputRequiredError
	if errors.As(err, &e) {
		return e.Prompt
	}
	return ""
}

// RPCRequest 是 JSON-RPC 请求信封。
type RPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// RPCResponse 是 JSON-RPC 响应信封。
type RPCResponse struct {
	JSONRPC string    `json:"jsonrpc"`
	ID      any       `json:"id"`
	Result  any       `json:"result,omitempty"`
	Error   *RPCError `json:"error,omitempty"`
}

// RPCError 是 JSON-RPC 错误对象。
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

// NewRPCError 构造错误对象。
func NewRPCError(code int, message string) *RPCError { return &RPCError{Code: code, Message: message} }

// HTTPStatus 把错误码映射为合适的 HTTP 状态码。
func (e *RPCError) HTTPStatus() int {
	switch e.Code {
	case ErrCodeParseError, ErrCodeInvalidRequest, ErrCodeInvalidParams:
		return 400
	case ErrCodeMethodNotFound:
		return 404
	case ErrCodeTaskNotCancelable:
		return 409
	default:
		return 500
	}
}

// NewRPCSuccess 构造成功响应。
func NewRPCSuccess(id any, result any) RPCResponse {
	return RPCResponse{JSONRPC: JSONRPCVersion, ID: id, Result: result}
}

// NewRPCErrorResponse 构造错误响应。
func NewRPCErrorResponse(id any, err *RPCError) RPCResponse {
	return RPCResponse{JSONRPC: JSONRPCVersion, ID: id, Error: err}
}

// SendMessageParams 是 message/send 的参数。
// Text 与 Message 二选一：传 Text 时按纯文本构造一条 user 消息。
type SendMessageParams struct {
	AgentID   string         `json:"agentId,omitempty"`
	TaskID    string         `json:"taskId,omitempty"` // 非空表示继续一个 input-required 的任务
	SessionID string         `json:"sessionId,omitempty"`
	Message   *Message       `json:"message,omitempty"`
	Text      string         `json:"text,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

// ResolveMessage 构造一条带 ID 的消息；未显式传 Message 时用 Text 兜底。
func (p SendMessageParams) ResolveMessage(taskID string) Message {
	if p.Message != nil {
		msg := *p.Message
		msg.TaskID = taskID
		if msg.Role == "" {
			msg.Role = "user"
		}
		if msg.MessageID == "" {
			msg.MessageID = newID()
		}
		if len(msg.Parts) == 0 && p.Text != "" {
			msg.Parts = []Part{NewTextPart(p.Text)}
		}
		return msg
	}
	return Message{Role: "user", MessageID: newID(), TaskID: taskID, Parts: []Part{NewTextPart(p.Text)}}
}

// TaskQueryParams 是按 ID 查询/取消任务的参数。
type TaskQueryParams struct {
	TaskID string `json:"taskId"`
}

// TaskListParams 是 tasks/list 的参数。
type TaskListParams struct {
	AgentID string `json:"agentId,omitempty"`
	Status  string `json:"status,omitempty"`
	Limit   int    `json:"limit,omitempty"`
}

// TaskListResult 是 tasks/list 的结果。
type TaskListResult struct {
	Tasks []Task `json:"tasks"`
	Count int    `json:"count"`
}

// AgentListResult 是 agents/list 的结果。
type AgentListResult struct {
	Agents []AgentSummary `json:"agents"`
	Count  int            `json:"count"`
}

// AgentSummary 是 Agent 的摘要信息（不含完整 Card，减小响应体积）。
type AgentSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Version     string   `json:"version,omitempty"`
	Skills      []string `json:"skills,omitempty"`
	Streaming   bool     `json:"streaming"`
}

// TaskEventType 是 SSE 事件类型。
type TaskEventType string

// 事件类型常量。
const (
	EventTypeTask           TaskEventType = "task"
	EventTypeStatusUpdate   TaskEventType = "status-update"
	EventTypeArtifactUpdate TaskEventType = "artifact-update"
)

// TaskEvent 是流式推送的一个事件。
type TaskEvent struct {
	Type      TaskEventType `json:"type"`
	TaskID    string        `json:"taskId,omitempty"`
	AgentID   string        `json:"agentId,omitempty"`
	Status    TaskStatus    `json:"status,omitempty"`
	Task      *Task         `json:"task,omitempty"`
	Artifact  *Artifact     `json:"artifact,omitempty"`
	Message   string        `json:"message,omitempty"`
	Final     bool          `json:"final"`
	Timestamp time.Time     `json:"timestamp"`
}

// NewTextPart 构造一个文本片段。
func NewTextPart(text string) Part { return Part{Type: string(PartTypeText), Text: text} }

// NewDataPart 构造一个结构化数据片段。
func NewDataPart(data map[string]any) Part { return Part{Type: string(PartTypeData), Data: data} }

// NewUserMessage 构造一条用户消息。
func NewUserMessage(text string) Message {
	return Message{Role: "user", MessageID: newID(), Parts: []Part{NewTextPart(text)}}
}

// NewAgentMessage 构造一条 Agent 消息。
func NewAgentMessage(text string) Message {
	return Message{Role: "agent", MessageID: newID(), Parts: []Part{NewTextPart(text)}}
}

// TextOf 把一组片段中的文本拼接起来（忽略 data/file 片段）。
func TextOf(parts []Part) string {
	var b strings.Builder
	for _, p := range parts {
		if p.Type == string(PartTypeText) {
			if b.Len() > 0 {
				b.WriteString("\n")
			}
			b.WriteString(p.Text)
		}
	}
	return b.String()
}
