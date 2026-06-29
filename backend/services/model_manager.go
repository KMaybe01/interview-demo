package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"interview-demo/backend/models"
)

type ModelProvider string

const (
	ProviderOpenAI   ModelProvider = "openai"
	ProviderDeepSeek ModelProvider = "deepseek"
	ProviderOllama   ModelProvider = "ollama"
	ProviderAzure    ModelProvider = "azure"
)

type ModelConfig struct {
	ID          string        `json:"id"`
	Provider    ModelProvider `json:"provider"`
	ModelName   string        `json:"model_name"`
	APIKey      string        `json:"api_key,omitempty"`
	BaseURL     string        `json:"base_url,omitempty"`
	MaxTokens   int           `json:"max_tokens"`
	Temperature float64       `json:"temperature"`
	Timeout     time.Duration `json:"timeout"`
}

type ModelManager struct {
	configs map[string]*ModelConfig
	clients map[string]ModelClient
	mu      sync.RWMutex
}

type ModelClient interface {
	Chat(ctx context.Context, messages []models.Message) (string, error)
	ChatWithTools(ctx context.Context, messages []models.Message, tools []ToolDefinition) (*ChatResponse, error)
	GetModelInfo() ModelInfo
}

type ToolDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type ChatResponse struct {
	Content      string
	ToolCalls    []ToolCall
	Usage        TokenUsage
	FinishReason string
}

type ToolCall struct {
	ID        string
	Name      string
	Arguments map[string]interface{}
}

type TokenUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

type ModelInfo struct {
	Provider        ModelProvider
	ModelName       string
	ContextWindow   int
	MaxOutputTokens int
	SupportsTools   bool
	SupportsVision  bool
}

func NewModelManager() *ModelManager {
	return &ModelManager{
		configs: make(map[string]*ModelConfig),
		clients: make(map[string]ModelClient),
	}
}

func (m *ModelManager) RegisterModel(config *ModelConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.configs[config.ID] = config
	m.clients[config.ID] = m.createClient(config)
}

func (m *ModelManager) GetClient(id string) (ModelClient, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, exists := m.clients[id]
	return client, exists
}

func (m *ModelManager) ListModels() []ModelConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var configs []ModelConfig
	for _, config := range m.configs {
		configs = append(configs, *config)
	}
	return configs
}

func (m *ModelManager) createClient(config *ModelConfig) ModelClient {
	switch config.Provider {
	case ProviderOpenAI:
		return NewOpenAIClient(config)
	case ProviderDeepSeek:
		return NewDeepSeekClient(config)
	case ProviderOllama:
		return NewOllamaClient(config)
	default:
		return NewOpenAIClient(config)
	}
}

func (m *ModelManager) Chat(ctx context.Context, modelID string, messages []models.Message) (string, error) {
	client, exists := m.GetClient(modelID)
	if !exists {
		return "", fmt.Errorf("模型 %s 不存在", modelID)
	}
	return client.Chat(ctx, messages)
}

func (m *ModelManager) ChatWithTools(ctx context.Context, modelID string, messages []models.Message, tools []ToolDefinition) (*ChatResponse, error) {
	client, exists := m.GetClient(modelID)
	if !exists {
		return nil, fmt.Errorf("模型 %s 不存在", modelID)
	}
	return client.ChatWithTools(ctx, messages, tools)
}

type OpenAIClient struct {
	config *ModelConfig
}

func NewOpenAIClient(config *ModelConfig) *OpenAIClient {
	return &OpenAIClient{config: config}
}

func (c *OpenAIClient) Chat(ctx context.Context, messages []models.Message) (string, error) {
	return fmt.Sprintf("OpenAI %s 响应: 我理解了你的请求。", c.config.ModelName), nil
}

func (c *OpenAIClient) ChatWithTools(ctx context.Context, messages []models.Message, tools []ToolDefinition) (*ChatResponse, error) {
	if len(tools) == 0 {
		content, err := c.Chat(ctx, messages)
		if err != nil {
			return nil, err
		}
		return &ChatResponse{
			Content:      content,
			ToolCalls:    []ToolCall{},
			Usage:        TokenUsage{PromptTokens: 100, CompletionTokens: 50, TotalTokens: 150},
			FinishReason: "stop",
		}, nil
	}
	return &ChatResponse{
		Content: "我需要调用工具来完成这个任务。",
		ToolCalls: []ToolCall{
			{
				ID:   uuid.New().String(),
				Name: tools[0].Name,
				Arguments: map[string]interface{}{
					"input": "示例输入",
				},
			},
		},
		Usage: TokenUsage{
			PromptTokens:     100,
			CompletionTokens: 50,
			TotalTokens:      150,
		},
		FinishReason: "tool_calls",
	}, nil
}

