package agent

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"interview-demo/backend/internal/chat"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/model"
)

type Type string

const (
	TypeReAct    Type = "react"
	TypeFunction Type = "function"
	TypeMulti    Type = "multi"
)

type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	Function    func(ctx context.Context, input string) (string, error)
}

type Step struct {
	Thought     string `json:"thought"`
	Action      string `json:"action"`
	ActionInput string `json:"action_input"`
	Observation string `json:"observation"`
}

type State struct {
	Messages    []model.Message `json:"messages"`
	Steps       []Step          `json:"steps"`
	FinalAnswer string          `json:"final_answer,omitempty"`
	MaxSteps    int             `json:"max_steps"`
}

type Agent struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Type         Type   `json:"type"`
	Tools        []Tool `json:"tools"`
	SystemPrompt string `json:"system_prompt"`
	MaxSteps     int    `json:"max_steps"`
	State        *State `json:"state"`
	mu           sync.RWMutex
}

func NewAgent(name string, agentType Type) *Agent {
	return &Agent{
		ID:       uuid.New().String(),
		Name:     name,
		Type:     agentType,
		Tools:    make([]Tool, 0),
		MaxSteps: 10,
		State: &State{
			Messages: make([]model.Message, 0),
			Steps:    make([]Step, 0),
			MaxSteps: 10,
		},
	}
}

func (a *Agent) RegisterTool(tool Tool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.Tools = append(a.Tools, tool)
}

func (a *Agent) Execute(ctx context.Context, input string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.State.Messages = append(a.State.Messages, model.Message{
		ID:        uuid.New().String(),
		Role:      "user",
		Content:   input,
		CreatedAt: time.Now(),
	})

	if a.Type == TypeReAct {
		return a.executeReAct(ctx, input)
	}

	return a.executeFunctionCalling(ctx, input)
}

