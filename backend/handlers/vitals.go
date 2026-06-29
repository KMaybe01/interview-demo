package handlers

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

func GetVitalsSummary(c *gin.Context) {
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

func GetVitalsHistory(c *gin.Context) {
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

func GetPageSummary(c *gin.Context) {
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

func GetPageHistory(c *gin.Context) {
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
