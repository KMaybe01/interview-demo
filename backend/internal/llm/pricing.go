package llm

import (
	"strings"
	"sync"
)

// Price 是单位价格：美元 / 每 1M token。
type Price struct {
	Input  float64 `json:"input"`
	Output float64 `json:"output"`
}

// PricingTable 是模型价格表。
//
// 价格**会变动**，因此这里只作为内置默认值，生产环境应通过
// UpdatePrice / LoadPricing 从配置中心或数据库覆盖，切勿视为长期事实。
type PricingTable struct {
	mu       sync.RWMutex
	prices   map[string]Price
	fallback Price
}

// NewPricingTable 创建一张带有内置默认价格的价格表。
func NewPricingTable() *PricingTable {
	return &PricingTable{
		prices:   defaultPrices(),
		fallback: Price{Input: 0.15, Output: 0.6},
	}
}

// defaultPrices 内置默认价格（美元 / 每 1M token）。
func defaultPrices() map[string]Price {
	return map[string]Price{
		// OpenAI
		"gpt-4o":                 {Input: 2.5, Output: 10},
		"gpt-4o-mini":            {Input: 0.15, Output: 0.6},
		"gpt-4.1":                {Input: 2.0, Output: 8.0},
		"gpt-4.1-mini":           {Input: 0.4, Output: 1.6},
		"o3":                     {Input: 2.0, Output: 8.0},
		"o4-mini":                {Input: 0.4, Output: 1.6},
		"text-embedding-3-small": {Input: 0.02, Output: 0},
		"text-embedding-3-large": {Input: 0.13, Output: 0},
		// DeepSeek
		"deepseek-chat":     {Input: 0.27, Output: 1.10},
		"deepseek-reasoner": {Input: 0.55, Output: 2.19},
		// Gemini
		"gemini-2.5-flash": {Input: 0.15, Output: 0.6},
		"gemini-2.5-pro":   {Input: 1.25, Output: 10.0},
		// Qwen（阿里云 DashScope OpenAI 兼容）
		"qwen-plus":  {Input: 0.4, Output: 1.2},
		"qwen-max":   {Input: 1.6, Output: 6.4},
		"qwen-turbo": {Input: 0.05, Output: 0.2},
		// 本地模型（Ollama 等）不产生 API 费用
		"llama3.1": {Input: 0, Output: 0},
		"qwen2.5":  {Input: 0, Output: 0},
	}
}

// UpdatePrice 覆盖或新增一个模型的单价。
func (t *PricingTable) UpdatePrice(model string, price Price) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.prices[strings.ToLower(model)] = price
}

// Lookup 查询模型单价；未命中时按前缀模糊匹配，仍失败则返回兜底价并把 Estimated 置为 true。
func (t *PricingTable) Lookup(model string) (Price, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	key := strings.ToLower(model)
	if price, ok := t.prices[key]; ok {
		return price, true
	}
	// 模糊匹配：支持 gpt-4o-mini-2024-07-18 这类带日期后缀的 ID
	for known, price := range t.prices {
		if strings.HasPrefix(key, known) {
			return price, true
		}
	}
	return t.fallback, false
}

// Estimate 估算一次调用的成本。
func (t *PricingTable) Estimate(model string, usage Usage) Cost {
	price, exact := t.Lookup(model)
	cost := Cost{
		Input:     float64(usage.PromptTokens) / 1_000_000 * price.Input,
		Output:    float64(usage.CompletionTokens) / 1_000_000 * price.Output,
		Currency:  "USD",
		Estimated: !exact,
	}
	cost.Total = cost.Input + cost.Output
	return cost
}

// DefaultPricing 是进程级共享价格表。
var DefaultPricing = NewPricingTable()

// EstimateCost 用默认价格表估算成本。
func EstimateCost(model string, usage Usage) Cost {
	return DefaultPricing.Estimate(model, usage)
}
