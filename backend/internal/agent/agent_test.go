package agent

import (
	"context"
	"testing"

	"interview-demo/backend/internal/chat"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/model"
)

func TestServiceRegisterTool(t *testing.T) {
	llm := chat.NewLLMService("")
	s := NewService(llm)

	s.RegisterTool(model.Tool{
		Name:        "test_tool",
		Description: "a test tool",
	})

	tools := s.Tools()
	if len(tools) == 0 {
		t.Fatal("expected at least 1 tool")
	}
}

func TestServiceGetTools(t *testing.T) {
	llm := chat.NewLLMService("")
	s := NewService(llm)

	tools := s.Tools()
	if len(tools) == 0 {
		t.Fatal("expected default tools to be registered")
	}
}

func TestExecuteToolCalls(t *testing.T) {
	s := NewService(chat.NewLLMService(""))

	results := s.executeToolCalls(context.Background(), []model.ToolCall{
		{Name: "get_current_time"},
		{Name: "calculate", Arguments: map[string]interface{}{"expression": "2+3"}},
		{Name: "unknown_tool"},
	})

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
	if results[0].Result == "" {
		t.Error("expected current time result")
	}
	if results[2].Error == "" {
		t.Error("expected error for unknown tool")
	}
}

func TestEvaluateExpression(t *testing.T) {
	tests := []struct {
		expr    string
		want    float64
		wantErr bool
	}{
		{"2+3", 5, false},
		{"10-4", 6, false},
		{"3*4", 12, false},
		{"10/2", 5, false},
		{"2^3", 8, false},
		{"5/0", 0, true},
		{"", 0, true},
	}

	for _, tt := range tests {
		got, err := evaluateExpression(tt.expr)
		if tt.wantErr {
			if err == nil {
				t.Errorf("evaluateExpression(%q) expected error", tt.expr)
			}
			continue
		}
		if err != nil {
			t.Errorf("evaluateExpression(%q) unexpected error: %v", tt.expr, err)
			continue
		}
		if got != tt.want {
			t.Errorf("evaluateExpression(%q) = %f, want %f", tt.expr, got, tt.want)
		}
	}
}

func TestTokenize(t *testing.T) {
	tokens := tokenize("2+3*4")
	expected := []string{"2", "+", "3", "*", "4"}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d: %v", len(expected), len(tokens), tokens)
	}
	for i := range tokens {
		if tokens[i] != expected[i] {
			t.Errorf("token[%d] = %s, want %s", i, tokens[i], expected[i])
		}
	}
}

func TestParseArguments(t *testing.T) {
	args := parseArguments(`{"key": "value"}`)
	if args["key"] != "value" {
		t.Errorf("expected 'value', got %v", args["key"])
	}
}

func TestServiceToolDefinitions(t *testing.T) {
	s := NewService(chat.NewLLMService(""))
	defs := s.ToolDefinitions()
	if len(defs) == 0 {
		t.Fatal("expected tool definitions")
	}
}

func TestNewAgent(t *testing.T) {
	a := NewAgent("test-agent", TypeReAct)
	if a.Name != "test-agent" {
		t.Errorf("expected 'test-agent', got %s", a.Name)
	}
	if a.Type != TypeReAct {
		t.Errorf("expected TypeReAct, got %s", a.Type)
	}
	if a.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if a.MaxSteps != 10 {
		t.Errorf("expected MaxSteps 10, got %d", a.MaxSteps)
	}
}

func TestAgentRegisterTool(t *testing.T) {
	a := NewAgent("tool-agent", TypeReAct)
	a.RegisterTool(Tool{
		Name:        "hello",
		Description: "says hello",
	})

	if len(a.Tools) != 1 {
		t.Fatalf("expected 1 tool, got %d", len(a.Tools))
	}
	if a.Tools[0].Name != "hello" {
		t.Errorf("expected 'hello', got %s", a.Tools[0].Name)
	}
}

func TestAgentExecuteFunctionCalling(t *testing.T) {
	a := NewAgent("func-agent", TypeFunction)
	a.RegisterTool(Tool{
		Name:        "greet",
		Description: "greets the user",
		Function: func(ctx context.Context, input string) (string, error) {
			return "hello " + input, nil
		},
	})

	resp, err := a.Execute(context.Background(), "greet me")
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	if resp == "" {
		t.Fatal("expected non-empty response")
	}
}

