package airouter

import (
	"context"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"interview-demo/backend/internal/llm"
	"interview-demo/backend/internal/obs"
	"interview-demo/backend/internal/tool"
)

// Handler 承载 /api/ai/* 的全部 HTTP 处理函数。
type Handler struct {
	svc *Service
}

// NewHandler 创建 handler。
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Service 返回底层服务。
func (h *Handler) Service() *Service { return h.svc }

// ---------------------------------------------------------------- 模型

// ListModels 返回全部可用模型及其配置状态。
func (h *Handler) ListModels(c *gin.Context) {
	models := h.svc.llm.ListModels()
	items := make([]gin.H, 0, len(models))
	for _, m := range models {
		provider, _ := h.svc.llm.Get(m.Provider)
		items = append(items, gin.H{
			"id":            m.ID,
			"name":          m.Name,
			"provider":      m.Provider,
			"contextWindow": m.ContextWindow,
			"maxOutput":     m.MaxOutput,
			"capabilities":  m.Capabilities,
			"available":     provider != nil && provider.Configured(),
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"models":    items,
		"providers": h.svc.llm.ListProviders(),
		"count":     len(items),
	})
}

// ---------------------------------------------------------------- 聊天

// Chat 非流式聊天。
func (h *Handler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}
	outcome, err := h.svc.Chat(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, outcome)
}

// ChatStream 流式聊天（SSE）。
func (h *Handler) ChatStream(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}

	events, err := h.svc.ChatStream(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	writeSSEHeaders(c)
	ctx := c.Request.Context()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case ev, open := <-events:
			if !open {
				return false
			}
			frame, err := EncodeSSE(ev)
			if err != nil {
				return false
			}
			_, _ = w.Write([]byte(frame))
			// done / error 之后结束流
			return ev.Type != EventDone && ev.Type != EventError
		case <-ticker.C:
			_, _ = w.Write([]byte(": ping\n\n"))
			return true
		case <-ctx.Done():
			return false
		}
	})
}

// ---------------------------------------------------------------- 工具

// ListTools 返回工具清单与调用统计。
func (h *Handler) ListTools(c *gin.Context) {
	defs := h.svc.tools.List()
	stats := h.svc.tools.Stats()
	items := make([]gin.H, 0, len(defs))
	for _, d := range defs {
		items = append(items, gin.H{
			"name":          d.Name,
			"description":   d.Description,
			"parameters":    d.Parameters,
			"level":         d.Level.String(),
			"levelCode":     int(d.Level),
			"source":        d.Source,
			"idempotent":    d.Idempotent,
			"timeoutMs":     d.TimeoutOrDefault().Milliseconds(),
			"calls":         stats[d.Name],
			"needsApproval": d.Level > h.svc.cfg.DefaultTier,
		})
	}
	c.JSON(http.StatusOK, gin.H{"tools": items, "count": len(items), "tier": h.svc.cfg.DefaultTier.String()})
}

