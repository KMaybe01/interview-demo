package chat

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/memory"
	"interview-demo/backend/internal/model"
)

type mockAgent struct{}

func (m *mockAgent) Execute(_ context.Context, _ string) (string, error) {
	return "agent response", nil
}

func newTestHandler() *Handler {
	llm := NewLLMService("")
	mem := memory.NewService()
	rag := knowledge.NewRAGService()
	return NewHandler(llm, mem, rag,
		func(id string) AgentExecutor {
			return &mockAgent{}
		},
		func(agentType, name string) AgentExecutor {
			return &mockAgent{}
		},
	)
}

func TestHandlerChatWithAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "hello", "useAgent": true}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	if resp["response"] != "agent response" {
		t.Errorf("expected 'agent response', got %v", resp["response"])
	}
}

func TestHandlerChatWithAgentByID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "hello", "useAgent": true, "agentId": "test-agent-id"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlerChatInvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(`invalid`))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandlerGetHistory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	h.memoryService.Add("hist-conv", model.Message{Role: "user", Content: "hi"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "conversationId", Value: "hist-conv"}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/chat/hist-conv/history", nil)

	h.History(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	count := resp["count"].(float64)
	if count != 1 {
		t.Errorf("expected 1 message, got %f", count)
	}
}

func TestHandlerClearHistory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	h.memoryService.Add("clear-conv", model.Message{Role: "user", Content: "test"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "conversationId", Value: "clear-conv"}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/chat/clear-conv/history", nil)

	h.ClearHistory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	history := h.memoryService.History("clear-conv", 10)
	if len(history) != 0 {
		t.Error("expected empty history after clear")
	}
}

type closeNotifyRecorder struct {
	*httptest.ResponseRecorder
	closeNotify chan bool
}

func (r *closeNotifyRecorder) CloseNotify() <-chan bool {
	return r.closeNotify
}

func TestHandlerChatStream(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	base := httptest.NewRecorder()
	w := &closeNotifyRecorder{
		ResponseRecorder: base,
		closeNotify:      make(chan bool),
	}
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "hello"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat/stream", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.ChatStream(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	ct := w.Header().Get("Content-Type")
	if ct != "text/event-stream" {
		t.Errorf("expected text/event-stream, got %s", ct)
	}
	if !strings.Contains(w.Body.String(), "[DONE]") {
		t.Error("expected [DONE] marker")
	}
}

func TestHandlerNewConversationID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "hello", "useAgent": true}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	if resp["conversationId"] == "" {
		t.Error("expected auto-generated conversationId")
	}
}

func TestHandlerWithKnowledgeBase(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()
	kb := h.ragService.CreateKnowledgeBase("test-kb", "")
	h.ragService.AddDocument(kb.ID, model.Document{Title: "test", Content: "test content for RAG"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "test content", "useAgent": true, "knowledgeBaseId": "` + kb.ID + `"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlerDefaultModelFailsWithoutAPIKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	llm := NewLLMService("")
	mem := memory.NewService()
	rag := knowledge.NewRAGService()
	h := NewHandler(llm, mem, rag, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "hello"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 without API key, got %d", w.Code)
	}
}

func TestHandlerWithConversationID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"content": "hello", "conversationId": "test-conv", "useAgent": true}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	if resp["conversationId"] != "test-conv" {
		t.Errorf("expected conversationId 'test-conv', got %v", resp["conversationId"])
	}
}
