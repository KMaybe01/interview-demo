import {
  ApiOutlined,
  BugOutlined,
  ClearOutlined,
  DashboardOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import * as echarts from 'echarts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMonitorStore } from '../stores';
import { http } from '../utils/fetchClient.ts';

const { Text } = Typography;

interface BackendItem {
  type: string;
  action?: string;
  category?: string;
  label?: string;
  value?: number;
  message?: string;
  url?: string;
  method?: string;
  duration?: number;
  status?: number;
  stack?: string;
  fallback?: string;
  reason?: string;
  timestamp: number;
  extra?: Record<string, string | number>;
}

const TYPE_COLORS: Record<string, string> = {
  stat: '#1677ff',
  error: '#ff4d4f',
  api_error: '#ff7a45',
  slow_api: '#faad14',
  performance: '#52c41a',
  degradation: '#eb2f96',
  js_error: '#ff4d4f',
  promise_error: '#ff7a45',
  resource_error: '#faad14',
  api_call: '#1677ff',
  business_error: '#722ed1',
};

export default function MonitorDashboard() {
  const store = useMonitorStore();
  const [_backendItems, setBackendItems] = useState<BackendItem[]>([]);
  const [backendSummary, setBackendSummary] = useState<{
    total: number;
    errors: number;
    apis: number;
    perfs: number;
    byType: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trendChartRef = useRef<HTMLDivElement>(null);
  const trendChartInstance = useRef<echarts.ECharts | null>(null);

  const fetchBackend = useCallback(async () => {
    setError(null);
    try {
      const [histRes, summRes] = await Promise.all([
        http.get<BackendItem[]>('/api/monitor/history'),
        http.get<{
          total: number;
          errors: number;
          apis: number;
          perfs: number;
          byType: Record<string, number>;
        }>('/api/monitor/summary'),
      ]);
      setBackendItems(histRes.data);
      setBackendSummary(summRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBackend();
    const timer = setInterval(fetchBackend, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [fetchBackend]);

  useEffect(() => {
    if (!trendChartRef.current || !backendSummary) return;
    trendChartInstance.current ??= echarts.init(trendChartRef.current, undefined, {
      renderer: 'canvas',
    });

    const byType = backendSummary.byType || {};
    const keys = Object.keys(byType);

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: keys.map((k) => ({
            name: k,
            value: byType[k],
            itemStyle: { color: TYPE_COLORS[k] || '#999' },
          })),
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
        },
      ],
    };

    trendChartInstance.current.setOption(option, true);
    const resize = () => trendChartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [backendSummary]);

  const allEvents = [
    ...store.errors.map((e) => ({
      key: `err-${e.timestamp}-${Math.random()}`,
      type: e.type,
      message: e.message,
      url: e.source,
      timestamp: e.timestamp,
    })),
    ...store.apiReports.map((a) => ({
      key: `api-${a.timestamp}-${Math.random()}`,
      type: a.type,
      message: `${a.method} ${a.url} (${a.status} ${a.duration}ms)`,
      timestamp: a.timestamp,
    })),
    ...store.performanceReports.map((p) => ({
      key: `perf-${p.timestamp}-${Math.random()}`,
      type: 'performance',
      message: `${p.name}: ${p.value} (${p.rating})`,
      timestamp: p.timestamp,
    })),
    ...store.degradationReports.map((d) => ({
      key: `deg-${d.timestamp}-${Math.random()}`,
      type: d.type,
      message: `[${d.module}] ${d.reason} → ${d.fallback}`,
      timestamp: d.timestamp,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  const eventColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag color={TYPE_COLORS[t] || '#999'}>{t}</Tag>,
    },
    { title: '内容', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: number) => new Date(t).toLocaleTimeString(),
    },
  ];

  const errorColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag color={TYPE_COLORS[t] || '#ff4d4f'}>{t}</Tag>,
    },
    { title: '错误信息', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (v: string) => (v ? <Text code>{v}</Text> : '-'),
    },
    {
      title: '行/列',
      key: 'line',
      width: 100,
      render: (_: unknown, r: { line?: number; col?: number }) =>
        r.line ? `${r.line}:${r.col ?? ''}` : '-',
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: number) => new Date(t).toLocaleTimeString(),
    },
  ];

  const apiColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t: string) => <Tag color={TYPE_COLORS[t] || '#1677ff'}>{t}</Tag>,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (v: string) => <Tag>{v?.toUpperCase()}</Tag>,
    },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: number) => <Badge status={v < 400 ? 'success' : 'error'} text={v} />,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (v: number) => <Text type={v > 1000 ? 'danger' : undefined}>{v}ms</Text>,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: number) => new Date(t).toLocaleTimeString(),
    },
  ];

  const perfColumns = [
    {
      title: '指标',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '数值', dataIndex: 'value', key: 'value', width: 100, render: (v: number) => `${v}` },
    {
      title: '评级',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (v: string) => {
        const color = v === 'good' ? 'green' : v === 'needs-improvement' ? 'orange' : 'red';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '页面', dataIndex: 'url', key: 'url', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: number) => new Date(t).toLocaleTimeString(),
    },
  ];

  const degColumns = [
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 140,
      render: (v: string) => (
        <Tag color={v === 'network_timeout' ? 'red' : v === 'business_deny' ? 'orange' : 'gold'}>
          {v}
        </Tag>
      ),
    },
    { title: '降级方案', dataIndex: 'fallback', key: 'fallback', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: number) => new Date(t).toLocaleTimeString(),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="实时事件"
              value={store.totalEvents}
              prefix={<DashboardOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="JS 错误"
              value={store.errorCount}
              prefix={<BugOutlined />}
              valueStyle={{ color: store.errorCount > 0 ? '#ff4d4f' : undefined }}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="API 失败"
              value={store.apiFailCount}
              prefix={<ApiOutlined />}
              valueStyle={{ color: store.apiFailCount > 0 ? '#ff4d4f' : undefined }}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="慢 API"
              value={store.slowApiCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: store.slowApiCount > 0 ? '#faad14' : undefined }}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Card
            size="small"
            title="事件类型分布"
            extra={
              <Space>
                {backendSummary && <Text type="secondary">总计 {backendSummary.total} 条</Text>}
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={fetchBackend}
                  loading={loading}
                />
              </Space>
            }
          >
            <div ref={trendChartRef} style={{ height: 220 }} />
            {(!backendSummary || backendSummary.total === 0) && !loading && (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col span={16}>
          <Card
            size="small"
            title="服务端汇总"
            extra={
              <Button
                size="small"
                icon={<ClearOutlined />}
                onClick={() => {
                  store.clearAll();
                }}
              >
                清空本地
              </Button>
            }
          >
            {backendSummary ? (
              <Row gutter={[8, 8]}>
                <Col span={6}>
                  <Statistic title="总事件" value={backendSummary.total} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="错误"
                    value={backendSummary.errors}
                    valueStyle={{ color: backendSummary.errors > 0 ? '#ff4d4f' : undefined }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic title="API" value={backendSummary.apis} />
                </Col>
                <Col span={6}>
                  <Statistic title="性能" value={backendSummary.perfs} />
                </Col>
              </Row>
            ) : loading ? null : (
              <Empty description="暂无数据" />
            )}
            {error && <Text type="danger">{error}</Text>}
          </Card>
        </Col>
      </Row>

      <Collapse
        defaultActiveKey={['events', 'errors']}
        items={[
          {
            key: 'events',
            label: (
              <Space>
                <Badge count={allEvents.length} size="small" />
                <Text strong>实时事件流</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={allEvents}
                columns={eventColumns}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无事件，浏览页面触发 SDK 上报" /> }}
              />
            ),
          },
          {
            key: 'errors',
            label: (
              <Space>
                <Badge count={store.errors.length} size="small" />
                <Text strong>JS 错误</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={store.errors}
                columns={errorColumns}
                rowKey={(r) => `err-${r.timestamp}-${r.message}`}
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无错误" /> }}
              />
            ),
          },
          {
            key: 'api',
            label: (
              <Space>
                <Badge count={store.apiReports.length} size="small" />
                <Text strong>API 性能</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={store.apiReports}
                columns={apiColumns}
                rowKey={(r) => `api-${r.timestamp}-${r.url}`}
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无 API 记录" /> }}
              />
            ),
          },
          {
            key: 'perf',
            label: (
              <Space>
                <Badge count={store.performanceReports.length} size="small" />
                <Text strong>性能指标</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={store.performanceReports}
                columns={perfColumns}
                rowKey={(r) => `perf-${r.timestamp}-${r.name}`}
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无性能数据" /> }}
              />
            ),
          },
          {
            key: 'deg',
            label: (
              <Space>
                <Badge count={store.degradationReports.length} size="small" />
                <Text strong>降级事件</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={store.degradationReports}
                columns={degColumns}
                rowKey={(r) => `deg-${r.timestamp}-${r.module}`}
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无降级事件" /> }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
