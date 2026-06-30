package lrucache

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type ServiceItem struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Region string `json:"region"`
	QPS    int    `json:"qps"`
	P99    int    `json:"p99"`
}

type ConfigData struct {
	ClusterName string `json:"clusterName"`
	Replicas    int    `json:"replicas"`
	EnableTLS   bool   `json:"enableTls"`
	LogLevel    string `json:"logLevel"`
}

type LogEntry struct {
	ID      int    `json:"id"`
	Level   string `json:"level"`
	Time    string `json:"time"`
	Source  string `json:"source"`
	Message string `json:"message"`
}

var serviceRegions = []string{"华北", "华东", "华南", "西南", "西北"}
var serviceStatuses = []string{"healthy", "warning", "critical"}
var logLevelsLRU = []string{"INFO", "WARN", "ERROR", "DEBUG"}
var logSources = []string{"api-gateway", "user-svc", "order-svc", "payment-svc", "cache-svc"}

// GetServices  godoc
// @Summary     服务列表
// @Description 返回模拟的服务实例列表（含名称、状态、区域、QPS、P99），用于演示 LRU 缓存
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Success     200 {object} map[string]interface{}
// @Router      /services [get]
func Services(c *gin.Context) {
	services := make([]ServiceItem, 30)
	for i := range 30 {
		services[i] = ServiceItem{
			ID:     i + 1,
			Name:   "service-" + fmt.Sprintf("%03d", i+1),
			Status: serviceStatuses[i%3],
			Region: serviceRegions[i%5],
			QPS:    rand.Intn(5000) + 500,
			P99:    rand.Intn(200) + 10,
		}
	}
	c.JSON(http.StatusOK, gin.H{"services": services})
}

// GetConfig  godoc
// @Summary     集群配置
// @Description 返回模拟的集群配置（含名称、副本数、TLS、日志级别），用于演示 LRU 缓存
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Success     200 {object} map[string]interface{}
// @Router      /config [get]
func Config(c *gin.Context) {
	ts := time.Now().UnixMilli()
	cfg := ConfigData{
		ClusterName: "prod-cluster-" + fmt.Sprintf("%04d", ts%10000),
		Replicas:    3 + int(ts%5),
		EnableTLS:   ts%2 == 0,
		LogLevel:    []string{"debug", "info", "warn", "error"}[ts%4],
	}
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

// GetLogs  godoc
// @Summary     日志列表
// @Description 返回模拟的 200 条系统日志（含级别、时间、来源、消息），用于演示 LRU 缓存
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Success     200 {object} map[string]interface{}
// @Router      /logs [get]
func Logs(c *gin.Context) {
	now := time.Now()
	logs := make([]LogEntry, 200)
	for i := range 200 {
		lvl := logLevelsLRU[i%4]
		logs[i] = LogEntry{
			ID:      i + 1,
			Level:   lvl,
			Time:    now.Add(-time.Duration(i) * time.Minute).Format("15:04:05"),
			Source:  logSources[i%5],
			Message: fmt.Sprintf("[%s] request processed in %dms — trace-%06d", lvl, rand.Intn(100)+1, i+1),
		}
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