func TestAgentExecuteReAct(t *testing.T) {
	a := NewAgent("react-agent", TypeReAct)
	a.RegisterTool(Tool{
		Name:        "say_hello",
		Description: "says hello",
		Function: func(ctx context.Context, input string) (string, error) {
			return "hello", nil
		},
	})

	resp, err := a.Execute(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	if resp == "" {
		t.Fatal("expected non-empty response")
	}
}

func TestAgentGetExecutionLog(t *testing.T) {
	a := NewAgent("log-agent", TypeReAct)
	log := a.ExecutionLog()
	if log == nil {
		t.Fatal("expected non-nil log")
	}
	if len(log) != 0 {
		t.Errorf("expected empty log initially, got %d entries", len(log))
	}
}

func TestAgentClearState(t *testing.T) {
	a := NewAgent("clear-agent", TypeReAct)
	a.State.Messages = append(a.State.Messages, model.Message{Role: "user", Content: "test"})
	a.ClearState()

	if len(a.State.Messages) != 0 {
		t.Error("expected empty messages after clear")
	}
}

func TestNewRAGAgent(t *testing.T) {
	rag := knowledge.NewRAGService()
	llm := chat.NewLLMService("")
	agent := NewRAGAgent(rag, llm)

	if agent == nil {
		t.Fatal("expected non-nil RAG agent")
	}
	if agent.Agent == nil {
		t.Fatal("expected embedded Agent")
	}
	if len(agent.Tools) == 0 {
		t.Fatal("expected RAG agent to have tools")
	}
}

func TestRAGAgentSearchKnowledge(t *testing.T) {
	rag := knowledge.NewRAGService()
	kb := rag.CreateKnowledgeBase("test", "")
	rag.AddDocument(kb.ID, model.Document{
		Title:   "doc",
		Content: "test content",
	})

	llm := chat.NewLLMService("")
	a := NewRAGAgent(rag, llm)

	result, err := a.searchKnowledge(context.Background(), "test")
	if err != nil {
		t.Fatalf("searchKnowledge failed: %v", err)
	}
	if result == "" {
		t.Fatal("expected search results")
	}
}

func TestNewToolCallingAgent(t *testing.T) {
	llm := chat.NewLLMService("")
	a := NewToolCallingAgent(llm)

	if a == nil {
		t.Fatal("expected non-nil ToolCallingAgent")
	}
	if len(a.Tools) != 2 {
		t.Fatalf("expected 2 tools, got %d", len(a.Tools))
	}
}

func TestToolCallingAgentCalculator(t *testing.T) {
	llm := chat.NewLLMService("")
	a := NewToolCallingAgent(llm)

	result, err := a.calculator(context.Background(), "2+2")
	if err != nil {
		t.Fatalf("calculator failed: %v", err)
	}
	if result == "" {
		t.Fatal("expected non-empty result")
	}
}

func TestToolCallingAgentWeather(t *testing.T) {
	llm := chat.NewLLMService("")
	a := NewToolCallingAgent(llm)

	result, err := a.getWeather(context.Background(), "Beijing")
	if err != nil {
		t.Fatalf("getWeather failed: %v", err)
	}
	if result == "" {
		t.Fatal("expected non-empty result")
	}
}

func TestFactoryCreateAgent(t *testing.T) {
	llm := chat.NewLLMService("")
	rag := knowledge.NewRAGService()
	f := NewFactory(llm, rag)

	react := f.CreateAgent(TypeReAct, "react")
	if react.Type != TypeReAct {
		t.Errorf("expected ReAct type, got %s", react.Type)
	}

	funcAgent := f.CreateAgent(TypeFunction, "func")
	if funcAgent.Type != TypeFunction {
		t.Errorf("expected Function type, got %s", funcAgent.Type)
	}

	multi := f.CreateAgent(TypeMulti, "multi")
	if multi.Type != TypeMulti {
		t.Errorf("expected Multi type, got %s", multi.Type)
	}
}

func TestFactoryCreateRAGAgent(t *testing.T) {
	llm := chat.NewLLMService("")
	rag := knowledge.NewRAGService()
	f := NewFactory(llm, rag)

	ragAgent := f.CreateRAGAgent()
	if ragAgent == nil {
		t.Fatal("expected non-nil RAG agent")
	}
}

func TestFactoryCreateMultiAgentSystem(t *testing.T) {
	llm := chat.NewLLMService("")
	rag := knowledge.NewRAGService()
	f := NewFactory(llm, rag)

	system := f.CreateMultiAgentSystem()
	if system == nil {
		t.Fatal("expected non-nil system")
	}
	if len(system.Agents) != 3 {
		t.Fatalf("expected 3 agents, got %d", len(system.Agents))
	}
}

func TestMultiAgentSystemRegisterAndRoute(t *testing.T) {
	system := NewMultiAgentSystem()
	a1 := NewAgent("agent1", TypeReAct)
	a2 := NewAgent("agent2", TypeReAct)

	system.RegisterAgent(a1)
	system.RegisterAgent(a2)

	route := system.RouteMessage("agent1")
	if route == nil {
		t.Fatal("expected to route to agent1")
	}
	if route.Name != "agent1" {
		t.Errorf("expected 'agent1', got %s", route.Name)
	}
}

func TestMultiAgentSystemExecuteWorkflow(t *testing.T) {
	system := NewMultiAgentSystem()
	a := NewAgent("wf-agent", TypeReAct)
	a.RegisterTool(Tool{
		Name: "echo",
		Function: func(ctx context.Context, input string) (string, error) {
			return "echo: " + input, nil
		},
	})
	system.RegisterAgent(a)

	result, err := system.ExecuteWorkflow(context.Background(), []WorkflowStep{
		{AgentID: a.ID, Input: "hello"},
	})
	if err != nil {
		t.Fatalf("ExecuteWorkflow failed: %v", err)
	}
	if result == "" {
		t.Fatal("expected non-empty result")
	}
}

func TestBuildToolDescriptions(t *testing.T) {
	a := NewAgent("desc-agent", TypeReAct)
	a.RegisterTool(Tool{
		Name:        "tool1",
		Description: "desc1",
	})

	desc := a.buildToolDescriptions()
	if !contains(desc, "tool1") || !contains(desc, "desc1") {
		t.Errorf("expected tool descriptions to contain tool info, got %s", desc)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsSub(s, substr)
}

func containsSub(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
