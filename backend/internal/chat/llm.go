package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	openai "github.com/sashabaranov/go-openai"
	"interview-demo/backend/internal/model"
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

func toOpenAIMessages(messages []model.Message) []openai.ChatCompletionMessage {
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

func (s *LLMService) Chat(ctx context.Context, messages []model.Message, modelName string) (*model.ChatResponse, error) {
	if modelName == "" {
		modelName = openai.GPT3Dot5Turbo
	}

	openaiMessages := toOpenAIMessages(messages)

	resp, err := s.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    modelName,
			Messages: openaiMessages,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("API 调用失败: %w", err)
	}

	return &model.ChatResponse{
		Message: model.Message{
			Role:    "assistant",
			Content: resp.Choices[0].Message.Content,
		},
		Usage: model.Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
	}, nil
}

func (s *LLMService) ChatStream(ctx context.Context, messages []model.Message, modelName string) (*openai.ChatCompletionStream, error) {
	if modelName == "" {
		modelName = openai.GPT3Dot5Turbo
	}

	openaiMessages := toOpenAIMessages(messages)

	stream, err := s.client.CreateChatCompletionStream(
		ctx,
		openai.ChatCompletionRequest{
			Model:    modelName,
			Messages: openaiMessages,
			Stream:   true,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("流式 API 调用失败: %w", err)
	}

	return stream, nil
}

func ReadStream(stream *openai.ChatCompletionStream, ch chan<- model.StreamChunk) {
	defer close(ch)

	for {
		response, err := stream.Recv()
		if err == io.EOF {
			ch <- model.StreamChunk{Done: true}
			return
		}

		if err != nil {
			ch <- model.StreamChunk{
				Content: fmt.Sprintf("错误: %v", err),
				Done:    true,
			}
			return
		}

		if len(response.Choices) > 0 {
			ch <- model.StreamChunk{
				Content: response.Choices[0].Delta.Content,
				Done:    false,
			}
		}
	}
}

type ResponseWithTools struct {
	Message   model.Message
	Usage     model.Usage
	ToolCalls []model.ToolCall
}

func (s *LLMService) ChatWithTools(ctx context.Context, messages []model.Message, modelName string, tools []model.ToolDefinition) (*ResponseWithTools, error) {
	if modelName == "" {
		modelName = openai.GPT3Dot5Turbo
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
			Model:    modelName,
			Messages: openaiMessages,
			Tools:    openaiTools,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("API 调用失败: %w", err)
	}

	var toolCalls []model.ToolCall
	if len(resp.Choices) > 0 && resp.Choices[0].Message.ToolCalls != nil {
		for _, tc := range resp.Choices[0].Message.ToolCalls {
			var args map[string]interface{}
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
				args = make(map[string]interface{})
			}
			toolCalls = append(toolCalls, model.ToolCall{
				ID:        tc.ID,
				Name:      tc.Function.Name,
				Arguments: args,
			})
		}
	}

	return &ResponseWithTools{
		Message: model.Message{
			Role:    "assistant",
			Content: resp.Choices[0].Message.Content,
		},
		Usage: model.Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
		ToolCalls: toolCalls,
	}, nil
}

func (s *LLMService) ChatStreamWithTools(ctx context.Context, messages []model.Message, modelName string, tools []model.ToolDefinition) (*openai.ChatCompletionStream, error) {
	if modelName == "" {
		modelName = openai.GPT3Dot5Turbo
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
			Model:    modelName,
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
