import {
  ApiOutlined,
  BugOutlined,
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
  module?: string;
  name?: string;
  rating?: string;
  timestamp: number;
  extra?: Record<string, string | number>;
  totalLoadTime?: number;
  totalTransferSize?: number;
  chunkCount?: number;
  jsCount?: number;
  cssCount?: number;
  largestChunk?: { name: string; size: number; duration: number } | null;
}

interface PageSummary {
  path: string;
  pageName: string;
  visits: number;
  avgRenderMs: number;
  minRenderMs: number;
  maxRenderMs: number;
  avgLCP: number;
  avgINP: number;
  avgCLS: number;
  latestLCP: number;
  latestINP: number;
  latestCLS: number;
  lastVisit: number;
}

const RENDER_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];

interface BackendBundleSummary {
  totalLoadTime: number;
  avgLoadTime: number;
  minLoadTime: number;
  maxLoadTime: number;
  totalTransferSize: number;
  avgTransferSize: number;
  totalChunks: number;
  totalJSChunks: number;
  totalCSSChunks: number;
  avgChunkCount: number;
  slowBundleCount: number;
  reportCount: number;
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
  const [bundleSummary, setBundleSummary] = useState<BackendBundleSummary | null>(null);
  const [backendItems, setBackendItems] = useState<BackendItem[]>([]);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const pageChartRef = useRef<HTMLDivElement>(null);
  const pageChartInstance = useRef<echarts.ECharts | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [histRes, bundleRes] = await Promise.all([
        http
          .get<BackendItem[]>('/api/monitor/history')
          .catch(() => ({ data: [] as BackendItem[] })),
        http.get<BackendBundleSummary>('/api/monitor/bundle/summary').catch(() => null),
      ]);
      setBackendItems(histRes.data);
      if (bundleRes?.data) {
        setBundleSummary(bundleRes.data);
      }
    } catch {
      // endpoints may not be available
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [fetchData]);

  const fetchPages = useCallback(async () => {
    try {
      const pRes = await http.get<PageSummary[]>('/api/vitals/pages');
      setPages(pRes.data);
    } catch {
      // pages endpoint may not be available
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPages();
    const timer = setInterval(fetchPages, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [fetchPages]);

  useEffect(() => {
    if (!pageChartRef.current || pages.length === 0) return;

    pageChartInstance.current ??= echarts.init(pageChartRef.current, undefined, {
      renderer: 'canvas',
    });

    const sorted = [...pages].sort((a, b) => b.avgRenderMs - a.avgRenderMs);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const ps = params as { name: string; value: number; marker: string }[];
          if (!ps.length) return '';
          const page = sorted.find((p) => p.pageName === ps[0].name);
          if (!page) return '';
          return [
            `<b>${page.pageName}</b>`,
            `路径: ${page.path}`,
            `访问: ${String(page.visits)} 次`,
            `渲染: ${String(page.avgRenderMs)}ms`,
            `LCP: ${String(Math.round(page.latestLCP))}ms`,
            `INP: ${String(Math.round(page.latestINP))}ms`,
            `CLS: ${page.latestCLS.toFixed(3)}`,
          ].join('<br/>');
        },
      },
      grid: { left: 100, right: 20, top: 10, bottom: 30 },
      xAxis: {
        type: 'value',
        name: '渲染耗时 (ms)',
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((p) => p.pageName),
        axisLabel: { fontSize: 11 },
        inverse: true,
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((p, i) => ({
            value: p.avgRenderMs,
            itemStyle: { color: RENDER_COLORS[i % RENDER_COLORS.length] },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right',
            formatter: (p: unknown) => {
              const pp = p as { value: number };
              return `${String(pp.value)}ms`;
            },
            fontSize: 11,
          },
        },
      ],
    };

    pageChartInstance.current.setOption(option, true);

    const resize = () => pageChartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [pages]);

  const backendEvents = backendItems.map((item, i) => ({
    key: `be-${i}`,
    type: item.type,
    message: item.message || item.action || item.label || '',
    url: item.url,
    source: item.url,
    method: item.method,
    status: item.status,
    duration: item.duration,
    timestamp: item.timestamp,
    name: item.name,
    rating: item.rating,
    value: item.value,
    module: item.module,
    reason: item.reason,
    fallback: item.fallback,
    line: undefined as number | undefined,
    col: undefined as number | undefined,
    totalLoadTime: item.totalLoadTime,
    totalTransferSize: item.totalTransferSize,
    chunkCount: item.chunkCount,
    jsCount: item.jsCount,
    cssCount: item.cssCount,
    largestChunk: item.largestChunk,
  }));

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
    ...backendEvents.filter((e) =>
      [
        'stat',
        'error',
        'api_error',
        'slow_api',
        'performance',
        'degradation',
        'js_error',
        'promise_error',
        'resource_error',
        'api_call',
        'business_error',
        'bundle',
      ].includes(e.type),
    ),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  const backendErrors = backendEvents.filter((e) =>
    ['error', 'js_error', 'promise_error', 'resource_error', 'business_error'].includes(e.type),
  );
  const backendApis = backendEvents.filter((e) =>
    ['api_error', 'slow_api', 'api_call'].includes(e.type),
  );
  const backendPerfs = backendEvents.filter((e) => e.type === 'performance');
  const backendDegs = backendEvents.filter((e) => e.type === 'degradation');
  const backendBundleItems = backendEvents.filter((e) => e.type === 'bundle');

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
        'line' in r && r.line ? `${r.line}:${r.col ?? ''}` : '-',
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

  const bundleChunkRows = store.bundleReports.flatMap((r) =>
    (r.chunks ?? []).map((c) => ({
      key: `chunk-${r.timestamp}-${c.name}`,
      name: c.name,
      type: c.type,
      duration: c.duration,
      transferSize: c.transferSize,
      pageTime: r.timestamp,
    })),
  );
  const backendBundleRows = backendBundleItems.flatMap((r) => {
    const chunks =
      (
        r as never as {
          chunks?: { name: string; type: string; duration: number; transferSize: number }[];
        }
      ).chunks ?? [];
    return chunks.map((c) => ({
      key: `bchunk-${r.timestamp}-${c.name}`,
      name: c.name,
      type: c.type,
      duration: c.duration,
      transferSize: c.transferSize,
      pageTime: r.timestamp,
    }));
  });
  const displayBundleRows = bundleChunkRows.length > 0 ? bundleChunkRows : backendBundleRows;

  const bundleColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'script' ? '#1677ff' : '#52c41a'}>{v === 'script' ? 'JS' : 'CSS'}</Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (v: number) => <Text type={v > 500 ? 'danger' : undefined}>{v.toFixed(0)}ms</Text>,
    },
    {
      title: '大小',
      dataIndex: 'transferSize',
      key: 'transferSize',
      width: 120,
      render: (v: number) => {
        const kb = v / 1024;
        return <Text>{kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`}</Text>;
      },
    },
    {
      title: '时间',
      dataIndex: 'pageTime',
      key: 'pageTime',
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

      {error && <Text type="danger">{error}</Text>}

      <Card
        size="small"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchPages} loading={pageLoading}>
            刷新
          </Button>
        }
        title="页面渲染耗时排行"
      >
        <div ref={pageChartRef} style={{ height: Math.max(200, pages.length * 40 + 40) }} />
        {pages.length === 0 && !pageLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无页面访问记录 —— 浏览其他页面后会自动采集
          </div>
        )}
      </Card>

      {bundleSummary && bundleSummary.reportCount > 0 && (
        <Row gutter={[12, 12]}>
          <Col span={24}>
            <Card size="small" title="Bundle 加载">
              <Row gutter={[8, 8]}>
                <Col span={4}>
                  <Statistic title="上报次数" value={bundleSummary.reportCount} suffix="次" />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="平均加载耗时"
                    value={bundleSummary.avgLoadTime}
                    suffix="ms"
                    precision={0}
                    valueStyle={{ color: bundleSummary.avgLoadTime > 2000 ? '#ff4d4f' : '#52c41a' }}
                  />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="总传输大小"
                    value={bundleSummary.totalTransferSize}
                    suffix="B"
                    precision={0}
                  />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="Chunk 数 (JS/CSS)"
                    value={`${bundleSummary.totalJSChunks} / ${bundleSummary.totalCSSChunks}`}
                  />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="慢加载 (>3s)"
                    value={bundleSummary.slowBundleCount}
                    valueStyle={{
                      color: bundleSummary.slowBundleCount > 0 ? '#ff4d4f' : undefined,
                    }}
                    suffix="次"
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      <Collapse
        defaultActiveKey={[]}
        style={{ '--ant-collapse-header-align': 'center' as string } as React.CSSProperties}
        items={[
          {
            key: 'events',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text strong>实时事件流</Text>
              </span>
            ),
            extra: <Badge count={allEvents.length} size="small" />,
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
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text strong>JS 错误</Text>
              </span>
            ),
            extra: <Badge count={store.errors.length + backendErrors.length} size="small" />,
            children: (
              <Table
                dataSource={(store.errors.length > 0 ? store.errors : backendErrors) as never}
                columns={errorColumns}
                rowKey={(r) =>
                  `err-${(r as never as { timestamp: number; message: string }).timestamp}`
                }
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无错误" /> }}
              />
            ),
          },
          {
            key: 'api',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text strong>API 性能</Text>
              </span>
            ),
            extra: <Badge count={store.apiReports.length + backendApis.length} size="small" />,
            children: (
              <Table
                dataSource={(store.apiReports.length > 0 ? store.apiReports : backendApis) as never}
                columns={apiColumns}
                rowKey={(r) =>
                  `api-${(r as never as { timestamp: number; url: string }).timestamp}`
                }
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无 API 记录" /> }}
              />
            ),
          },
          {
            key: 'perf',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text strong>性能指标</Text>
              </span>
            ),
            extra: (
              <Badge count={store.performanceReports.length + backendPerfs.length} size="small" />
            ),
            children: (
              <Table
                dataSource={
                  (store.performanceReports.length > 0
                    ? store.performanceReports
                    : backendPerfs) as never
                }
                columns={perfColumns}
                rowKey={(r) =>
                  `perf-${(r as never as { timestamp: number; name: string }).timestamp}`
                }
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无性能数据" /> }}
              />
            ),
          },
          {
            key: 'bundle',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text strong>Bundle 加载</Text>
              </span>
            ),
            extra: <Badge count={displayBundleRows.length} size="small" />,
            children: (
              <Table
                dataSource={displayBundleRows}
                columns={bundleColumns}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="暂无 Bundle 加载数据" /> }}
              />
            ),
          },
          {
            key: 'deg',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text strong>降级事件</Text>
              </span>
            ),
            extra: (
              <Badge count={store.degradationReports.length + backendDegs.length} size="small" />
            ),
            children: (
              <Table
                dataSource={
                  (store.degradationReports.length > 0
                    ? store.degradationReports
                    : backendDegs) as never
                }
                columns={degColumns}
                rowKey={(r) =>
                  `deg-${(r as never as { timestamp: number; module: string }).timestamp}`
                }
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
