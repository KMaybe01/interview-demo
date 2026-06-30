package demo

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthCheck  godoc
// @Summary     健康检查
// @Description 返回 API 运行状态
// @Tags        监控
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /health [get]
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "AI Agent Demo API is running",
		"time":    time.Now().Format(time.RFC3339),
	})
}
