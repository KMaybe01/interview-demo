package chat

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/internal/model"
)

type ModelHandler struct {
	manager *ModelManager
}

func NewModelHandler(manager *ModelManager) *ModelHandler {
	return &ModelHandler{manager: manager}
}

// ListModels  godoc
// @Summary     列出可用模型
// @Description 返回所有可用的 AI 模型列表（含 provider、上下文窗口、工具/视觉支持等）
// @Tags        模型
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /models [get]
func (h *ModelHandler) ListModels(c *gin.Context) {
	configs := h.manager.ListModels()

	var result []gin.H
	for _, config := range configs {
		client, _ := h.manager.Client(config.ID)
		info := client.ModelInfo()

		result = append(result, gin.H{
			"id":              config.ID,
			"provider":        config.Provider,
			"model_name":      config.ModelName,
			"max_tokens":      config.MaxTokens,
			"temperature":     config.Temperature,
			"context_window":  info.ContextWindow,
			"supports_tools":  info.SupportsTools,
			"supports_vision": info.SupportsVision,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"models": result,
		"count":  len(result),
	})
}

// GetModel  godoc
// @Summary     获取模型详情
// @Description 获取指定 AI 模型的详细信息
// @Tags        模型
// @Produce     json
// @Param       id path string true "模型 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /models/{id} [get]
func (h *ModelHandler) ModelDetail(c *gin.Context) {
	id := c.Param("id")

	client, exists := h.manager.Client(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "模型不存在"})
		return
	}

	info := client.ModelInfo()

	c.JSON(http.StatusOK, gin.H{
		"provider":        info.Provider,
		"model_name":      info.ModelName,
		"context_window":  info.ContextWindow,
		"max_output":      info.MaxOutputTokens,
		"supports_tools":  info.SupportsTools,
		"supports_vision": info.SupportsVision,
	})
}

// Chat  godoc
// @Summary     模型对话
// @Description 使用指定模型进行对话
// @Tags        模型
// @Accept      json
// @Produce     json
// @Param       id   path string                 true "模型 ID"
// @Param       body body  object{messages=[]model.Message} true "对话请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     404  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /models/{id}/chat [post]
func (h *ModelHandler) Chat(c *gin.Context) {
	modelID := c.Param("id")

	var req struct {
		Messages []model.Message `json:"messages" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	response, err := h.manager.Chat(context.Background(), modelID, req.Messages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"model_id":  modelID,
		"response":  response,
		"timestamp": time.Now(),
	})
}
