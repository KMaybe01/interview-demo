/**
 * /api/ai/chat/stream 的 SSE 客户端。
 *
 * 为什么自己解析而不直接用 AI SDK 的 useChat：
 * 后端是自建 Go 服务，走的是我们自定义的 `event: <type>\ndata: <json>` 协议，
 * 而不是 AI SDK 内部的 UIMessageStream 帧格式。手写解析器的代价是必须严格处理
 * 分帧边界——TCP 可能把一帧切成多次到达，也可能一次带来多帧，
 * 因此这里用「缓冲区 + \n\n 边界」而不是按行读取。
 */

import type { AIStreamEvent } from '../types/ai.ts';

const EVENT_SEPARATOR = '\n\n';

/** 心跳注释行（`: ping`），服务端 15s 发一次用于保活 */
function isComment(raw: string): boolean {
  return raw.trimStart().startsWith(':');
}

/** 从一帧原始文本解析出事件；无法解析时返回 null（不中断整个流） */
function parseFrame(raw: string): AIStreamEvent | null {
  let type = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) {
      type = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }
  if (dataLines.length === 0) return null;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join('\n'));
  } catch {
    return null;
  }
  return { type, data } as AIStreamEvent;
}

export interface StreamHandlers {
  onEvent: (event: AIStreamEvent) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export interface StreamController {
  abort: () => void;
}

/**
 * 发起一次流式聊天请求。
 *
 * @param body 请求体，见 AIChatRequest
 * @param handlers 事件回调；onDone 在流正常结束或出错后必定触发一次
 * @param signal 外部取消信号（用户点「停止」时传入）
 */
export function streamChat(
  body: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): StreamController {
  const controller = new AbortController();
  const abort = () => controller.abort();

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  void (async () => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onExternalAbort);
      handlers.onDone?.();
    };

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || `流式请求失败（HTTP ${response.status}）`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按 \n\n 边界切帧，保留未完成的部分到下一轮
        let boundary = buffer.indexOf(EVENT_SEPARATOR);
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + EVENT_SEPARATOR.length);
          if (!isComment(frame)) {
            const event = parseFrame(frame);
            if (event) handlers.onEvent(event);
          }
          boundary = buffer.indexOf(EVENT_SEPARATOR);
        }
      }

      // 流结束时冲刷残留缓冲（服务端可能没有以 \n\n 收尾）
      if (buffer.trim() && !isComment(buffer)) {
        const event = parseFrame(buffer);
        if (event) handlers.onEvent(event);
      }
      finish();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        finish();
        return;
      }
      handlers.onError?.((error as Error).message || '流式请求失败');
      finish();
    }
  })();

  return { abort };
}
