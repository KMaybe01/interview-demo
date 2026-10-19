package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// newTestServer 起一个 gin 服务并挂载 POST /mcp。
func newTestServer(t *testing.T, reg *ServerRegistry) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.POST("/mcp", NewServer(reg).Handle)
	ts := httptest.NewServer(engine)
	t.Cleanup(ts.Close)
	return ts
}

// rpc 发送一个 JSON-RPC 请求，返回 HTTP 状态码与响应信封。
func rpc(t *testing.T, ts *httptest.Server, headers map[string]string, body string) (int, *Response) {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, ts.URL+"/mcp", strings.NewReader(body))
	if err != nil {
		t.Fatalf("构造请求失败: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	var out Response
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("响应解析失败: %v", err)
	}
	return resp.StatusCode, &out
}

// result 把响应的 result 解码到 out。
func result(t *testing.T, resp *Response, out any) {
	t.Helper()
	if resp.Error != nil {
		t.Fatalf("意外错误: [%d] %s", resp.Error.Code, resp.Error.Message)
	}
	raw, err := json.Marshal(resp.Result)
	if err != nil {
		t.Fatalf("result 序列化失败: %v", err)
	}
	if err := json.Unmarshal(raw, out); err != nil {
		t.Fatalf("result 解码失败: %v", err)
	}
}

func TestDiscoverReturnsProtocolCapabilities(t *testing.T) {
	ts := newTestServer(t, DefaultRegistry())
	code, resp := rpc(t, ts, map[string]string{HeaderProtocolVersion: ProtocolVersion, HeaderMethod: MethodDiscover},
		`{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{}}`)
	if code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", code)
	}
	var out DiscoverResult
	result(t, resp, &out)
	if out.ProtocolVersion != ProtocolVersion {
		t.Errorf("协议版本错误: %s", out.ProtocolVersion)
	}
	if len(out.Methods) != len(SupportedMethods) {
		t.Errorf("方法数不符: %d vs %d", len(out.Methods), len(SupportedMethods))
	}
	// 2026-07-28 无状态：能力发现里不应出现 initialize
	for _, m := range out.Methods {
		if m == "initialize" {
			t.Error("2026-07-28 不应提供 initialize 方法")
		}
	}
}

func TestToolsListAndBuiltinCalls(t *testing.T) {
	ts := newTestServer(t, DefaultRegistry())

	_, resp := rpc(t, ts, map[string]string{HeaderMethod: MethodToolsList},
		`{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`)
	var listed ToolsListResult
	result(t, resp, &listed)
	if len(listed.Tools) < 7 {
		t.Fatalf("内置工具数量不足: %d", len(listed.Tools))
	}

	call := func(name, args string) CallToolResult {
		t.Helper()
		_, r := rpc(t, ts, map[string]string{HeaderMethod: MethodToolsCall},
			fmt.Sprintf(`{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":%q,"arguments":%s}}`, name, args))
		var out CallToolResult
		result(t, r, &out)
		return out
	}

	if got := call("mcp.echo", `{"text":"hello"}`); got.IsError || got.Content[0].Text != "hello" {
		t.Errorf("echo 失败: %+v", got)
	}
	if got := call("mcp.calculate", `{"expression":"(1+2)*3-4/2"}`); got.IsError || got.Content[0].Text != "7" {
		t.Errorf("calculate 失败: %+v", got)
	}
	if got := call("mcp.calculate", `{"expression":"1/0"}`); !got.IsError {
		t.Error("除零应返回 isError=true")
	}
	if got := call("mcp.json_path", `{"json":{"a":{"b":[{"c":42}]}},"path":"a.b[0].c"}`); got.IsError || got.Content[0].Text != "42" {
		t.Errorf("json_path 失败: %+v", got)
	}
	if got := call("mcp.text_stats", `{"text":"人工智能 hello hello"}`); got.IsError || !strings.Contains(got.Content[0].Text, `"chinese"`) {
		t.Errorf("text_stats 失败: %+v", got)
	}
}

// chargeProvider 带副作用，用于验证幂等。
type chargeProvider struct{ calls atomic.Int64 }

func (p *chargeProvider) ListTools() []Tool {
	return []Tool{{Name: "charge", Description: "模拟扣款", InputSchema: map[string]any{"type": "object"}}}
}

func (p *chargeProvider) CallTool(ctx context.Context, name string, args map[string]any) (*CallToolResult, error) {
	return TextResult(fmt.Sprintf("charge#%d", p.calls.Add(1))), nil
}

func TestIdempotencyKeyReplaysFirstResult(t *testing.T) {
	provider := &chargeProvider{}
	reg := NewServerRegistry()
	reg.Register("demo", provider)
	ts := newTestServer(t, reg)

	call := func(key string) string {
		t.Helper()
		_, r := rpc(t, ts, map[string]string{HeaderMethod: MethodToolsCall},
			fmt.Sprintf(`{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"demo::charge","arguments":{"amount":1},"_meta":{"idempotencyKey":%q}}}`, key))
		var out CallToolResult
		result(t, r, &out)
		return out.Content[0].Text
	}

	first := call("order-1")
	if second := call("order-1"); second != first {
		t.Errorf("相同幂等键应回放首次结果: %s vs %s", first, second)
	}
	if provider.calls.Load() != 1 {
		t.Errorf("相同幂等键应只执行一次，实际 %d", provider.calls.Load())
	}
	if third := call("order-2"); third == first {
		t.Error("不同幂等键应产生新结果")
	}
	if provider.calls.Load() != 2 {
		t.Errorf("不同幂等键应各执行一次，实际 %d", provider.calls.Load())
	}
}