// CallTool 直接执行一次工具（供前端调试与 MCP 网关复用）。
func (h *Handler) CallTool(c *gin.Context) {
	var body struct {
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
		Approved  bool           `json:"approved"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}
	if body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数 name 必填"})
		return
	}
	if body.Arguments == nil {
		body.Arguments = map[string]any{}
	}

	// 需要审批的工具：先建工单，拿到放行后再调用
	if !body.Approved {
		def, err := h.svc.tools.Get(body.Name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if def.Level > h.svc.cfg.DefaultTier {
			ticket := h.svc.approvals.Create("", body.Name, body.Arguments, def.Level,
				"直接调用需要人工确认："+def.Level.String())
			c.JSON(http.StatusAccepted, gin.H{
				"status":    "approval_required",
				"ticketId":  ticket.ID,
				"toolName":  ticket.ToolName,
				"level":     ticket.Level.String(),
				"reason":    ticket.Reason,
				"expiresAt": ticket.ExpiresAt,
			})
			return
		}
	}

	result, err := h.svc.tools.Execute(c.Request.Context(), body.Name, body.Arguments, tool.ExecuteOptions{
		Tier:     h.svc.cfg.DefaultTier,
		Approved: true,
		User:     c.GetHeader("X-User-Id"),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------- HITL 审批

// ListApprovals 返回待人工确认的工单。
func (h *Handler) ListApprovals(c *gin.Context) {
	tickets := h.svc.approvals.Pending()
	items := make([]gin.H, 0, len(tickets))
	for _, t := range tickets {
		items = append(items, gin.H{
			"id":         t.ID,
			"toolName":   t.ToolName,
			"toolCallId": t.ToolCallID,
			"arguments":  t.Arguments,
			"level":      t.Level.String(),
			"reason":     t.Reason,
			"createdAt":  t.CreatedAt,
			"expiresAt":  t.ExpiresAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"tickets": items, "count": len(items)})
}

// ResolveApproval 放行或拒绝一个工单。
func (h *Handler) ResolveApproval(c *gin.Context) {
	var body struct {
		Approve bool `json:"approve"`
	}
	_ = c.ShouldBindJSON(&body)

	ticket, approved := h.svc.approvals.Resolve(c.Param("id"), body.Approve)
	if ticket == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "工单不存在或已过期"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"ticketId":   ticket.ID,
		"toolName":   ticket.ToolName,
		"toolCallId": ticket.ToolCallID,
		"approved":   approved,
		"resolvedAt": time.Now(),
	})
}

// ---------------------------------------------------------------- 可观测

// Metrics 返回 AI 侧指标聚合。
func (h *Handler) Metrics(c *gin.Context) {
	since, bucket := parseWindow(c.Query("window"))
	c.JSON(http.StatusOK, h.svc.recorder.Metrics(since, bucket))
}

// ListRuns 返回运行记录。
func (h *Handler) ListRuns(c *gin.Context) {
	limit := intQuery(c, "limit", 50)
	c.JSON(http.StatusOK, gin.H{"runs": h.svc.recorder.Runs(limit), "counters": h.svc.recorder.Counters()})
}

// ListTraces 返回链路列表。
func (h *Handler) ListTraces(c *gin.Context) {
	limit := intQuery(c, "limit", 20)
	c.JSON(http.StatusOK, gin.H{"traces": h.svc.recorder.ListTraces(limit)})
}

// GetTrace 返回单条链路详情。
func (h *Handler) GetTrace(c *gin.Context) {
	trace, ok := h.svc.recorder.GetTrace(c.Param("traceId"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "链路不存在：" + c.Param("traceId")})
		return
	}
	c.JSON(http.StatusOK, trace)
}

// ToolAudit 返回工具审计日志与汇总。
func (h *Handler) ToolAudit(c *gin.Context) {
	limit := intQuery(c, "limit", 100)
	c.JSON(http.StatusOK, gin.H{
		"events":  h.svc.tools.Audit().List(limit),
		"summary": h.svc.tools.Audit().Summary(),
		"calls":   h.svc.tools.Stats(),
	})
}

// ---------------------------------------------------------------- 评测

// ListDatasets 返回评测数据集。
func (h *Handler) ListDatasets(c *gin.Context) {
	sets := h.svc.evals.ListDatasets()
	c.JSON(http.StatusOK, gin.H{"datasets": sets, "count": len(sets)})
}

// CreateDataset 新建评测数据集。
func (h *Handler) CreateDataset(c *gin.Context) {
	var body struct {
		Name  string         `json:"name"`
		Cases []obs.EvalCase `json:"cases"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}
	if body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数 name 必填"})
		return
	}
	for i := range body.Cases {
		if body.Cases[i].ID == "" {
			body.Cases[i].ID = "case-" + strconv.Itoa(i+1)
		}
	}
	ds := h.svc.evals.CreateDataset(body.Name, body.Cases)
	c.JSON(http.StatusCreated, ds)
}

