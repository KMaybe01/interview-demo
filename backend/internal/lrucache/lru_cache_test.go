package lrucache

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetServices(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/services", nil)

	Services(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	services := resp["services"].([]any)
	if len(services) != 30 {
		t.Fatalf("expected 30 services, got %d", len(services))
	}
	svc := services[0].(map[string]any)
	if svc["name"] == "" {
		t.Fatal("expected service name to be non-empty")
	}
}

func TestGetConfig(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/config", nil)

	Config(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	cfg := resp["config"].(map[string]any)
	if cfg["clusterName"] == "" {
		t.Fatal("expected clusterName to be non-empty")
	}
	if _, ok := cfg["replicas"].(float64); !ok {
		t.Fatal("expected replicas to be a number")
	}
	if _, ok := cfg["enableTls"].(bool); !ok {
		t.Fatal("expected enableTls to be a boolean")
	}
}

func TestGetLogs(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/logs", nil)

	Logs(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	logs := resp["logs"].([]any)
	if len(logs) != 200 {
		t.Fatalf("expected 200 log entries, got %d", len(logs))
	}
	entry := logs[0].(map[string]any)
	if entry["level"] == "" {
		t.Fatal("expected log level to be non-empty")
	}
}
