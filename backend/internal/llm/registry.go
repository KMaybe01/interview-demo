package llm

import (
	"context"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
)

// Registry 是 provider 注册表：负责模型 → provider 的路由、能力查询与统一入口。
type Registry struct {
	mu        sync.RWMutex
	providers map[string]Provider
	// modelIndex 是 modelID → providerID 的索引，构建一次后只读。
	modelIndex map[string]string
	defaultID  string
	fallbackID string
}

// NewRegistry 创建空注册表。
func NewRegistry() *Registry {
	return &Registry{
		providers:  make(map[string]Provider),
		modelIndex: make(map[string]string),
	}
}

// Register 注册一个 provider 并建立模型索引。
func (r *Registry) Register(p Provider, setDefault bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[p.ID()] = p
	for _, m := range p.Models() {
		if _, exists := r.modelIndex[m.ID]; !exists {
			r.modelIndex[m.ID] = p.ID()
		}
	}
	if setDefault || r.defaultID == "" {
		r.defaultID = p.ID()
	}
}

// SetDefault 指定默认 provider。
func (r *Registry) SetDefault(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.providers[id]; ok {
		r.defaultID = id
	}
}

// SetFallback 指定兜底 provider（主链路失败时使用）。
func (r *Registry) SetFallback(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.providers[id]; ok {
		r.fallbackID = id
	}
}

// Get 按 ID 取 provider。
func (r *Registry) Get(id string) (Provider, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.providers[id]
	return p, ok
}

// Resolve 按模型名解析出 provider；失败时回退到默认 provider。
func (r *Registry) Resolve(model string) (Provider, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if model != "" {
		if pid, ok := r.modelIndex[strings.ToLower(model)]; ok {
			if p, ok := r.providers[pid]; ok {
				return p, true
			}
		}
		// 未登记的模型：按模型名前缀猜测（deepseek-* / gemini-* / qwen-* / llama*）
		if pid := guessProvider(model); pid != "" {
			if p, ok := r.providers[pid]; ok {
				return p, true
			}
		}
	}
	p, ok := r.providers[r.defaultID]
	return p, ok
}

// Default 返回默认 provider。
func (r *Registry) Default() (Provider, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.providers[r.defaultID]
	return p, ok
}

// Fallback 返回兜底 provider。
func (r *Registry) Fallback() (Provider, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.fallbackID == "" {
		return nil, false
	}
	p, ok := r.providers[r.fallbackID]
	return p, ok
}

// ListProviders 返回全部已注册 provider 的 ID（有序）。
func (r *Registry) ListProviders() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]string, 0, len(r.providers))
	for id := range r.providers {
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

// ListModels 返回全部可用模型（按 provider 排序）。
func (r *Registry) ListModels() []ModelInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]ModelInfo, 0, 32)
	for _, id := range r.ListProviders() {
		out = append(out, r.providers[id].Models()...)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Provider != out[j].Provider {
			return out[i].Provider < out[j].Provider
		}
		return out[i].ID < out[j].ID
	})
	return out
}

// BindModel 把某个模型显式绑定到 provider，用于灰度或私有化部署。
func (r *Registry) BindModel(model, providerID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.providers[providerID]; !ok {
		return fmt.Errorf("provider 不存在: %s", providerID)
	}
	r.modelIndex[strings.ToLower(model)] = providerID
	return nil
}

// guessProvider 按模型名前缀猜测 provider。
func guessProvider(model string) string {
	m := strings.ToLower(model)
	switch {
	case strings.HasPrefix(m, "deepseek"):
		return "deepseek"
	case strings.HasPrefix(m, "gemini"):
		return "gemini"
	case strings.HasPrefix(m, "qwen"), strings.HasPrefix(m, "qwq"):
		return "qwen"
	case strings.HasPrefix(m, "llama"), strings.HasPrefix(m, "mistral"), strings.HasPrefix(m, "phi"):
		return "ollama"
	case strings.HasPrefix(m, "gpt-"), strings.HasPrefix(m, "o1"), strings.HasPrefix(m, "o3"), strings.HasPrefix(m, "o4"):
		return "openai"
	case strings.HasPrefix(m, "claude"):
		return "anthropic"
	}
	return ""
}

