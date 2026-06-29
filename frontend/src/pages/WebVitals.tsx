import { ReloadOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { Button, Card, Spin, Table, Tag, Typography } from 'antd';
import * as echarts from 'echarts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../utils/fetchClient.ts';

const { Title } = Typography;

interface MetricSummary {
  metric: string;
  value: number;
  rating: string;
  min: number;
  max: number;
  avg: number;
  count: number;
}

type HistoryData = Record<string, { t: number; v: number; rating: string }[]>;

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

const METRIC_LABELS: Record<string, string> = {
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  INP: 'Interaction to Next Paint',
  LCP: 'Largest Contentful Paint',
  TTFB: 'Time to First Byte',
};

const METRIC_UNITS: Record<string, string> = {
  CLS: '',
  FCP: 'ms',
  INP: 'ms',
  LCP: 'ms',
  TTFB: 'ms',
};

const METRIC_COLORS: Record<string, string> = {
  CLS: '#1677ff',
  FCP: '#52c41a',
  INP: '#faad14',
  LCP: '#722ed1',
  TTFB: '#eb2f96',
  domContentLoaded: '#1677ff',
  domComplete: '#52c41a',
  load: '#faad14',
};

const RENDER_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];

function lcpRating(v: number): string {
  return v <= 2500 ? 'green' : v <= 4000 ? 'orange' : 'red';
}
function inpRating(v: number): string {
  return v <= 200 ? 'green' : v <= 500 ? 'orange' : 'red';
}
function clsRating(v: number): string {
  return v <= 0.1 ? 'green' : v <= 0.25 ? 'orange' : 'red';
}

export default function WebVitals() {
  const [, setSummary] = useState<MetricSummary[]>([]);
  const [history, setHistory] = useState<HistoryData>({});
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const pageChartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const pageChartInstance = useRef<echarts.ECharts | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [sRes, hRes, pRes] = await Promise.all([
        http.get<MetricSummary[]>('/api/vitals/summary'),
        http.get<HistoryData>('/api/vitals/history'),
        http.get<PageSummary[]>('/api/vitals/pages'),
      ]);
      setSummary(sRes.data);
      setHistory(hRes.data);
      setPages(pRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!chartRef.current || Object.keys(history).length === 0) return;

    chartInstance.current ??= echarts.init(chartRef.current, undefined, { renderer: 'canvas' });

    const allMetrics = Object.keys(history).sort();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const ps = params as { seriesName: string; value: number[]; marker: string }[];
          if (!ps.length) return '';
          const t = new Date(ps[0].value[0]);
          const lines = ps.map(
            (p) =>
              `${p.marker} ${METRIC_LABELS[p.seriesName] ?? p.seriesName}: ${String(
                p.value[1],
              )} ${METRIC_UNITS[p.seriesName] ?? ''}`,
          );
          return `<div>${t.toLocaleTimeString()}</div>${lines.join('<br/>')}`;
        },
      },
      legend: {
        data: allMetrics.map((m) => ({ name: m, textStyle: { fontSize: 12 } })),
        top: 0,
      },
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'time', axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      series: allMetrics.map((metric) => ({
        name: metric,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: METRIC_COLORS[metric] ?? '#999' },
        itemStyle: { color: METRIC_COLORS[metric] ?? '#999' },
        data: history[metric].map((p) => [p.t, p.v]),
      })),
    };

    chartInstance.current.setOption(option, true);

    const resize = () => chartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [history]);

  useEffect(() => {
    if (!pageChartRef.current || pages.length === 0) return;

    pageChartInstance.current ??= echarts.init(pageChartRef.current, undefined, {
      renderer: 'canvas',
    });

    const sorted = [...pages].sort((a, b) => b.visits - a.visits);

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

  const pageColumns: TableColumnsType<PageSummary> = [
    { title: '页面', dataIndex: 'pageName', key: 'pageName', width: 140, fixed: 'left' },
    { title: '路径', dataIndex: 'path', key: 'path', width: 140 },
    {
      title: '访问',
      dataIndex: 'visits',
      key: 'visits',
      width: 70,
      sorter: (a, b) => b.visits - a.visits,
      defaultSortOrder: 'descend',
    },
    {
      title: '渲染 (ms)',
      dataIndex: 'avgRenderMs',
      key: 'avgRenderMs',
      width: 100,
      render: (v: number) => <Tag color={v < 50 ? 'green' : v < 200 ? 'orange' : 'red'}>{v}ms</Tag>,
      sorter: (a, b) => b.avgRenderMs - a.avgRenderMs,
    },
    {
      title: 'LCP < 2.5s',
      dataIndex: 'avgLCP',
      key: 'avgLCP',
      width: 110,
      render: (_: number, r: PageSummary) => (
        <Tag color={lcpRating(r.latestLCP)}>{Math.round(r.latestLCP)}</Tag>
      ),
      sorter: (a, b) => b.avgLCP - a.avgLCP,
    },
    {
      title: 'INP < 200ms',
      dataIndex: 'avgINP',
      key: 'avgINP',
      width: 110,
      render: (_: number, r: PageSummary) => (
        <Tag color={inpRating(r.latestINP)}>{Math.round(r.latestINP)}</Tag>
      ),
      sorter: (a, b) => b.avgINP - a.avgINP,
    },
    {
      title: 'CLS < 0.1',
      dataIndex: 'avgCLS',
      key: 'avgCLS',
      width: 90,
      render: (_: number, r: PageSummary) => (
        <Tag color={clsRating(r.latestCLS)}>{r.latestCLS.toFixed(3)}</Tag>
      ),
      sorter: (a, b) => b.avgCLS - a.avgCLS,
    },
    {
      title: '最后访问',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
      width: 130,
      render: (v: number) => new Date(v).toLocaleString(),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Web Vitals 性能指标 & 页面渲染监控
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          刷新
        </Button>
      </div>

      <Card size="small" style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          页面渲染耗时排行
        </Title>
        <div ref={pageChartRef} style={{ height: Math.max(200, pages.length * 40 + 40) }} />
        {pages.length === 0 && !loading && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无页面访问记录 —— 浏览其他页面后会自动采集
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#ff4d4f' }}>
            数据加载失败: {error}
          </div>
        )}
      </Card>

      <Card size="small" style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          页面访问明细
        </Title>
        {pages.length > 0 ? (
          <Table
            dataSource={pages}
            columns={pageColumns}
            rowKey="path"
            size="small"
            pagination={false}
            scroll={{ x: 780 }}
          />
        ) : (
          !loading && !error && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无页面访问记录</div>
          )
        )}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        )}
      </Card>

      <Card size="small" style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          Web Vitals 历史趋势
        </Title>
        <div ref={chartRef} style={{ height: 260 }} />
        {Object.keys(history).length === 0 && !loading && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无数据 —— 刷新页面或稍后自动采集
          </div>
        )}
      </Card>
    </div>
  );
}
