package llm

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestOfflineProviderStreamsAndMarksDegraded(t *testing.T) {
	p := Offline()
	messages := []Message{{Role: RoleUser, Content: "介绍一下 MCP 协议"}}

	resp, err := p.Chat(context.Background(), Request{Model: "gpt-4o-mini", Messages: messages})
	if err != nil {
		t.Fatalf("Chat 失败: %v", err)
	}
	if resp.Provider != "offline" || resp.FinishReason != "degraded" {
		t.Fatalf("降级响应必须标记 provider/finishReason: %+v", resp)
	}
	if resp.Usage.TotalTokens <= 0 {
		t.Errorf("降级响应也应估算 token: %+v", resp.Usage)
	}

	ch, err := p.Stream(context.Background(), Request{Model: "gpt-4o-mini", Messages: messages})
	if err != nil {
		t.Fatalf("Stream 失败: %v", err)
	}
	var got string
	var finish Chunk
	for c := range ch {
		got += c.Content
		if c.FinishReason != "" {
			finish = c
		}
	}
	if got == "" {
		t.Fatal("流式降级不应为空")
	}
	if finish.FinishReason != "degraded" {
		t.Errorf("流末帧应标记 degraded，实际 %q", finish.FinishReason)
	}
}

func TestOfflineEmbeddingIsDeterministic(t *testing.T) {
	vecs, err := Offline().Embed(context.Background(), []string{"MCP 协议", "MCP 协议"})
	if err != nil {
		t.Fatalf("Embed 失败: %v", err)
	}
	if len(vecs) != 2 {
		t.Fatalf("期望 2 个向量，实际 %d", len(vecs))
	}
	if Cosine(vecs[0], vecs[1]) < 0.999 {
		t.Error("相同输入应得到相同向量（幂等）")
	}
	other, _ := Offline().Embed(context.Background(), []string{"完全无关的另一个主题"})
	if Cosine(vecs[0], other[0]) > 0.9 {
		t.Error("不同输入的降维向量不应高度相似")
	}
}

func TestMergeToolCallDeltas(t *testing.T) {
	deltas := []ToolCallDelta{
		{Index: 0, ID: "call_1", Name: "calculate"},
		{Index: 0, Arguments: "{\"exp"},
		{Index: 0, Arguments: "ression\":\"1+1\"}"},
		{Index: 1, ID: "call_2", Name: "get_current_time", Arguments: "{}"},
	}
	merged := MergeToolCallDeltas(deltas)
	if len(merged) != 2 {
		t.Fatalf("期望 2 个工具调用，实际 %d", len(merged))
	}
	if merged[0].ID != "call_1" || merged[0].Function.Name != "calculate" {
		t.Errorf("调用 0 解析错误: %+v", merged[0])
	}
	if merged[0].Function.Arguments != `{"expression":"1+1"}` {
		t.Errorf("参数拼接错误: %q", merged[0].Function.Arguments)
	}
	args := merged[0].ArgumentsMap()
	if args["expression"] != "1+1" {
		t.Errorf("ArgumentsMap 解析错误: %+v", args)
	}
	if merged[1].Function.Name != "get_current_time" {
		t.Errorf("调用 1 解析错误: %+v", merged[1])
	}
	if got := MergeToolCallDeltas(nil); got != nil {
		t.Error("空增量应返回 nil")
	}
}

func TestRegistryResolvesProviderByModelName(t *testing.T) {
	reg := NewRegistry()
	catalog := DefaultModelCatalog()
	reg.Register(NewCompatProvider(CompatConfig{
		ID: "openai", DisplayName: "OpenAI", APIKey: "sk-test", Models: catalog["openai"],
	}), true)
	reg.Register(NewCompatProvider(CompatConfig{
		ID: "deepseek", DisplayName: "DeepSeek", APIKey: "sk-ds",
		BaseURL: "https://api.deepseek.com/v1", Models: catalog["deepseek"],
	}), false)

	if p, ok := reg.Resolve("deepseek-chat"); !ok || p.ID() != "deepseek" {
		t.Fatalf("deepseek-chat 应路由到 deepseek，实际 %v", p)
	}
	if p, ok := reg.Resolve("gpt-4o-mini"); !ok || p.ID() != "openai" {
		t.Fatalf("gpt-4o-mini 应路由到 openai，实际 %v", p)
	}
	// 未登记的模型按前缀猜测
	if p, ok := reg.Resolve("qwen-max"); !ok {
		t.Fatal("未登记模型应回退到默认 provider")
	} else if p.ID() != "openai" {
		t.Errorf("未登记模型应回退到默认 provider，实际 %s", p.ID())
	}

	if err := reg.BindModel("deepseek-chat", "openai"); err != nil {
		t.Fatalf("BindModel 失败: %v", err)
	}
	if p, _ := reg.Resolve("deepseek-chat"); p.ID() != "openai" {
		t.Error("显式绑定后应优先使用绑定关系")
	}

	if len(reg.ListModels()) == 0 {
		t.Error("ListModels 不应为空")
	}
}

