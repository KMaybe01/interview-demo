package handlers

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

func GetServices(c *gin.Context) {
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

func GetConfig(c *gin.Context) {
	ts := time.Now().UnixMilli()
	cfg := ConfigData{
		ClusterName: "prod-cluster-" + fmt.Sprintf("%04d", ts%10000),
		Replicas:    3 + int(ts%5),
		EnableTLS:   ts%2 == 0,
		LogLevel:    []string{"debug", "info", "warn", "error"}[ts%4],
	}
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

func GetLogs(c *gin.Context) {
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
