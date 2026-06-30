package demo

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestEncryptedLogStream_InitialEvents(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	ctx, cancel := context.WithCancel(context.Background())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/sse/encrypted-logs?limit=500", nil)
	c.Request = c.Request.WithContext(ctx)

	done := make(chan struct{})
	go func() {
		EncryptedLogStream(c)
		close(done)
	}()
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("EncryptedLogStream did not exit after cancel")
	}

	body := w.Body.String()
	if !strings.Contains(body, "data: ") {
		t.Fatal("expected data: events")
	}
	if !strings.Contains(body, "rsa-public-key") {
		t.Fatal("expected rsa-public-key initial event")
	}
	if !strings.Contains(body, "key-exchange") {
		t.Fatal("expected key-exchange event")
	}
}

func TestEncryptedLogStream_DoneEvent(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	c.Request = httptest.NewRequest(http.MethodGet, "/api/sse/encrypted-logs?limit=500", nil)
	c.Request = c.Request.WithContext(ctx)

	done := make(chan struct{})
	go func() {
		EncryptedLogStream(c)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("EncryptedLogStream timed out")
	}

	body := w.Body.String()
	if !strings.Contains(body, `"type":"done"`) {
		t.Fatal("expected done event at end of stream")
	}

	// Verify chunk events are valid JSON
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "data: ") {
			var evt map[string]any
			if err := json.Unmarshal([]byte(line[6:]), &evt); err != nil {
				t.Fatalf("invalid JSON in SSE data: %v", err)
			}
			if evt["type"] == "chunk" {
				if _, ok := evt["seq"]; !ok {
					t.Fatal("chunk event missing seq")
				}
			}
		}
	}
}

func TestEncryptedLogStream_Headers(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	ctx, cancel := context.WithCancel(context.Background())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/sse/encrypted-logs", nil)
	c.Request = c.Request.WithContext(ctx)

	done := make(chan struct{})
	go func() {
		EncryptedLogStream(c)
		close(done)
	}()
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(500 * time.Millisecond):
		t.Fatal("EncryptedLogStream did not exit after cancel")
	}

	ct := w.Header().Get("Content-Type")
	if !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("expected Content-Type text/event-stream, got %s", ct)
	}
}
