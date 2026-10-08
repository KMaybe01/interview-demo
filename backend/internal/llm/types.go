// Package llm 提供统一的 LLM Provider 抽象层。
//
// 设计目标：
//   - 屏蔽 OpenAI / DeepSeek / Gemini / Ollama / Qwen 等厂商差异（统一走 OpenAI 兼容协议）
//   - 统一的消息、工具调用、用量、流式分块模型
//   - 内建降级链（FallbackChain）与熔断器（CircuitBreaker）
//   - 内建价格表与成本估算（价格可运行时覆盖，禁止写死后不管）
package llm

import (
	"context"
	"encoding/json"
)

// Role 是消息角色。
type Role string

// 消息角色常量。
const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleTool      Role = "tool"
)

// Message 是与厂商无关的统一消息结构。
type Message struct {
	Role       Role       `json:"role"`
	Content    string     `json:"content"`
	Name       string     `json:"name,omitempty"`       // 工具结果消息携带的工具名
	ToolCallID string     `json:"toolCallId,omitempty"` // 工具结果消息对应的调用 ID
	ToolCalls  []ToolCall `json:"toolCalls,omitempty"`  // assistant 消息发起的工具调用
}

// ToolCall 是一次工具调用请求。
type ToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"` // 固定 "function"
	Function FunctionCall `json:"function"`
}

// FunctionCall 是工具调用的函数名与参数（参数为 JSON 字符串）。
type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// ArgumentsMap 把工具参数 JSON 解析为 map，解析失败返回空 map。
func (t ToolCall) ArgumentsMap() map[string]any {
	out := make(map[string]any)
	if t.Function.Arguments == "" {
		return out
	}
	if err := json.Unmarshal([]byte(t.Function.Arguments), &out); err != nil {
		return make(map[string]any)
	}
	return out
}

// Tool 是暴露给模型的一个工具定义。
type Tool struct {
	Type     string       `json:"type"` // 固定 "function"
	Function ToolFunction `json:"function"`
}

// ToolFunction 描述工具的名称、用途与 JSON Schema 参数。
type ToolFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

// Usage 是 token 用量。
type Usage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}

// Add 累加用量并返回新值（不修改接收者）。
func (u Usage) Add(other Usage) Usage {
	return Usage{
		PromptTokens:     u.PromptTokens + other.PromptTokens,
		CompletionTokens: u.CompletionTokens + other.CompletionTokens,
		TotalTokens:      u.TotalTokens + other.TotalTokens,
	}
}

// Request 是一次 LLM 调用请求。
type Request struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Tools       []Tool    `json:"tools,omitempty"`
	Temperature *float64  `json:"temperature,omitempty"`
	TopP        *float64  `json:"topP,omitempty"`
	MaxTokens   int       `json:"maxTokens,omitempty"`
	Stop        []string  `json:"stop,omitempty"`
	JSONMode    bool      `json:"jsonMode,omitempty"`
	User        string    `json:"user,omitempty"`
	ToolChoice  string    `json:"toolChoice,omitempty"` // auto / none / required / {"name":...}
	Metadata    map[string]string
}

// Response 是一次非流式 LLM 调用的结果。
type Response struct {
	Content      string     `json:"content"`
	Reasoning    string     `json:"reasoning,omitempty"`
	ToolCalls    []ToolCall `json:"toolCalls,omitempty"`
	FinishReason string     `json:"finishReason"`
	Usage        Usage      `json:"usage"`
	Model        string     `json:"model"`
	Provider     string     `json:"provider"`
}

// Chunk 是流式输出的一个分块。
type Chunk struct {
	Content        string          `json:"content,omitempty"`
	Reasoning      string          `json:"reasoning,omitempty"`
	ToolCallDeltas []ToolCallDelta `json:"toolCallDeltas,omitempty"`
	FinishReason   string          `json:"finishReason,omitempty"`
	Usage          *Usage          `json:"usage,omitempty"`
	Model          string          `json:"model,omitempty"`
	Provider       string          `json:"provider,omitempty"`
	Err            error           `json:"-"`
}

// ToolCallDelta 是流式工具调用的增量片段。
// Index 相同的 delta 需要按顺序拼接：ID 取首个非空，Arguments 做字符串拼接。
type ToolCallDelta struct {
	Index     int    `json:"index"`
	ID        string `json:"id,omitempty"`
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments,omitempty"`
}

// ModelInfo 描述一个可用模型。
type ModelInfo struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Provider      string   `json:"provider"`
	ContextWindow int      `json:"contextWindow"`
	MaxOutput     int      `json:"maxOutput"`
	Capabilities  []string `json:"capabilities"` // chat / tools / vision / embedding / reasoning
	InputPrice    float64  `json:"inputPrice"`   // 美元 / 每百万 token
	OutputPrice   float64  `json:"outputPrice"`
}

// Cost 是一次调用的成本估算结果。
type Cost struct {
	Input     float64 `json:"input"`
	Output    float64 `json:"output"`
	Total     float64 `json:"total"`
	Currency  string  `json:"currency"`
	Estimated bool    `json:"estimated"` // true 表示价格来自模糊匹配或默认值
}

// Provider 是 LLM 能力提供者的统一接口。
type Provider interface {
	// ID 返回 provider 的唯一标识，如 openai / deepseek / ollama。
	ID() string
	// DisplayName 返回可读名称。
	DisplayName() string
	// Models 返回该 provider 支持的模型清单。
	Models() []ModelInfo
	// SupportsTools 返回该 provider 是否支持 function calling。
	SupportsTools() bool
	// SupportsEmbedding 返回该 provider 是否支持文本嵌入。
	SupportsEmbedding() bool
	// Chat 执行一次非流式对话。
	Chat(ctx context.Context, req Request) (*Response, error)
	// Stream 执行一次流式对话，返回的 channel 在结束时会被关闭。
	Stream(ctx context.Context, req Request) (<-chan Chunk, error)
	// Embed 把一批文本转成向量。
	Embed(ctx context.Context, texts []string) ([][]float64, error)
	// Configured 返回该 provider 是否已配置密钥（未配置时只能走降级）。
	Configured() bool
}
