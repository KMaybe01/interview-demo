package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"time"
)

// 客户端默认参数。
const (
	defaultClientTimeout = 15 * time.Second
	defaultClientBackoff = 200 * time.Millisecond
	defaultMaxRetries    = 2
)

// Client 是 MCP Streamable HTTP 客户端，所有方法都 POST 到 <baseURL>/mcp。
type Client struct {
	endpoint   string
	httpClient *http.Client
	version    string
	maxRetries int
	backoff    time.Duration
	seq        atomic.Uint64
}

// ClientOption 配置 Client。
type ClientOption func(*Client)

// WithTimeout 设置单次请求超时（默认 15s）。
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *Client) { c.httpClient.Timeout = timeout }
}

// WithHTTPClient 使用自定义 http.Client。
func WithHTTPClient(hc *http.Client) ClientOption {
	return func(c *Client) {
		if hc != nil {
			c.httpClient = hc
		}
	}
}

// WithMaxRetries 设置最大重试次数（默认 2，不含首次请求）。
func WithMaxRetries(n int) ClientOption {
	return func(c *Client) {
		if n >= 0 {
			c.maxRetries = n
		}
	}
}

// WithBackoff 设置指数退避基数（默认 200ms）。
func WithBackoff(base time.Duration) ClientOption {
	return func(c *Client) {
		if base > 0 {
			c.backoff = base
		}
	}
}

// WithClientProtocolVersion 设置请求头协议版本（默认 2026-07-28）。
func WithClientProtocolVersion(v string) ClientOption {
	return func(c *Client) {
		if v != "" {
			c.version = v
		}
	}
}

// NewClient 创建 MCP 客户端；baseURL 形如 http://host:8080/api。
func NewClient(baseURL string, opts ...ClientOption) *Client {
	c := &Client{
		endpoint:   mcpEndpoint(baseURL),
		httpClient: &http.Client{Timeout: defaultClientTimeout},
		version:    ProtocolVersion,
		maxRetries: defaultMaxRetries,
		backoff:    defaultClientBackoff,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(c)
		}
	}
	return c
}

// mcpEndpoint 把 baseURL 规范化为 .../mcp。
func mcpEndpoint(baseURL string) string {
	trimmed := strings.TrimRight(baseURL, "/")
	if strings.HasSuffix(trimmed, "/mcp") {
		return trimmed
	}
	return trimmed + "/mcp"
}

// nextID 生成单调递增的请求 ID。
func (c *Client) nextID() int64 { return int64(c.seq.Add(1)) }

// RPC 发送一个原始 JSON-RPC 请求。
func (c *Client) RPC(ctx context.Context, method string, params any) (*Response, error) {
	return c.call(ctx, method, params, "")
}

// Discover 获取远端能力发现结果。
func (c *Client) Discover(ctx context.Context) (*DiscoverResult, error) {
	var out DiscoverResult
	if err := c.callResult(ctx, MethodDiscover, map[string]any{}, "", &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ListTools 获取远端工具列表。
func (c *Client) ListTools(ctx context.Context) ([]Tool, error) {
	var out ToolsListResult
	if err := c.callResult(ctx, MethodToolsList, map[string]any{}, "", &out); err != nil {
		return nil, err
	}
	return out.Tools, nil
}

// CallTool 调用远端工具。
func (c *Client) CallTool(ctx context.Context, name string, arguments map[string]any) (*CallToolResult, error) {
	return c.CallToolWithRequest(ctx, CallToolParams{Name: name, Arguments: arguments})
}

// CallToolIdempotent 带幂等键调用远端工具（副作用工具必须调用这个方法）。
func (c *Client) CallToolIdempotent(ctx context.Context, name string, arguments map[string]any, key string) (*CallToolResult, error) {
	return c.CallToolWithRequest(ctx, CallToolParams{
		Name:      name,
		Arguments: arguments,
		Meta:      &RequestMeta{IdempotencyKey: key},
	})
}

// CallToolWithRequest 以完整参数调用远端工具，可用于 MRTR 重发（携带 inputResponses/requestState）。
func (c *Client) CallToolWithRequest(ctx context.Context, params CallToolParams) (*CallToolResult, error) {
	var out CallToolResult
	if err := c.callResult(ctx, MethodToolsCall, params, params.Name, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ReadResource 读取远端资源。
func (c *Client) ReadResource(ctx context.Context, uri string) ([]ResourceContents, error) {
	var out ResourcesReadResult
	if err := c.callResult(ctx, MethodResourcesRead, ReadResourceParams{URI: uri}, "", &out); err != nil {
		return nil, err
	}
	return out.Contents, nil
}

// GetPrompt 渲染远端提示词。
func (c *Client) GetPrompt(ctx context.Context, name string, arguments map[string]string) (*PromptResult, error) {
	var out PromptResult
	if err := c.callResult(ctx, MethodPromptsGet, GetPromptParams{Name: name, Arguments: arguments}, "", &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// Ping 探测连通性。
func (c *Client) Ping(ctx context.Context) error {
	return c.callResult(ctx, MethodPing, map[string]any{}, "", nil)
}

// callResult 发起请求并把 result 解码到 out；out 为 nil 时只关心错误。
func (c *Client) callResult(ctx context.Context, method string, params any, toolName string, out any) error {
	resp, err := c.call(ctx, method, params, toolName)
	if err != nil {
		return err
	}
	if resp.Error != nil {
		return fmt.Errorf("mcp: [%d] %s", resp.Error.Code, resp.Error.Message)
	}
	if resp.Result == nil || out == nil {
		return nil
	}
	raw, err := json.Marshal(resp.Result)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, out)
}

// call 执行一次带重试的 JSON-RPC 调用。
func (c *Client) call(ctx context.Context, method string, params any, toolName string) (*Response, error) {
	req := Request{JSONRPC: JSONRPCVersion, ID: c.nextID(), Method: method}
	if params != nil {
		encoded, err := json.Marshal(params)
		if err != nil {
			return nil, err
		}
		req.Params = encoded
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	var lastErr error
	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if attempt > 0 {
			delay := c.backoff * time.Duration(1<<(attempt-1))
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
		}
		resp, retryable, err := c.roundTrip(ctx, method, toolName, body)
		if err == nil {
			return resp, nil
		}
		lastErr = err
		if !retryable {
			return nil, err
		}
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("mcp: 请求 %s 失败", method)
	}
	return nil, lastErr
}

// roundTrip 发送一次 HTTP 请求；第二返回值表示是否可重试。
func (c *Client) roundTrip(ctx context.Context, method, toolName string, body []byte) (*Response, bool, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, false, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set(HeaderProtocolVersion, c.version)
	httpReq.Header.Set(HeaderMethod, method)
	if toolName != "" {
		httpReq.Header.Set(HeaderName, toolName)
	}

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, true, err
	}
	defer httpResp.Body.Close()

	raw, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, true, err
	}
	if httpResp.StatusCode == http.StatusTooManyRequests || httpResp.StatusCode >= 500 {
		return nil, true, fmt.Errorf("mcp: 服务端返回 %d: %s", httpResp.StatusCode, strings.TrimSpace(string(raw)))
	}

	var resp Response
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, false, fmt.Errorf("mcp: 响应解析失败：%w", err)
	}
	return &resp, false, nil
}
