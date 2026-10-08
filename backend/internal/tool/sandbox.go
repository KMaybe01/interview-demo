package tool

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"
)

// injectionRules 是参数净化规则：命中任意一条即拒绝执行。
// 覆盖脚本注入、危险 shell、破坏性 SQL、路径穿越、Prompt 注入五类。
var injectionRules = []struct {
	name string
	re   *regexp.Regexp
}{
	{"脚本标签", regexp.MustCompile(`(?i)<\s*script[\s>]`)},
	{"事件处理器", regexp.MustCompile(`(?i)\bon[a-z]+\s*=`)},
	{"伪协议", regexp.MustCompile(`(?i)^\s*javascript\s*:`)},
	{"危险删除命令", regexp.MustCompile(`(?i)\brm\s+(-[a-z]*\s+)*-?(r|f|rf|fr)\b`)},
	{"破坏性 SQL", regexp.MustCompile(`(?i)\b(drop\s+table|drop\s+database|truncate\s+table|delete\s+from)\b`)},
	{"路径穿越", regexp.MustCompile(`(\.\./|\.\.\\){2,}|^/etc/(passwd|shadow)`)},
	{"命令注入分隔符", regexp.MustCompile(`[;&|]\s*(cat|curl|wget|nc|bash|sh|powershell)\b`)},
	{"Prompt 注入：忽略指令", regexp.MustCompile(`(?i)(ignore\s+(all\s+|the\s+)?(previous|prior|above)\s+instructions?|disregard\s+all|forget\s+(all\s+)?(previous|prior))`)},
	{"Prompt 注入：越权声明", regexp.MustCompile(`(?i)(you\s+are\s+now\s+|system\s*:\s*|new\s+system\s+prompt\s*:)`)},
}

// DetectInjection 深度遍历参数，返回命中的规则名；无命中返回空串。
// 只扫描字符串值（含 map / slice 内的字符串），避免漏掉嵌套结构。
func DetectInjection(args map[string]any) string {
	for _, v := range args {
		if reason := scanValue(v, 0); reason != "" {
			return reason
		}
	}
	return ""
}

// scanValue 递归扫描任意值；depth 限制递归深度防止恶意嵌套。
func scanValue(v any, depth int) string {
	if depth > 6 {
		return ""
	}
	switch typed := v.(type) {
	case string:
		return matchRules(typed)
	case []any:
		for _, item := range typed {
			if reason := scanValue(item, depth+1); reason != "" {
				return reason
			}
		}
	case map[string]any:
		for _, item := range typed {
			if reason := scanValue(item, depth+1); reason != "" {
				return reason
			}
		}
	}
	return ""
}

// matchRules 对单个字符串逐条匹配规则。
func matchRules(text string) string {
	if text == "" {
		return ""
	}
	for _, rule := range injectionRules {
		if rule.re.MatchString(text) {
			return "命中安全规则「" + rule.name + "」"
		}
	}
	return ""
}

// Limiter 是工具级滑动窗口限流器（同一工具在窗口期内的调用上限）。
type Limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string][]time.Time
	now    func() time.Time
}

// NewLimiter 创建限流器；limit<=0 表示不限流。
func NewLimiter(limit int, window time.Duration) *Limiter {
	if window <= 0 {
		window = time.Minute
	}
	return &Limiter{limit: limit, window: window, hits: make(map[string][]time.Time), now: time.Now}
}

