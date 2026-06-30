package demo

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
