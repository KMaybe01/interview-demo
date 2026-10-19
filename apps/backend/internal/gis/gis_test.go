package gis

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetGISPoints_DefaultCount(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/gis/points", nil)

	GISPoints(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]any
	readBody(t, w, &body)
	count := int(body["count"].(float64))
	if count != 100000 {
		t.Fatalf("expected 100000 points by default, got %d", count)
	}
}

func TestGetGISPoints_CustomCount(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/gis/points?count=10", nil)

	GISPoints(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]any
	readBody(t, w, &body)
	count := int(body["count"].(float64))
	if count != 10 {
		t.Fatalf("expected 10 points, got %d", count)
	}
}

func TestGetGISPoints_ExceedsLimit(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/gis/points?count=600000", nil)

	GISPoints(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]any
	readBody(t, w, &body)
	count := int(body["count"].(float64))
	if count != 100000 {
		t.Fatalf("expected 100000 (fallback) when count exceeds limit, got %d", count)
	}
}

func TestGetGISPoints_InvalidCount(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/gis/points?count=abc", nil)

	GISPoints(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]any
	readBody(t, w, &body)
	count := int(body["count"].(float64))
	if count != 100000 {
		t.Fatalf("expected 100000 (fallback) for invalid count, got %d", count)
	}
}

func TestGetGISPoints_NegativeCount(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/gis/points?count=-5", nil)

	GISPoints(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]any
	readBody(t, w, &body)
	count := int(body["count"].(float64))
	if count != 100000 {
		t.Fatalf("expected 100000 (fallback) for negative count, got %d", count)
	}
}
