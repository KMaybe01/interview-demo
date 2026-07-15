package vitals

import (
	"math"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type VitalsReport struct {
	Metric  string  `json:"metric"`
	Value   float64 `json:"value"`
	Rating  string  `json:"rating"`
	URL     string  `json:"url"`
	TTFB    float64 `json:"ttfb,omitempty"`
	FCP     float64 `json:"fcp,omitempty"`
	LCP     float64 `json:"lcp,omitempty"`
	CLS     float64 `json:"cls,omitempty"`
	INP     float64 `json:"inp,omitempty"`
	Version string  `json:"version"`
}

type VitalsRecord struct {
	Metric    string    `json:"metric"`
	Value     float64   `json:"value"`
	Rating    string    `json:"rating"`
	URL       string    `json:"url"`
	Timestamp time.Time `json:"timestamp"`
}

type VitalsSummary struct {
	Metric string  `json:"metric"`
	Value  float64 `json:"value"`
	Rating string  `json:"rating"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	Avg    float64 `json:"avg"`
	Count  int     `json:"count"`
}

var (
	vitalsMu    sync.RWMutex
	vitalsStore []VitalsRecord
	vitalsMax   = 2000
)

// ReportVitals  godoc
// @Summary     上报 Web Vitals
// @Description 上报前端 Web Vitals 指标（TTFB/FCP/LCP/CLS/INP），用于实时监控面板
// @Tags        演示
// @Accept      json
// @Produce     json
// @Param       body body     []VitalsReport true "Vitals 上报数组"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /vitals/report [post]
func ReportVitals(c *gin.Context) {
	var reports []VitalsReport
	if err := c.ShouldBindJSON(&reports); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	now := time.Now()

	vitalsMu.Lock()
	for _, r := range reports {
		vitalsStore = append(vitalsStore, VitalsRecord{
			Metric:    r.Metric,
			Value:     math.Round(r.Value*100) / 100,
			Rating:    r.Rating,
			URL:       r.URL,
			Timestamp: now,
		})
	}
	if len(vitalsStore) > vitalsMax {
		vitalsStore = vitalsStore[len(vitalsStore)-vitalsMax:]
	}
	vitalsMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"ok": true, "count": len(reports)})
}

// GetVitalsSummary  godoc
// @Summary     Web Vitals 汇总
// @Description 返回各指标最新值、最小值、最大值、平均值和统计次数
// @Tags        演示
// @Produce     json
// @Success     200 {array}  VitalsSummary
// @Router      /vitals/summary [get]
func VitalsSummaryReport(c *gin.Context) {
	vitalsMu.RLock()
	defer vitalsMu.RUnlock()

	type acc struct {
		sum   float64
		min   float64
		max   float64
		count int
	}
	latest := make(map[string]VitalsRecord)
	agg := make(map[string]*acc)

	for _, rec := range vitalsStore {
		latest[rec.Metric] = rec

		a, ok := agg[rec.Metric]
		if !ok {
			a = &acc{min: rec.Value, max: rec.Value}
			agg[rec.Metric] = a
		}
		a.sum += rec.Value
		a.count++
		if rec.Value < a.min {
			a.min = rec.Value
		}
		if rec.Value > a.max {
			a.max = rec.Value
		}
	}

	summary := make([]VitalsSummary, 0, len(latest))
	for _, metric := range sortedKeys(latest) {
		rec := latest[metric]
		a := agg[metric]
		summary = append(summary, VitalsSummary{
			Metric: metric,
			Value:  rec.Value,
			Rating: rec.Rating,
			Min:    math.Round(a.min*100) / 100,
			Max:    math.Round(a.max*100) / 100,
			Avg:    math.Round(a.sum/float64(a.count)*100) / 100,
			Count:  a.count,
		})
	}

	c.JSON(http.StatusOK, summary)
}

// GetVitalsHistory  godoc
// @Summary     Web Vitals 历史
// @Description 返回各指标按 metric 分组的时序历史数据
// @Tags        演示
// @Produce     json
// @Success     200 {object} map[string]interface{} "按 metric 分组的历史点阵"
// @Router      /vitals/history [get]
func VitalsHistory(c *gin.Context) {
	vitalsMu.RLock()
	defer vitalsMu.RUnlock()

	type point struct {
		Timestamp int64   `json:"t"`
		Value     float64 `json:"v"`
		Rating    string  `json:"rating"`
	}

	grouped := make(map[string][]point)
	for _, rec := range vitalsStore {
		grouped[rec.Metric] = append(grouped[rec.Metric], point{
			Timestamp: rec.Timestamp.UnixMilli(),
			Value:     rec.Value,
			Rating:    rec.Rating,
		})
	}

	c.JSON(http.StatusOK, grouped)
}

type TelemetryReport struct {
	Requests      int     `json:"requests"`
	Errors        int     `json:"errors"`
	AvgLatency    float64 `json:"avgLatency"`
	CacheHitRate  float64 `json:"cacheHitRate"`
	Timestamp     int64   `json:"timestamp"`
}

var (
	telemetryMu    sync.RWMutex
	telemetryStore []TelemetryReport
	telemetryMax   = 500
)

// ReportTelemetry  godoc
// @Summary     上报遥测数据
// @Description 上报前端 AI Demo 遥测数据（请求数、错误数、延迟、缓存命中率）
// @Tags        演示
// @Accept      json
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /telemetry/report [post]
func ReportTelemetry(c *gin.Context) {
	var report TelemetryReport
	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	report.Timestamp = time.Now().UnixMilli()
	telemetryMu.Lock()
	telemetryStore = append(telemetryStore, report)
	if len(telemetryStore) > telemetryMax {
		telemetryStore = telemetryStore[len(telemetryStore)-telemetryMax:]
	}
	telemetryMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GetTelemetryHistory  godoc
// @Summary     获取遥测历史
// @Description 返回所有遥测记录的历史数据
// @Tags        演示
// @Produce     json
// @Success     200 {array}  TelemetryReport
// @Router      /telemetry/history [get]
func GetTelemetryHistory(c *gin.Context) {
	telemetryMu.RLock()
	defer telemetryMu.RUnlock()

	result := make([]TelemetryReport, len(telemetryStore))
	copy(result, telemetryStore)
	c.JSON(http.StatusOK, result)
}

// GetTelemetrySummary  godoc
// @Summary     获取遥测汇总
// @Description 返回遥测数据的汇总统计
// @Tags        演示
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /telemetry/summary [get]
func GetTelemetrySummary(c *gin.Context) {
	telemetryMu.RLock()
	defer telemetryMu.RUnlock()

	if len(telemetryStore) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"totalRequests": 0,
			"totalErrors":   0,
			"avgLatency":    0,
			"cacheHitRate":  0,
			"count":         0,
		})
		return
	}

	var totalReq, totalErr int
	var totalLatency, totalCache float64
	for _, r := range telemetryStore {
		totalReq += r.Requests
		totalErr += r.Errors
		totalLatency += r.AvgLatency
		totalCache += r.CacheHitRate
	}
	n := float64(len(telemetryStore))
	last := telemetryStore[len(telemetryStore)-1]

	c.JSON(http.StatusOK, gin.H{
		"totalRequests": totalReq,
		"totalErrors":   totalErr,
		"avgLatency":    math.Round(totalLatency/n*100) / 100,
		"cacheHitRate":  math.Round(totalCache/n*100) / 100,
		"latest":        last,
		"count":         len(telemetryStore),
	})
}

// --- Monitor (前端监控埋点/错误/API/性能/降级) ---

type MonitorItem map[string]interface{}

var (
	monitorMu    sync.RWMutex
	monitorStore []MonitorItem
	monitorMax   = 2000
)

// ReportMonitor  godoc
// @Summary     上报前端监控数据
// @Description 上报前端监控数据（埋点/错误/API/性能/降级），支持单条或批量
// @Tags        演示
// @Accept      json
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /monitor/report [post]
func ReportMonitor(c *gin.Context) {
	var body interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	now := time.Now()
	items := make([]MonitorItem, 0)

	switch v := body.(type) {
	case []interface{}:
		for _, item := range v {
			if m, ok := item.(map[string]interface{}); ok {
				m["timestamp"] = now.UnixMilli()
				items = append(items, m)
			}
		}
	case map[string]interface{}:
		v["timestamp"] = now.UnixMilli()
		items = append(items, v)
	}

	monitorMu.Lock()
	monitorStore = append(monitorStore, items...)
	if len(monitorStore) > monitorMax {
		monitorStore = monitorStore[len(monitorStore)-monitorMax:]
	}
	monitorMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"ok": true, "count": len(items)})
}

// GetMonitorHistory  godoc
// @Summary     获取前端监控历史
// @Description 返回所有前端监控记录
// @Tags        演示
// @Produce     json
// @Success     200 {array}  MonitorItem
// @Router      /monitor/history [get]
func GetMonitorHistory(c *gin.Context) {
	monitorMu.RLock()
	defer monitorMu.RUnlock()

	result := make([]MonitorItem, len(monitorStore))
	copy(result, monitorStore)
	c.JSON(http.StatusOK, result)
}

// GetMonitorSummary  godoc
// @Summary     获取前端监控汇总
// @Description 返回前端监控数据的统计汇总（按类型、分类计数）
// @Tags        演示
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /monitor/summary [get]
func GetMonitorSummary(c *gin.Context) {
	monitorMu.RLock()
	defer monitorMu.RUnlock()

	byType := make(map[string]int)
	byCategory := make(map[string]int)
	var errors, apis, perfs int

	bundleMu.RLock()
	bundleCount := len(bundleStore)
	bundleMu.RUnlock()

		for _, item := range monitorStore {
			if t, ok := item["type"].(string); ok {
				byType[t]++
				switch t {
				case "error", "js_error", "promise_error", "resource_error", "business_error":
					errors++
				case "api", "api_error", "slow_api":
					if t == "api_error" {
						errors++
					}
					apis++
				case "performance":
					perfs++
				}
			}
		if cat, ok := item["category"].(string); ok && cat != "" {
			byCategory[cat]++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total":        len(monitorStore),
		"byType":       byType,
		"byCategory":   byCategory,
		"errors":       errors,
		"apis":         apis,
		"perfs":        perfs,
		"bundles":      bundleCount,
	})
}

// --- Bundle (JS/CSS bundle 加载耗时统计) ---

type BundleRecord struct {
	TotalLoadTime    float64   `json:"totalLoadTime"`
	TotalTransferSize float64  `json:"totalTransferSize"`
	TotalDecodedSize  float64  `json:"totalDecodedSize"`
	ChunkCount        int      `json:"chunkCount"`
	JSCount           int      `json:"jsCount"`
	CSSCount          int      `json:"cssCount"`
	JSTotalSize       float64  `json:"jsTotalSize"`
	CSSTotalSize      float64  `json:"cssTotalSize"`
	LargestChunkName  string   `json:"largestChunkName,omitempty"`
	LargestChunkSize  float64  `json:"largestChunkSize,omitempty"`
	SlowChunkCount    int      `json:"slowChunkCount"`
	URL               string   `json:"url"`
	Timestamp         time.Time `json:"timestamp"`
}

type BundleSummary struct {
	TotalLoadTime     float64  `json:"totalLoadTime"`
	AvgLoadTime       float64  `json:"avgLoadTime"`
	MinLoadTime       float64  `json:"minLoadTime"`
	MaxLoadTime       float64  `json:"maxLoadTime"`
	TotalTransferSize float64  `json:"totalTransferSize"`
	AvgTransferSize   float64  `json:"avgTransferSize"`
	TotalChunks       int      `json:"totalChunks"`
	TotalJSChunks     int      `json:"totalJSChunks"`
	TotalCSSChunks    int      `json:"totalCSSChunks"`
	AvgChunkCount     float64  `json:"avgChunkCount"`
	SlowBundleCount   int      `json:"slowBundleCount"`
	ReportCount       int      `json:"reportCount"`
}

var (
	bundleMu    sync.RWMutex
	bundleStore []BundleRecord
	bundleMax   = 500
)

// ReportBundle  godoc
// @Summary     上报 bundle 加载数据
// @Description 上报前端 JS/CSS bundle 加载耗时统计
// @Tags        演示
// @Accept      json
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /monitor/bundle/report [post]
func ReportBundle(c *gin.Context) {
	var record BundleRecord
	if err := c.ShouldBindJSON(&record); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	record.Timestamp = time.Now()
	bundleMu.Lock()
	bundleStore = append(bundleStore, record)
	if len(bundleStore) > bundleMax {
		bundleStore = bundleStore[len(bundleStore)-bundleMax:]
	}
	bundleMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GetBundleSummary  godoc
// @Summary     bundle 加载汇总
// @Description 返回 JS/CSS bundle 加载的汇总统计（总耗时、平均耗时、总大小、慢加载次数等）
// @Tags        演示
// @Produce     json
// @Success     200 {object} BundleSummary
// @Router      /monitor/bundle/summary [get]
func GetBundleSummary(c *gin.Context) {
	bundleMu.RLock()
	defer bundleMu.RUnlock()

	if len(bundleStore) == 0 {
		c.JSON(http.StatusOK, BundleSummary{})
		return
	}

	var sumLoadTime, sumTransferSize float64
	var minLoadTime, maxLoadTime float64
	var totalChunks, totalJSChunks, totalCSSChunks, slowCount int

	minLoadTime = bundleStore[0].TotalLoadTime

	for _, r := range bundleStore {
		sumLoadTime += r.TotalLoadTime
		sumTransferSize += r.TotalTransferSize
		totalChunks += r.ChunkCount
		totalJSChunks += r.JSCount
		totalCSSChunks += r.CSSCount

		if r.TotalLoadTime < minLoadTime {
			minLoadTime = r.TotalLoadTime
		}
		if r.TotalLoadTime > maxLoadTime {
			maxLoadTime = r.TotalLoadTime
		}
		if r.TotalLoadTime > 3000 {
			slowCount++
		}
	}

	n := float64(len(bundleStore))

	c.JSON(http.StatusOK, BundleSummary{
		TotalLoadTime:   math.Round(sumLoadTime*100) / 100,
		AvgLoadTime:     math.Round(sumLoadTime/n*100) / 100,
		MinLoadTime:     math.Round(minLoadTime*100) / 100,
		MaxLoadTime:     math.Round(maxLoadTime*100) / 100,
		TotalTransferSize: math.Round(sumTransferSize*100) / 100,
		AvgTransferSize:   math.Round(sumTransferSize/n*100) / 100,
		TotalChunks:     totalChunks,
		TotalJSChunks:   totalJSChunks,
		TotalCSSChunks:  totalCSSChunks,
		AvgChunkCount:   math.Round(float64(totalChunks)/n*100) / 100,
		SlowBundleCount: slowCount,
		ReportCount:     len(bundleStore),
	})
}

// GetBundleHistory  godoc
// @Summary     bundle 加载历史
// @Description 返回所有 bundle 加载记录的历史数据
// @Tags        演示
// @Produce     json
// @Success     200 {array}  BundleRecord
// @Router      /monitor/bundle/history [get]
func GetBundleHistory(c *gin.Context) {
	bundleMu.RLock()
	defer bundleMu.RUnlock()

	result := make([]BundleRecord, len(bundleStore))
	copy(result, bundleStore)
	c.JSON(http.StatusOK, result)
}

func sortedKeys(m map[string]VitalsRecord) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// --- Page Route / Render Tracking with Web Vitals ---

type PageReport struct {
	Path           string  `json:"path"`
	PageName       string  `json:"pageName"`
	RenderDuration float64 `json:"renderDuration"`
	LCP            float64 `json:"lcp"`
	INP            float64 `json:"inp"`
	CLS            float64 `json:"cls"`
	Referrer       string  `json:"referrer"`
}

type PageRecord struct {
	Path           string    `json:"path"`
	PageName       string    `json:"pageName"`
	RenderDuration float64   `json:"renderDuration"`
	LCP            float64   `json:"lcp"`
	INP            float64   `json:"inp"`
	CLS            float64   `json:"cls"`
	Referrer       string    `json:"referrer"`
	Timestamp      time.Time `json:"timestamp"`
}

type PageSummary struct {
	Path        string  `json:"path"`
	PageName    string  `json:"pageName"`
	Visits      int     `json:"visits"`
	AvgRenderMs float64 `json:"avgRenderMs"`
	MinRenderMs float64 `json:"minRenderMs"`
	MaxRenderMs float64 `json:"maxRenderMs"`
	AvgLCP      float64 `json:"avgLCP"`
	AvgINP      float64 `json:"avgINP"`
	AvgCLS      float64 `json:"avgCLS"`
	LatestLCP   float64 `json:"latestLCP"`
	LatestINP   float64 `json:"latestINP"`
	LatestCLS   float64 `json:"latestCLS"`
	LastVisit   int64   `json:"lastVisit"`
}

type PageHistoryEntry struct {
	Timestamp      int64   `json:"t"`
	RenderDuration float64 `json:"renderDuration"`
	LCP            float64 `json:"lcp"`
	INP            float64 `json:"inp"`
	CLS            float64 `json:"cls"`
	Referrer       string  `json:"referrer"`
}

var (
	pageMu    sync.RWMutex
	pageStore []PageRecord
	pageMax   = 1000
)

// ReportPage  godoc
// @Summary     上报页面渲染数据
// @Description 上报前端页面渲染指标（渲染耗时、LCP/INP/CLS），用于页面性能分析
// @Tags        演示
// @Accept      json
// @Produce     json
// @Param       body body     []PageReport true "页面报告数组"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /vitals/page-report [post]
func ReportPage(c *gin.Context) {
	var reports []PageReport
	if err := c.ShouldBindJSON(&reports); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	now := time.Now()
	pageMu.Lock()
	for _, r := range reports {
		pageStore = append(pageStore, PageRecord{
			Path:           r.Path,
			PageName:       r.PageName,
			RenderDuration: math.Round(r.RenderDuration*100) / 100,
			LCP:            r.LCP,
			INP:            r.INP,
			CLS:            r.CLS,
			Referrer:       r.Referrer,
			Timestamp:      now,
		})
	}
	if len(pageStore) > pageMax {
		pageStore = pageStore[len(pageStore)-pageMax:]
	}
	pageMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"ok": true, "count": len(reports)})
}

type pageAcc struct {
	count     int
	sum       float64
	min       float64
	max       float64
	sumLCP    float64
	sumINP    float64
	sumCLS    float64
	latestLCP float64
	latestINP float64
	latestCLS float64
	last      time.Time
	name      string
}

// GetPageSummary  godoc
// @Summary     页面性能汇总
// @Description 返回各页面路径的访问次数、渲染耗时统计（平均/最小/最大）、Web Vitals 均值
// @Tags        演示
// @Produce     json
// @Success     200 {array}  PageSummary
// @Router      /vitals/pages [get]
func PageSummaryReport(c *gin.Context) {
	pageMu.RLock()
	defer pageMu.RUnlock()

	agg := make(map[string]*pageAcc)
	order := make([]string, 0)

	for _, rec := range pageStore {
		a, ok := agg[rec.Path]
		if !ok {
			a = &pageAcc{min: rec.RenderDuration, max: rec.RenderDuration, name: rec.PageName}
			agg[rec.Path] = a
			order = append(order, rec.Path)
		}
		a.count++
		a.sum += rec.RenderDuration
		a.sumLCP += rec.LCP
		a.sumINP += rec.INP
		a.sumCLS += rec.CLS
		if rec.LCP > 0 {
			a.latestLCP = rec.LCP
		}
		if rec.INP > 0 {
			a.latestINP = rec.INP
		}
		if rec.CLS > 0 {
			a.latestCLS = rec.CLS
		}
		if rec.RenderDuration < a.min {
			a.min = rec.RenderDuration
		}
		if rec.RenderDuration > a.max {
			a.max = rec.RenderDuration
		}
		if rec.Timestamp.After(a.last) {
			a.last = rec.Timestamp
			a.name = rec.PageName
		}
	}

	summary := make([]PageSummary, 0, len(order))
	for _, path := range order {
		a := agg[path]
		summary = append(summary, PageSummary{
			Path:        path,
			PageName:    a.name,
			Visits:      a.count,
			AvgRenderMs: math.Round(a.sum/float64(a.count)*100) / 100,
			MinRenderMs: a.min,
			MaxRenderMs: a.max,
			AvgLCP:      math.Round(a.sumLCP/float64(a.count)*100) / 100,
			AvgINP:      math.Round(a.sumINP/float64(a.count)*100) / 100,
			AvgCLS:      math.Round(a.sumCLS/float64(a.count)*100) / 100,
			LatestLCP:   math.Round(a.latestLCP*100) / 100,
			LatestINP:   math.Round(a.latestINP*100) / 100,
			LatestCLS:   math.Round(a.latestCLS*100) / 100,
			LastVisit:   a.last.UnixMilli(),
		})
	}

	c.JSON(http.StatusOK, summary)
}

// GetPageHistory  godoc
// @Summary     页面性能历史
// @Description 返回各页面路径按 path 分组的时序历史数据
// @Tags        演示
// @Produce     json
// @Success     200 {object} map[string]interface{} "按 path 分组的历史点阵"
// @Router      /vitals/page-history [get]
func PageHistory(c *gin.Context) {
	pageMu.RLock()
	defer pageMu.RUnlock()

	grouped := make(map[string][]PageHistoryEntry)
	for _, rec := range pageStore {
		grouped[rec.Path] = append(grouped[rec.Path], PageHistoryEntry{
			Timestamp:      rec.Timestamp.UnixMilli(),
			RenderDuration: rec.RenderDuration,
			LCP:            rec.LCP,
			INP:            rec.INP,
			CLS:            rec.CLS,
			Referrer:       rec.Referrer,
		})
	}

	c.JSON(http.StatusOK, grouped)
}
