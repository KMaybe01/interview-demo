package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/internal/chat"
)

type Handler struct {
	factory *Factory
	manager *chat.ModelManager
	agents  map[string]*Agent
	mu      sync.RWMutex
}

func NewHandler(factory *Factory, manager *chat.ModelManager) *Handler {
	return &Handler{
		factory: factory,
		manager: manager,
		agents:  make(map[string]*Agent),
	}
}

// ListAgents  godoc
// @Summary     列出智能体
// @Description 返回所有已创建的智能体列表
// @Tags        智能体
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /agents [get]
func (h *Handler) ListAgents(c *gin.Context) {
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

// CreateAgent  godoc
// @Summary     创建智能体
// @Description 创建指定类型的 AI 智能体（ReAct/Function/Multi/RAG）
// @Tags        智能体
// @Accept      json
// @Produce     json
// @Param       body body     object{type=string,name=string} true "创建请求"
// @Success     201  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /agents [post]
func (h *Handler) CreateAgent(c *gin.Context) {
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

	var agt *Agent
	switch req.Type {
	case "react":
		agt = h.factory.CreateAgent(TypeReAct, req.Name)
	case "function":
		agt = h.factory.CreateAgent(TypeFunction, req.Name)
	case "multi":
		agt = h.factory.CreateAgent(TypeMulti, req.Name)
	case "rag":
		ragAgent := h.factory.CreateRAGAgent()
		agt = ragAgent.Agent
	default:
		agt = h.factory.CreateAgent(TypeReAct, req.Name)
	}

	h.mu.Lock()
	h.agents[agt.ID] = agt
	h.mu.Unlock()

	c.JSON(http.StatusCreated, gin.H{
		"id":        agt.ID,
		"name":      agt.Name,
		"type":      agt.Type,
		"tools":     len(agt.Tools),
		"max_steps": agt.MaxSteps,
	})
}

// ExecuteAgent  godoc
// @Summary     执行智能体
// @Description 执行指定智能体，返回推理过程和最终响应
// @Tags        智能体
// @Accept      json
// @Produce     json
// @Param       id   path string                   true "智能体 ID"
// @Param       body body  object{input=string} true "执行请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     404  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /agents/{id}/execute [post]
func (h *Handler) ExecuteAgent(c *gin.Context) {
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

	log := agent.ExecutionLog()

	c.JSON(http.StatusOK, gin.H{
		"agent_id":  agentID,
		"input":     req.Input,
		"response":  response,
		"steps":     log,
		"timestamp": time.Now(),
	})
}

// ExecuteAgentStream  godoc
// @Summary     流式执行智能体 (SSE)
// @Description 通过 SSE 流式返回智能体执行过程（thought/action/observation）
// @Tags        智能体
// @Accept      json
// @Produce     text/event-stream
// @Param       id   path string                   true "智能体 ID"
// @Param       body body  object{input=string} true "执行请求"
// @Success     200
// @Failure     400 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /agents/{id}/stream [post]
func (h *Handler) ExecuteAgentStream(c *gin.Context) {
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

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	ctx := c.Request.Context()
	events := make(chan StepEvent, 10)

	go agent.ExecuteStream(ctx, req.Input, events)

	c.Stream(func(w io.Writer) bool {
		event, ok := <-events
		if !ok {
			return false
		}

		data, err := json.Marshal(event)
		if err != nil {
			return false
		}

		fmt.Fprintf(w, "data: %s\n\n", data)
		return !event.Done && event.Type != "error"
	})
}

func (h *Handler) AgentLog(c *gin.Context) {
	agentID := c.Param("id")

	h.mu.RLock()
	agent, exists := h.agents[agentID]
	h.mu.RUnlock()
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "智能体不存在"})
		return
	}

	log := agent.ExecutionLog()

	c.JSON(http.StatusOK, gin.H{
		"agent_id": agentID,
		"steps":    log,
		"count":    len(log),
	})
}

func (h *Handler) Agent(id string) (*Agent, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	agent, ok := h.agents[id]
	return agent, ok
}

// DeleteAgent  godoc
// @Summary     删除智能体
// @Description 删除指定的智能体
// @Tags        智能体
// @Produce     json
// @Param       id path string true "智能体 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /agents/{id} [delete]
func (h *Handler) DeleteAgent(c *gin.Context) {
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
