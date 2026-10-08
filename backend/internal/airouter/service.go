// Package airouter 是 AI 能力的统一编排层：把护栏、RAG、工具调用、可观测
// 组装成一条可落地的企业级调用链路，并对外暴露 /api/ai/* 路由。
//
// 一次聊天请求的完整链路：
//
//	输入护栏（注入/PII/截断）
//	  → 可选 RAG 检索（sources 事件）
//	  → Prompt 模板渲染（带版本）
//	  → LLM 流式推理（delta 事件）
//	  → 工具调用循环（tool_call / tool_result / approval_required 事件，最多 MaxSteps 轮）
//	  → 输出护栏（PII 拦截）
//	  → 成本与用量统计（usage 事件）
//	  → Run / Trace 落库
package airouter

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"interview-demo/backend/internal/guard"
	"interview-demo/backend/internal/llm"
	"interview-demo/backend/internal/obs"
	"interview-demo/backend/internal/tool"
)

// Retriever 是知识库检索能力抽象，由 internal/knowledge 适配实现。
type Retriever interface {
	// Search 在指定知识库中检索；kbID 为空时检索全部。
	Search(ctx context.Context, kbID, query string, topK int) ([]tool.KnowledgeHit, error)
}

// ServiceConfig 是编排服务的配置。
type ServiceConfig struct {
	// DefaultModel 未指定模型时使用的默认模型。
	DefaultModel string
	// MaxSteps 是工具调用循环的最大轮数，防止 Agent 死循环。
	MaxSteps int
	// MaxToolCallsPerStep 是单轮内允许的最大工具调用数。
	MaxToolCallsPerStep int
	// DefaultTier 是调用方默认权限档位（决定哪些工具需要人工确认）。
	DefaultTier tool.Level
	// DefaultTopK 是 RAG 默认召回条数。
	DefaultTopK int
	// Temperature 默认采样温度；nil 表示不传（用模型默认）。
	Temperature *float64
}

// DefaultServiceConfig 返回默认配置。
func DefaultServiceConfig() ServiceConfig {
	return ServiceConfig{
		DefaultModel:        "gpt-4o-mini",
		MaxSteps:            5,
		MaxToolCallsPerStep: 4,
		DefaultTier:         tool.LevelConfirm,
		DefaultTopK:         3,
	}
}

// Service 是 AI 编排服务，聚合全部底层能力。
type Service struct {
	llm       *llm.Registry
	tools     *tool.Registry
	recorder  *obs.Recorder
	prompts   *obs.PromptRegistry
	evals     *obs.EvalStore
	retriever Retriever
	approvals *tool.ApprovalStore
	cfg       ServiceConfig
	now       func() time.Time
}

// NewService 创建编排服务。
func NewService(
	llmReg *llm.Registry,
	tools *tool.Registry,
	recorder *obs.Recorder,
	prompts *obs.PromptRegistry,
	evals *obs.EvalStore,
	retriever Retriever,
	cfg ServiceConfig,
) *Service {
	if llmReg == nil {
		llmReg = llm.NewRegistryFromEnv()
	}
	if tools == nil {
		tools = tool.NewRegistry()
	}
	if recorder == nil {
		recorder = obs.NewRecorder(0)
	}
	if prompts == nil {
		prompts = obs.NewPromptRegistry()
	}
	if evals == nil {
		evals = obs.NewEvalStore()
	}
	if cfg.MaxSteps <= 0 {
		cfg.MaxSteps = 5
	}
	if cfg.MaxToolCallsPerStep <= 0 {
		cfg.MaxToolCallsPerStep = 4
	}
	if cfg.DefaultTopK <= 0 {
		cfg.DefaultTopK = 3
	}
	if cfg.DefaultModel == "" {
		cfg.DefaultModel = "gpt-4o-mini"
	}
	s := &Service{
		llm:       llmReg,
		tools:     tools,
		recorder:  recorder,
		prompts:   prompts,
		evals:     evals,
		retriever: retriever,
		approvals: tool.NewApprovalStore(0),
		cfg:       cfg,
		now:       time.Now,
	}
	s.prompts.EnsureDefaults()
	return s
}

// LLMRegistry 返回底层模型注册表。
func (s *Service) LLMRegistry() *llm.Registry { return s.llm }

// ToolRegistry 返回工具注册中心。
func (s *Service) ToolRegistry() *tool.Registry { return s.tools }

