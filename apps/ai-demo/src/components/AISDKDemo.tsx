// AI SDK Demo Component — 使用 @ai-sdk/react + Gemini 2.5 Flash 的流式聊天
// 演示 Vercel AI SDK 的数据连接（Google Provider）和聊天功能
'use client';

import { Bubble, type BubbleItemType, CodeHighlighter, Sender } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import { Button, Input, Segmented, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const COLLAPSE_THRESHOLD = 800;

/** Markdown 渲染（带代码高亮） */
function renderMarkdownWithCodeHighlight(content: string) {
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; text?: string; code?: string; lang?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  match = codeBlockRegex.exec(content);
  while (match !== null) {
    const [fullMatch, lang = 'text', code] = match;
    const before = content.slice(lastIndex, match.index);

    if (before.trim()) {
      parts.push({ type: 'text', text: before });
    }

    parts.push({ type: 'code', lang, code });
    lastIndex = match.index + fullMatch.length;
    match = codeBlockRegex.exec(content);
  }

  const tail = content.slice(lastIndex);
  if (tail.trim()) {
    parts.push({ type: 'text', text: tail });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: content });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {parts.map((part, index) =>
        part.type === 'code' ? (
          <CodeHighlighter
            key={`code-${index}`}
            lang={part.lang}
            style={{ margin: 0 }}
            highlightProps={{ customStyle: { margin: 0, borderRadius: 8 } }}
          >
            {part.code ?? ''}
          </CodeHighlighter>
        ) : (
          <XMarkdown key={`text-${index}`} content={part.text ?? ''} openLinksInNewTab />
        ),
      )}
    </div>
  );
}

/** 消息类型（兼容 useChat 和手动管理） */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{ type: 'text'; text: string }>;
  createdAt?: string;
}

