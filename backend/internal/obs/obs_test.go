package obs

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestRecorderTraceAndSpan(t *testing.T) {
	r := NewRecorder(10)
	trace := r.StartTrace("ai.chat")

	root := r.StartSpan(trace.TraceID, "llm.step.0", SpanLLM, "")
	root.Attrs["model"] = "gpt-4o-mini"
	root.AddEvent("first-token", map[string]any{"ttftMs": 120})
	r.EndSpan(root, nil)

	failed := r.StartSpan(trace.TraceID, "tool.search", SpanTool, root.SpanID)
	r.EndSpan(failed, errors.New("工具超时"))
	r.EndTrace(trace)

	got, ok := r.GetTrace(trace.TraceID)
	if !ok {
		t.Fatal("链路应可查询")
	}
	if len(got.Spans) != 2 {
		t.Fatalf("期望 2 个 span，实际 %d", len(got.Spans))
	}
	if got.Status != "error" {
		t.Errorf("存在失败 span 时链路状态应为 error，实际 %s", got.Status)
	}
	if len(got.Spans[0].Events) != 1 {
		t.Error("span 事件未保留")
	}
	if r.ListTraces(5)[0].TraceID != trace.TraceID {
		t.Error("ListTraces 排序错误")
	}
}

func TestRecorderRunCountersAndMetrics(t *testing.T) {
	r := NewRecorder(100)
	now := time.Now()

	for i := 0; i < 10; i++ {
		status := "ok"
		if i == 9 {
			status = "error"
		}
		r.RecordRun(Run{
			Kind: RunChat, Model: "gpt-4o-mini", Provider: "openai",
			PromptTokens: 100, CompletionTokens: 50, TotalTokens: 150,
			CostUSD: 0.01, LatencyMs: int64(100 + i*10), TTFTMs: int64(50 + i),
			Status: status, CacheHit: i < 2,
			CreatedAt: now,
		})
	}

	counters := r.Counters()
	if counters["requests"] != int64(10) {
		t.Errorf("请求计数错误: %v", counters["requests"])
	}
	if counters["errors"] != int64(1) {
		t.Errorf("错误计数错误: %v", counters["errors"])
	}
	if counters["tokens"] != int64(1500) {
		t.Errorf("token 累计错误: %v", counters["tokens"])
	}

	m := r.Metrics(now.Add(-time.Hour), time.Hour)
	if m.Requests != 10 {
		t.Errorf("窗口内请求数错误: %d", m.Requests)
	}
	if m.ErrorRate < 0.099 || m.ErrorRate > 0.101 {
		t.Errorf("错误率错误: %f", m.ErrorRate)
	}
	if m.CacheHitRate < 0.199 || m.CacheHitRate > 0.201 {
		t.Errorf("缓存命中率错误: %f", m.CacheHitRate)
	}
	if m.Latency.P95 <= m.Latency.P50 {
		t.Errorf("P95 应大于 P50: %+v", m.Latency)
	}
	if len(m.ByModel) == 0 || m.ByModel[0].Key != "gpt-4o-mini" {
		t.Errorf("按模型分组错误: %+v", m.ByModel)
	}
	if len(m.Timeline) == 0 {
		t.Error("时间序列不应为空")
	}
}

func TestPercentile(t *testing.T) {
	values := []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	if got := Percentile(values, 50); got < 5 || got > 6 {
		t.Errorf("P50 计算错误: %f", got)
	}
	if got := Percentile(values, 95); got < 9.5 {
		t.Errorf("P95 计算错误: %f", got)
	}
	if got := Percentile(nil, 50); got != 0 {
		t.Error("空切片应返回 0")
	}
	if got := Percentile([]float64{7}, 99); got != 7 {
		t.Error("单元素应返回该元素")
	}
}

