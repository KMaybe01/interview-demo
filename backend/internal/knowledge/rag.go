package knowledge

import (
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"interview-demo/backend/internal/model"
)

type RAGService struct {
	knowledgeBases map[string]*model.KnowledgeBase
	documents      map[string][]model.Document
	chunks         map[string][]model.DocumentChunk
	mu             sync.RWMutex
}

func NewRAGService() *RAGService {
	return &RAGService{
		knowledgeBases: make(map[string]*model.KnowledgeBase),
		documents:      make(map[string][]model.Document),
		chunks:         make(map[string][]model.DocumentChunk),
	}
}

func (s *RAGService) CreateKnowledgeBase(name, description string) model.KnowledgeBase {
	s.mu.Lock()
	defer s.mu.Unlock()

	kb := model.KnowledgeBase{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		DocCount:    0,
		ChunkCount:  0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	s.knowledgeBases[kb.ID] = &kb
	s.documents[kb.ID] = []model.Document{}
	s.chunks[kb.ID] = []model.DocumentChunk{}

	return kb
}

func (s *RAGService) KnowledgeBase(id string) (*model.KnowledgeBase, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	kb, exists := s.knowledgeBases[id]
	return kb, exists
}

func (s *RAGService) ListKnowledgeBases() []model.KnowledgeBase {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []model.KnowledgeBase
	for _, kb := range s.knowledgeBases {
		result = append(result, *kb)
	}
	return result
}

func (s *RAGService) DeleteKnowledgeBase(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.knowledgeBases[id]; !exists {
		return false
	}

	delete(s.knowledgeBases, id)
	delete(s.documents, id)
	delete(s.chunks, id)
	return true
}

func (s *RAGService) AddDocument(kbID string, doc model.Document) model.Document {
	s.mu.Lock()
	defer s.mu.Unlock()

	doc.ID = uuid.New().String()
	doc.CreatedAt = time.Now()
	doc.UpdatedAt = time.Now()

	s.documents[kbID] = append(s.documents[kbID], doc)

	newChunks := s.chunkDocument(doc)
	s.chunks[kbID] = append(s.chunks[kbID], newChunks...)

	if kb, exists := s.knowledgeBases[kbID]; exists {
		kb.DocCount++
		kb.ChunkCount += len(newChunks)
		kb.UpdatedAt = time.Now()
	}

	return doc
}

func (s *RAGService) Documents(kbID string) []model.Document {
	s.mu.RLock()
	defer s.mu.RUnlock()

	docs := s.documents[kbID]
	if docs == nil {
		return []model.Document{}
	}
	return docs
}

func (s *RAGService) DeleteDocument(kbID, docID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	docs := s.documents[kbID]
	for i, doc := range docs {
		if doc.ID == docID {
			s.documents[kbID] = append(docs[:i], docs[i+1:]...)
			s.deleteChunksByDoc(kbID, docID)
			return true
		}
	}
	return false
}

func (s *RAGService) Search(query string, kbID string, topK int) model.SearchResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if topK <= 0 {
		topK = 5
	}

	var allChunks []model.DocumentChunk
	chunkToDoc := make(map[string]string)

	if kbID != "" {
		chunks := s.chunks[kbID]
		allChunks = append(allChunks, chunks...)
		m := s.buildChunkDocMap(kbID)
		for k, v := range m {
			chunkToDoc[k] = v
		}
	} else {
		for id, chunks := range s.chunks {
			allChunks = append(allChunks, chunks...)
			m := s.buildChunkDocMap(id)
			for k, v := range m {
				chunkToDoc[k] = v
			}
		}
	}

	type scoredChunk struct {
		chunk model.DocumentChunk
		score float64
		docID string
	}

	var scored []scoredChunk
	for _, chunk := range allChunks {
		score := s.calculateSimilarity(query, chunk.Content)
		if score > 0.1 {
			scored = append(scored, scoredChunk{
				chunk: chunk,
				score: score,
				docID: chunk.DocumentID,
			})
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	if topK > len(scored) {
		topK = len(scored)
	}

	var results []model.SearchResult
	for i := 0; i < topK; i++ {
		docTitle := ""
		docSource := ""
		if doc, exists := s.findDocument(scored[i].docID); exists {
			docTitle = doc.Title
			docSource = doc.Source
		}

		results = append(results, model.SearchResult{
			Chunk:     scored[i].chunk,
			Score:     scored[i].score,
			DocTitle:  docTitle,
			DocSource: docSource,
		})
	}

	return model.SearchResponse{Results: results}
}

func (s *RAGService) chunkDocument(doc model.Document) []model.DocumentChunk {
	var chunks []model.DocumentChunk
	content := doc.Content
	chunkSize := 500
	overlap := 50

	for i := 0; i < len(content); i += chunkSize - overlap {
		end := i + chunkSize
		if end > len(content) {
			end = len(content)
		}

		chunk := model.DocumentChunk{
			ID:         uuid.New().String(),
			DocumentID: doc.ID,
			Content:    content[i:end],
			ChunkIndex: len(chunks),
			Metadata: map[string]interface{}{
				"start": i,
				"end":   end,
			},
		}

		chunk.Embedding = s.generateSimpleEmbedding(chunk.Content)

		chunks = append(chunks, chunk)

		if end == len(content) {
			break
		}
	}

	return chunks
}

func (s *RAGService) generateSimpleEmbedding(text string) []float64 {
	dim := 100
	embedding := make([]float64, dim)

	tokens := tokenizeForEmbedding(text)
	for _, token := range tokens {
		hash := 0
		for _, c := range token {
			hash = (hash*31 + int(c)) % dim
		}
		embedding[hash] += 1.0
	}

	norm := 0.0
	for _, v := range embedding {
		norm += v * v
	}
	norm = math.Sqrt(norm)

	if norm > 0 {
		for i := range embedding {
			embedding[i] /= norm
		}
	}

	return embedding
}

func (s *RAGService) calculateSimilarity(text1, text2 string) float64 {
	embed1 := s.generateSimpleEmbedding(text1)
	embed2 := s.generateSimpleEmbedding(text2)

	dotProduct := 0.0
	norm1 := 0.0
	norm2 := 0.0

	for i := range embed1 {
		dotProduct += embed1[i] * embed2[i]
		norm1 += embed1[i] * embed1[i]
		norm2 += embed2[i] * embed2[i]
	}

	norm1 = math.Sqrt(norm1)
	norm2 = math.Sqrt(norm2)

	if norm1 == 0 || norm2 == 0 {
		return 0
	}

	return dotProduct / (norm1 * norm2)
}

func (s *RAGService) buildChunkDocMap(kbID string) map[string]string {
	chunkToDoc := make(map[string]string)
	for _, chunk := range s.chunks[kbID] {
		chunkToDoc[chunk.ID] = chunk.DocumentID
	}
	return chunkToDoc
}

func (s *RAGService) deleteChunksByDoc(kbID, docID string) {
	chunks := s.chunks[kbID]
	var newChunks []model.DocumentChunk
	for _, chunk := range chunks {
		if chunk.DocumentID != docID {
			newChunks = append(newChunks, chunk)
		}
	}
	s.chunks[kbID] = newChunks

	if kb, exists := s.knowledgeBases[kbID]; exists {
		kb.DocCount--
		kb.ChunkCount = len(newChunks)
	}
}

func tokenizeForEmbedding(text string) []string {
	var tokens []string
	current := strings.Builder{}
	for _, c := range text {
		if c >= 0x4E00 && c <= 0x9FFF {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			tokens = append(tokens, string(c))
		} else if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
		} else {
			current.WriteRune(c)
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}
	return tokens
}

func (s *RAGService) findDocument(docID string) (model.Document, bool) {
	for _, docs := range s.documents {
		for _, doc := range docs {
			if doc.ID == docID {
				return doc, true
			}
		}
	}
	return model.Document{}, false
}

func (s *RAGService) ContextForQuery(query string, kbID string) string {
	response := s.Search(query, kbID, 3)

	if len(response.Results) == 0 {
		return ""
	}

	context := "相关知识：\n"
	for _, result := range response.Results {
		context += "- " + result.DocTitle + ": " + result.Chunk.Content + "\n"
	}

	return context
}
