import {
  BookOutlined,
  CheckOutlined,
  ClearOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal, Spin, Tag, Tooltip, Typography, theme } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageApi } from '../AIDemo';
import { agentAPI, chatAPI, knowledgeAPI, modelAPI } from '../services/api';
import { useChatStore } from '../stores/chatStore';
import type { Agent, KnowledgeBase, Model } from '../types';

const { Text } = Typography;

function Chat() {
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai-gpt4');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<TextAreaRef>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    messages,
    isLoading,
    error,
    conversations,
    currentConversationId,
    addMessage,
    setLoading,
    setError,
    clearMessages,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = useChatStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
    scrollToBottom();
  }, [scrollToBottom]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const content = inputValue.trim();
    setInputValue('');

    addMessage({ role: 'user', content });
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await chatAPI.chatEnhanced({
        content,
        knowledgeBaseId: selectedKnowledgeBase ?? undefined,
        useAgent,
        agentType,
        model: selectedModel,
        agentId: selectedAgentId,
      });

      if (!controller.signal.aborted) {
        addMessage({ role: 'assistant', content: response.response });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : '发送消息失败');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) {
        handleStop();
      } else {
        handleSend();
      }
    }
  };

  const handleNewChat = () => createConversation();

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  const handleRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setEditingId(id);
      setEditTitle(conv.title);
    }
  };

  const handleSaveRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim());
      setEditingId(null);
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);

  const isOnlyWelcomeMessage =
    messages.length === 0 ||
    (messages.length === 1 && 'role' in messages[0] && messages[0].role === 'assistant');

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', gap: 0 }}>
      <div
        style={{
          width: sidebarCollapsed ? 48 : 260,
          background: token.colorBgContainer,
          borderRadius: '12px 0 0 12px',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: sidebarCollapsed ? '16px 8px 8px' : '16px 12px 8px',
            display: 'flex',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
          }}
        >
          <Tooltip title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'} placement="right">
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{ color: token.colorTextSecondary }}
            />
          </Tooltip>
        </div>

        {!sidebarCollapsed && (
          <>
            <div style={{ padding: '0 12px 12px' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleNewChat}
                block
                style={{
                  height: 40,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                新建对话
              </Button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
              {conversations.map((conv) => (
                // biome-ignore lint/a11y/useSemanticElements: div needs role=button for click behavior in sidebar
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => switchConversation(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      switchConversation(conv.id);
                    }
                  }}
                  className={
                    conv.id === currentConversationId
                      ? 'chat-history-item chat-history-item--active'
                      : 'chat-history-item'
                  }
                  style={{ padding: '12px', marginBottom: 4, borderRadius: 8, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === conv.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Input
                            size="small"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onPressEnter={handleSaveRename}
                            style={{ fontSize: 13 }}
                            autoFocus
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={handleSaveRename}
                            style={{ color: token.colorSuccess }}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={handleCancelRename}
                            style={{ color: token.colorError }}
                          />
                        </div>
                      ) : (
                        <Text
                          ellipsis
                          style={{
                            fontSize: 13,
                            color:
                              conv.id === currentConversationId
                                ? token.colorPrimary
                                : token.colorText,
                            fontWeight: conv.id === currentConversationId ? 500 : 400,
                          }}
                        >
                          {conv.title}
                        </Text>
                      )}
                    </div>
                    {editingId !== conv.id && (
                      <div className="chat-item-actions">
                        <Tooltip title="重命名">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => handleRename(conv.id, e)}
                            style={{ color: token.colorTextQuaternary, fontSize: 12 }}
                          />
                        </Tooltip>
                        <Tooltip title="删除">
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => handleDeleteChat(conv.id, e)}
                            style={{ color: token.colorError, fontSize: 12 }}
                          />
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: token.colorBgContainer,
          borderRadius: '0 12px 12px 0',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isOnlyWelcomeMessage ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <RobotOutlined style={{ fontSize: 40, color: '#fff' }} />
              </div>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: token.colorText,
                  marginBottom: 8,
                }}
              >
                AI 智能助手
              </Text>
              <Text type="secondary" style={{ fontSize: 14, marginBottom: 32 }}>
                有什么我可以帮助你的吗？
              </Text>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['解释 React Hooks', '写一个 Python 爬虫', '推荐一本好书'].map((text) => (
                  <Button
                    key={text}
                    onClick={() => {
                      setInputValue(text);
                      inputRef.current?.focus();
                    }}
                    style={{
                      borderRadius: 20,
                      padding: '8px 16px',
                      height: 'auto',
                      border: `1px solid ${token.colorBorder}`,
                    }}
                  >
                    {text}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id ?? `${msg.role}-${msg.content.substring(0, 20)}`}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 24,
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        flexShrink: 0,
                      }}
                    >
                      <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius:
                        msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background:
                        msg.role === 'user'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : token.colorFillAlter,
                      color: msg.role === 'user' ? '#fff' : token.colorText,
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: token.colorPrimaryBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 12,
                        flexShrink: 0,
                      }}
                    >
                      <UserOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '16px 16px 16px 4px',
                      background: token.colorFillAlter,
                    }}
                  >
                    <Spin size="small" />
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                      思考中...
                    </Text>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
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
            }}
          >
            {error}
            <Button
              type="link"
              size="small"
              onClick={() => setError(null)}
              style={{ marginLeft: 8 }}
            >
              关闭
            </Button>
          </div>
        )}

        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
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
                              // biome-ignore lint/a11y/useSemanticElements: interactive div as modal item
                              <div
                                key={kb.id}
                                role="button"
                                tabIndex={0}
                                className={`modal-select-item${selectedKnowledgeBase === kb.id ? ' modal-select-item--selected' : ''}`}
                                onClick={() => {
                                  setSelectedKnowledgeBase(kb.id);
                                  Modal.destroyAll();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedKnowledgeBase(kb.id);
                                    Modal.destroyAll();
                                  }
                                }}
                              >
                                <Text strong>{kb.name}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {kb.docCount || 0} 个文档
                                </Text>
                              </div>
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
                                // biome-ignore lint/a11y/useSemanticElements: interactive div as modal item
                                <div
                                  key={a.id}
                                  role="button"
                                  tabIndex={0}
                                  className={`modal-select-item${selectedAgentId === a.id ? ' modal-select-item--selected' : ''}`}
                                  onClick={() => {
                                    setUseAgent(true);
                                    setAgentType(a.type);
                                    setSelectedAgentId(a.id);
                                    Modal.destroyAll();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setUseAgent(true);
                                      setAgentType(a.type);
                                      setSelectedAgentId(a.id);
                                      Modal.destroyAll();
                                    }
                                  }}
                                >
                                  <Text strong>{a.name}</Text>
                                  <Tag style={{ marginLeft: 8 }} color="blue">
                                    {a.type}
                                  </Tag>
                                </div>
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
                            // biome-ignore lint/a11y/useSemanticElements: interactive div as modal item
                            <div
                              key={item.value}
                              role="button"
                              tabIndex={0}
                              className={`modal-select-item${agentType === item.value && useAgent && !selectedAgentId ? ' modal-select-item--selected' : ''}`}
                              onClick={() => {
                                setUseAgent(true);
                                setAgentType(item.value);
                                setSelectedAgentId('');
                                Modal.destroyAll();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setUseAgent(true);
                                  setAgentType(item.value);
                                  setSelectedAgentId('');
                                  Modal.destroyAll();
                                }
                              }}
                            >
                              <Text strong>{item.label}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.desc}
                              </Text>
                            </div>
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
                            // biome-ignore lint/a11y/useSemanticElements: interactive div as modal item
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              className={`modal-select-item${selectedModel === m.model_name ? ' modal-select-item--selected' : ''}`}
                              onClick={() => {
                                setSelectedModel(m.model_name);
                                Modal.destroyAll();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedModel(m.model_name);
                                  Modal.destroyAll();
                                }
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
                            </div>
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

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              background: token.colorFillAlter,
              borderRadius: 12,
              padding: '8px 12px',
              border: isLoading ? '1px solid #667eea' : `1px solid ${token.colorBorderSecondary}`,
              transition: 'border-color 0.2s',
            }}
          >
            <Input.TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 6 }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                fontSize: 14,
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Tooltip title="清空对话">
                <Button
                  type="text"
                  icon={<ClearOutlined />}
                  onClick={clearMessages}
                  disabled={isLoading || messages.length <= 1}
                  style={{ color: token.colorTextQuaternary }}
                />
              </Tooltip>
              {isLoading ? (
                <Tooltip title="停止生成 (Enter)">
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={handleStop}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </Tooltip>
              ) : (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: inputValue.trim()
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : token.colorBorder,
                    border: 'none',
                  }}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 11, color: token.colorTextQuaternary }}>
              AI 可能会犯错，请核实重要信息
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
