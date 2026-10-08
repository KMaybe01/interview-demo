import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { aiAPI } from '../services/aiApi.ts';
import type { AIModel } from '../types/ai.ts';

const { Text } = Typography;

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'green',
  deepseek: 'blue',
  ollama: 'orange',
  gemini: 'purple',
  qwen: 'cyan',
  anthropic: 'magenta',
  offline: 'default',
};

/** 一次连接探测的结果 */
interface ProbeResult {
  modelId: string;
  ok: boolean;
  provider: string;
  degraded: boolean;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  preview: string;
  error?: string;
}

export default function Models() {
  const message = useMessageApi();

  const [models, setModels] = useState<AIModel[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AIModel | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiAPI.listModels();
      const list = res.models ?? [];
      setModels(list);
      setProviders(res.providers ?? []);
      setSelected((prev) => prev ?? list[0] ?? null);
    } catch (error) {
      message.error((error as Error).message || '加载模型列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableCount = useMemo(() => models.filter((m) => m.available).length, [models]);

  const probeModel = useCallback(
    async (modelId: string) => {
      setProbing(true);
      const started = performance.now();
      try {
        const res = await aiAPI.chat({
          model: modelId,
          messages: [{ role: 'user', content: '你好' }],
        });
        setProbe({
          modelId,
          ok: true,
          provider: res.provider,
          degraded: res.degraded,
          latencyMs: Math.round(performance.now() - started),
          tokens: res.usage.totalTokens,
          costUsd: res.costUsd,
          preview: res.content.slice(0, 120),
        });
        message.success(res.degraded ? '连通但已降级（无可用密钥）' : '连接测试成功');
      } catch (error) {
        setProbe({
          modelId,
          ok: false,
          provider: '-',
          degraded: false,
          latencyMs: Math.round(performance.now() - started),
          tokens: 0,
          costUsd: 0,
          preview: '',
          error: (error as Error).message,
        });
        message.error('连接测试失败');
      } finally {
        setProbing(false);
      }
    },
    [message],
  );

  const columns = useMemo(
    () => [
      {
        title: '模型 ID',
        dataIndex: 'id' as const,
        key: 'id',
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '名称',
        dataIndex: 'name' as const,
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: 'Provider',
        dataIndex: 'provider' as const,
        key: 'provider',
        render: (provider: string) => (
          <Tag color={PROVIDER_COLORS[provider] ?? 'default'}>{provider.toUpperCase()}</Tag>
        ),
      },
      {
        title: '上下文窗口',
        dataIndex: 'contextWindow' as const,
        key: 'contextWindow',
        render: (val: number) => (val > 0 ? `${Math.round(val / 1000)}K` : '-'),
      },
      {
        title: '最大输出',
        dataIndex: 'maxOutput' as const,
        key: 'maxOutput',
        render: (val: number) => (val > 0 ? `${Math.round(val / 1000)}K` : '-'),
      },
      {
        title: '能力',
        dataIndex: 'capabilities' as const,
        key: 'capabilities',
        render: (caps: string[]) => (
          <Space size={[4, 4]} wrap>
            {caps.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '状态',
        key: 'status',
        render: (_: unknown, record: AIModel) =>
          record.available ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              可用
            </Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              未配置
            </Tag>
          ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: AIModel) => (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelected(record);
                setDetailOpen(true);
              }}
            >
              详情
            </Button>
            <Tooltip title="用一条短消息探测该模型是否真实可用">
              <Button
                type="link"
                size="small"
                loading={probing}
                disabled={!record.available}
                onClick={() => void probeModel(record.id)}
              >
                测试
              </Button>
            </Tooltip>
          </Space>
        ),
      },
    ],
    [probeModel, probing],
  );

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
                  <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
                    刷新
                  </Button>
                }
              >
                <Alert
                  type={availableCount > 0 ? 'info' : 'warning'}
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={`已注册 ${models.length} 个模型（${providers.join(' / ') || '无 provider'}），其中 ${availableCount} 个已配置密钥。`}
                  description="未配置密钥的模型请求会走离线降级链，不会直接报错；请在 backend/.env 中配置对应 API Key 后重启生效。"
                />
                {probe && (
                  <Alert
                    type={probe.ok ? (probe.degraded ? 'warning' : 'success') : 'error'}
                    showIcon
                    style={{ marginBottom: 12 }}
                    message={`探测 ${probe.modelId}：${probe.ok ? (probe.degraded ? '已降级' : '成功') : '失败'}`}
                    description={
                      probe.error ? (
                        probe.error
                      ) : (
                        <span>
                          provider={probe.provider} · 耗时 {probe.latencyMs}ms · tokens{' '}
                          {probe.tokens} · 成本 ${probe.costUsd.toFixed(6)}
                          {probe.preview && <div style={{ marginTop: 4 }}>{probe.preview}</div>}
                        </span>
                      )
                    }
                  />
                )}
                <Table
                  columns={columns}
                  dataSource={models}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="模型详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {selected && (
          <Descriptions
            column={1}
            bordered
            items={[
              { key: 'id', label: '模型 ID', children: <Text code>{selected.id}</Text> },
              { key: 'name', label: '名称', children: selected.name },
              { key: 'provider', label: 'Provider', children: selected.provider },
              {
                key: 'ctx',
                label: '上下文窗口',
                children: `${Math.round(selected.contextWindow / 1000)}K tokens`,
              },
              {
                key: 'out',
                label: '最大输出',
                children: `${Math.round(selected.maxOutput / 1000)}K tokens`,
              },
              {
                key: 'caps',
                label: '能力',
                children: (
                  <Space size={[4, 4]} wrap>
                    {selected.capabilities.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </Space>
                ),
              },
              {
                key: 'status',
                label: '状态',
                children: selected.available ? (
                  <Tag color="success">可用</Tag>
                ) : (
                  <Tag color="error">未配置密钥</Tag>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
