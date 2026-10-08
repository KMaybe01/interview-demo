package a2a

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// DefaultClientTimeout 是 A2A 客户端默认超时。
const DefaultClientTimeout = 30 * time.Second

// ClientOption 定制 A2A 客户端。
type ClientOption func(*clientConfig)

// clientConfig 是客户端配置。
type clientConfig struct {
	client  *http.Client
	timeout time.Duration
	token   string
	apiKey  string
}

// WithHTTPClient 指定底层 http.Client。
func WithHTTPClient(c *http.Client) ClientOption {
	return func(cfg *clientConfig) { cfg.client = c }
}

// WithTimeout 指定默认超时。
func WithTimeout(d time.Duration) ClientOption {
	return func(cfg *clientConfig) { cfg.timeout = d }
}

// WithBearerToken 指定 Bearer Token。
func WithBearerToken(token string) ClientOption {
	return func(cfg *clientConfig) { cfg.token = token }
}

// WithAPIKey 指定 API Key。
func WithAPIKey(key string) ClientOption {
	return func(cfg *clientConfig) { cfg.apiKey = key }
}

// Client 是 A2A 客户端，调用远端 Agent 的 REST 与 JSON-RPC 接口。
type Client struct {
	baseURL string
	hc      *http.Client
	cfg     clientConfig
}

// NewClient 创建客户端；baseURL 形如 http://localhost:8080/api/a2a。
func NewClient(baseURL string, opts ...ClientOption) *Client {
	cfg := clientConfig{timeout: DefaultClientTimeout}
	for _, opt := range opts {
		if opt != nil {
			opt(&cfg)
		}
	}
	if cfg.client == nil {
		cfg.client = &http.Client{Timeout: cfg.timeout}
	}
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), hc: cfg.client, cfg: cfg}
}

// BaseURL 返回客户端配置的服务地址。
func (c *Client) BaseURL() string { return c.baseURL }

// DiscoverAgent 通过远端 well-known 端点发现 Agent Card。
func (c *Client) DiscoverAgent(ctx context.Context, rawURL string) (*AgentCard, error) {
	if rawURL == "" {
		rawURL = c.baseURL
	}
	card := &AgentCard{}
	if err := c.do(ctx, http.MethodGet, wellKnownURL(rawURL), nil, card); err != nil {
		return nil, err
	}
	return card, nil
}

// SendMessage 发送一条消息并同步等待任务结束；taskID 非空表示继续 input-required 的任务。
func (c *Client) SendMessage(ctx context.Context, agentID string, msg Message, taskID string) (*Task, error) {
	p := SendMessageParams{AgentID: agentID, TaskID: taskID, Message: &msg}
	task := &Task{}
	if err := c.do(ctx, http.MethodPost, "/agents/"+url.PathEscape(agentID)+"/tasks", p, task); err != nil {
		return nil, err
	}
	return task, nil
}

// SendText 是 SendMessage 的便捷方法。
func (c *Client) SendText(ctx context.Context, agentID, text string) (*Task, error) {
	return c.SendMessage(ctx, agentID, NewUserMessage(text), "")
}

// GetTask 查询远端任务。
func (c *Client) GetTask(ctx context.Context, taskID string) (*Task, error) {
	task := &Task{}
	if err := c.do(ctx, http.MethodGet, "/tasks/"+url.PathEscape(taskID), nil, task); err != nil {
		return nil, err
	}
	return task, nil
}

// CancelTask 取消远端任务。
func (c *Client) CancelTask(ctx context.Context, taskID string) (*Task, error) {
	task := &Task{}
	if err := c.do(ctx, http.MethodPost, "/tasks/"+url.PathEscape(taskID)+"/cancel", nil, task); err != nil {
		return nil, err
	}
	return task, nil
}

// ListTasks 按条件列举远端任务。
func (c *Client) ListTasks(ctx context.Context, filter TaskListParams) (*TaskListResult, error) {
	q := url.Values{}
	if filter.AgentID != "" {
		q.Set("agentId", filter.AgentID)
	}
	if filter.Status != "" {
		q.Set("status", filter.Status)
	}
	if filter.Limit > 0 {
		q.Set("limit", strconv.Itoa(filter.Limit))
	}
	path := "/tasks"
	if len(q) > 0 {
		path += "?" + q.Encode()
	}
	out := &TaskListResult{}
	if err := c.do(ctx, http.MethodGet, path, nil, out); err != nil {
		return nil, err
	}
	return out, nil
}

// GetCard 获取远端 Agent Card。
func (c *Client) GetCard(ctx context.Context, agentID string) (*AgentCard, error) {
	card := &AgentCard{}
	if err := c.do(ctx, http.MethodGet, "/agents/"+url.PathEscape(agentID)+"/card", nil, card); err != nil {
		return nil, err
	}
	return card, nil
}

