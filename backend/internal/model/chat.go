package model

import "time"

type Message struct {
	ID             string    `json:"id,omitempty"`
	Role           string    `json:"role" binding:"required"`
	Content        string    `json:"content" binding:"required"`
	Timestamp      time.Time `json:"timestamp,omitempty"`
	ConversationID string    `json:"conversation_id,omitempty"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
}

type ChatRequest struct {
	Messages       []Message `json:"messages" binding:"required"`
	Model          string    `json:"model,omitempty"`
	Stream         bool      `json:"stream,omitempty"`
	ConversationID string    `json:"conversation_id,omitempty"`
}

type ChatResponse struct {
	Message Message `json:"message"`
	Usage   Usage   `json:"usage,omitempty"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type StreamChunk struct {
	Content string `json:"content"`
	Done    bool   `json:"done"`
	Type    string `json:"type,omitempty"`
}
