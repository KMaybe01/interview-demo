package airouter

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"interview-demo/backend/internal/guard"
	"interview-demo/backend/internal/llm"
	"interview-demo/backend/internal/obs"
	"interview-demo/backend/internal/tool"
)

// Chat 执行一次非流式聊天，内部走完整的「护栏 → RAG → 工具循环 → 观测」链路。
func (s *Service) Chat(ctx context.Context, req ChatRequest) (*ChatOutcome, error) {
	started := s.now()
	trace := s.recorder.StartTrace("ai.chat")

	messages, hits, guardErr := s.resolveMessages(ctx, req)
	if guardErr != nil {
		s.recorder.EndTrace(trace)
		return &ChatOutcome{
			Blocked:     true,
			BlockReason: guardErr.Reason,
			TraceID:     trace.TraceID,
			LatencyMs:   s.now().Sub(started).Milliseconds(),
		}, nil
	}

	model := req.Model
	if model == "" {
		model = s.cfg.DefaultModel
	}
	provider, ok := s.llm.Resolve(model)
	if !ok {
		return nil, ErrNoProvider
	}

	toolSchema := s.selectTools(req)
	outcome := &ChatOutcome{
		Model:    model,
		Provider: provider.ID(),
		Sources:  hits,
		TraceID:  trace.TraceID,
	}

	totalUsage := llm.Usage{}
	steps := make([]StepRecord, 0, s.cfg.MaxSteps)

	for step := 0; step < s.cfg.MaxSteps; step++ {
		span := s.recorder.StartSpan(trace.TraceID, fmt.Sprintf("llm.step.%d", step), obs.SpanLLM, "")
		span.Attrs["model"] = model
		span.Attrs["step"] = step

		resp, err := provider.Chat(ctx, llm.Request{
			Model:       model,
			Messages:    messages,
			Tools:       toolSchema,
			Temperature: req.Temperature,
			MaxTokens:   req.MaxTokens,
			User:        req.UserID,
		})
		if err != nil {
			s.recorder.EndSpan(span, err)
			// 主链路失败 → 走降级链（便宜模型 → 离线兜底）
			if fbResp, fbErr := s.llm.ExecuteWithFallback(ctx, llm.Request{
				Model:    model,
				Messages: messages,
				User:     req.UserID,
			}); fbErr == nil {
				resp = fbResp
				outcome.Degraded = true
			} else {
				s.recorder.EndTrace(trace)
				return nil, err
			}
		}
		s.recorder.EndSpan(span, nil)
		totalUsage = totalUsage.Add(resp.Usage)
		outcome.Provider = resp.Provider
		outcome.Degraded = outcome.Degraded || resp.Provider == "offline"

		rec := StepRecord{Index: step, ContentLen: len(resp.Content)}

		// 没有工具调用 → 结束循环
		if len(resp.ToolCalls) == 0 {
			outcome.Content = resp.Content
			outcome.FinishReason = resp.FinishReason
			steps = append(steps, rec)
			break
		}

		// 有工具调用 → 逐个执行并把结果回灌给模型
		limit := len(resp.ToolCalls)
		if limit > s.cfg.MaxToolCallsPerStep {
			limit = s.cfg.MaxToolCallsPerStep
		}
		for _, call := range resp.ToolCalls[:limit] {
			toolSpan := s.recorder.StartSpan(trace.TraceID, "tool."+call.Function.Name, obs.SpanTool, span.SpanID)
			result, ticket, execErr := s.executeToolCall(ctx, call, req, trace.TraceID)

			if ticket != nil {
				// 需要人工确认：记录工单后结束本轮，等待前端放行
				rec.ToolCalls = append(rec.ToolCalls, ToolCallRecord{
					ID:            call.ID,
					Name:          call.Function.Name,
					Arguments:     call.Function.Arguments,
					PendingTicket: ticket.ID,
				})
				s.recorder.EndSpan(toolSpan, nil)
				continue
			}

			callRec := ToolCallRecord{
				ID:        call.ID,
				Name:      call.Function.Name,
				Arguments: call.Function.Arguments,
			}
			if execErr != nil || result == nil {
				callRec.IsError = true
				callRec.Result = errorText(execErr)
			} else {
				callRec.Result = result.Content
				callRec.IsError = result.IsError
				callRec.DurationMs = result.Duration.Milliseconds()
				callRec.Approved = req.AutoApprove
			}
			rec.ToolCalls = append(rec.ToolCalls, callRec)
			s.recorder.EndSpan(toolSpan, execErr)

			// 工具结果回灌：必须携带 tool_call_id，否则模型无法对应
			messages = append(messages, llm.Message{
				Role:       llm.RoleTool,
				Content:    callRec.Result,
				Name:       call.Function.Name,
				ToolCallID: call.ID,
			})
		}
		steps = append(steps, rec)

		// 本轮存在待人工确认的调用 → 先返回，等前端带 approvedToolCalls 重试
		if pendingCount(rec) > 0 {
			outcome.FinishReason = "awaiting_approval"
			break
		}
	}

	// 输出护栏：命中高危 PII 时拦截并脱敏
	if outcome.Content != "" {
		verdict := guard.InspectOutput(outcome.Content)
		if verdict.Verdict == guard.VerdictBlock {
			outcome.Content = "输出包含敏感信息已被拦截。"
			outcome.FinishReason = "blocked_pii"
		} else if verdict.Verdict == guard.VerdictRewrite {
			outcome.Content = verdict.Text
		}
	}

	latency := s.now().Sub(started).Milliseconds()
	outcome.Usage = totalUsage
	outcome.CostUSD = llm.EstimateCost(model, totalUsage).Total
	outcome.Steps = steps
	outcome.LatencyMs = latency

	status := "ok"
	if outcome.Degraded {
		status = "degraded"
	}
	run := obs.Run{
		TraceID:          trace.TraceID,
		Kind:             obs.RunChat,
		Model:            model,
		Provider:         outcome.Provider,
		UserID:           req.UserID,
		SessionID:        req.SessionID,
		KnowledgeBaseID:  req.KnowledgeBaseID,
		PromptTokens:     totalUsage.PromptTokens,
		CompletionTokens: totalUsage.CompletionTokens,
		TotalTokens:      totalUsage.TotalTokens,
		CostUSD:          outcome.CostUSD,
		LatencyMs:        latency,
		Steps:            len(steps),
		ToolCalls:        countToolCalls(steps),
		Retrievals:       len(hits),
		Status:           status,
		Degraded:         outcome.Degraded,
	}
	s.recorder.RecordRun(run)
	s.recorder.EndTrace(trace)
	outcome.RunID = run.ID
	return outcome, nil
}

