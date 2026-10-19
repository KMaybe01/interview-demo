package a2a

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Server 是 A2A 服务端：同时提供 REST 路径与 JSON-RPC 单入口。
type Server struct {
	registry *AgentRegistry
	store    Store
	baseURL  string
}

// NewServer 创建 A2A 服务端；store 为 nil 时使用内存存储。
func NewServer(reg *AgentRegistry, store ...Store) *Server {
	if reg == nil {
		reg = NewAgentRegistry()
	}
	s := &Server{registry: reg, store: NewMemoryStore(0)}
	if len(store) > 0 && store[0] != nil {
		s.store = store[0]
	}
	return s
}

// SetBaseURL 设置服务对外地址，用于补全 Agent Card 的 url 字段。
func (s *Server) SetBaseURL(baseURL string) { s.baseURL = baseURL }

// Registry 返回底层 Agent 注册表。
func (s *Server) Registry() *AgentRegistry { return s.registry }

// RegisterRoutes 注册全部 REST 路由；group 形如 api.Group("/a2a")。
//
// 注册结果：
//
//	GET    /agents                                  列举 Agent
//	GET    /agents/:agentId/card                    获取 Agent Card
//	GET    /agents/:agentId/.well-known/agent.json  指定 Agent 的 well-known 卡
//	POST   /agents/:agentId/tasks                   message/send（同步）
//	POST   /agents/:agentId/tasks/stream            message/stream（SSE）
//	POST   /tasks/stream                            message/stream（SSE，agentId 走 body）
//	GET    /tasks                                   tasks/list
//	GET    /tasks/:taskId                           tasks/get
//	POST   /tasks/:taskId/cancel                    tasks/cancel
func (s *Server) RegisterRoutes(g *gin.RouterGroup) {
	g.GET("/agents", s.ListAgents)
	g.GET("/agents/:agentId/card", s.GetCard)
	g.GET("/agents/:agentId/.well-known/agent.json", s.AgentWellKnown)
	g.POST("/agents/:agentId/tasks", s.SendMessage)
	g.POST("/agents/:agentId/tasks/stream", s.StreamMessage)
	g.POST("/tasks/stream", s.StreamMessage)
	g.GET("/tasks", s.ListTasks)
	g.GET("/tasks/:taskId", s.GetTask)
	g.POST("/tasks/:taskId/cancel", s.CancelTask)
}

// WellKnown 是全局默认 Agent Card（GET /.well-known/agent.json）。
func (s *Server) WellKnown(c *gin.Context) {
	card, ok := s.registry.DefaultCard()
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "尚未注册任何 Agent"})
		return
	}
	c.JSON(http.StatusOK, s.withBaseURL(card))
}

