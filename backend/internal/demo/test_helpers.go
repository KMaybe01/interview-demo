package demo

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func readBody(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
}
