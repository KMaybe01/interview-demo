package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// Helper functions (parseRate, computeBatchConfig, etc.)

func TestParseRate_Default(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts", nil)

	rate := parseRate(c)
	if rate != 1000 {
		t.Fatalf("expected default rate 1000, got %d", rate)
	}
}

func TestParseRate_Custom(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?rate=500", nil)

	rate := parseRate(c)
	if rate != 500 {
		t.Fatalf("expected rate 500, got %d", rate)
	}
}

func TestParseRate_Clamp(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?rate=999999", nil)

	rate := parseRate(c)
	if rate != 200000 {
		t.Fatalf("expected rate clamped to 200000, got %d", rate)
	}
}

func TestParseRate_Invalid(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?rate=abc", nil)

	rate := parseRate(c)
	if rate != 1000 {
		t.Fatalf("expected default rate 1000 for invalid input, got %d", rate)
	}
}

func TestParseWorkers_Default(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts", nil)

	workers := parseWorkers(c)
	if workers != 4 {
		t.Fatalf("expected default workers 4, got %d", workers)
	}
}

func TestParseWorkers_Custom(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?workers=8", nil)

	workers := parseWorkers(c)
	if workers != 8 {
		t.Fatalf("expected workers 8, got %d", workers)
	}
}

func TestParseWorkers_Clamp(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?workers=200", nil)

	workers := parseWorkers(c)
	if workers != 128 {
		t.Fatalf("expected workers clamped to 128, got %d", workers)
	}
}

func TestComputeBatchConfig_Basic(t *testing.T) {
	interval, size := computeBatchConfig(1000, 4)
	if interval != 5*time.Millisecond {
		t.Fatalf("expected interval 5ms, got %v", interval)
	}
	if size < 1 {
		t.Fatalf("expected batch size >= 1, got %d", size)
	}
}

func TestComputeBatchConfig_LowRate(t *testing.T) {
	_, size := computeBatchConfig(1, 4)
	if size < 1 {
		t.Fatalf("expected batch size >= 1 for low rate, got %d", size)
	}
}

func TestWeightedPick_DeterministicSum(t *testing.T) {
	weights := []levelWeight{{"a", 100}, {"b", 0}}
	for i := 0; i < 100; i++ {
		result := weightedPick(weights)
		if result != "a" {
			t.Fatalf("expected always 'a' when b has weight 0, got %s", result)
		}
	}
}

func TestWeightedPick_Distribution(t *testing.T) {
	weights := []levelWeight{{"a", 70}, {"b", 30}}
	counts := map[string]int{}
	for i := 0; i < 1000; i++ {
		counts[weightedPick(weights)]++
	}
	if counts["a"] < 500 || counts["b"] < 100 {
		t.Fatalf("unexpected distribution: a=%d, b=%d", counts["a"], counts["b"])
	}
}

func TestRandomMessage_HasFields(t *testing.T) {
	for _, topic := range topics {
		msg := randomMessage(topic)
		if msg.ID == "" {
			t.Fatalf("expected ID for topic %s", topic)
		}
		if msg.Topic != topic {
			t.Fatalf("expected topic %s, got %s", topic, msg.Topic)
		}
		if msg.Level == "" {
			t.Fatalf("expected level for topic %s", topic)
		}
	}
}

func TestFillTemplate_AllTypes(t *testing.T) {
	tmpls := []msgTemplate{
		{"test", "string %s", []byte{'s'}},
		{"test", "int %d", []byte{'d'}},
		{"test", "float %.1f", []byte{'f'}},
	}
	for _, tmpl := range tmpls {
		_, msg := fillTemplate(tmpl)
		if msg == "" {
			t.Fatal("expected non-empty message")
		}
	}
}

func TestGenerateAlertJSON_Valid(t *testing.T) {
	data := generateAlertJSON()
	var msg AlertMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("invalid alert JSON: %v", err)
	}
	if msg.ID == "" {
		t.Fatal("expected non-empty alert ID")
	}
}

// -- AlertDispatcher routing tests --

func TestAlertDispatcher_Poll(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?transport=poll&rate=10", nil)

	AlertDispatcher(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	// Verify it returns a JSON array
	var alerts []AlertMessage
	if err := json.Unmarshal(w.Body.Bytes(), &alerts); err != nil {
		t.Fatalf("expected JSON array, got err: %v", err)
	}
	if len(alerts) == 0 {
		t.Fatal("expected at least 1 alert")
	}
}

func TestAlertDispatcher_PollMinRate(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/alerts?transport=poll&rate=1", nil)

	AlertDispatcher(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var alerts []AlertMessage
	json.Unmarshal(w.Body.Bytes(), &alerts)
	if len(alerts) < 10 {
		t.Fatalf("expected at least 10 alerts for min rate, got %d", len(alerts))
	}
}
