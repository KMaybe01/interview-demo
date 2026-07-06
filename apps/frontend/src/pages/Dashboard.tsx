import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Typography } from 'antd';
import * as echarts from 'echarts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes';
import { http } from '../utils/fetchClient.ts';

const { Title } = Typography;

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

export default function Dashboard() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageChartRef = useRef<HTMLDivElement>(null);
  const pageChartInstance = useRef<echarts.ECharts | null>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const pRes = await http.get<PageSummary[]>('/api/vitals/pages');
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
    if (!pageChartRef.current || pages.length === 0) return;

    pageChartInstance.current ??= echarts.init(pageChartRef.current, undefined, {
      renderer: 'canvas',
    });

    // 按渲染耗时从大到小排序
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

  return (
    <div>
      <Card>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          React 19 + Ant Design 6 + TypeScript + Zustand + React Router 7 + Bun + Go 1.26 + Gin 1.12
        </Title>
        <Row gutter={[16, 16]}>
          {routes
            .filter((r) => r.path !== '/')
            .map((r) => (
              <Col key={r.path} xs={24} sm={12} md={8} lg={6}>
                <Card hoverable onClick={() => navigate(r.path)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {<r.icon />}
                    <Title level={5} style={{ margin: 0 }}>
                      {r.name}
                    </Title>
                  </div>
                </Card>
              </Col>
            ))}
        </Row>
      </Card>

      <Card size="small" style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            marginTop: 16,
          }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
            页面渲染耗时排行
          </Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            刷新
          </Button>
        </div>

        <div ref={pageChartRef} style={{ height: Math.max(200, pages.length * 40 + 40) }} />
        {pages.length === 0 && !loading && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无页面访问记录 —— 浏览其他页面后会自动采集
          </div>
        )}
      </Card>
    </div>
  );
}
