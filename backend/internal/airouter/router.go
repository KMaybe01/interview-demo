package airouter

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"interview-demo/backend/internal/a2a"
	"interview-demo/backend/internal/mcp"
	"interview-demo/backend/internal/tool"
)

// RegisterRoutes 注册 /api/ai/* 全部路由。
//
// 分组约定（与 MCP / A2A 的分工一致）：
//
//	/api/ai/chat*        聊天（LLM + RAG + 工具 + HITL）
//	/api/ai/tools*       工具注册中心
//	/api/ai/approvals*   人工确认工单（HITL）
//	/api/ai/obs*         LLMOps 可观测
//	/api/ai/eval*        离线评测
//	/api/ai/prompts*     Prompt 版本管理
//	/api/ai/mcp          MCP 2026-07-28 Streamable HTTP 单端点
//	/api/ai/a2a/*        A2A v1.0（Agent ↔ Agent）
func RegisterRoutes(g *gin.RouterGroup, h *Handler, mcpServer *mcp.Server, a2aServer *a2a.Server) {
	g.GET("/models", h.ListModels)
	g.POST("/chat", h.Chat)
	g.POST("/chat/stream", h.ChatStream)

	g.GET("/tools", h.ListTools)
	g.POST("/tools/call", h.CallTool)

	g.GET("/approvals", h.ListApprovals)
	g.POST("/approvals/:id/resolve", h.ResolveApproval)

	g.GET("/obs/metrics", h.Metrics)
	g.GET("/obs/runs", h.ListRuns)
	g.GET("/obs/traces", h.ListTraces)
	g.GET("/obs/traces/:traceId", h.GetTrace)
	g.GET("/obs/audit", h.ToolAudit)

	g.GET("/eval/datasets", h.ListDatasets)
	g.POST("/eval/datasets", h.CreateDataset)
	g.POST("/eval/run", h.RunEval)
	g.GET("/eval/runs", h.ListEvalRuns)

	g.GET("/prompts", h.ListPrompts)
	g.POST("/prompts", h.CreatePrompt)
	g.GET("/prompts/:name/versions", h.PromptHistory)
	g.POST("/prompts/:name/activate", h.ActivatePrompt)

	if mcpServer != nil {
		// MCP 单端点（Streamable HTTP，无状态）
		g.POST("/mcp", mcpServer.Handle)
		g.GET("/mcp/tools", func(c *gin.Context) {
			tools := mcpServer.Registry().Tools()
			c.JSON(http.StatusOK, gin.H{"tools": tools, "count": len(tools)})
		})
	}

	if a2aServer != nil {
		a2aServer.RegisterRoutes(g.Group("/a2a"))
	}
}

// toolMCPAdapter 把 internal/tool 的注册中心适配成 MCP 的 ToolProvider，
// 让「Agent 工具」与「MCP 工具」共用同一份实现与同一套权限/沙箱/审计。
type toolMCPAdapter struct {
	registry *tool.Registry
}

// NewToolMCPAdapter 创建一个适配器。
func NewToolMCPAdapter(r *tool.Registry) mcp.ToolProvider {
	return &toolMCPAdapter{registry: r}
}

// ListTools 返回工具定义（转换为 MCP schema）。
func (a *toolMCPAdapter) ListTools() []mcp.Tool {
	defs := a.registry.List()
	out := make([]mcp.Tool, 0, len(defs))
	for _, d := range defs {
		schema := d.Parameters
		if schema == nil {
			schema = map[string]any{"type": "object", "properties": map[string]any{}}
		}
		out = append(out, mcp.Tool{Name: d.Name, Description: d.Description, InputSchema: schema})
	}
	return out
}

// CallTool 执行工具；未经人工确认的中高风险工具返回 MCP 层面的错误，
// 由调用方走 /api/ai/approvals 放行后重试。
func (a *toolMCPAdapter) CallTool(ctx context.Context, name string, arguments map[string]any) (*mcp.CallToolResult, error) {
	if arguments == nil {
		arguments = map[string]any{}
	}
	// MCP 通道默认以 L1 档位执行：L2 及以上必须先在 HTTP 侧完成 HITL 审批
	result, err := a.registry.Execute(ctx, name, arguments, tool.ExecuteOptions{
		Tier: tool.LevelWrite,
		User: "mcp",
	})
	if err != nil {
		return nil, mcp.NewRPCError(mcp.ErrCodeInternal, err.Error())
	}
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: result.Content}},
		IsError: result.IsError,
	}, nil
}
