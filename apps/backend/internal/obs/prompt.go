package obs

import (
	"fmt"
	"regexp"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

// PromptTemplate 是一个带版本号的提示词模板。
// 模板中用 {varName} 声明变量，渲染时由 Render 替换。
type PromptTemplate struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Version   int       `json:"version"`
	Content   string    `json:"content"`
	Variables []string  `json:"variables"`
	Tags      []string  `json:"tags,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	Comment   string    `json:"comment,omitempty"`
}

// PromptRegistry 管理提示词的多版本，支持激活/回滚与 A/B（按 tag 选取）。
type PromptRegistry struct {
	mu       sync.RWMutex
	versions map[string][]PromptTemplate // name → 版本列表（按 version 升序）
	now      func() time.Time
}

// NewPromptRegistry 创建提示词注册表。
func NewPromptRegistry() *PromptRegistry {
	return &PromptRegistry{versions: make(map[string][]PromptTemplate), now: time.Now}
}

var promptVarRe = regexp.MustCompile(`\{([a-zA-Z0-9_]+)\}`)

// Create 新增一个提示词版本；同名首个版本自动激活。
func (p *PromptRegistry) Create(name, content, comment string, tags []string) PromptTemplate {
	varList := make([]string, 0, 4)
	seen := make(map[string]struct{})
	for _, m := range promptVarRe.FindAllStringSubmatch(content, -1) {
		if _, dup := seen[m[1]]; dup {
			continue
		}
		seen[m[1]] = struct{}{}
		varList = append(varList, m[1])
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	history := p.versions[name]
	tpl := PromptTemplate{
		ID:        uuid.NewString(),
		Name:      name,
		Version:   len(history) + 1,
		Content:   content,
		Variables: varList,
		Tags:      tags,
		Active:    len(history) == 0,
		CreatedAt: p.now(),
		Comment:   comment,
	}
	// 首个版本激活；其余保持未激活，需显式 Activate
	p.versions[name] = append(history, tpl)
	return tpl
}

// Activate 激活指定版本，同名的其他版本自动取消激活。
func (p *PromptRegistry) Activate(name string, version int) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	history, ok := p.versions[name]
	if !ok {
		return fmt.Errorf("提示词不存在: %s", name)
	}
	found := false
	for i := range history {
		if history[i].Version == version {
			history[i].Active = true
			found = true
		} else {
			history[i].Active = false
		}
	}
	if !found {
		return fmt.Errorf("版本不存在: %s v%d", name, version)
	}
	p.versions[name] = history
	return nil
}

// Active 返回当前激活版本。
func (p *PromptRegistry) Active(name string) (PromptTemplate, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for _, t := range p.versions[name] {
		if t.Active {
			return t, true
		}
	}
	return PromptTemplate{}, false
}

// Get 返回指定版本。
func (p *PromptRegistry) Get(name string, version int) (PromptTemplate, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for _, t := range p.versions[name] {
		if t.Version == version {
			return t, true
		}
	}
	return PromptTemplate{}, false
}

// History 返回某个提示词的全部版本（版本倒序）。
func (p *PromptRegistry) History(name string) []PromptTemplate {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := append([]PromptTemplate{}, p.versions[name]...)
	sort.Slice(out, func(i, j int) bool { return out[i].Version > out[j].Version })
	return out
}

// List 返回全部提示词名称与激活版本。
func (p *PromptRegistry) List() []PromptTemplate {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make([]PromptTemplate, 0, len(p.versions))
	for name := range p.versions {
		for _, t := range p.versions[name] {
			if t.Active {
				out = append(out, t)
			}
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// Render 用变量值渲染模板；缺少变量时保留占位符原样输出，便于排查。
func Render(tpl PromptTemplate, vars map[string]string) (string, error) {
	if vars == nil {
		vars = map[string]string{}
	}
	missing := make([]string, 0)
	out := promptVarRe.ReplaceAllStringFunc(tpl.Content, func(match string) string {
		key := match[1 : len(match)-1]
		if v, ok := vars[key]; ok {
			return v
		}
		missing = append(missing, key)
		return match
	})
	if len(missing) > 0 {
		return out, fmt.Errorf("缺少模板变量: %v", missing)
	}
	return out, nil
}

// RenderActive 取激活版本并渲染。
func (p *PromptRegistry) RenderActive(name string, vars map[string]string) (string, int, error) {
	tpl, ok := p.Active(name)
	if !ok {
		return "", 0, fmt.Errorf("提示词未定义: %s", name)
	}
	out, err := Render(tpl, vars)
	return out, tpl.Version, err
}

// EnsureDefaults 注册系统内置的默认提示词（幂等：已存在则跳过）。
func (p *PromptRegistry) EnsureDefaults() {
	defaults := []struct{ name, content, comment string }{
		{
			name:    "rag.answer",
			content: "你是一个严谨的企业知识库助手。\n\n请仅依据下列上下文回答问题；上下文没有覆盖到的内容，直接说明「知识库中未找到相关信息」，不要编造。\n回答中如需引用，请标注 [1] [2] 形式的来源编号。\n\n--- 上下文开始 ---\n{context}\n--- 上下文结束 ---\n\n问题：{question}",
			comment: "RAG 问答主提示词：强制 grounded 回答 + 来源标注",
		},
		{
			name:    "chat.system",
			content: "你是 {assistantName}，一个专业、简洁的 AI 助手。\n回答用中文，结构化输出，避免空话。\n当信息不足时主动提问而不是猜测。",
			comment: "通用对话系统提示词",
		},
		{
			name:    "agent.react",
			content: "你是一个使用 ReAct 范式解决问题的智能体。\n\n可用工具：\n{tools}\n\n严格按如下格式推进，每轮只输出一个 Thought 或一个 Action：\nThought: 你对当前局势的分析\nAction: 需要调用的工具名\nAction Input: 工具参数的 JSON\nObservation: 工具返回的结果\n\n当已有足够信息时输出：\nFinal Answer: 最终回答\n\n最多 {maxSteps} 步。",
			comment: "ReAct 智能体编排提示词",
		},
	}
	for _, d := range defaults {
		if _, ok := p.Active(d.name); ok {
			continue
		}
		p.Create(d.name, d.content, d.comment, []string{"builtin"})
	}
}
