import {
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { agentAPI } from '../services/api.ts';
import type { Agent, AgentExecuteResponse, AgentStep } from '../types/index.ts';

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

function Agents() {
  const message = useMessageApi();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [executeResult, setExecuteResult] = useState<AgentExecuteResponse | null>(null);
  const [executeLoading, setExecuteLoading] = useState(false);

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
    try {
      const response = await agentAPI.execute(selectedAgent.id, values.input);
      setExecuteResult(response);
    } catch {
      message.error('执行失败');
    } finally {
      setExecuteLoading(false);
    }
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
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
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
            key: 'types',
            label: (
              <span>
                <ThunderboltOutlined /> 智能体类型
              </span>
            ),
            children: (
              <Card>
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
                        { children: 'Thought: 分析用户问题' },
                        { children: 'Action: 选择合适的工具' },
                        { children: 'Observation: 获取工具返回结果' },
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
                    <Text>
                      Function Calling 是 OpenAI 推出的功能，允许 LLM
                      根据用户输入自动选择并调用预定义的函数。 适用于结构化的工具调用场景。
                    </Text>
                    <List
                      style={{ marginTop: 16 }}
                      size="small"
                      dataSource={['计算器', '天气查询', '搜索引擎', '数据库查询']}
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
              </Card>
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
        onCancel={() => setExecuteModalVisible(false)}
        footer={null}
        width={700}
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
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlayCircleOutlined />}
              loading={executeLoading}
            >
              执行
            </Button>
          </Form.Item>
        </Form>

        {executeResult && (
          <Card title="执行结果" style={{ marginTop: 16, background: '#f6ffed' }} size="small">
            <Text strong>响应:</Text>
            <br />
            <Text>{executeResult.response}</Text>

            {executeResult.steps && executeResult.steps.length > 0 && (
              <>
                <Divider />
                <Text strong>执行步骤:</Text>
                <Timeline
                  style={{ marginTop: 12 }}
                  items={executeResult.steps.map((step: AgentStep, index: number) => ({
                    children: (
                      <div
                        key={`step-${step.action ?? 'thought'}-${step.thought?.slice(0, 20) ?? ''}`}
                      >
                        <Text type="secondary">Step {index + 1}</Text>
                        <br />
                        {step.thought && <Text>思考: {step.thought}</Text>}
                        {step.action && (
                          <>
                            <br />
                            <Tag color="blue">{step.action}</Tag>
                          </>
                        )}
                        {step.observation && (
                          <>
                            <br />
                            <Text type="secondary">结果: {step.observation}</Text>
                          </>
                        )}
                      </div>
                    ),
                  }))}
                />
              </>
            )}
          </Card>
        )}
      </Modal>
    </div>
  );
}

export default Agents;
