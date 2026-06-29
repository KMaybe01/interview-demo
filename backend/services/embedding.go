package services

import (
	"encoding/json"
	"math"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	"interview-demo/backend/models"
)

type EmbeddingModel string

const (
	EmbeddingOpenAI EmbeddingModel = "openai"
	EmbeddingBGE    EmbeddingModel = "bge"
	EmbeddingLocal  EmbeddingModel = "local"
)

type EmbeddingService struct {
	model      EmbeddingModel
	dimensions int
	mu         sync.RWMutex
}

func NewEmbeddingService(model EmbeddingModel) *EmbeddingService {
	dimensions := 1536
	switch model {
	case EmbeddingBGE:
		dimensions = 1024
	case EmbeddingLocal:
		dimensions = 768
	}
	return &EmbeddingService{
		model:      model,
		dimensions: dimensions,
	}
}

type EmbeddingResult struct {
	Vector     []float64
	TokenCount int
}

func (s *EmbeddingService) EmbedText(text string) (*EmbeddingResult, error) {
	vector := s.generateMockEmbedding(text)
	return &EmbeddingResult{
		Vector:     vector,
		TokenCount: len([]rune(text)) / 4,
	}, nil
}

func (s *EmbeddingService) EmbedBatch(texts []string) ([]*EmbeddingResult, error) {
	var results []*EmbeddingResult
	for _, text := range texts {
		result, err := s.EmbedText(text)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}

func (s *EmbeddingService) generateMockEmbedding(text string) []float64 {
	vector := make([]float64, s.dimensions)

	hash := 0
	for _, c := range text {
		hash = (hash*31 + int(c)) % s.dimensions
		vector[hash] += 1.0
	}

	for i := range vector {
		vector[i] += math.Sin(float64(i)*0.1) * 0.01
	}

	norm := 0.0
	for _, v := range vector {
		norm += v * v
	}
	norm = math.Sqrt(norm)
	if norm > 0 {
		for i := range vector {
			vector[i] /= norm
		}
	}

	return vector
}

type VectorDatabase struct {
	collections map[string]*Collection
	mu          sync.RWMutex
}

type Collection struct {
	ID        string
	Name      string
	Dimension int
	Vectors   []VectorEntry
	CreatedAt time.Time
}

type VectorEntry struct {
	ID       string
	Vector   []float64
	Metadata map[string]interface{}
	Document *models.DocumentChunk
}

func NewVectorDatabase() *VectorDatabase {
	return &VectorDatabase{
		collections: make(map[string]*Collection),
	}
}

func (db *VectorDatabase) CreateCollection(name string, dimension int) (*Collection, error) {
	return db.CreateCollectionWithID(uuid.New().String(), name, dimension)
}

func (db *VectorDatabase) CreateCollectionWithID(id, name string, dimension int) (*Collection, error) {
	db.mu.Lock()
	defer db.mu.Unlock()

	collection := &Collection{
		ID:        id,
		Name:      name,
		Dimension: dimension,
		Vectors:   make([]VectorEntry, 0),
		CreatedAt: time.Now(),
	}

	db.collections[collection.ID] = collection
	return collection, nil
}

func (db *VectorDatabase) DeleteCollection(id string) bool {
	db.mu.Lock()
	defer db.mu.Unlock()

	_, exists := db.collections[id]
	if !exists {
		return false
	}
	delete(db.collections, id)
	return true
}

func (db *VectorDatabase) GetCollection(id string) (*Collection, bool) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	collection, exists := db.collections[id]
	return collection, exists
}

func (db *VectorDatabase) InsertVector(collectionID string, vector []float64, metadata map[string]interface{}, chunk *models.DocumentChunk) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	collection, exists := db.collections[collectionID]
	if !exists {
		return os.ErrNotExist
	}

	entry := VectorEntry{
		ID:       uuid.New().String(),
		Vector:   vector,
		Metadata: metadata,
		Document: chunk,
	}

	collection.Vectors = append(collection.Vectors, entry)
	return nil
}

func (db *VectorDatabase) SearchVector(collectionID string, queryVector []float64, topK int) ([]SearchResultItem, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	collection, exists := db.collections[collectionID]
	if !exists {
		return nil, os.ErrNotExist
	}

	if topK <= 0 {
		topK = 5
	}

	type scoredVecItem struct {
		entry VectorEntry
		score float64
	}

	var scored []scoredVecItem
	for _, entry := range collection.Vectors {
		score := cosineSimilarity(queryVector, entry.Vector)
		scored = append(scored, scoredVecItem{entry: entry, score: score})
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	if topK > len(scored) {
		topK = len(scored)
	}

	var results []SearchResultItem
	for i := 0; i < topK; i++ {
		results = append(results, SearchResultItem{
			ID:       scored[i].entry.ID,
			Score:    scored[i].score,
			Metadata: scored[i].entry.Metadata,
			Chunk:    scored[i].entry.Document,
		})
	}

	return results, nil
}

type SearchResultItem struct {
	ID       string
	Score    float64
	Metadata map[string]interface{}
	Chunk    *models.DocumentChunk
}

func cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0
	}

	dotProduct := 0.0
	normA := 0.0
	normB := 0.0

	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	normA = math.Sqrt(normA)
	normB = math.Sqrt(normB)

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (normA * normB)
}

func (db *VectorDatabase) ExportCollection(id string) ([]byte, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	collection, exists := db.collections[id]
	if !exists {
		return nil, os.ErrNotExist
	}

	return json.Marshal(collection)
}

func (db *VectorDatabase) ImportCollection(data []byte) error {
	var collection Collection
	if err := json.Unmarshal(data, &collection); err != nil {
		return err
	}

	db.mu.Lock()
	defer db.mu.Unlock()

	db.collections[collection.ID] = &collection
	return nil
}