func (c *OpenAIClient) GetModelInfo() ModelInfo {
	return ModelInfo{
		Provider:        ProviderOpenAI,
		ModelName:       c.config.ModelName,
		ContextWindow:   128000,
		MaxOutputTokens: 4096,
		SupportsTools:   true,
		SupportsVision:  true,
	}
}

type DeepSeekClient struct {
	config *ModelConfig
}

func NewDeepSeekClient(config *ModelConfig) *DeepSeekClient {
	return &DeepSeekClient{config: config}
}

func (c *DeepSeekClient) Chat(ctx context.Context, messages []models.Message) (string, error) {
	return fmt.Sprintf("DeepSeek %s 响应: 让我来帮你分析这个问题。", c.config.ModelName), nil
}

func (c *DeepSeekClient) ChatWithTools(ctx context.Context, messages []models.Message, tools []ToolDefinition) (*ChatResponse, error) {
	return &ChatResponse{
		Content: "DeepSeek 推理中...",
		Usage: TokenUsage{
			PromptTokens:     100,
			CompletionTokens: 50,
			TotalTokens:      150,
		},
		FinishReason: "stop",
	}, nil
}

func (c *DeepSeekClient) GetModelInfo() ModelInfo {
	return ModelInfo{
		Provider:        ProviderDeepSeek,
		ModelName:       c.config.ModelName,
		ContextWindow:   64000,
		MaxOutputTokens: 4096,
		SupportsTools:   true,
		SupportsVision:  false,
	}
}

type OllamaClient struct {
	config *ModelConfig
}

func NewOllamaClient(config *ModelConfig) *OllamaClient {
	return &OllamaClient{config: config}
}

func (c *OllamaClient) Chat(ctx context.Context, messages []models.Message) (string, error) {
	return fmt.Sprintf("Ollama %s 本地响应: 你好！我是本地模型。", c.config.ModelName), nil
}

func (c *OllamaClient) ChatWithTools(ctx context.Context, messages []models.Message, tools []ToolDefinition) (*ChatResponse, error) {
	return &ChatResponse{
		Content: "Ollama 本地模型处理中...",
		Usage: TokenUsage{
			PromptTokens:     100,
			CompletionTokens: 50,
			TotalTokens:      150,
		},
		FinishReason: "stop",
	}, nil
}

func (c *OllamaClient) GetModelInfo() ModelInfo {
	return ModelInfo{
		Provider:        ProviderOllama,
		ModelName:       c.config.ModelName,
		ContextWindow:   8192,
		MaxOutputTokens: 2048,
		SupportsTools:   false,
		SupportsVision:  false,
	}
}

type ModelSelector struct {
	manager *ModelManager
}

func NewModelSelector(manager *ModelManager) *ModelSelector {
	return &ModelSelector{manager: manager}
}

func (s *ModelSelector) SelectModel(taskType string) string {
	configs := s.manager.ListModels()

	switch taskType {
	case "code":
		for _, c := range configs {
			if c.Provider == ProviderDeepSeek {
				return c.ID
			}
		}
	case "analysis":
		for _, c := range configs {
			if c.Provider == ProviderOpenAI {
				return c.ID
			}
		}
	case "local":
		for _, c := range configs {
			if c.Provider == ProviderOllama {
				return c.ID
			}
		}
	}

	for _, c := range configs {
		return c.ID
	}
	return ""
}

func (s *ModelSelector) GetModelCapabilities(modelID string) map[string]bool {
	client, exists := s.manager.GetClient(modelID)
	if !exists {
		return nil
	}

	info := client.GetModelInfo()
	return map[string]bool{
		"tools":        info.SupportsTools,
		"vision":       info.SupportsVision,
		"long_context": info.ContextWindow > 32000,
	}
}

func DefaultModelManager() *ModelManager {
	manager := NewModelManager()

	manager.RegisterModel(&ModelConfig{
		ID:          "openai-gpt4",
		Provider:    ProviderOpenAI,
		ModelName:   "gpt-4o",
		MaxTokens:   4096,
		Temperature: 0.7,
		Timeout:     30 * time.Second,
	})

	manager.RegisterModel(&ModelConfig{
		ID:          "deepseek-chat",
		Provider:    ProviderDeepSeek,
		ModelName:   "deepseek-chat",
		MaxTokens:   4096,
		Temperature: 0.7,
		Timeout:     30 * time.Second,
	})

	manager.RegisterModel(&ModelConfig{
		ID:          "ollama-llama3",
		Provider:    ProviderOllama,
		ModelName:   "llama3.2",
		BaseURL:     "http://localhost:11434",
		MaxTokens:   2048,
		Temperature: 0.7,
		Timeout:     60 * time.Second,
	})

	return manager
}
