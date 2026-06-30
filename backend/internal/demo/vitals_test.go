package demo

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func vitalsReset() {
	vitalsMu.Lock()
	vitalsStore = nil
	pageMu.Lock()
	pageStore = nil
	pageMu.Unlock()
	vitalsMu.Unlock()
}

func TestReportVitals_Success(t *testing.T) {
	vitalsReset()
	body := `[
		{"metric": "LCP", "value": 2500.5, "rating": "needs-improvement", "url": "/", "version": "web-vitals"},
		{"metric": "CLS", "value": 0.1, "rating": "good", "url": "/", "version": "web-vitals"}
	]`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/vitals/report",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ReportVitals(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["ok"].(bool) != true {
		t.Fatal("expected ok=true")
	}
	if resp["count"].(float64) != 2 {
		t.Fatalf("expected count=2, got %v", resp["count"])
	}
}

func TestReportVitals_InvalidBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/vitals/report",
		strings.NewReader(`not-json`))
	c.Request.Header.Set("Content-Type", "application/json")

	ReportVitals(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestGetVitalsSummary_Empty(t *testing.T) {
	vitalsReset()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/vitals/summary", nil)

	GetVitalsSummary(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp []any
	readBody(t, w, &resp)
	if len(resp) != 0 {
		t.Fatalf("expected empty summary, got %d items", len(resp))
	}
}

func TestGetVitalsSummary_WithData(t *testing.T) {
	vitalsReset()
	// Insert data
	vitalsMu.Lock()
	vitalsStore = append(vitalsStore, VitalsRecord{Metric: "LCP", Value: 2000, Rating: "good", URL: "/"})
	vitalsStore = append(vitalsStore, VitalsRecord{Metric: "LCP", Value: 3000, Rating: "needs-improvement", URL: "/"})
	vitalsStore = append(vitalsStore, VitalsRecord{Metric: "CLS", Value: 0.05, Rating: "good", URL: "/"})
	vitalsMu.Unlock()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/vitals/summary", nil)

	GetVitalsSummary(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp []any
	readBody(t, w, &resp)
	if len(resp) != 2 {
		t.Fatalf("expected 2 metric summaries, got %d", len(resp))
	}
}

func TestGetVitalsHistory(t *testing.T) {
	vitalsReset()
	vitalsMu.Lock()
	vitalsStore = append(vitalsStore, VitalsRecord{Metric: "LCP", Value: 2000, Rating: "good", URL: "/"})
	vitalsMu.Unlock()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/vitals/history", nil)

	GetVitalsHistory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if len(resp) != 1 {
		t.Fatalf("expected 1 metrics group, got %d", len(resp))
	}
}

// -- Page Reports --

func TestReportPage_Success(t *testing.T) {
	vitalsReset()
	body := `[
		{"path": "/", "pageName": "Dashboard", "renderDuration": 120.5, "lcp": 2000, "inp": 100, "cls": 0.05, "referrer": ""}
	]`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/vitals/page-report",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ReportPage(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["ok"].(bool) != true {
		t.Fatal("expected ok=true")
	}
}

func TestReportPage_InvalidBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/vitals/page-report",
		strings.NewReader(`not-json`))
	c.Request.Header.Set("Content-Type", "application/json")

	ReportPage(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestGetPageSummary_Empty(t *testing.T) {
	pageMu.Lock()
	pageStore = nil
	pageMu.Unlock()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/vitals/pages", nil)

	GetPageSummary(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp []any
	readBody(t, w, &resp)
	if len(resp) != 0 {
		t.Fatalf("expected empty page summary, got %d items", len(resp))
	}
}

func TestGetPageSummary_WithData(t *testing.T) {
	pageMu.Lock()
	pageStore = []PageRecord{
		{Path: "/", PageName: "Dashboard", RenderDuration: 100, LCP: 2000, INP: 50, CLS: 0.1},
		{Path: "/", PageName: "Dashboard", RenderDuration: 200, LCP: 3000, INP: 100, CLS: 0.2},
	}
	pageMu.Unlock()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/vitals/pages", nil)

	GetPageSummary(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp []any
	readBody(t, w, &resp)
	if len(resp) != 1 {
		t.Fatalf("expected 1 page summary, got %d", len(resp))
	}
	s := resp[0].(map[string]any)
	if s["visits"].(float64) != 2 {
		t.Fatalf("expected 2 visits, got %v", s["visits"])
	}
	if s["avgRenderMs"].(float64) != 150 {
		t.Fatalf("expected avgRenderMs=150, got %v", s["avgRenderMs"])
	}
}

func TestGetPageHistory(t *testing.T) {
	pageMu.Lock()
	pageStore = []PageRecord{
		{Path: "/", PageName: "Dashboard", RenderDuration: 100},
		{Path: "/login", PageName: "Login", RenderDuration: 50},
	}
	pageMu.Unlock()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/vitals/page-history", nil)

	GetPageHistory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if len(resp) != 2 {
		t.Fatalf("expected 2 page groups, got %d", len(resp))
	}
}