// RunEval 对指定数据集执行一次评测。
func (h *Handler) RunEval(c *gin.Context) {
	var body struct {
		DatasetID       string             `json:"datasetId"`
		TopK            int                `json:"topK"`
		KnowledgeBaseID string             `json:"knowledgeBaseId"`
		Thresholds      obs.EvalThresholds `json:"thresholds"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}
	if h.svc.retriever == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "未接入知识库检索器，无法执行评测"})
		return
	}
	retriever := h.svc.retriever
	kbID := body.KnowledgeBaseID
	model := h.svc.cfg.DefaultModel

	answerFn := func(ctx context.Context, question string, topK int) (string, []string, int, float64, error) {
		hits, err := retriever.Search(ctx, kbID, question, topK)
		if err != nil {
			return "", nil, 0, 0, err
		}
		contexts := make([]string, 0, len(hits))
		var b strings.Builder
		for i, hit := range hits {
			contexts = append(contexts, hit.Content)
			b.WriteString("[")
			b.WriteString(strconv.Itoa(i + 1))
			b.WriteString("] ")
			b.WriteString(hit.Content)
			b.WriteString("\n\n")
		}

		prompt := "请仅依据下列上下文回答问题，不要编造；上下文未覆盖时说明未找到。\n\n" + b.String() + "问题：" + question
		resp, err := h.svc.llm.Chat(ctx, llm.Request{
			Model:    model,
			Messages: []llm.Message{{Role: llm.RoleUser, Content: prompt}},
		})
		if err != nil {
			return "", contexts, 0, 0, err
		}
		cost := llm.EstimateCost(model, resp.Usage)
		return resp.Content, contexts, resp.Usage.TotalTokens, cost.Total, nil
	}

	result, err := h.svc.evals.RunEval(c.Request.Context(), body.DatasetID, body.TopK, body.Thresholds, answerFn)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "不存在") {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// ListEvalRuns 返回历史评测结果。
func (h *Handler) ListEvalRuns(c *gin.Context) {
	limit := intQuery(c, "limit", 20)
	c.JSON(http.StatusOK, gin.H{"runs": h.svc.evals.Runs(limit)})
}

// ---------------------------------------------------------------- Prompt

// ListPrompts 返回全部提示词的激活版本。
func (h *Handler) ListPrompts(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"prompts": h.svc.prompts.List()})
}

// PromptHistory 返回某个提示词的全部版本。
func (h *Handler) PromptHistory(c *gin.Context) {
	name := c.Param("name")
	history := h.svc.prompts.History(name)
	if len(history) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "提示词不存在：" + name})
		return
	}
	c.JSON(http.StatusOK, gin.H{"name": name, "versions": history})
}

// CreatePrompt 新增一个提示词版本。
func (h *Handler) CreatePrompt(c *gin.Context) {
	var body struct {
		Name     string   `json:"name"`
		Content  string   `json:"content"`
		Comment  string   `json:"comment"`
		Tags     []string `json:"tags"`
		Activate bool     `json:"activate"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}
	if body.Name == "" || body.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数 name 与 content 必填"})
		return
	}
	tpl := h.svc.prompts.Create(body.Name, body.Content, body.Comment, body.Tags)
	if body.Activate {
		_ = h.svc.prompts.Activate(body.Name, tpl.Version)
		tpl.Active = true
	}
	c.JSON(http.StatusCreated, tpl)
}

// ActivatePrompt 激活指定版本（可用于灰度回滚）。
func (h *Handler) ActivatePrompt(c *gin.Context) {
	var body struct {
		Name    string `json:"name"`
		Version int    `json:"version"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}
	if body.Name == "" {
		body.Name = c.Param("name")
	}
	if err := h.svc.prompts.Activate(body.Name, body.Version); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	tpl, _ := h.svc.prompts.Get(body.Name, body.Version)
	c.JSON(http.StatusOK, tpl)
}

// ---------------------------------------------------------------- 工具函数

// writeSSEHeaders 设置 SSE 响应头。
func writeSSEHeaders(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
}

// parseWindow 解析时间窗口参数，返回起始时间与分桶粒度。
func parseWindow(window string) (time.Time, time.Duration) {
	now := time.Now()
	switch strings.TrimSpace(window) {
	case "1h", "":
		return now.Add(-time.Hour), 5 * time.Minute
	case "6h":
		return now.Add(-6 * time.Hour), 15 * time.Minute
	case "24h", "1d":
		return now.Add(-24 * time.Hour), time.Hour
	case "7d":
		return now.Add(-7 * 24 * time.Hour), 6 * time.Hour
	case "30d":
		return now.Add(-30 * 24 * time.Hour), 24 * time.Hour
	}
	if d, err := time.ParseDuration(window); err == nil && d > 0 {
		return now.Add(-d), d / 20
	}
	return now.Add(-time.Hour), 5 * time.Minute
}

// intQuery 解析整数查询参数。
func intQuery(c *gin.Context, key string, fallback int) int {
	v := c.Query(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	if n > 500 {
		return 500
	}
	return n
}
