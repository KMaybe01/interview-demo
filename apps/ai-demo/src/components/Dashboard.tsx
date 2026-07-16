import {
  ApiOutlined,
  AppstoreOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  MessageOutlined,
  ReloadOutlined,
  RobotOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { version as xCardVersion } from '@ant-design/x-card';
import { version as xMarkdownVersion } from '@ant-design/x-markdown';
import {
  Badge,
  Button,
  Card,
  Col,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { agentAPI, chatAPI, knowledgeAPI, mcpAPI, modelAPI } from '../services/api.ts';
import { useChatStore } from '../stores/chatStore.ts';
import { responseCache } from '../utils/response-cache.ts';
import { telemetry } from '../utils/telemetry.ts';
import { builtinPlugins } from './Plugins.tsx';

const { Text } = Typography;

interface DashboardProps {
  onNavigate: (key: string) => void;
}

interface ResourceStats {
  knowledgeBases: number;
  models: number;
  agents: number;
  mcpTools: number;
}

interface FeatureItem {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  key: string;
}

const FEATURES: FeatureItem[] = [
  {
    title: 'AI 聊天',
    description: '流式对话 · 知识库增强 · 智能体模式 · PII 脱敏',
    icon: <MessageOutlined />,
    color: '#667eea',
    key: 'chat',
  },
  {
    title: '知识库',
    description: 'RAG 检索 · 分块策略 · 向量化 · 语义搜索',
    icon: <BookOutlined />,
    color: '#52c41a',
    key: 'knowledge',
  },
  {
    title: '模型管理',
    description: '多模型支持 · 模型对比 · 连接测试',
    icon: <AppstoreOutlined />,
    color: '#faad14',
    key: 'models',
  },
  {
    title: '智能体',
    description: 'ReAct · Function Calling · Multi-Agent · HITL',
    icon: <RobotOutlined />,
    color: '#eb2f96',
    key: 'agents',
  },
  {
    title: 'Playground',
    description: 'MCP/A2A 服务 · 模型路由 · 监控面板',
    icon: <ApiOutlined />,
    color: '#1677ff',
    key: 'playground',
  },
  {
    title: 'A2UI',
    description: 'A2UI Protocol v0.9 · 声明式 UI · XCard',
    icon: <DeploymentUnitOutlined />,
    color: '#722ed1',
    key: 'a2ui',
  },
  {
    title: '插件中心',
    description: `${builtinPlugins.length} 个内置插件 · 分类管理 · 参数配置`,
    icon: <SettingOutlined />,
    color: '#13c2c2',
    key: 'plugins',
  },
];

const REMOTE_STAT_TITLES = ['知识库', '模型', '智能体', 'MCP 工具'];

function Dashboard({ onNavigate }: DashboardProps) {
  const { token } = theme.useToken();
  const message = useMessageApi();
  const conversations = useChatStore((s) => s.conversations);

  const [stats, setStats] = useState<ResourceStats>({
    knowledgeBases: 0,
    models: 0,
    agents: 0,
    mcpTools: 0,
  });
  const [loading, setLoading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [cacheStats, setCacheStats] = useState(responseCache.stats());
  const [telemetrySummary, setTelemetrySummary] = useState(telemetry.getSummary());

  const pluginCount = builtinPlugins.length;
  const enabledPluginCount = builtinPlugins.filter((p) => p.enabled).length;

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [kbRes, modelRes, agentRes, mcpRes] = await Promise.all([
        knowledgeAPI.list(),
        modelAPI.list(),
        agentAPI.list(),
        mcpAPI.listTools().catch(() => ({ mcp_tools: [], a2a_tools: [], count: 0 })),
      ]);
      setStats({
        knowledgeBases: kbRes.count || 0,
        models: modelRes.count || 0,
        agents: agentRes.count || 0,
        mcpTools: (mcpRes.mcp_tools?.length || 0) + (mcpRes.a2a_tools?.length || 0),
      });
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setHealthChecking(true);
    try {
      const healthy = await chatAPI.healthCheck();
      setBackendHealthy(healthy);
    } catch {
      setBackendHealthy(false);
    } finally {
      setHealthChecking(false);
    }
  }, []);

  const refreshRuntime = useCallback(() => {
    setCacheStats(responseCache.stats());
    setTelemetrySummary(telemetry.getSummary());
  }, []);

  useEffect(() => {
    loadStats();
    checkHealth();
    refreshRuntime();
    const healthTimer = setInterval(checkHealth, 30_000);
    const runtimeTimer = setInterval(refreshRuntime, 3000);
    return () => {
      clearInterval(healthTimer);
      clearInterval(runtimeTimer);
    };
  }, [loadStats, checkHealth, refreshRuntime]);

  const handleRefresh = useCallback(() => {
    loadStats(true).then();
    checkHealth().then();
    refreshRuntime();
    message.success('已刷新数据');
  }, [loadStats, checkHealth, refreshRuntime, message]);

  const statCards = [
    { title: '知识库', value: stats.knowledgeBases, icon: <BookOutlined />, color: '#52c41a' },
    { title: '模型', value: stats.models, icon: <AppstoreOutlined />, color: '#faad14' },
    { title: '智能体', value: stats.agents, icon: <RobotOutlined />, color: '#eb2f96' },
    { title: 'MCP 工具', value: stats.mcpTools, icon: <ApiOutlined />, color: '#1677ff' },
    {
      title: '对话',
      value: conversations.length,
      icon: <MessageOutlined />,
      color: '#722ed1',
    },
    {
      title: '插件',
      value: enabledPluginCount,
      suffix: `/ ${pluginCount}`,
      icon: <ToolOutlined />,
      color: '#13c2c2',
    },
    {
      title: '缓存命中',
      value: cacheStats.totalHits,
      icon: <DatabaseOutlined />,
      color: '#52c41a',
    },
    {
      title: 'API 请求',
      value: telemetrySummary.totalRequests,
      icon: <ThunderboltOutlined />,
      color: '#fa8c16',
    },
  ];

  const healthStatus =
    backendHealthy === null
      ? { status: 'default' as const, text: '检测中' }
      : backendHealthy
        ? { status: 'success' as const, text: '正常运行' }
        : { status: 'error' as const, text: '服务异常' };

  const eventEntries = Object.entries(telemetrySummary.eventsByType);

  return (
    <div>
      <Card
        title="集成 LLM 对话 · RAG 知识库 · 智能体 · MCP 协议 · A2UI 的全栈 AI 平台"
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          {statCards.map((item) => (
            <Col xs={12} sm={8} lg={6} key={item.title}>
              <Card hoverable>
                <Statistic
                  title={item.title}
                  value={item.value}
                  prefix={<span style={{ color: item.color }}>{item.icon}</span>}
                  suffix={
                    item.suffix ? (
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {item.suffix}
                      </Text>
                    ) : undefined
                  }
                  loading={loading && REMOTE_STAT_TITLES.includes(item.title)}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={24}>
          <Card title="核心功能">
            <Row gutter={[16, 16]}>
              {FEATURES.map((feature) => (
                <Col xs={24} sm={12} lg={8} key={feature.key}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      background: `${feature.color}14`,
                      border: `1px solid ${feature.color}40`,
                      height: '100%',
                      cursor: 'pointer',
                    }}
                    onClick={() => onNavigate(feature.key)}
                  >
                    <Space align="start">
                      <span style={{ fontSize: 28, color: feature.color, lineHeight: 1 }}>
                        {feature.icon}
                      </span>
                      <div>
                        <Text strong>{feature.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {feature.description}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title="遥测概览"
            extra={
              <Button size="small" onClick={refreshRuntime}>
                刷新
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="总请求数"
                  value={telemetrySummary.totalRequests}
                  prefix={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="错误数"
                  value={telemetrySummary.totalErrors}
                  valueStyle={{
                    color: telemetrySummary.totalErrors > 0 ? token.colorError : token.colorSuccess,
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic title="平均延迟" value={telemetrySummary.avgLatency} suffix="ms" />
              </Col>
              <Col span={12}>
                <Statistic title="P95 延迟" value={telemetrySummary.p95Latency} suffix="ms" />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="缓存与事件">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="缓存大小"
                  value={cacheStats.size}
                  suffix={`/ ${cacheStats.maxSize}`}
                  prefix={<DatabaseOutlined style={{ color: '#52c41a' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="缓存命中"
                  value={cacheStats.totalHits}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                事件类型分布
              </Text>
              <List
                size="small"
                style={{ marginTop: 8 }}
                dataSource={eventEntries}
                renderItem={([type, count]) => (
                  <List.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Tag>{type}</Tag>
                      <Text>{count} 次</Text>
                    </Space>
                  </List.Item>
                )}
                locale={{ emptyText: '暂无事件' }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="系统状态"
        style={{ marginTop: 16 }}
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={healthChecking}
            onClick={checkHealth}
          >
            重新检测
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Badge status={healthStatus.status} />
              <Text>后端服务: {healthStatus.text}</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <CloudServerOutlined style={{ color: '#1677ff' }} />
              <Text>API 地址: localhost:8080</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <ThunderboltOutlined style={{ color: '#faad14' }} />
              <Text>版本: v1.0.0</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <ThunderboltOutlined style={{ color: '#722ed1' }} />
              <Text>X-Markdown v{xMarkdownVersion}</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <ThunderboltOutlined style={{ color: '#13c2c2' }} />
              <Text>X-Card v{xCardVersion}</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <DeploymentUnitOutlined style={{ color: '#eb2f96' }} />
              <Text>A2UI v0.9.1</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default Dashboard;
