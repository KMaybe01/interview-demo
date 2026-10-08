package a2a

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// newTestEngine 构造一个测试用 gin 引擎（已注册 3 个演示 Agent）。
func newTestEngine(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	srv := NewServer(DefaultRegistry())
	r := gin.New()
	srv.RegisterRoutes(r.Group("/api/a2a"))
	r.GET("/.well-known/agent.json", srv.WellKnown)
	return r
}

// doJSON 发起一次 JSON 请求。
func doJSON(t *testing.T, r *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	raw := ""
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		raw = string(b)
	}
	req := httptest.NewRequest(method, path, strings.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// decode 把响应体反序列化到 v。
func decode(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
		t.Fatalf("解析响应失败: %v, body=%s", err, w.Body.String())
	}
}

func TestWellKnownAndAgentCard(t *testing.T) {
	r := newTestEngine(t)

	w := doJSON(t, r, http.MethodGet, "/.well-known/agent.json", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", w.Code)
	}
	var card AgentCard
	decode(t, w, &card)
	if card.ID == "" || len(card.Skills) == 0 {
		t.Fatalf("默认卡不完整: %+v", card)
	}

	w = doJSON(t, r, http.MethodGet, "/api/a2a/agents/echo-agent/card", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", w.Code)
	}
	var echo AgentCard
	decode(t, w, &echo)
	if echo.ID != "echo-agent" || echo.Skills[0].ID != "echo" {
		t.Fatalf("echo-agent 卡片错误: %+v", echo)
	}

	w = doJSON(t, r, http.MethodGet, "/api/a2a/agents/nope/card", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("未知 Agent 期望 404，实际 %d", w.Code)
	}
}

func TestSendMessageCompletesWithRealArtifact(t *testing.T) {
	r := newTestEngine(t)

	w := doJSON(t, r, http.MethodPost, "/api/a2a/agents/echo-agent/tasks", SendMessageParams{Text: "Hello A2A"})
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d: %s", w.Code, w.Body.String())
	}
	var task Task
	decode(t, w, &task)
	if task.Status != TaskStatusCompleted {
		t.Fatalf("期望 completed，实际 %s", task.Status)
	}
	if len(task.Artifacts) != 1 {
		t.Fatalf("期望 1 个 Artifact，实际 %d", len(task.Artifacts))
	}
	if !strings.Contains(TextOf(task.Artifacts[0].Parts), "字符数=") {
		t.Fatalf("回显结果缺少真实统计: %s", TextOf(task.Artifacts[0].Parts))
	}
	// history 应包含 user + agent 两条
	if len(task.History) < 2 {
		t.Fatalf("history 条数不足: %d", len(task.History))
	}

	// tasks/get 能查到同一任务
	w = doJSON(t, r, http.MethodGet, "/api/a2a/tasks/"+task.ID, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", w.Code)
	}
	var fetched Task
	decode(t, w, &fetched)
	if fetched.ID != task.ID || fetched.Status != TaskStatusCompleted {
		t.Fatalf("tasks/get 不一致: %+v", fetched)
	}
}

func TestInputRequiredThenCancelRejectsSecondCancel(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reg := NewAgentRegistry()
	reg.RegisterAgent(
		AgentCard{ID: "ask-agent", Name: "Ask Agent"},
		RunnerFunc(func(ctx context.Context, task *Task, input []Part) ([]Artifact, error) {
			return nil, NewInputRequired("请提供目标语言")
		}),
	)
	srv := NewServer(reg)
	r := gin.New()
	srv.RegisterRoutes(r.Group("/api/a2a"))

	w := doJSON(t, r, http.MethodPost, "/api/a2a/agents/ask-agent/tasks", SendMessageParams{Text: "hi"})
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d: %s", w.Code, w.Body.String())
	}
	var task Task
	decode(t, w, &task)
	if task.Status != TaskStatusInputRequired {
		t.Fatalf("期望 input-required，实际 %s", task.Status)
	}
	if task.Metadata[MetadataKeyInputRequired] != "请提供目标语言" {
		t.Fatalf("metadata.inputRequired 不符: %+v", task.Metadata)
	}

	w = doJSON(t, r, http.MethodPost, "/api/a2a/tasks/"+task.ID+"/cancel", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", w.Code)
	}
	var canceled Task
	decode(t, w, &canceled)
	if canceled.Status != TaskStatusCanceled {
		t.Fatalf("期望 canceled，实际 %s", canceled.Status)
	}

	// 终态不可再次取消
	w = doJSON(t, r, http.MethodPost, "/api/a2a/tasks/"+task.ID+"/cancel", nil)
	if w.Code != http.StatusConflict {
		t.Fatalf("期望 409，实际 %d", w.Code)
	}
	var body map[string]any
	decode(t, w, &body)
	if code, _ := body["code"].(float64); int(code) != ErrCodeTaskNotCancelable {
		t.Fatalf("期望业务错误码 %d，实际 %v", ErrCodeTaskNotCancelable, body["code"])
	}
}