func TestEvalScoringAndThresholds(t *testing.T) {
	store := NewEvalStore()
	ds := store.CreateDataset("smoke", []EvalCase{
		{ID: "c1", Question: "MCP 是什么协议？", Reference: "MCP 是模型上下文协议", Keywords: []string{"MCP"}},
		{ID: "c2", Question: "A2A 解决什么问题？", Reference: "A2A 解决 Agent 之间协作", Keywords: []string{"A2A"}},
	})

	answer := func(ctx context.Context, question string, topK int) (string, []string, int, float64, error) {
		if question == "MCP 是什么协议？" {
			// 完全 grounded：答案里的每个词都能在上下文中找到 → 忠实度应接近 1
			return "MCP 是模型上下文协议（Model Context Protocol）。", []string{"MCP 是模型上下文协议（Model Context Protocol）。"}, 120, 0.001, nil
		}
		// 第二条：答非所问 + 召回噪声 + 无依据内容，应判失败
		return "今天天气不错。", []string{"无关的段落内容。"}, 80, 0.001, nil
	}

	got, err := store.RunEval(context.Background(), ds.ID, 3, DefaultThresholds(), answer)
	if err != nil {
		t.Fatalf("RunEval 失败: %v", err)
	}
	if got.Summary.Total != 2 {
		t.Fatalf("用例数错误: %d", got.Summary.Total)
	}
	if !got.Cases[0].Passed {
		t.Errorf("高相关用例应通过: %+v", got.Cases[0])
	}
	if got.Cases[0].Faithfulness < 0.7 {
		t.Errorf("忠实度评分过低: %f", got.Cases[0].Faithfulness)
	}
	if got.Cases[1].Passed {
		t.Errorf("答非所问用例不应通过: %+v", got.Cases[1])
	}
	if got.Summary.PassRate > 0.51 {
		t.Errorf("整体通过率不应超过 0.5: %f", got.Summary.PassRate)
	}
	if len(store.Runs(5)) != 1 {
		t.Error("评测结果未保存")
	}
}

func TestEvalHandlesAnswerError(t *testing.T) {
	store := NewEvalStore()
	ds := store.CreateDataset("err", []EvalCase{{ID: "e1", Question: "q", Reference: "r"}})

	got, err := store.RunEval(context.Background(), ds.ID, 1, DefaultThresholds(),
		func(ctx context.Context, q string, topK int) (string, []string, int, float64, error) {
			return "", nil, 0, 0, errors.New("模型不可用")
		})
	if err != nil {
		t.Fatalf("单条失败不应导致整体报错: %v", err)
	}
	if got.Cases[0].Error == "" || got.Cases[0].Passed {
		t.Errorf("失败的用例应记录 error 且判不通过: %+v", got.Cases[0])
	}
}

func TestPromptVersioning(t *testing.T) {
	reg := NewPromptRegistry()
	reg.EnsureDefaults()

	tpl, ok := reg.Active("rag.answer")
	if !ok {
		t.Fatal("默认提示词未注册")
	}
	if !containsVar(tpl.Variables, "context") || !containsVar(tpl.Variables, "question") {
		t.Fatalf("变量解析错误: %v", tpl.Variables)
	}

	rendered, version, err := reg.RenderActive("rag.answer", map[string]string{"context": "C", "question": "Q"})
	if err != nil {
		t.Fatalf("渲染失败: %v", err)
	}
	if version != 1 || rendered == "" {
		t.Fatalf("渲染结果错误: v%d %q", version, rendered)
	}
	if _, _, err := reg.RenderActive("rag.answer", map[string]string{"context": "C"}); err == nil {
		t.Error("缺少变量应报错")
	}

	// 发布 v2 并回滚
	reg.Create("rag.answer", "v2 内容 {context} {question}", "改版", nil)
	if err := reg.Activate("rag.answer", 2); err != nil {
		t.Fatalf("Activate 失败: %v", err)
	}
	if active, _ := reg.Active("rag.answer"); active.Version != 2 {
		t.Fatalf("激活版本错误: %d", active.Version)
	}
	if err := reg.Activate("rag.answer", 1); err != nil {
		t.Fatalf("回滚失败: %v", err)
	}
	if active, _ := reg.Active("rag.answer"); active.Version != 1 {
		t.Fatalf("回滚后版本错误: %d", active.Version)
	}
	if len(reg.History("rag.answer")) != 2 {
		t.Error("版本历史不完整")
	}
	if err := reg.Activate("rag.answer", 99); err == nil {
		t.Error("激活不存在的版本应报错")
	}
}

func containsVar(list []string, target string) bool {
	for _, v := range list {
		if v == target {
			return true
		}
	}
	return false
}
