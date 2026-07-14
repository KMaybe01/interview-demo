import {
  AppstoreOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { version as xCardVersion } from '@ant-design/x-card';
import { version as xMarkdownVersion } from '@ant-design/x-markdown';
import { Button, Card, Col, Row, Space, Statistic, Typography, theme } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { agentAPI, knowledgeAPI, modelAPI } from '../services/api.ts';

const { Text } = Typography;

interface DashboardProps {
  onNavigate: (key: string) => void;
}

function Dashboard({ onNavigate }: DashboardProps) {
  const { token } = theme.useToken();
  const [stats, setStats] = useState({
    knowledgeBases: 0,
    models: 0,
    agents: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [kbRes, modelRes, agentRes] = await Promise.all([
        knowledgeAPI.list(),
        modelAPI.list(),
        agentAPI.list(),
      ]);
      setStats({
        knowledgeBases: kbRes.count || 0,
        models: modelRes.count || 0,
        agents: agentRes.count || 0,
      });
    } catch (_err) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const features = [
    {
      title: 'AI 聊天',
      description: '与 AI 进行智能对话，支持流式响应',
      icon: <MessageOutlined style={{ fontSize: 32, color: '#667eea' }} />,
      background: token.colorPrimaryBg,
      border: `1px solid ${token.colorPrimaryBorder}`,
    },
    {
      title: '知识库',
      description: '构建 RAG 知识库，让 AI 基于文档回答',
      icon: <BookOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      background: token.colorSuccessBg,
      border: `1px solid ${token.colorSuccessBorder}`,
    },
    {
      title: '模型管理',
      description: '支持 OpenAI、DeepSeek、Ollama 等多模型',
      icon: <AppstoreOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      background: token.colorWarningBg,
      border: `1px solid ${token.colorWarningBorder}`,
    },
    {
      title: '智能体',
      description: '创建 ReAct、Function Calling 等智能体',
      icon: <RobotOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
      background: token.colorErrorBg,
      border: `1px solid ${token.colorErrorBorder}`,
    },
  ];

  const quickActions: { label: string; key: string; icon: React.ReactNode }[] = [
    { label: '开始聊天', key: 'chat', icon: <MessageOutlined /> },
    { label: '创建知识库', key: 'knowledge', icon: <BookOutlined /> },
    { label: '管理模型', key: 'models', icon: <AppstoreOutlined /> },
    { label: '创建智能体', key: 'agents', icon: <RobotOutlined /> },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="知识库"
              value={stats.knowledgeBases}
              prefix={<BookOutlined style={{ color: '#52c41a' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="模型"
              value={stats.models}
              prefix={<AppstoreOutlined style={{ color: '#faad14' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="智能体"
              value={stats.agents}
              prefix={<RobotOutlined style={{ color: '#eb2f96' }} />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="核心功能" style={{ height: '100%' }}>
            <Row gutter={[16, 16]}>
              {features.map((feature) => (
                <Col xs={24} sm={12} key={feature.title}>
                  <Card
                    size="small"
                    style={{
                      background: feature.background,
                      border: feature.border,
                      height: '100%',
                    }}
                    hoverable
                  >
                    <Space align="start">
                      {feature.icon}
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

        <Col xs={24} lg={8}>
          <Card title="快速操作" style={{ height: '100%' }}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              {quickActions.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                  }}
                >
                  <span>{item.label}</span>
                  <Button type="link" icon={item.icon} onClick={() => onNavigate(item.key)}>
                    前往
                  </Button>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="系统状态" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text>后端服务: 正常运行</Text>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <CloudServerOutlined style={{ color: '#1677ff' }} />
              <Text>API 地址: localhost:8080</Text>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <ThunderboltOutlined style={{ color: '#faad14' }} />
              <Text>版本: v1.0.0</Text>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <ThunderboltOutlined style={{ color: '#722ed1' }} />
              <Text>X-Markdown v{xMarkdownVersion}</Text>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <ThunderboltOutlined style={{ color: '#13c2c2' }} />
              <Text>X-Card v{xCardVersion}</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default Dashboard;
