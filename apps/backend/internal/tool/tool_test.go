package tool

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestRegisterBuiltinsExposesExpectedTools(t *testing.T) {
	reg := NewRegistry()
	RegisterBuiltins(reg, BuiltinOptions{Clock: func() time.Time {
		return time.Date(2026, 3, 5, 10, 30, 0, 0, time.UTC)
	}})

	names := reg.Names()
	for _, want := range []string{"get_current_time", "calculate", "text_stats", "json_path", "uuid_gen", "format_json"} {
		if !contains(names, want) {
			t.Fatalf("缺少内置工具 %s，实际: %v", want, names)
		}
	}
	// 未注入 Searcher 时不应注册检索工具
	if contains(names, "search_knowledge") {
		t.Fatal("未注入 Searcher 时不应注册 search_knowledge")
	}

	if got := len(reg.ToLLM()); got != len(names) {
		t.Fatalf("ToLLM 数量不符: %d vs %d", got, len(names))
	}
}

func TestCalculateToolRealEvaluation(t *testing.T) {
	reg := NewRegistry()
	RegisterBuiltins(reg, BuiltinOptions{})

	cases := map[string]string{
		"1+2*3":       "7",
		"(1+2)*3-4/2": "7",
		"-2^2+7%3":    "-3",
		"10%3+2^8":    "257",
		"0.5*4":       "2",
	}
	for expr, want := range cases {
		res, err := reg.Execute(context.Background(), "calculate", map[string]any{"expression": expr}, ExecuteOptions{Tier: LevelRead})
		if err != nil {
			t.Fatalf("calculate(%s) 报错: %v", expr, err)
		}
		if res.Content != want {
			t.Errorf("calculate(%s) = %s, 期望 %s", expr, res.Content, want)
		}
	}

	if _, err := reg.Execute(context.Background(), "calculate", map[string]any{"expression": "1/0"}, ExecuteOptions{Tier: LevelRead}); err == nil {
		t.Error("除零应报错")
	}
	if _, err := reg.Execute(context.Background(), "calculate", map[string]any{"expression": "1+"}, ExecuteOptions{Tier: LevelRead}); err == nil {
		t.Error("非法表达式应报错")
	}
}

func TestSandboxBlocksInjectionAndEnforcesPermission(t *testing.T) {
	reg := NewRegistry()
	RegisterBuiltins(reg, BuiltinOptions{})

	// ① 参数净化：脚本注入被拦截
	_, err := reg.Execute(context.Background(), "format_json", map[string]any{"json": "<script>alert(1)</script>"}, ExecuteOptions{Tier: LevelSystem})
	if err == nil {
		t.Fatal("脚本注入应被拦截")
	}

	// ② 权限分级：L2 工具在低档位下必须走审批，Approved=false 时拒绝
	reg.Register(Definition{
		Name: "risky", Description: "高风险写操作", Level: LevelConfirm, Timeout: time.Second,
		Parameters: map[string]any{"type": "object"},
	}, func(ctx context.Context, args map[string]any) (string, error) { return "done", nil })

	if _, err := reg.Execute(context.Background(), "risky", nil, ExecuteOptions{Tier: LevelRead}); err == nil {
		t.Fatal("L2 工具在 L0 档位下未经批准应被拒绝")
	}
	res, err := reg.Execute(context.Background(), "risky", nil, ExecuteOptions{Tier: LevelRead, Approved: true})
	if err != nil || res.Content != "done" {
		t.Fatalf("经批准后应执行成功: %v", err)
	}

	// ③ 审计记录了拦截与成功
	events := reg.Audit().List(0)
	if len(events) < 3 {
		t.Fatalf("审计记录过少: %d", len(events))
	}
	summary := reg.Audit().Summary()
	counts, _ := summary["counts"].(map[string]int)
	if counts["blocked_permission"] < 1 || counts["blocked_injection"] < 1 {
		t.Fatalf("审计未记录拦截事件: %+v", counts)
	}
}

func TestToolTimeoutIsEnforced(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Definition{
		Name: "slow", Description: "会超时的工具", Level: LevelRead, Timeout: 20 * time.Millisecond,
		Parameters: map[string]any{"type": "object"},
	}, func(ctx context.Context, args map[string]any) (string, error) {
		<-ctx.Done()
		return "", ctx.Err()
	})

	_, err := reg.Execute(context.Background(), "slow", nil, ExecuteOptions{Tier: LevelRead})
	if err == nil || !strings.Contains(err.Error(), "超时") {
		t.Fatalf("期望超时错误，实际: %v", err)
	}
}

func TestTextStatsAndJSONPath(t *testing.T) {
	stats := AnalyzeText("人工智能 人工智能 hello hello world 123", 5)
	if stats.Chinese != 8 {
		t.Errorf("中文字符数期望 8，实际 %d", stats.Chinese)
	}
	if stats.English != 15 {
		t.Errorf("英文字符数期望 15，实际 %d", stats.English)
	}
	if stats.LongestWord != "hello" {
		t.Errorf("最长词期望 hello，实际 %q", stats.LongestWord)
	}
	if len(stats.TopWords) == 0 || stats.TopWords[0].Word != "hello" {
		t.Errorf("词频 Top1 期望 hello，实际 %+v", stats.TopWords)
	}

	var root any
	data := map[string]any{"a": map[string]any{"b": []any{map[string]any{"c": float64(42)}}}}
	if got, err := LookupJSONPath(data, "a.b[0].c"); err != nil || got != float64(42) {
		t.Errorf("LookupJSONPath 取值错误: %v %v", got, err)
	}
	if _, err := LookupJSONPath(root, "a.b"); err == nil {
		t.Error("空根节点取值应报错")
	}
}

func contains(list []string, target string) bool {
	for _, s := range list {
		if s == target {
			return true
		}
	}
	return false
}
