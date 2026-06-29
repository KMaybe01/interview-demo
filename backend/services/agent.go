package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"interview-demo/backend/models"
)

type AgentService struct {
	llmService *LLMService
	tools      map[string]models.Tool
	mu         sync.RWMutex
}

func NewAgentService(llmService *LLMService) *AgentService {
	service := &AgentService{
		llmService: llmService,
		tools:      make(map[string]models.Tool),
	}

	service.registerDefaultTools()

	return service
}

func (s *AgentService) registerDefaultTools() {
	s.RegisterTool(models.Tool{
		Name:        "get_current_time",
		Description: "获取当前时间",
		Type:        "function",
		Parameters: map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
			"required":   []string{},
		},
	})

	s.RegisterTool(models.Tool{
		Name:        "calculate",
		Description: "执行数学计算",
		Type:        "function",
		Parameters: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"expression": map[string]interface{}{
					"type":        "string",
					"description": "数学表达式，如 2+3*4",
				},
			},
			"required": []string{"expression"},
		},
	})

	s.RegisterTool(models.Tool{
		Name:        "search_knowledge",
		Description: "搜索知识库获取相关信息",
		Type:        "function",
		Parameters: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"query": map[string]interface{}{
					"type":        "string",
					"description": "搜索查询",
				},
			},
			"required": []string{"query"},
		},
	})

	s.RegisterTool(models.Tool{
		Name:        "web_search",
		Description: "搜索互联网获取信息",
		Type:        "function",
		Parameters: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"query": map[string]interface{}{
					"type":        "string",
					"description": "搜索关键词",
				},
			},
			"required": []string{"query"},
		},
	})

	s.RegisterTool(models.Tool{
		Name:        "create_reminder",
		Description: "创建提醒事项",
		Type:        "function",
		Parameters: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"title": map[string]interface{}{
					"type":        "string",
					"description": "提醒标题",
				},
				"minutes_later": map[string]interface{}{
					"type":        "number",
					"description": "多少分钟后提醒",
				},
			},
			"required": []string{"title"},
		},
	})
}

func (s *AgentService) RegisterTool(tool models.Tool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tools[tool.Name] = tool
}

func (s *AgentService) GetTools() []models.ToolDefinition {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var toolDefs []models.ToolDefinition
	for _, tool := range s.tools {
		toolDefs = append(toolDefs, models.ToolDefinition{
			Type: "function",
			Function: models.FunctionDef{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.Parameters,
			},
		})
	}

	return toolDefs
}

func (s *AgentService) ChatWithTools(ctx context.Context, messages []models.Message, model string) (*models.ChatResponse, error) {
	systemPrompt := `你是一个智能助手，可以使用各种工具来帮助用户。
当需要使用工具时，请使用 function calling 来调用相应的工具。
工具调用结果会自动返回给你，请基于结果继续回答用户的问题。
请用中文回答用户的问题。`

	openaiMessages := make([]models.Message, 0, len(messages)+1)
	openaiMessages = append(openaiMessages, models.Message{
		Role:    "system",
		Content: systemPrompt,
	})
	openaiMessages = append(openaiMessages, messages...)

	tools := s.GetTools()

	resp, err := s.llmService.ChatWithTools(ctx, openaiMessages, model, tools)
	if err != nil {
		return nil, err
	}

	if len(resp.ToolCalls) > 0 {
		toolResults := s.executeToolCalls(ctx, resp.ToolCalls)

		assistantMsg := models.Message{
			Role:    "assistant",
			Content: resp.Message.Content,
		}
		openaiMessages = append(openaiMessages, assistantMsg)

		for _, result := range toolResults {
			toolMsg := models.Message{
				Role:    "tool",
				Content: fmt.Sprintf("工具 %s 的结果: %s", result.Name, result.Result),
			}
			openaiMessages = append(openaiMessages, toolMsg)
		}

		finalResp, err := s.llmService.Chat(ctx, openaiMessages, model)
		if err != nil {
			return nil, err
		}

		return finalResp, nil
	}

	return &models.ChatResponse{
		Message: resp.Message,
		Usage:   resp.Usage,
	}, nil
}

