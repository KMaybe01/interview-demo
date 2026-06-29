package chat

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/knowledge"
	"interview-demo/backend/memory"
	"interview-demo/backend/models"
)

type mockAgent struct{}

func (m *mockAgent) Execute(_ context.Context, _ string) (string, error) {
	return "agent response", nil
}

func newTestChatHandler() *ChatHandler {
	llm := NewLLMService("")
	mem := memory.NewMemoryService()
	rag := knowledge.NewRAGService()
	return NewChatHandler(llm, mem, rag,
		func(id string) AgentExecutor {
			return &mockAgent{}
		},
		func(agentType, name string) AgentExecutor {
			return &mockAgent{}
		},
	)
}

func TestChatHandlerChatWithAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

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

func TestChatHandlerChatWithAgentByID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

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

func TestChatHandlerChatInvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(`invalid`))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Chat(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestChatHandlerGetHistory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

	h.memoryService.Add("hist-conv", models.Message{Role: "user", Content: "hi"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "conversationId", Value: "hist-conv"}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/chat/hist-conv/history", nil)

	h.GetHistory(c)

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

func TestChatHandlerClearHistory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

	h.memoryService.Add("clear-conv", models.Message{Role: "user", Content: "test"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "conversationId", Value: "clear-conv"}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/chat/clear-conv/history", nil)

	h.ClearHistory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	history := h.memoryService.GetHistory("clear-conv", 10)
	if len(history) != 0 {
		t.Error("expected empty history after clear")
	}
}

func TestChatHandlerChatStream(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

	w := httptest.NewRecorder()
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

func TestChatHandlerNewConversationID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

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

func TestChatHandlerWithKnowledgeBase(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()
	kb := h.ragService.CreateKnowledgeBase("test-kb", "")
	h.ragService.AddDocument(kb.ID, models.Document{Title: "test", Content: "test content for RAG"})

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

func TestChatHandlerDefaultModelFailsWithoutAPIKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	llm := NewLLMService("")
	mem := memory.NewMemoryService()
	rag := knowledge.NewRAGService()
	h := NewChatHandler(llm, mem, rag, nil, nil)

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

func TestChatHandlerWithConversationID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestChatHandler()

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
