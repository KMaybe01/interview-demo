package agent

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"interview-demo/backend/chat"
	"interview-demo/backend/knowledge"
	"interview-demo/backend/models"
)

type AgentType string

const (
	AgentTypeReAct    AgentType = "react"
	AgentTypeFunction AgentType = "function"
	AgentTypeMulti    AgentType = "multi"
)

type AgentTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	Function    func(ctx context.Context, input string) (string, error)
}

type AgentStep struct {
	Thought     string `json:"thought"`
	Action      string `json:"action"`
	ActionInput string `json:"action_input"`
	Observation string `json:"observation"`
}

type AgentState struct {
	Messages    []models.Message `json:"messages"`
	Steps       []AgentStep      `json:"steps"`
	FinalAnswer string           `json:"final_answer,omitempty"`
	MaxSteps    int              `json:"max_steps"`
}

type EnhancedAgent struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Type         AgentType   `json:"type"`
	Tools        []AgentTool `json:"tools"`
	SystemPrompt string      `json:"system_prompt"`
	MaxSteps     int         `json:"max_steps"`
	State        *AgentState `json:"state"`
	mu           sync.RWMutex
}

func NewEnhancedAgent(name string, agentType AgentType) *EnhancedAgent {
	return &EnhancedAgent{
		ID:       uuid.New().String(),
		Name:     name,
		Type:     agentType,
		Tools:    make([]AgentTool, 0),
		MaxSteps: 10,
		State: &AgentState{
			Messages: make([]models.Message, 0),
			Steps:    make([]AgentStep, 0),
			MaxSteps: 10,
		},
	}
}

func (a *EnhancedAgent) RegisterTool(tool AgentTool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.Tools = append(a.Tools, tool)
}

func (a *EnhancedAgent) Execute(ctx context.Context, input string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.State.Messages = append(a.State.Messages, models.Message{
		ID:        uuid.New().String(),
		Role:      "user",
		Content:   input,
		CreatedAt: time.Now(),
	})

	if a.Type == AgentTypeReAct {
		return a.executeReAct(ctx, input)
	}

	return a.executeFunctionCalling(ctx, input)
}

func (a *EnhancedAgent) executeReAct(ctx context.Context, input string) (string, error) {
	state := a.State

	for step := 0; step < state.MaxSteps; step++ {
		thought := a.generateThought(input, state)

		action, actionInput := a.selectTool(thought, input)

		if action == "Final Answer" {
			state.FinalAnswer = actionInput
			state.Steps = append(state.Steps, AgentStep{
				Thought:     thought,
				Action:      action,
				ActionInput: actionInput,
			})
			break
		}

		observation, err := a.executeTool(ctx, action, actionInput)
		if err != nil {
			observation = fmt.Sprintf("工具执行错误: %v", err)
		}

		state.Steps = append(state.Steps, AgentStep{
			Thought:     thought,
			Action:      action,
			ActionInput: actionInput,
			Observation: observation,
		})

		if step == state.MaxSteps-1 {
			state.FinalAnswer = "达到最大步数，无法完成任务"
		}
	}

	a.State.Messages = append(a.State.Messages, models.Message{
		ID:        uuid.New().String(),
		Role:      "assistant",
		Content:   state.FinalAnswer,
		CreatedAt: time.Now(),
	})

	return state.FinalAnswer, nil
}

func (a *EnhancedAgent) executeFunctionCalling(ctx context.Context, input string) (string, error) {
	for _, tool := range a.Tools {
		if strings.Contains(input, tool.Name) || strings.Contains(input, tool.Description) {
			result, err := tool.Function(ctx, input)
			if err != nil {
				return fmt.Sprintf("工具执行失败: %v", err), nil
			}
			return result, nil
		}
	}

	return "我可以帮你处理这个请求。请提供更多信息。", nil
}

func (a *EnhancedAgent) generateThought(input string, state *AgentState) string {
	if len(state.Steps) == 0 {
		return fmt.Sprintf("用户请求: %s。我需要分析这个请求并选择合适的工具来处理。", input)
	}
	return "我已经收集了足够的信息，现在可以给出最终答案。"
}

func (a *EnhancedAgent) selectTool(thought, input string) (string, string) {
	for _, tool := range a.Tools {
		if strings.Contains(input, tool.Name) ||
			strings.Contains(strings.ToLower(input), strings.ToLower(tool.Name)) {
			return tool.Name, input
		}
	}
	return "Final Answer", "我可以帮你处理这个请求。"
}

func (a *EnhancedAgent) executeTool(ctx context.Context, toolName, input string) (string, error) {
	for _, tool := range a.Tools {
		if tool.Name == toolName {
			return tool.Function(ctx, input)
		}
	}
	return "", fmt.Errorf("工具 %s 不存在", toolName)
}

func (a *EnhancedAgent) buildToolDescriptions() string {
	var descriptions []string
	for _, tool := range a.Tools {
		descriptions = append(descriptions, fmt.Sprintf("- %s: %s", tool.Name, tool.Description))
	}
	return strings.Join(descriptions, "\n")
}

func (a *EnhancedAgent) GetExecutionLog() []AgentStep {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.State.Steps
}

func (a *EnhancedAgent) ClearState() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.State = &AgentState{
		Messages: make([]models.Message, 0),
		Steps:    make([]AgentStep, 0),
		MaxSteps: a.MaxSteps,
	}
}

type MultiAgentSystem struct {
	Agents map[string]*EnhancedAgent
	mu     sync.RWMutex
}

func NewMultiAgentSystem() *MultiAgentSystem {
	return &MultiAgentSystem{
		Agents: make(map[string]*EnhancedAgent),
	}
}

func (s *MultiAgentSystem) RegisterAgent(agent *EnhancedAgent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Agents[agent.ID] = agent
}

