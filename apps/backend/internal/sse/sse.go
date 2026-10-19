package sse

import (
	"fmt"
	"log"
	"math/rand"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var logLevels = []string{"INFO", "WARN", "ERROR", "DEBUG"}

var logMessages = []string{
	"Request processed successfully",
	"Database query completed",
	"Cache miss for key",
	"User authentication succeeded",
	"Rate limit approaching threshold",
	"Background job completed",
	"Memory usage at 75%",
	"Connection pool status: healthy",
	"API response time: 45ms",
	"Session expired for user",
}

// SSELogStream  godoc
// @Summary     SSE 日志流
// @Description 通过 Server-Sent Events 推送实时模拟日志流
// @Tags        演示
// @Produce     text/event-stream
// @Param       level    query string false "日志级别 (all/info/warn/error/debug)" default(all)
// @Param       interval query string false "推送间隔毫秒"                   default(200)
// @Success     200
// @Router      /sse/logs [get]
func SSELogStream(c *gin.Context) {
	level := c.DefaultQuery("level", "all")
	intervalStr := c.DefaultQuery("interval", "200")
	interval, err := time.ParseDuration(intervalStr + "ms")
	if err != nil {
		interval = 200 * time.Millisecond
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := c.Writer.(interface{ Flush() })
	if !ok {
		log.Println("Streaming not supported")
		return
	}

	id := 0
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			id++
			lvl := logLevels[rand.Intn(len(logLevels))]

			if level != "all" && !strings.EqualFold(lvl, level) {
				continue
			}

			msg := logMessages[rand.Intn(len(logMessages))]
			line := fmt.Sprintf("[%s] [%s] [req-%d] %s",
				lvl, time.Now().Format(time.RFC3339), id, msg)

			fmt.Fprintf(c.Writer, "data: %s\n\n", line)
			flusher.Flush()

		case <-c.Request.Context().Done():
			return
		}
	}
}
