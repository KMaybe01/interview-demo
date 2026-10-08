package llm

import (
	"context"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// DefaultRequestTimeout 是非流式调用的默认超时。
//
// 为什么不设更短：复杂请求的模型侧耗时可能到几十秒；设太长又会让降级链失去意义。
// 流式调用**不加**这个超时（由 HTTP 请求的 ctx 控制），否则长回答会被误杀。
const DefaultRequestTimeout = 45 * time.Second

// CompatConfig 描述一个 OpenAI 兼容端点（OpenAI / DeepSeek / Gemini / Qwen / Ollama / vLLM 均适用）。
type CompatConfig struct {
	ID             string // provider 唯一标识
	DisplayName    string // 可读名称
	BaseURL        string // 留空表示使用 go-openai 默认地址
	APIKey         string
	Models         []ModelInfo
	NoTools        bool // 某些本地模型不支持 function calling
	NoEmbedding    bool // 某些端点不提供嵌入接口
	EmbedModel     string
	EmbedDim       int
	RequestTimeout time.Duration // 非流式调用超时；<=0 时用 DefaultRequestTimeout
	ExtraHeaders   map[string]string
}

// requestTimeout 返回生效的非流式调用超时。
func (c CompatConfig) requestTimeout() time.Duration {
	if c.RequestTimeout > 0 {
		return c.RequestTimeout
	}
	return DefaultRequestTimeout
}

// CompatProvider 基于 go-openai 实现的 OpenAI 兼容 provider。
// 由于 DeepSeek / Gemini(OpenAI 兼容端点) / Qwen / Ollama / vLLM 都实现了 OpenAI 协议，
// 这里只需要一份实现 + 不同 BaseURL 即可覆盖全部厂商。
type CompatProvider struct {
	cfg    CompatConfig
	client *openai.Client
	mu     sync.RWMutex
	// health 记录最近一次调用是否成功，供降级链判断。
	lastErr error
}

// NewCompatProvider 创建一个 OpenAI 兼容 provider。
func NewCompatProvider(cfg CompatConfig) *CompatProvider {
	oc := openai.DefaultConfig(cfg.APIKey)
	if cfg.BaseURL != "" {
		oc.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	}
	client := openai.NewClientWithConfig(oc)
	return &CompatProvider{cfg: cfg, client: client}
}

// ID 返回 provider 标识。
func (p *CompatProvider) ID() string { return p.cfg.ID }

// DisplayName 返回可读名称。
func (p *CompatProvider) DisplayName() string { return p.cfg.DisplayName }

// Models 返回模型清单。
func (p *CompatProvider) Models() []ModelInfo { return p.cfg.Models }

// SupportsTools 返回是否支持 function calling。
func (p *CompatProvider) SupportsTools() bool { return !p.cfg.NoTools }

// SupportsEmbedding 返回是否支持嵌入。
func (p *CompatProvider) SupportsEmbedding() bool { return !p.cfg.NoEmbedding }

// Configured 返回是否已配置密钥。Ollama 本地端点无需密钥，视为已配置。
func (p *CompatProvider) Configured() bool {
	if p.cfg.APIKey != "" {
		return true
	}
	return strings.Contains(p.cfg.BaseURL, "localhost") || strings.Contains(p.cfg.BaseURL, "127.0.0.1")
}

// lastError 返回最近一次调用错误。
func (p *CompatProvider) lastError() error {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.lastErr
}

func (p *CompatProvider) record(err error) {
	p.mu.Lock()
	p.lastErr = err
	p.mu.Unlock()
}

// Chat 执行一次非流式对话。
func (p *CompatProvider) Chat(ctx context.Context, req Request) (*Response, error) {
	openaiReq, err := buildOpenAIRequest(req, p.SupportsTools())
	if err != nil {
		return nil, err
	}
	// 非流式调用必须自带超时，否则一个卡死的模型会拖垮整条链路且无法触发降级
	callCtx, cancel := context.WithTimeout(ctx, p.cfg.requestTimeout())
	defer cancel()

	resp, err := p.client.CreateChatCompletion(callCtx, openaiReq)
	if err != nil {
		p.record(err)
		return nil, fmt.Errorf("[%s] 对话失败: %w", p.cfg.ID, err)
	}
	p.record(nil)

	out := &Response{
		Model:     resp.Model,
		Provider:  p.cfg.ID,
		Usage:     Usage{PromptTokens: resp.Usage.PromptTokens, CompletionTokens: resp.Usage.CompletionTokens, TotalTokens: resp.Usage.TotalTokens},
		ToolCalls: convertToolCalls(resp.Choices[0].Message.ToolCalls),
	}
	if resp.Model != "" {
		out.Model = resp.Model
	} else {
		out.Model = req.Model
	}
	if len(resp.Choices) > 0 {
		out.Content = resp.Choices[0].Message.Content
		out.FinishReason = string(resp.Choices[0].FinishReason)
	}
	return out, nil
}

// Stream 执行一次流式对话；channel 在流结束或 ctx 取消时关闭。
func (p *CompatProvider) Stream(ctx context.Context, req Request) (<-chan Chunk, error) {
	openaiReq, err := buildOpenAIRequest(req, p.SupportsTools())
	if err != nil {
		return nil, err
	}
	openaiReq.Stream = true

	stream, err := p.client.CreateChatCompletionStream(ctx, openaiReq)
	if err != nil {
		p.record(err)
		return nil, fmt.Errorf("[%s] 流式对话失败: %w", p.cfg.ID, err)
	}

	ch := make(chan Chunk, 32)
	go func() {
		defer close(ch)
		defer stream.Close()
		for {
			resp, err := stream.Recv()
			if err == io.EOF {
				p.record(nil)
				return
			}
			if err != nil {
				p.record(err)
				select {
				case ch <- Chunk{Err: fmt.Errorf("[%s] 流式读取失败: %w", p.cfg.ID, err)}:
				case <-ctx.Done():
				}
				return
			}

			chunk := Chunk{Model: resp.Model, Provider: p.cfg.ID}
			if resp.Usage != nil {
				u := Usage{
					PromptTokens:     resp.Usage.PromptTokens,
					CompletionTokens: resp.Usage.CompletionTokens,
					TotalTokens:      resp.Usage.TotalTokens,
				}
				chunk.Usage = &u
			}
			for _, choice := range resp.Choices {
				if choice.FinishReason != "" {
					chunk.FinishReason = string(choice.FinishReason)
				}
				chunk.Content += choice.Delta.Content
				for _, tc := range choice.Delta.ToolCalls {
					chunk.ToolCallDeltas = append(chunk.ToolCallDeltas, ToolCallDelta{
						Index:     derefInt(tc.Index),
						ID:        tc.ID,
						Name:      tc.Function.Name,
						Arguments: tc.Function.Arguments,
					})
				}
			}
			select {
			case ch <- chunk:
			case <-ctx.Done():
				return
			}
		}
	}()
	return ch, nil
}

// Embed 调用嵌入接口；未配置嵌入模型或端点不支持时返回错误，由上层降级到哈希向量。
func (p *CompatProvider) Embed(ctx context.Context, texts []string) ([][]float64, error) {
	if p.cfg.NoEmbedding {
		return nil, fmt.Errorf("[%s] 该端点未提供嵌入能力", p.cfg.ID)
	}
	model := p.cfg.EmbedModel
	if model == "" {
		model = "text-embedding-3-small"
	}
	resp, err := p.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Model: openai.EmbeddingModel(model),
		Input: texts,
	})
	if err != nil {
		p.record(err)
		return nil, fmt.Errorf("[%s] 嵌入失败: %w", p.cfg.ID, err)
	}
	p.record(nil)

	out := make([][]float64, len(resp.Data))
	for _, item := range resp.Data {
		vec := make([]float64, len(item.Embedding))
		for i, v := range item.Embedding {
			vec[i] = float64(v)
		}
		if item.Index < len(out) {
			out[item.Index] = vec
		} else {
			out = append(out, vec)
		}
	}
	return out, nil
}

