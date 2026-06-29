import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Modal, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useMessageApi } from '../AIDemo';
import { modelAPI } from '../services/api';
import type { Model } from '../types';

const { Text } = Typography;

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'green',
  deepseek: 'blue',
  ollama: 'orange',
  azure: 'cyan',
};

function Models() {
  const message = useMessageApi();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await modelAPI.list();
      setModels(response.models || []);
    } catch {
      message.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleTestConnection = async (modelId: string) => {
    try {
      await modelAPI.chat(modelId, [{ role: 'user', content: '你好' }]);
      message.success('连接测试成功');
    } catch {
      message.error('连接测试失败');
    }
  };

  const columns = [
    {
      title: '模型名称',
      dataIndex: 'model_name' as const,
      key: 'model_name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '提供商',
      dataIndex: 'provider' as const,
      key: 'provider',
      render: (provider: string) => <Tag color={PROVIDER_COLORS[provider] || 'default'}>{provider.toUpperCase()}</Tag>,
    },
    {
      title: '上下文窗口',
      dataIndex: 'context_window' as const,
      key: 'context_window',
      render: (val: number | undefined) => (val ? `${(val / 1000).toFixed(0)}K` : '-'),
    },
    {
      title: '最大输出',
      dataIndex: 'max_tokens' as const,
      key: 'max_tokens',
    },
    {
      title: '温度',
      dataIndex: 'temperature' as const,
      key: 'temperature',
    },
    {
      title: '工具调用',
      dataIndex: 'supports_tools' as const,
      key: 'supports_tools',
      render: (val: boolean) =>
        val ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            支持
          </Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            不支持
          </Tag>
        ),
    },
    {
      title: '视觉能力',
      dataIndex: 'supports_vision' as const,
      key: 'supports_vision',
      render: (val: boolean) =>
        val ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            支持
          </Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            不支持
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Model) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedModel(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          <Button type="link" size="small" onClick={() => handleTestConnection(record.id)}>
            测试
          </Button>
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
                <ApiOutlined /> 模型列表
              </span>
            ),
            children: (
              <Card
                extra={
                  <Tooltip title="刷新列表">
                    <Button icon={<ReloadOutlined />} onClick={loadModels} loading={loading} />
                  </Tooltip>
                }
              >
                <Table<Model>
                  columns={columns}
                  dataSource={models}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'compare',
            label: (
              <span>
                <EditOutlined /> 模型对比
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={[
                    {
                      title: '特性',
                      dataIndex: 'feature',
                      key: 'feature',
                    },
                    ...models.map((m) => ({
                      title: m.model_name,
                      dataIndex: m.id,
                      key: m.id,
                    })),
                  ]}
                  dataSource={[
                    {
                      key: '1',
                      feature: '提供商',
                      ...Object.fromEntries(models.map((m) => [m.id, m.provider])),
                    },
                    {
                      key: '2',
                      feature: '上下文窗口',
                      ...Object.fromEntries(
                        models.map((m) => [m.id, m.context_window ? `${(m.context_window / 1000).toFixed(0)}K` : '-']),
                      ),
                    },
                    {
                      key: '3',
                      feature: '工具调用',
                      ...Object.fromEntries(models.map((m) => [m.id, m.supports_tools ? '✅' : '❌'])),
                    },
                    {
                      key: '4',
                      feature: '视觉能力',
                      ...Object.fromEntries(models.map((m) => [m.id, m.supports_vision ? '✅' : '❌'])),
                    },
                  ]}
                  pagination={false}
                  bordered
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="模型详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedModel && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="模型ID">{selectedModel.id}</Descriptions.Item>
            <Descriptions.Item label="模型名称">{selectedModel.model_name}</Descriptions.Item>
            <Descriptions.Item label="提供商">{selectedModel.provider}</Descriptions.Item>
            <Descriptions.Item label="上下文窗口">
              {selectedModel.context_window ? `${(selectedModel.context_window / 1000).toFixed(0)}K Tokens` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="最大输出">{selectedModel.max_tokens} Tokens</Descriptions.Item>
            <Descriptions.Item label="温度">{selectedModel.temperature}</Descriptions.Item>
            <Descriptions.Item label="工具调用">
              {selectedModel.supports_tools ? '✅ 支持' : '❌ 不支持'}
            </Descriptions.Item>
            <Descriptions.Item label="视觉能力">
              {selectedModel.supports_vision ? '✅ 支持' : '❌ 不支持'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default Models;
