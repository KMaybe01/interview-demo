// Package obs 提供 LLMOps 可观测能力：链路追踪（trace/span）、运行记录（run）、
// 成本统计、指标聚合、离线评测（eval）与 Prompt 版本管理。
//
// 与前端性能监控（internal/vitals）的分工：
//   - vitals 采集「浏览器侧」指标（TTFB/FCP/LCP/CLS/INP）与页面渲染耗时
//   - obs    采集「AI 侧」指标（TTFT、token、成本、工具调用、降级率、评测分）
package obs

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// SpanKind 是 span 的类型。
type SpanKind string

// span 类型常量。
const (
	SpanLLM       SpanKind = "llm"
	SpanTool      SpanKind = "tool"
	SpanRetrieval SpanKind = "retrieval"
	SpanAgent     SpanKind = "agent"
	SpanGuard     SpanKind = "guard"
	SpanHTTP      SpanKind = "http"
)

// SpanEvent 是 span 内的一个时间点事件。
type SpanEvent struct {
	Name  string         `json:"name"`
	Time  time.Time      `json:"time"`
	Attrs map[string]any `json:"attrs,omitempty"`
}

// Span 是一次原子操作（一次 LLM 调用、一次工具执行、一次检索……）。
type Span struct {
	TraceID  string         `json:"traceId"`
	SpanID   string         `json:"spanId"`
	ParentID string         `json:"parentId,omitempty"`
	Name     string         `json:"name"`
	Kind     SpanKind       `json:"kind"`
	Start    time.Time      `json:"start"`
	End      time.Time      `json:"end"`
	Duration time.Duration  `json:"durationMs"`
	Status   string         `json:"status"` // ok / error
	Error    string         `json:"error,omitempty"`
	Attrs    map[string]any `json:"attrs,omitempty"`
	Events   []SpanEvent    `json:"events,omitempty"`
}

// Finish 结束 span 并计算耗时。
func (s *Span) Finish(status string, err error) {
	s.End = time.Now()
	if s.Start.IsZero() {
		s.Start = s.End
	}
	s.Duration = s.End.Sub(s.Start)
	s.Status = status
	if err != nil {
		s.Status = "error"
		s.Error = err.Error()
	}
}

// Trace 是一棵 span 树，代表一次完整的用户请求链路。
type Trace struct {
	TraceID  string        `json:"traceId"`
	Name     string        `json:"name"`
	Start    time.Time     `json:"start"`
	End      time.Time     `json:"end"`
	Duration time.Duration `json:"durationMs"`
	Status   string        `json:"status"`
	Spans    []*Span       `json:"spans"`
}

// RunKind 是一次 AI 运行的类型。
type RunKind string

// 运行类型常量。
const (
	RunChat  RunKind = "chat"
	RunAgent RunKind = "agent"
	RunRAG   RunKind = "rag"
	RunEmbed RunKind = "embed"
)