// buildOpenAIRequest 把统一 Request 转成 go-openai 的请求体。
func buildOpenAIRequest(req Request, withTools bool) (openai.ChatCompletionRequest, error) {
	out := openai.ChatCompletionRequest{
		Model:    req.Model,
		Messages: make([]openai.ChatCompletionMessage, 0, len(req.Messages)),
	}
	for _, m := range req.Messages {
		msg := openai.ChatCompletionMessage{
			Role:    openaiRole(m.Role),
			Content: m.Content,
			Name:    m.Name,
		}
		if m.ToolCallID != "" {
			msg.ToolCallID = m.ToolCallID
		}
		for _, tc := range m.ToolCalls {
			msg.ToolCalls = append(msg.ToolCalls, openai.ToolCall{
				ID:   tc.ID,
				Type: openai.ToolTypeFunction,
				Function: openai.FunctionCall{
					Name:      tc.Function.Name,
					Arguments: tc.Function.Arguments,
				},
			})
		}
		out.Messages = append(out.Messages, msg)
	}

	if withTools && len(req.Tools) > 0 {
		for _, t := range req.Tools {
			out.Tools = append(out.Tools, openai.Tool{
				Type: openai.ToolTypeFunction,
				Function: &openai.FunctionDefinition{
					Name:        t.Function.Name,
					Description: t.Function.Description,
					Parameters:  t.Function.Parameters,
				},
			})
		}
		switch req.ToolChoice {
		case "none", "required", "auto":
			out.ToolChoice = req.ToolChoice
		case "":
		default:
			out.ToolChoice = openai.ToolChoice{Type: openai.ToolTypeFunction, Function: openai.ToolFunction{Name: req.ToolChoice}}
		}
	}

	if req.Temperature != nil {
		out.Temperature = float32(*req.Temperature)
	}
	if req.TopP != nil {
		out.TopP = float32(*req.TopP)
	}
	if req.MaxTokens > 0 {
		out.MaxTokens = req.MaxTokens
	}
	if len(req.Stop) > 0 {
		out.Stop = req.Stop
	}
	if req.JSONMode {
		out.ResponseFormat = &openai.ChatCompletionResponseFormat{Type: openai.ChatCompletionResponseFormatTypeJSONObject}
	}
	if req.User != "" {
		out.User = req.User
	}
	return out, nil
}

