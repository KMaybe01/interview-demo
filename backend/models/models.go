package models

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

type ErrorResponse struct {
	Error string `json:"error"`
	Code  int    `json:"code"`
}

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

type Tool struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description" binding:"required"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
	Type        string                 `json:"type,omitempty"`
}

type ToolCall struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
	Result    interface{}            `json:"result,omitempty"`
	Error     string                 `json:"error,omitempty"`
}

type ToolDefinition struct {
	Type     string      `json:"type"`
	Function FunctionDef `json:"function"`
}

type FunctionDef struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type Workflow struct {
	ID          string         `json:"id"`
	Name        string         `json:"name" binding:"required"`
	Description string         `json:"description,omitempty"`
	Nodes       []WorkflowNode `json:"nodes"`
	Edges       []WorkflowEdge `json:"edges"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type WorkflowNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Config   map[string]interface{} `json:"config,omitempty"`
	Position map[string]float64     `json:"position,omitempty"`
}

type WorkflowEdge struct {
	Source    string `json:"source"`
	Target    string `json:"target"`
	Label     string `json:"label,omitempty"`
	Condition string `json:"condition,omitempty"`
}

type WorkflowExecution struct {
	ID         string                 `json:"id"`
	WorkflowID string                 `json:"workflow_id"`
	Status     string                 `json:"status"`
	Input      map[string]interface{} `json:"input,omitempty"`
	Output     map[string]interface{} `json:"output,omitempty"`
	NodeStates map[string]NodeState   `json:"node_states,omitempty"`
	StartedAt  time.Time              `json:"started_at"`
	FinishedAt *time.Time             `json:"finished_at,omitempty"`
}

type NodeState struct {
	Status   string      `json:"status"`
	Output   interface{} `json:"output,omitempty"`
	Error    string      `json:"error,omitempty"`
	Duration int64       `json:"duration_ms,omitempty"`
}

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
