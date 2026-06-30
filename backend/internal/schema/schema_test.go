package schema

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestValidateSchema_Valid(t *testing.T) {
	body := `{
		"schema": {
			"type": "object",
			"properties": {
				"name": { "type": "string", "title": "名称" },
				"age": { "type": "number", "title": "年龄" }
			}
		},
		"data": {
			"name": "test",
			"age": 25
		}
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != true {
		t.Fatal("expected valid=true")
	}
}

func TestValidateSchema_RequiredFieldMissing(t *testing.T) {
	body := `{
		"schema": {
			"type": "object",
			"properties": {
				"name": { "type": "string", "title": "名称", "required": true }
			}
		},
		"data": {}
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false")
	}
	errs := resp["errors"].([]any)
	if len(errs) != 1 {
		t.Fatalf("expected 1 error, got %d", len(errs))
	}
}

func TestValidateSchema_InvalidBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(`not-json`))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestValidateSchema_StringMinLength(t *testing.T) {
	body := `{
		"schema": {
			"type": "object",
			"properties": {
				"code": { "type": "string", "minLength": 5 }
			}
		},
		"data": { "code": "ab" }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false")
	}
}

func TestValidateSchema_NumberRange(t *testing.T) {
	body := `{
		"schema": {
			"type": "object",
			"properties": {
				"port": { "type": "number", "min": 1024, "max": 65535 }
			}
		},
		"data": { "port": 80 }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false")
	}
}

func TestValidateSchema_NestedObject(t *testing.T) {
	body := `{
		"schema": {
			"type": "object",
			"properties": {
				"config": {
					"type": "object",
					"properties": {
						"host": { "type": "string", "title": "主机", "required": true }
					}
				}
			}
		},
		"data": { "config": {} }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false for nested required field")
	}
}

func TestValidateSchema_Business_IPAddress(t *testing.T) {
	body := `{
		"schema": {"type": "object", "properties": {}},
		"data": { "ipAddress": "999.999.999.999" }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false for invalid IP")
	}
}

func TestValidateSchema_Business_CellID(t *testing.T) {
	body := `{
		"schema": {"type": "object", "properties": {}},
		"data": { "cellId": "invalid-id" }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false for invalid cellId")
	}
}

func TestValidateSchema_Business_MCCMNC(t *testing.T) {
	body := `{
		"schema": {"type": "object", "properties": {}},
		"data": { "mcc": "999", "mnc": "001" }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false for invalid MCC")
	}
}

func TestValidateSchema_Business_Bandwidth(t *testing.T) {
	body := `{
		"schema": {"type": "object", "properties": {}},
		"data": { "bandwidth": 7 }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false for non-standard bandwidth")
	}
}

func TestValidateSchema_Business_PortByType(t *testing.T) {
	body := `{
		"schema": {"type": "object", "properties": {}},
		"data": { "cellType": "macro", "port": 1024 }
	}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/schema/validate",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ValidateSchema(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["valid"].(bool) != false {
		t.Fatal("expected valid=false for macro with port < 2048")
	}
}
