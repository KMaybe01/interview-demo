package chat

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/memory"
	"interview-demo/backend/internal/model"
)

type AgentExecutor interface {
	Execute(ctx context.Context, input string) (string, error)
}

type Handler struct {
	llmService       *LLMService
	geminiLLMService *LLMService
	agnesLLMService  *LLMService
	memoryService    *memory.Service
	ragService       *knowledge.RAGService
	lookupAgent      func(id string) AgentExecutor
	createAgent      func(agentType, name string) AgentExecutor
}

func NewHandler(
	llmService *LLMService,
	memoryService *memory.Service,
	ragService *knowledge.RAGService,
	lookupAgent func(id string) AgentExecutor,
	createAgent func(agentType, name string) AgentExecutor,
) *Handler {
	return &Handler{
		llmService:    llmService,
		memoryService: memoryService,
		ragService:    ragService,
		lookupAgent:   lookupAgent,
		createAgent:   createAgent,
	}
}

// SetGeminiLLMService 设置 Gemini LLM 服务
func (h *Handler) SetGeminiLLMService(svc *LLMService) {
	h.geminiLLMService = svc
}

// SetAgnesLLMService 设置 Agnes AI LLM 服务
func (h *Handler) SetAgnesLLMService(svc *LLMService) {
	h.agnesLLMService = svc
}

// selectLLMService 根据模型名称选择 LLM 服务
func (h *Handler) selectLLMService(modelName string) *LLMService {
	lower := strings.ToLower(modelName)
	if h.agnesLLMService != nil && strings.Contains(lower, "agnes") {
		return h.agnesLLMService
	}
	if h.geminiLLMService != nil && strings.Contains(lower, "gemini") {
		return h.geminiLLMService
	}
	return h.llmService
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
func (h *Handler) Chat(c *gin.Context) {
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

	history := h.memoryService.History(req.ConversationID, 10)

	var ragContext string
	if req.KnowledgeBaseID != "" {
		ragContext = h.ragService.ContextForQuery(req.Content, req.KnowledgeBaseID)
	}

	var messages []model.Message
	for _, mem := range history {
		messages = append(messages, model.Message{
			Role:    mem.Role,
			Content: mem.Content,
		})
	}

	if ragContext != "" {
		systemMsg := model.Message{
			Role:    "system",
			Content: fmt.Sprintf("基于以下知识库内容回答问题：\n\n%s", ragContext),
		}
		messages = append([]model.Message{systemMsg}, messages...)
	}

	userMsg := model.Message{
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
		modelName := req.Model
		if modelName == "" {
			modelName = "gpt-3.5-turbo"
		}
		svc := h.selectLLMService(modelName)
		resp, chatErr := svc.Chat(context.Background(), messages, modelName)
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
	h.memoryService.Add(req.ConversationID, model.Message{
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
// @Description 通过 Server-Sent Events 返回流式聊天回复（支持 RAG 上下文和对话记忆）
// @Tags        对话
// @Accept      json
// @Produce     text/event-stream
// @Param       body body     object{content=string,conversationId=string,knowledgeBaseId=string} true "聊天请求"
// @Success     200
// @Failure     400 {object} map[string]interface{}
// @Router      /chat/stream [post]
func (h *Handler) ChatStream(c *gin.Context) {
	var req struct {
		Content         string `json:"content" binding:"required"`
		ConversationID  string `json:"conversationId"`
		KnowledgeBaseID string `json:"knowledgeBaseId"`
		Model           string `json:"model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.ConversationID == "" {
		req.ConversationID = uuid.New().String()
	}
	if req.Model == "" {
		req.Model = "gpt-3.5-turbo"
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	history := h.memoryService.History(req.ConversationID, 10)

	var ragContext string
	if req.KnowledgeBaseID != "" {
		ragContext = h.ragService.ContextForQuery(req.Content, req.KnowledgeBaseID)
	}

	var messages []model.Message
	for _, mem := range history {
		messages = append(messages, model.Message{
			Role:    mem.Role,
			Content: mem.Content,
		})
	}
	if ragContext != "" {
		systemMsg := model.Message{
			Role:    "system",
			Content: fmt.Sprintf("基于以下知识库内容回答问题：\n\n%s", ragContext),
		}
		messages = append([]model.Message{systemMsg}, messages...)
	}

	userMsg := model.Message{
		Role:    "user",
		Content: req.Content,
	}
	messages = append(messages, userMsg)

	ctx := c.Request.Context()
	ch := make(chan model.StreamChunk, 10)

	svc := h.selectLLMService(req.Model)
	log.Printf("[ChatStream] model=%q, using gemini=%v", req.Model, svc == h.geminiLLMService)
	stream, err := svc.ChatStream(ctx, messages, req.Model)
	if err != nil {
		log.Printf("[ChatStream] API error: %v", err)
		go MockChatStreamReason(ctx, req.Content, err.Error(), ch)
	} else {
		go ReadStream(stream, ch)
	}

	var fullContent string

	c.Stream(func(w io.Writer) bool {
		chunk, ok := <-ch
		if !ok {
			return false
		}
		if chunk.Done {
			fmt.Fprintf(w, "data: [DONE]\n\n")
			return false
		}
		fullContent += chunk.Content
		fmt.Fprintf(w, "data: {\"content\": %q}\n\n", chunk.Content)
		return true
	})

	if fullContent != "" {
		h.memoryService.Add(req.ConversationID, userMsg)
		h.memoryService.Add(req.ConversationID, model.Message{
			Role:    "assistant",
			Content: fullContent,
		})
	}
}

// GetHistory  godoc
// @Summary     获取聊天历史
// @Description 获取指定会话的聊天历史消息
// @Tags        对话
// @Produce     json
// @Param       conversationId path string true "会话 ID"
// @Success     200 {object} map[string]interface{}
// @Router      /chat/history/{conversationId} [get]
func (h *Handler) History(c *gin.Context) {
	conversationId := c.Param("conversationId")
	limit := 20

	history := h.memoryService.History(conversationId, limit)

	var messages []model.Message
	for _, mem := range history {
		messages = append(messages, model.Message{
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
func (h *Handler) ClearHistory(c *gin.Context) {
	conversationId := c.Param("conversationId")
	h.memoryService.Clear(conversationId)

	c.JSON(http.StatusOK, gin.H{
		"message":        "对话历史已清空",
		"conversationId": conversationId,
	})
}
