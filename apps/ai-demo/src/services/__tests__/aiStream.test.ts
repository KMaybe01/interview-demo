import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AIStreamEvent } from '../../types/ai.ts';
import { streamChat } from '../aiStream.ts';

/** 把一段 SSE 文本按 chunk 切分后包装成 ReadableStream */
function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset < chunks.length) {
        controller.enqueue(encoder.encode(chunks[offset]));
        offset += 1;
      } else {
        controller.close();
      }
    },
  });
}

function mockFetchWithSSE(chunks: string[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: sseStream(chunks),
    text: vi.fn().mockResolvedValue(''),
  });
}

/** 消费一个流，返回 { types, deltas, error, done } */
async function run(signal?: AbortSignal) {
  const events: AIStreamEvent[] = [];
  let error: string | null = null;
  let done = false;
  await new Promise<void>((resolve) => {
    streamChat(
      { messages: [{ role: 'user', content: 'hi' }] },
      {
        onEvent: (e) => events.push(e),
        onError: (m) => {
          error = m;
        },
        onDone: () => {
          done = true;
          resolve();
        },
      },
      signal,
    );
  });
  const types: string[] = events.map((e) => e.type);
  return {
    types,
    deltas: events.filter((e) => e.type === 'delta').map((e) => (e.data as { text: string }).text),
    error,
    done,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('aiStream 客户端', () => {
  it('按事件类型解析完整流（含分帧边界）', async () => {
    // 一帧被拆成多个 chunk、一个 chunk 含多帧，模拟真实 TCP 分帧
    const raw = [
      'event: start\ndata: {"runId":"r1","traceId":"t1"}\n\n',
      'event: delta\ndata: {"text":"你好"}\n\nevent: delta\ndata: {"text":"世界"}\n\n',
      ': ping\n\n',
      'event: usage\ndata: {"promptTokens":1,"completionTokens":2,"totalTokens":3,"costUsd":0.001}\n\n',
      'event: done\ndata: {"finishReason":"stop","degraded":false}\n\n',
    ];
    vi.stubGlobal('fetch', mockFetchWithSSE(raw));

    const result = await run();
    expect(result.types).toEqual(['start', 'delta', 'delta', 'usage', 'done']);
    // 注释行被忽略
    expect(result.types.includes('ping')).toBe(false);
    // delta 拼接正确
    expect(result.deltas.join('')).toBe('你好世界');
    expect(result.error).toBeNull();
    expect(result.done).toBe(true);
  });

  it('服务端非 2xx 时回调错误并结束', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        body: null,
        text: vi.fn().mockResolvedValue('{"error":"内部错误"}'),
      }),
    );

    const result = await run();
    expect(result.types).toHaveLength(0);
    expect(result.error).not.toBeNull();
    expect(result.done).toBe(true);
  });

  it('外部取消时不回调错误', async () => {
    const raw = ['event: start\ndata: {"runId":"r"}\n\n'];
    vi.stubGlobal('fetch', mockFetchWithSSE(raw));

    const controller = new AbortController();
    const result = await run(controller.signal);
    expect(result.error).toBeNull();
    expect(result.done).toBe(true);
  });

  it('畸形数据帧不中断流（跳过而非抛错）', async () => {
    const raw = [
      'event: start\ndata: {"runId":"r"}\n\n',
      'event: delta\ndata: not-json\n\n',
      'event: delta\ndata: {"text":"ok"}\n\n',
      'event: done\ndata: {"finishReason":"stop"}\n\n',
    ];
    vi.stubGlobal('fetch', mockFetchWithSSE(raw));

    const result = await run();
    expect(result.types).toEqual(['start', 'delta', 'done']);
  });
});
