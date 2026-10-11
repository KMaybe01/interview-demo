import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { estimateCost, type ModelTier } from '../shared/cost.ts';
import { listModels, resolveModel } from './models.ts';

/**
 * 第一关的 BFF：只暴露两个接口，把「和企业-4"比』」的事压缩到最小：
 *
 *   GET  /api/models      模型清单 + 当前运行模式（online / offline）
 *   POST /api/chat        流式聊天（AI SDK 的 UI Message Stream 协议）
 *
 * 这一段刻意保持「薄」：真正的企业级能力（护栏、审批、trace、评测）会在第四关逐步加进来。
 */

const SYSTEM_PROMPT = [
  '你是 AI Course 的教学助手，面向正在从前端转型 AI 开发的工程师。',
  '回答要求：先给结论，再给取舍；涉及代码时给可直接运行的片段；不要编造没有依据的数据。',
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
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(body);
}

interface ChatBody {
  messages?: UIMessage[];
  tier?: ModelTier;
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
  const { model, entry } = resolveModel(tier);

  // 用户中途关闭页面 / 点击停止 → 立刻中止生成，别让服务端继续烧钱
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    // v7 的 convertToModelMessages 是异步的，记得 await
    messages: await convertToModelMessages(messages),
    temperature: tier === 'smart' ? 0.3 : 0.7,
    maxOutputTokens: 1024,
    abortSignal: controller.signal,
  });

  // 把 usage 与「估算成本」作为 message metadata 一起推给前端，
  // 前端就能在每条消息下显示这次调用到底花了多少钱。
  const stream = toUIMessageStream({
    stream: result.stream,
    messageMetadata: ({ part }) => {
      if (part.type !== 'finish') return undefined;
      const usage = part.totalUsage;
      return {
        tier: entry.tier,
        modelId: entry.id,
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        },
        cost: estimateCost(usage, entry.tier),
      };
    },
  });

  try {
    await pipeUIMessageStreamToResponse({ response: res, stream });
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 500, { error: '流式响应失败', detail: (error as Error).message });
    }
  }
}

type NextFn = (err?: unknown) => void;

/**
 * 返回 connect 风格的中间件：既能挂到 Vite dev server（见 vite.config.ts），
 * 也能直接给 `node:http`（见 server/index.ts）用。
 */
export function createApiHandler() {
  return async function apiHandler(req: IncomingMessage, res: ServerResponse, next?: NextFn) {
    const rawUrl = req.url ?? '';
    const path = rawUrl.split('?')[0];

    if (path === '/api/models' && req.method === 'GET') {
      sendJson(res, 200, listModels());
      return;
    }

    if (path === '/api/chat' && req.method === 'POST') {
      await handleChat(req, res);
      return;
    }

    next?.();
  };
}
