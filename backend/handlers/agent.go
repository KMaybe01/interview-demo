package handlers

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/services"
)

type AgentHandler struct {
	factory *services.AgentFactory
	manager *services.ModelManager
	agents  map[string]*services.EnhancedAgent
	mu      sync.RWMutex
}

func NewAgentHandler(factory *services.AgentFactory, manager *services.ModelManager) *AgentHandler {
	return &AgentHandler{
		factory: factory,
		manager: manager,
		agents:  make(map[string]*services.EnhancedAgent),
	}
}

func (h *AgentHandler) ListAgents(c *gin.Context) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var result []gin.H
	for id, agent := range h.agents {
		result = append(result, gin.H{
			"id":          id,
			"name":        agent.Name,
			"type":        agent.Type,
			"tools_count": len(agent.Tools),
			"max_steps":   agent.MaxSteps,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"agents": result,
		"count":  len(result),
	})
}

func (h *AgentHandler) CreateAgent(c *gin.Context) {
	var req struct {
		Type string `json:"type"`
		Name string `json:"name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.Name == "" {
		req.Name = "智能助手"
	}

	var agent *services.EnhancedAgent
	switch req.Type {
	case "react":
		agent = h.factory.CreateAgent(services.AgentTypeReAct, req.Name)
	case "function":
		agent = h.factory.CreateAgent(services.AgentTypeFunction, req.Name)
	case "multi":
		agent = h.factory.CreateAgent(services.AgentTypeMulti, req.Name)
	case "rag":
		ragAgent := h.factory.CreateRAGAgent()
		agent = ragAgent.EnhancedAgent
	default:
		agent = h.factory.CreateAgent(services.AgentTypeReAct, req.Name)
	}

	h.mu.Lock()
	h.agents[agent.ID] = agent
	h.mu.Unlock()

	c.JSON(http.StatusCreated, gin.H{
		"id":        agent.ID,
		"name":      agent.Name,
		"type":      agent.Type,
		"tools":     len(agent.Tools),
		"max_steps": agent.MaxSteps,
	})
}

func (h *AgentHandler) ExecuteAgent(c *gin.Context) {
	agentID := c.Param("id")

	h.mu.RLock()
	agent, exists := h.agents[agentID]
	h.mu.RUnlock()
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "智能体不存在"})
		return
	}

	var req struct {
		Input string `json:"input" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	response, err := agent.Execute(context.Background(), req.Input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log := agent.GetExecutionLog()

	c.JSON(http.StatusOK, gin.H{
		"agent_id":  agentID,
		"input":     req.Input,
		"response":  response,
		"steps":     log,
		"timestamp": time.Now(),
	})
}

func (h *AgentHandler) GetAgentLog(c *gin.Context) {
	agentID := c.Param("id")

	h.mu.RLock()
	agent, exists := h.agents[agentID]
	h.mu.RUnlock()
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "智能体不存在"})
		return
	}

	log := agent.GetExecutionLog()

	c.JSON(http.StatusOK, gin.H{
		"agent_id": agentID,
		"steps":    log,
		"count":    len(log),
	})
}

func (h *AgentHandler) GetAgent(id string) (*services.EnhancedAgent, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	agent, ok := h.agents[id]
	return agent, ok
}

func (h *AgentHandler) DeleteAgent(c *gin.Context) {
	agentID := c.Param("id")

	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.agents[agentID]; !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "智能体不存在"})
		return
	}

	delete(h.agents, agentID)

	c.JSON(http.StatusOK, gin.H{"message": "智能体已删除"})
}