// openaiRole 把统一角色映射为 go-openai 角色。
func openaiRole(r Role) string {
	switch r {
	case RoleSystem:
		return openai.ChatMessageRoleSystem
	case RoleAssistant:
		return openai.ChatMessageRoleAssistant
	case RoleTool:
		return openai.ChatMessageRoleTool
	default:
		return openai.ChatMessageRoleUser
	}
}

// convertToolCalls 把 go-openai 的工具调用转为统一结构。
func convertToolCalls(calls []openai.ToolCall) []ToolCall {
	if len(calls) == 0 {
		return nil
	}
	out := make([]ToolCall, 0, len(calls))
	for _, tc := range calls {
		out = append(out, ToolCall{
			ID:   tc.ID,
			Type: string(tc.Type),
			Function: FunctionCall{
				Name:      tc.Function.Name,
				Arguments: tc.Function.Arguments,
			},
		})
	}
	return out
}

// derefInt 安全解引用 *int。
func derefInt(v *int) int {
	if v == nil {
		return 0
	}
	return *v
}

// MergeToolCallDeltas 把流式工具调用增量合并成完整的 []ToolCall。
// 流式协议中 ID 只在首片出现、Name 只在首片出现、Arguments 需要逐片拼接。
func MergeToolCallDeltas(deltas []ToolCallDelta) []ToolCall {
	if len(deltas) == 0 {
		return nil
	}
	byIndex := make(map[int]*ToolCall)
	order := make([]int, 0, len(deltas))
	for _, d := range deltas {
		tc, ok := byIndex[d.Index]
		if !ok {
			tc = &ToolCall{Type: "function"}
			byIndex[d.Index] = tc
			order = append(order, d.Index)
		}
		if tc.ID == "" && d.ID != "" {
			tc.ID = d.ID
		}
		if tc.Function.Name == "" && d.Name != "" {
			tc.Function.Name = d.Name
		}
		tc.Function.Arguments += d.Arguments
	}
	out := make([]ToolCall, 0, len(order))
	for _, idx := range order {
		out = append(out, *byIndex[idx])
	}
	return out
}
