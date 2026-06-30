package rbac

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCheckPermissions_Success(t *testing.T) {
	body := `{
		"roleCode": 7,
		"nodes": [
			{"key": "dashboard", "requiredPerms": [1]},
			{"key": "settings", "requiredPerms": [2]},
			{"key": "admin-panel", "requiredPerms": [4]}
		]
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/rbac/check",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckPermissions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if rc := resp["roleCode"].(float64); rc != 7 {
		t.Fatalf("expected roleCode 7, got %v", rc)
	}
	results := resp["results"].([]any)
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
}

func TestCheckPermissions_Denied(t *testing.T) {
	body := `{
		"roleCode": 1,
		"nodes": [
			{"key": "admin", "requiredPerms": [4]}
		]
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/rbac/check",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckPermissions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	results := resp["results"].([]any)
	result := results[0].(map[string]any)
	if result["accessible"].(bool) != false {
		t.Fatal("expected accessible=false when role lacks permission")
	}
}

func TestCheckPermissions_MultiplePerms(t *testing.T) {
	body := `{
		"roleCode": 3,
		"nodes": [
			{"key": "read-write", "requiredPerms": [1, 2]},
			{"key": "read-delete", "requiredPerms": [1, 4]}
		]
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/rbac/check",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckPermissions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	results := resp["results"].([]any)
	r0 := results[0].(map[string]any)
	if r0["accessible"].(bool) != true {
		t.Fatal("expected accessible=true for read+write with roleCode=3")
	}
	r1 := results[1].(map[string]any)
	if r1["accessible"].(bool) != false {
		t.Fatal("expected accessible=false for read+delete with roleCode=3")
	}
}

func TestCheckPermissions_SingleNode(t *testing.T) {
	body := `{"roleCode": 1, "nodes": [{"key": "read", "requiredPerms": [1]}]}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/rbac/check",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckPermissions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	results := resp["results"].([]any)
	r := results[0].(map[string]any)
	if r["accessible"].(bool) != true {
		t.Fatal("expected accessible=true")
	}
}

func TestCheckPermissions_MissingBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/rbac/check",
		strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckPermissions(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCheckPermissions_SuperAdmin(t *testing.T) {
	body := `{
		"roleCode": 63,
		"nodes": [
			{"key": "everything", "requiredPerms": [1, 2, 4, 8, 16, 32]}
		]
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/rbac/check",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckPermissions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	results := resp["results"].([]any)
	r := results[0].(map[string]any)
	if r["accessible"].(bool) != true {
		t.Fatal("expected accessible=true for super admin (63)")
	}
}