// ChatStream 执行一次流式聊天，事件通过返回的 channel 推送。
//
// 事件顺序：start → sources? → (delta | tool_call → tool_result | approval_required)+ → usage → done
// 任意环节出错推送 error 事件并关闭 channel。
func (s *Service) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamEvent, error) {
	out := make(chan StreamEvent, 64)

	model := req.Model
	if model == "" {
		model = s.cfg.DefaultModel
	}
	provider, ok := s.llm.Resolve(model)
	if !ok {
		return nil, ErrNoProvider
	}

	toolSchema := s.selectTools(req)
	trace := s.recorder.StartTrace("ai.chat.stream")

	go func() {
		defer close(out)

		started := s.now()
		emit := func(ev StreamEvent) bool {
			select {
			case out <- ev:
				return true
			case <-ctx.Done():
				return false
			}
		}

		messages, hits, guardErr := s.resolveMessages(ctx, req)
		if guardErr != nil {
			s.recorder.EndTrace(trace)
			emit(streamEvent(EventError, ErrorData{Message: guardErr.Reason, Code: "input_blocked", TraceID: trace.TraceID}))
			return
		}

		// runId 提前生成并下发：前端可在首帧就拿到它，用于后续关联 trace 与反馈
		runID := newRunID()
		emit(streamEvent(EventStart, StartData{
			RunID:     runID,
			TraceID:   trace.TraceID,
			Model:     model,
			Provider:  provider.ID(),
			MaxSteps:  s.cfg.MaxSteps,
			ToolCount: len(toolSchema),
		}))

		if len(hits) > 0 {
			emit(streamEvent(EventSources, SourcesData{Items: hits, TopK: len(hits)}))
		}

		totalUsage := llm.Usage{}
		steps := 0
		toolCalls := 0
		degraded := false
		finishReason := "stop"
		var firstDeltaAt time.Time

		for step := 0; step < s.cfg.MaxSteps; step++ {
			steps = step + 1
			span := s.recorder.StartSpan(trace.TraceID, fmt.Sprintf("llm.step.%d", step), obs.SpanLLM, "")

			chunks, err := provider.Stream(ctx, llm.Request{
				Model:       model,
				Messages:    messages,
				Tools:       toolSchema,
				Temperature: req.Temperature,
				MaxTokens:   req.MaxTokens,
				User:        req.UserID,
			})
			if err != nil {
				// 流式失败 → 降级到离线流，保证前端不会卡死
				s.recorder.EndSpan(span, err)
				if fbChunks, fbErr := llm.Offline().Stream(ctx, llm.Request{Model: model, Messages: messages}); fbErr == nil {
					chunks = fbChunks
					degraded = true
				} else {
					emit(streamEvent(EventError, ErrorData{Message: err.Error(), TraceID: trace.TraceID}))
					return
				}
			}

			var content strings.Builder
			var deltas []llm.ToolCallDelta
			stepFinish := ""

			for chunk := range chunks {
				if chunk.Err != nil {
					emit(streamEvent(EventError, ErrorData{Message: chunk.Err.Error(), TraceID: trace.TraceID}))
					s.recorder.EndSpan(span, chunk.Err)
					return
				}
				if chunk.Content != "" {
					if firstDeltaAt.IsZero() {
						firstDeltaAt = s.now()
					}
					content.WriteString(chunk.Content)
					if !emit(streamEvent(EventDelta, DeltaData{Text: chunk.Content})) {
						return
					}
				}
				if chunk.Reasoning != "" {
					emit(streamEvent(EventReasoning, DeltaData{Text: chunk.Reasoning}))
				}
				if len(chunk.ToolCallDeltas) > 0 {
					deltas = append(deltas, chunk.ToolCallDeltas...)
				}
				if chunk.Usage != nil {
					totalUsage = totalUsage.Add(*chunk.Usage)
				}
				if chunk.FinishReason != "" {
					stepFinish = chunk.FinishReason
				}
				if chunk.Provider == "offline" {
					degraded = true
				}
			}
			if stepFinish != "" {
				finishReason = stepFinish
			}
			s.recorder.EndSpan(span, nil)

			calls := llm.MergeToolCallDeltas(deltas)
			if len(calls) == 0 {
				// 模型没有再要工具 → 正常结束
				break
			}

			emit(streamEvent(EventStep, StepData{Index: step, MaxSteps: s.cfg.MaxSteps, ToolCalls: len(calls)}))

			pending := 0
			limit := len(calls)
			if limit > s.cfg.MaxToolCallsPerStep {
				limit = s.cfg.MaxToolCallsPerStep
			}
			for _, call := range calls[:limit] {
				toolCalls++
				emit(streamEvent(EventToolCall, ToolCallData{
					ID:        call.ID,
					Name:      call.Function.Name,
					Arguments: call.ArgumentsMap(),
				}))

				toolSpan := s.recorder.StartSpan(trace.TraceID, "tool."+call.Function.Name, obs.SpanTool, span.SpanID)
				result, ticket, execErr := s.executeToolCall(ctx, call, req, trace.TraceID)

				if ticket != nil {
					pending++
					emit(streamEvent(EventApprovalRequired, ApprovalData{
						TicketID:   ticket.ID,
						ToolCallID: call.ID,
						Name:       call.Function.Name,
						Arguments:  call.ArgumentsMap(),
						Level:      ticket.Level.String(),
						Reason:     ticket.Reason,
					}))
					s.recorder.EndSpan(toolSpan, nil)
					continue
				}

				payload := ToolResultData{ID: call.ID, Name: call.Function.Name}
				if execErr != nil || result == nil {
					payload.IsError = true
					payload.Result = errorText(execErr)
				} else {
					payload.Result = result.Content
					payload.IsError = result.IsError
					payload.DurationMs = result.Duration.Milliseconds()
					payload.AuditID = result.AuditID
				}
				emit(streamEvent(EventToolResult, payload))
				s.recorder.EndSpan(toolSpan, execErr)

				messages = append(messages, llm.Message{
					Role:       llm.RoleTool,
					Content:    payload.Result,
					Name:       call.Function.Name,
					ToolCallID: call.ID,
				})
			}

			if pending > 0 {
				// 等待人工确认：前端带 approvedToolCalls 重新发起
				finishReason = "awaiting_approval"
				break
			}
		}

		latency := s.now().Sub(started).Milliseconds()
		cost := llm.EstimateCost(model, totalUsage)
		emit(streamEvent(EventUsage, usageData(totalUsage, model)))

		status := "ok"
		if degraded {
			status = "degraded"
		}
		run := obs.Run{
			ID:               runID,
			TraceID:          trace.TraceID,
			Kind:             obs.RunChat,
			Model:            model,
			Provider:         provider.ID(),
			UserID:           req.UserID,
			SessionID:        req.SessionID,
			KnowledgeBaseID:  req.KnowledgeBaseID,
			PromptTokens:     totalUsage.PromptTokens,
			CompletionTokens: totalUsage.CompletionTokens,
			TotalTokens:      totalUsage.TotalTokens,
			CostUSD:          cost.Total,
			LatencyMs:        latency,
			TTFTMs:           ttftMs(started, firstDeltaAt),
			Steps:            steps,
			ToolCalls:        toolCalls,
			Retrievals:       len(hits),
			Status:           status,
			Degraded:         degraded,
		}
		s.recorder.RecordRun(run)
		s.recorder.EndTrace(trace)

		emit(streamEvent(EventDone, DoneData{
			FinishReason: finishReason,
			Degraded:     degraded,
			Steps:        steps,
			ToolCalls:    toolCalls,
			LatencyMs:    latency,
			TraceID:      trace.TraceID,
			RunID:        run.ID,
		}))
	}()

	return out, nil
}