func (s *MultiAgentSystem) RouteMessage(input string) *EnhancedAgent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, agent := range s.Agents {
		if strings.Contains(input, agent.Name) {
			return agent
		}
	}

	for _, agent := range s.Agents {
		return agent
	}
	return nil
}

func (s *MultiAgentSystem) ExecuteWorkflow(ctx context.Context, workflow []WorkflowStep) (string, error) {
	var results []string

	for _, step := range workflow {
		agent := s.Agents[step.AgentID]
		if agent == nil {
			return "", fmt.Errorf("智能体 %s 不存在", step.AgentID)
		}

		result, err := agent.Execute(ctx, step.Input)
		if err != nil {
			return "", fmt.Errorf("步骤执行失败: %v", err)
		}

		results = append(results, result)
		step.Input = result
	}

	return strings.Join(results, "\n"), nil
}

type WorkflowStep struct {
	AgentID string
	Input   string
}

type RAGAgent struct {
	*EnhancedAgent
	ragService *knowledge.RAGService
	llmService *chat.LLMService
}

func NewRAGAgent(ragService *knowledge.RAGService, llmService *chat.LLMService) *RAGAgent {
	agent := NewEnhancedAgent("RAG智能体", AgentTypeReAct)

	ragAgent := &RAGAgent{
		EnhancedAgent: agent,
		ragService:    ragService,
		llmService:    llmService,
	}

	ragAgent.RegisterTool(AgentTool{
		Name:        "search_knowledge",
		Description: "搜索知识库获取相关信息",
		Parameters: map[string]interface{}{
			"query": map[string]interface{}{
				"type":        "string",
				"description": "搜索查询",
			},
		},
		Function: ragAgent.searchKnowledge,
	})

	ragAgent.RegisterTool(AgentTool{
		Name:        "generate_answer",
		Description: "基于检索结果生成回答",
		Parameters: map[string]interface{}{
			"context": map[string]interface{}{
				"type":        "string",
				"description": "检索到的上下文",
			},
			"question": map[string]interface{}{
				"type":        "string",
				"description": "用户问题",
			},
		},
		Function: ragAgent.generateAnswer,
	})

	return ragAgent
}

func (a *RAGAgent) searchKnowledge(ctx context.Context, input string) (string, error) {
	response := a.ragService.Search(input, "", 3)

	var results []string
	for _, result := range response.Results {
		results = append(results, fmt.Sprintf("[%s] %s (相似度: %.2f)",
			result.DocTitle, result.Chunk.Content, result.Score))
	}

	if len(results) == 0 {
		return "未找到相关信息", nil
	}

	return strings.Join(results, "\n"), nil
}

func (a *RAGAgent) generateAnswer(ctx context.Context, input string) (string, error) {
	parts := strings.SplitN(input, "|", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("输入格式错误")
	}

	question := parts[1]

	return fmt.Sprintf("基于知识库的回答: %s", question), nil
}

type ToolCallingAgent struct {
	*EnhancedAgent
	llmService *chat.LLMService
}

func NewToolCallingAgent(llmService *chat.LLMService) *ToolCallingAgent {
	agent := NewEnhancedAgent("工具调用智能体", AgentTypeFunction)

	toolAgent := &ToolCallingAgent{
		EnhancedAgent: agent,
		llmService:    llmService,
	}

	toolAgent.RegisterTool(AgentTool{
		Name:        "calculator",
		Description: "数学计算器",
		Parameters: map[string]interface{}{
			"expression": map[string]interface{}{
				"type":        "string",
				"description": "数学表达式",
			},
		},
		Function: toolAgent.calculator,
	})

	toolAgent.RegisterTool(AgentTool{
		Name:        "weather",
		Description: "查询天气",
		Parameters: map[string]interface{}{
			"city": map[string]interface{}{
				"type":        "string",
				"description": "城市名称",
			},
		},
		Function: toolAgent.getWeather,
	})

	return toolAgent
}

func (a *ToolCallingAgent) calculator(ctx context.Context, input string) (string, error) {
	return fmt.Sprintf("计算结果: %s = 42", input), nil
}

func (a *ToolCallingAgent) getWeather(ctx context.Context, input string) (string, error) {
	return fmt.Sprintf("%s 当前天气: 晴, 温度: 25°C", input), nil
}

type AgentFactory struct {
	llmService *chat.LLMService
	ragService *knowledge.RAGService
}

func NewAgentFactory(llmService *chat.LLMService, ragService *knowledge.RAGService) *AgentFactory {
	return &AgentFactory{
		llmService: llmService,
		ragService: ragService,
	}
}

func (f *AgentFactory) CreateAgent(agentType AgentType, name string) *EnhancedAgent {
	switch agentType {
	case AgentTypeReAct:
		return NewEnhancedAgent(name, AgentTypeReAct)
	case AgentTypeFunction:
		return NewToolCallingAgent(f.llmService).EnhancedAgent
	case AgentTypeMulti:
		return NewEnhancedAgent(name, AgentTypeMulti)
	default:
		return NewEnhancedAgent(name, AgentTypeReAct)
	}
}

func (f *AgentFactory) CreateRAGAgent() *RAGAgent {
	return NewRAGAgent(f.ragService, f.llmService)
}

func (f *AgentFactory) CreateMultiAgentSystem() *MultiAgentSystem {
	system := NewMultiAgentSystem()

	ragAgent := f.CreateRAGAgent()
	searchAgent := f.CreateAgent(AgentTypeFunction, "搜索助手")
	analysisAgent := f.CreateAgent(AgentTypeReAct, "分析助手")

	system.RegisterAgent(ragAgent.EnhancedAgent)
	system.RegisterAgent(searchAgent)
	system.RegisterAgent(analysisAgent)

	return system
}
