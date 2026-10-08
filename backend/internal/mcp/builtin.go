package mcp

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"interview-demo/backend/internal/tool"
)

// ToolHandler 是 StaticProvider 中单个工具的执行函数。
type ToolHandler func(ctx context.Context, args map[string]any) (*CallToolResult, error)

// StaticProvider 由一组静态工具定义与处理函数构成，注册即用。
type StaticProvider struct {
	tools    []Tool
	handlers map[string]ToolHandler
}

// NewStaticProvider 构造一个静态工具来源。
func NewStaticProvider(tools []Tool, handlers map[string]ToolHandler) *StaticProvider {
	copied := make([]Tool, len(tools))
	copy(copied, tools)
	table := make(map[string]ToolHandler, len(handlers))
	for name, handler := range handlers {
		table[name] = handler
	}
	return &StaticProvider{tools: copied, handlers: table}
}

// ListTools 返回静态工具定义。
func (p *StaticProvider) ListTools() []Tool {
	out := make([]Tool, len(p.tools))
	copy(out, p.tools)
	return out
}

// CallTool 按本地名执行工具；未注册返回 -32601。
func (p *StaticProvider) CallTool(ctx context.Context, name string, arguments map[string]any) (*CallToolResult, error) {
	handler, ok := p.handlers[name]
	if !ok || handler == nil {
		return nil, NewRPCError(ErrCodeMethodNotFound, "工具不存在："+name)
	}
	if arguments == nil {
		arguments = map[string]any{}
	}
	result, err := handler(ctx, arguments)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, NewRPCError(ErrCodeInternal, "工具 "+name+" 返回空结果")
	}
	return result, nil
}

// TextResult 构造一个纯文本结果。
func TextResult(text string) *CallToolResult {
	return &CallToolResult{Content: []Content{{Type: "text", Text: text}}}
}

// ErrorResult 构造一个工具执行失败的结果（isError=true）。
func ErrorResult(text string) *CallToolResult {
	return &CallToolResult{Content: []Content{{Type: "text", Text: text}}, IsError: true}
}

