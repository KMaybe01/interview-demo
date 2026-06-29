package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	openai "github.com/sashabaranov/go-openai"
	"interview-demo/backend/models"
)

type LLMService struct {
	client *openai.Client
}

func NewLLMService(apiKey string) *LLMService {
	config := openai.DefaultConfig(apiKey)
	client := openai.NewClientWithConfig(config)

	return &LLMService{
		client: client,
	}
}

func toOpenAIMessages(messages []models.Message) []openai.ChatCompletionMessage {
	openaiMessages := make([]openai.ChatCompletionMessage, len(messages))
	for i, msg := range messages {
		role := openai.ChatMessageRoleUser
		switch msg.Role {
		case "assistant":
			role = openai.ChatMessageRoleAssistant
		case "system":
			role = openai.ChatMessageRoleSystem
		case "tool":
			role = openai.ChatMessageRoleTool
		}
		openaiMessages[i] = openai.ChatCompletionMessage{
			Role:    role,
			Content: msg.Content,
		}
	}
	return openaiMessages
}

func (s *LLMService) Chat(ctx context.Context, messages []models.Message, model string) (*models.ChatResponse, error) {
	if model == "" {
		model = openai.GPT3Dot5Turbo
	}

	openaiMessages := toOpenAIMessages(messages)

	resp, err := s.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    model,
			Messages: openaiMessages,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("API 调用失败: %w", err)
	}

	return &models.ChatResponse{
		Message: models.Message{
			Role:    "assistant",
			Content: resp.Choices[0].Message.Content,
		},
		Usage: models.Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
	}, nil
}

func (s *LLMService) ChatStream(ctx context.Context, messages []models.Message, model string) (*openai.ChatCompletionStream, error) {
	if model == "" {
		model = openai.GPT3Dot5Turbo
	}

	openaiMessages := toOpenAIMessages(messages)

	stream, err := s.client.CreateChatCompletionStream(
		ctx,
		openai.ChatCompletionRequest{
			Model:    model,
			Messages: openaiMessages,
			Stream:   true,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("流式 API 调用失败: %w", err)
	}

	return stream, nil
}

func ReadStream(stream *openai.ChatCompletionStream, ch chan<- models.StreamChunk) {
	defer close(ch)

	for {
		response, err := stream.Recv()
		if err == io.EOF {
			ch <- models.StreamChunk{Done: true}
			return
		}

		if err != nil {
			ch <- models.StreamChunk{
				Content: fmt.Sprintf("错误: %v", err),
				Done:    true,
			}
			return
		}

		if len(response.Choices) > 0 {
			ch <- models.StreamChunk{
				Content: response.Choices[0].Delta.Content,
				Done:    false,
			}
		}
	}
}

type ChatResponseWithTools struct {
	Message   models.Message
	Usage     models.Usage
	ToolCalls []models.ToolCall
}

func (s *LLMService) ChatWithTools(ctx context.Context, messages []models.Message, model string, tools []models.ToolDefinition) (*ChatResponseWithTools, error) {
	if model == "" {
		model = openai.GPT3Dot5Turbo
	}

	openaiMessages := toOpenAIMessages(messages)

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

	resp, err := s.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    model,
			Messages: openaiMessages,
			Tools:    openaiTools,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("API 调用失败: %w", err)
	}

	var toolCalls []models.ToolCall
	if len(resp.Choices) > 0 && resp.Choices[0].Message.ToolCalls != nil {
		for _, tc := range resp.Choices[0].Message.ToolCalls {
			var args map[string]interface{}
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
				args = make(map[string]interface{})
			}
			toolCalls = append(toolCalls, models.ToolCall{
				ID:        tc.ID,
				Name:      tc.Function.Name,
				Arguments: args,
			})
		}
	}

	return &ChatResponseWithTools{
		Message: models.Message{
			Role:    "assistant",
			Content: resp.Choices[0].Message.Content,
		},
		Usage: models.Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
		ToolCalls: toolCalls,
	}, nil
}

func (s *LLMService) ChatStreamWithTools(ctx context.Context, messages []models.Message, model string, tools []models.ToolDefinition) (*openai.ChatCompletionStream, error) {
	if model == "" {
		model = openai.GPT3Dot5Turbo
	}

	openaiMessages := toOpenAIMessages(messages)
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

	stream, err := s.client.CreateChatCompletionStream(
		ctx,
		openai.ChatCompletionRequest{
			Model:    model,
			Messages: openaiMessages,
			Tools:    openaiTools,
			Stream:   true,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("流式 API 调用失败: %w", err)
	}

	return stream, nil
}
