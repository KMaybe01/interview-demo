import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useMemo, useRef, useState } from 'react';
import { type CostBreakdown, formatUsd, type ModelTier } from '../../../shared/cost.ts';
import { badge, buttonStyle, card, colors } from '../../ui/styles.ts';

/**
 * 第一关：流式对话的最小可交付闭环。
 *
 * 这一关要看的四个工程点：
 *   1. `transport`       —— v7 起必须显式传 transport（`DefaultChatTransport`）
 *   2. `message.parts`   —— 不能只渲染 `content`，否则工具调用/推理内容会丢
 *   3. `status`          —— submitted / streaming / error 三态决定 UI 能不能中断
 *   4. `message.metadata`—— 服务端回传的 usage 与成本，做「成本可见」
 */

interface ChatMetadata {
  tier: ModelTier;
  modelId: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  cost: CostBreakdown;
}

function readMetadata(message: UIMessage): ChatMetadata | null {
  return (message.metadata as ChatMetadata | undefined) ?? null;
}

const TIER_OPTIONS: Array<{ value: ModelTier; label: string }> = [
  { value: 'fast', label: '快速档（日常对话）' },
  { value: 'smart', label: '旗舰档（复杂任务）' },
];

export default function ChatStage() {
  const [tier, setTier] = useState<ModelTier>('fast');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { tier } }),
    [tier],
  );

  const { messages, sendMessage, stop, status, error, regenerate } = useChat({ transport });

  const isBusy = status === 'submitted' || status === 'streaming';

  const submit = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: '10px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: 12, color: colors.textDim }}>模型档位</span>
        {TIER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTier(option.value)}
            style={buttonStyle(tier === option.value ? 'primary' : 'ghost')}
          >
            {option.label}
          </button>
        ))}
        {isBusy ? (
          <button type="button" onClick={() => stop()} style={buttonStyle('danger')}>
            停止生成
          </button>
        ) : null}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {messages.length === 0 ? (
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>试着问点什么</div>
            <div style={{ color: colors.textDim, fontSize: 13, lineHeight: 1.9 }}>
              例如：用一句话解释 SSE 和 WebSocket 的区别 / 前端做 AI 应用的优势在哪 / 怎么降低 Token
              成本
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const meta = readMetadata(message);
          const mine = message.role === 'user';
          return (
            <div key={message.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 6 }}>
                {mine ? '我' : 'AI'}
              </div>
              {/* 关键：遍历 parts，而不是直接取 message.content */}
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <div
                      key={`${message.id}-${index}`}
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: mine ? colors.brandSoft : colors.panelSoft,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {part.text}
                    </div>
                  );
                }
                return (
                  <div
                    key={`${message.id}-${index}`}
                    style={{ color: colors.textDim, fontSize: 12 }}
                  >
                    [{part.type}] 《下面的关卡会把这类 part 渲染成工具调用卡片》
                  </div>
                );
              })}

              {meta ? (
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={badge('info')}>
                    {meta.modelId} · {meta.usage.totalTokens} tokens
                  </span>
                  <span style={{ fontSize: 12, color: colors.textDim }}>
                    本次估算 {formatUsd(meta.cost.total)}（教学示例价，非厂商报价）
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}

        {status === 'submitted' ? (
          <div style={{ color: colors.textDim, fontSize: 13 }}>正在等待首个 token…</div>
        ) : null}

        {error ? (
          <div style={{ ...card, borderColor: colors.danger, marginTop: 12 }}>
            <div style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>
              请求失败：{(error as Error).message}
            </div>
            <button type="button" onClick={() => regenerate()} style={buttonStyle('ghost')}>
              重试
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="Enter 发送，Shift + Enter 换行"
          style={{
            width: '100%',
            resize: 'vertical',
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.panelSoft,
            color: colors.text,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={submit}
            disabled={isBusy || !input.trim()}
            style={buttonStyle(isBusy || !input.trim() ? 'ghost' : 'primary')}
          >
            {isBusy ? '生成中…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