// NewMCPBuiltinTools 返回 MCP 内置工具（全部真实可用，无硬编码假数据）：
// mcp.echo / mcp.time / mcp.calculate / mcp.uuid / mcp.json_path / mcp.text_stats / mcp.format_json。
func NewMCPBuiltinTools() *StaticProvider {
	tools := []Tool{
		{
			Name:        "mcp.echo",
			Description: "回显输入内容，用于连通性测试",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"text": map[string]any{"type": "string", "description": "需要回显的文本"},
				},
			},
		},
		{
			Name:        "mcp.time",
			Description: "返回当前时间：RFC3339 字符串、日期、时间与 Unix 毫秒时间戳",
			InputSchema: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
		},
		{
			Name:        "mcp.calculate",
			Description: "四则运算求值器，支持 + - * / % ^ 与括号、小数、负数",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"expression": map[string]any{"type": "string", "description": "例如 1+2*(3-4)/2"},
				},
				"required": []string{"expression"},
			},
		},
		{
			Name:        "mcp.uuid",
			Description: "生成 UUID v4，可一次生成 1~50 个",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"count": map[string]any{"type": "integer", "minimum": 1, "maximum": 50, "default": 1},
				},
			},
		},
		{
			Name:        "mcp.json_path",
			Description: "对 JSON 做路径取值，路径形如 a.b[0].c；不传 path 返回根节点",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"json": map[string]any{"description": "JSON 字符串或对象"},
					"path": map[string]any{"type": "string", "description": "取值路径，例如 a.b[0].c"},
				},
				"required": []string{"json"},
			},
		},
		{
			Name:        "mcp.text_stats",
			Description: "统计文本：字符/中文/英文/数字/标点/空白数量、行数、最长词与词频 TopN",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"text": map[string]any{"type": "string"},
					"topN": map[string]any{"type": "integer", "default": 5},
				},
				"required": []string{"text"},
			},
		},
		{
			Name:        "mcp.format_json",
			Description: "格式化或压缩 JSON：indent=0 压缩为单行，>0 按指定缩进美化",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"json":   map[string]any{"description": "JSON 字符串或对象"},
					"indent": map[string]any{"type": "integer", "default": 2},
				},
				"required": []string{"json"},
			},
		},
	}

	handlers := map[string]ToolHandler{
		"mcp.echo": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			if text, ok := args["text"].(string); ok {
				return TextResult(text), nil
			}
			encoded, err := json.Marshal(args)
			if err != nil {
				return ErrorResult("参数序列化失败：" + err.Error()), nil
			}
			return TextResult(string(encoded)), nil
		},
		"mcp.time": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			now := time.Now()
			encoded, err := json.Marshal(map[string]any{
				"rfc3339": now.Format(time.RFC3339),
				"date":    now.Format("2006-01-02"),
				"time":    now.Format("15:04:05"),
				"weekday": now.Weekday().String(),
				"unixMs":  now.UnixMilli(),
				"unix":    now.Unix(),
			})
			if err != nil {
				return ErrorResult("序列化失败：" + err.Error()), nil
			}
			return TextResult(string(encoded)), nil
		},
		"mcp.calculate": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			expr, ok := args["expression"].(string)
			if !ok || strings.TrimSpace(expr) == "" {
				return ErrorResult("参数 expression 必填，例如 {\"expression\": \"1+2*3\"}"), nil
			}
			value, err := tool.EvalExpression(expr)
			if err != nil {
				return ErrorResult("表达式求值失败：" + err.Error()), nil
			}
			return TextResult(formatFloat(value)), nil
		},
		"mcp.uuid": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			count := intFromArg(args["count"], 1)
			if count < 1 {
				count = 1
			}
			if count > 50 {
				count = 50
			}
			ids := make([]string, 0, count)
			for i := 0; i < count; i++ {
				ids = append(ids, uuid.NewString())
			}
			if count == 1 {
				return TextResult(ids[0]), nil
			}
			encoded, err := json.Marshal(ids)
			if err != nil {
				return ErrorResult("序列化失败：" + err.Error()), nil
			}
			return TextResult(string(encoded)), nil
		},
		"mcp.json_path": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			raw, ok := args["json"]
			if !ok {
				return ErrorResult("参数 json 必填：可以是 JSON 字符串，也可以是对象"), nil
			}
			var root any
			switch value := raw.(type) {
			case string:
				if err := json.Unmarshal([]byte(value), &root); err != nil {
					return ErrorResult("json 不是合法 JSON 字符串：" + err.Error()), nil
				}
			default:
				encoded, err := json.Marshal(value)
				if err != nil {
					return ErrorResult("json 序列化失败：" + err.Error()), nil
				}
				if err := json.Unmarshal(encoded, &root); err != nil {
					return ErrorResult("json 解析失败：" + err.Error()), nil
				}
			}
			path, _ := args["path"].(string)
			got, err := tool.LookupJSONPath(root, path)
			if err != nil {
				return ErrorResult("路径取值失败：" + err.Error()), nil
			}
			if s, ok := got.(string); ok {
				return TextResult(s), nil
			}
			encoded, err := json.Marshal(got)
			if err != nil {
				return ErrorResult("结果序列化失败：" + err.Error()), nil
			}
			return TextResult(string(encoded)), nil
		},
		"mcp.text_stats": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			text, ok := args["text"].(string)
			if !ok {
				return ErrorResult("参数 text 必填"), nil
			}
			topN := intFromArg(args["topN"], 5)
			stats := tool.AnalyzeText(text, topN)
			encoded, err := json.Marshal(stats)
			if err != nil {
				return ErrorResult("序列化失败：" + err.Error()), nil
			}
			return TextResult(string(encoded)), nil
		},
		"mcp.format_json": func(ctx context.Context, args map[string]any) (*CallToolResult, error) {
			raw, ok := args["json"]
			if !ok {
				return ErrorResult("参数 json 必填"), nil
			}
			var text string
			switch v := raw.(type) {
			case string:
				text = v
			default:
				b, err := json.Marshal(v)
				if err != nil {
					return ErrorResult("序列化失败：" + err.Error()), nil
				}
				text = string(b)
			}
			var value any
			if err := json.Unmarshal([]byte(text), &value); err != nil {
				return ErrorResult("不是合法 JSON：" + err.Error()), nil
			}
			indent := intFromArg(args["indent"], 2)
			if indent < 0 {
				indent = 0
			}
			if indent > 8 {
				indent = 8
			}
			var out []byte
			var err error
			if indent == 0 {
				out, err = json.Marshal(value)
			} else {
				out, err = json.MarshalIndent(value, "", strings.Repeat(" ", indent))
			}
			if err != nil {
				return ErrorResult("序列化失败：" + err.Error()), nil
			}
			return TextResult(string(out)), nil
		},
	}

	return NewStaticProvider(tools, handlers)
}

// intFromArg 从工具参数中稳健地取出整数（JSON 数字可能是 float64）。
func intFromArg(v any, fallback int) int {
	switch typed := v.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case int64:
		return int(typed)
	case string:
		if n, err := strconv.Atoi(typed); err == nil {
			return n
		}
	}
	return fallback
}

// formatFloat 把浮点数格式化成最紧凑的十进制字符串。
func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// DefaultRegistry 返回已注册内置工具、资源与提示词的注册表。
func DefaultRegistry() *ServerRegistry {
	reg := NewServerRegistry()
	builtin := NewMCPBuiltinTools()
	reg.Register("", builtin)
	reg.RegisterResourceProvider(NewBuiltinResources(builtin.ListTools()))
	reg.RegisterPromptProvider(NewBuiltinPrompts())
	return reg
}

