import {
  ApiOutlined,
  ClusterOutlined,
  GatewayOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import {useCallback, useEffect, useState} from 'react';
import {useMessageApi} from '../AIDemo.tsx';
import {mcpAPI, telemetryAPI} from '../services/api.ts';
import type {A2AToolDTO, MCPServer, MCPTool, MCPToolDTO, ModelRouterConfig,} from '../types/index.ts';
import {responseCache} from '../utils/response-cache.ts';
import {telemetry} from '../utils/telemetry.ts';

const { Text } = Typography;

const DEFAULT_ROUTER: ModelRouterConfig = {
  defaultModel: 'openai-gpt4',
  fallbackModel: 'deepseek-chat',
  routingRules: [
    {
      id: 'rule-1',
      name: '代码生成 → GPT-4',
      condition: 'task: coding',
      model: 'openai-gpt4',
      priority: 1,
    },
    {
      id: 'rule-2',
      name: '文本创作 → Claude',
      condition: 'task: writing',
      model: 'claude-3',
      priority: 2,
    },
    {
      id: 'rule-3',
      name: '简单问答 → DeepSeek',
      condition: 'complexity: low',
      model: 'deepseek-chat',
      priority: 3,
    },
  ],
  enableFallback: true,
  enableCache: true,
};

function Playground() {
  const message = useMessageApi();
  const { token } = theme.useToken();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [router, setRouter] = useState<ModelRouterConfig>(DEFAULT_ROUTER);
  const [cacheStats, setCacheStats] = useState(responseCache.stats());
  const [telemetrySummary, setTelemetrySummary] = useState(telemetry.getSummary());
  const [addServerModalVisible, setAddServerModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [serversLoading, setServersLoading] = useState(false);

  const [addForm] = Form.useForm();

  const loadServers = useCallback(async () => {
    setServersLoading(true);
    try {
      const res = await mcpAPI.listTools();
      const mapped: MCPServer[] = [];
      if (res.mcp_tools.length > 0) {
        mapped.push({
          id: 'mcp-registry',
          name: 'MCP 工具注册表',
          endpoint: '/api/mcp/tools',
          protocol: 'mcp',
          status: 'online',
          lastSeen: new Date().toISOString(),
          tools: res.mcp_tools.map((t: MCPToolDTO) => ({
            name: t.name,
            description: t.description,
            inputSchema: {},
          })),
        });
      }
      if (res.a2a_tools.length > 0) {
        mapped.push({
          id: 'a2a-registry',
          name: 'A2A 智能体注册表',
          endpoint: '/api/mcp/tools',
          protocol: 'a2a',
          status: 'online',
          lastSeen: new Date().toISOString(),
          tools: res.a2a_tools.map((t: A2AToolDTO) => ({
            name: t.name,
            description: t.description,
            inputSchema: {},
          })),
        });
      }
      if (mapped.length > 0) setServers(mapped);
    } catch {
      // fallback to empty list - API not available
    } finally {
      setServersLoading(false);
    }
  }, []);

  const refreshStats = useCallback(() => {
    setCacheStats(responseCache.stats());
    setTelemetrySummary(telemetry.getSummary());

    const summary = telemetry.getSummary();
    telemetryAPI
      .report({
        requests: summary.totalRequests,
        errors: summary.totalErrors,
        avgLatency: summary.avgLatency,
        cacheHitRate: cacheStats.totalHits > 0 ? 1 : 0,
      })
      .catch(() => {});
  }, [cacheStats]);

  useEffect(() => {
    loadServers();
    const interval = setInterval(refreshStats, 3000);
    return () => clearInterval(interval);
  }, [loadServers, refreshStats]);

  const handleAddServer = (values: { name: string; endpoint: string; protocol: 'mcp' | 'a2a' }) => {
    const newServer: MCPServer = {
      id: `server-${Date.now()}`,
      name: values.name,
      endpoint: values.endpoint,
      protocol: values.protocol,
      status: 'online',
      lastSeen: new Date().toISOString(),
      tools: [],
    };
    setServers((prev) => [...prev, newServer]);
    setAddServerModalVisible(false);
    addForm.resetFields();
    message.success('服务注册成功');
    telemetry.track('mcp-server-register', { name: values.name, protocol: values.protocol });
  };

  const simulateToolCall = (serverId: string, toolName: string) => {
    telemetry.track('mcp-tool-call', { serverId, toolName });
    message.success(`调用 ${toolName} 成功 (已记录到遥测)`);
  };

  const serverColumns = [
    {
      title: '服务名称',
      dataIndex: 'name' as const,
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '协议',
      dataIndex: 'protocol' as const,
      key: 'protocol',
      render: (proto: string) => (
        <Tag color={proto === 'mcp' ? 'blue' : 'green'}>{proto.toUpperCase()}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status' as const,
      key: 'status',
      render: (status: string) => (
        <Badge
          status={status === 'online' ? 'success' : status === 'offline' ? 'default' : 'error'}
          text={status === 'online' ? '在线' : status === 'offline' ? '离线' : '错误'}
        />
      ),
    },
    {
      title: '工具数',
      dataIndex: 'tools' as const,
      key: 'tools',
      render: (tools: MCPTool[]) => <Tag color="cyan">{tools.length}</Tag>,
    },
    {
      title: '最后在线',
      dataIndex: 'lastSeen' as const,
      key: 'lastSeen',
      render: (time: string) => {
        const diff = Date.now() - new Date(time).getTime();
        const minutes = Math.floor(diff / 60000);
        return (
          <Text type="secondary">
            {minutes < 60 ? `${minutes}分钟前` : `${Math.floor(minutes / 60)}小时前`}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: MCPServer) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedServer(record)}>
            查看工具
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => simulateToolCall(record.id, record.tools[0]?.name ?? 'ping')}
          >
            测试
          </Button>
        </Space>
      ),
    },
  ];

  const ruleColumns = [
    {
      title: '规则名称',
      dataIndex: 'name' as const,
      key: 'name',
    },
    {
      title: '条件',
      dataIndex: 'condition' as const,
      key: 'condition',
      render: (cond: string) => <Tag>{cond}</Tag>,
    },
    {
      title: '目标模型',
      dataIndex: 'model' as const,
      key: 'model',
      render: (model: string) => <Tag color="blue">{model}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority' as const,
      key: 'priority',
      render: (p: number) => <Tag color="orange">{p}</Tag>,
    },
  ];

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'mcp',
            label: (
              <span>
                <ApiOutlined /> MCP / A2A 服务
              </span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setAddServerModalVisible(true)}
                    >
                      注册服务
                    </Button>
                    <Tooltip title="刷新">
                      <Button
                        icon={<ReloadOutlined />}
                        loading={serversLoading}
                        onClick={() => {
                          loadServers();
                          refreshStats();
                        }}
                      />
                    </Tooltip>
                  </Space>
                </div>

                <Table<MCPServer>
                  columns={serverColumns}
                  dataSource={servers}
                  rowKey="id"
                  pagination={false}
                />

                <Modal
                  title={`${selectedServer?.name || ''} - 可用工具`}
                  open={!!selectedServer}
                  onCancel={() => setSelectedServer(null)}
                  footer={null}
                  width={500}
                >
                  {selectedServer && (
                    <List
                      dataSource={selectedServer.tools}
                      locale={{ emptyText: '该服务未注册任何工具' }}
                      renderItem={(tool: MCPTool) => (
                        <List.Item
                          actions={[
                            <Button
                              key="call"
                              size="small"
                              type="primary"
                              icon={<RocketOutlined />}
                              onClick={() => simulateToolCall(selectedServer.id, tool.name)}
                            >
                              调用
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <ToolOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                            }
                            title={<Text strong>{tool.name}</Text>}
                            description={<Text type="secondary">{tool.description}</Text>}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Modal>

                <Modal
                  title="注册 MCP/A2A 服务"
                  open={addServerModalVisible}
                  onCancel={() => setAddServerModalVisible(false)}
                  onOk={() => addForm.submit()}
                >
                  <Form form={addForm} onFinish={handleAddServer} layout="vertical">
                    <Form.Item name="name" label="服务名称" rules={[{ required: true }]}>
                      <Input placeholder="例如：MCP 翻译服务" />
                    </Form.Item>
                    <Form.Item name="endpoint" label="端点地址" rules={[{ required: true }]}>
                      <Input placeholder="http://localhost:3100/mcp" />
                    </Form.Item>
                    <Form.Item name="protocol" label="协议" rules={[{ required: true }]}>
                      <Select
                        options={[
                          { value: 'mcp', label: 'MCP (Model Context Protocol)' },
                          { value: 'a2a', label: 'A2A (Agent-to-Agent)' },
                        ]}
                      />
                    </Form.Item>
                  </Form>
                </Modal>
              </>
            ),
          },
          {
            key: 'router',
            label: (
              <span>
                <GatewayOutlined /> 模型路由
              </span>
            ),
            children: (
              <div style={{ maxWidth: 800 }}>
                <Card title="路由配置" style={{ marginBottom: 16 }}>
                  <Form layout="vertical">
                    <Form.Item label="默认模型">
                      <Select
                        value={router.defaultModel}
                        onChange={(v) => setRouter((prev) => ({ ...prev, defaultModel: v }))}
                        options={[
                          { value: 'openai-gpt4', label: 'GPT-4' },
                          { value: 'deepseek-chat', label: 'DeepSeek Chat' },
                          { value: 'claude-3', label: 'Claude 3' },
                          { value: 'ollama-llama3', label: 'Ollama Llama 3' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="备用模型 (降级)">
                      <Select
                        value={router.fallbackModel}
                        onChange={(v) => setRouter((prev) => ({ ...prev, fallbackModel: v }))}
                        options={[
                          { value: 'openai-gpt4', label: 'GPT-4' },
                          { value: 'deepseek-chat', label: 'DeepSeek Chat' },
                          { value: 'claude-3', label: 'Claude 3' },
                          { value: 'ollama-llama3', label: 'Ollama Llama 3' },
                        ]}
                      />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                      <Space>
                        <Text>启用降级:</Text>
                        <Switch
                          checked={router.enableFallback}
                          onChange={(v) => setRouter((prev) => ({ ...prev, enableFallback: v }))}
                        />
                      </Space>
                      <Space>
                        <Text>启用缓存:</Text>
                        <Switch
                          checked={router.enableCache}
                          onChange={(v) => setRouter((prev) => ({ ...prev, enableCache: v }))}
                        />
                      </Space>
                    </div>
                  </Form>
                </Card>

                <Card title="路由规则">
                  <Table<ModelRouterConfig['routingRules'][0]>
                    columns={ruleColumns}
                    dataSource={router.routingRules}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'monitor',
            label: (
              <span>
                <ClusterOutlined /> 监控面板
              </span>
            ),
            children: (
              <div style={{ maxWidth: 800 }}>
                <Card title="遥测概览" style={{ marginBottom: 16 }}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="总请求数">
                      <Tag color="blue">{telemetrySummary.totalRequests}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="总错误数">
                      <Tag color={telemetrySummary.totalErrors > 0 ? 'red' : 'green'}>
                        {telemetrySummary.totalErrors}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="平均延迟">
                      <Tag>{telemetrySummary.avgLatency.toFixed(0)}ms</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="P95 延迟">
                      <Tag>{telemetrySummary.p95Latency.toFixed(0)}ms</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="缓存大小">
                      <Tag>
                        {cacheStats.size}/{cacheStats.maxSize}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="缓存命中">
                      <Tag color="green">{cacheStats.totalHits}</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="事件统计" size="small">
                  <List
                    dataSource={Object.entries(telemetrySummary.eventsByType)}
                    renderItem={([type, count]: [string, number]) => (
                      <List.Item>
                        <Space>
                          <Tag>{type}</Tag>
                          <Text>{count} 次</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>

                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <Button
                    onClick={() => {
                      responseCache.invalidate();
                      refreshStats();
                      message.success('缓存已清除');
                    }}
                  >
                    清除缓存
                  </Button>
                  <Button
                    onClick={() => {
                      telemetry.clear();
                      refreshStats();
                      message.success('遥测已重置');
                    }}
                  >
                    重置遥测
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

export default Playground;
