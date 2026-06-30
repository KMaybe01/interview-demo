package gis

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func readBody(t *testing.T, w *httptest.ResponseRecorder, v interface{}) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
		t.Fatal(err)
	}
}
