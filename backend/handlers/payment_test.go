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

// Helper function to reset global maps before tests
func resetPaymentGlobalState() {
	mu.Lock()
	defer mu.Unlock()
	paymentOrders = make(map[string]*PaymentOrder)
	idempotentCache = make(map[string]*PaymentOrder)
	orderCounter = 0
}

func parseJSONBody(t *testing.T, w *httptest.ResponseRecorder, target any) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), target); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
}

func TestIdempotencyTest(t *testing.T) {
	resetPaymentGlobalState()
	gin.SetMode(gin.TestMode)

	t.Run("First Request", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		body := `{"key": "idemp-key-1", "orderNo": "ORD-IDEMP", "amount": 500}`
		req := httptest.NewRequest(http.MethodPost, "/api/payments/idempotency", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		c.Request = req

		IdempotencyTest(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}
		var resp map[string]any
		parseJSONBody(t, w, &resp)
		if resp["cached"] != false {
			t.Errorf("expected cached=false on first request")
		}
	})

	t.Run("Duplicate Request", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		body := `{"key": "idemp-key-1", "orderNo": "ORD-IDEMP", "amount": 500}`
		req := httptest.NewRequest(http.MethodPost, "/api/payments/idempotency", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		c.Request = req

		IdempotencyTest(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}
		var resp map[string]any
		parseJSONBody(t, w, &resp)
		if resp["cached"] != true {
			t.Errorf("expected cached=true on duplicate request")
		}
	})

	t.Run("Invalid Body", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req := httptest.NewRequest(http.MethodPost, "/api/payments/idempotency", strings.NewReader(`{invalid}`))
		req.Header.Set("Content-Type", "application/json")
		c.Request = req

		IdempotencyTest(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})
}

func TestSecurityCheck(t *testing.T) {
	resetPaymentGlobalState()
	gin.SetMode(gin.TestMode)

	mu.Lock()
	paymentOrders["ORD-SEC"] = &PaymentOrder{
		OrderNo: "ORD-SEC",
		Amount:  1000,
	}
	mu.Unlock()

	tests := []struct {
		name           string
		body           string
		expectedStatus int
		expectPassed   bool
	}{
		{
			name:           "All Checks Pass",
			body:           `{"orderNo": "ORD-SEC", "amount": 1000, "ip": "127.0.0.1", "sign": "sign_ORD-SEC_1000"}`,
			expectedStatus: http.StatusOK,
			expectPassed:   true,
		},
		{
			name:           "Invalid IP",
			body:           `{"orderNo": "ORD-SEC", "amount": 1000, "ip": "192.168.1.1", "sign": "sign_ORD-SEC_1000"}`,
			expectedStatus: http.StatusOK,
			expectPassed:   false,
		},
		{
			name:           "Invalid Amount",
			body:           `{"orderNo": "ORD-SEC", "amount": 999, "ip": "127.0.0.1", "sign": "sign_ORD-SEC_999"}`,
			expectedStatus: http.StatusOK,
			expectPassed:   false,
		},
		{
			name:           "Invalid Sign",
			body:           `{"orderNo": "ORD-SEC", "amount": 1000, "ip": "127.0.0.1", "sign": "wrong_sign"}`,
			expectedStatus: http.StatusOK,
			expectPassed:   false,
		},
		{
			name:           "Invalid Body",
			body:           `{invalid}`,
			expectedStatus: http.StatusBadRequest,
			expectPassed:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/api/payments/security-check", strings.NewReader(tt.body))
			c.Request.Header.Set("Content-Type", "application/json")

			SecurityCheck(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
			if w.Code == http.StatusOK {
				var resp map[string]any
				parseJSONBody(t, w, &resp)
				if resp["passed"] != tt.expectPassed {
					t.Errorf("expected passed=%v, got %v", tt.expectPassed, resp["passed"])
				}
			}
		})
	}
}

func TestRetryDemo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		body           string
		expectedStatus int
	}{
		{
			name:           "Default Retries",
			body:           `{}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Custom Retries",
			body:           `{"maxRetries": 5}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid Body",
			body:           `{invalid}`,
			expectedStatus: http.StatusOK, // Fallbacks to 3 retries
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/api/payments/retry", strings.NewReader(tt.body))
			c.Request.Header.Set("Content-Type", "application/json")

			RetryDemo(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
			if w.Code == http.StatusOK {
				var resp map[string]any
				parseJSONBody(t, w, &resp)
				logs, ok := resp["logs"].([]any)
				if !ok || len(logs) == 0 {
					t.Errorf("expected logs array with elements")
				}
			}
		})
	}
}