// AgentWellKnown 是指定 Agent 的 well-known 卡。
func (s *Server) AgentWellKnown(c *gin.Context) {
	card, ok := s.registry.Card(c.Param("agentId"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent 不存在：" + c.Param("agentId")})
		return
	}
	c.JSON(http.StatusOK, s.withBaseURL(card))
}

// GetCard 返回指定 Agent 的 Agent Card。
func (s *Server) GetCard(c *gin.Context) {
	card, ok := s.registry.Card(c.Param("agentId"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent 不存在：" + c.Param("agentId")})
		return
	}
	c.JSON(http.StatusOK, s.withBaseURL(card))
}

// ListAgents 列举全部已注册 Agent 的摘要。
func (s *Server) ListAgents(c *gin.Context) {
	summaries := s.registry.Summaries()
	c.JSON(http.StatusOK, AgentListResult{Agents: summaries, Count: len(summaries)})
}

// SendMessage 对应 message/send：创建或继续一个任务并同步等待结束。
func (s *Server) SendMessage(c *gin.Context) {
	agentID := c.Param("agentId")
	var p SendMessageParams
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数解析失败：" + err.Error()})
		return
	}
	if agentID == "" {
		agentID = p.AgentID
	}
	task, rpcErr := s.sendMessage(c.Request.Context(), agentID, p)
	if rpcErr != nil {
		c.JSON(rpcErr.HTTPStatus(), gin.H{"code": rpcErr.Code, "error": rpcErr.Message})
		return
	}
	c.JSON(http.StatusOK, task)
}

// GetTask 对应 tasks/get。
func (s *Server) GetTask(c *gin.Context) {
	task, ok := s.store.Get(c.Param("taskId"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在：" + c.Param("taskId")})
		return
	}
	c.JSON(http.StatusOK, task)
}

// CancelTask 对应 tasks/cancel；终态任务返回 409 + -32001。
func (s *Server) CancelTask(c *gin.Context) {
	task, rpcErr := s.cancelTask(c.Param("taskId"))
	if rpcErr != nil {
		c.JSON(rpcErr.HTTPStatus(), gin.H{"code": rpcErr.Code, "error": rpcErr.Message})
		return
	}
	c.JSON(http.StatusOK, task)
}

// ListTasks 对应 tasks/list，支持 ?agentId=&status=&limit=。
func (s *Server) ListTasks(c *gin.Context) {
	filter, rpcErr := parseTaskFilter(c.Query("agentId"), c.Query("status"), c.Query("limit"))
	if rpcErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": rpcErr.Code, "error": rpcErr.Message})
		return
	}
	tasks := s.store.List(filter)
	c.JSON(http.StatusOK, TaskListResult{Tasks: tasks, Count: len(tasks)})
}

// HandleRPC 是 JSON-RPC 2.0 单入口（POST /api/a2a）。
func (s *Server) HandleRPC(c *gin.Context) {
	raw, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, NewRPCErrorResponse(nil, NewRPCError(ErrCodeParseError, "请求体读取失败")))
		return
	}
	var req RPCRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		c.JSON(http.StatusBadRequest, NewRPCErrorResponse(nil, NewRPCError(ErrCodeParseError, "JSON 解析失败："+err.Error())))
		return
	}

	switch req.Method {
	case MethodMessageSend:
		var p SendMessageParams
		if e := decodeParams(req.Params, &p); e != nil {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, e))
			return
		}
		task, rpcErr := s.sendMessage(c.Request.Context(), p.AgentID, p)
		if rpcErr != nil {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, rpcErr))
			return
		}
		c.JSON(http.StatusOK, NewRPCSuccess(req.ID, task))

	case MethodTasksGet:
		var p TaskQueryParams
		if e := decodeParams(req.Params, &p); e != nil {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, e))
			return
		}
		task, ok := s.store.Get(p.TaskID)
		if !ok {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, NewRPCError(ErrCodeInvalidParams, "任务不存在："+p.TaskID)))
			return
		}
		c.JSON(http.StatusOK, NewRPCSuccess(req.ID, task))

	case MethodTasksCancel:
		var p TaskQueryParams
		if e := decodeParams(req.Params, &p); e != nil {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, e))
			return
		}
		task, rpcErr := s.cancelTask(p.TaskID)
		if rpcErr != nil {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, rpcErr))
			return
		}
		c.JSON(http.StatusOK, NewRPCSuccess(req.ID, task))

	case MethodTasksList:
		var p TaskListParams
		if e := decodeParams(req.Params, &p); e != nil {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, e))
			return
		}
		filter := TaskFilter{AgentID: p.AgentID, Limit: p.Limit}
		if p.Status != "" {
			st, ok := ParseTaskStatus(p.Status)
			if !ok {
				c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, NewRPCError(ErrCodeInvalidParams, "非法的任务状态："+p.Status)))
				return
			}
			filter.Status = st
		}
		tasks := s.store.List(filter)
		c.JSON(http.StatusOK, NewRPCSuccess(req.ID, TaskListResult{Tasks: tasks, Count: len(tasks)}))

	case MethodAgentGetCard:
		var p TaskQueryParams
		_ = decodeParams(req.Params, &p)
		card, ok := s.registry.Card(p.TaskID)
		if !ok {
			c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, NewRPCError(ErrCodeInvalidParams, "Agent 不存在："+p.TaskID)))
			return
		}
		c.JSON(http.StatusOK, NewRPCSuccess(req.ID, s.withBaseURL(card)))

	case MethodAgentsList:
		summaries := s.registry.Summaries()
		c.JSON(http.StatusOK, NewRPCSuccess(req.ID, AgentListResult{Agents: summaries, Count: len(summaries)}))

	case MethodMessageStream:
		c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, NewRPCError(ErrCodeInvalidRequest,
			"message/stream 请使用 SSE 端点 POST /api/a2a/agents/{agentId}/tasks/stream")))

	default:
		c.JSON(http.StatusOK, NewRPCErrorResponse(req.ID, NewRPCError(ErrCodeMethodNotFound, "不支持的方法："+req.Method)))
	}
}

// sendMessage 执行 message/send 的核心流程。
func (s *Server) sendMessage(ctx context.Context, agentID string, p SendMessageParams) (*Task, *RPCError) {
	if agentID == "" {
		agentID = p.AgentID
	}
	_, runner, ok := s.registry.Get(agentID)
	if !ok {
		return nil, NewRPCError(ErrCodeInvalidParams, "Agent 不存在："+agentID)
	}

	var task *Task
	if p.TaskID != "" {
		existing, found := s.store.Get(p.TaskID)
		if !found {
			return nil, NewRPCError(ErrCodeInvalidParams, "任务不存在："+p.TaskID)
		}
		if existing.Status.IsTerminal() {
			return nil, NewRPCError(ErrCodeInvalidParams, "任务已处于终态（"+string(existing.Status)+"），无法继续")
		}
		task = existing
	} else {
		task = NewTask(agentID, p.SessionID)
		task.Metadata = cloneMap(p.Metadata)
		if err := s.store.Create(task); err != nil {
			return nil, NewRPCError(ErrCodeInternalError, "创建任务失败："+err.Error())
		}
	}

	msg := p.ResolveMessage(task.ID)
	task.History = append(task.History, msg)
	task.Status = TaskStatusWorking
	task.Touch()
	if err := s.store.Update(task); err != nil {
		return nil, NewRPCError(ErrCodeInternalError, "更新任务失败："+err.Error())
	}
	return s.runTask(ctx, task, runner, msg.Parts)
}