// Recorder 返回可观测记录器。
func (s *Service) Recorder() *obs.Recorder { return s.recorder }

// Prompts 返回 Prompt 注册表。
func (s *Service) Prompts() *obs.PromptRegistry { return s.prompts }

// Evals 返回评测存储。
func (s *Service) Evals() *obs.EvalStore { return s.evals }

// Approvals 返回 HITL 审批工单存储。
func (s *Service) Approvals() *tool.ApprovalStore { return s.approvals }

// Config 返回当前配置。
func (s *Service) Config() ServiceConfig { return s.cfg }

// SetRetriever 在运行期注入知识库检索器（解决构造顺序上的循环依赖）。
func (s *Service) SetRetriever(r Retriever) { s.retriever = r }

// ChatRequest 是一次聊天请求。
type ChatRequest struct {
	Model             string            `json:"model"`
	Messages          []llm.Message     `json:"messages"`
	System            string            `json:"system,omitempty"`
	KnowledgeBaseID   string            `json:"knowledgeBaseId,omitempty"`
	Tools             []string          `json:"tools,omitempty"` // 指定挂载的工具；nil 表示全部
	EnableTools       bool              `json:"enableTools"`     // 是否开启工具调用
	Temperature       *float64          `json:"temperature,omitempty"`
	MaxTokens         int               `json:"maxTokens,omitempty"`
	UserID            string            `json:"userId,omitempty"`
	SessionID         string            `json:"sessionId,omitempty"`
	TopK              int               `json:"topK,omitempty"`
	AutoApprove       bool              `json:"autoApprove"`                 // 跳过 HITL（仅限受信任场景）
	ApprovedToolCalls []string          `json:"approvedToolCalls,omitempty"` // 本轮已人工放行的 toolCallId
	Metadata          map[string]string `json:"metadata,omitempty"`
}

// ChatOutcome 是一次聊天的结果（非流式）。
type ChatOutcome struct {
	Content      string              `json:"content"`
	Model        string              `json:"model"`
	Provider     string              `json:"provider"`
	FinishReason string              `json:"finishReason"`
	Usage        llm.Usage           `json:"usage"`
	CostUSD      float64             `json:"costUsd"`
	Sources      []tool.KnowledgeHit `json:"sources,omitempty"`
	Steps        []StepRecord        `json:"steps,omitempty"`
	Degraded     bool                `json:"degraded"`
	Blocked      bool                `json:"blocked"`
	BlockReason  string              `json:"blockReason,omitempty"`
	TraceID      string              `json:"traceId"`
	RunID        string              `json:"runId"`
	LatencyMs    int64               `json:"latencyMs"`
}

// StepRecord 记录一轮工具调用。
type StepRecord struct {
	Index      int              `json:"index"`
	ToolCalls  []ToolCallRecord `json:"toolCalls,omitempty"`
	ContentLen int              `json:"contentLen"`
}

// ToolCallRecord 是一次工具调用的记录。
type ToolCallRecord struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Arguments     string `json:"arguments"`
	Result        string `json:"result,omitempty"`
	IsError       bool   `json:"isError"`
	DurationMs    int64  `json:"durationMs"`
	Approved      bool   `json:"approved"`
	PendingTicket string `json:"pendingTicket,omitempty"`
}

// GuardError 表示请求被输入护栏拦截。
type GuardError struct{ Reason string }

// Error 实现 error 接口。
func (e *GuardError) Error() string { return e.Reason }

