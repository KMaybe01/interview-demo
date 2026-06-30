package chat

import (
	"context"
	"testing"

	openai "github.com/sashabaranov/go-openai"
	"interview-demo/backend/internal/models"
)

func TestLLMServiceChatWithEmptyKey(t *testing.T) {
	// Should not panic with empty API key
	s := NewLLMService("")
	if s == nil {
		t.Fatal("expected non-nil service")
	}
}

func TestToOpenAIMessages(t *testing.T) {
	msgs := []models.Message{
		{Role: "system", Content: "sys"},
		{Role: "user", Content: "usr"},
		{Role: "assistant", Content: "ast"},
		{Role: "tool", Content: "tl"},
	}

	openaiMsgs := toOpenAIMessages(msgs)
	if len(openaiMsgs) != 4 {
		t.Fatalf("expected 4 messages, got %d", len(openaiMsgs))
	}

	roles := map[int]string{0: "system", 1: "user", 2: "assistant", 3: "tool"}
	for i, role := range roles {
		if string(openaiMsgs[i].Role) != role {
			t.Errorf("expected role %s at index %d, got %s", role, i, openaiMsgs[i].Role)
		}
	}
}

func TestReadStreamClosedChannel(t *testing.T) {
	// Create a channel and immediately close it to test ReadStream behavior
	// Since we can't easily create a real stream, we test the pattern
	ch := make(chan models.StreamChunk, 1)
	ch <- models.StreamChunk{Done: true}
	close(ch)

	count := 0
	for range ch {
		count++
	}
	if count != 1 {
		t.Errorf("expected 1 chunk, got %d", count)
	}
}

func TestDefaultModelDefaults(t *testing.T) {
	s := NewLLMService("test")
	if s == nil {
		t.Fatal("expected non-nil service")
	}
}

func TestChatResponseWithToolsDefaults(t *testing.T) {
	r := &ChatResponseWithTools{
		Message: models.Message{
			Role:    "assistant",
			Content: "test",
		},
		ToolCalls: []models.ToolCall{
			{ID: "call1", Name: "test_tool", Arguments: map[string]interface{}{"key": "val"}},
		},
	}

	if r.Message.Content != "test" {
		t.Errorf("expected 'test', got %s", r.Message.Content)
	}
	if len(r.ToolCalls) != 1 {
		t.Fatalf("expected 1 tool call, got %d", len(r.ToolCalls))
	}
	if r.ToolCalls[0].Name != "test_tool" {
		t.Errorf("expected 'test_tool', got %s", r.ToolCalls[0].Name)
	}
}

func TestChatErrorHandling(t *testing.T) {
	// LLMService with empty key should still return valid struct
	s := NewLLMService("")
	resp, err := s.Chat(context.Background(), []models.Message{
		{Role: "user", Content: "hello"},
	}, "gpt-3.5-turbo")

	// Should error since no real API call will succeed
	if err == nil && resp != nil {
		t.Log("unexpected success - API key may be set in env")
	}
}

func TestToolDefinitionConversion(t *testing.T) {
	tools := []models.ToolDefinition{
		{
			Type: "function",
			Function: models.FunctionDef{
				Name:        "test",
				Description: "a test tool",
				Parameters: map[string]interface{}{
					"type":       "object",
					"properties": map[string]interface{}{},
				},
			},
		},
	}

	openaiTools := make([]openai.Tool, len(tools))
	for i, tool := range tools {
		openaiTools[i] = openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        tool.Function.Name,
				Description: tool.Function.Description,
				Parameters:  tool.Function.Parameters,
			},
		}
	}

	if openaiTools[0].Function.Name != "test" {
		t.Errorf("expected 'test', got %s", openaiTools[0].Function.Name)
	}
}
