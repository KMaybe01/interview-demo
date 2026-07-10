package agent

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type MCPTool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Version     string `json:"version"`
	Endpoint    string `json:"endpoint"`
}

type A2ATool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	AgentType   string `json:"agentType"`
	Capabilities []string `json:"capabilities"`
}

var mcpTools = []MCPTool{
	{
		Name:        "web_search",
		Description: "搜索互联网获取实时信息",
		Version:     "1.0.0",
		Endpoint:    "/api/mcp/web-search",
	},
	{
		Name:        "calculator",
		Description: "执行数学计算和表达式求值",
		Version:     "1.0.0",
		Endpoint:    "/api/mcp/calculate",
	},
	{
		Name:        "knowledge_search",
		Description: "在知识库中搜索相关信息",
		Version:     "1.0.0",
		Endpoint:    "/api/knowledge-base/search",
	},
	{
		Name:        "get_current_time",
		Description: "获取当前日期和时间",
		Version:     "1.0.0",
		Endpoint:    "/api/mcp/current-time",
	},
	{
		Name:        "create_reminder",
		Description: "创建提醒事项",
		Version:     "1.0.0",
		Endpoint:    "/api/mcp/create-reminder",
	},
}

var a2aTools = []A2ATool{
	{
		Name:        "react_agent",
		Description: "ReAct 模式智能体：推理 + 行动循环",
		AgentType:   "react",
		Capabilities: []string{"reasoning", "tool_use", "planning"},
	},
	{
		Name:        "function_calling_agent",
		Description: "Function Calling 智能体：通过函数调用执行任务",
		AgentType:   "function",
		Capabilities: []string{"function_calling", "api_integration"},
	},
	{
		Name:        "multi_agent",
		Description: "多智能体系统：协调多个子智能体协作",
		AgentType:   "multi",
		Capabilities: []string{"delegation", "coordination", "workflow"},
	},
	{
		Name:        "rag_agent",
		Description: "RAG 智能体：基于知识库检索增强生成",
		AgentType:   "rag",
		Capabilities: []string{"retrieval", "generation", "knowledge_base"},
	},
}

// ListMCPTools  godoc
// @Summary     获取 MCP 工具列表
// @Description 返回所有可用的 MCP (Model Context Protocol) 工具
// @Tags        演示
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /mcp/tools [get]
func ListMCPTools(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"mcp_tools": mcpTools,
		"a2a_tools": a2aTools,
		"count":     len(mcpTools) + len(a2aTools),
	})
}