// ListAgents 列举远端已注册 Agent。
func (c *Client) ListAgents(ctx context.Context) (*AgentListResult, error) {
	out := &AgentListResult{}
	if err := c.do(ctx, http.MethodGet, "/agents", nil, out); err != nil {
		return nil, err
	}
	return out, nil
}

// Call 直接调用 JSON-RPC 单入口；out 为 nil 时忽略 result。
func (c *Client) Call(ctx context.Context, method string, params any, out any) error {
	req := RPCRequest{JSONRPC: JSONRPCVersion, ID: newID(), Method: method}
	if params != nil {
		raw, err := json.Marshal(params)
		if err != nil {
			return fmt.Errorf("a2a: 序列化参数失败: %w", err)
		}
		req.Params = raw
	}
	resp := &RPCResponse{}
	if err := c.do(ctx, http.MethodPost, "", req, resp); err != nil {
		return err
	}
	if resp.Error != nil {
		return resp.Error
	}
	if out == nil || resp.Result == nil {
		return nil
	}
	raw, err := json.Marshal(resp.Result)
	if err != nil {
		return fmt.Errorf("a2a: 序列化 result 失败: %w", err)
	}
	return json.Unmarshal(raw, out)
}

// StreamMessage 以 SSE 发送消息，返回事件通道；服务端结束或 ctx 取消时通道关闭。
func (c *Client) StreamMessage(ctx context.Context, agentID string, msg Message, taskID string) (<-chan TaskEvent, error) {
	p := SendMessageParams{AgentID: agentID, TaskID: taskID, Message: &msg}
	buf, err := json.Marshal(p)
	if err != nil {
		return nil, fmt.Errorf("a2a: 序列化请求体失败: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.url("/agents/"+url.PathEscape(agentID)+"/tasks/stream"), bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("a2a: 构造请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	c.applyAuth(req)

	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("a2a: 请求失败: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("a2a: 服务端返回 %d: %s", resp.StatusCode, strings.TrimSpace(string(data)))
	}

	events := make(chan TaskEvent, 8)
	go func() {
		defer resp.Body.Close()
		readSSE(ctx, resp.Body, events)
	}()
	return events, nil
}

// do 发起 HTTP 请求并把响应体反序列化到 out。
func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("a2a: 序列化请求体失败: %w", err)
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.url(path), reader)
	if err != nil {
		return fmt.Errorf("a2a: 构造请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	c.applyAuth(req)

	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("a2a: 请求失败: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("a2a: 读取响应失败: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("a2a: 服务端返回 %d: %s", resp.StatusCode, strings.TrimSpace(string(data)))
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("a2a: 解析响应失败: %w", err)
	}
	return nil
}

// applyAuth 写入认证头。
func (c *Client) applyAuth(req *http.Request) {
	if c.cfg.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.cfg.token)
	}
	if c.cfg.apiKey != "" {
		req.Header.Set("X-API-Key", c.cfg.apiKey)
	}
}

// url 拼接绝对地址；path 为空时返回 baseURL（JSON-RPC 单入口）。
func (c *Client) url(path string) string {
	if path == "" {
		return c.baseURL
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return c.baseURL + path
}

// wellKnownURL 由服务地址推导 /.well-known/agent.json。
func wellKnownURL(base string) string {
	if base == "" {
		return "/.well-known/agent.json"
	}
	u, err := url.Parse(base)
	if err != nil {
		return strings.TrimRight(base, "/") + "/.well-known/agent.json"
	}
	u.Path = "/.well-known/agent.json"
	u.RawQuery = ""
	return u.String()
}

// readSSE 解析 SSE 流：按空行切分事件，忽略 `: ping` 心跳注释。
func readSSE(ctx context.Context, r io.Reader, events chan<- TaskEvent) {
	defer close(events)

	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var name, data strings.Builder
	flush := func() bool {
		if data.Len() == 0 {
			name.Reset()
			return true
		}
		ev := TaskEvent{Type: TaskEventType(name.String())}
		if err := json.Unmarshal([]byte(data.String()), &ev); err == nil {
			select {
			case events <- ev:
			case <-ctx.Done():
				return false
			}
		}
		name.Reset()
		data.Reset()
		return true
	}

	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case line == "":
			if !flush() {
				return
			}
		case strings.HasPrefix(line, ":"):
			// 心跳注释，忽略
		case strings.HasPrefix(line, "event:"):
			name.WriteString(strings.TrimSpace(strings.TrimPrefix(line, "event:")))
		case strings.HasPrefix(line, "data:"):
			data.WriteString(strings.TrimSpace(strings.TrimPrefix(line, "data:")))
		}
		select {
		case <-ctx.Done():
			return
		default:
		}
	}
	flush()
}
