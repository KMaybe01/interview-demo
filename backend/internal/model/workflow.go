package model

import "time"

type Workflow struct {
	ID          string         `json:"id"`
	Name        string         `json:"name" binding:"required"`
	Description string         `json:"description,omitempty"`
	Nodes       []WorkflowNode `json:"nodes"`
	Edges       []WorkflowEdge `json:"edges"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type WorkflowNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Config   map[string]interface{} `json:"config,omitempty"`
	Position map[string]float64     `json:"position,omitempty"`
}

type WorkflowEdge struct {
	Source    string `json:"source"`
	Target    string `json:"target"`
	Label     string `json:"label,omitempty"`
	Condition string `json:"condition,omitempty"`
}

type WorkflowExecution struct {
	ID         string                 `json:"id"`
	WorkflowID string                 `json:"workflow_id"`
	Status     string                 `json:"status"`
	Input      map[string]interface{} `json:"input,omitempty"`
	Output     map[string]interface{} `json:"output,omitempty"`
	NodeStates map[string]NodeState   `json:"node_states,omitempty"`
	StartedAt  time.Time              `json:"started_at"`
	FinishedAt *time.Time             `json:"finished_at,omitempty"`
}

type NodeState struct {
	Status   string      `json:"status"`
	Output   interface{} `json:"output,omitempty"`
	Error    string      `json:"error,omitempty"`
	Duration int64       `json:"duration_ms,omitempty"`
}
