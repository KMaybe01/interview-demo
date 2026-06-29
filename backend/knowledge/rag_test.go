package knowledge

import (
	"testing"

	"interview-demo/backend/models"
)

func TestCreateAndGetKnowledgeBase(t *testing.T) {
	s := NewRAGService()

	kb := s.CreateKnowledgeBase("test-kb", "test description")
	if kb.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if kb.Name != "test-kb" {
		t.Errorf("expected name 'test-kb', got %s", kb.Name)
	}

	got, exists := s.GetKnowledgeBase(kb.ID)
	if !exists {
		t.Fatal("expected knowledge base to exist")
	}
	if got.Name != "test-kb" {
		t.Errorf("expected name 'test-kb', got %s", got.Name)
	}
}

func TestGetNonexistentKnowledgeBase(t *testing.T) {
	s := NewRAGService()
	_, exists := s.GetKnowledgeBase("nonexistent")
	if exists {
		t.Fatal("expected nonexistent KB to return false")
	}
}

func TestListKnowledgeBases(t *testing.T) {
	s := NewRAGService()
	s.CreateKnowledgeBase("kb1", "")
	s.CreateKnowledgeBase("kb2", "")

	list := s.ListKnowledgeBases()
	if len(list) != 2 {
		t.Fatalf("expected 2 KBs, got %d", len(list))
	}
}

func TestDeleteKnowledgeBase(t *testing.T) {
	s := NewRAGService()
	kb := s.CreateKnowledgeBase("delete-me", "")

	deleted := s.DeleteKnowledgeBase(kb.ID)
	if !deleted {
		t.Fatal("expected delete to succeed")
	}
	if s.DeleteKnowledgeBase("nonexistent") {
		t.Fatal("expected delete of nonexistent to fail")
	}
}

func TestAddAndGetDocument(t *testing.T) {
	s := NewRAGService()
	kb := s.CreateKnowledgeBase("docs", "")

	doc := s.AddDocument(kb.ID, models.Document{
		Title:   "test doc",
		Content: "this is test content for the document",
	})
	if doc.ID == "" {
		t.Fatal("expected non-empty document ID")
	}

	docs := s.GetDocuments(kb.ID)
	if len(docs) != 1 {
		t.Fatalf("expected 1 document, got %d", len(docs))
	}
}

func TestDeleteDocument(t *testing.T) {
	s := NewRAGService()
	kb := s.CreateKnowledgeBase("del-doc", "")
	doc := s.AddDocument(kb.ID, models.Document{Title: "doc", Content: "content"})

	if !s.DeleteDocument(kb.ID, doc.ID) {
		t.Fatal("expected delete to succeed")
	}
	if s.DeleteDocument(kb.ID, "nonexistent") {
		t.Fatal("expected delete of nonexistent to fail")
	}
}

func TestSearch(t *testing.T) {
	s := NewRAGService()
	kb := s.CreateKnowledgeBase("search", "")
	s.AddDocument(kb.ID, models.Document{Title: "weather", Content: "today is sunny and warm"})
	s.AddDocument(kb.ID, models.Document{Title: "news", Content: "breaking news alert"})

	results := s.Search("sunny", kb.ID, 5)
	if len(results.Results) == 0 {
		t.Fatal("expected search results")
	}
}

func TestSearchAcrossAll(t *testing.T) {
	s := NewRAGService()
	kb1 := s.CreateKnowledgeBase("kb1", "")
	kb2 := s.CreateKnowledgeBase("kb2", "")
	s.AddDocument(kb1.ID, models.Document{Title: "doc1", Content: "alpha content"})
	s.AddDocument(kb2.ID, models.Document{Title: "doc2", Content: "beta content"})

	results := s.Search("alpha", "", 5)
	if len(results.Results) == 0 {
		t.Fatal("expected cross-KB search results")
	}
}

func TestGetContextForQuery(t *testing.T) {
	s := NewRAGService()
	kb := s.CreateKnowledgeBase("ctx", "")
	s.AddDocument(kb.ID, models.Document{Title: "info", Content: "relevant information here"})

	ctx := s.GetContextForQuery("relevant", kb.ID)
	if ctx == "" {
		t.Fatal("expected non-empty context")
	}
	if !contains(ctx, "relevant") {
		t.Errorf("expected context to contain 'relevant', got %s", ctx)
	}

	empty := s.GetContextForQuery("zzzzz", kb.ID)
	if empty != "" {
		t.Fatal("expected empty context for no match")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsSubstring(s, substr)
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestGenerateSimpleEmbedding(t *testing.T) {
	s := NewRAGService()
	embed := s.generateSimpleEmbedding("test text")
	if len(embed) != 100 {
		t.Errorf("expected 100-dim embedding, got %d", len(embed))
	}
	// Should be normalized
	norm := 0.0
	for _, v := range embed {
		norm += v * v
	}
	if norm < 0.99 || norm > 1.01 {
		t.Errorf("expected normalized vector (norm~1), got %f", norm)
	}
}

func TestCalculateSimilarity(t *testing.T) {
	s := NewRAGService()
	sim := s.calculateSimilarity("hello world", "hello world")
	if sim < 0.99 {
		t.Errorf("expected high similarity for same text, got %f", sim)
	}

	sim2 := s.calculateSimilarity("hello world", "zzzzzzz")
	if sim2 < 0 {
		t.Errorf("expected non-negative similarity, got %f", sim2)
	}
}
