package llm

import (
	"context"
	"errors"
	"sync"
	"time"
)

// ErrAllHandlersFailed 表示降级链上的全部处理器都失败了。
var ErrAllHandlersFailed = errors.New("llm: 降级链上的全部处理器均失败")

// CircuitState 是熔断器状态。
type CircuitState string

// 熔断器三态。
const (
	CircuitClosed   CircuitState = "closed"
	CircuitOpen     CircuitState = "open"
	CircuitHalfOpen CircuitState = "half-open"
)

// CircuitBreaker 是连续失败计数型熔断器：
// 连续失败达到 threshold 次后打开，openDuration 后进入 half-open 允许一次探测，
// 探测成功即闭合，失败则重新计时。
type CircuitBreaker struct {
	threshold    int
	openDuration time.Duration

	mu            sync.Mutex
	failures      int
	state         CircuitState
	openedAt      time.Time
	lastErr       error
	onStateChange func(from, to CircuitState)
}

// NewCircuitBreaker 创建熔断器；threshold<=0 时取 5，openDuration<=0 时取 30s。
func NewCircuitBreaker(threshold int, openDuration time.Duration) *CircuitBreaker {
	if threshold <= 0 {
		threshold = 5
	}
	if openDuration <= 0 {
		openDuration = 30 * time.Second
	}
	return &CircuitBreaker{threshold: threshold, openDuration: openDuration, state: CircuitClosed}
}

// OnStateChange 注册状态变更回调。
func (b *CircuitBreaker) OnStateChange(fn func(from, to CircuitState)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.onStateChange = fn
}

// State 返回当前状态（会自动把已超时的 open 推进到 half-open）。
func (b *CircuitBreaker) State() CircuitState {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.state == CircuitOpen && time.Since(b.openedAt) >= b.openDuration {
		b.transitionLocked(CircuitHalfOpen)
	}
	return b.state
}

// Allow 判断是否允许发起请求。
func (b *CircuitBreaker) Allow() bool {
	st := b.State()
	// half-open 只允许一个探测请求通过
	if st == CircuitHalfOpen {
		b.mu.Lock()
		defer b.mu.Unlock()
		if b.state == CircuitHalfOpen {
			b.state = CircuitOpen
			b.openedAt = time.Now()
			return true
		}
		return false
	}
	return st == CircuitClosed
}

// RecordSuccess 记录一次成功，闭合熔断器。
func (b *CircuitBreaker) RecordSuccess() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures = 0
	b.lastErr = nil
	if b.state != CircuitClosed {
		b.transitionLocked(CircuitClosed)
	}
}

// RecordFailure 记录一次失败；达到阈值则打开熔断器。
func (b *CircuitBreaker) RecordFailure(err error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures++
	b.lastErr = err
	if b.failures >= b.threshold && b.state != CircuitOpen {
		b.openedAt = time.Now()
		b.transitionLocked(CircuitOpen)
	}
}

// transitionLocked 执行状态迁移并触发回调；调用方需持有锁。
func (b *CircuitBreaker) transitionLocked(to CircuitState) {
	from := b.state
	b.state = to
	if fn := b.onStateChange; fn != nil && from != to {
		fn(from, to)
	}
}

// Call 在熔断器保护下执行 fn；熔断打开时直接走 fallback（若为 nil 则返回错误）。
func (b *CircuitBreaker) Call(fn func() error, fallback func() error) error {
	if !b.Allow() {
		if fallback != nil {
			return fallback()
		}
		return errors.New("llm: 熔断器已打开，请求被拒绝")
	}
	if err := fn(); err != nil {
		b.RecordFailure(err)
		if fallback != nil {
			return fallback()
		}
		return err
	}
	b.RecordSuccess()
	return nil
}

// FallbackChain 按序尝试一组候选，全部失败时返回 ErrAllHandlersFailed。
// 典型用法：[主模型, 便宜模型, 缓存/离线模型]。
type FallbackChain struct {
	name     string
	handlers []func(ctx context.Context) (*Response, error)
}

// NewFallbackChain 创建一条降级链。
func NewFallbackChain(name string) *FallbackChain {
	return &FallbackChain{name: name}
}

// Add 追加一个候选处理器。
func (c *FallbackChain) Add(handler func(ctx context.Context) (*Response, error)) *FallbackChain {
	if handler != nil {
		c.handlers = append(c.handlers, handler)
	}
	return c
}

// Execute 按序执行；返回首个成功的响应。
func (c *FallbackChain) Execute(ctx context.Context) (*Response, error) {
	var errs []error
	for _, h := range c.handlers {
		resp, err := h(ctx)
		if err == nil && resp != nil {
			return resp, nil
		}
		if err != nil {
			errs = append(errs, err)
		}
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
	}
	if len(errs) == 0 {
		return nil, ErrAllHandlersFailed
	}
	return nil, errors.Join(append([]error{ErrAllHandlersFailed}, errs...)...)
}

// ExecuteWithFallback 在主 provider 不可用时自动切到兜底 provider。
// 典型场景：主模型限流/超时 → 便宜模型 → 离线降级。
func (r *Registry) ExecuteWithFallback(ctx context.Context, req Request) (*Response, error) {
	chain := NewFallbackChain("chat")

	primary, ok := r.Resolve(req.Model)
	if ok && isUsable(primary) {
		p := primary
		chain.Add(func(ctx context.Context) (*Response, error) { return p.Chat(ctx, req) })
	}
	if fb, ok := r.Fallback(); ok && isUsable(fb) {
		fbReq := req
		if models := fb.Models(); len(models) > 0 {
			fbReq.Model = models[0].ID
		}
		chain.Add(func(ctx context.Context) (*Response, error) { return fb.Chat(ctx, fbReq) })
	}
	// 最后兜底：离线降级 provider，保证服务永远有响应（响应中会标记降级原因）
	chain.Add(func(ctx context.Context) (*Response, error) {
		return Offline().Chat(ctx, req)
	})

	return chain.Execute(ctx)
}

// TokenEstimate 是对文本 token 数的启发式估算（真实值以 API 返回的 usage 为准）。
// 经验值：拉丁文本约 4 字符/token，CJK 约 1.5 字符/token。
func TokenEstimate(text string) int {
	if text == "" {
		return 0
	}
	cjk, other := 0, 0
	for _, r := range text {
		if r >= 0x4E00 && r <= 0x9FFF || r >= 0x3400 && r <= 0x4DBF || r >= 0xF900 && r <= 0xFAFF {
			cjk++
		} else {
			other++
		}
	}
	return cjk/3*2 + other/4 + 1
}

// EstimateMessagesTokens 估算一组消息的 token 数（含角色与分隔开销）。
func EstimateMessagesTokens(messages []Message) int {
	total := 0
	for _, m := range messages {
		total += TokenEstimate(m.Content) + 4
	}
	return total
}
