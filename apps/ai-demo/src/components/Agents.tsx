import {
  ApartmentOutlined,
  BranchesOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Collapse,
  Descriptions,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Tree,
  Typography,
  theme,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { agentAPI } from '../services/api.ts';
import type {
  Agent,
  AgentExecuteResponse,
  AgentStep,
  AgentStreamEvent,
  MemoryEntry,
  ToolDefinition,
} from '../types/index.ts';
import { estimateTokens } from '../utils/token-estimator.ts';

const { Text } = Typography;
const { Panel } = Collapse;

const AGENT_TYPE_COLORS: Record<string, string> = {
  react: 'blue',
  function: 'green',
  multi: 'purple',
  rag: 'orange',
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  react: 'ReAct 模式',
  function: 'Function Calling',
  multi: '多智能体',
  rag: 'RAG 模式',
};

const DEFAULT_TOOLS: ToolDefinition[] = [
  {
    id: 'calculator',
    name: '计算器',
    description: '执行数学计算',
    parameters: [{ name: 'expression', type: 'string', required: true, description: '数学表达式' }],
    enabled: true,
  },
  {
    id: 'web-search',
    name: '网页搜索',
    description: '搜索互联网信息',
    parameters: [{ name: 'query', type: 'string', required: true, description: '搜索关键词' }],
    enabled: true,
  },
  {
    id: 'weather',
    name: '天气查询',
    description: '查询城市天气',
    parameters: [{ name: 'city', type: 'string', required: true, description: '城市名称' }],
    enabled: false,
  },
  {
    id: 'database',
    name: '数据库查询',
    description: '执行 SQL 查询',
    parameters: [{ name: 'sql', type: 'string', required: true, description: 'SQL 语句' }],
    enabled: false,
  },
  {
    id: 'file-read',
    name: '文件读取',
    description: '读取文件内容',
    parameters: [{ name: 'path', type: 'string', required: true, description: '文件路径' }],
    enabled: true,
  },
  {
    id: 'code-runner',
    name: '代码执行',
    description: '运行 Python/JS 代码',
    parameters: [
      { name: 'code', type: 'string', required: true, description: '代码内容' },
      { name: 'language', type: 'string', required: true, description: '编程语言' },
    ],
    enabled: false,
  },
];

function Agents() {
  const message = useMessageApi();
  const { token } = theme.useToken();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [executeResult, setExecuteResult] = useState<AgentExecuteResponse | null>(null);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [tools, setTools] = useState<ToolDefinition[]>(DEFAULT_TOOLS);
  const [toolSearch, setToolSearch] = useState('');
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [hitlModalVisible, setHitlModalVisible] = useState(false);
  const [hitlInput, setHitlInput] = useState('');
  const [hitlHistory, setHitlHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [executingStepIndex, setExecutingStepIndex] = useState<number | null>(null);
  const [streamingStep, setStreamingStep] = useState<{
    thought?: string;
    action?: string;
    observation?: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [createForm] = Form.useForm();
  const [executeForm] = Form.useForm();

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await agentAPI.list();
      setAgents(response.agents || []);
    } catch {
      message.error('加载智能体列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCreate = async (values: { type: string; name: string }) => {
    try {
      await agentAPI.create(values.type, values.name);
      message.success('智能体创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadAgents();
    } catch {
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await agentAPI.delete(id);
      message.success('删除成功');
      loadAgents();
    } catch {
      message.error('删除失败');
    }
  };

  const handleExecute = async (values: { input: string }) => {
    if (!selectedAgent) return;
    setExecuteLoading(true);
    setExecuteResult(null);
    setExecutingStepIndex(null);
    setStreamingStep(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const steps: AgentStep[] = [];
    let finalResponse = '';

    await agentAPI.executeStream(
      selectedAgent.id,
      values.input,
      controller.signal,
      (event: AgentStreamEvent) => {
        if (event.type === 'thought') {
          const step: AgentStep = { thought: event.thought };
          steps.push(step);
          setStreamingStep({ thought: event.thought });
          setExecuteResult({ response: '', steps: [...steps] });
        } else if (event.type === 'action') {
          const lastStep = steps[steps.length - 1];
          if (lastStep) {
            lastStep.action = event.action;
            setStreamingStep((prev) => ({ ...prev, action: event.action }));
            setExecuteResult({ response: '', steps: [...steps] });
          }
        } else if (event.type === 'observation') {
          const lastStep = steps[steps.length - 1];
          if (lastStep) {
            lastStep.observation = event.observation;
            setStreamingStep(null);
            setExecuteResult({ response: '', steps: [...steps] });
          }
        } else if (event.type === 'result') {
          finalResponse = event.content ?? '';
          setStreamingStep(null);
          setExecuteResult({ response: finalResponse, steps: [...steps] });
        } else if (event.type === 'error') {
          message.error(event.error ?? '执行出错');
        }
      },
      () => {
        setExecuteLoading(false);
        abortRef.current = null;
        setStreamingStep(null);
        const stepCount = steps.length;
        message.success(`执行完成，共 ${stepCount} 步`);
      },
      (errMsg: string) => {
        setExecuteLoading(false);
        abortRef.current = null;
        setStreamingStep(null);
        if (steps.length > 0 || finalResponse) {
          setExecuteResult({ response: finalResponse || '(部分结果)', steps: [...steps] });
        }
        message.error(errMsg);
      },
    );
  };

  const handleSimulateStep = () => {
    if (executingStepIndex === null) return;
    const nextIndex = executingStepIndex + 1;
    if (nextIndex >= (executeResult?.steps?.length ?? 0)) {
      setExecutingStepIndex(null);
      message.success('所有步骤执行完成');
      return;
    }
    setExecutingStepIndex(nextIndex);
  };

  const toggleTool = (id: string) => {
    setTools((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const addMemory = (content: string, type: MemoryEntry['type'] = 'short-term') => {
    const entry: MemoryEntry = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      type,
      content,
      timestamp: new Date(),
      metadata: {},
    };
    setMemories((prev) => [entry, ...prev]);
  };

  const clearMemories = () => {
    Modal.confirm({
      title: '清除所有记忆？',
      onOk: () => setMemories([]),
    });
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name' as const,
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type' as const,
      key: 'type',
      render: (type: string) => (
        <Tag color={AGENT_TYPE_COLORS[type] || 'default'}>{AGENT_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '工具数',
      dataIndex: 'tools_count' as const,
      key: 'tools_count',
      render: (count: number) => <Tag color="cyan">{count}</Tag>,
    },
    {
      title: '最大步数',
      dataIndex: 'max_steps' as const,
      key: 'max_steps',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Agent) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              setSelectedAgent(record);
              setExecuteResult(null);
              setExecutingStepIndex(null);
              executeForm.resetFields();
              setExecuteModalVisible(true);
            }}
          >
            执行
          </Button>
          <Popconfirm title="确定删除此智能体吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const buildStepTree = (steps: AgentStep[] | undefined): DataNode[] => {
    if (!steps || steps.length === 0) return [];
    return steps.map((step, i) => ({
      key: `step-${i}`,
      title: (
        <div style={{ fontSize: 13 }}>
          <Text type="secondary">Step {i + 1}</Text>
          {step.thought && (
            <div>
              <Text style={{ color: token.colorTextSecondary }}>🤔 {step.thought}</Text>
            </div>
          )}
          {step.action && (
            <div>
              <Tag color="blue" style={{ marginTop: 2 }}>
                {step.action}
              </Tag>
            </div>
          )}
          {step.observation && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                📋 {step.observation.slice(0, 120)}
                {step.observation.length > 120 ? '...' : ''}
              </Text>
            </div>
          )}
        </div>
      ),
      icon: step.action ? <ToolOutlined /> : <BranchesOutlined />,
    }));
  };

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(toolSearch.toLowerCase()),
  );

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'list',
            label: (
              <span>
                <RobotOutlined /> 智能体列表
              </span>
            ),
            children: (
              <>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    创建智能体
                  </Button>
                  <Tooltip title="刷新列表">
                    <Button icon={<ReloadOutlined />} onClick={loadAgents} loading={loading} />
                  </Tooltip>
                </div>

                <Table<Agent>
                  columns={columns}
                  dataSource={agents}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </>
            ),
          },
          {
            key: 'tools',
            label: (
              <span>
                <ToolOutlined /> 工具注册表
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text strong style={{ fontSize: 16 }}>
                    已注册工具 ({tools.filter((t) => t.enabled).length}/{tools.length})
                  </Text>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索工具..."
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    style={{ width: 240 }}
                    allowClear
                  />
                </div>
                <List
                  dataSource={filteredTools}
                  renderItem={(tool: ToolDefinition) => (
                    <List.Item
                      actions={[
                        <Switch
                          key="toggle"
                          checked={tool.enabled}
                          onChange={() => toggleTool(tool.id)}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <ToolOutlined
                            style={{
                              fontSize: 20,
                              color: tool.enabled ? '#667eea' : token.colorTextQuaternary,
                            }}
                          />
                        }
                        title={
                          <Space>
                            <Text strong={tool.enabled}>{tool.name}</Text>
                            <Tag color={tool.enabled ? 'green' : 'default'}>
                              {tool.enabled ? '已启用' : '已禁用'}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <Text type="secondary">{tool.description}</Text>
                            <div style={{ marginTop: 4 }}>
                              {tool.parameters.map((p) => (
                                <Tag key={p.name} style={{ fontSize: 11 }} bordered={false}>
                                  {p.name}: {p.type}
                                  {p.required ? ' *' : ''}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            ),
          },
          {
            key: 'memory',
            label: (
              <span>
                <ApartmentOutlined /> 记忆管理
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space>
                    <Text strong style={{ fontSize: 16 }}>
                      对话记忆 ({memories.length})
                    </Text>
                    <Tag>
                      {estimateTokens(memories.map((m) => m.content).join(' ')).tokens} tokens
                    </Tag>
                  </Space>
                  <Space>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const content = prompt('输入记忆内容:');
                        if (content) addMemory(content);
                      }}
                    >
                      添加记忆
                    </Button>
                    <Button size="small" danger icon={<ClearOutlined />} onClick={clearMemories}>
                      清除
                    </Button>
                  </Space>
                </div>

                <Tabs
                  size="small"
                  items={[
                    {
                      key: 'short-term',
                      label: `短期记忆 (${memories.filter((m) => m.type === 'short-term').length})`,
                      children: (
                        <List
                          dataSource={memories.filter((m) => m.type === 'short-term')}
                          locale={{ emptyText: '暂无短期记忆' }}
                          renderItem={(item: MemoryEntry) => (
                            <List.Item
                              actions={[
                                <Button
                                  key="promote"
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    setMemories((prev) =>
                                      prev.map((m) =>
                                        m.id === item.id ? { ...m, type: 'long-term' as const } : m,
                                      ),
                                    );
                                  }}
                                >
                                  转为长期
                                </Button>,
                              ]}
                            >
                              <Text>{item.content}</Text>
                            </List.Item>
                          )}
                        />
                      ),
                    },
                    {
                      key: 'long-term',
                      label: `长期记忆 (${memories.filter((m) => m.type === 'long-term').length})`,
                      children: (
                        <List
                          dataSource={memories.filter((m) => m.type === 'long-term')}
                          locale={{ emptyText: '暂无长期记忆' }}
                          renderItem={(item: MemoryEntry) => (
                            <List.Item>
                              <Text>{item.content}</Text>
                            </List.Item>
                          )}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            key: 'types',
            label: (
              <span>
                <ThunderboltOutlined /> 智能体类型
              </span>
            ),
            children: (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Space>
                        <BranchesOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                        <Text strong>HITL (Human-in-the-Loop) 模拟</Text>
                      </Space>
                      <Button
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => {
                          setHitlHistory([]);
                          setHitlInput('');
                          setHitlModalVisible(true);
                        }}
                      >
                        启动 HITL 对话
                      </Button>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      模拟人工审核流程：Agent 执行到关键步骤时暂停，等待人工确认后继续
                    </Text>
                  </Space>
                </Card>

                <Collapse accordion>
                  <Panel
                    header={
                      <Space>
                        <Tag color="blue">ReAct</Tag>
                        <Text>推理与行动模式</Text>
                      </Space>
                    }
                    key="react"
                  >
                    <Text>
                      ReAct (Reasoning + Acting) 是一种让 LLM 交替进行推理和行动的模式。
                      每一步先进行思考（Thought），然后选择工具（Action），最后观察结果（Observation）。
                    </Text>
                    <Timeline
                      style={{ marginTop: 16 }}
                      items={[
                        { children: 'Thought: 分析用户问题 → 确定需要哪些信息' },
                        { children: 'Action: 选择合适的工具获取信息' },
                        { children: 'Observation: 获取工具返回结果' },
                        { children: 'Thought: 基于新信息继续推理' },
                        { children: '... 重复直到得出答案' },
                        { children: 'Final Answer: 输出最终答案' },
                      ]}
                    />
                  </Panel>

                  <Panel
                    header={
                      <Space>
                        <Tag color="green">Function Calling</Tag>
                        <Text>函数调用模式</Text>
                      </Space>
                    }
                    key="function"
                  >
                    <Text>Function Calling 允许 LLM 根据用户输入自动选择并调用预定义的函数。</Text>
                    <List
                      style={{ marginTop: 16 }}
                      size="small"
                      dataSource={tools.filter((t) => t.enabled).map((t) => t.name)}
                      renderItem={(item: string) => <List.Item>{item}</List.Item>}
                    />
                  </Panel>

                  <Panel
                    header={
                      <Space>
                        <Tag color="purple">Multi-Agent</Tag>
                        <Text>多智能体协作</Text>
                      </Space>
                    }
                    key="multi"
                  >
                    <Text>
                      多智能体系统允许多个专业化的智能体协作完成复杂任务。
                      每个智能体负责特定领域，通过协调工作实现整体目标。
                    </Text>
                  </Panel>

                  <Panel
                    header={
                      <Space>
                        <Tag color="orange">RAG</Tag>
                        <Text>检索增强生成</Text>
                      </Space>
                    }
                    key="rag"
                  >
                    <Text>
                      RAG 智能体结合了知识库检索和 LLM 生成能力。
                      首先从知识库中检索相关信息，然后基于检索结果生成准确回答。
                    </Text>
                  </Panel>
                </Collapse>
              </>
            ),
          },
        ]}
      />

      <Modal
        title="创建智能体"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
      >
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="name"
            label="智能体名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如：客服助手" />
          </Form.Item>
          <Form.Item
            name="type"
            label="智能体类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              placeholder="选择类型"
              options={[
                { value: 'react', label: 'ReAct 模式' },
                { value: 'function', label: 'Function Calling' },
                { value: 'multi', label: '多智能体' },
                { value: 'rag', label: 'RAG 模式' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`执行智能体: ${selectedAgent?.name || ''}`}
        open={executeModalVisible}
        onCancel={() => {
          abortRef.current?.abort();
          setExecuteModalVisible(false);
        }}
        footer={null}
        width={800}
      >
        <Form form={executeForm} onFinish={handleExecute} layout="vertical">
          <Form.Item
            name="input"
            label="输入内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={4} placeholder="输入要处理的内容..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={executeLoading ? <LoadingOutlined /> : <PlayCircleOutlined />}
                loading={executeLoading}
              >
                {executeLoading ? '执行中...' : '执行'}
              </Button>
              {executeLoading && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    abortRef.current?.abort();
                    setExecuteLoading(false);
                    setStreamingStep(null);
                  }}
                >
                  停止
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>

        {streamingStep && (
          <Card
            size="small"
            title={
              <Space>
                <LoadingOutlined />
                正在执行...
              </Space>
            }
            style={{ marginTop: 16, marginBottom: 16 }}
          >
            {streamingStep.thought && (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">思考: {streamingStep.thought}</Text>
              </div>
            )}
            {streamingStep.action && (
              <div>
                <Tag color="blue">{streamingStep.action}</Tag>
              </div>
            )}
          </Card>
        )}

        {executeResult && (
          <div style={{ marginTop: 16 }}>
            <Card
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  执行结果
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Text>{executeResult.response}</Text>
            </Card>

            {executeResult.steps && executeResult.steps.length > 0 && (
              <Card
                title={
                  <Space>
                    <BranchesOutlined />
                    <Text>执行轨迹 ({executeResult.steps.length} 步)</Text>
                  </Space>
                }
                size="small"
                extra={
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => setExecutingStepIndex(executingStepIndex === null ? 0 : null)}
                    >
                      {executingStepIndex === null ? '逐步播放' : '停止'}
                    </Button>
                  </Space>
                }
              >
                {executingStepIndex !== null ? (
                  <Timeline
                    items={executeResult.steps
                      .slice(0, executingStepIndex + 1)
                      .map((step: AgentStep, i: number) => ({
                        children: (
                          <div key={`step-${i}`}>
                            <Text type="secondary">Step {i + 1}</Text>
                            {step.thought && (
                              <div>
                                <Text>思考: {step.thought}</Text>
                              </div>
                            )}
                            {step.action && (
                              <div style={{ marginTop: 4 }}>
                                <Tag color="blue">{step.action}</Tag>
                              </div>
                            )}
                            {step.observation && (
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  结果: {step.observation}
                                </Text>
                              </div>
                            )}
                          </div>
                        ),
                        color: i === executingStepIndex ? 'blue' : 'green',
                      }))}
                  />
                ) : (
                  <Tree
                    treeData={buildStepTree(executeResult.steps)}
                    defaultExpandAll
                    showIcon
                    style={{ background: 'transparent' }}
                  />
                )}

                {executingStepIndex !== null &&
                  executingStepIndex < (executeResult.steps?.length ?? 0) - 1 && (
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <Badge
                        status="processing"
                        text={<Text type="secondary">等待人工确认...</Text>}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={handleSimulateStep}
                          style={{ marginRight: 8 }}
                        >
                          确认继续
                        </Button>
                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => setExecutingStepIndex(null)}
                        >
                          终止
                        </Button>
                      </div>
                    </div>
                  )}

                {executingStepIndex !== null &&
                  executingStepIndex >= (executeResult.steps?.length ?? 0) - 1 && (
                    <div style={{ marginTop: 12 }}>
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        所有步骤执行完成
                      </Tag>
                    </div>
                  )}
              </Card>
            )}

            {executeResult.steps && executeResult.steps.length > 0 && (
              <Card
                title={
                  <Space>
                    <SettingOutlined />
                    执行详情
                  </Space>
                }
                size="small"
                style={{ marginTop: 12 }}
              >
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="总步数">{executeResult.steps.length}</Descriptions.Item>
                  <Descriptions.Item label="响应长度">
                    {executeResult.response.length} 字符
                  </Descriptions.Item>
                  <Descriptions.Item label="估计 Tokens">
                    {estimateTokens(executeResult.response).tokens}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="HITL 人工审核模拟"
        open={hitlModalVisible}
        onCancel={() => setHitlModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">模拟 Agent 执行过程中的人工审核流程</Text>
        </div>

        <div
          style={{
            background: token.colorFillAlter,
            borderRadius: 8,
            padding: 12,
            minHeight: 200,
            maxHeight: 300,
            overflowY: 'auto',
            marginBottom: 16,
          }}
        >
          {hitlHistory.length === 0 && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 40 }}>
              点击下方按钮模拟 Agent 请求人工审核
            </Text>
          )}
          {hitlHistory.map((entry, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: entry.role === 'agent' ? token.colorPrimaryBg : token.colorSuccessBg,
                fontSize: 13,
              }}
            >
              <Tag color={entry.role === 'agent' ? 'blue' : 'green'} style={{ marginBottom: 4 }}>
                {entry.role === 'agent' ? 'Agent 请求' : '人工审核'}
              </Tag>
              <Text>{entry.content}</Text>
            </div>
          ))}
        </div>

        <Space style={{ width: '100%', marginBottom: 12 }}>
          <Button
            icon={<BugOutlined />}
            onClick={() => {
              const msg = `需要确认执行: 调用工具 "web-search" 搜索关键词 "${selectedAgent?.name || '...'}"`;
              setHitlHistory((prev) => [...prev, { role: 'agent', content: msg }]);
            }}
          >
            模拟 Agent 请求
          </Button>
        </Space>

        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            value={hitlInput}
            onChange={(e) => setHitlInput(e.target.value)}
            placeholder="输入审核意见..."
            rows={2}
          />
          <Button
            type="primary"
            onClick={() => {
              if (hitlInput.trim()) {
                setHitlHistory((prev) => [...prev, { role: 'human', content: hitlInput.trim() }]);
                setHitlInput('');
              }
            }}
            style={{ height: 'auto' }}
          >
            提交审核
          </Button>
        </Space.Compact>
      </Modal>
    </div>
  );
}

export default Agents;
