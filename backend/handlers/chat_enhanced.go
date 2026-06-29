package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"interview-demo/backend/models"
	"interview-demo/backend/services"
)

type ChatHandler struct {
	llmService    *services.LLMService
	memoryService *services.MemoryService
	ragService    *services.RAGService
	agentFactory  *services.AgentFactory
	agents        map[string]*services.EnhancedAgent
}

func NewChatHandler(
	llmService *services.LLMService,
	memoryService *services.MemoryService,
	ragService *services.RAGService,
	agentFactory *services.AgentFactory,
	agents map[string]*services.EnhancedAgent,
) *ChatHandler {
	return &ChatHandler{
		llmService:    llmService,
		memoryService: memoryService,
		ragService:    ragService,
		agentFactory:  agentFactory,
		agents:        agents,
	}
}

func (h *ChatHandler) Chat(c *gin.Context) {
	var req struct {
		Content         string `json:"content" binding:"required"`
		ConversationID  string `json:"conversationId"`
		KnowledgeBaseID string `json:"knowledgeBaseId"`
		UseAgent        bool   `json:"useAgent"`
		AgentType       string `json:"agentType"`
		AgentID         string `json:"agentId"`
		Model           string `json:"model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.ConversationID == "" {
		req.ConversationID = uuid.New().String()
	}

	history := h.memoryService.GetHistory(req.ConversationID, 10)

	var ragContext string
	if req.KnowledgeBaseID != "" {
		ragContext = h.ragService.GetContextForQuery(req.Content, req.KnowledgeBaseID)
	}

	var messages []models.Message
	for _, mem := range history {
		messages = append(messages, models.Message{
			Role:    mem.Role,
			Content: mem.Content,
		})
	}

	if ragContext != "" {
		systemMsg := models.Message{
			Role:    "system",
			Content: fmt.Sprintf("基于以下知识库内容回答问题：\n\n%s", ragContext),
		}
		messages = append([]models.Message{systemMsg}, messages...)
	}

	userMsg := models.Message{
		Role:    "user",
		Content: req.Content,
	}
	messages = append(messages, userMsg)

	var response string
	var err error

	if req.UseAgent {
		if req.AgentID != "" && h.agents[req.AgentID] != nil {
			response, err = h.agents[req.AgentID].Execute(context.Background(), req.Content)
		} else {
			agentType := services.AgentType(req.AgentType)
			if agentType == "" {
				agentType = services.AgentTypeReAct
			}
			agent := h.agentFactory.CreateAgent(agentType, "聊天助手")
			response, err = agent.Execute(context.Background(), req.Content)
		}
	} else {
		model := req.Model
		if model == "" {
			model = "gpt-3.5-turbo"
		}
		resp, chatErr := h.llmService.Chat(context.Background(), messages, model)
		if chatErr != nil {
			err = chatErr
		} else {
			response = resp.Message.Content
		}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("处理失败: %v", err)})
		return
	}

	h.memoryService.Add(req.ConversationID, userMsg)
	h.memoryService.Add(req.ConversationID, models.Message{
		Role:    "assistant",
		Content: response,
	})

	c.JSON(http.StatusOK, gin.H{
		"conversationId": req.ConversationID,
		"response":       response,
		"timestamp":      time.Now(),
	})
}

func (h *ChatHandler) ChatStream(c *gin.Context) {
	var req struct {
		Content         string `json:"content" binding:"required"`
		ConversationID  string `json:"conversationId"`
		KnowledgeBaseID string `json:"knowledgeBaseId"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	frames := []string{
		"正在处理您的请求...",
		"分析输入内容...",
		"生成回复...",
		"完成！",
	}

	for i, frame := range frames {
		time.Sleep(500 * time.Millisecond)
		c.String(http.StatusOK, "data: {\"index\": %d, \"content\": \"%s\"}\n\n", i, frame)
	}

	c.String(http.StatusOK, "data: [DONE]\n\n")
}

func (h *ChatHandler) GetHistory(c *gin.Context) {
	conversationId := c.Param("conversationId")
	limit := 20

	history := h.memoryService.GetHistory(conversationId, limit)

	var messages []models.Message
	for _, mem := range history {
		messages = append(messages, models.Message{
			Role:    mem.Role,
			Content: mem.Content,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"conversationId": conversationId,
		"messages":       messages,
		"count":          len(messages),
	})
}

func (h *ChatHandler) ClearHistory(c *gin.Context) {
	conversationId := c.Param("conversationId")
	h.memoryService.Clear(conversationId)

	c.JSON(http.StatusOK, gin.H{
		"message":        "对话历史已清空",
		"conversationId": conversationId,
	})
}