export default function AISDKDemo() {
  const { token } = theme.useToken();

  // 🎛️ 两种模式：
  //   - Server 模式：通过 /api/chat 后端 proxy（需要运行中的 AI SDK server）
  //   - Direct 模式：直接配置 Google API Key 前端调用 Gemini（演示用）
  const [mode, setMode] = useState<'server' | 'direct'>('server');
  const [endpoint, setEndpoint] = useState('/api/chat');
  const [apiKey, setApiKey] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController 用于取消当前请求
  const abortRef = useRef<AbortController | null>(null);

  /** 生成唯一 ID */
  const genId = useCallback(
    () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    [],
  );

  /** 追加消息 */
  const appendMessage = useCallback(
    (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      const newMsg: ChatMessage = {
        ...msg,
        id: genId(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      return newMsg.id;
    },
    [genId],
  );

  /** 更新最后一条 assistant 消息的内容 */
  const updateLastAssistant = useCallback((text: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === 'assistant') {
          copy[i] = { ...copy[i], parts: [{ type: 'text', text }] };
          break;
        }
      }
      return copy;
    });
  }, []);

  // 💡 加载时从 localStorage 恢复 API Key
  useEffect(() => {
    const saved = localStorage.getItem('ai_sdk_gemini_api_key');
    if (saved) setApiKey(saved);
  }, []);

  /** 核心发送逻辑 */
  const handleSend = useCallback(
    async (content?: string) => {
      const text = (content ?? inputValue).trim();
      if (!text || isLoading) return;

      setInputValue('');
      setError(null);

      // 添加用户消息
      appendMessage({ role: 'user', parts: [{ type: 'text', text }] });
      setIsLoading(true);

      // 创建 abort controller
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (mode === 'direct' && apiKey) {
          // ──── Direct Mode: 调用 Gemini API ────────────────────────
          localStorage.setItem('ai_sdk_gemini_api_key', apiKey);

          // 构建系统提示词
          const systemInstruction = {
            role: 'user',
            parts: [
              {
                text: '你是一个由 Vercel AI SDK v7 + Gemini 2.5 Flash 驱动的智能助手。请用简洁、准确的语言回答问题。如果涉及代码，请使用代码块格式并标注语言。',
              },
            ],
          };

          const body = JSON.stringify({
            contents: [systemInstruction, { role: 'user', parts: [{ text }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          });

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `HTTP ${response.status}`);
          }

          // 接收 stream 响应（SSE 格式，JSON 可跨多行）
          if (!response.body) throw new Error('响应体为空');
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulatedText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE 事件分隔符是 \n\n，每个事件内 JSON 可能跨多行
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const event of events) {
              let data = '';
              for (const evLine of event.split('\n')) {
                if (evLine.startsWith('data: ')) {
                  data += evLine.slice(6);
                }
              }

              const trimmed = data.trim();
              if (!trimmed || trimmed === '[DONE]') continue;

              try {
                const dataObj = JSON.parse(trimmed);
                const candidates = dataObj?.candidates?.[0]?.content?.parts || [];
                for (const part of candidates) {
                  if (part.text) {
                    accumulatedText += part.text;
                    updateLastAssistant(accumulatedText);
                  }
                }
              } catch {
                // skip incomplete JSON
              }
            }
          }

          // 添加最终 assistant 消息到历史
          if (accumulatedText) {
            appendMessage({
              role: 'assistant',
              parts: [{ type: 'text', text: accumulatedText }],
            });
          }
        } else {
          // ──── Server Mode: 通过后端 /api/chat ─────────────────────
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: text,
              model: 'agnes-2.0-flash',
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          const reply = data.response || '';
          updateLastAssistant(reply);
          appendMessage({
            role: 'assistant',
            parts: [{ type: 'text', text: reply }],
          });
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [inputValue, isLoading, mode, apiKey, endpoint, appendMessage, updateLastAssistant],
  );

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const bubbleItems = useMemo(() => {
    const items: BubbleItemType[] = messages.map((m) => {
      const textContent = m.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('');
      const isAI = m.role === 'assistant';
      const shouldCollapse = textContent.length > COLLAPSE_THRESHOLD;

      return {
        key: m.id,
        role: m.role === 'user' ? 'user' : 'ai',
        content: textContent,
        contentRender: isAI
          ? shouldCollapse
            ? (content: string) => renderMarkdownWithCodeHighlight(content)
            : renderMarkdownWithCodeHighlight
          : undefined,
      };
    });

    if (isLoading) {
      items.push({ key: 'loading', role: 'ai', content: '', loading: true });
    }

    return items;
  }, [messages, isLoading]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧配置面板 */}
      <div
        style={{
          width: 340,
          background: token.colorBgElevated,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>🔌 AI SDK 配置</h3>

        {/* 模式切换 */}
        <div>
          <div
            style={{
              fontSize: 13,
              color: token.colorTextSecondary,
              display: 'block',
              marginBottom: 6,
            }}
          >
            运行模式
          </div>
          <Segmented
            options={[
              { label: '🖥️ Server 模式', value: 'server' },
              { label: '🔑 Direct 模式', value: 'direct' },
            ]}
            value={mode}
            onChange={(v) => setMode(v as typeof mode)}
            block
            size="small"
          />
        </div>

        {/* Server 模式配置 */}
        {mode === 'server' && (
          <div>
            <div
              style={{
                fontSize: 13,
                color: token.colorTextSecondary,
                display: 'block',
                marginBottom: 4,
              }}
            >
              服务端 API 端点
            </div>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/chat"
              size="small"
            />
            <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>
              后端需实现 streamText + toUIMessageStreamResponse()
            </div>
          </div>
        )}

        {/* Direct 模式配置 */}
        {mode === 'direct' && (
          <>
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: token.colorTextSecondary,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Google API Key
              </div>
              <Input.Password
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 GOOGLE_GENERATIVE_AI_API_KEY"
                size="small"
              />
              <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>
                密钥保存在 localStorage，不会上传到任何第三方
              </div>
            </div>

            <Button
              size="small"
              danger
              onClick={() => {
                setApiKey('');
                localStorage.removeItem('ai_sdk_gemini_api_key');
              }}
              block
            >
              🗑️ 清除 API Key
            </Button>
          </>
        )}

        {/* 模型信息 */}
        <div style={{ padding: 12, background: token.colorFillAlter, borderRadius: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🤖 模型信息</div>
          <div style={{ fontSize: 13 }}>
            <div>
              Provider: <strong>Agnes AI</strong>
            </div>
            <div>
              Model: <strong>agnes-2.0-flash</strong>
            </div>
            <div>
              Base URL: <strong>apihub.agnes-ai.com</strong>
            </div>
            <div>
              API: <strong>OpenAI-compatible</strong>
            </div>
          </div>
        </div>

        {/* 架构示意 */}
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>📐 架构</div>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              color: token.colorTextSecondary,
            }}
          >
            {`┌──────────────────────────┐
│  客户端 (AISDKDemo)       │
│  useChat Hook             │
├──────────────────────────┤
│  模式: ${mode === 'server' ? '/api/chat 代理' : 'Direct Google API'}              │
├──────────────────────────┤
│  streamText               │
│  + smoothStream           │
├──────────────────────────┤
│  google('gemini-2.5-flash')│
└──────────────────────────┘`}
          </pre>
        </div>

        {/* 使用说明 */}
        <div style={{ fontSize: 12, color: token.colorTextTertiary, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 使用说明</div>
          <ol style={{ margin: 0, paddingLeft: 16 }}>
            <li>选择运行模式（Server / Direct）</li>
            <li>Server: 后端实现 /api/chat 路由</li>
            <li>Direct: 填入 Google API Key 即可测试</li>
            <li>支持流式输出 + 代码高亮 + Markdown 渲染</li>
          </ol>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 标题栏 */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15 }}>💬 AI SDK Demo — Gemini 2.5 Flash</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {error && (
              <Button size="small" danger onClick={() => setError(null)}>
                清除错误
              </Button>
            )}
            {isLoading && (
              <Button size="small" onClick={handleStop}>
                ⏹ 停止生成
              </Button>
            )}
          </div>
        </div>

        {/* 消息列表 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
          {messages.length > 0 ? (
            <Bubble.List items={bubbleItems} autoScroll style={{ maxHeight: '100%' }} />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: token.colorTextTertiary,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>AI SDK Demo</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                使用 Vercel AI SDK v7 + Gemini 2.5 Flash
              </div>
              <div style={{ fontSize: 12, marginTop: 8, color: token.colorTextDescription }}>
                开始对话吧！直接输入消息发送到 Gemini AI 模型
              </div>
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              padding: '8px 16px',
              background: token.colorErrorBg,
              borderTop: `1px solid ${token.colorErrorBorder}`,
              color: token.colorError,
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* 输入区域 */}
        <div style={{ padding: '12px 16px 16px' }}>
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            onCancel={handleStop}
            loading={isLoading}
            placeholder={
              mode === 'direct'
                ? apiKey
                  ? '输入消息... (Enter 发送)'
                  : '请先在左侧配置 Google API Key'
                : '输入消息... (Enter 发送)'
            }
            disabled={mode === 'direct' && !apiKey}
          />
        </div>
      </div>
    </div>
  );
}
