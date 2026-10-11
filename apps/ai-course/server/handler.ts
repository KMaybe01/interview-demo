import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { estimateCost, type ModelTier, sumUsage, type TokenUsage } from '../shared/cost.ts';
import * as a2a from './a2a.ts';
import { getAudit, runAgent } from './agent.ts';
import { listApprovals, resolveApproval } from './approvals.ts';
import { inspectInput, inspectOutput, wrapWithDelimiters } from './guard.ts';
import { handleMcpRequest } from './mcp.ts';
import { listModels, resolveModel } from './models.ts';
import { endSpan, getTrace, listTraces, type Span, startSpan, startTrace } from './obs.ts';
import { addDocument, buildContext, listDocuments, search } from './rag.ts';
import { breaker } from './resilience.ts';
import { TOOLS } from './tools.ts';

/**
 * 教程 BFF：一条链路里把「护栏 → 检索 → 模型 → 成本」串起来，
 * 每个环节都埋了 span，所以前端能画出瀑布图。
 *
 *   GET  /api/models                  模型清单 + 运行模式
 *   POST /api/chat                    流式聊天（可选 stage=rag 走检索增强）
 *   GET|POST /api/rag/documents       知识库文档
 *   POST /api/rag/search              检索（可单独调试召回质量）
 *   POST /api/guard/inspect           护栏检测（输入/输出）
 *   GET  /api/obs/traces[:id]         trace 列表与详情
 *   GET  /api/resilience              熔断状态
 *   POST /api/resilience/simulate-failure  模拟一次 provider 失败（演示熔断）
 */

const SYSTEM_PROMPT = [
  '你是 AI Course 的教学助手，面向正在从前端转型 AI 开发的工程师。',
  '回答要求：先给结论，再给取舍；涉及代码时给可直接运行的片段；不要编造没有依据的数据。',
  '如果提供了参考资料，请基于资料回答，并在句末用 [n] 标注引用来源编号。',
].join('\n');

const MAX_BODY_BYTES = 2 * 1024 * 1024;

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error('请求体过大');
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user') continue;
    return message.parts
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
}

interface ChatBody {
  messages?: UIMessage[];
  tier?: ModelTier;
  stage?: 'chat' | 'rag';
}

async function handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: ChatBody;
  try {
    body = await readJsonBody<ChatBody>(req);
  } catch (error) {
    sendJson(res, 400, { error: '请求体解析失败', detail: (error as Error).message });
    return;
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const tier: ModelTier = body.tier === 'smart' ? 'smart' : 'fast';
  const useRag = body.stage === 'rag';

  const { traceId, root } = startTrace('chat');
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  // ① 护栏：在调用模型之前、检索之前
  const guardSpan = startSpan(traceId, 'guard.inspectInput', 'guard', root.spanId);
  const question = lastUserText(messages);
  const report = inspectInput(question);
  endSpan(guardSpan, 'ok', {
    blocked: report.blocked,
    reasons: report.reasons,
    pii: report.pii.length,
  });

  if (report.blocked) {
    endSpan(root, 'error', { blocked: true }, 'input_blocked');
    sendJson(res, 400, {
      error: 'input_blocked',
      reasons: report.reasons,
      traceId,
    });
    return;
  }

  // ② 检索（仅 RAG 关卡）：用脱敏后的 query，避免敏感信息进入检索与日志
  let context = '';
  let sources: Array<{ id: string; score: number; preview: string }> = [];
  if (useRag) {
    const retrievalSpan = startSpan(traceId, 'rag.search', 'retrieval', root.spanId);
    const chunks = search(report.masked, 3);
    context = buildContext(chunks);
    sources = chunks.map((chunk) => ({
      id: chunk.id,
      score: chunk.score,
      preview: chunk.text.slice(0, 80),
    }));
    endSpan(retrievalSpan, 'ok', { topK: 3, hits: chunks.length });
  }

  const { model, entry } = resolveModel(tier);
  const llmSpan: Span = startSpan(traceId, `llm.${entry.id}`, 'llm', root.spanId);
  const startedAt = Date.now();

  const result = streamText({
    model,
    system: [SYSTEM_PROMPT, useRag && context ? `参考资料：\n${context}` : '']
      .filter(Boolean)
      .join('\n\n'),
    // v7 的 convertToModelMessages 是异步的，记得 await
    messages: await convertToModelMessages(messages),
    temperature: tier === 'smart' ? 0.3 : 0.7,
    maxOutputTokens: 1024,
    abortSignal: controller.signal,
  });

  const usageList: TokenUsage[] = [];

  const stream = toUIMessageStream({
    stream: result.stream,
    messageMetadata: ({ part }) => {
      if (part.type !== 'finish') return undefined;
      const usage = part.totalUsage;
      usageList.push(usage);
      return {
        tier: entry.tier,
        modelId: entry.id,
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        },
        cost: estimateCost(usage, entry.tier),
        traceId,
        sources: sources.length ? sources : undefined,
      };
    },
    onEnd: () => {
      const total = sumUsage(usageList);
      endSpan(llmSpan, 'ok', { ...total, ttftMs: Date.now() - startedAt, modelId: entry.id });
      endSpan(root, 'ok', { tier: entry.tier, traceId });
    },
  });

  try {
    await pipeUIMessageStreamToResponse({ response: res, stream });
  } catch (error) {
    endSpan(llmSpan, 'error', undefined, (error as Error).message);
    endSpan(root, 'error');
    if (!res.headersSent) {
      sendJson(res, 500, { error: '流式响应失败', detail: (error as Error).message });
    }
  }
}

