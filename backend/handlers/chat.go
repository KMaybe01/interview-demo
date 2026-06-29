package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"interview-demo/backend/models"
	"interview-demo/backend/services"
)

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "AI Agent Demo API is running",
		"time":    time.Now().Format(time.RFC3339),
	})
}

func Chat(llmService *services.LLMService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ChatRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error: "请求参数错误: " + err.Error(),
				Code:  400,
			})
			return
		}

		if len(req.Messages) > 0 && req.Messages[0].Role != "system" {
			systemMsg := models.Message{
				Role:    "system",
				Content: "你是一个有用的AI助手。请用中文回答用户的问题。",
			}
			req.Messages = append([]models.Message{systemMsg}, req.Messages...)
		}

		resp, err := llmService.Chat(c.Request.Context(), req.Messages, req.Model)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "AI 响应失败: " + err.Error(),
				Code:  500,
			})
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

func ChatStream(llmService *services.LLMService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ChatRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error: "请求参数错误: " + err.Error(),
				Code:  400,
			})
			return
		}

		if len(req.Messages) > 0 && req.Messages[0].Role != "system" {
			systemMsg := models.Message{
				Role:    "system",
				Content: "你是一个有用的AI助手。请用中文回答用户的问题。",
			}
			req.Messages = append([]models.Message{systemMsg}, req.Messages...)
		}

		stream, err := llmService.ChatStream(c.Request.Context(), req.Messages, req.Model)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "流式 AI 响应失败: " + err.Error(),
				Code:  500,
			})
			return
		}
		defer stream.Close()

		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Access-Control-Allow-Origin", "*")

		ch := make(chan models.StreamChunk)
		go services.ReadStream(stream, ch)

		for chunk := range ch {
			if chunk.Done {
				fmt.Fprintf(c.Writer, "data: [DONE]\n\n")
				c.Writer.Flush()
				return
			}
			fmt.Fprintf(c.Writer, "data: %s\n\n", chunk.Content)
			c.Writer.Flush()
		}
	}
}
