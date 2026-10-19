package knowledge

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/internal/model"
)

func TestHandlerCreateAndListKnowledgeBase(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"name": "test-kb", "description": "test description"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/knowledge", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateKnowledgeBase(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var createResp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &createResp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	kbID := createResp["id"].(string)
	if kbID == "" {
		t.Fatal("expected non-empty id")
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = httptest.NewRequest(http.MethodGet, "/api/knowledge", nil)

	h.ListKnowledgeBases(c2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w2.Code)
	}

	var listResp map[string]interface{}
	if err := json.Unmarshal(w2.Body.Bytes(), &listResp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	count := listResp["count"].(float64)
	if count < 1 {
		t.Errorf("expected at least 1 KB, got %f", count)
	}
}

func TestHandlerCreateKBInvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/knowledge", strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateKnowledgeBase(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandlerGetKnowledgeBase(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	kb := rag.CreateKnowledgeBase("get-test", "desc")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: kb.ID}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/knowledge/"+kb.ID, nil)

	h.KnowledgeBaseDetail(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlerGetNonexistentKB(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: "nonexistent"}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/knowledge/nonexistent", nil)

	h.KnowledgeBaseDetail(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlerDeleteKnowledgeBase(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	kb := rag.CreateKnowledgeBase("del-test", "")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: kb.ID}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/knowledge/"+kb.ID, nil)

	h.DeleteKnowledgeBase(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if _, exists := rag.KnowledgeBase(kb.ID); exists {
		t.Error("expected KB to be deleted")
	}
}

func TestHandlerDeleteNonexistentKB(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: "nonexistent"}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/knowledge/nonexistent", nil)

	h.DeleteKnowledgeBase(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlerAddAndGetDocuments(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	kb := rag.CreateKnowledgeBase("doc-test", "")
	vdb.CreateCollectionWithID(kb.ID, "doc-test", 768)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: kb.ID}}
	body := `{"title": "test doc", "content": "this is test content for the document"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/knowledge/"+kb.ID+"/documents", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.AddDocument(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Params = []gin.Param{{Key: "id", Value: kb.ID}}
	c2.Request = httptest.NewRequest(http.MethodGet, "/api/knowledge/"+kb.ID+"/documents", nil)

	h.KnowledgeBaseDocuments(c2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w2.Code)
	}

	var getResp map[string]interface{}
	if err := json.Unmarshal(w2.Body.Bytes(), &getResp); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	count := getResp["count"].(float64)
	if count < 1 {
		t.Errorf("expected at least 1 document, got %f", count)
	}
}

func TestHandlerAddDocumentNonexistentKB(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: "nonexistent"}}
	body := `{"title": "doc", "content": "content"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/knowledge/nonexistent/documents", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.AddDocument(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlerDeleteDocument(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	kb := rag.CreateKnowledgeBase("del-doc", "")
	doc := rag.AddDocument(kb.ID, model.Document{Title: "doc", Content: "content"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: kb.ID}, {Key: "docId", Value: doc.ID}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/knowledge/"+kb.ID+"/documents/"+doc.ID, nil)

	h.DeleteDocument(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandlerSearch(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	kb := rag.CreateKnowledgeBase("search", "")
	rag.AddDocument(kb.ID, model.Document{Title: "test", Content: "sunny weather today"})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := `{"query": "sunny", "knowledgeBaseId": "` + kb.ID + `", "topK": 5}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/knowledge/search", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.Search(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlerBatchAddDocuments(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rag := NewRAGService()
	chunker := NewChunkerManager()
	embedding := NewEmbeddingService(EmbeddingLocal)
	vdb := NewVectorDatabase()

	h := NewHandler(rag, chunker, embedding, vdb)

	kb := rag.CreateKnowledgeBase("batch", "")
	vdb.CreateCollectionWithID(kb.ID, "batch", 768)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: kb.ID}}
	body := `{"documents": [{"title": "doc1", "content": "content1"}, {"title": "doc2", "content": "content2"}]}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/knowledge/"+kb.ID+"/documents/batch", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.BatchAddDocuments(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}
