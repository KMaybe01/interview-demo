package a2a

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// heartbeatInterval 是 SSE 心跳注释的发送间隔。
const heartbeatInterval = 15 * time.Second

// StreamMessage 对应 message/stream：以 SSE 推送 task / status-update / artifact-update 事件。
func (s *Server) StreamMessage(c *gin.Context) {
	agentID := c.Param("agentId")
	var p SendMessageParams
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数解析失败：" + err.Error()})
		return
	}
	if agentID == "" {
		agentID = p.AgentID
	}
	_, runner, ok := s.registry.Get(agentID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent 不存在：" + agentID})
		return
	}

	task := NewTask(agentID, p.SessionID)
	task.Metadata = cloneMap(p.Metadata)
	if err := s.store.Create(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败：" + err.Error()})
		return
	}
	msg := p.ResolveMessage(task.ID)
	task.History = append(task.History, msg)
	task.Status = TaskStatusWorking
	task.Touch()
	_ = s.store.Update(task)

	writeSSEHeader(c)

	ctx := c.Request.Context()
	events := make(chan TaskEvent, 8)
	go func() {
		defer close(events)
		s.runStream(ctx, task, runner, msg.Parts, events)
	}()

	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case ev, open := <-events:
			if !open {
				return false
			}
			writeSSEEvent(w, ev)
			return true
		case <-ticker.C:
			_, _ = io.WriteString(w, ": ping\n\n")
			return true
		case <-ctx.Done():
			return false
		}
	})
}

// runStream 在后台执行 Runner 并按要求顺序推送事件。
// 每次发送都受 ctx 约束，客户端断开后 goroutine 会及时退出（不会泄漏）。
func (s *Server) runStream(ctx context.Context, task *Task, runner Runner, input []Part, events chan<- TaskEvent) {
	emit := func(ev TaskEvent) bool {
		ev.TaskID = task.ID
		ev.AgentID = task.AgentID
		if ev.Timestamp.IsZero() {
			ev.Timestamp = time.Now().UTC()
		}
		select {
		case events <- ev:
			return true
		case <-ctx.Done():
			return false
		}
	}

	if !emit(TaskEvent{Type: EventTypeTask, Status: task.Status, Task: snapshot(task)}) {
		return
	}
	if !emit(TaskEvent{Type: EventTypeStatusUpdate, Status: TaskStatusWorking}) {
		return
	}

	artifacts, err := runner.Run(ctx, task, input)
	for i := range artifacts {
		a := artifacts[i]
		if !emit(TaskEvent{Type: EventTypeArtifactUpdate, Artifact: &a, Final: a.LastChunk}) {
			return
		}
	}

	switch {
	case err == nil:
		task.Status = TaskStatusCompleted
		task.Artifacts = append(task.Artifacts, artifacts...)
		delete(task.Metadata, MetadataKeyInputRequired)
		if text := TextOf(artifactTextParts(artifacts)); text != "" {
			reply := NewAgentMessage(text)
			reply.TaskID = task.ID
			task.History = append(task.History, reply)
		}
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
	_ = s.store.Update(task)

	emit(TaskEvent{Type: EventTypeStatusUpdate, Status: task.Status, Final: true, Message: task.ErrorMessage()})
	emit(TaskEvent{Type: EventTypeTask, Status: task.Status, Task: snapshot(task), Final: true})
}

// snapshot 生成任务快照用于推送。
func snapshot(task *Task) *Task {
	if task == nil {
		return nil
	}
	cp := task.Clone()
	return &cp
}

// writeSSEHeader 设置 SSE 必需响应头；X-Accel-Buffering 用于关闭 Nginx 缓冲。
func writeSSEHeader(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
}

// writeSSEEvent 按 `event: <type>\ndata: <json>\n\n` 写出一个事件。
func writeSSEEvent(w io.Writer, ev TaskEvent) {
	payload, err := json.Marshal(ev)
	if err != nil {
		return
	}
	_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", ev.Type, payload)
}
