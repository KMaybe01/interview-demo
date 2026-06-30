package memory

import (
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"interview-demo/backend/internal/model"
)

type Service struct {
	memories map[string][]model.Memory
	mu       sync.RWMutex
}

func NewService() *Service {
	return &Service{
		memories: make(map[string][]model.Memory),
	}
}

func (s *Service) Add(conversationID string, msg model.Message) model.Memory {
	s.mu.Lock()
	defer s.mu.Unlock()

	memory := model.Memory{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		Content:        msg.Content,
		Role:           msg.Role,
		Importance:     s.calculateImportance(msg),
		CreatedAt:      time.Now(),
		AccessedAt:     time.Now(),
		AccessCount:    0,
	}

	s.memories[conversationID] = append(s.memories[conversationID], memory)
	return memory
}

func (s *Service) Search(conversationID string, query string, topK int) []model.Memory {
	s.mu.Lock()
	defer s.mu.Unlock()

	memories, exists := s.memories[conversationID]
	if !exists {
		return []model.Memory{}
	}

	type scoredMemory struct {
		memory model.Memory
		score  float64
	}

	var scored []scoredMemory
	for _, m := range memories {
		score := s.calculateRelevanceScore(m.Content, query)
		if score > 0 {
			scored = append(scored, scoredMemory{memory: m, score: score})
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	if topK > len(scored) {
		topK = len(scored)
	}

	result := make([]model.Memory, topK)
	for i := 0; i < topK; i++ {
		result[i] = scored[i].memory
		result[i].AccessedAt = time.Now()
		result[i].AccessCount++
	}

	return result
}

func (s *Service) History(conversationID string, limit int) []model.Memory {
	s.mu.RLock()
	defer s.mu.RUnlock()

	memories, exists := s.memories[conversationID]
	if !exists {
		return []model.Memory{}
	}

	if limit > len(memories) {
		limit = len(memories)
	}

	result := make([]model.Memory, limit)
	latest := memories[len(memories)-limit:]
	for i, m := range latest {
		result[len(latest)-1-i] = m
	}
	return result
}

func (s *Service) Summarize(conversationID string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	memories, exists := s.memories[conversationID]
	if !exists || len(memories) == 0 {
		return "暂无对话历史"
	}

	summary := "对话历史摘要："
	for _, m := range memories {
		if m.Role == "user" {
			summary += "\n- 用户: " + truncateString(m.Content, 50)
		}
	}

	return summary
}

func (s *Service) Clear(conversationID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.memories, conversationID)
}

func (s *Service) calculateImportance(msg model.Message) float64 {
	importance := 0.5

	keywords := []string{"重要", "关键", "记住", "提醒", "注意", "必须", "一定"}
	for _, keyword := range keywords {
		if containsString(msg.Content, keyword) {
			importance += 0.1
		}
	}

	if containsString(msg.Content, "?") || containsString(msg.Content, "？") {
		importance += 0.1
	}

	if importance > 1 {
		importance = 1
	}

	return importance
}

func (s *Service) calculateRelevanceScore(content, query string) float64 {
	if query == "" {
		return 0
	}

	queryWords := splitString(query)
	matched := 0

	for _, qw := range queryWords {
		if strings.Contains(content, qw) {
			matched++
		}
	}

	score := float64(matched) / float64(len(queryWords))

	return score
}

func containsString(s, substr string) bool {
	return strings.Contains(s, substr)
}

func splitString(s string) []string {
	var words []string
	current := ""

	for _, c := range s {
		if c == ' ' || c == '，' || c == '。' || c == '？' || c == '！' || c == ',' || c == '.' || c == '?' || c == '!' {
			if current != "" {
				words = append(words, current)
				current = ""
			}
		} else {
			current += string(c)
		}
	}

	if current != "" {
		words = append(words, current)
	}

	return words
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
