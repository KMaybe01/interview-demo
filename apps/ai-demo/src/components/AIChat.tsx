import {
  ApiOutlined,
  BookOutlined,
  DeleteOutlined,
  PlusOutlined,
  RobotOutlined,
  StopOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Bubble, Conversations, Sender, Welcome } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import {
  Alert,
  Button,
  Empty,
  Flex,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { aiAPI, approvalAPI } from '../services/aiApi.ts';
import { streamChat } from '../services/aiStream.ts';
import { knowledgeAPI } from '../services/api.ts';
import { useChatStore } from '../stores/chatStore.ts';
import type {
  AIModel,
  AIStreamEvent,
  KnowledgeHit,
  StreamApprovalData,
  StreamToolCallData,
  StreamToolResultData,
  StreamUsageData,
} from '../types/ai.ts';
import type { KnowledgeBase, Message } from '../types/index.ts';

const { Text, Paragraph } = Typography;

/** 一次工具调用的轨迹（合并 tool_call 与 tool_result） */
interface ToolTrace {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  durationMs?: number;
  status: 'running' | 'done' | 'error' | 'awaiting';
  level?: string;
}

/** 会话消息扩展：在基础 Message 上挂载 RAG 来源 / 工具轨迹 / 用量 */
interface ChatMessage extends Message {
  sources?: KnowledgeHit[];
  steps?: ToolTrace[];
  usage?: StreamUsageData;
  degraded?: boolean;
  traceId?: string;
  finishReason?: string;
}

/** 后端返回的 durationMs 是 Go 的 time.Duration（纳秒）JSON 序列化结果，需换算成毫秒展示 */
function toMs(value: number): number {
  return value >= 1_000_000 ? Math.round(value / 1_000_000) : value;
}

function formatUSD(value: number): string {
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

export default function AIChat() {
  const { token } = theme.useToken();
  const message = useMessageApi();

  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string>('');
  const [enableTools, setEnableTools] = useState(true);
  const [inputValue, setInputValue] = useState('');

  /** 当前正在流式输出的内容 */
  const [streaming, setStreaming] = useState('');
  const [streamingSteps, setStreamingSteps] = useState<ToolTrace[]>([]);
  const [streamingSources, setStreamingSources] = useState<KnowledgeHit[]>([]);
  const [pendingApproval, setPendingApproval] = useState<StreamApprovalData | null>(null);
  const [lastUsage, setLastUsage] = useState<StreamUsageData | null>(null);
  const [degraded, setDegraded] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const stepsRef = useRef<ToolTrace[]>([]);
  const contentRef = useRef('');

  const {
    messages,
    isLoading,
    conversations,
    currentConversationId,
    addMessage,
    setLoading,
    setError,
    createConversation,
    switchConversation,
    deleteConversation,
    clearMessages,
  } = useChatStore();

  // ---- 初始化：拉模型与知识库 ----
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [modelRes, kbRes] = await Promise.all([aiAPI.listModels(), knowledgeAPI.list()]);
        if (!alive) return;
        const list = modelRes.models ?? [];
        setModels(list);
        const available = list.filter((m) => m.available);
        const preferred = available[0] ?? list[0];
        if (preferred) setSelectedModel(preferred.id);
        setKnowledgeBases(kbRes.knowledgeBases ?? []);
      } catch (error) {
        if (alive) message.error((error as Error).message || '加载模型/知识库失败');
      }
    })();
    return () => {
      alive = false;
    };
  }, [message]);

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        value: m.id,
        label: `${m.name}（${m.provider}）${m.available ? '' : ' · 未配置密钥'}`,
        disabled: !m.available,
      })),
    [models],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, [setLoading]);

  /** 处理一个流式事件：按 type 收窄后更新对应状态 */
  const handleEvent = useCallback(
    (event: AIStreamEvent) => {
      switch (event.type) {
        case 'delta':
          contentRef.current += event.data.text;
          setStreaming(contentRef.current);
          break;

        case 'sources':
          setStreamingSources(event.data.items ?? []);
          break;

        case 'tool_call': {
          const call = event.data as StreamToolCallData;
          stepsRef.current = [
            ...stepsRef.current,
            {
              id: call.id,
              name: call.name,
              arguments: call.arguments ?? {},
              status: 'running',
              level: call.level,
            },
          ];
          setStreamingSteps([...stepsRef.current]);
          break;
        }

        case 'tool_result': {
          const res = event.data as StreamToolResultData;
          stepsRef.current = stepsRef.current.map((s) =>
            s.id === res.id
              ? {
                  ...s,
                  result: res.result,
                  isError: res.isError,
                  durationMs: res.durationMs,
                  status: res.isError ? 'error' : 'done',
                }
              : s,
          );
          setStreamingSteps([...stepsRef.current]);
          break;
        }

        case 'approval_required': {
          const approval = event.data as StreamApprovalData;
          stepsRef.current = stepsRef.current.map((s) =>
            s.id === approval.toolCallId ? { ...s, status: 'awaiting' } : s,
          );
          setStreamingSteps([...stepsRef.current]);
          setPendingApproval(approval);
          break;
        }

        case 'usage':
          setLastUsage(event.data);
          break;

        case 'done':
          setDegraded(event.data.degraded);
          break;

        case 'error':
          setError(event.data.message || '流式请求失败');
          message.error(event.data.message || '流式请求失败');
          break;

        default:
          break;
      }
    },
    [message, setError],
  );

  const runStream = useCallback(
    (payload: Record<string, unknown>) => {
      const controller = new AbortController();
      abortRef.current = controller;

      streamChat(
        payload,
        {
          onEvent: handleEvent,
          onError: (msg) => {
            setError(msg);
            message.error(msg);
          },
          onDone: () => {
            setLoading(false);
            abortRef.current = null;
            const assistant: ChatMessage = {
              id: `a_${Date.now()}`,
              role: 'assistant',
              content: contentRef.current || '（无输出）',
              timestamp: new Date(),
              sources: streamingSources.length ? streamingSources : undefined,
              steps: stepsRef.current.length ? stepsRef.current : undefined,
              usage: lastUsage ?? undefined,
              degraded,
            };
            addMessage(assistant);
            setStreaming('');
            setStreamingSteps([]);
            setStreamingSources([]);
          },
        },
        controller.signal,
      );
    },
    [addMessage, degraded, handleEvent, lastUsage, message, setError, setLoading, streamingSources],
  );

  const handleSend = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;

      contentRef.current = '';
      stepsRef.current = [];
      setStreaming('');
      setStreamingSteps([]);
      setStreamingSources([]);
      setLastUsage(null);
      setDegraded(false);
      setError(null);
      setLoading(true);

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      addMessage(userMsg);

      const history = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      runStream({
        model: selectedModel || undefined,
        messages: history,
        knowledgeBaseId: selectedKB || undefined,
        enableTools,
        sessionId: currentConversationId ?? undefined,
      });
    },
    [
      addMessage,
      currentConversationId,
      enableTools,
      isLoading,
      messages,
      runStream,
      selectedKB,
      selectedModel,
      setError,
      setLoading,
    ],
  );

  /** 人工确认：放行后重发同一条请求，并带上已放行的 toolCallId */
  const resolveApproval = useCallback(
    async (approve: boolean) => {
      if (!pendingApproval) return;
      const ticketId = pendingApproval.ticketId;
      setPendingApproval(null);
      try {
        await approvalAPI.resolve(ticketId, approve);
        message.success(approve ? '已放行工具调用' : '已拒绝工具调用');
      } catch (error) {
        message.error((error as Error).message || '审批失败');
        return;
      }
      if (!approve) {
        setLoading(false);
        return;
      }

      // 放行后重发：把放行过的 toolCallId 带回去，后端会直接执行该工具
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      contentRef.current = '';
      stepsRef.current = [];
      setStreaming('');
      runStream({
        model: selectedModel || undefined,
        messages: history,
        knowledgeBaseId: selectedKB || undefined,
        enableTools,
        approvedToolCalls: [pendingApproval.toolCallId],
        sessionId: currentConversationId ?? undefined,
      });
    },
    [
      currentConversationId,
      enableTools,
      message,
      messages,
      pendingApproval,
      runStream,
      selectedKB,
      selectedModel,
      setLoading,
    ],
  );

  const items = useMemo(() => {
    const base = (messages as ChatMessage[]).map((m) => ({
      key: m.id ?? `${m.role}-${m.timestamp}`,
      role: m.role === 'user' ? ('user' as const) : ('ai' as const),
      content: m.content,
      sources: m.sources,
      steps: m.steps,
      usage: m.usage,
      degraded: m.degraded,
    }));

    if (contentRef.current || streaming) {
      base.push({
        key: 'streaming',
        role: 'ai' as const,
        content: streaming || '…',
        sources: streamingSources.length ? streamingSources : undefined,
        steps: streamingSteps.length ? streamingSteps : undefined,
        usage: lastUsage ?? undefined,
        degraded,
      });
    }
    return base;
  }, [messages, streaming, streamingSources, streamingSteps, lastUsage, degraded]);

  return (
    <Flex style={{ height: '100%', overflow: 'hidden' }}>
      {/* 会话列表 */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          style={{ margin: 12 }}
          onClick={() => createConversation()}
        >
          新建对话
        </Button>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Conversations
            items={conversations.map((c) => ({
              key: c.id,
              label: c.title,
            }))}
            activeKey={currentConversationId ?? undefined}
            onActiveChange={(key: string) => switchConversation(String(key))}
          />
        </div>
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          style={{ margin: 12 }}
          disabled={!currentConversationId}
          onClick={() => currentConversationId && deleteConversation(currentConversationId)}
        >
          删除当前对话
        </Button>
      </div>

      {/* 主区域 */}
      <Flex vertical style={{ flex: 1, minWidth: 0 }}>
        {/* 配置栏 */}
        <Flex
          align="center"
          gap={12}
          wrap
          style={{ padding: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
        >
          <Space size={4}>
            <RobotOutlined />
            <Text type="secondary">模型</Text>
          </Space>
          <Select
            size="small"
            style={{ width: 260 }}
            value={selectedModel || undefined}
            options={modelOptions}
            onChange={setSelectedModel}
            placeholder="选择模型"
          />
          <Space size={4}>
            <BookOutlined />
            <Text type="secondary">知识库</Text>
          </Space>
          <Select
            size="small"
            style={{ width: 200 }}
            value={selectedKB}
            onChange={setSelectedKB}
            options={[
              { value: '', label: '不启用 RAG' },
              ...knowledgeBases.map((kb) => ({ value: kb.id, label: kb.name })),
            ]}
          />
          <Space size={4}>
            <ToolOutlined />
            <Text type="secondary">工具调用</Text>
          </Space>
          <Switch size="small" checked={enableTools} onChange={setEnableTools} />
          <div style={{ flex: 1 }} />
          <Button size="small" onClick={() => clearMessages()}>
            清空
          </Button>
        </Flex>

        {degraded && (
          <Alert
            type="warning"
            showIcon
            banner
            message="当前为离线降级模式：未配置可用的模型密钥，回答由本地兜底逻辑生成，不是模型推理结果。"
          />
        )}

        {/* 消息区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {items.length === 0 ? (
            <Welcome
              icon="🤖"
              title="企业级 AI 助手"
              description="支持模型路由、RAG 检索、工具调用与人工确认（HITL），全链路可观测。"
            />
          ) : (
            <Bubble.List
              items={items.map((item) => ({
                key: item.key,
                role: item.role,
                content: (
                  <div>
                    {item.sources && item.sources.length > 0 && (
                      <details style={{ marginBottom: 8 }}>
                        <summary style={{ cursor: 'pointer', color: token.colorPrimary }}>
                          📚 引用 {item.sources.length} 个知识库片段
                        </summary>
                        <div
                          style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
                        >
                          {item.sources.map((s, i) => (
                            <div
                              key={`${s.document ?? 'src'}-${i}`}
                              style={{
                                padding: 8,
                                borderRadius: 6,
                                background: token.colorFillQuaternary,
                                fontSize: 12,
                              }}
                            >
                              <Tag color="blue">
                                [{i + 1}] {s.score.toFixed(3)}
                              </Tag>
                              {s.document && <Text type="secondary">{s.document} · </Text>}
                              <Text type="secondary">{s.content.slice(0, 200)}</Text>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {item.steps && item.steps.length > 0 && (
                      <div
                        style={{
                          marginBottom: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {item.steps.map((s) => (
                          <div key={s.id}>
                            <Tag
                              color={
                                s.status === 'error'
                                  ? 'red'
                                  : s.status === 'awaiting'
                                    ? 'orange'
                                    : 'green'
                              }
                              icon={<ApiOutlined />}
                            >
                              {s.name}
                              {s.durationMs ? ` · ${toMs(s.durationMs)}ms` : ''}
                              {s.status === 'awaiting' ? ' · 待确认' : ''}
                            </Tag>
                            {s.result && (
                              <Paragraph
                                type={s.isError ? 'danger' : 'secondary'}
                                style={{ fontSize: 12, margin: '2px 0 0', whiteSpace: 'pre-wrap' }}
                                ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
                              >
                                {s.result}
                              </Paragraph>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <XMarkdown
                      content={item.content}
                      openLinksInNewTab
                      streaming={{
                        hasNextChunk: item.key === 'streaming',
                        enableAnimation: item.key === 'streaming',
                      }}
                    />

                    {item.usage && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        tokens {item.usage.promptTokens}↓ / {item.usage.completionTokens}↑ · 成本{' '}
                        {formatUSD(item.usage.costUsd)}
                        {item.usage.estimated ? '（估算价）' : ''}
                      </Text>
                    )}
                  </div>
                ),
                avatar:
                  item.role === 'user' ? (
                    <UserOutlined style={{ color: token.colorPrimary }} />
                  ) : (
                    <RobotOutlined style={{ color: token.colorPrimary }} />
                  ),
              }))}
            />
          )}
          {messages.length === 0 && !streaming && <Empty description="还没有消息" />}
        </div>

        {/* 输入区 */}
        <div style={{ padding: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Sender
            value={inputValue}
            onChange={setInputValue}
            loading={isLoading}
            onSubmit={(text) => {
              handleSend(text);
              setInputValue('');
            }}
            onCancel={handleStop}
            placeholder="输入消息，Enter 发送 / Shift+Enter 换行"
          />
          {isLoading && (
            <Flex justify="center" style={{ marginTop: 8 }}>
              <Tooltip title="停止生成">
                <Button size="small" icon={<StopOutlined />} onClick={handleStop}>
                  停止生成
                </Button>
              </Tooltip>
            </Flex>
          )}
        </div>
      </Flex>

      {/* HITL 人工确认弹窗 */}
      <Modal
        open={pendingApproval !== null}
        title="工具调用需要人工确认"
        onCancel={() => resolveApproval(false)}
        onOk={() => resolveApproval(true)}
        okText="放行并执行"
        cancelText="拒绝"
      >
        {pendingApproval && (
          <div>
            <Paragraph>
              工具 <Text strong>{pendingApproval.name}</Text> 属于{' '}
              <Tag color="orange">{pendingApproval.level}</Tag>，超出自动执行权限。
            </Paragraph>
            <Paragraph type="secondary">{pendingApproval.reason}</Paragraph>
            <Paragraph>
              <Text type="secondary">参数：</Text>
              <pre style={{ background: token.colorFillQuaternary, padding: 8, borderRadius: 6 }}>
                {JSON.stringify(pendingApproval.arguments, null, 2)}
              </pre>
            </Paragraph>
          </div>
        )}
      </Modal>
    </Flex>
  );
}
