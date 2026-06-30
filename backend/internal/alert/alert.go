package alert

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var allowedWSSOrigin string

func init() {
	allowedWSSOrigin = os.Getenv("CORS_ORIGIN")
	if allowedWSSOrigin == "" {
		allowedWSSOrigin = "*"
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		if allowedWSSOrigin == "*" {
			return true
		}
		return r.Header.Get("Origin") == allowedWSSOrigin
	},
}

var seqCounter int64

type AlertMessage struct {
	ID       string `json:"id"`
	Seq      int64  `json:"seq"`
	Topic    string `json:"topic"`
	Category string `json:"category"`
	Level    string `json:"level"`
	Message  string `json:"message"`
	Time     string `json:"time"`
}

var topics = []string{"alert", "status", "log"}

type levelWeight struct {
	level  string
	weight int
}

var topicWeights = map[string][]levelWeight{
	"alert":  {{"critical", 20}, {"major", 30}, {"minor", 30}, {"info", 20}},
	"status": {{"critical", 8}, {"major", 12}, {"minor", 30}, {"info", 50}},
	"log":    {{"critical", 5}, {"major", 15}, {"minor", 35}, {"info", 45}},
}

func weightedPick(weights []levelWeight) string {
	total := 0
	for _, w := range weights {
		total += w.weight
	}
	r := rand.Intn(total)
	for _, w := range weights {
		if r < w.weight {
			return w.level
		}
		r -= w.weight
	}
	return "info"
}

type msgTemplate struct {
	category string
	template string
	argTypes []byte
}

var alertTemplates = []msgTemplate{
	{"system", "CPU 使用率 %.0f%% (阈值 90%%)", []byte{'f'}},
	{"system", "内存使用率 %.0f%% (阈值 85%%)", []byte{'f'}},
	{"system", "磁盘空间剩余 %.1fGB (阈值 10GB)", []byte{'f'}},
	{"system", "系统负载 %.2f (核心数 %d)", []byte{'f', 'd'}},
	{"system", "系统运行时长 %.0f 天未重启", []byte{'f'}},
	{"network", "网络延迟 %.0fms (阈值 50ms)", []byte{'f'}},
	{"network", "丢包率 %.1f%% (阈值 1%%)", []byte{'f'}},
	{"network", "带宽使用率 %.0f%% (阈值 80%%)", []byte{'f'}},
	{"network", "TCP 连接数 %d (阈值 10000)", []byte{'d'}},
	{"network", "DNS 解析耗时 %.0fms", []byte{'f'}},
	{"database", "数据库连接池使用率 %.0f%%", []byte{'f'}},
	{"database", "慢查询 %d 条超过 1s", []byte{'d'}},
	{"database", "主从同步延迟 %.0fms", []byte{'f'}},
	{"database", "死锁检测 %d 次/分钟", []byte{'d'}},
	{"database", "表空间使用率 %.0f%%", []byte{'f'}},
	{"security", "异常登录尝试 %d 次/分钟 (IP: 10.0.1.%d)", []byte{'d', 'd'}},
	{"security", "SSL 证书 %.0f 天后过期", []byte{'f'}},
	{"security", "暴力破解已拦截 %d 次", []byte{'d'}},
	{"security", "敏感文件权限变更 %d 条", []byte{'d'}},
	{"security", "防火墙规则命中率 %.0f%%", []byte{'f'}},
	{"application", "API p99 响应时间 %.0fms (阈值 500ms)", []byte{'f'}},
	{"application", "服务 %s 健康检查失败 (第 %d 次)", []byte{'s', 'd'}},
	{"application", "任务队列积压 %d 条", []byte{'d'}},
	{"application", "缓存命中率 %.0f%% (阈值 90%%)", []byte{'f'}},
	{"application", "JVM GC 暂停 %.0fms", []byte{'f'}},
}

