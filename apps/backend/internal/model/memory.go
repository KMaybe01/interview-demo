package model

import "time"

type Memory struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	Content        string    `json:"content"`
	Role           string    `json:"role"`
	Summary        string    `json:"summary,omitempty"`
	Importance     float64   `json:"importance"`
	CreatedAt      time.Time `json:"created_at"`
	AccessedAt     time.Time `json:"accessed_at"`
	AccessCount    int       `json:"access_count"`
}

type MemorySearchRequest struct {
	Query          string  `json:"query"`
	ConversationID string  `json:"conversation_id,omitempty"`
	TopK           int     `json:"top_k,omitempty"`
	MinImportance  float64 `json:"min_importance,omitempty"`
}
