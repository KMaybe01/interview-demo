import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type CostBreakdown, formatUsd, type ModelTier } from '../../../shared/cost.ts';
import { badge, buttonStyle, card, colors } from '../../ui/styles.ts';

/**
 * 第二关：知识增强 RAG。
 *
 * 这一关要看的三件事：
 *   1. 检索是**独立可调试**的一层（/api/rag/search 能单独看召回质量）
 *   2. 检索发生在**护栏之后**，用的是脱敏后的 query
 *   3. 召回来源（sources）随消息 metadata 回传，前端能做溯源
 */

interface RagMetadata {
  tier: ModelTier;
  modelId: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  cost: CostBreakdown;
  traceId: string;
  sources?: Array<{ id: string; score: number; preview: string }>;
}

interface Document {
  id: string;
  title: string;
  chunkCount: number;
}

function readMetadata(message: UIMessage): RagMetadata | null {
  return (message.metadata as RagMetadata | undefined) ?? null;
}

export default function RagStage() {
  const [title, setTitle] = useState('报销制度');
  const [text, setText] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [probeQuery, setProbeQuery] = useState('报销流程是什么');
  const [hits, setHits] = useState<Array<{ id: string; score: number; text: string }>>([]);
  const [input, setInput] = useState('');

  const refreshDocuments = useCallback(async () => {
    const res = await fetch('/api/rag/documents');
    const data = (await res.json()) as { documents: Document[] };
    setDocuments(data.documents);
  }, []);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { tier: 'fast', stage: 'rag' } }),
    [],
  );
  const { messages, sendMessage, stop, status } = useChat({ transport });
  const isBusy = status === 'submitted' || status === 'streaming';

  const addDoc = async () => {
    if (!text.trim()) return;
    await fetch('/api/rag/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, text }),
    });
    setText('');
    await refreshDocuments();
  };

  const probe = async () => {
    const res = await fetch('/api/rag/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: probeQuery, topK: 3 }),
    });
    const data = (await res.json()) as { hits: Array<{ id: string; score: number; text: string }> };
    setHits(data.hits);
  };

  return (
    <div style={{ flex: 1, display: 'flex', gap: 16, padding: 20, overflow: 'hidden' }}>
      <div
        style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}
      >
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>① 灌入知识库</div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="文档标题"
            style={inputStyle}
          />
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            placeholder="粘贴一段文档（会按段落分块、块间保留重叠）"
            style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={addDoc} style={buttonStyle('primary')}>
              添加文档
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: colors.textDim }}>
            已入库 {documents.length} 篇：
            {documents.map((doc) => (
              <div key={doc.id}>
                · {doc.title}（{doc.chunkCount} 块）
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>② 单独调试检索</div>
          <input
            value={probeQuery}
            onChange={(event) => setProbeQuery(event.target.value)}
            style={inputStyle}
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={probe} style={buttonStyle('ghost')}>
              看召回
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}>
            {hits.length === 0 ? (
              <span style={{ color: colors.textDim }}>（还没有召回结果）</span>
            ) : (
              hits.map((hit) => (
                <div key={hit.id} style={{ marginBottom: 8 }}>
                  <span style={badge('info')}>
                    {hit.id} · score={hit.score}
                  </span>
                  <div style={{ color: colors.textDim, marginTop: 4 }}>
                    {hit.text.slice(0, 90)}…
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
          {messages.map((message) => {
            const meta = readMetadata(message);
            return (
              <div key={message.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 6 }}>
                  {message.role === 'user' ? '我' : 'AI'}
                </div>
                {message.parts.map((part, index) =>
                  part.type === 'text' ? (
                    <div key={`${message.id}-${index}`} style={bubble(message.role === 'user')}>
                      {part.text}
                    </div>
                  ) : null,
                )}
                {meta?.sources ? (
                  <div style={{ marginTop: 6 }}>
                    {meta.sources.map((source) => (
                      <span key={source.id} style={{ ...badge('ok'), marginRight: 6 }}>
                        引用 {source.id}（{source.score}）
                      </span>
                    ))}
                  </div>
                ) : null}
                {meta ? (
                  <div style={{ fontSize: 12, color: colors.textDim, marginTop: 6 }}>
                    {meta.usage.totalTokens} tokens · {formatUsd(meta.cost.total)} · trace{' '}
                    {meta.traceId}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12 }}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const value = input.trim();
                if (!value || isBusy) return;
                sendMessage({ text: value });
                setInput('');
              }
            }}
            rows={3}
            placeholder="基于知识库提问（Enter 发送）"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {isBusy ? (
              <button type="button" onClick={() => stop()} style={buttonStyle('danger')}>
                停止
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const value = input.trim();
                if (!value) return;
                sendMessage({ text: value });
                setInput('');
              }}
              style={buttonStyle('primary')}
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.panelSoft,
  color: colors.text,
  fontSize: 13,
  outline: 'none',
} as const;

function bubble(mine: boolean) {
  return {
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.8,
    padding: '10px 14px',
    borderRadius: 10,
    background: mine ? colors.brandSoft : colors.panelSoft,
    border: `1px solid ${colors.border}`,
  };
}
