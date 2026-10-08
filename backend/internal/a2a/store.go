package a2a

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

// newID 生成一个新的 UUID 字符串。
func newID() string { return uuid.NewString() }

// Store 是任务存储抽象；内存实现之外可替换为 Redis/DB。
type Store interface {
	Create(task *Task) error
	Get(id string) (*Task, bool)
	Update(task *Task) error
	List(filter TaskFilter) []Task
	Delete(id string) error
}

// TaskFilter 是任务查询过滤条件。
type TaskFilter struct {
	AgentID string
	Status  TaskStatus
	Limit   int
}

// MemoryStore 是 Store 的内存实现：RWMutex + map，带容量上限与淘汰策略。
type MemoryStore struct {
	mu    sync.RWMutex
	tasks map[string]*Task
	order []string // 创建顺序，用于淘汰最旧任务
	cap   int
	now   func() time.Time
}

// NewMemoryStore 创建内存任务存储；cap<=0 时默认 1000。
func NewMemoryStore(cap int) *MemoryStore {
	if cap <= 0 {
		cap = 1000
	}
	return &MemoryStore{tasks: make(map[string]*Task), order: make([]string, 0, cap), cap: cap, now: time.Now}
}

// Create 写入一个新任务；ID 为空时自动生成；超出容量先淘汰。
func (s *MemoryStore) Create(task *Task) error {
	if task == nil {
		return fmt.Errorf("a2a: 任务不能为空")
	}
	if task.ID == "" {
		task.ID = newID()
	}
	now := s.now()
	if task.CreatedAt.IsZero() {
		task.CreatedAt = now
	}
	task.UpdatedAt = now

	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	stored := *task
	s.tasks[task.ID] = &stored
	s.order = append(s.order, task.ID)
	return nil
}

// Get 返回任务副本，避免调用方直接修改内部状态。
func (s *MemoryStore) Get(id string) (*Task, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.tasks[id]
	if !ok || t == nil {
		return nil, false
	}
	cp := t.Clone()
	return &cp, true
}

// Update 更新一个已存在的任务。
func (s *MemoryStore) Update(task *Task) error {
	if task == nil {
		return fmt.Errorf("a2a: 任务不能为空")
	}
	task.UpdatedAt = s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.tasks[task.ID]; !ok {
		return fmt.Errorf("a2a: 任务不存在: %s", task.ID)
	}
	stored := task.Clone()
	s.tasks[task.ID] = &stored
	return nil
}

// List 按过滤条件返回任务（最新的在前）。
func (s *MemoryStore) List(filter TaskFilter) []Task {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Task, 0, len(s.tasks))
	for _, t := range s.tasks {
		if filter.AgentID != "" && t.AgentID != filter.AgentID {
			continue
		}
		if filter.Status != "" && t.Status != filter.Status {
			continue
		}
		out = append(out, t.Clone())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if filter.Limit > 0 && len(out) > filter.Limit {
		out = out[:filter.Limit]
	}
	return out
}

// Delete 删除一个任务。
func (s *MemoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tasks, id)
	for i, v := range s.order {
		if v == id {
			s.order = append(s.order[:i], s.order[i+1:]...)
			break
		}
	}
	return nil
}

// evictLocked 在超出容量时淘汰最旧的终态任务（无终态任务时退化为淘汰最早创建的）。
// 调用方需持有写锁。
func (s *MemoryStore) evictLocked() {
	for len(s.tasks) >= s.cap && len(s.order) > 0 {
		victim := ""
		for _, id := range s.order {
			if t, ok := s.tasks[id]; ok && t.Status.IsTerminal() {
				victim = id
				break
			}
		}
		if victim == "" {
			victim = s.order[0]
		}
		delete(s.tasks, victim)
		for i, v := range s.order {
			if v == victim {
				s.order = append(s.order[:i], s.order[i+1:]...)
				break
			}
		}
	}
}

// Clone 深拷贝一个任务，避免外部修改影响内部状态。
func (t Task) Clone() Task {
	cp := t
	if t.Error != nil {
		msg := *t.Error
		cp.Error = &msg
	}
	cp.History = append([]Message{}, t.History...)
	cp.Artifacts = append([]Artifact{}, t.Artifacts...)
	cp.Metadata = cloneMap(t.Metadata)
	return cp
}

// Touch 更新修改时间。
func (t *Task) Touch() { t.UpdatedAt = time.Now() }

// SetMetadata 设置一个 metadata 字段。
func (t *Task) SetMetadata(key string, value any) {
	if t.Metadata == nil {
		t.Metadata = make(map[string]any)
	}
	t.Metadata[key] = value
}

// ErrorMessage 返回错误信息；无错误返回空串。
func (t *Task) ErrorMessage() string {
	if t.Error == nil {
		return ""
	}
	return *t.Error
}

// NewTask 创建一个处于 submitted 状态的新任务。
func NewTask(agentID, sessionID string) *Task {
	now := time.Now()
	return &Task{
		ID:        newID(),
		AgentID:   agentID,
		SessionID: sessionID,
		Status:    TaskStatusSubmitted,
		CreatedAt: now,
		UpdatedAt: now,
		Metadata:  map[string]any{},
	}
}

// cloneMap 浅拷贝一个 map。
func cloneMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
