package obs

import (
	"sort"
	"time"
)

// sortByStartDesc 按开始时间倒序排列链路。
func sortByStartDesc(traces []*Trace) {
	sort.Slice(traces, func(i, j int) bool { return traces[i].Start.After(traces[j].Start) })
}

// Percentile 计算分位数；p 取 0~100。空切片返回 0。
func Percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	if p < 0 {
		p = 0
	}
	if p > 100 {
		p = 100
	}
	sorted := append([]float64{}, values...)
	sort.Float64s(sorted)
	if len(sorted) == 1 {
		return sorted[0]
	}
	rank := p / 100 * float64(len(sorted)-1)
	lower := int(rank)
	upper := lower + 1
	if upper >= len(sorted) {
		return sorted[lower]
	}
	frac := rank - float64(lower)
	return sorted[lower] + (sorted[upper]-sorted[lower])*frac
}

// Bucket 是时间序列上的一个桶。
type Bucket struct {
	Timestamp  time.Time `json:"timestamp"`
	Requests   int       `json:"requests"`
	Errors     int       `json:"errors"`
	Tokens     int       `json:"tokens"`
	CostUSD    float64   `json:"costUsd"`
	AvgLatency float64   `json:"avgLatencyMs"`
}

// MetricsResult 是指标聚合结果。
type MetricsResult struct {
	Window        string       `json:"window"`
	Since         time.Time    `json:"since"`
	Requests      int          `json:"requests"`
	Errors        int          `json:"errors"`
	ErrorRate     float64      `json:"errorRate"`
	DegradedRate  float64      `json:"degradedRate"`
	CacheHitRate  float64      `json:"cacheHitRate"`
	Tokens        int          `json:"tokens"`
	PromptTokens  int          `json:"promptTokens"`
	OutputTokens  int          `json:"outputTokens"`
	CostUSD       float64      `json:"costUsd"`
	AvgCostPerReq float64      `json:"avgCostPerReq"`
	Latency       LatencyStats `json:"latency"`
	TTFT          LatencyStats `json:"ttft"`
	ByModel       []GroupStat  `json:"byModel"`
	ByProvider    []GroupStat  `json:"byProvider"`
	ByKind        []GroupStat  `json:"byKind"`
	Timeline      []Bucket     `json:"timeline"`
}

// LatencyStats 是一组分位统计。
type LatencyStats struct {
	P50 float64 `json:"p50"`
	P90 float64 `json:"p90"`
	P95 float64 `json:"p95"`
	P99 float64 `json:"p99"`
	Avg float64 `json:"avg"`
	Max float64 `json:"max"`
}

// GroupStat 是按某个维度分组的统计。
type GroupStat struct {
	Key        string  `json:"key"`
	Requests   int     `json:"requests"`
	Tokens     int     `json:"tokens"`
	CostUSD    float64 `json:"costUsd"`
	Errors     int     `json:"errors"`
	AvgLatency float64 `json:"avgLatencyMs"`
}

// Metrics 对窗口期内的运行记录做聚合。
//
// 采集维度对应生产化文档的 5 个面板：用户体验（TTFT/延迟分位）、
// 模型质量（错误率/降级率）、成本（token 与金额、模型分布）、
// 系统健康（错误率、缓存命中率）、业务（按 kind 分布）。
func (r *Recorder) Metrics(since time.Time, bucketSize time.Duration) MetricsResult {
	runs := r.RunsSince(since)
	if bucketSize <= 0 {
		bucketSize = time.Hour
	}

	res := MetricsResult{
		Window:     bucketSize.String(),
		Since:      since,
		ByModel:    []GroupStat{},
		ByProvider: []GroupStat{},
		ByKind:     []GroupStat{},
		Timeline:   []Bucket{},
	}

	latencies := make([]float64, 0, len(runs))
	ttfts := make([]float64, 0, len(runs))
	byModel := make(map[string]*GroupStat)
	byProvider := make(map[string]*GroupStat)
	byKind := make(map[string]*GroupStat)
	buckets := make(map[int64]*Bucket)

	for _, run := range runs {
		res.Requests++
		res.Tokens += run.TotalTokens
		res.PromptTokens += run.PromptTokens
		res.OutputTokens += run.CompletionTokens
		res.CostUSD += run.CostUSD
		if run.Status == "error" {
			res.Errors++
		}
		if run.Degraded {
			res.DegradedRate++
		}
		if run.CacheHit {
			res.CacheHitRate++
		}
		latencies = append(latencies, float64(run.LatencyMs))
		if run.TTFTMs > 0 {
			ttfts = append(ttfts, float64(run.TTFTMs))
		}

		accumulate(byModel, run.Model, run)
		accumulate(byProvider, run.Provider, run)
		accumulate(byKind, string(run.Kind), run)

		bucketTs := run.CreatedAt.Truncate(bucketSize).Unix()
		b, ok := buckets[bucketTs]
		if !ok {
			b = &Bucket{Timestamp: run.CreatedAt.Truncate(bucketSize)}
			buckets[bucketTs] = b
		}
		b.Requests++
		b.Tokens += run.TotalTokens
		b.CostUSD += run.CostUSD
		if run.Status == "error" {
			b.Errors++
		}
		b.AvgLatency += float64(run.LatencyMs)
	}

	if res.Requests > 0 {
		res.ErrorRate = float64(res.Errors) / float64(res.Requests)
		res.DegradedRate = res.DegradedRate / float64(res.Requests)
		res.CacheHitRate = res.CacheHitRate / float64(res.Requests)
		res.AvgCostPerReq = res.CostUSD / float64(res.Requests)
	}

	res.Latency = buildLatencyStats(latencies)
	res.TTFT = buildLatencyStats(ttfts)
	res.ByModel = finalizeGroups(byModel)
	res.ByProvider = finalizeGroups(byProvider)
	res.ByKind = finalizeGroups(byKind)

	keys := make([]int64, 0, len(buckets))
	for k := range buckets {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
	for _, k := range keys {
		b := buckets[k]
		if b.Requests > 0 {
			b.AvgLatency /= float64(b.Requests)
		}
		res.Timeline = append(res.Timeline, *b)
	}
	return res
}

// accumulate 把一个 run 累加到分组统计中。
func accumulate(m map[string]*GroupStat, key string, run Run) {
	if key == "" {
		key = "unknown"
	}
	g, ok := m[key]
	if !ok {
		g = &GroupStat{Key: key}
		m[key] = g
	}
	g.Requests++
	g.Tokens += run.TotalTokens
	g.CostUSD += run.CostUSD
	g.AvgLatency += float64(run.LatencyMs)
	if run.Status == "error" {
		g.Errors++
	}
}

// finalizeGroups 把分组 map 转成有序切片并计算均值。
func finalizeGroups(m map[string]*GroupStat) []GroupStat {
	out := make([]GroupStat, 0, len(m))
	for _, g := range m {
		if g.Requests > 0 {
			g.AvgLatency /= float64(g.Requests)
		}
		out = append(out, *g)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Requests > out[j].Requests })
	return out
}

// buildLatencyStats 计算一组延迟数值的分位统计。
func buildLatencyStats(values []float64) LatencyStats {
	if len(values) == 0 {
		return LatencyStats{}
	}
	var sum float64
	var max float64
	for _, v := range values {
		sum += v
		if v > max {
			max = v
		}
	}
	return LatencyStats{
		P50: Percentile(values, 50),
		P90: Percentile(values, 90),
		P95: Percentile(values, 95),
		P99: Percentile(values, 99),
		Avg: sum / float64(len(values)),
		Max: max,
	}
}
