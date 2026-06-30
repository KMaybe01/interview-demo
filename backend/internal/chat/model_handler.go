package chat

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/internal/models"
)

type ModelHandler struct {
	manager *ModelManager
}

func NewModelHandler(manager *ModelManager) *ModelHandler {
	return &ModelHandler{manager: manager}
}

func (h *ModelHandler) ListModels(c *gin.Context) {
	configs := h.manager.ListModels()

	var result []gin.H
	for _, config := range configs {
		client, _ := h.manager.GetClient(config.ID)
		info := client.GetModelInfo()

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

func (h *ModelHandler) GetModel(c *gin.Context) {
	id := c.Param("id")

	client, exists := h.manager.GetClient(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "模型不存在"})
		return
	}

	info := client.GetModelInfo()

	c.JSON(http.StatusOK, gin.H{
		"provider":        info.Provider,
		"model_name":      info.ModelName,
		"context_window":  info.ContextWindow,
		"max_output":      info.MaxOutputTokens,
		"supports_tools":  info.SupportsTools,
		"supports_vision": info.SupportsVision,
	})
}

func (h *ModelHandler) Chat(c *gin.Context) {
	modelID := c.Param("id")

	var req struct {
		Messages []models.Message `json:"messages" binding:"required"`
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