var statusTemplates = []msgTemplate{
	{"system", "节点 10.0.1.%d 存活检查通过", []byte{'d'}},
	{"system", "系统时延 %.0fms", []byte{'f'}},
	{"system", "服务 %s 实例数 %d/%d", []byte{'s', 'd', 'd'}},
	{"system", "容器重启次数 %d (24h)", []byte{'d'}},
	{"network", "API 网关 QPS %d", []byte{'d'}},
	{"network", "CDN 回源率 %.1f%%", []byte{'f'}},
	{"network", "当前活跃连接 %d", []byte{'d'}},
	{"database", "数据库主从同步延迟 %.0fms", []byte{'f'}},
	{"database", "缓存集群内存使用率 %.0f%%", []byte{'f'}},
	{"database", "连接池空闲连接 %d", []byte{'d'}},
}

var logTemplates = []msgTemplate{
	{"application", "GET /api/users 200 %.0fms", []byte{'f'}},
	{"application", "POST /api/orders 201 %.0fms", []byte{'f'}},
	{"application", "GET /api/dashboard 200 %.0fms", []byte{'f'}},
	{"application", "PUT /api/config 204 %.0fms", []byte{'f'}},
	{"application", "DELETE /api/cache 200 %.0fms", []byte{'f'}},
	{"application", "ERROR: connection refused to 10.0.1.%d:3306", []byte{'d'}},
	{"application", "WARN: disk usage %.0f%% on /data", []byte{'f'}},
	{"application", "INFO: scheduled job completed in %.0fms", []byte{'f'}},
	{"application", "ERROR: timeout waiting for pool %s", []byte{'s'}},
	{"application", "WARN: retry %d/%d for order-%d", []byte{'d', 'd', 'd'}},
}

var serviceNames = []string{"api-gateway", "user-service", "order-service", "inventory-service", "notification-service"}

func fillTemplate(tmpl msgTemplate) (category, message string) {
	args := make([]interface{}, len(tmpl.argTypes))
	for i, t := range tmpl.argTypes {
		switch t {
		case 's':
			args[i] = serviceNames[rand.Intn(len(serviceNames))]
		case 'd':
			args[i] = rand.Intn(1000)
		case 'f':
			args[i] = float64(rand.Intn(10000)) / 100
		}
	}
	return tmpl.category, fmt.Sprintf(tmpl.template, args...)
}

var msgCounter int64

func nextID() string {
	n := atomic.AddInt64(&msgCounter, 1)
	return fmt.Sprintf("alert-%d-%d", time.Now().UnixNano(), n)
}

func randomMessage(topic string) AlertMessage {
	var category, msg string
	level := weightedPick(topicWeights[topic])

	switch topic {
	case "status":
		t := statusTemplates[rand.Intn(len(statusTemplates))]
		category, msg = fillTemplate(t)
	case "log":
		t := logTemplates[rand.Intn(len(logTemplates))]
		category, msg = fillTemplate(t)
	default:
		t := alertTemplates[rand.Intn(len(alertTemplates))]
		category, msg = fillTemplate(t)
	}

	return AlertMessage{
		ID:       nextID(),
		Seq:      atomic.AddInt64(&seqCounter, 1),
		Topic:    topic,
		Category: category,
		Level:    level,
		Message:  msg,
		Time:     time.Now().Format("15:04:05.000"),
	}
}

func parseRate(c *gin.Context) int {
	rate := 1000
	if r := c.Query("rate"); r != "" {
		if v, err := strconv.Atoi(r); err == nil && v > 0 {
			rate = v
		}
	}
	if rate > 200000 {
		rate = 200000
	}
	return rate
}

func parseWorkers(c *gin.Context) int {
	workers := 4
	if w := c.Query("workers"); w != "" {
		if v, err := strconv.Atoi(w); err == nil && v > 0 {
			workers = v
		}
	}
	if workers > 128 {
		workers = 128
	}
	return workers
}

func computeBatchConfig(rate, workers int) (batchInterval time.Duration, batchSize int) {
	batchInterval = 5 * time.Millisecond
	batchesPerSec := int(time.Second / batchInterval)
	perWorker := rate / workers
	if perWorker < 1 {
		perWorker = 1
	}
	batchSize = perWorker / batchesPerSec
	if batchSize < 1 {
		batchSize = 1
	}
	return
}

