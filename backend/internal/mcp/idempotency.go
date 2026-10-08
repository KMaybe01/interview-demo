package mcp

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

// inputResponsesKey 是 MRTR 输入在 context 中的私有 key。
type inputResponsesKey struct{}

// withInputResponses 把客户端补齐的 MRTR 输入放进 ctx。
func withInputResponses(ctx context.Context, responses []InputResponse) context.Context {
	return context.WithValue(ctx, inputResponsesKey{}, responses)
}

// InputResponsesFrom 从 ctx 取出客户端补齐的 MRTR 输入。
// 返回 false 表示本次是首次调用（provider 应返回 input_required）。
func InputResponsesFrom(ctx context.Context) ([]InputResponse, bool) {
	if ctx == nil {
		return nil, false
	}
	v, ok := ctx.Value(inputResponsesKey{}).([]InputResponse)
	if !ok || len(v) == 0 {
		return nil, false
	}
	return v, true
}

// InputResponseValue 从一组输入响应中取出指定 ID 的字符串值。
func InputResponseValue(responses []InputResponse, id string) (string, bool) {
	for _, r := range responses {
		if r.ID != id {
			continue
		}
		if s, ok := r.Value.(string); ok {
			return s, true
		}
	}
	return "", false
}

// idempotencyEntry 是一次 tools/call 的结果快照。
type idempotencyEntry struct {
	result    json.RawMessage
	expiresAt time.Time
}

// idempotencyStore 是内存幂等键存储。
//
// 为什么需要：MRTR 之后响应流中断不能用 Last-Event-ID 重放，
// 客户端只能整包重发，因此副作用工具必须自带幂等键保证「重发 = 回放」。
type idempotencyStore struct {
	mu      sync.Mutex
	ttl     time.Duration
	entries map[string]idempotencyEntry
	now     func() time.Time
}

// newIdempotencyStore 创建幂等存储；ttl<=0 时默认 10 分钟。
func newIdempotencyStore(ttl time.Duration) *idempotencyStore {
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}
	return &idempotencyStore{ttl: ttl, entries: make(map[string]idempotencyEntry), now: time.Now}
}

// load 返回未过期的缓存结果。
func (s *idempotencyStore) load(key string) (json.RawMessage, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.entries[key]
	if !ok {
		return nil, false
	}
	if !entry.expiresAt.After(s.now()) {
		delete(s.entries, key)
		return nil, false
	}
	return entry.result, true
}

// store 保存结果快照；序列化失败时静默跳过，不影响主流程。
func (s *idempotencyStore) store(key string, result any) {
	raw, err := json.Marshal(result)
	if err != nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.purgeLocked()
	s.entries[key] = idempotencyEntry{result: raw, expiresAt: s.now().Add(s.ttl)}
}

// purgeLocked 清理过期条目；调用方需持有锁。
func (s *idempotencyStore) purgeLocked() {
	now := s.now()
	for key, entry := range s.entries {
		if !entry.expiresAt.After(now) {
			delete(s.entries, key)
		}
	}
}
