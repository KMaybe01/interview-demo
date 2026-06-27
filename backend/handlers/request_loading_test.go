package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestDemoRequest_Default(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?fast_test=true", nil)

	DemoRequest(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["success"].(bool) != true {
		t.Fatal("expected success=true")
	}
	data := resp["data"].(map[string]any)
	if data["type"] != "demo" {
		t.Fatalf("expected type=demo, got %v", data["type"])
	}
	delay := resp["delay"].(float64)
	if delay != 1000 {
		t.Fatalf("expected delay=1000, got %v", delay)
	}
}

func TestDemoRequest_UsersType(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?type=users&delay=0", nil)

	DemoRequest(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	data := resp["data"].(map[string]any)
	if data["type"] != "users" {
		t.Fatalf("expected type=users, got %v", data["type"])
	}
}

func TestDemoRequest_ReportsType(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?type=reports&delay=0", nil)

	DemoRequest(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	data := resp["data"].(map[string]any)
	if data["type"] != "reports" {
		t.Fatalf("expected type=reports, got %v", data["type"])
	}
}

func TestDemoRequest_ExportType(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?type=export&delay=0", nil)

	DemoRequest(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	data := resp["data"].(map[string]any)
	if data["type"] != "export" {
		t.Fatalf("expected type=export, got %v", data["type"])
	}
}

func TestDemoRequest_FailRate(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?delay=0&fail=1", nil)

	DemoRequest(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 with fail=1, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["error"] != "simulated server error" {
		t.Fatalf("expected simulated error, got %v", resp["error"])
	}
}

func TestDemoRequest_DelayClamp(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?delay=99999&fast_test=true", nil)

	DemoRequest(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	delay := resp["delay"].(float64)
	if delay != 10000 {
		t.Fatalf("expected delay clamped to 10000, got %v", delay)
	}
}

func TestDemoRequest_InvalidDelay(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?delay=abc&fast_test=true", nil)

	DemoRequest(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	delay := resp["delay"].(float64)
	if delay != 1000 {
		t.Fatalf("expected delay fallback to 1000, got %v", delay)
	}
}

func TestDemoRequest_FailRateClamp(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?delay=0&fail=5", nil)

	DemoRequest(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 with fail=5 (clamped to 1), got %d", w.Code)
	}
}

func TestDemoRequest_ContextCancelled(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/request-loading/demo?delay=5000", nil)

	ctx, cancel := context.WithCancel(c.Request.Context())
	cancel() // cancel immediately to test the select case
	c.Request = c.Request.WithContext(ctx)

	DemoRequest(c)

	// Since we cancel immediately, it should return without writing body, status defaults to 200
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}
