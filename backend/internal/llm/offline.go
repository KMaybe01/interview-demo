package llm

import (
	"context"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"
)

// OfflineProvider 是最后一道兜底：当所有真实 provider 都不可用（未配置密钥、限流、熔断）时，
// 它保证服务仍能返回结构化响应，避免前端白屏。
//
// 重要：它的输出**不是模型推理结果**，响应中会明确标注 Provider="offline"、
// FinishReason="degraded"，上层必须据此向用户展示「当前为降级模式」提示。
type OfflineProvider struct{}

var (
	offlineOnce sync.Once
	offlineInst *OfflineProvider
)

// Offline 返回进程级共享的离线降级实例。
func Offline() *OfflineProvider {
	offlineOnce.Do(func() { offlineInst = &OfflineProvider{} })
	return offlineInst
}

// ID 返回 provider 标识。
func (*OfflineProvider) ID() string { return "offline" }

// DisplayName 返回可读名称。
func (*OfflineProvider) DisplayName() string { return "离线降级模式" }

// Models 返回离线 provider 暴露的虚拟模型。
func (*OfflineProvider) Models() []ModelInfo {
	return []ModelInfo{{
		ID: "offline-fallback", Name: "离线降级模型", Provider: "offline",
		ContextWindow: 8192, MaxOutput: 2048, Capabilities: []string{"chat"},
	}}
}

// SupportsTools 离线模式不支持 function calling。
func (*OfflineProvider) SupportsTools() bool { return false }

// SupportsEmbedding 离线模式使用本地哈希向量，不算真实嵌入。
func (*OfflineProvider) SupportsEmbedding() bool { return true }

// Configured 离线 provider 永远可用。
func (*OfflineProvider) Configured() bool { return true }

// Chat 返回一条明确标注降级的响应。
func (*OfflineProvider) Chat(ctx context.Context, req Request) (*Response, error) {
	prompt := LastUserContent(req.Messages)
	usage := Usage{
		PromptTokens:     EstimateMessagesTokens(req.Messages),
		CompletionTokens: TokenEstimate(prompt) + 64,
	}
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens

	return &Response{
		Content:      offlineAnswer(prompt, req.Model),
		FinishReason: "degraded",
		Usage:        usage,
		Model:        req.Model,
		Provider:     "offline",
	}, nil
}

// Stream 以流式方式输出降级响应，逐句推送，模拟真实流的节奏。
func (*OfflineProvider) Stream(ctx context.Context, req Request) (<-chan Chunk, error) {
	prompt := LastUserContent(req.Messages)
	full := offlineAnswer(prompt, req.Model)
	segments := splitForStream(full)

	ch := make(chan Chunk, len(segments)+2)
	go func() {
		defer close(ch)
		for _, seg := range segments {
			select {
			case ch <- Chunk{Content: seg, Model: req.Model, Provider: "offline"}:
			case <-ctx.Done():
				return
			}
			time.Sleep(12 * time.Millisecond)
		}
		u := Usage{
			PromptTokens:     EstimateMessagesTokens(req.Messages),
			CompletionTokens: TokenEstimate(full),
		}
		u.TotalTokens = u.PromptTokens + u.CompletionTokens
		select {
		case ch <- Chunk{FinishReason: "degraded", Usage: &u, Model: req.Model, Provider: "offline"}:
		case <-ctx.Done():
		}
	}()
	return ch, nil
}

// Embed 返回确定性哈希向量（bag-of-characters + L2 归一化）。
// 这不是语义嵌入，仅用于离线自洽；一旦有真实嵌入 provider，RAG 层会优先使用真实向量。
func (*OfflineProvider) Embed(ctx context.Context, texts []string) ([][]float64, error) {
	out := make([][]float64, 0, len(texts))
	for _, t := range texts {
		out = append(out, hashEmbedding(t, 256))
	}
	return out, nil
}

// LastUserContent 返回最后一条用户消息的内容。
func LastUserContent(messages []Message) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == RoleUser {
			return messages[i].Content
		}
	}
	return ""
}

// offlineAnswer 生成降级文案：如实说明当前状态，并回显问题要点，不做任何"假装懂"的编造。
func offlineAnswer(prompt, model string) string {
	var b strings.Builder
	b.WriteString("⚠️ 当前处于**离线降级模式**：未配置可用的 LLM 密钥，或所有已配置的模型服务暂时不可用。\n\n")
	if model != "" {
		b.WriteString(fmt.Sprintf("- 目标模型：`%s`\n", model))
	}
	b.WriteString("- 本回复由本地兜底逻辑生成，**不是模型推理结果**\n\n")

	if strings.TrimSpace(prompt) == "" {
		b.WriteString("请先在服务端配置 `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` / `GEMINI_API_KEY` 等环境变量后重启服务。")
		return b.String()
	}

	b.WriteString("已收到你的输入（长度 ")
	b.WriteString(fmt.Sprintf("%d", len([]rune(prompt))))
	b.WriteString(" 字符），要点回显如下：\n\n> ")
	excerpt := prompt
	if len([]rune(excerpt)) > 200 {
		excerpt = string([]rune(excerpt)[:200]) + "…"
	}
	b.WriteString(strings.ReplaceAll(excerpt, "\n", "\n> "))
	b.WriteString("\n\n配置好密钥后，同一条输入会走真实模型推理。")
	return b.String()
}

// splitForStream 把降级文案切成流式小段（按 2 个 rune 粒度，便于观察打字效果）。
func splitForStream(text string) []string {
	runes := []rune(text)
	out := make([]string, 0, len(runes)/2+1)
	for i := 0; i < len(runes); i += 2 {
		end := i + 2
		if end > len(runes) {
			end = len(runes)
		}
		out = append(out, string(runes[i:end]))
	}
	return out
}

// hashEmbedding 生成确定性的哈希向量并做 L2 归一化。
// 同一输入永远得到同一向量，保证离线检索结果稳定可复现。
func hashEmbedding(text string, dim int) []float64 {
	vec := make([]float64, dim)
	runes := []rune(strings.ToLower(text))
	for i := 0; i < len(runes); i++ {
		h := uint32(2166136261)
		// 用 2-gram 捕捉一点局部词序信息
		gram := runes[i]
		if i+1 < len(runes) {
			gram = gram*31 + runes[i+1]
		}
		for _, c := range []rune(string(gram)) {
			h = (h * 16777619) ^ uint32(c)
		}
		vec[int(h)%dim] += 1
	}
	var norm float64
	for _, v := range vec {
		norm += v * v
	}
	norm = math.Sqrt(norm)
	if norm > 0 {
		for i := range vec {
			vec[i] /= norm
		}
	}
	return vec
}

// Cosine 计算两个向量的余弦相似度；维度不同或长度为 0 时返回 0。
func Cosine(a, b []float64) float64 {
	if len(a) == 0 || len(a) != len(b) {
		return 0
	}
	var dot, na, nb float64
	for i := range a {
		dot += a[i] * b[i]
		na += a[i] * a[i]
		nb += b[i] * b[i]
	}
	if na == 0 || nb == 0 {
		return 0
	}
	return dot / (math.Sqrt(na) * math.Sqrt(nb))
}
