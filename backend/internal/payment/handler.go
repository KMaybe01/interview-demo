package payment

import (
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type PaymentStatus string

const (
	StatusPending    PaymentStatus = "PENDING"
	StatusProcessing PaymentStatus = "PROCESSING"
	StatusSuccess    PaymentStatus = "SUCCESS"
	StatusFail       PaymentStatus = "FAIL"
	StatusRefunding  PaymentStatus = "REFUNDING"
	StatusRefunded   PaymentStatus = "REFUNDED"
	StatusClosed     PaymentStatus = "CLOSED"
)

type PaymentOrder struct {
	ID             string        `json:"id"`
	OrderNo        string        `json:"orderNo"`
	Channel        string        `json:"channel"`
	Amount         int64         `json:"amount"`
	Status         PaymentStatus `json:"status"`
	IdempotencyKey string        `json:"idempotencyKey"`
	Version        int           `json:"version"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

type PaymentRequest struct {
	OrderNo        string `json:"orderNo"`
	Channel        string `json:"channel"`
	Amount         int64  `json:"amount"`
	IdempotencyKey string `json:"idempotencyKey"`
}

type RetryDemoRequest struct {
	MaxRetries int `json:"maxRetries"`
}

type SecurityCheckRequest struct {
	OrderNo string `json:"orderNo"`
	Amount  int64  `json:"amount"`
	IP      string `json:"ip"`
	Sign    string `json:"sign"`
}

var (
	paymentOrders   = make(map[string]*PaymentOrder)
	idempotentCache = make(map[string]*PaymentOrder)
	mu              sync.RWMutex
	orderCounter    int
)

var allowedIPs = map[string]bool{
	"127.0.0.1": true,
	"::1":       true,
}

func generateOrderNo() string {
	orderCounter++
	return fmt.Sprintf("ORD%d%04d", time.Now().UnixMilli(), orderCounter)
}

func copyOrder(o *PaymentOrder) PaymentOrder {
	return *o
}

// CreatePayment  godoc
// @Summary     创建支付订单
// @Description 创建支付订单，支持幂等 Key 防止重复创建
// @Tags        支付
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       body body     PaymentRequest true "创建支付请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /payments/create [post]
func CreatePayment(c *gin.Context) {
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	// Idempotency-Key check
	if req.IdempotencyKey != "" {
		if cached, ok := idempotentCache[req.IdempotencyKey]; ok {
			c.JSON(http.StatusOK, gin.H{
				"cached":  true,
				"order":   cached,
				"message": "幂等 Key 已存在，返回缓存结果",
			})
			return
		}
	}

	if req.OrderNo == "" {
		req.OrderNo = generateOrderNo()
	}

	now := time.Now()
	order := &PaymentOrder{
		ID:             fmt.Sprintf("PAY%d", time.Now().UnixNano()),
		OrderNo:        req.OrderNo,
		Channel:        req.Channel,
		Amount:         req.Amount,
		Status:         StatusPending,
		IdempotencyKey: req.IdempotencyKey,
		Version:        1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	paymentOrders[order.ID] = order

	if req.IdempotencyKey != "" {
		idempotentCache[req.IdempotencyKey] = order
	}

	c.JSON(http.StatusOK, gin.H{
		"cached": false,
		"order":  order,
	})
}

// ProcessPayment  godoc
// @Summary     处理支付扣款
// @Description 执行支付扣款（模拟延迟），随机成功/失败
// @Tags        支付
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       id path string true "支付订单 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     400 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /payments/process/{id} [post]
func ProcessPayment(c *gin.Context) {
	orderID := c.Param("id")

	mu.Lock()
	order, ok := paymentOrders[orderID]
	if !ok {
		mu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}

	if order.Status != StatusPending {
		mu.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("当前状态不允许扣款: %s", order.Status)})
		return
	}

	order.Status = StatusProcessing
	order.Version++
	order.UpdatedAt = time.Now()

	// Simulate processing delay
	time.Sleep(time.Duration(500+rand.Intn(500)) * time.Millisecond)

	if rand.Float32() > 0.3 {
		order.Status = StatusSuccess
	} else {
		order.Status = StatusFail
	}
	order.Version++
	order.UpdatedAt = time.Now()
	respOrder := copyOrder(order)
	mu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"order": &respOrder,
	})
}

// GetOrder  godoc
// @Summary     查询订单
// @Description 根据 ID 查询支付订单详情
// @Tags        支付
// @Produce     json
// @Security    Bearer
// @Param       id path string true "订单 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /payments/order/{id} [get]
func GetOrder(c *gin.Context) {
	orderID := c.Param("id")

	mu.RLock()
	order, ok := paymentOrders[orderID]
	if !ok {
		mu.RUnlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}
	respOrder := copyOrder(order)
	mu.RUnlock()

	c.JSON(http.StatusOK, gin.H{"order": &respOrder})
}

// ListOrders  godoc
// @Summary     订单列表
// @Description 返回所有支付订单列表（按创建时间倒序）
// @Tags        支付
// @Produce     json
// @Security    Bearer
// @Success     200 {object} map[string]interface{}
// @Router      /payments/orders [get]
func ListOrders(c *gin.Context) {
	mu.RLock()
	orders := make([]PaymentOrder, 0, len(paymentOrders))
	for _, o := range paymentOrders {
		orders = append(orders, copyOrder(o))
	}
	mu.RUnlock()

	sort.Slice(orders, func(i, j int) bool {
		return orders[i].CreatedAt.After(orders[j].CreatedAt)
	})

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// TransitionPayment  godoc
// @Summary     订单状态转换
// @Description 按有限状态机规则转换订单（PENDING→PROCESSING→SUCCESS/FAIL→REFUNDING→REFUNDED）
// @Tags        支付
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       id   path string               true "订单 ID"
// @Param       body body  object{status=string} true "目标状态"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     404  {object} map[string]interface{}
// @Router      /payments/transition/{id} [post]
func TransitionPayment(c *gin.Context) {
	orderID := c.Param("id")
	var body struct {
		Status PaymentStatus `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	mu.Lock()
	order, ok := paymentOrders[orderID]
	if !ok {
		mu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}

	allowedTransitions := map[PaymentStatus][]PaymentStatus{
		StatusPending:    {StatusProcessing, StatusClosed},
		StatusProcessing: {StatusSuccess, StatusFail, StatusClosed},
		StatusSuccess:    {StatusRefunding},
		StatusRefunding:  {StatusRefunded, StatusFail},
		StatusRefunded:   {},
		StatusFail:       {},
		StatusClosed:     {},
	}

	allowed, ok := allowedTransitions[order.Status]
	if !ok {
		mu.Unlock()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "订单状态异常"})
		return
	}

	valid := false
	for _, s := range allowed {
		if s == body.Status {
			valid = true
			break
		}
	}

	if !valid {
		mu.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("非法状态转换: %s → %s", order.Status, body.Status),
		})
		return
	}

	order.Status = body.Status
	order.Version++
	order.UpdatedAt = time.Now()
	respOrder := copyOrder(order)
	mu.Unlock()

	c.JSON(http.StatusOK, gin.H{"order": &respOrder})
}