// newRunID 生成一次运行的唯一标识。
func newRunID() string { return "run_" + uuid.NewString() }

// errorText 把错误转成可回灌给模型的文本。
func errorText(err error) string {
	if err == nil {
		return "工具执行失败：未知错误"
	}
	if errors.Is(err, tool.ErrPermissionDenied) {
		return "工具执行失败：权限不足，需要人工确认"
	}
	if errors.Is(err, tool.ErrInjectionDetected) {
		return "工具执行失败：参数命中安全规则被拦截"
	}
	if errors.Is(err, tool.ErrRateLimited) {
		return "工具执行失败：调用过于频繁，请稍后再试"
	}
	if errors.Is(err, tool.ErrTimeout) {
		return "工具执行失败：执行超时"
	}
	return "工具执行失败：" + err.Error()
}

// pendingCount 统计一轮中待人工确认的调用数。
func pendingCount(rec StepRecord) int {
	n := 0
	for _, c := range rec.ToolCalls {
		if c.PendingTicket != "" {
			n++
		}
	}
	return n
}

// countToolCalls 统计全部步骤中的工具调用数。
func countToolCalls(steps []StepRecord) int {
	n := 0
	for _, s := range steps {
		n += len(s.ToolCalls)
	}
	return n
}

// ttftMs 计算首 token 耗时；未收到任何 delta 时返回 0。
func ttftMs(started, firstDelta time.Time) int64 {
	if firstDelta.IsZero() {
		return 0
	}
	return firstDelta.Sub(started).Milliseconds()
}
