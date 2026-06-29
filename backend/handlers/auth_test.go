package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func testAccessToken(t *testing.T, sub, nonce string) string {
	t.Helper()
	s, err := createToken(sub, 5*time.Second, nonce)
	if err != nil {
		t.Fatalf("createToken: %v", err)
	}
	return s
}

func testRefreshToken(t *testing.T, sub, nonce string) string {
	t.Helper()
	s, err := createRefreshToken(sub, nonce, 5*time.Second)
	if err != nil {
		t.Fatalf("createRefreshToken: %v", err)
	}
	return s
}

func readBody(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
}

// -- Login --

func TestLogin_Success(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/login",
		strings.NewReader(`{"username":"admin","password":"admin123"}`))
	c.Request.Header.Set("Content-Type", "application/json")

	Login(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp TokenResponse
	readBody(t, w, &resp)
	if resp.AccessToken == "" {
		t.Fatal("access_token is empty")
	}
	if resp.RefreshToken == "" {
		t.Fatal("refresh_token is empty")
	}
	if resp.ExpiresIn != 900 {
		t.Fatalf("expected expires_in 900, got %d", resp.ExpiresIn)
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/login",
		strings.NewReader(`{"username":"admin","password":"wrong"}`))
	c.Request.Header.Set("Content-Type", "application/json")

	Login(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestLogin_MissingBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/login",
		strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")

	Login(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// -- RefreshToken --

func TestRefreshToken_Success(t *testing.T) {
	nonce := "test-nonce-1"
	rt := testRefreshToken(t, "user_001", nonce)
	activeSessions.Store("user_001", nonce)
	t.Cleanup(func() { activeSessions.Delete("user_001") })

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh",
		strings.NewReader(`{"refresh_token":"`+rt+`"}`))
	c.Request.Header.Set("Content-Type", "application/json")

	RefreshToken(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		Rotation     bool   `json:"rotation"`
	}
	readBody(t, w, &resp)
	if resp.AccessToken == "" {
		t.Fatal("access_token is empty")
	}
	if resp.RefreshToken == "" {
		t.Fatal("refresh_token is empty")
	}
	if !resp.Rotation {
		t.Fatal("expected rotation=true")
	}
}

func TestRefreshToken_Replay(t *testing.T) {
	nonce := "test-nonce-replay"
	rt := testRefreshToken(t, "user_002", nonce)
	activeSessions.Store("user_002", nonce)
	t.Cleanup(func() { activeSessions.Delete("user_002") })

	// First use – should succeed
	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh",
		strings.NewReader(`{"refresh_token":"`+rt+`"}`))
	c1.Request.Header.Set("Content-Type", "application/json")
	RefreshToken(c1)
	if w1.Code != http.StatusOK {
		t.Fatalf("first refresh expected 200, got %d", w1.Code)
	}

	// Second use with same token – should fail (replay)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh",
		strings.NewReader(`{"refresh_token":"`+rt+`"}`))
	c2.Request.Header.Set("Content-Type", "application/json")
	RefreshToken(c2)

	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for replay, got %d: %s", w2.Code, w2.Body.String())
	}
	var body map[string]any
	readBody(t, w2, &body)
	if code, _ := body["code"].(string); code != "TOKEN_REUSED" {
		t.Fatalf("expected code TOKEN_REUSED, got %q", code)
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh",
		strings.NewReader(`{"refresh_token":"not-a-valid-jwt"}`))
	c.Request.Header.Set("Content-Type", "application/json")

	RefreshToken(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRefreshToken_SessionReplaced(t *testing.T) {
	nonce := "test-nonce-old"
	rt := testRefreshToken(t, "user_003", nonce)
	// Simulate new login: store a DIFFERENT nonce
	activeSessions.Store("user_003", "test-nonce-new")
	t.Cleanup(func() { activeSessions.Delete("user_003") })

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh",
		strings.NewReader(`{"refresh_token":"`+rt+`"}`))
	c.Request.Header.Set("Content-Type", "application/json")

	RefreshToken(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]any
	readBody(t, w, &body)
	if code, _ := body["code"].(string); code != "SESSION_REPLACED" {
		t.Fatalf("expected code SESSION_REPLACED, got %q", code)
	}
}

