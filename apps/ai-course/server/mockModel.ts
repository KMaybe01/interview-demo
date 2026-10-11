import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

/**
 * 离线演示模型。
 *
 * 没有配置任何厂商 API Key 时，用它顶上，保证「零配置也能跑通完整链路」：
 * 前端 → DefaultChatTransport → /api/chat → streamText → SSE → useChat。
 *
 * 它实现的是 AI SDK 的 LanguageModelV2 接口，因此能被 `streamText` 原样消费——
 * 换成真实模型时，业务代码一行都不用改。
 */

const MODEL_ID = 'course-offline-mock';
const CHUNK_DELAY_MS = 24;

/** 从标准化 prompt 里取出最后一条用户消息的文本。 */
function extractLastUserText(prompt: LanguageModelV2Prompt): string {
  const lastMessage = prompt.at(-1);
  if (!lastMessage || !Array.isArray(lastMessage.content)) return '';
  return lastMessage.content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join(' ')
    .trim();
}

function buildReply(question: string): string {
  const quoted = question ? `你刚才问的是：**${question}**` : '你发了一条空消息';
  return [
    '【离线演示模式】没有检测到 `OPENAI_API_KEY`，当前由本地假模型应答。',
    '',
    quoted,
    '',
    '这条回答的完整链路和真实模型完全一致：',
    '`streamText` → `toUIMessageStream` → SSE → `DefaultChatTransport` → `useChat` → 逐字渲染。',
    '',
    '在 `apps/ai-course/.env` 里配置好 Key 后重启 `bun run dev`，同一个页面会换成真实模型，' +
      '消息下方的 Token 用量与估算成本也会变成真实数字。',
  ].join('\n');
}

/** 粗略估算 token 数。中文约 1.5 字符/token，够用来演示计量，别拿它对账。 */
function roughTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 2));
}

function chunkText(text: string): string[] {
  return text.match(/[\s\S]{1,3}/g) ?? [];
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      resolve();
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function createOfflineModel(): LanguageModelV2 {
  return {
    specificationVersion: 'v2',
    provider: 'interview-demo',
    modelId: MODEL_ID,
    supportedUrls: {},

    async doStream({ prompt, abortSignal }: LanguageModelV2CallOptions) {
      const question = extractLastUserText(prompt);
      const text = buildReply(question);
      const parts: LanguageModelV2StreamPart[] = [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 'txt-0' },
      ];

      for (const chunk of chunkText(text)) {
        if (abortSignal?.aborted) break;
        await sleep(CHUNK_DELAY_MS, abortSignal);
        parts.push({ type: 'text-delta', id: 'txt-0', delta: chunk });
      }

      parts.push({ type: 'text-end', id: 'txt-0' });
      parts.push({
        type: 'finish',
        finishReason: 'stop',
        usage: {
          inputTokens: roughTokens(question),
          outputTokens: roughTokens(text),
          totalTokens: roughTokens(question) + roughTokens(text),
        },
      });

      // 用 iterator + 小延迟喂给 AI SDK，模拟真实的逐 token 到达节奏
      const stream = new ReadableStream<LanguageModelV2StreamPart>({
        async pull(controller) {
          const next = parts.shift();
          if (!next) {
            controller.close();
            return;
          }
          controller.enqueue(next);
          await sleep(4);
        },
      });

      return { stream, request: { body: undefined }, response: { headers: undefined } };
    },

    async doGenerate({ prompt }: LanguageModelV2CallOptions) {
      const question = extractLastUserText(prompt);
      const text = buildReply(question);
      return {
        content: [{ type: 'text', text }],
        finishReason: 'stop',
        usage: {
          inputTokens: roughTokens(question),
          outputTokens: roughTokens(text),
          totalTokens: roughTokens(question) + roughTokens(text),
        },
        warnings: [],
        request: { body: undefined },
        response: { headers: undefined },
      };
    },
  };
}