func generateAlertJSON() []byte {
	topic := topics[rand.Intn(len(topics))]
	alert := randomMessage(topic)
	data, err := json.Marshal(alert)
	if err != nil {
		return nil
	}
	return data
}

// AlertDispatcher  godoc
// @Summary     告警推送 (WebSocket/SSE/Polling)
// @Description 支持 WebSocket、SSE、HTTP 轮询三种传输方式的实时告警推送演示，包含 CPU、内存、网络等多种指标
// @Tags        演示
// @Produce     application/json
// @Param       transport query string false "传输方式 (ws/sse/poll)" default(ws)
// @Param       rate      query int    false "每秒消息数"            default(1000)
// @Param       workers   query int    false "并发工作数 (仅 ws)"    default(4)
// @Success     200 {object} map[string]interface{}
// @Router      /alerts [get]
func AlertDispatcher(c *gin.Context) {
	transport := c.DefaultQuery("transport", "ws")
	switch transport {
	case "sse":
		serveAlertSSE(c)
	case "poll":
		serveAlertPoll(c)
	default:
		serveAlertWS(c)
	}
}

func serveAlertWS(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	rate := parseRate(c)
	workers := parseWorkers(c)
	batchInterval, batchSize := computeBatchConfig(rate, workers)

	conn.SetReadLimit(512)

	var mu sync.Mutex
	writeLock := func(data []byte) error {
		mu.Lock()
		defer mu.Unlock()
		return conn.WriteMessage(websocket.TextMessage, data)
	}

	done := make(chan struct{})
	var closeOnce sync.Once
	closeDone := func() { closeOnce.Do(func() { close(done) }) }

	go func() {
		for {
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				closeDone()
				return
			}
			var msg map[string]string
			if err := json.Unmarshal(msgBytes, &msg); err != nil {
				continue
			}
			if msg["type"] == "ping" {
				pong, err := json.Marshal(map[string]string{"type": "pong"})
				if err != nil {
					continue
				}
				writeLock(pong)
			}
		}
	}()

	msgChan := make(chan []byte, rate*2)

	go func() {
		for {
			select {
			case data := <-msgChan:
				if err := writeLock(data); err != nil {
					closeDone()
					return
				}
			case <-done:
				return
			}
		}
	}()

	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ticker := time.NewTicker(batchInterval)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					for i := 0; i < batchSize; i++ {
						data := generateAlertJSON()
						if data == nil {
							continue
						}
						select {
						case msgChan <- data:
						default:
						}
					}
				case <-done:
					return
				}
			}
		}()
	}

	<-done
	wg.Wait()
}

func serveAlertSSE(c *gin.Context) {
	rate := parseRate(c)

	tickInterval := 100 * time.Millisecond
	msgsPerTick := rate * int(tickInterval/time.Second)
	if msgsPerTick < 1 {
		msgsPerTick = 1
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	flusher, ok := c.Writer.(interface{ Flush() })
	if !ok {
		return
	}

	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()

	done := c.Request.Context().Done()
	for {
		select {
		case <-ticker.C:
			for i := 0; i < msgsPerTick; i++ {
				data := generateAlertJSON()
				fmt.Fprintf(c.Writer, "data: %s\n\n", string(data))
			}
			flusher.Flush()
		case <-done:
			return
		}
	}
}

func serveAlertPoll(c *gin.Context) {
	rate := parseRate(c)

	count := rate / 10
	if count < 10 {
		count = 10
	}
	if count > 200 {
		count = 200
	}

	alerts := make([]AlertMessage, count)
	for i := 0; i < count; i++ {
		topic := topics[rand.Intn(len(topics))]
		alerts[i] = randomMessage(topic)
	}

	c.Writer.Header().Set("Content-Type", "application/json")
	c.JSON(http.StatusOK, alerts)
}