func (a *Agent) executeReAct(ctx context.Context, input string) (string, error) {
	state := a.State

	for step := 0; step < state.MaxSteps; step++ {
		thought := a.generateThought(input, state)

		action, actionInput := a.selectTool(thought, input)

		if action == "Final Answer" {
			state.FinalAnswer = actionInput
			state.Steps = append(state.Steps, Step{
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

		state.Steps = append(state.Steps, Step{
			Thought:     thought,
			Action:      action,
			ActionInput: actionInput,
			Observation: observation,
		})

		if step == state.MaxSteps-1 {
			state.FinalAnswer = "达到最大步数，无法完成任务"
		}
	}

	a.State.Messages = append(a.State.Messages, model.Message{
		ID:        uuid.New().String(),
		Role:      "assistant",
		Content:   state.FinalAnswer,
		CreatedAt: time.Now(),
	})

	return state.FinalAnswer, nil
}

func (a *Agent) executeFunctionCalling(ctx context.Context, input string) (string, error) {
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

func (a *Agent) generateThought(input string, state *State) string {
	if len(state.Steps) == 0 {
		return fmt.Sprintf("用户请求: %s。我需要分析这个请求并选择合适的工具来处理。", input)
	}
	return "我已经收集了足够的信息，现在可以给出最终答案。"
}

func (a *Agent) selectTool(thought, input string) (string, string) {
	for _, tool := range a.Tools {
		if strings.Contains(input, tool.Name) ||
			strings.Contains(strings.ToLower(input), strings.ToLower(tool.Name)) {
			return tool.Name, input
		}
	}
	return "Final Answer", "我可以帮你处理这个请求。"
}

func (a *Agent) executeTool(ctx context.Context, toolName, input string) (string, error) {
	for _, tool := range a.Tools {
		if tool.Name == toolName {
			return tool.Function(ctx, input)
		}
	}
	return "", fmt.Errorf("工具 %s 不存在", toolName)
}

func (a *Agent) buildToolDescriptions() string {
	var descriptions []string
	for _, tool := range a.Tools {
		descriptions = append(descriptions, fmt.Sprintf("- %s: %s", tool.Name, tool.Description))
	}
	return strings.Join(descriptions, "\n")
}

func (a *Agent) ExecutionLog() []Step {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.State.Steps
}

type StepEvent struct {
	Type        string `json:"type"`
	Step        int    `json:"step,omitempty"`
	Thought     string `json:"thought,omitempty"`
	Action      string `json:"action,omitempty"`
	ActionInput string `json:"action_input,omitempty"`
	Observation string `json:"observation,omitempty"`
	Content     string `json:"content,omitempty"`
	Done        bool   `json:"done,omitempty"`
	Error       string `json:"error,omitempty"`
}

func (a *Agent) ExecuteStream(ctx context.Context, input string, events chan<- StepEvent) {
	defer close(events)

	a.mu.Lock()
	a.State.Messages = append(a.State.Messages, model.Message{
		ID:        uuid.New().String(),
		Role:      "user",
		Content:   input,
		CreatedAt: time.Now(),
	})
	a.mu.Unlock()

	if a.Type == TypeReAct {
		a.executeReActStream(ctx, input, events)
		return
	}

	a.executeFunctionCallingStream(ctx, input, events)
}

func (a *Agent) executeReActStream(ctx context.Context, input string, events chan<- StepEvent) {
	a.mu.Lock()
	state := a.State
	a.mu.Unlock()

	for step := 0; step < state.MaxSteps; step++ {
		select {
		case <-ctx.Done():
			events <- StepEvent{Type: "error", Error: "context cancelled"}
			return
		default:
		}

		thought := a.generateThought(input, state)

		events <- StepEvent{
			Type:    "thought",
			Step:    step,
			Thought: thought,
		}

		action, actionInput := a.selectTool(thought, input)

		events <- StepEvent{
			Type:        "action",
			Step:        step,
			Action:      action,
			ActionInput: actionInput,
		}

		if action == "Final Answer" {
			a.mu.Lock()
			state.FinalAnswer = actionInput
			state.Steps = append(state.Steps, Step{
				Thought:     thought,
				Action:      action,
				ActionInput: actionInput,
			})
			a.mu.Unlock()

			events <- StepEvent{
				Type:    "result",
				Content: actionInput,
				Done:    true,
			}

			a.mu.Lock()
			a.State.Messages = append(a.State.Messages, model.Message{
				ID:        uuid.New().String(),
				Role:      "assistant",
				Content:   state.FinalAnswer,
				CreatedAt: time.Now(),
			})
			a.mu.Unlock()
			return
		}

		observation, err := a.executeTool(ctx, action, actionInput)
		if err != nil {
			observation = fmt.Sprintf("工具执行错误: %v", err)
		}

		events <- StepEvent{
			Type:        "observation",
			Step:        step,
			Observation: observation,
		}

		a.mu.Lock()
		state.Steps = append(state.Steps, Step{
			Thought:     thought,
			Action:      action,
			ActionInput: actionInput,
			Observation: observation,
		})
		if step == state.MaxSteps-1 {
			state.FinalAnswer = "达到最大步数，无法完成任务"
		}
		a.mu.Unlock()
	}

	a.mu.Lock()
	if state.FinalAnswer == "" {
		state.FinalAnswer = "无法生成最终答案"
	}
	a.State.Messages = append(a.State.Messages, model.Message{
		ID:        uuid.New().String(),
		Role:      "assistant",
		Content:   state.FinalAnswer,
		CreatedAt: time.Now(),
	})
	finalAnswer := state.FinalAnswer
	a.mu.Unlock()

	events <- StepEvent{
		Type:    "result",
		Content: finalAnswer,
		Done:    true,
	}
}

func (a *Agent) executeFunctionCallingStream(ctx context.Context, input string, events chan<- StepEvent) {
	for _, tool := range a.Tools {
		events <- StepEvent{
			Type:    "thought",
			Step:    0,
			Thought: fmt.Sprintf("尝试使用工具: %s", tool.Name),
		}

		events <- StepEvent{
			Type:        "action",
			Step:        0,
			Action:      tool.Name,
			ActionInput: input,
		}

		result, err := tool.Function(ctx, input)
		if err != nil {
			events <- StepEvent{
				Type:        "observation",
				Step:        0,
				Observation: fmt.Sprintf("工具执行错误: %v", err),
			}
			events <- StepEvent{
				Type:    "result",
				Content: fmt.Sprintf("工具执行失败: %v", err),
				Done:    true,
			}
			return
		}

		events <- StepEvent{
			Type:        "observation",
			Step:        0,
			Observation: result,
		}

		events <- StepEvent{
			Type:    "result",
			Content: result,
			Done:    true,
		}
		return
	}

	events <- StepEvent{
		Type:    "result",
		Content: "我可以帮你处理这个请求。请提供更多信息。",
		Done:    true,
	}
}

func (a *Agent) ClearState() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.State = &State{
		Messages: make([]model.Message, 0),
		Steps:    make([]Step, 0),
		MaxSteps: a.MaxSteps,
	}
}

type MultiAgentSystem struct {
	Agents map[string]*Agent
	mu     sync.RWMutex
}

func NewMultiAgentSystem() *MultiAgentSystem {
	return &MultiAgentSystem{
		Agents: make(map[string]*Agent),
	}
}

func (s *MultiAgentSystem) RegisterAgent(agent *Agent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Agents[agent.ID] = agent
}

func (s *MultiAgentSystem) RouteMessage(input string) *Agent {
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
	*Agent
	ragService *knowledge.RAGService
	llmService *chat.LLMService
}

func NewRAGAgent(ragService *knowledge.RAGService, llmService *chat.LLMService) *RAGAgent {
	agent := NewAgent("RAG智能体", TypeReAct)

	ragAgent := &RAGAgent{
		Agent:      agent,
		ragService: ragService,
		llmService: llmService,
	}

	ragAgent.RegisterTool(Tool{
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

	ragAgent.RegisterTool(Tool{
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
	*Agent
	llmService *chat.LLMService
}

func NewToolCallingAgent(llmService *chat.LLMService) *ToolCallingAgent {
	agent := NewAgent("工具调用智能体", TypeFunction)

	toolAgent := &ToolCallingAgent{
		Agent:      agent,
		llmService: llmService,
	}

	toolAgent.RegisterTool(Tool{
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

	toolAgent.RegisterTool(Tool{
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

type Factory struct {
	llmService *chat.LLMService
	ragService *knowledge.RAGService
}

func NewFactory(llmService *chat.LLMService, ragService *knowledge.RAGService) *Factory {
	return &Factory{
		llmService: llmService,
		ragService: ragService,
	}
}

func (f *Factory) CreateAgent(agentType Type, name string) *Agent {
	switch agentType {
	case TypeReAct:
		return NewAgent(name, TypeReAct)
	case TypeFunction:
		return NewToolCallingAgent(f.llmService).Agent
	case TypeMulti:
		return NewAgent(name, TypeMulti)
	default:
		return NewAgent(name, TypeReAct)
	}
}

func (f *Factory) CreateRAGAgent() *RAGAgent {
	return NewRAGAgent(f.ragService, f.llmService)
}

func (f *Factory) CreateMultiAgentSystem() *MultiAgentSystem {
	system := NewMultiAgentSystem()

	ragAgent := f.CreateRAGAgent()
	searchAgent := f.CreateAgent(TypeFunction, "搜索助手")
	analysisAgent := f.CreateAgent(TypeReAct, "分析助手")

	system.RegisterAgent(ragAgent.Agent)
	system.RegisterAgent(searchAgent)
	system.RegisterAgent(analysisAgent)

	return system
}
