package agent

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/internal/chat"
	"interview-demo/backend/internal/knowledge"
)

func newTestHandler() *Handler {
	llm := chat.NewLLMService("")
	rag := knowledge.NewRAGService()
	factory := NewFactory(llm, rag)
	manager := chat.DefaultModelManager()
	return NewHandler(factory, manager)
}

func TestHandlerCreateAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"type": "react", "name": "test-agent"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateAgent(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	if resp["id"] == "" {
		t.Error("expected non-empty id")
	}
	if resp["name"] != "test-agent" {
		t.Errorf("expected 'test-agent', got %v", resp["name"])
	}
}

func TestHandlerCreateAgentDefaultName(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"type": "function"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateAgent(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}
}

func TestHandlerCreateAgentRAG(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"type": "rag", "name": "rag-agent"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateAgent(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}
}

func TestHandlerCreateAgentMulti(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"type": "multi", "name": "multi-agent"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateAgent(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}
}

func TestHandlerListAgents(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()
	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{"type":"react","name":"agent1"}`))
	c1.Request.Header.Set("Content-Type", "application/json")
	h.CreateAgent(c1)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/agents", nil)

	h.ListAgents(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	count := resp["count"].(float64)
	if count < 1 {
		t.Errorf("expected at least 1 agent, got %f", count)
	}
}

func TestHandlerExecuteAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	wCreate := httptest.NewRecorder()
	cCreate, _ := gin.CreateTestContext(wCreate)
	cCreate.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{"type":"react","name":"exec-agent"}`))
	cCreate.Request.Header.Set("Content-Type", "application/json")
	h.CreateAgent(cCreate)

	var createResp map[string]interface{}
	json.Unmarshal(wCreate.Body.Bytes(), &createResp)
	agentID := createResp["id"].(string)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: agentID}}
	body := `{"input": "hello"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents/"+agentID+"/execute", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.ExecuteAgent(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlerExecuteNonexistentAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: "nonexistent"}}
	body := `{"input": "hello"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents/nonexistent/execute", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.ExecuteAgent(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlerGetAgentLog(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	wCreate := httptest.NewRecorder()
	cCreate, _ := gin.CreateTestContext(wCreate)
	cCreate.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{"type":"react","name":"log-agent"}`))
	cCreate.Request.Header.Set("Content-Type", "application/json")
	h.CreateAgent(cCreate)

	var createResp map[string]interface{}
	json.Unmarshal(wCreate.Body.Bytes(), &createResp)
	agentID := createResp["id"].(string)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: agentID}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/agents/"+agentID+"/log", nil)

	h.AgentLog(c)
}

func TestHandlerGetLogNonexistentAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: "nonexistent"}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/agents/nonexistent/log", nil)

	h.AgentLog(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlerDeleteAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	wCreate := httptest.NewRecorder()
	cCreate, _ := gin.CreateTestContext(wCreate)
	cCreate.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{"type":"react","name":"del-agent"}`))
	cCreate.Request.Header.Set("Content-Type", "application/json")
	h.CreateAgent(cCreate)

	var createResp map[string]interface{}
	json.Unmarshal(wCreate.Body.Bytes(), &createResp)
	agentID := createResp["id"].(string)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: agentID}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/agents/"+agentID, nil)

	h.DeleteAgent(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if _, exists := h.Agent(agentID); exists {
		t.Error("expected agent to be deleted")
	}
}

func TestHandlerDeleteNonexistentAgent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: "nonexistent"}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/agents/nonexistent", nil)

	h.DeleteAgent(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlerCreateAgentInvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newTestHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`invalid`))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateAgent(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