func TestRefreshToken_MissingBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh",
		strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")

	RefreshToken(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// -- CheckToken --

func TestCheckToken_Valid(t *testing.T) {
	at := testAccessToken(t, "user_check", "")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/auth/check", nil)
	c.Request.Header.Set("Authorization", "Bearer "+at)

	CheckToken(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]any
	readBody(t, w, &body)
	if v, _ := body["valid"].(bool); !v {
		t.Fatal("expected valid=true")
	}
}

func TestCheckToken_MissingHeader(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/auth/check", nil)

	CheckToken(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCheckToken_InvalidToken(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/auth/check", nil)
	c.Request.Header.Set("Authorization", "Bearer bad-token")

	CheckToken(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// -- GetUsedTokenCount --

func TestGetUsedTokenCount(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/auth/used-tokens", nil)

	GetUsedTokenCount(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]any
	readBody(t, w, &body)
	_, ok := body["count"]
	if !ok {
		t.Fatal("expected count field")
	}
}

// -- AuthMiddleware --

func TestAuthMiddleware_ValidToken(t *testing.T) {
	nonce := "test-mw-valid"
	activeSessions.Store("user_mw", nonce)
	t.Cleanup(func() { activeSessions.Delete("user_mw") })

	at := testAccessToken(t, "user_mw", nonce)

	mw := AuthMiddleware()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/test", nil)
	c.Request.Header.Set("Authorization", "Bearer "+at)
	mw(c)

	if c.IsAborted() {
		t.Fatal("expected context NOT to be aborted for valid token")
	}
	sub, exists := c.Get("sub")
	if !exists {
		t.Fatal("expected 'sub' to be set in context")
	}
	if sub != "user_mw" {
		t.Fatalf("expected sub 'user_mw', got %v", sub)
	}
}

func TestAuthMiddleware_MissingHeader(t *testing.T) {
	mw := AuthMiddleware()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/test", nil)

	mw(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
	// Verify context was aborted
	if c.IsAborted() == false {
		t.Fatal("expected context to be aborted")
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	mw := AuthMiddleware()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/test", nil)
	c.Request.Header.Set("Authorization", "Bearer bad-token")

	mw(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
	if c.IsAborted() == false {
		t.Fatal("expected context to be aborted")
	}
}

func TestAuthMiddleware_SessionReplaced(t *testing.T) {
	nonce := "test-mw-old"
	at := testAccessToken(t, "user_mw_replaced", nonce)
	// Store a DIFFERENT nonce (simulating new login)
	activeSessions.Store("user_mw_replaced", "test-mw-new")
	t.Cleanup(func() { activeSessions.Delete("user_mw_replaced") })

	mw := AuthMiddleware()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/test", nil)
	c.Request.Header.Set("Authorization", "Bearer "+at)

	mw(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]any
	readBody(t, w, &body)
	if code, _ := body["code"].(string); code != "SESSION_REPLACED" {
		t.Fatalf("expected code SESSION_REPLACED, got %q", code)
	}
	if c.IsAborted() == false {
		t.Fatal("expected context to be aborted")
	}
}

func TestAuthMiddleware_NoSessionRecord(t *testing.T) {
	// No activeSessions entry for this user — should pass through
	at := testAccessToken(t, "user_unknown", "some-nonce")

	mw := AuthMiddleware()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/test", nil)
	c.Request.Header.Set("Authorization", "Bearer "+at)

	mw(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 (pass through), got %d: %s", w.Code, w.Body.String())
	}
	if c.IsAborted() {
		t.Fatal("expected context NOT to be aborted")
	}
}
