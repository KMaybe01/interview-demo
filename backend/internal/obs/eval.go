package obs

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// EvalCase 是一条评测用例：问题 + 参考答案（可选）+ 期望命中关键词。
type EvalCase struct {
	ID        string   `json:"id"`
	Question  string   `json:"question"`
	Reference string   `json:"reference,omitempty"`
	Keywords  []string `json:"keywords,omitempty"`
}

// EvalDataset 是一个评测数据集。
type EvalDataset struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"createdAt"`
	Cases     []EvalCase `json:"cases"`
}

// EvalThresholds 是评测通过阈值（对应 CI 门禁）。
type EvalThresholds struct {
	// FaithfulnessFail 低于该值判定为失败（对齐生产化文档基线 0.7）
	FaithfulnessFail float64 `json:"faithfulnessFail"`
	// RelevancyWarn 低于该值告警。
	//
	// 注意：生产化文档给的答案相关性基线是 0.8（语义级评分），
	// 而本实现是**词典重合度代理**，数值天然偏低，因此默认取 0.5。
	// 若接入 LLM-as-Judge（G-Eval / RAGAS）请把它调回 0.8。
	RelevancyWarn float64 `json:"relevancyWarn"`
	// MinRetrievalHitRate 检索命中率下限
	MinRetrievalHitRate float64 `json:"minRetrievalHitRate"`
}

// DefaultThresholds 返回默认阈值。
func DefaultThresholds() EvalThresholds {
	return EvalThresholds{FaithfulnessFail: 0.7, RelevancyWarn: 0.5, MinRetrievalHitRate: 0.6}
}

// CaseResult 是单条用例的评测结果。
type CaseResult struct {
	CaseID           string   `json:"caseId"`
	Question         string   `json:"question"`
	Answer           string   `json:"answer"`
	Contexts         []string `json:"contexts"`
	RetrievalHit     bool     `json:"retrievalHit"`
	Faithfulness     float64  `json:"faithfulness"`
	AnswerRelevancy  float64  `json:"answerRelevancy"`
	ContextPrecision float64  `json:"contextPrecision"`
	LatencyMs        int64    `json:"latencyMs"`
	Tokens           int      `json:"tokens"`
	CostUSD          float64  `json:"costUsd"`
	Passed           bool     `json:"passed"`
	Warnings         []string `json:"warnings,omitempty"`
	Error            string   `json:"error,omitempty"`
}

// EvalSummary 是一次评测的汇总。
type EvalSummary struct {
	Total            int     `json:"total"`
	Passed           int     `json:"passed"`
	Failed           int     `json:"failed"`
	PassRate         float64 `json:"passRate"`
	AvgFaithfulness  float64 `json:"avgFaithfulness"`
	AvgRelevancy     float64 `json:"avgRelevancy"`
	AvgPrecision     float64 `json:"avgPrecision"`
	RetrievalHitRate float64 `json:"retrievalHitRate"`
	LatencyP95       float64 `json:"latencyP95"`
	TotalCostUSD     float64 `json:"totalCostUsd"`
	TotalTokens      int     `json:"totalTokens"`
}

// EvalRunResult 是一次评测运行的完整结果。
type EvalRunResult struct {
	ID          string         `json:"id"`
	DatasetID   string         `json:"datasetId"`
	DatasetName string         `json:"datasetName"`
	TopK        int            `json:"topK"`
	Thresholds  EvalThresholds `json:"thresholds"`
	StartedAt   time.Time      `json:"startedAt"`
	FinishedAt  time.Time      `json:"finishedAt"`
	DurationMs  int64          `json:"durationMs"`
	Cases       []CaseResult   `json:"cases"`
	Summary     EvalSummary    `json:"summary"`
}

// AnswerFunc 是被评测系统的回答函数，由 RAG 服务适配实现。
type AnswerFunc func(ctx context.Context, question string, topK int) (answer string, contexts []string, tokens int, costUSD float64, err error)

// EvalStore 保存数据集与评测结果。
type EvalStore struct {
	mu     sync.Mutex
	sets   map[string]*EvalDataset
	runs   []EvalRunResult
	runCap int
	now    func() time.Time
}

// NewEvalStore 创建评测存储。
func NewEvalStore() *EvalStore {
	return &EvalStore{sets: make(map[string]*EvalDataset), runCap: 50, now: time.Now}
}

// CreateDataset 新建一个数据集。
func (s *EvalStore) CreateDataset(name string, cases []EvalCase) *EvalDataset {
	ds := &EvalDataset{ID: uuid.NewString(), Name: name, CreatedAt: s.now(), Cases: cases}
	s.mu.Lock()
	s.sets[ds.ID] = ds
	s.mu.Unlock()
	return ds
}

// GetDataset 返回数据集。
func (s *EvalStore) GetDataset(id string) (*EvalDataset, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ds, ok := s.sets[id]
	return ds, ok
}

// ListDatasets 返回全部数据集。
func (s *EvalStore) ListDatasets() []EvalDataset {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]EvalDataset, 0, len(s.sets))
	for _, ds := range s.sets {
		out = append(out, *ds)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

// Runs 返回历史评测结果（最新在前）。
func (s *EvalStore) Runs(limit int) []EvalRunResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]EvalRunResult, len(s.runs))
	for i, r := range s.runs {
		out[len(s.runs)-1-i] = r
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

// RunEval 执行一次评测：逐条跑用例，计算 RAG 四指标并按阈值判定通过。
//
// 指标口径（无需额外 LLM 调用，可放进 CI 每次 PR 运行）：
//   - RetrievalHit      召回的上下文中是否出现参考答案/关键词的核心 token
//   - Faithfulness      答案 token 落在上下文中的比例（衡量幻觉）
//   - AnswerRelevancy   答案与问题 token 的重合度（衡量答非所问）
//   - ContextPrecision  召回上下文中与问题相关的比例（衡量召回了多少噪声）
func (s *EvalStore) RunEval(ctx context.Context, datasetID string, topK int, thresholds EvalThresholds, answer AnswerFunc) (*EvalRunResult, error) {
	ds, ok := s.GetDataset(datasetID)
	if !ok {
		return nil, fmt.Errorf("评测数据集不存在: %s", datasetID)
	}
	if answer == nil {
		return nil, fmt.Errorf("缺少被评测的回答函数")
	}
	if topK <= 0 {
		topK = 3
	}
	if thresholds.FaithfulnessFail <= 0 {
		thresholds = DefaultThresholds()
	}

	started := s.now()
	result := &EvalRunResult{
		ID:          uuid.NewString(),
		DatasetID:   ds.ID,
		DatasetName: ds.Name,
		TopK:        topK,
		Thresholds:  thresholds,
		StartedAt:   started,
		Cases:       make([]CaseResult, 0, len(ds.Cases)),
	}

	latencies := make([]float64, 0, len(ds.Cases))
	for _, c := range ds.Cases {
		cr := CaseResult{CaseID: c.ID, Question: c.Question}
		caseStart := s.now()

		ans, contexts, tokens, cost, err := answer(ctx, c.Question, topK)
		cr.LatencyMs = s.now().Sub(caseStart).Milliseconds()
		latencies = append(latencies, float64(cr.LatencyMs))
		cr.Tokens = tokens
		cr.CostUSD = cost
		if err != nil {
			cr.Error = err.Error()
			cr.Passed = false
			result.Cases = append(result.Cases, cr)
			continue
		}
		cr.Answer = ans
		cr.Contexts = contexts

		cr.RetrievalHit = retrievalHit(contexts, c)
		cr.Faithfulness = faithfulness(ans, contexts)
		cr.AnswerRelevancy = relevancy(ans, c.Question)
		cr.ContextPrecision = contextPrecision(contexts, c.Question)

		if cr.Faithfulness < thresholds.FaithfulnessFail {
			cr.Warnings = append(cr.Warnings, fmt.Sprintf("忠实度 %.2f 低于失败阈值 %.2f", cr.Faithfulness, thresholds.FaithfulnessFail))
		}
		if cr.AnswerRelevancy < thresholds.RelevancyWarn {
			cr.Warnings = append(cr.Warnings, fmt.Sprintf("相关性 %.2f 低于告警阈值 %.2f", cr.AnswerRelevancy, thresholds.RelevancyWarn))
		}
		if !cr.RetrievalHit {
			cr.Warnings = append(cr.Warnings, "检索未命中参考答案")
		}
		cr.Passed = len(cr.Warnings) == 0
		result.Cases = append(result.Cases, cr)
	}

	result.FinishedAt = s.now()
	result.DurationMs = result.FinishedAt.Sub(started).Milliseconds()
	result.Summary = summarize(result.Cases, latencies, thresholds)

	s.mu.Lock()
	s.runs = append(s.runs, *result)
	if len(s.runs) > s.runCap {
		s.runs = s.runs[len(s.runs)-s.runCap:]
	}
	s.mu.Unlock()
	return result, nil
}

// summarize 汇总用例结果。
func summarize(cases []CaseResult, latencies []float64, thresholds EvalThresholds) EvalSummary {
	var sum EvalSummary
	if len(cases) == 0 {
		return sum
	}
	var f, r, p, cost float64
	var tokens, hits int
	for _, c := range cases {
		sum.Total++
		if c.Passed {
			sum.Passed++
		} else {
			sum.Failed++
		}
		if c.RetrievalHit {
			hits++
		}
		f += c.Faithfulness
		r += c.AnswerRelevancy
		p += c.ContextPrecision
		cost += c.CostUSD
		tokens += c.Tokens
	}
	n := float64(sum.Total)
	sum.PassRate = float64(sum.Passed) / n
	sum.AvgFaithfulness = f / n
	sum.AvgRelevancy = r / n
	sum.AvgPrecision = p / n
	sum.RetrievalHitRate = float64(hits) / n
	sum.LatencyP95 = Percentile(latencies, 95)
	sum.TotalCostUSD = cost
	sum.TotalTokens = tokens
	_ = thresholds
	return sum
}

// tokenSet 把文本切成用于重合度计算的小写 token 集合：英文按词，中文按单字。
//
// 为什么中文用单字而不是双字组：双字组会把「协议」拆成「么协/协议」这类依赖上下文的片段，
// 导致问题与答案的重合度被系统性低估（问句里的虚词会污染 bigram）。单字更稳定，
// 代价是区分度略低——因此本套指标是**词典重合度代理**，不是 RAGAS 的语义评分。
func tokenSet(text string) map[string]struct{} {
	out := make(map[string]struct{})
	lower := strings.ToLower(text)

	word := strings.Builder{}
	flushWord := func() {
		if word.Len() > 0 {
			out[word.String()] = struct{}{}
			word.Reset()
		}
	}
	for _, r := range lower {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			word.WriteRune(r)
		case r >= 0x4E00 && r <= 0x9FFF:
			flushWord()
			out[string(r)] = struct{}{}
		default:
			flushWord()
		}
	}
	flushWord()
	return out
}

// overlapRatio 计算 a 中有多少比例的 token 出现在 b 中。
func overlapRatio(a, b map[string]struct{}) float64 {
	if len(a) == 0 {
		return 0
	}
	hit := 0
	for k := range a {
		if _, ok := b[k]; ok {
			hit++
		}
	}
	return float64(hit) / float64(len(a))
}

// retrievalHit 判断召回上下文是否命中参考答案或关键词。
func retrievalHit(contexts []string, c EvalCase) bool {
	if len(contexts) == 0 {
		return false
	}
	expect := tokenSet(c.Reference)
	for _, kw := range c.Keywords {
		for k := range tokenSet(kw) {
			expect[k] = struct{}{}
		}
	}
	if len(expect) == 0 {
		expect = tokenSet(c.Question)
	}
	var merged map[string]struct{}
	for _, ctx := range contexts {
		ts := tokenSet(ctx)
		if merged == nil {
			merged = ts
			continue
		}
		for k := range ts {
			merged[k] = struct{}{}
		}
	}
	return overlapRatio(expect, merged) >= 0.3
}

// faithfulness 用「答案 token 落在上下文中的比例」近似忠实度。
func faithfulness(answer string, contexts []string) float64 {
	if strings.TrimSpace(answer) == "" {
		return 0
	}
	var merged map[string]struct{}
	for _, ctx := range contexts {
		ts := tokenSet(ctx)
		if merged == nil {
			merged = ts
			continue
		}
		for k := range ts {
			merged[k] = struct{}{}
		}
	}
	if merged == nil {
		return 0
	}
	return overlapRatio(tokenSet(answer), merged)
}

// relevancy 用「答案与问题 token 重合度」近似答案相关性。
func relevancy(answer, question string) float64 {
	if strings.TrimSpace(answer) == "" {
		return 0
	}
	return overlapRatio(tokenSet(question), tokenSet(answer))
}

// contextPrecision 计算召回上下文与问题相关的比例。
func contextPrecision(contexts []string, question string) float64 {
	if len(contexts) == 0 {
		return 0
	}
	q := tokenSet(question)
	if len(q) == 0 {
		return 0
	}
	hit := 0
	for _, ctx := range contexts {
		if overlapRatio(q, tokenSet(ctx)) > 0.15 {
			hit++
		}
	}
	return float64(hit) / float64(len(contexts))
}
