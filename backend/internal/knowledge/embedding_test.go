package knowledge

import (
	"testing"

	"interview-demo/backend/internal/model"
)

func TestEmbeddingServiceEmbedText(t *testing.T) {
	s := NewEmbeddingService(EmbeddingLocal)
	result, err := s.EmbedText("hello world")
	if err != nil {
		t.Fatalf("EmbedText failed: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if len(result.Vector) != 768 {
		t.Errorf("expected 768-dim vector, got %d", len(result.Vector))
	}
	if result.TokenCount <= 0 {
		t.Errorf("expected positive token count, got %d", result.TokenCount)
	}
}

func TestEmbeddingServiceBatch(t *testing.T) {
	s := NewEmbeddingService(EmbeddingOpenAI)
	results, err := s.EmbedBatch([]string{"hello", "world"})
	if err != nil {
		t.Fatalf("EmbedBatch failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
}

func TestEmbeddingDifferentModels(t *testing.T) {
	openai := NewEmbeddingService(EmbeddingOpenAI)
	bge := NewEmbeddingService(EmbeddingBGE)
	local := NewEmbeddingService(EmbeddingLocal)

	o, _ := openai.EmbedText("test")
	b, _ := bge.EmbedText("test")
	l, _ := local.EmbedText("test")

	if len(o.Vector) != 1536 {
		t.Error("OpenAI embedding should be 1536-dim")
	}
	if len(b.Vector) != 1024 {
		t.Error("BGE embedding should be 1024-dim")
	}
	if len(l.Vector) != 768 {
		t.Error("Local embedding should be 768-dim")
	}
}

func TestMockEmbeddingNormalized(t *testing.T) {
	s := NewEmbeddingService(EmbeddingOpenAI)
	result, _ := s.EmbedText("test")
	norm := 0.0
	for _, v := range result.Vector {
		norm += v * v
	}
	if norm < 0.99 || norm > 1.01 {
		t.Errorf("expected normalized vector (norm~1), got %f", norm)
	}
}

func TestVectorDatabaseCreateCollection(t *testing.T) {
	db := NewVectorDatabase()
	col, err := db.CreateCollection("test", 128)
	if err != nil {
		t.Fatalf("CreateCollection failed: %v", err)
	}
	if col.Name != "test" {
		t.Errorf("expected name 'test', got %s", col.Name)
	}
}

func TestVectorDatabaseGetCollection(t *testing.T) {
	db := NewVectorDatabase()
	col, _ := db.CreateCollection("get-test", 64)

	got, exists := db.Collection(col.ID)
	if !exists {
		t.Fatal("expected collection to exist")
	}
	if got.Name != "get-test" {
		t.Errorf("expected name 'get-test', got %s", got.Name)
	}
}

func TestVectorDatabaseNonexistentCollection(t *testing.T) {
	db := NewVectorDatabase()
	_, exists := db.Collection("nonexistent")
	if exists {
		t.Fatal("expected nonexistent collection to return false")
	}
}

func TestVectorDatabaseDeleteCollection(t *testing.T) {
	db := NewVectorDatabase()
	col, _ := db.CreateCollection("delete", 32)

	if !db.DeleteCollection(col.ID) {
		t.Fatal("expected delete to succeed")
	}
	if db.DeleteCollection("nonexistent") {
		t.Fatal("expected delete of nonexistent to fail")
	}
}

func TestVectorDatabaseInsertAndSearch(t *testing.T) {
	db := NewVectorDatabase()
	col, _ := db.CreateCollection("search", 4)

	err := db.InsertVector(col.ID, []float64{1, 0, 0, 0}, nil, &model.DocumentChunk{
		Content: "doc1",
	})
	if err != nil {
		t.Fatalf("InsertVector failed: %v", err)
	}
	err = db.InsertVector(col.ID, []float64{0, 1, 0, 0}, nil, &model.DocumentChunk{
		Content: "doc2",
	})
	if err != nil {
		t.Fatalf("InsertVector failed: %v", err)
	}

	results, err := db.SearchVector(col.ID, []float64{1, 0, 0, 0}, 3)
	if err != nil {
		t.Fatalf("SearchVector failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Chunk.Content != "doc1" {
		t.Errorf("expected doc1 as top result, got %s", results[0].Chunk.Content)
	}
}

func TestVectorDatabaseSearchNonexistent(t *testing.T) {
	db := NewVectorDatabase()
	_, err := db.SearchVector("nonexistent", []float64{1, 0, 0, 0}, 5)
	if err != ErrCollectionNotFound {
		t.Errorf("expected ErrCollectionNotFound, got %v", err)
	}
}

func TestCosineSimilarity(t *testing.T) {
	sim := cosineSimilarity([]float64{1, 0}, []float64{1, 0})
	if sim < 0.99 {
		t.Errorf("expected ~1 for identical vectors, got %f", sim)
	}

	sim2 := cosineSimilarity([]float64{1, 0}, []float64{0, 1})
	if sim2 > 0.01 {
		t.Errorf("expected ~0 for orthogonal vectors, got %f", sim2)
	}

	sim3 := cosineSimilarity([]float64{1}, []float64{1, 0})
	if sim3 != 0 {
		t.Errorf("expected 0 for different length vectors, got %f", sim3)
	}
}

func TestVectorDatabaseExportImport(t *testing.T) {
	db := NewVectorDatabase()
	col, _ := db.CreateCollection("export", 4)
	_ = db.InsertVector(col.ID, []float64{1, 0, 0, 0}, nil, &model.DocumentChunk{
		Content: "data",
	})

	data, err := db.ExportCollection(col.ID)
	if err != nil {
		t.Fatalf("ExportCollection failed: %v", err)
	}

	db2 := NewVectorDatabase()
	err = db2.ImportCollection(data)
	if err != nil {
		t.Fatalf("ImportCollection failed: %v", err)
	}

	_, exists := db2.Collection(col.ID)
	if !exists {
		t.Fatal("expected imported collection to exist")
	}
}

func TestVectorDatabaseInsertNonexistentCollection(t *testing.T) {
	db := NewVectorDatabase()
	err := db.InsertVector("nonexistent", []float64{1}, nil, nil)
	if err != ErrCollectionNotFound {
		t.Errorf("expected ErrCollectionNotFound, got %v", err)
	}
}