func TestGetOrderAndListOrders(t *testing.T) {
	resetPaymentGlobalState()
	gin.SetMode(gin.TestMode)

	// Pre-populate some orders
	mu.Lock()
	paymentOrders["order-1"] = &PaymentOrder{
		ID:        "order-1",
		OrderNo:   "ORD-1",
		Status:    StatusPending,
		CreatedAt: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
	}
	paymentOrders["order-2"] = &PaymentOrder{
		ID:        "order-2",
		OrderNo:   "ORD-2",
		Status:    StatusSuccess,
		CreatedAt: time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC), // Newer
	}
	mu.Unlock()

	t.Run("GetOrder Success", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "order-1"}}
		c.Request = httptest.NewRequest(http.MethodGet, "/api/payments/order-1", nil)

		GetOrder(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}
		var resp map[string]any
		parseJSONBody(t, w, &resp)
		order := resp["order"].(map[string]any)
		if order["id"] != "order-1" {
			t.Errorf("expected order-1, got %v", order["id"])
		}
	})

	t.Run("GetOrder Not Found", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "order-999"}}
		c.Request = httptest.NewRequest(http.MethodGet, "/api/payments/order-999", nil)

		GetOrder(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", w.Code)
		}
	})

	t.Run("ListOrders", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/payments", nil)

		ListOrders(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}
		var resp map[string]any
		parseJSONBody(t, w, &resp)
		orders := resp["orders"].([]any)
		if len(orders) != 2 {
			t.Errorf("expected 2 orders, got %d", len(orders))
		}
		// Check sorting: newest first (order-2 should be first)
		firstOrder := orders[0].(map[string]any)
		if firstOrder["id"] != "order-2" {
			t.Errorf("expected order-2 first, got %v", firstOrder["id"])
		}
	})
}

func TestTransitionPayment(t *testing.T) {
	resetPaymentGlobalState()
	gin.SetMode(gin.TestMode)

	mu.Lock()
	paymentOrders["order-1"] = &PaymentOrder{
		ID:      "order-1",
		OrderNo: "ORD-1",
		Status:  StatusPending,
	}
	mu.Unlock()

	tests := []struct {
		name           string
		orderID        string
		body           string
		expectedStatus int
	}{
		{
			name:           "Valid Transition",
			orderID:        "order-1",
			body:           `{"status": "PROCESSING"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid Transition",
			orderID:        "order-1",
			body:           `{"status": "REFUNDED"}`,
			expectedStatus: http.StatusBadRequest, // from PROCESSING to REFUNDED is invalid
		},
		{
			name:           "Not Found",
			orderID:        "order-999",
			body:           `{"status": "PROCESSING"}`,
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "Invalid Body",
			orderID:        "order-1",
			body:           `{invalid}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Params = gin.Params{{Key: "id", Value: tt.orderID}}
			c.Request = httptest.NewRequest(http.MethodPost, "/api/payments/"+tt.orderID+"/transition", strings.NewReader(tt.body))
			c.Request.Header.Set("Content-Type", "application/json")

			TransitionPayment(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestCreatePayment(t *testing.T) {
	resetPaymentGlobalState()
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		body           string
		expectedStatus int
		checkResponse  func(t *testing.T, w *httptest.ResponseRecorder)
	}{
		{
			name:           "Valid Payment Creation",
			body:           `{"channel": "wechat", "amount": 100}`,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var resp map[string]any
				parseJSONBody(t, w, &resp)
				if resp["cached"] != false {
					t.Errorf("expected cached=false, got %v", resp["cached"])
				}
				order, ok := resp["order"].(map[string]any)
				if !ok {
					t.Fatalf("expected order object")
				}
				if order["status"] != string(StatusPending) {
					t.Errorf("expected status PENDING, got %v", order["status"])
				}
			},
		},
		{
			name:           "Invalid Body",
			body:           `{invalid}`,
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var resp map[string]any
				parseJSONBody(t, w, &resp)
				if resp["error"] != "参数错误" {
					t.Errorf("expected error '参数错误', got %v", resp["error"])
				}
			},
		},
		{
			name:           "Idempotent Payment Creation",
			body:           `{"channel": "wechat", "amount": 100, "idempotencyKey": "test-key-1"}`,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				// The first request caches it. We will make a second request manually below.
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			req := httptest.NewRequest(http.MethodPost, "/api/payments", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			CreatePayment(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}

	t.Run("Test Idempotency Second Request", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		body := `{"channel": "wechat", "amount": 100, "idempotencyKey": "test-key-1"}`
		req := httptest.NewRequest(http.MethodPost, "/api/payments", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		c.Request = req

		CreatePayment(c)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		var resp map[string]any
		parseJSONBody(t, w, &resp)
		if resp["cached"] != true {
			t.Errorf("expected cached=true, got %v", resp["cached"])
		}
	})
}

func TestProcessPayment(t *testing.T) {
	resetPaymentGlobalState()
	gin.SetMode(gin.TestMode)

	// Pre-populate some orders
	mu.Lock()
	paymentOrders["order-1"] = &PaymentOrder{
		ID:      "order-1",
		OrderNo: "ORD-1",
		Status:  StatusPending,
		Amount:  100,
	}
	paymentOrders["order-2"] = &PaymentOrder{
		ID:      "order-2",
		OrderNo: "ORD-2",
		Status:  StatusSuccess, // Not pending
		Amount:  200,
	}
	mu.Unlock()

	tests := []struct {
		name           string
		orderID        string
		expectedStatus int
		checkResponse  func(t *testing.T, w *httptest.ResponseRecorder)
	}{
		{
			name:           "Not Found",
			orderID:        "order-999",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "Invalid State",
			orderID:        "order-2",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Success Processing",
			orderID:        "order-1",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var resp map[string]any
				parseJSONBody(t, w, &resp)
				order, ok := resp["order"].(map[string]any)
				if !ok {
					t.Fatalf("expected order object")
				}
				status := order["status"].(string)
				if status != string(StatusSuccess) && status != string(StatusFail) {
					t.Errorf("expected SUCCESS or FAIL, got %v", status)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Params = gin.Params{{Key: "id", Value: tt.orderID}}
			req := httptest.NewRequest(http.MethodPost, "/api/payments/"+tt.orderID+"/process", nil)
			c.Request = req

			ProcessPayment(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}
