package a2a

import (
	"context"
	"sort"
	"sync"
)

// AgentRegistry 保存已注册的 Agent：Card（能力描述）+ Runner（执行体）。
type AgentRegistry struct {
	mu      sync.RWMutex
	cards   map[string]AgentCard
	runners map[string]Runner
	order   []string
}

// NewAgentRegistry 创建空的 Agent 注册表。
func NewAgentRegistry() *AgentRegistry {
	return &AgentRegistry{cards: make(map[string]AgentCard), runners: make(map[string]Runner)}
}

// RegisterAgent 注册一个 Agent；runner 为 nil 时使用内置 EchoRunner（真实统计，非假数据）。
func (r *AgentRegistry) RegisterAgent(card AgentCard, runner Runner) {
	if card.ID == "" {
		return
	}
	if runner == nil {
		runner = NewEchoRunner()
	}
	if card.Authentication == nil {
		card.Authentication = &Authentication{Schemes: []string{"none"}}
	}
	if len(card.DefaultInputModes) == 0 {
		card.DefaultInputModes = []string{"text"}
	}
	if len(card.DefaultOutputModes) == 0 {
		card.DefaultOutputModes = []string{"text"}
	}
	if card.Version == "" {
		card.Version = "1.0.0"
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.cards[card.ID]; !exists {
		r.order = append(r.order, card.ID)
	}
	r.cards[card.ID] = card
	r.runners[card.ID] = runner
}

// Unregister 移除一个 Agent。
func (r *AgentRegistry) Unregister(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.cards, id)
	delete(r.runners, id)
	for i, v := range r.order {
		if v == id {
			r.order = append(r.order[:i], r.order[i+1:]...)
			break
		}
	}
}

// Get 返回 Agent 的 Card 与 Runner。
func (r *AgentRegistry) Get(id string) (AgentCard, Runner, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	card, ok := r.cards[id]
	if !ok {
		return AgentCard{}, nil, false
	}
	return card, r.runners[id], true
}

// Card 返回指定 Agent 的 Card。
func (r *AgentRegistry) Card(id string) (AgentCard, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	card, ok := r.cards[id]
	return card, ok
}

// DefaultCard 返回第一个注册的 Agent 的 Card（用于 /.well-known/agent.json 全局卡）。
func (r *AgentRegistry) DefaultCard() (AgentCard, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if len(r.order) == 0 {
		return AgentCard{}, false
	}
	card, ok := r.cards[r.order[0]]
	return card, ok
}

// Summaries 返回全部 Agent 的摘要（按注册顺序）。
func (r *AgentRegistry) Summaries() []AgentSummary {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]AgentSummary, 0, len(r.order))
	for _, id := range r.order {
		card := r.cards[id]
		skills := make([]string, 0, len(card.Skills))
		for _, s := range card.Skills {
			skills = append(skills, s.ID)
		}
		out = append(out, AgentSummary{
			ID:          card.ID,
			Name:        card.Name,
			Description: card.Description,
			Version:     card.Version,
			Skills:      skills,
			Streaming:   card.Capabilities.Streaming,
		})
	}
	return out
}

// Cards 返回全部 Card（按 ID 排序）。
func (r *AgentRegistry) Cards() []AgentCard {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]AgentCard, 0, len(r.cards))
	for _, card := range r.cards {
		out = append(out, card)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// Count 返回已注册 Agent 数量。
func (r *AgentRegistry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.cards)
}

// Router 是「按技能挑选 Agent」的最小路由：给 Multi-Agent 编排提供基础能力。
type Router struct {
	registry *AgentRegistry
}

// NewRouter 创建一个基于 Registry 的路由器。
func NewRouter(reg *AgentRegistry) *Router { return &Router{registry: reg} }

// BySkill 返回具备指定技能的 Agent ID 列表。
func (rt *Router) BySkill(skillID string) []string {
	if rt == nil || rt.registry == nil {
		return nil
	}
	out := make([]string, 0)
	for _, card := range rt.registry.Cards() {
		for _, s := range card.Skills {
			if s.ID == skillID {
				out = append(out, card.ID)
				break
			}
		}
	}
	return out
}

// Execute 在指定 Agent 上跑一次任务，用于 Multi-Agent 编排串联。
func (rt *Router) Execute(ctx context.Context, agentID string, input []Part) ([]Artifact, error) {
	if rt == nil || rt.registry == nil {
		return nil, NewRPCError(ErrCodeInvalidParams, "Agent 注册表未初始化")
	}
	_, runner, ok := rt.registry.Get(agentID)
	if !ok {
		return nil, NewRPCError(ErrCodeInvalidParams, "Agent 不存在："+agentID)
	}
	task := NewTask(agentID, "")
	return runner.Run(ctx, task, input)
}
