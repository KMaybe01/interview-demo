package demo

import (
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// DemoRequest  godoc
// @Summary     请求加载状态演示
// @Description 模拟请求延迟和随机失败，用于前端加载状态展示（含骨架屏/错误重试等场景）
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Param       delay query int    false "延迟毫秒 (0-10000)" default(1000)
// @Param       fail  query number false "失败率 (0.0-1.0)"  default(0)
// @Param       type  query string false "数据类型 (default/users/reports/export)"
// @Success     200   {object} map[string]interface{}
// @Failure     500   {object} map[string]interface{}
// @Router      /request-loading/demo [get]
func DemoRequest(c *gin.Context) {
	delayStr := c.DefaultQuery("delay", "1000")
	failStr := c.DefaultQuery("fail", "0")
	requestType := c.DefaultQuery("type", "default")

	delay, err := strconv.Atoi(delayStr)
	if err != nil || delay < 0 {
		delay = 1000
	}
	if delay > 10000 {
		delay = 10000
	}

	failRate, err := strconv.ParseFloat(failStr, 64)
	if err != nil || failRate < 0 {
		failRate = 0
	}
	if failRate > 1 {
		failRate = 1
	}

	if c.Query("fast_test") != "true" {
		select {
		case <-time.After(time.Duration(delay) * time.Millisecond):
		case <-c.Request.Context().Done():
			return
		}
	}

	if rand.Float64() < failRate {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "simulated server error",
			"type":  requestType,
		})
		return
	}

	var data gin.H
	switch requestType {
	case "users":
		data = gin.H{
			"type":  "users",
			"count": 5,
			"items": []gin.H{
				{"id": 1, "name": "Alice", "role": "admin"},
				{"id": 2, "name": "Bob", "role": "editor"},
				{"id": 3, "name": "Charlie", "role": "viewer"},
				{"id": 4, "name": "Diana", "role": "editor"},
				{"id": 5, "name": "Eve", "role": "viewer"},
			},
		}
	case "reports":
		data = gin.H{
			"type":    "reports",
			"summary": "Q4 performance report",
			"metrics": gin.H{
				"qps":   12500,
				"p99":   45,
				"error": 0.02,
			},
		}
	case "export":
		data = gin.H{
			"type":    "export",
			"status":  "complete",
			"fileUrl": "/downloads/report-q4.csv",
			"rows":    150000,
		}
	default:
		data = gin.H{
			"type":      "demo",
			"message":   "OK",
			"timestamp": time.Now().UnixMilli(),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
		"delay":   delay,
	})
}