// mrtrProvider 演示 MRTR：首次返回 input_required，补齐后重发得到终态。
type mrtrProvider struct{}

func (mrtrProvider) ListTools() []Tool {
	return []Tool{{Name: "confirm", Description: "需确认", InputSchema: map[string]any{"type": "object"}}}
}

func (mrtrProvider) CallTool(ctx context.Context, name string, args map[string]any) (*CallToolResult, error) {
	responses, ok := InputResponsesFrom(ctx)
	if !ok {
		return &CallToolResult{
			ResultType:    ResultTypeInputRequired,
			RequestState:  "state-abc",
			InputRequests: []InputRequest{{ID: "confirm", Type: "text", Prompt: "是否继续？", Required: true}},
		}, nil
	}
	answer, _ := InputResponseValue(responses, "confirm")
	return TextResult("done:" + answer), nil
}

func TestMRTRInputRequiredThenResend(t *testing.T) {
	reg := NewServerRegistry()
	reg.Register("mrtr", mrtrProvider{})
	ts := newTestServer(t, reg)
	headers := map[string]string{HeaderMethod: MethodToolsCall}

	_, resp := rpc(t, ts, headers, `{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"mrtr::confirm","arguments":{}}}`)
	var pending CallToolResult
	result(t, resp, &pending)
	if pending.ResultType != ResultTypeInputRequired {
		t.Fatalf("期望 input_required，实际 %q", pending.ResultType)
	}
	if pending.RequestState == "" || len(pending.InputRequests) == 0 {
		t.Fatal("input_required 必须携带 requestState 与 inputRequests")
	}

	_, resp = rpc(t, ts, headers, fmt.Sprintf(
		`{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"mrtr::confirm","arguments":{},"requestState":%q,"inputResponses":[{"id":"confirm","value":"yes"}]}}`,
		pending.RequestState))
	var done CallToolResult
	result(t, resp, &done)
	if done.IsError || done.Content[0].Text != "done:yes" {
		t.Errorf("MRTR 重发结果错误: %+v", done)
	}
}

func TestDualEraLegacyVersionStillWorks(t *testing.T) {
	ts := newTestServer(t, DefaultRegistry())

	_, resp := rpc(t, ts, map[string]string{HeaderProtocolVersion: "2025-11-25", HeaderMethod: MethodToolsList},
		`{"jsonrpc":"2.0","id":7,"method":"tools/list","params":{}}`)
	var generic map[string]any
	result(t, resp, &generic)
	if _, ok := generic["warning"]; !ok {
		t.Error("旧版协议响应应附带 warning")
	}
	if _, ok := generic["tools"]; !ok {
		t.Error("旧版协议响应应包含 tools")
	}
}

func TestUnknownProtocolVersionRejected(t *testing.T) {
	ts := newTestServer(t, DefaultRegistry())
	_, resp := rpc(t, ts, map[string]string{HeaderProtocolVersion: "1999-01-01"},
		`{"jsonrpc":"2.0","id":8,"method":"tools/list","params":{}}`)
	if resp.Error == nil || resp.Error.Code != ErrCodeInvalidRequest {
		t.Fatalf("期望 -32600，实际 %+v", resp.Error)
	}
}

func TestErrorEnvelope(t *testing.T) {
	ts := newTestServer(t, DefaultRegistry())

	_, resp := rpc(t, ts, nil, `{"jsonrpc":"2.0","id":9,"method":"tools/nope","params":{}}`)
	if resp.Error == nil || resp.Error.Code != ErrCodeMethodNotFound {
		t.Errorf("期望 -32601，实际 %+v", resp.Error)
	}

	code, resp := rpc(t, ts, nil, `not-json`)
	if code != http.StatusBadRequest {
		t.Errorf("期望 HTTP 400，实际 %d", code)
	}
	if resp.Error == nil || resp.Error.Code != ErrCodeParse {
		t.Errorf("期望 -32700，实际 %+v", resp.Error)
	}
}

func TestClientListToolsAndCall(t *testing.T) {
	ts := newTestServer(t, DefaultRegistry())
	client := NewClient(ts.URL, WithBackoff(time.Millisecond))

	tools, err := client.ListTools(context.Background())
	if err != nil || len(tools) < 7 {
		t.Fatalf("ListTools 失败: %v (n=%d)", err, len(tools))
	}
	got, err := client.CallTool(context.Background(), "mcp.calculate", map[string]any{"expression": "10%3+2^8"})
	if err != nil || got.IsError || got.Content[0].Text != "257" {
		t.Fatalf("CallTool 失败: %v %+v", err, got)
	}
	if err := client.Ping(context.Background()); err != nil {
		t.Errorf("Ping 失败: %v", err)
	}
}
