package model

import "time"

type Document struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title" binding:"required"`
	Content   string                 `json:"content" binding:"required"`
	Source    string                 `json:"source,omitempty"`
	Category  string                 `json:"category,omitempty"`
	Tags      []string               `json:"tags,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
}

type DocumentChunk struct {
	ID         string                 `json:"id"`
	DocumentID string                 `json:"document_id"`
	Content    string                 `json:"content"`
	Embedding  []float64              `json:"embedding,omitempty"`
	ChunkIndex int                    `json:"chunk_index"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

type KnowledgeBase struct {
	ID          string    `json:"id"`
	Name        string    `json:"name" binding:"required"`
	Description string    `json:"description,omitempty"`
	DocCount    int       `json:"doc_count"`
	ChunkCount  int       `json:"chunk_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SearchRequest struct {
	Query           string  `json:"query" binding:"required"`
	KnowledgeBaseID string  `json:"knowledge_base_id,omitempty"`
	TopK            int     `json:"top_k,omitempty"`
	MinScore        float64 `json:"min_score,omitempty"`
}

type SearchResponse struct {
	Results []SearchResult `json:"results"`
}

type SearchResult struct {
	Chunk     DocumentChunk `json:"chunk"`
	Score     float64       `json:"score"`
	DocTitle  string        `json:"doc_title"`
	DocSource string        `json:"doc_source"`
}