// StaticResourceProvider 用「资源列表 + uri→文本」提供 resources 能力。
type StaticResourceProvider struct {
	list     []Resource
	contents map[string]string
}

// NewStaticResourceProvider 构造静态资源后端。
func NewStaticResourceProvider(list []Resource, contents map[string]string) *StaticResourceProvider {
	return &StaticResourceProvider{list: list, contents: contents}
}

// ListResources 返回资源清单。
func (p *StaticResourceProvider) ListResources() []Resource {
	out := make([]Resource, len(p.list))
	copy(out, p.list)
	return out
}

// ReadResource 按 uri 返回内容；未命中返回 -32602。
func (p *StaticResourceProvider) ReadResource(uri string) ([]ResourceContents, error) {
	if text, ok := p.contents[uri]; ok {
		mime := "text/plain"
		if uri == "mcp://server/tools" {
			mime = "application/json"
		}
		return []ResourceContents{{URI: uri, MimeType: mime, Text: text}}, nil
	}
	return nil, NewRPCError(ErrCodeInvalidParams, "资源不存在："+uri)
}

// NewBuiltinResources 返回内置资源：工具清单与协议说明。
func NewBuiltinResources(tools []Tool) *StaticResourceProvider {
	encoded, err := json.MarshalIndent(ToolsListResult{Tools: tools}, "", "  ")
	if err != nil {
		encoded = []byte("[]")
	}
	return NewStaticResourceProvider(
		[]Resource{
			{URI: "mcp://server/tools", Name: "内置工具清单", MimeType: "application/json", Description: "当前 /mcp 端点暴露的全部工具定义"},
			{URI: "mcp://server/protocol", Name: "协议说明", MimeType: "text/plain", Description: "MCP 2026-07-28 传输与能力说明"},
		},
		map[string]string{
			"mcp://server/tools":    string(encoded),
			"mcp://server/protocol": "MCP " + ProtocolVersion + "：仅 Streamable HTTP（POST /mcp），无状态（无 initialize 与 Mcp-Session-Id），能力发现用 server/discover，输入索取用 MRTR（input_required + requestState 重发）。",
		},
	)
}

// StaticPrompt 定义一条静态提示词；Template 中用 {name} 引用参数。
type StaticPrompt struct {
	Prompt   Prompt
	Role     string
	Template string
}

// StaticPromptProvider 提供静态提示词的列表与渲染。
type StaticPromptProvider struct {
	items []StaticPrompt
}

// NewStaticPromptProvider 构造静态提示词后端。
func NewStaticPromptProvider(items ...StaticPrompt) *StaticPromptProvider {
	return &StaticPromptProvider{items: items}
}

// ListPrompts 返回提示词清单。
func (p *StaticPromptProvider) ListPrompts() []Prompt {
	out := make([]Prompt, 0, len(p.items))
	for _, item := range p.items {
		out = append(out, item.Prompt)
	}
	return out
}

// GetPrompt 渲染指定提示词；缺少必填参数返回 -32602。
func (p *StaticPromptProvider) GetPrompt(name string, arguments map[string]string) (*PromptResult, error) {
	if arguments == nil {
		arguments = map[string]string{}
	}
	for _, item := range p.items {
		if item.Prompt.Name != name {
			continue
		}
		for _, arg := range item.Prompt.Arguments {
			if arg.Required {
				if _, ok := arguments[arg.Name]; !ok {
					return nil, NewRPCError(ErrCodeInvalidParams, "提示词缺少必填参数："+arg.Name)
				}
			}
		}
		role := item.Role
		if role == "" {
			role = "user"
		}
		return &PromptResult{
			Description: item.Prompt.Description,
			Messages:    []PromptMessage{{Role: role, Content: PromptContent{Type: "text", Text: renderTemplate(item.Template, arguments)}}},
		}, nil
	}
	return nil, NewRPCError(ErrCodeInvalidParams, "提示词不存在："+name)
}

// NewBuiltinPrompts 返回内置提示词后端。
func NewBuiltinPrompts() *StaticPromptProvider {
	return NewStaticPromptProvider(StaticPrompt{
		Prompt: Prompt{
			Name:        "mcp.tool_help",
			Description: "生成某个 MCP 工具的调用示例说明",
			Arguments:   []PromptArgument{{Name: "toolName", Description: "工具名，例如 mcp.calculate", Required: true}},
		},
		Role:     "user",
		Template: "请说明 MCP 工具 {toolName} 的用途，并给出一个 tools/call 的 JSON 示例（含 name 与 arguments）。",
	})
}

// renderTemplate 用参数值替换模板中的 {name} 占位符。
func renderTemplate(tpl string, args map[string]string) string {
	out := tpl
	for key, value := range args {
		out = strings.ReplaceAll(out, "{"+key+"}", value)
	}
	return out
}
