package model

import "time"

type Application struct {
	ID               string    `json:"id"`
	Name             string    `json:"name" binding:"required"`
	Description      string    `json:"description,omitempty"`
	Type             string    `json:"type"`
	Config           AppConfig `json:"config"`
	KnowledgeBaseIDs []string  `json:"knowledge_base_ids,omitempty"`
	Tools            []string  `json:"tools,omitempty"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type AppConfig struct {
	SystemPrompt string  `json:"system_prompt,omitempty"`
	Model        string  `json:"model,omitempty"`
	Temperature  float64 `json:"temperature,omitempty"`
	MaxTokens    int     `json:"max_tokens,omitempty"`
	Tools        bool    `json:"tools,omitempty"`
	Memory       bool    `json:"memory,omitempty"`
	RAG          bool    `json:"rag,omitempty"`
}

type APIKey struct {
	ID        string     `json:"id"`
	Name      string     `json:"name" binding:"required"`
	Key       string     `json:"key"`
	Provider  string     `json:"provider"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	LastUsed  *time.Time `json:"last_used,omitempty"`
}