// Allow 判断 key 在窗口期内是否还有配额；通过时记录本次调用时间。
func (l *Limiter) Allow(key string) bool {
	if l.limit <= 0 {
		return true
	}
	now := l.now()
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := now.Add(-l.window)
	kept := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.limit {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}

// Remaining 返回 key 的剩余配额。
func (l *Limiter) Remaining(key string) int {
	if l.limit <= 0 {
		return -1
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.limit - len(l.hits[key])
}

// ApprovalTicket 是一次待人工确认的工具调用（HITL 工单）。
type ApprovalTicket struct {
	ID         string         `json:"id"`
	ToolName   string         `json:"toolName"`
	ToolCallID string         `json:"toolCallId"`
	Arguments  map[string]any `json:"arguments"`
	Level      Level          `json:"level"`
	Reason     string         `json:"reason"`
	CreatedAt  time.Time      `json:"createdAt"`
	ExpiresAt  time.Time      `json:"expiresAt"`
}

// ApprovalStore 保存待确认的 HITL 工单，供前端查询与放行。
type ApprovalStore struct {
	mu      sync.Mutex
	tickets map[string]*ApprovalTicket
	ttl     time.Duration
	now     func() time.Time
	seq     int64
}

// NewApprovalStore 创建审批工单存储；ttl<=0 时默认 10 分钟。
func NewApprovalStore(ttl time.Duration) *ApprovalStore {
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}
	return &ApprovalStore{tickets: make(map[string]*ApprovalTicket), ttl: ttl, now: time.Now}
}

// Create 新建一个工单，返回其 ID。
func (s *ApprovalStore) Create(toolCallID, toolName string, args map[string]any, level Level, reason string) *ApprovalTicket {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	now := s.now()
	t := &ApprovalTicket{
		ID:         fmt.Sprintf("apr_%d", now.UnixNano()),
		ToolName:   toolName,
		ToolCallID: toolCallID,
		Arguments:  args,
		Level:      level,
		Reason:     reason,
		CreatedAt:  now,
		ExpiresAt:  now.Add(s.ttl),
	}
	s.purgeLocked(now)
	s.tickets[t.ID] = t
	_ = s.seq
	return t
}

// Get 返回未过期的工单。
func (s *ApprovalStore) Get(id string) (*ApprovalTicket, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.tickets[id]
	if !ok {
		return nil, false
	}
	if !t.ExpiresAt.After(s.now()) {
		delete(s.tickets, id)
		return nil, false
	}
	return t, true
}

// Pending 返回全部未过期的待确认工单。
func (s *ApprovalStore) Pending() []ApprovalTicket {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	s.purgeLocked(now)
	out := make([]ApprovalTicket, 0, len(s.tickets))
	for _, t := range s.tickets {
		out = append(out, *t)
	}
	return out
}

// Resolve 处理一个工单：approve=false 表示拒绝。
func (s *ApprovalStore) Resolve(id string, approve bool) (*ApprovalTicket, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.tickets[id]
	if !ok {
		return nil, false
	}
	delete(s.tickets, id)
	return t, approve
}

// purgeLocked 清理过期工单；调用方需持有锁。
func (s *ApprovalStore) purgeLocked(now time.Time) {
	for id, t := range s.tickets {
		if !t.ExpiresAt.After(now) {
			delete(s.tickets, id)
		}
	}
}

// ExecutorWithApproval 在 Registry 上包一层 HITL：
// 工具等级高于调用方档位时先建工单并返回 ErrApprovalRequired，
// 前端确认后再以 Approved=true 重新调用。
type ExecutorWithApproval struct {
	registry *Registry
	store    *ApprovalStore
	tier     Level
}

// NewExecutorWithApproval 创建一个带审批的执行器。
func NewExecutorWithApproval(r *Registry, store *ApprovalStore, tier Level) *ExecutorWithApproval {
	if store == nil {
		store = NewApprovalStore(0)
	}
	return &ExecutorWithApproval{registry: r, store: store, tier: tier}
}

// RequiresApproval 判断工具在当前档位下是否需要人工确认。
func (e *ExecutorWithApproval) RequiresApproval(name string) (bool, Level, error) {
	def, err := e.registry.Get(name)
	if err != nil {
		return false, LevelRead, err
	}
	return def.Level > e.tier, def.Level, nil
}

// RequestApproval 为一次工具调用创建审批工单。
func (e *ExecutorWithApproval) RequestApproval(toolCallID, name string, args map[string]any) (*ApprovalTicket, error) {
	def, err := e.registry.Get(name)
	if err != nil {
		return nil, err
	}
	if def.Level <= e.tier {
		return nil, fmt.Errorf("工具 %s 属于 %s，无需审批", name, def.Level)
	}
	return e.store.Create(toolCallID, name, args, def.Level, fmt.Sprintf("工具 %s 属于 %s，超出调用方档位 %s", name, def.Level, e.tier)), nil
}

// Approvals 返回审批工单存储。
func (e *ExecutorWithApproval) Approvals() *ApprovalStore { return e.store }

// Describe 生成给前端展示的审批摘要文本。
func (t *ApprovalTicket) Describe() string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("工具 %s（%s）请求执行", t.ToolName, t.Level))
	if t.Reason != "" {
		b.WriteString("：" + t.Reason)
	}
	return b.String()
}