func (s *AgentService) ChatWithToolsStream(ctx context.Context, messages []models.Message, model string, onChunk func(string), onDone func()) error {
	systemPrompt := `你是一个智能助手，可以使用各种工具来帮助用户。
当需要使用工具时，请使用 function calling 来调用相应的工具。
工具调用结果会自动返回给你，请基于结果继续回答用户的问题。
请用中文回答用户的问题。`

	openaiMessages := make([]models.Message, 0, len(messages)+1)
	openaiMessages = append(openaiMessages, models.Message{
		Role:    "system",
		Content: systemPrompt,
	})
	openaiMessages = append(openaiMessages, messages...)

	tools := s.GetTools()

	stream, err := s.llmService.ChatStreamWithTools(ctx, openaiMessages, model, tools)
	if err != nil {
		return err
	}
	defer stream.Close()

	var fullContent string
	var toolCalls []models.ToolCall

	for {
		response, err := stream.Recv()
		if err != nil {
			break
		}

		if len(response.Choices) > 0 {
			delta := response.Choices[0].Delta

			if delta.Content != "" {
				fullContent += delta.Content
				onChunk(delta.Content)
			}

			if delta.ToolCalls != nil {
				for _, tc := range delta.ToolCalls {
					toolCalls = append(toolCalls, models.ToolCall{
						ID:        tc.ID,
						Name:      tc.Function.Name,
						Arguments: parseArguments(tc.Function.Arguments),
					})
				}
			}
		}
	}

	if len(toolCalls) > 0 {
		onChunk("\n\n🔧 正在执行工具调用...\n\n")

		toolResults := s.executeToolCalls(ctx, toolCalls)

		openaiMessages = append(openaiMessages, models.Message{
			Role:    "assistant",
			Content: fullContent,
		})

		for _, result := range toolResults {
			onChunk(fmt.Sprintf("✅ 工具 %s 执行完成\n", result.Name))
			openaiMessages = append(openaiMessages, models.Message{
				Role:    "tool",
				Content: fmt.Sprintf("工具 %s 的结果: %s", result.Name, result.Result),
			})
		}

		finalResp, err := s.llmService.Chat(ctx, openaiMessages, model)
		if err != nil {
			return err
		}

		onChunk(finalResp.Message.Content)
	}

	onDone()
	return nil
}

func (s *AgentService) executeToolCalls(ctx context.Context, toolCalls []models.ToolCall) []models.ToolCall {
	var results []models.ToolCall

	for _, tc := range toolCalls {
		result := models.ToolCall{
			ID:   tc.ID,
			Name: tc.Name,
		}

		switch tc.Name {
		case "get_current_time":
			result.Result = time.Now().Format("2006-01-02 15:04:05")

		case "calculate":
			expression, _ := tc.Arguments["expression"].(string)
			if val, err := evaluateExpression(expression); err == nil {
				result.Result = strconv.FormatFloat(val, 'f', -1, 64)
			} else {
				result.Error = err.Error()
			}

		case "search_knowledge":
			query, _ := tc.Arguments["query"].(string)
			result.Result = fmt.Sprintf("搜索 '%s' 的结果：找到相关信息", query)

		case "web_search":
			query, _ := tc.Arguments["query"].(string)
			result.Result = fmt.Sprintf("网络搜索 '%s' 的结果：这是模拟的搜索结果", query)

		case "create_reminder":
			title, _ := tc.Arguments["title"].(string)
			minutesLater := 5.0
			if m, ok := tc.Arguments["minutes_later"].(float64); ok {
				minutesLater = m
			}
			reminderTime := time.Now().Add(time.Duration(minutesLater) * time.Minute)
			result.Result = fmt.Sprintf("提醒已创建：'%s' 将在 %s 提醒您",
				title, reminderTime.Format("15:04"))

		default:
			result.Error = fmt.Sprintf("未知工具: %s", tc.Name)
		}

		results = append(results, result)
	}

	return results
}

func evaluateExpression(expr string) (float64, error) {
	expr = strings.ReplaceAll(expr, "×", "*")
	expr = strings.ReplaceAll(expr, "÷", "/")

	tokens := tokenize(expr)
	if len(tokens) == 0 {
		return 0, fmt.Errorf("无效的表达式")
	}

	if len(tokens) == 3 {
		a, err := strconv.ParseFloat(tokens[0], 64)
		if err != nil {
			return 0, err
		}

		b, err := strconv.ParseFloat(tokens[2], 64)
		if err != nil {
			return 0, err
		}

		switch tokens[1] {
		case "+":
			return a + b, nil
		case "-":
			return a - b, nil
		case "*":
			return a * b, nil
		case "/":
			if b == 0 {
				return 0, fmt.Errorf("除数不能为零")
			}
			return a / b, nil
		case "^":
			return math.Pow(a, b), nil
		}
	}

	return 0, fmt.Errorf("不支持的表达式")
}

func tokenize(expr string) []string {
	var tokens []string
	current := ""

	for _, c := range expr {
		if c == '+' || c == '-' || c == '*' || c == '/' || c == '^' {
			if current != "" {
				tokens = append(tokens, current)
			}
			tokens = append(tokens, string(c))
			current = ""
		} else if c >= '0' && c <= '9' || c == '.' {
			current += string(c)
		}
	}

	if current != "" {
		tokens = append(tokens, current)
	}

	return tokens
}

func parseArguments(argsJSON string) map[string]interface{} {
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return make(map[string]interface{})
	}
	return args
}

func (s *AgentService) GetToolDefinitions() []models.Tool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var tools []models.Tool
	for _, tool := range s.tools {
		tools = append(tools, tool)
	}
	return tools
}
