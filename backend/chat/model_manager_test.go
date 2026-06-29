package chat

import (
	"context"
	"testing"
	"time"

	"interview-demo/backend/models"
)

func TestDefaultModelManager(t *testing.T) {
	m := DefaultModelManager()
	if m == nil {
		t.Fatal("expected non-nil manager")
	}

	models := m.ListModels()
	if len(models) == 0 {
		t.Fatal("expected at least 1 model")
	}
}

func TestModelManagerRegisterAndGet(t *testing.T) {
	m := NewModelManager()
	m.RegisterModel(&ModelConfig{
		ID:        "test-model",
		Provider:  ProviderOpenAI,
		ModelName: "gpt-4o",
		MaxTokens: 4096,
		Timeout:   30 * time.Second,
	})

	client, exists := m.GetClient("test-model")
	if !exists {
		t.Fatal("expected client to exist")
	}
	if client == nil {
		t.Fatal("expected non-nil client")
	}

	_, exists = m.GetClient("nonexistent")
	if exists {
		t.Fatal("expected nonexistent client to return false")
	}
}

func TestModelManagerChat(t *testing.T) {
	m := NewModelManager()
	m.RegisterModel(&ModelConfig{
		ID:        "chat-test",
		Provider:  ProviderOpenAI,
		ModelName: "gpt-4o",
	})

	resp, err := m.Chat(context.Background(), "chat-test", []models.Message{
		{Role: "user", Content: "hello"},
	})
	if err != nil {
		t.Fatalf("Chat failed: %v", err)
	}
	if resp == "" {
		t.Fatal("expected non-empty response")
	}
}

func TestModelManagerChatWithTools(t *testing.T) {
	m := NewModelManager()
	m.RegisterModel(&ModelConfig{
		ID:        "tool-test",
		Provider:  ProviderOpenAI,
		ModelName: "gpt-4o",
	})

	resp, err := m.ChatWithTools(context.Background(), "tool-test",
		[]models.Message{{Role: "user", Content: "hello"}},
		[]ToolDefinition{{Name: "test", Description: "test tool"}},
	)
	if err != nil {
		t.Fatalf("ChatWithTools failed: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
}

func TestModelManagerNonexistentModel(t *testing.T) {
	m := NewModelManager()
	_, err := m.Chat(context.Background(), "nonexistent", nil)
	if err == nil {
		t.Fatal("expected error for nonexistent model")
	}
}

func TestModelSelector(t *testing.T) {
	m := DefaultModelManager()
	sel := NewModelSelector(m)

	codeModel := sel.SelectModel("code")
	if codeModel == "" {
		t.Error("expected a model for code task")
	}

	analysisModel := sel.SelectModel("analysis")
	if analysisModel == "" {
		t.Error("expected a model for analysis task")
	}

	caps := sel.GetModelCapabilities("openai-gpt4")
	if caps == nil {
		t.Fatal("expected capabilities")
	}
	if !caps["tools"] {
		t.Error("expected openai to support tools")
	}
}

func TestModelClients(t *testing.T) {
	cfg := &ModelConfig{
		ID:        "test",
		Provider:  ProviderOpenAI,
		ModelName: "gpt-4o",
	}

	openai := NewOpenAIClient(cfg)
	info := openai.GetModelInfo()
	if info.Provider != ProviderOpenAI {
		t.Errorf("expected OpenAI provider, got %s", info.Provider)
	}

	deepseek := NewDeepSeekClient(cfg)
	info = deepseek.GetModelInfo()
	if info.Provider != ProviderDeepSeek {
		t.Errorf("expected DeepSeek provider, got %s", info.Provider)
	}

	ollama := NewOllamaClient(cfg)
	info = ollama.GetModelInfo()
	if info.Provider != ProviderOllama {
		t.Errorf("expected Ollama provider, got %s", info.Provider)
	}
}

func TestModelClientChat(t *testing.T) {
	cfg := &ModelConfig{
		ID:        "test",
		Provider:  ProviderOpenAI,
		ModelName: "gpt-4o",
	}

	c := NewOpenAIClient(cfg)
	resp, err := c.Chat(context.Background(), []models.Message{{Role: "user", Content: "hi"}})
	if err != nil {
		t.Fatalf("Chat failed: %v", err)
	}
	if resp == "" {
		t.Fatal("expected non-empty response")
	}
}