// IdempotencyTest  godoc
// @Summary     幂等性测试
// @Description 演示幂等 Key 机制：相同 Key 的重复请求返回缓存结果，不产生重复扣款
// @Tags        支付
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       body body     object{key=string,orderNo=string,amount=int} true "幂等请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /payments/idempotency-test [post]
func IdempotencyTest(c *gin.Context) {
	var req struct {
		Key     string `json:"key"`
		OrderNo string `json:"orderNo"`
		Amount  int64  `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	mu.Lock()
	cached, exists := idempotentCache[req.Key]
	if exists {
		respOrder := copyOrder(cached)
		mu.Unlock()
		c.JSON(http.StatusOK, gin.H{
			"cached":    true,
			"order":     &respOrder,
			"message":   "重复 Idempotency-Key，已返回缓存结果，未产生重复扣款",
			"duplicate": true,
		})
		return
	}

	now := time.Now()
	order := &PaymentOrder{
		ID:             fmt.Sprintf("PAY%d", time.Now().UnixNano()),
		OrderNo:        req.OrderNo,
		Channel:        "wechat",
		Amount:         req.Amount,
		Status:         StatusSuccess,
		IdempotencyKey: req.Key,
		Version:        1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	idempotentCache[req.Key] = order
	paymentOrders[order.ID] = order
	respOrder := copyOrder(order)
	mu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"cached":  false,
		"order":   &respOrder,
		"message": "首次请求，支付成功",
	})
}

// SecurityCheck  godoc
// @Summary     安全校验
// @Description 支付回调安全校验演示（IP 白名单、金额二次校验、签名校验）
// @Tags        支付
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       body body     SecurityCheckRequest true "安全校验请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /payments/security-check [post]
func SecurityCheck(c *gin.Context) {
	var req SecurityCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	mu.Lock()
	order, ok := paymentOrders[req.OrderNo]
	if !ok {
		// Search by orderNo
		for _, o := range paymentOrders {
			if o.OrderNo == req.OrderNo {
				order = o
				ok = true
				break
			}
		}
	}
	var orderAmount int64
	if ok {
		orderAmount = order.Amount
	}
	mu.Unlock()

	checks := make([]string, 0)
	passed := true

	if !allowedIPs[req.IP] {
		checks = append(checks, fmt.Sprintf("❌ IP 白名单校验: %s 不在允许列表", req.IP))
		passed = false
	} else {
		checks = append(checks, "✅ IP 白名单校验通过")
	}

	if ok && orderAmount != req.Amount {
		checks = append(checks, fmt.Sprintf("❌ 金额校验: 请求金额=%d, 订单金额=%d", req.Amount, order.Amount))
		passed = false
	} else if ok {
		checks = append(checks, "✅ 金额二次校验通过")
	}

	expectedSign := fmt.Sprintf("sign_%s_%d", req.OrderNo, req.Amount)
	if req.Sign != expectedSign {
		checks = append(checks, fmt.Sprintf("❌ 签名校验失败: 期望=%s, 实际=%s", expectedSign, req.Sign))
		passed = false
	} else {
		checks = append(checks, "✅ 签名校验通过")
	}

	if !passed {
		checks = append(checks, "⚠️ 回调已丢弃（默认拒绝原则）")
	}

	c.JSON(http.StatusOK, gin.H{
		"passed":  passed,
		"checks":  checks,
		"message": "安全检测完成",
	})
}

// RetryDemo  godoc
// @Summary     重试演示
// @Description 演示指数退避重试 + 随机抖动策略
// @Tags        支付
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       body body     RetryDemoRequest true "重试请求"
// @Success     200  {object} map[string]interface{}
// @Router      /payments/retry-demo [post]
func RetryDemo(c *gin.Context) {
	var req RetryDemoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.MaxRetries = 3
	} else if req.MaxRetries < 1 {
		req.MaxRetries = 3
	}

	logs := make([]string, 0)
	logs = append(logs, fmt.Sprintf("🚀 开始指数退避重试 (maxRetries=%d)", req.MaxRetries))

	for attempt := 1; attempt <= req.MaxRetries; attempt++ {
		delay := 1 << (attempt - 1)
		if delay > 8 {
			delay = 8
		}
		jitter := delay * (500 + rand.Intn(500)) / 1000
		time.Sleep(time.Duration(jitter) * time.Millisecond)

		if rand.Float32() > 0.4 {
			logs = append(logs, fmt.Sprintf("✅ 尝试 #%d 成功 (delay=%ds, jitter=%dms)", attempt, delay, jitter))
			break
		}

		if attempt < req.MaxRetries {
			logs = append(logs, fmt.Sprintf("❌ 尝试 #%d 失败, 进行下一次重试 (delay=%ds, jitter=%dms)", attempt, delay, jitter))
		} else {
			logs = append(logs, fmt.Sprintf("❌ 尝试 #%d 失败, 已达最大重试次数, 通知人工介入", attempt))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":    logs,
		"message": "重试演示完成",
	})
}