// Run 是一次完整 AI 运行的汇总记录，是指标聚合与成本统计的最小粒度。
type Run struct {
	ID               string    `json:"id"`
	TraceID          string    `json:"traceId"`
	Kind             RunKind   `json:"kind"`
	Model            string    `json:"model"`
	Provider         string    `json:"provider"`
	UserID           string    `json:"userId,omitempty"`
	SessionID        string    `json:"sessionId,omitempty"`
	KnowledgeBaseID  string    `json:"knowledgeBaseId,omitempty"`
	PromptTokens     int       `json:"promptTokens"`
	CompletionTokens int       `json:"completionTokens"`
	TotalTokens      int       `json:"totalTokens"`
	CostUSD          float64   `json:"costUsd"`
	LatencyMs        int64     `json:"latencyMs"`
	TTFTMs           int64     `json:"ttftMs"` // 首个 token 到达耗时
	Steps            int       `json:"steps"`  // Agent 步数
	ToolCalls        int       `json:"toolCalls"`
	Retrievals       int       `json:"retrievals"`
	Status           string    `json:"status"`   // ok / error / degraded / canceled
	Degraded         bool      `json:"degraded"` // 是否走了离线降级
	CacheHit         bool      `json:"cacheHit"` // 是否命中响应缓存
	Error            string    `json:"error,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
}

// Recorder 是运行记录与链路追踪的写入口，线程安全。
type Recorder struct {
	mu       sync.Mutex
	runs     []Run
	traces   map[string]*Trace
	spans    map[string][]*Span
	runCap   int
	traceTTL time.Duration
	now      func() time.Time

	// 实时累计指标，避免每次聚合都全量扫描
	totalRequests int64
	totalTokens   int64
	totalCost     float64
	errorCount    int64
	degradedCount int64
	cacheHits     int64
}

// NewRecorder 创建记录器；runCap<=0 时保留最近 2000 条 run。
func NewRecorder(runCap int) *Recorder {
	if runCap <= 0 {
		runCap = 2000
	}
	return &Recorder{
		runs:     make([]Run, 0, runCap),
		traces:   make(map[string]*Trace),
		spans:    make(map[string][]*Span),
		runCap:   runCap,
		traceTTL: 30 * time.Minute,
		now:      time.Now,
	}
}

// StartTrace 开启一条链路。
func (r *Recorder) StartTrace(name string) *Trace {
	t := &Trace{
		TraceID: uuid.NewString(),
		Name:    name,
		Start:   r.now(),
		Status:  "ok",
		Spans:   []*Span{},
	}
	r.mu.Lock()
	r.traces[t.TraceID] = t
	r.mu.Unlock()
	return t
}

// StartSpan 在链路上开启一个 span。
func (r *Recorder) StartSpan(traceID, name string, kind SpanKind, parentID string) *Span {
	s := &Span{
		TraceID:  traceID,
		SpanID:   uuid.NewString(),
		ParentID: parentID,
		Name:     name,
		Kind:     kind,
		Start:    r.now(),
		Status:   "ok",
		Attrs:    map[string]any{},
	}
	return s
}

// EndSpan 结束并记录一个 span。
func (r *Recorder) EndSpan(s *Span, err error) {
	if s == nil {
		return
	}
	status := "ok"
	if err != nil {
		status = "error"
	}
	s.Finish(status, err)

	r.mu.Lock()
	defer r.mu.Unlock()
	r.spans[s.TraceID] = append(r.spans[s.TraceID], s)
	if t, ok := r.traces[s.TraceID]; ok {
		t.Spans = append(t.Spans, s)
		if err != nil {
			t.Status = "error"
		}
	}
}

// AddEvent 往 span 上追加一个事件。
func (s *Span) AddEvent(name string, attrs map[string]any) {
	s.Events = append(s.Events, SpanEvent{Name: name, Time: time.Now(), Attrs: attrs})
}

// EndTrace 结束一条链路。
func (r *Recorder) EndTrace(t *Trace) {
	if t == nil {
		return
	}
	t.End = r.now()
	t.Duration = t.End.Sub(t.Start)
	r.mu.Lock()
	r.traces[t.TraceID] = t
	r.mu.Unlock()
}

// GetTrace 返回一条链路及其全部 span。
func (r *Recorder) GetTrace(traceID string) (*Trace, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	t, ok := r.traces[traceID]
	if !ok {
		return nil, false
	}
	cp := *t
	cp.Spans = append([]*Span{}, t.Spans...)
	return &cp, true
}

// ListTraces 返回最近 limit 条链路。
func (r *Recorder) ListTraces(limit int) []*Trace {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*Trace, 0, len(r.traces))
	for _, t := range r.traces {
		out = append(out, t)
	}
	sortByStartDesc(out)
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

// RecordRun 写入一条运行记录并更新累计指标。
func (r *Recorder) RecordRun(run Run) {
	if run.ID == "" {
		run.ID = uuid.NewString()
	}
	if run.CreatedAt.IsZero() {
		run.CreatedAt = r.now()
	}
	if run.Status == "" {
		run.Status = "ok"
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.runs = append(r.runs, run)
	if len(r.runs) > r.runCap {
		r.runs = r.runs[len(r.runs)-r.runCap:]
	}

	r.totalRequests++
	r.totalTokens += int64(run.TotalTokens)
	r.totalCost += run.CostUSD
	if run.Status == "error" {
		r.errorCount++
	}
	if run.Degraded {
		r.degradedCount++
	}
	if run.CacheHit {
		r.cacheHits++
	}
}

// Runs 返回运行记录（最新在前）。
func (r *Recorder) Runs(limit int) []Run {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Run, len(r.runs))
	for i, run := range r.runs {
		out[len(r.runs)-1-i] = run
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

// RunsSince 返回指定时间之后的运行记录。
func (r *Recorder) RunsSince(since time.Time) []Run {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Run, 0, len(r.runs))
	for _, run := range r.runs {
		if run.CreatedAt.After(since) {
			out = append(out, run)
		}
	}
	return out
}

// Counters 返回累计计数器快照。
func (r *Recorder) Counters() map[string]any {
	r.mu.Lock()
	defer r.mu.Unlock()
	return map[string]any{
		"requests": r.totalRequests,
		"tokens":   r.totalTokens,
		"costUsd":  r.totalCost,
		"errors":   r.errorCount,
		"degraded": r.degradedCount,
		"cacheHit": r.cacheHits,
	}
}

// Prune 清理过期链路，避免内存泄漏；应由后台 goroutine 定期调用。
func (r *Recorder) Prune() int {
	cutoff := r.now().Add(-r.traceTTL)
	r.mu.Lock()
	defer r.mu.Unlock()
	removed := 0
	for id, t := range r.traces {
		if t.Start.Before(cutoff) {
			delete(r.traces, id)
			delete(r.spans, id)
			removed++
		}
	}
	return removed
}
