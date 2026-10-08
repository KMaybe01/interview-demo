package tool

import (
	"fmt"
	"sync"
	"time"
)

// AuditEvent 是一条工具调用审计记录。
type AuditEvent struct {
	ID       string         `json:"id"`
	Time     time.Time      `json:"time"`
	Tool     string         `json:"tool"`
	User     string         `json:"user,omitempty"`
	TraceID  string         `json:"traceId,omitempty"`
	Outcome  string         `json:"outcome"` // success / failure / blocked_permission / blocked_injection / blocked_rate_limit
	Detail   string         `json:"detail,omitempty"`
	Args     map[string]any `json:"args,omitempty"`
	Duration time.Duration  `json:"durationMs"`
}

// AuditLog 是有界环形审计日志，避免内存无限增长。
type AuditLog struct {
	mu     sync.Mutex
	cap    int
	events []AuditEvent
	seq    int64
	now    func() time.Time
}

// NewAuditLog 创建审计日志；cap<=0 时默认保留 500 条。
func NewAuditLog(cap int) *AuditLog {
	if cap <= 0 {
		cap = 500
	}
	return &AuditLog{cap: cap, events: make([]AuditEvent, 0, cap), now: time.Now}
}

// Append 写入一条审计记录。
func (l *AuditLog) Append(e AuditEvent) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.seq++
	if e.Time.IsZero() {
		e.Time = l.now()
	}
	e.ID = fmt.Sprintf("aud_%d", e.Time.UnixNano())
	l.events = append(l.events, e)
	if len(l.events) > l.cap {
		l.events = l.events[len(l.events)-l.cap:]
	}
}

// List 返回审计记录（最新的在前）；limit<=0 返回全部。
func (l *AuditLog) List(limit int) []AuditEvent {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]AuditEvent, len(l.events))
	for i, e := range l.events {
		out[len(l.events)-1-i] = e
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

// ByTool 返回某个工具的审计记录。
func (l *AuditLog) ByTool(toolName string, limit int) []AuditEvent {
	all := l.List(0)
	out := make([]AuditEvent, 0, len(all))
	for _, e := range all {
		if e.Tool == toolName {
			out = append(out, e)
		}
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out
}

// Summary 汇总审计结果：成功/失败/各类拦截的数量与平均耗时。
func (l *AuditLog) Summary() map[string]any {
	all := l.List(0)
	counts := map[string]int{}
	var totalDuration time.Duration
	var successDuration time.Duration
	for _, e := range all {
		counts[e.Outcome]++
		totalDuration += e.Duration
		if e.Outcome == "success" {
			successDuration += e.Duration
		}
	}
	avg := 0
	if c := counts["success"]; c > 0 {
		avg = int(successDuration.Milliseconds()) / c
	}
	return map[string]any{
		"total":        len(all),
		"counts":       counts,
		"avgSuccessMs": avg,
		"totalMs":      int(totalDuration.Milliseconds()),
	}
}