type NextFn = (err?: unknown) => void;

/** connect 风格中间件：既能挂 Vite dev server，也能直接给 node:http 用。 */
export function createApiHandler() {
  return async function apiHandler(req: IncomingMessage, res: ServerResponse, next?: NextFn) {
    const url = req.url ?? '';
    const path = url.split('?')[0];
    const method = req.method ?? 'GET';

    if (path === '/api/models' && method === 'GET') {
      sendJson(res, 200, listModels());
      return;
    }

    if (path === '/api/chat' && method === 'POST') {
      await handleChat(req, res);
      return;
    }

    if (path === '/api/rag/documents' && method === 'GET') {
      sendJson(res, 200, { documents: listDocuments() });
      return;
    }

    if (path === '/api/rag/documents' && method === 'POST') {
      const body = await readJsonBody<{ title?: string; text?: string }>(req);
      if (!body.text) {
        sendJson(res, 400, { error: '缺少 text' });
        return;
      }
      sendJson(res, 201, addDocument(body.title ?? '未命名文档', body.text));
      return;
    }

    if (path === '/api/rag/search' && method === 'POST') {
      const body = await readJsonBody<{ query?: string; topK?: number }>(req);
      const hits = search(body.query ?? '', body.topK ?? 3);
      sendJson(res, 200, { hits, context: buildContext(hits) });
      return;
    }

    if (path === '/api/guard/inspect' && method === 'POST') {
      const body = await readJsonBody<{ text?: string; direction?: 'input' | 'output' }>(req);
      const text = body.text ?? '';
      const result =
        body.direction === 'output'
          ? { direction: 'output', ...inspectOutput(text) }
          : { direction: 'input', ...inspectInput(text) };
      sendJson(res, 200, { ...result, delimited: wrapWithDelimiters(text).slice(0, 400) });
      return;
    }

    if (path === '/api/obs/traces' && method === 'GET') {
      sendJson(res, 200, { traces: listTraces() });
      return;
    }

    if (path?.startsWith('/api/obs/traces/') && method === 'GET') {
      const traceId = path.slice('/api/obs/traces/'.length);
      const trace = getTrace(traceId);
      sendJson(res, trace ? 200 : 404, trace ?? { error: 'trace not found' });
      return;
    }

    // MCP 2026-07-28 无状态单端点：无 initialize、无 session id
    if (path === '/api/mcp' && method === 'POST') {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const response = await handleMcpRequest(body, {
        protocolVersion: req.headers['mcp-protocol-version'] as string | undefined,
      });
      sendJson(res, 200, response);
      return;
    }

    if (path === '/api/a2a/agents' && method === 'GET') {
      sendJson(res, 200, { agents: a2a.listAgents() });
      return;
    }

    if (path?.startsWith('/api/a2a/agents/') && path.endsWith('/card') && method === 'GET') {
      const agentId = path.slice('/api/a2a/agents/'.length, -'/card'.length);
      const card = a2a.getCard(agentId);
      sendJson(res, card ? 200 : 404, card ?? { error: 'agent not found' });
      return;
    }

    if (path?.startsWith('/api/a2a/agents/') && path.endsWith('/tasks') && method === 'POST') {
      const agentId = path.slice('/api/a2a/agents/'.length, -'/tasks'.length);
      const body = await readJsonBody<{ text?: string; taskId?: string }>(req);
      const task = a2a.sendMessage({ agentId, text: body.text ?? '', taskId: body.taskId });
      sendJson(res, 'error' in task ? 400 : 201, task);
      return;
    }

    if (path === '/api/a2a/tasks' && method === 'GET') {
      sendJson(res, 200, { tasks: a2a.listTasks() });
      return;
    }

    if (path?.startsWith('/api/a2a/tasks/') && path.endsWith('/cancel') && method === 'POST') {
      const taskId = path.slice('/api/a2a/tasks/'.length, -'/cancel'.length);
      const task = a2a.cancelTask(taskId);
      sendJson(res, 'error' in task ? 409 : 200, task);
      return;
    }

    if (path?.startsWith('/api/a2a/tasks/') && method === 'GET') {
      const task = a2a.getTask(path.slice('/api/a2a/tasks/'.length));
      sendJson(res, task ? 200 : 404, task ?? { error: 'task not found' });
      return;
    }

    if (path === '/api/agent/tools' && method === 'GET') {
      sendJson(
        res,
        200,
        TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          level: tool.level,
          timeoutMs: tool.timeoutMs,
          idempotent: tool.idempotent,
        })),
      );
      return;
    }

    if (path === '/api/agent/run' && method === 'POST') {
      const body = await readJsonBody<{
        task?: string;
        approvedToolCalls?: string[];
        idempotencyKey?: string;
      }>(req);
      const result = await runAgent({
        task: body.task ?? '',
        approvedToolCalls: body.approvedToolCalls,
        idempotencyKey: body.idempotencyKey,
      });
      sendJson(res, 200, result);
      return;
    }

    if (path === '/api/agent/approvals' && method === 'GET') {
      sendJson(res, 200, { approvals: listApprovals() });
      return;
    }

    if (
      path?.startsWith('/api/agent/approvals/') &&
      path.endsWith('/resolve') &&
      method === 'POST'
    ) {
      const id = path.slice('/api/agent/approvals/'.length, -'/resolve'.length);
      const body = await readJsonBody<{ approve?: boolean }>(req);
      const result = resolveApproval(id, body.approve !== false);
      sendJson(res, 'error' in result ? 404 : 200, result);
      return;
    }

    if (path === '/api/agent/audit' && method === 'GET') {
      sendJson(res, 200, { audit: getAudit() });
      return;
    }

    if (path === '/api/resilience' && method === 'GET') {
      sendJson(res, 200, { circuits: breaker.snapshot() });
      return;
    }

    if (path === '/api/resilience/simulate-failure' && method === 'POST') {
      const body = await readJsonBody<{ id?: string }>(req);
      const id = body.id ?? 'provider:primary';
      breaker.recordFailure(id);
      sendJson(res, 200, { circuits: breaker.snapshot(id) });
      return;
    }

    next?.();
  };
}
