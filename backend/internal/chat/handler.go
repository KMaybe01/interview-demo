package chat

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/memory"
	"interview-demo/backend/internal/models"
)

type AgentExecutor interface {
	Execute(ctx context.Context, input string) (string, error)
}

type ChatHandler struct {
	llmService    *LLMService
	memoryService *memory.MemoryService
	ragService    *knowledge.RAGService
	lookupAgent   func(id string) AgentExecutor
	createAgent   func(agentType, name string) AgentExecutor
}

func NewChatHandler(
	llmService *LLMService,
	memoryService *memory.MemoryService,
	ragService *knowledge.RAGService,
	lookupAgent func(id string) AgentExecutor,
	createAgent func(agentType, name string) AgentExecutor,
) *ChatHandler {
	return &ChatHandler{
		llmService:    llmService,
		memoryService: memoryService,
		ragService:    ragService,
		lookupAgent:   lookupAgent,
		createAgent:   createAgent,
	}
}

// Chat  godoc
// @Summary     发送聊天消息
// @Description 发送消息并获取 AI 回复，支持知识库上下文、Agent 调用、模型选择
// @Tags        对话
// @Accept      json
// @Produce     json
// @Param       body body     object{content=string,conversationId=string,knowledgeBaseId=string,useAgent=bool,agentType=string,agentId=string,model=string} true "聊天请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /chat [post]
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
		agt := h.lookupAgent(req.AgentID)

		if req.AgentID != "" && agt != nil {
			response, err = agt.Execute(context.Background(), req.Content)
		} else {
			agentType := req.AgentType
			if agentType == "" {
				agentType = "react"
			}
			agt = h.createAgent(agentType, "聊天助手")
			response, err = agt.Execute(context.Background(), req.Content)
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

// ChatStream  godoc
// @Summary     聊天流式回复 (SSE)
// @Description 通过 Server-Sent Events 返回流式聊天回复
// @Tags        对话
// @Accept      json
// @Produce     text/event-stream
// @Param       body body     object{content=string,conversationId=string,knowledgeBaseId=string} true "聊天请求"
// @Success     200
// @Failure     400 {object} map[string]interface{}
// @Router      /chat/stream [post]
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

// GetHistory  godoc
// @Summary     获取聊天历史
// @Description 获取指定会话的聊天历史消息
// @Tags        对话
// @Produce     json
// @Param       conversationId path string true "会话 ID"
// @Success     200 {object} map[string]interface{}
// @Router      /chat/history/{conversationId} [get]
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

// ClearHistory  godoc
// @Summary     清空聊天历史
// @Description 清空指定会话的聊天历史消息
// @Tags        对话
// @Produce     json
// @Param       conversationId path string true "会话 ID"
// @Success     200 {object} map[string]interface{}
// @Router      /chat/history/{conversationId} [delete]
func (h *ChatHandler) ClearHistory(c *gin.Context) {
	conversationId := c.Param("conversationId")
	h.memoryService.Clear(conversationId)

	c.JSON(http.StatusOK, gin.H{
		"message":        "对话历史已清空",
		"conversationId": conversationId,
	})
}
