import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  MessageOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { BubbleItemType } from '@ant-design/x';
import { Bubble, Conversations, Prompts, Sender, Welcome } from '@ant-design/x';
import { Avatar, Button, Input, Modal, Tag, Tooltip, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { agentAPI, chatAPI, knowledgeAPI, modelAPI } from '../services/api.ts';
import { useChatStore } from '../stores/chatStore.ts';
import type { Agent, KnowledgeBase, Model } from '../types/index.ts';
import { calculateContextUsage } from '../utils/context-manager.ts';
import { maskPII } from '../utils/data-masker.ts';
import { formatTokenCount } from '../utils/token-estimator.ts';

const { Text } = Typography;

export default function Chat() {
  const { token } = theme.useToken();
  const message = useMessageApi();

  const [inputValue, setInputValue] = useState('');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null);
  const [useAgent, setUseAgent] = useState(false);
  const [agentType, setAgentType] = useState<string>('react');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('openai-gpt4');
  const [streamingContent, setStreamingContent] = useState('');
  const [maskPIIEnabled, setMaskPIIEnabled] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');
  const accumulatedContentRef = useRef('');

  const {
    messages,
    isLoading,
    error,
    conversations,
    currentConversationId,
    addMessage,
    setLoading,
    setError,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = useChatStore();

  const loadData = useCallback(async () => {
    try {
      const [kbRes, modelRes, agentRes] = await Promise.all([
        knowledgeAPI.list(),
        modelAPI.list(),
        agentAPI.list(),
      ]);
      setKnowledgeBases(kbRes.knowledgeBases || []);
      setModels(modelRes.models || []);
      setAgents(agentRes.agents || []);
      if (modelRes.models?.length > 0) {
        setSelectedModel(modelRes.models[0].model_name);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [setLoading]);

  const handleSend = useCallback(
    async (content?: string) => {
      const text = (content ?? inputValue).trim();
      if (!text || isLoading) return;

      lastQueryRef.current = text;
      setInputValue('');

      addMessage({ role: 'user', content: text });
      setLoading(true);
      setError(null);
      setStreamingContent('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      accumulatedContentRef.current = '';
      try {
        await chatAPI.chatStream(
          text,
          controller.signal,
          (chunk: string) => {
            if (!controller.signal.aborted) {
              accumulatedContentRef.current += chunk;
              setStreamingContent(accumulatedContentRef.current);
            }
          },
          () => {
            if (!controller.signal.aborted) {
              const finalContent = accumulatedContentRef.current;
              if (finalContent) {
                addMessage({ role: 'assistant', content: finalContent });
              }
              setStreamingContent('');
              setLoading(false);
            }
          },
          (errMsg: string) => {
            if (!controller.signal.aborted) {
              const partialContent = accumulatedContentRef.current;
              if (partialContent) {
                addMessage({ role: 'assistant', content: partialContent });
              }
              setError(errMsg);
              setLoading(false);
              setStreamingContent('');
            }
          },
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : '发送消息失败');
          setLoading(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          abortControllerRef.current = null;
        }
      }
    },
    [inputValue, isLoading, addMessage, setLoading, setError],
  );

  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      Modal.confirm({
        title: '确定删除这个对话吗？',
        content: '删除后将无法恢复',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => {
          deleteConversation(id);
          message.success('对话已删除');
        },
      });
    },
    [deleteConversation, message],
  );

  const handleRename = useCallback(
    (id: string) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      let newTitle = conv.title;
      Modal.confirm({
        title: '重命名对话',
        content: (
          <Input
            defaultValue={conv.title}
            onChange={(e) => {
              newTitle = e.target.value;
            }}
          />
        ),
        onOk: () => {
          if (newTitle.trim()) {
            renameConversation(id, newTitle.trim());
            message.success('已重命名');
          }
        },
      });
    },
    [conversations, renameConversation, message],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    handleSend(lastQueryRef.current);
  }, [setError, handleSend]);

  const bubbleItems = useMemo(() => {
    const items: BubbleItemType[] = messages.map((msg) => ({
      key: msg.id ?? '',
      role: msg.role === 'user' ? 'user' : 'ai',
      content:
        maskPIIEnabled && msg.role === 'assistant' ? maskPII(msg.content).masked : msg.content,
    }));
    if (isLoading && streamingContent) {
      items.push({
        key: 'streaming-msg',
        role: 'ai',
        content: maskPIIEnabled ? maskPII(streamingContent).masked : streamingContent,
        streaming: true,
      });
    } else if (isLoading) {
      items.push({
        key: 'loading-msg',
        role: 'ai',
        content: '',
        loading: true,
      });
    }
    return items;
  }, [messages, isLoading, streamingContent, maskPIIEnabled]);

  const convItems = useMemo(
    () =>
      conversations.map((conv) => ({
        key: conv.id,
        label: conv.title,
      })),
    [conversations],
  );

  const roleConfig = useMemo(
    () => ({
      user: {
        placement: 'end' as const,
        variant: 'filled' as const,
        shape: 'corner' as const,
        avatar: (
          <Avatar
            icon={<UserOutlined />}
            style={{ background: token.colorPrimaryBg }}
            size="small"
          />
        ),
      },
      ai: {
        placement: 'start' as const,
        variant: 'filled' as const,
        shape: 'corner' as const,
        avatar: (
          <Avatar
            icon={<RobotOutlined />}
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            size="small"
          />
        ),
      },
    }),
    [token],
  );

  const promptItems = useMemo(
    () => [
      { key: 'react', label: '解释 React Hooks', icon: <MessageOutlined /> },
      { key: 'python', label: '写一个 Python 爬虫', icon: <MessageOutlined /> },
      { key: 'book', label: '推荐一本好书', icon: <MessageOutlined /> },
    ],
    [],
  );

  const hasMessages = messages.length > 1 || (messages.length === 1 && messages[0].role === 'user');

  const contextInfo = useMemo(() => {
    if (!hasMessages && !streamingContent) return null;
    return calculateContextUsage(
      messages.filter((m) => m.role !== 'system'),
      'You are a helpful assistant.',
    );
  }, [messages, hasMessages, streamingContent]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
      <div
        style={{
          width: 260,
          background: token.colorBgElevated,
          borderRadius: '12px 0 0 12px',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          padding: '12px 8px',
        }}
      >
        <Conversations
          items={convItems}
          activeKey={currentConversationId ?? ''}
          onActiveChange={(key) => switchConversation(key)}
          creation={{
            onClick: handleNewChat,
          }}
          styles={{ creation: { marginBottom: 12 } }}
          menu={(conversation) => ({
            items: [
              { key: 'rename', label: '重命名', icon: <EditOutlined /> },
              { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
            ],
            onClick: ({ key: actionKey }) => {
              if (actionKey === 'rename') handleRename(conversation.key);
              if (actionKey === 'delete') handleDeleteConfirm(conversation.key);
            },
          })}
          style={{ flex: 1, overflow: 'auto' }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: token.colorBgContainer,
          borderRadius: '0 12px 12px 0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: hasMessages ? '20px 0' : 0,
          }}
        >
          {hasMessages ? (
            <Bubble.List
              items={bubbleItems}
              role={roleConfig}
              autoScroll
              style={{ flex: 1, maxHeight: '100%' }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px 24px',
              }}
            >
              <Welcome
                icon={<RobotOutlined />}
                title="AI 智能助手"
                description="有什么我可以帮助你的吗？"
                style={{ marginBottom: 24 }}
              />
              <Prompts
                items={promptItems}
                onItemClick={(info) => {
                  handleSend(info.data.label as string);
                }}
                wrap
                styles={{
                  item: { maxWidth: 280 },
                }}
              />
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '8px 24px',
              background: token.colorErrorBg,
              borderTop: `1px solid ${token.colorErrorBorder}`,
              color: token.colorError,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ flex: 1 }}>{error}</span>
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
              重试
            </Button>
            <Button type="link" size="small" onClick={() => setError(null)}>
              关闭
            </Button>
          </div>
        )}

        <div
          style={{
            padding: '12px 24px 0',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Tooltip title={maskPIIEnabled ? '显示原始内容' : '脱敏显示'}>
            <Button
              size="small"
              icon={maskPIIEnabled ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setMaskPIIEnabled((prev) => !prev)}
              style={{ borderRadius: 16, fontSize: 12 }}
              type={maskPIIEnabled ? 'primary' : 'default'}
            >
              {maskPIIEnabled ? '已脱敏' : '脱敏'}
            </Button>
          </Tooltip>

          {knowledgeBases.length > 0 && (
            <Tooltip title="根据知识库内容回答">
              <Button
                size="small"
                icon={<BookOutlined />}
                onClick={() => {
                  if (selectedKnowledgeBase) {
                    setSelectedKnowledgeBase(null);
                  } else {
                    Modal.info({
                      title: '选择知识库',
                      content: (
                        <div style={{ marginTop: 16 }}>
                          {knowledgeBases.map((kb) => (
                            <button
                              key={kb.id}
                              type="button"
                              className="modal-select-item"
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                background:
                                  selectedKnowledgeBase === kb.id
                                    ? token.colorPrimaryBg
                                    : 'transparent',
                                border: `1px solid ${selectedKnowledgeBase === kb.id ? token.colorPrimaryBorder : 'transparent'}`,
                                marginBottom: 4,
                                color: 'inherit',
                                fontSize: 'inherit',
                                fontFamily: 'inherit',
                              }}
                              onClick={() => {
                                setSelectedKnowledgeBase(kb.id);
                                Modal.destroyAll();
                              }}
                            >
                              <Text strong>{kb.name}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {kb.docCount || 0} 个文档
                              </Text>
                            </button>
                          ))}
                        </div>
                      ),
                      okText: '取消',
                      maskClosable: true,
                      width: 400,
                    });
                  }
                }}
                style={{ borderRadius: 16, fontSize: 12 }}
                type={selectedKnowledgeBase ? 'primary' : 'default'}
              >
                {selectedKnowledgeBase
                  ? knowledgeBases.find((kb) => kb.id === selectedKnowledgeBase)?.name || '已连接'
                  : '知识库'}
              </Button>
            </Tooltip>
          )}

          <Tooltip title="使用智能体模式">
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                if (useAgent) {
                  setUseAgent(false);
                  setSelectedAgentId('');
                } else {
                  Modal.info({
                    title: '选择 Agent',
                    content: (
                      <div style={{ marginTop: 16 }}>
                        {agents.length > 0 && (
                          <>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              已创建的智能体
                            </Text>
                            {agents.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                className="modal-select-item"
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  background:
                                    selectedAgentId === a.id ? token.colorPrimaryBg : 'transparent',
                                  border: `1px solid ${selectedAgentId === a.id ? token.colorPrimaryBorder : 'transparent'}`,
                                  marginBottom: 4,
                                  color: 'inherit',
                                  fontSize: 'inherit',
                                  fontFamily: 'inherit',
                                }}
                                onClick={() => {
                                  setUseAgent(true);
                                  setAgentType(a.type);
                                  setSelectedAgentId(a.id);
                                  Modal.destroyAll();
                                }}
                              >
                                <Text strong>{a.name}</Text>
                                <Tag style={{ marginLeft: 8 }} color="blue">
                                  {a.type}
                                </Tag>
                              </button>
                            ))}
                            <div
                              style={{
                                height: 1,
                                background: token.colorBorderSecondary,
                                margin: '12px 0',
                              }}
                            />
                          </>
                        )}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          或选择类型
                        </Text>
                        {(
                          [
                            { value: 'react', label: 'ReAct 模式', desc: '推理与行动交替进行' },
                            {
                              value: 'function',
                              label: 'Function Calling',
                              desc: '自动选择工具调用',
                            },
                            { value: 'rag', label: 'RAG 模式', desc: '基于知识库检索增强' },
                            { value: 'multi', label: '多智能体', desc: '多个智能体协作' },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            className="modal-select-item"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              background:
                                agentType === item.value && useAgent && !selectedAgentId
                                  ? token.colorPrimaryBg
                                  : 'transparent',
                              border: `1px solid ${agentType === item.value && useAgent && !selectedAgentId ? token.colorPrimaryBorder : 'transparent'}`,
                              marginBottom: 4,
                              color: 'inherit',
                              fontSize: 'inherit',
                              fontFamily: 'inherit',
                            }}
                            onClick={() => {
                              setUseAgent(true);
                              setAgentType(item.value);
                              setSelectedAgentId('');
                              Modal.destroyAll();
                            }}
                          >
                            <Text strong>{item.label}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.desc}
                            </Text>
                          </button>
                        ))}
                      </div>
                    ),
                    okText: '取消',
                    maskClosable: true,
                    width: 400,
                  });
                }
              }}
              style={{ borderRadius: 16, fontSize: 12 }}
              type={useAgent ? 'primary' : 'default'}
            >
              {useAgent ? `Agent: ${agentType}` : 'Agent'}
            </Button>
          </Tooltip>

          {models.length > 0 && (
            <Tooltip title="切换 AI 模型">
              <Button
                size="small"
                icon={<RobotOutlined />}
                onClick={() => {
                  Modal.info({
                    title: '选择模型',
                    content: (
                      <div style={{ marginTop: 16 }}>
                        {models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="modal-select-item"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              background:
                                selectedModel === m.model_name
                                  ? token.colorPrimaryBg
                                  : 'transparent',
                              border: `1px solid ${selectedModel === m.model_name ? token.colorPrimaryBorder : 'transparent'}`,
                              marginBottom: 4,
                              color: 'inherit',
                              fontSize: 'inherit',
                              fontFamily: 'inherit',
                            }}
                            onClick={() => {
                              setSelectedModel(m.model_name);
                              Modal.destroyAll();
                            }}
                          >
                            <Text strong>{m.model_name}</Text>
                            <Tag style={{ marginLeft: 8 }}>{m.provider}</Tag>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {m.supports_tools ? '工具调用 ' : ''}
                              {m.supports_vision ? '视觉 ' : ''}
                              {m.context_window
                                ? `${(m.context_window / 1000).toFixed(0)}K 上下文`
                                : ''}
                            </Text>
                          </button>
                        ))}
                      </div>
                    ),
                    okText: '取消',
                    maskClosable: true,
                    width: 400,
                  });
                }}
                style={{ borderRadius: 16, fontSize: 12 }}
              >
                {models.find((m) => m.model_name === selectedModel)?.model_name || '模型'}
              </Button>
            </Tooltip>
          )}
        </div>

        <div style={{ padding: '12px 24px 20px' }}>
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(text) => handleSend(text)}
            onCancel={handleStop}
            loading={isLoading}
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            submitType="enter"
          />
        </div>

        {(hasMessages || streamingContent) && contextInfo && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 24px 12px',
              alignItems: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, color: token.colorTextQuaternary }}>
              AI 可能会犯错，请核实重要信息
            </Text>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Tag
                style={{ fontSize: 11, marginRight: 0 }}
                color={
                  contextInfo.usagePercent > 90
                    ? 'red'
                    : contextInfo.usagePercent > 70
                      ? 'orange'
                      : 'default'
                }
              >
                上下文: {contextInfo.usagePercent}% ({formatTokenCount(contextInfo.totalTokens)}/
                {formatTokenCount(contextInfo.availableTokens)})
              </Tag>
              <Tag style={{ fontSize: 11, marginRight: 0 }}>
                消息: {messages.filter((m) => m.role !== 'system').length}
              </Tag>
            </div>
          </div>
        )}
        {!hasMessages && !streamingContent && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px 12px' }}>
            <Text type="secondary" style={{ fontSize: 11, color: token.colorTextQuaternary }}>
              AI 可能会犯错，请核实重要信息
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
