package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestSSELogStream_Headers(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	ctx, cancel := context.WithCancel(context.Background())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/sse/logs?interval=10", nil)
	c.Request = c.Request.WithContext(ctx)

	done := make(chan struct{})
	go func() {
		SSELogStream(c)
		close(done)
	}()
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("SSELogStream did not exit after cancel")
	}

	ct := w.Header().Get("Content-Type")
	if !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("expected Content-Type text/event-stream, got %s", ct)
	}
	body := w.Body.String()
	if !strings.Contains(body, "data: ") {
		t.Fatal("expected at least one data: event")
	}
}

func TestSSELogStream_InvalidInterval(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	ctx, cancel := context.WithCancel(context.Background())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/sse/logs?interval=abc", nil)
	c.Request = c.Request.WithContext(ctx)

	done := make(chan struct{})
	go func() {
		SSELogStream(c)
		close(done)
	}()
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("SSELogStream did not exit after cancel")
	}

	ct := w.Header().Get("Content-Type")
	if !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("expected Content-Type text/event-stream, got %s", ct)
	}
}

func TestSSELogStream_FilterLevel(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	ctx, cancel := context.WithCancel(context.Background())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/sse/logs?interval=10&level=ERROR", nil)
	c.Request = c.Request.WithContext(ctx)

	done := make(chan struct{})
	go func() {
		SSELogStream(c)
		close(done)
	}()
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("SSELogStream did not exit after cancel")
	}
	// Just verify the handler ran without panic
}
