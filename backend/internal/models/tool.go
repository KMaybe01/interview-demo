package models

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