func TestDemoAgentsAreDeterministicAndReal(t *testing.T) {
	r := newTestEngine(t)

	// analyzer：真实字符统计
	w := doJSON(t, r, http.MethodPost, "/api/a2a/agents/analyzer-agent/tasks",
		SendMessageParams{Text: "人工智能 人工智能 hello hello world 123"})
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", w.Code)
	}
	var analyzed Task
	decode(t, w, &analyzed)
	text := TextOf(analyzed.Artifacts[0].Parts)
	if !strings.Contains(text, "最长词：hello") {
		t.Fatalf("分析结果错误: %s", text)
	}

	// translator：术语双向映射
	w = doJSON(t, r, http.MethodPost, "/api/a2a/agents/translator-agent/tasks",
		SendMessageParams{Text: "人工智能 与 机器学习"})
	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际 %d", w.Code)
	}
	var zh2en Task
	decode(t, w, &zh2en)
	got := TextOf(zh2en.Artifacts[0].Parts)
	if !strings.Contains(got, "artificial intelligence") || !strings.Contains(got, "machine learning") {
		t.Fatalf("中译英失败: %s", got)
	}

	w = doJSON(t, r, http.MethodPost, "/api/a2a/agents/translator-agent/tasks",
		SendMessageParams{Text: "machine learning and vector database"})
	var en2zh Task
	decode(t, w, &en2zh)
	got = TextOf(en2zh.Artifacts[0].Parts)
	if !strings.Contains(got, "机器学习") || !strings.Contains(got, "向量数据库") {
		t.Fatalf("英译中失败: %s", got)
	}
}

func TestTaskListFilters(t *testing.T) {
	r := newTestEngine(t)
	for _, text := range []string{"第一条", "第二条"} {
		if w := doJSON(t, r, http.MethodPost, "/api/a2a/agents/echo-agent/tasks", SendMessageParams{Text: text}); w.Code != http.StatusOK {
			t.Fatalf("创建任务失败: %s", w.Body.String())
		}
	}
	if w := doJSON(t, r, http.MethodPost, "/api/a2a/agents/analyzer-agent/tasks", SendMessageParams{Text: "abc 123"}); w.Code != http.StatusOK {
		t.Fatalf("创建任务失败: %s", w.Body.String())
	}

	var out TaskListResult
	w := doJSON(t, r, http.MethodGet, "/api/a2a/tasks?agentId=echo-agent", nil)
	decode(t, w, &out)
	if out.Count != 2 {
		t.Fatalf("期望 2 条 echo-agent 任务，实际 %d", out.Count)
	}

	w = doJSON(t, r, http.MethodGet, "/api/a2a/tasks?status=completed&limit=1", nil)
	decode(t, w, &out)
	if out.Count != 1 {
		t.Fatalf("limit=1 期望 1 条，实际 %d", out.Count)
	}

	w = doJSON(t, r, http.MethodGet, "/api/a2a/tasks?status=bogus", nil)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("非法状态期望 400，实际 %d", w.Code)
	}
}

func TestJSONRPCSingleEntry(t *testing.T) {
	gin.SetMode(gin.TestMode)
	srv := NewServer(DefaultRegistry())
	r := gin.New()
	r.POST("/api/a2a", srv.HandleRPC)

	w := doJSON(t, r, http.MethodPost, "/api/a2a", RPCRequest{
		JSONRPC: JSONRPCVersion, ID: 1, Method: MethodAgentsList,
	})
	var resp RPCResponse
	decode(t, w, &resp)
	if resp.Error != nil {
		t.Fatalf("agents/list 报错: %+v", resp.Error)
	}
	var agents AgentListResult
	b, _ := json.Marshal(resp.Result)
	if err := json.Unmarshal(b, &agents); err != nil {
		t.Fatal(err)
	}
	if agents.Count != 3 {
		t.Fatalf("期望 3 个 Agent，实际 %d", agents.Count)
	}

	w = doJSON(t, r, http.MethodPost, "/api/a2a", RPCRequest{JSONRPC: JSONRPCVersion, ID: 2, Method: "foo/bar"})
	decode(t, w, &resp)
	if resp.Error == nil || resp.Error.Code != ErrCodeMethodNotFound {
		t.Fatalf("期望 -32601，实际 %+v", resp.Error)
	}
}

func TestTaskStatusStateMachine(t *testing.T) {
	if !TaskStatusSubmitted.CanTransition(TaskStatusWorking) {
		t.Error("submitted 应可迁移到 working")
	}
	if !TaskStatusWorking.CanTransition(TaskStatusInputRequired) {
		t.Error("working 应可迁移到 input-required")
	}
	if TaskStatusCompleted.CanTransition(TaskStatusCanceled) {
		t.Error("completed 是终态，不应再迁移")
	}
	if !TaskStatusFailed.IsTerminal() || !TaskStatusCanceled.IsTerminal() {
		t.Error("failed/canceled 应为终态")
	}
	if _, ok := ParseTaskStatus("bogus"); ok {
		t.Error("非法状态应解析失败")
	}
	if st, ok := ParseTaskStatus("INPUT-REQUIRED"); !ok || st != TaskStatusInputRequired {
		t.Error("状态解析应大小写不敏感")
	}
}