// Chat 是注册表上的便捷方法：解析 provider 后直接对话。
func (r *Registry) Chat(ctx context.Context, req Request) (*Response, error) {
	p, ok := r.Resolve(req.Model)
	if !ok {
		return nil, fmt.Errorf("没有可用的 LLM provider")
	}
	return p.Chat(ctx, req)
}

// Stream 是注册表上的便捷方法：解析 provider 后直接流式对话。
func (r *Registry) Stream(ctx context.Context, req Request) (<-chan Chunk, error) {
	p, ok := r.Resolve(req.Model)
	if !ok {
		return nil, fmt.Errorf("没有可用的 LLM provider")
	}
	return p.Stream(ctx, req)
}

// Embed 是注册表上的便捷方法：优先用指定 provider，失败则遍历所有支持嵌入的 provider。
func (r *Registry) Embed(ctx context.Context, providerID string, texts []string) ([][]float64, error) {
	if providerID != "" {
		if p, ok := r.Get(providerID); ok && p.SupportsEmbedding() {
			return p.Embed(ctx, texts)
		}
	}
	r.mu.RLock()
	ids := make([]string, 0, len(r.providers))
	for id := range r.providers {
		ids = append(ids, id)
	}
	r.mu.RUnlock()
	sort.Strings(ids)

	var lastErr error
	for _, id := range ids {
		p, ok := r.Get(id)
		if !ok || !p.SupportsEmbedding() || !isUsable(p) {
			continue
		}
		out, err := p.Embed(ctx, texts)
		if err == nil {
			return out, nil
		}
		lastErr = err
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("没有可用的嵌入 provider")
}

// isUsable 判断 provider 是否值得尝试（已配置且最近没有连续失败）。
func isUsable(p Provider) bool {
	if !p.Configured() {
		return false
	}
	if cp, ok := p.(*CompatProvider); ok {
		return cp.lastError() == nil
	}
	return true
}

// DefaultModelCatalog 是内置的默认模型目录：providerID → 模型清单。
func DefaultModelCatalog() map[string][]ModelInfo {
	return map[string][]ModelInfo{
		"openai": {
			{ID: "gpt-4o-mini", Name: "GPT-4o mini", Provider: "openai", ContextWindow: 128000, MaxOutput: 16384, Capabilities: []string{"chat", "tools", "vision"}},
			{ID: "gpt-4o", Name: "GPT-4o", Provider: "openai", ContextWindow: 128000, MaxOutput: 16384, Capabilities: []string{"chat", "tools", "vision"}},
			{ID: "gpt-4.1", Name: "GPT-4.1", Provider: "openai", ContextWindow: 1047576, MaxOutput: 32768, Capabilities: []string{"chat", "tools", "vision"}},
			{ID: "o4-mini", Name: "o4-mini（推理）", Provider: "openai", ContextWindow: 200000, MaxOutput: 100000, Capabilities: []string{"chat", "tools", "reasoning"}},
		},
		"deepseek": {
			{ID: "deepseek-chat", Name: "DeepSeek V3 Chat", Provider: "deepseek", ContextWindow: 131072, MaxOutput: 8192, Capabilities: []string{"chat", "tools"}},
			{ID: "deepseek-reasoner", Name: "DeepSeek Reasoner", Provider: "deepseek", ContextWindow: 131072, MaxOutput: 65536, Capabilities: []string{"chat", "tools", "reasoning"}},
		},
		"gemini": {
			{ID: "gemini-2.5-flash", Name: "Gemini 2.5 Flash", Provider: "gemini", ContextWindow: 1048576, MaxOutput: 65535, Capabilities: []string{"chat", "tools", "vision"}},
			{ID: "gemini-2.5-pro", Name: "Gemini 2.5 Pro", Provider: "gemini", ContextWindow: 1048576, MaxOutput: 65535, Capabilities: []string{"chat", "tools", "vision"}},
		},
		"qwen": {
			{ID: "qwen-turbo", Name: "通义千问 Turbo", Provider: "qwen", ContextWindow: 131072, MaxOutput: 8192, Capabilities: []string{"chat", "tools"}},
			{ID: "qwen-plus", Name: "通义千问 Plus", Provider: "qwen", ContextWindow: 131072, MaxOutput: 8192, Capabilities: []string{"chat", "tools"}},
			{ID: "qwen-max", Name: "通义千问 Max", Provider: "qwen", ContextWindow: 131072, MaxOutput: 8192, Capabilities: []string{"chat", "tools"}},
		},
		"ollama": {
			{ID: "llama3.1", Name: "Llama 3.1（本地）", Provider: "ollama", ContextWindow: 131072, MaxOutput: 8192, Capabilities: []string{"chat"}},
			{ID: "qwen2.5", Name: "Qwen 2.5（本地）", Provider: "ollama", ContextWindow: 32768, MaxOutput: 8192, Capabilities: []string{"chat"}},
		},
	}
}

// NewRegistryFromEnv 按环境变量构建注册表。
//
// 支持的环境变量（缺省即不注册该 provider）：
//
//	OPENAI_API_KEY / OPENAI_BASE_URL
//	DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL
//	GEMINI_API_KEY / GEMINI_BASE_URL
//	QWEN_API_KEY / QWEN_BASE_URL
//	OLLAMA_BASE_URL（本地无需密钥）
//	LLM_DEFAULT_PROVIDER / LLM_DEFAULT_MODEL
func NewRegistryFromEnv() *Registry {
	reg := NewRegistry()
	catalog := DefaultModelCatalog()

	type spec struct {
		id, name, baseURL, apiKey string
		noTools, noEmbedding      bool
		embedModel                string
		embedDim                  int
	}
	specs := []spec{
		{id: "openai", name: "OpenAI", baseURL: envOr("OPENAI_BASE_URL", ""), apiKey: os.Getenv("OPENAI_API_KEY"), embedModel: "text-embedding-3-small", embedDim: 1536},
		{id: "deepseek", name: "DeepSeek", baseURL: envOr("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"), apiKey: os.Getenv("DEEPSEEK_API_KEY"), noEmbedding: true},
		{id: "gemini", name: "Google Gemini", baseURL: envOr("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"), apiKey: os.Getenv("GEMINI_API_KEY"), noEmbedding: true},
		{id: "qwen", name: "阿里云通义千问", baseURL: envOr("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"), apiKey: os.Getenv("QWEN_API_KEY"), noEmbedding: true},
		{id: "ollama", name: "Ollama（本地）", baseURL: envOr("OLLAMA_BASE_URL", "http://localhost:11434/v1"), apiKey: envOr("OLLAMA_API_KEY", "ollama"), noTools: true, embedModel: "bge-m3", embedDim: 1024},
	}

	for _, s := range specs {
		if s.apiKey == "" && s.id != "ollama" {
			continue
		}
		reg.Register(NewCompatProvider(CompatConfig{
			ID:          s.id,
			DisplayName: s.name,
			BaseURL:     s.baseURL,
			APIKey:      s.apiKey,
			Models:      catalog[s.id],
			NoTools:     s.noTools,
			NoEmbedding: s.noEmbedding,
			EmbedModel:  s.embedModel,
			EmbedDim:    s.embedDim,
		}), s.id == "openai")
	}

	if id := os.Getenv("LLM_DEFAULT_PROVIDER"); id != "" {
		reg.SetDefault(id)
	}
	if id := os.Getenv("LLM_FALLBACK_PROVIDER"); id != "" {
		reg.SetFallback(id)
	}
	return reg
}

// envOr 读取环境变量，为空时返回默认值。
func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
