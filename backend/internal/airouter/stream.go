package airouter

import (
	"encoding/json"
	"fmt"

	"interview-demo/backend/internal/llm"
	"interview-demo/backend/internal/tool"
)

// StreamEventType 是流式事件类型；同时用作 SSE 的 event 名。
type StreamEventType string

// 流式事件类型常量。
const (
	EventStart            StreamEventType = "start"             // 请求开始，携带 runId/traceId/model
	EventDelta            StreamEventType = "delta"             // 文本增量
	EventReasoning        StreamEventType = "reasoning"         // 推理过程增量（支持 reasoning 的模型）
	EventSources          StreamEventType = "sources"           // RAG 召回片段
	EventToolCall         StreamEventType = "tool_call"         // 模型发起工具调用
	EventToolResult       StreamEventType = "tool_result"       // 工具执行结果
	EventApprovalRequired StreamEventType = "approval_required" // 需要人工确认（HITL）
	EventStep             StreamEventType = "step"              // Agent 步骤边界
	EventUsage            StreamEventType = "usage"             // token 与成本
	EventDone             StreamEventType = "done"              // 正常结束
	EventError            StreamEventType = "error"             // 出错结束
)

// StreamEvent 是推给前端的一个流式事件。
// 前端按 Type 分发，各 Payload 字段为对应结构的 JSON 序列化结果。
type StreamEvent struct {
	Type StreamEventType `json:"type"`
	Data any             `json:"data"`
}

// StartData 是 start 事件的载荷。
type StartData struct {
	RunID     string `json:"runId"`
	TraceID   string `json:"traceId"`
	Model     string `json:"model"`
	Provider  string `json:"provider"`
	MaxSteps  int    `json:"maxSteps"`
	ToolCount int    `json:"toolCount"`
}

// DeltaData 是 delta 事件的载荷。
type DeltaData struct {
	Text string `json:"text"`
}

// SourcesData 是 sources 事件的载荷。
type SourcesData struct {
	Items []tool.KnowledgeHit `json:"items"`
	TopK  int                 `json:"topK"`
}

// ToolCallData 是 tool_call 事件的载荷。
type ToolCallData struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments"`
	Level     string         `json:"level"`
}

// ToolResultData 是 tool_result 事件的载荷。
type ToolResultData struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Result     string `json:"result"`
	IsError    bool   `json:"isError"`
	DurationMs int64  `json:"durationMs"`
	AuditID    string `json:"auditId,omitempty"`
}

// ApprovalData 是 approval_required 事件的载荷。
type ApprovalData struct {
	TicketID   string         `json:"ticketId"`
	ToolCallID string         `json:"toolCallId"`
	Name       string         `json:"name"`
	Arguments  map[string]any `json:"arguments"`
	Level      string         `json:"level"`
	Reason     string         `json:"reason"`
}

// StepData 是 step 事件的载荷。
type StepData struct {
	Index        int    `json:"index"`
	MaxSteps     int    `json:"maxSteps"`
	ToolCalls    int    `json:"toolCalls"`
	FinishReason string `json:"finishReason,omitempty"`
}

// UsageData 是 usage 事件的载荷。
type UsageData struct {
	PromptTokens     int     `json:"promptTokens"`
	CompletionTokens int     `json:"completionTokens"`
	TotalTokens      int     `json:"totalTokens"`
	CostUSD          float64 `json:"costUsd"`
	Estimated        bool    `json:"estimated"`
}

// DoneData 是 done 事件的载荷。
type DoneData struct {
	FinishReason string `json:"finishReason"`
	Degraded     bool   `json:"degraded"`
	Steps        int    `json:"steps"`
	ToolCalls    int    `json:"toolCalls"`
	LatencyMs    int64  `json:"latencyMs"`
	TraceID      string `json:"traceId"`
	RunID        string `json:"runId"`
}

// ErrorData 是 error 事件的载荷。
type ErrorData struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
	TraceID string `json:"traceId,omitempty"`
}

// EncodeSSE 把一个事件编码为 SSE 帧：`event: <type>\ndata: <json>\n\n`。
func EncodeSSE(ev StreamEvent) (string, error) {
	payload, err := json.Marshal(ev.Data)
	if err != nil {
		return "", fmt.Errorf("airouter: 事件序列化失败: %w", err)
	}
	return fmt.Sprintf("event: %s\ndata: %s\n\n", ev.Type, payload), nil
}

// streamEvent 构造一个流式事件。
func streamEvent(t StreamEventType, data any) StreamEvent {
	return StreamEvent{Type: t, Data: data}
}

// usageData 把用量与成本打包成 usage 事件载荷。
func usageData(usage llm.Usage, model string) UsageData {
	cost := llm.EstimateCost(model, usage)
	return UsageData{
		PromptTokens:     usage.PromptTokens,
		CompletionTokens: usage.CompletionTokens,
		TotalTokens:      usage.TotalTokens,
		CostUSD:          cost.Total,
		Estimated:        cost.Estimated,
	}
}