// resolveMessages 处理输入护栏并构造最终消息列表。
// 返回非 nil GuardError 表示请求被拦截。
func (s *Service) resolveMessages(ctx context.Context, req ChatRequest) ([]llm.Message, []tool.KnowledgeHit, *GuardError) {
	var hits []tool.KnowledgeHit
	var systemParts []string
	if req.System != "" {
		systemParts = append(systemParts, req.System)
	}

	// 定位最后一条用户消息：护栏与检索都作用于它
	lastIdx := -1
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == llm.RoleUser {
			lastIdx = i
			break
		}
	}

	messages := make([]llm.Message, 0, len(req.Messages)+1)
	for i, m := range req.Messages {
		if i != lastIdx {
			messages = append(messages, m)
			continue
		}
		// ① 输入护栏：注入拦截 / PII 脱敏 / 超长截断
		inspection := guard.InspectInput(m.Content)
		switch inspection.Verdict {
		case guard.VerdictBlock:
			return nil, nil, &GuardError{Reason: inspection.Reason}
		default:
			m.Content = inspection.Text
		}
		// ② RAG 检索（用脱敏后的 query，避免把 PII 送进检索日志）
		if s.retriever != nil && req.KnowledgeBaseID != "" {
			topK := req.TopK
			if topK <= 0 {
				topK = s.cfg.DefaultTopK
			}
			if found, err := s.retriever.Search(ctx, req.KnowledgeBaseID, m.Content, topK); err == nil {
				hits = found
			}
		}
		messages = append(messages, m)
	}

	// ③ Prompt 模板渲染（带版本号，便于灰度与回滚）
	if tpl, ok := s.prompts.Active("chat.system"); ok {
		rendered, err := obs.Render(tpl, map[string]string{"assistantName": "企业 AI 助手"})
		if err == nil && rendered != "" {
			systemParts = append(systemParts, rendered)
		}
	}
	// ④ 检索片段作为 grounded 上下文注入 system
	if len(hits) > 0 {
		var b strings.Builder
		b.WriteString("--- 知识库上下文开始 ---\n")
		for i, h := range hits {
			b.WriteString(fmt.Sprintf("[%d] (score=%.3f)", i+1, h.Score))
			if h.Document != "" {
				b.WriteString(" " + h.Document)
			}
			b.WriteString("\n" + h.Content + "\n\n")
		}
		b.WriteString("--- 知识库上下文结束 ---\n")
		b.WriteString("回答时优先使用上述上下文；上下文未覆盖的内容请明确说明，不要编造。引用处标注 [n]。")
		systemParts = append(systemParts, b.String())
	}

	if len(systemParts) > 0 {
		withSystem := make([]llm.Message, 0, len(messages)+1)
		withSystem = append(withSystem, llm.Message{Role: llm.RoleSystem, Content: strings.Join(systemParts, "\n\n")})
		withSystem = append(withSystem, messages...)
		messages = withSystem
	}
	return messages, hits, nil
}

// selectTools 决定本轮挂载哪些工具（按场景挂载可显著降低上下文占用）。
func (s *Service) selectTools(req ChatRequest) []llm.Tool {
	if !req.EnableTools {
		return nil
	}
	if len(req.Tools) > 0 {
		return s.tools.Subset(req.Tools)
	}
	return s.tools.ToLLM()
}

// toolNames 从 LLM 工具列表中取出名称集合，用于判断工具是否已注册。
func (s *Service) toolNames(schema []llm.Tool) map[string]struct{} {
	out := make(map[string]struct{}, len(schema))
	for _, t := range schema {
		out[t.Function.Name] = struct{}{}
	}
	return out
}

// executeToolCall 执行一次工具调用，处理权限/HITL/沙箱/审计。
// 需要人工确认且未放行时，返回 (nil, ticket, nil)。
func (s *Service) executeToolCall(ctx context.Context, call llm.ToolCall, req ChatRequest, traceID string) (*tool.Result, *tool.ApprovalTicket, error) {
	def, err := s.tools.Get(call.Function.Name)
	if err != nil {
		return nil, nil, err
	}

	approved := req.AutoApprove
	if !approved {
		for _, id := range req.ApprovedToolCalls {
			if id == call.ID {
				approved = true
				break
			}
		}
	}

	// 工具等级高于调用方档位且未放行 → 建 HITL 工单
	if def.Level > s.cfg.DefaultTier && !approved {
		ticket := s.approvals.Create(call.ID, call.Function.Name, call.ArgumentsMap(), def.Level,
			fmt.Sprintf("工具 %s 属于 %s，超出调用方档位 %s，需人工确认", def.Name, def.Level, s.cfg.DefaultTier))
		return nil, ticket, nil
	}

	result, err := s.tools.Execute(ctx, call.Function.Name, call.ArgumentsMap(), tool.ExecuteOptions{
		Tier:     s.cfg.DefaultTier,
		Approved: approved,
		User:     req.UserID,
		TraceID:  traceID,
	})
	return result, nil, err
}

// ErrNoProvider 表示没有可用的模型 provider。
var ErrNoProvider = errors.New("airouter: 没有可用的 LLM provider，请配置 OPENAI_API_KEY / DEEPSEEK_API_KEY / GEMINI_API_KEY 等环境变量")