func TestFallbackChainExecutesUntilSuccess(t *testing.T) {
	attempts := 0
	chain := NewFallbackChain("test")
	chain.Add(func(ctx context.Context) (*Response, error) {
		attempts++
		return nil, errors.New("主模型超时")
	})
	chain.Add(func(ctx context.Context) (*Response, error) {
		attempts++
		return &Response{Content: "来自便宜模型", Provider: "cheap"}, nil
	})
	chain.Add(func(ctx context.Context) (*Response, error) {
		attempts++
		return &Response{Content: "不应执行"}, nil
	})

	resp, err := chain.Execute(context.Background())
	if err != nil {
		t.Fatalf("Execute 失败: %v", err)
	}
	if resp.Provider != "cheap" || attempts != 2 {
		t.Fatalf("降级链行为错误: %+v attempts=%d", resp, attempts)
	}

	// 全部失败
	failing := NewFallbackChain("all-fail")
	failing.Add(func(ctx context.Context) (*Response, error) { return nil, errors.New("boom") })
	if _, err := failing.Execute(context.Background()); err == nil {
		t.Error("全部失败时应返回错误")
	}
}

func TestCircuitBreakerOpensAndRecovers(t *testing.T) {
	b := NewCircuitBreaker(2, 200*time.Millisecond)
	if !b.Allow() {
		t.Fatal("初始应为 closed")
	}
	_ = b.Call(func() error { return errors.New("fail") }, nil)
	_ = b.Call(func() error { return errors.New("fail") }, nil)
	if b.State() != CircuitOpen {
		t.Fatalf("连续失败应打开熔断器，实际 %s", b.State())
	}

	// 熔断期间应直接走 fallback
	fallbackUsed := false
	_ = b.Call(func() error { return nil }, func() error { fallbackUsed = true; return nil })
	if !fallbackUsed {
		t.Error("熔断打开时应执行 fallback")
	}

	time.Sleep(220 * time.Millisecond)
	if b.State() != CircuitHalfOpen {
		t.Fatalf("超时后应进入 half-open，实际 %s", b.State())
	}
	_ = b.Call(func() error { return nil }, nil)
	if b.State() != CircuitClosed {
		t.Errorf("探测成功后应闭合，实际 %s", b.State())
	}
}

func TestPricingEstimation(t *testing.T) {
	table := NewPricingTable()
	cost := table.Estimate("gpt-4o-mini", Usage{PromptTokens: 1_000_000, CompletionTokens: 1_000_000})
	if cost.Total <= 0 {
		t.Fatalf("成本估算应大于 0: %+v", cost)
	}
	if cost.Estimated {
		t.Error("已登记模型不应标记为估算价")
	}
	// 未登记模型应回退兜底价并标记 estimated
	unknown := table.Estimate("some-unknown-model-xyz", Usage{PromptTokens: 1000})
	if !unknown.Estimated {
		t.Error("未登记模型应标记 estimated=true")
	}
	table.UpdatePrice("gpt-4o-mini", Price{Input: 1, Output: 2})
	if got := table.Estimate("gpt-4o-mini", Usage{PromptTokens: 1_000_000}); got.Input != 1 {
		t.Errorf("价格覆盖未生效: %+v", got)
	}
}

func TestTokenEstimates(t *testing.T) {
	if TokenEstimate("") != 0 {
		t.Error("空文本应为 0")
	}
	cjk := TokenEstimate("人工智能")
	latin := TokenEstimate("artificial intelligence")
	if cjk <= 0 || latin <= 0 {
		t.Fatalf("token 估算应大于 0: cjk=%d latin=%d", cjk, latin)
	}
	if got := EstimateMessagesTokens([]Message{{Role: RoleUser, Content: "hello"}}); got <= 0 {
		t.Error("消息级估算应大于 0")
	}
}