// runTask 驱动 Runner 并按约定收敛任务状态。
func (s *Server) runTask(ctx context.Context, task *Task, runner Runner, input []Part) (*Task, *RPCError) {
	artifacts, err := runner.Run(ctx, task, input)
	switch {
	case err == nil:
		task.Status = TaskStatusCompleted
		task.Artifacts = append(task.Artifacts, artifacts...)
		delete(task.Metadata, MetadataKeyInputRequired)
	case errors.Is(err, context.Canceled):
		task.Status = TaskStatusCanceled
		msg := "任务已被取消"
		task.Error = &msg
	case errors.Is(err, ErrInputRequired):
		task.Status = TaskStatusInputRequired
		prompt := InputRequiredPrompt(err)
		if prompt == "" {
			prompt = err.Error()
		}
		task.SetMetadata(MetadataKeyInputRequired, prompt)
	default:
		task.Status = TaskStatusFailed
		msg := err.Error()
		task.Error = &msg
	}
	task.Touch()

	if task.Status == TaskStatusCompleted {
		if text := TextOf(artifactTextParts(artifacts)); text != "" {
			reply := NewAgentMessage(text)
			reply.TaskID = task.ID
			task.History = append(task.History, reply)
		}
	}
	if task.Status == TaskStatusInputRequired {
		if prompt := InputRequiredPrompt(err); prompt != "" {
			reply := NewAgentMessage(prompt)
			reply.TaskID = task.ID
			task.History = append(task.History, reply)
		}
	}

	if uerr := s.store.Update(task); uerr != nil {
		return nil, NewRPCError(ErrCodeInternalError, "更新任务失败："+uerr.Error())
	}
	cp := task.Clone()
	return &cp, nil
}

// cancelTask 取消任务；终态任务不可取消。
func (s *Server) cancelTask(taskID string) (*Task, *RPCError) {
	task, ok := s.store.Get(taskID)
	if !ok {
		return nil, NewRPCError(ErrCodeInvalidParams, "任务不存在："+taskID)
	}
	if task.Status.IsTerminal() {
		return nil, NewRPCError(ErrCodeTaskNotCancelable, "任务已处于终态（"+string(task.Status)+"），不可取消")
	}
	task.Status = TaskStatusCanceled
	task.Touch()
	if err := s.store.Update(task); err != nil {
		return nil, NewRPCError(ErrCodeInternalError, "更新任务失败："+err.Error())
	}
	return task, nil
}

// withBaseURL 在 Card 未指定 URL 时用服务端地址补全。
func (s *Server) withBaseURL(card AgentCard) AgentCard {
	if s.baseURL != "" && card.URL == "" {
		card.URL = s.baseURL + "/api/a2a/agents/" + card.ID
	}
	return card
}

// decodeParams 反序列化 params；为空或 null 时保持零值。
func decodeParams(raw json.RawMessage, out any) *RPCError {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return NewRPCError(ErrCodeInvalidParams, "参数解析失败："+err.Error())
	}
	return nil
}

// parseTaskFilter 解析 tasks/list 的查询参数。
func parseTaskFilter(agentID, status, limit string) (TaskFilter, *RPCError) {
	filter := TaskFilter{AgentID: agentID}
	if status != "" {
		st, ok := ParseTaskStatus(status)
		if !ok {
			return filter, NewRPCError(ErrCodeInvalidParams, "非法的任务状态："+status)
		}
		filter.Status = st
	}
	if limit != "" {
		n, err := strconv.Atoi(limit)
		if err != nil || n < 0 {
			return filter, NewRPCError(ErrCodeInvalidParams, "非法的 limit 参数："+limit)
		}
		filter.Limit = n
	}
	return filter, nil
}

// artifactTextParts 汇总一组 Artifact 中的全部文本片段。
func artifactTextParts(artifacts []Artifact) []Part {
	var parts []Part
	for _, a := range artifacts {
		for _, p := range a.Parts {
			if p.Type == string(PartTypeText) {
				parts = append(parts, p)
			}
		}
	}
	return parts
}
