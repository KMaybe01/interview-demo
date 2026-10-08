import { ReloadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Flex,
  Modal,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { evalAPI, obsAPI, promptAPI } from '../services/aiApi.ts';
import type {
  AuditEvent,
  EvalDataset,
  EvalRunResult,
  MetricsResult,
  PromptTemplate,
  RunRecord,
  Trace,
} from '../types/ai.ts';

const { Text, Paragraph } = Typography;

const OUTCOME_COLOR: Record<string, string> = {
  success: 'green',
  failure: 'red',
  blocked_permission: 'orange',
  blocked_injection: 'volcano',
  blocked_rate_limit: 'gold',
};

const STATUS_COLOR: Record<string, string> = {
  ok: 'green',
  degraded: 'orange',
  error: 'red',
  canceled: 'default',
};

/** 无新增图表依赖的极简柱状趋势图：用 div 高度表达相对值 */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <Flex align="flex-end" gap={2} style={{ height: 64 }}>
      {values.map((v, i) => (
        <div
          key={`bar-${i}-${v}`}
          title={String(v)}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: 'var(--color-primary, #667eea)',
            borderRadius: 2,
            opacity: 0.35 + (v / max) * 0.65,
          }}
        />
      ))}
    </Flex>
  );
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ms(value: number): string {
  return `${Math.round(value)}ms`;
}

export default function Observability() {
  const { token } = theme.useToken();
  const message = useMessageApi();

  const [window, setWindow] = useState('24h');
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [traces, setTraces] = useState<Trace[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditSummary, setAuditSummary] = useState<Record<string, unknown>>({});
  const [datasets, setDatasets] = useState<EvalDataset[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvalRunResult[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [promptDetail, setPromptDetail] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, t, a, ds, er, p] = await Promise.all([
        obsAPI.metrics(window),
        obsAPI.runs(50),
        obsAPI.traces(20),
        obsAPI.audit(100),
        evalAPI.datasets(),
        evalAPI.runs(10),
        promptAPI.list(),
      ]);
      setMetrics(m);
      setRuns(r.runs ?? []);
      setCounters(r.counters ?? {});
      setTraces(t.traces ?? []);
      setAudit(a.events ?? []);
      setAuditSummary(a.summary ?? {});
      setDatasets(ds.datasets ?? []);
      setEvalRuns(er.runs ?? []);
      setPrompts(p.prompts ?? []);
    } catch (error) {
      message.error((error as Error).message || '加载可观测数据失败');
    } finally {
      setLoading(false);
    }
  }, [message, window]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runColumns = useMemo(
    () => [
      { title: '模型', dataIndex: 'model', key: 'model', width: 160 },
      {
        title: '类型',
        dataIndex: 'kind',
        key: 'kind',
        width: 90,
        render: (v: string) => <Tag>{v}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
      },
      { title: 'Tokens', dataIndex: 'totalTokens', key: 'totalTokens', width: 90 },
      {
        title: '成本',
        dataIndex: 'costUsd',
        key: 'costUsd',
        width: 100,
        render: (v: number) => `$${v.toFixed(6)}`,
      },
      {
        title: '耗时',
        dataIndex: 'latencyMs',
        key: 'latencyMs',
        width: 90,
        render: (v: number) => ms(v),
      },
      {
        title: 'TTFT',
        dataIndex: 'ttftMs',
        key: 'ttftMs',
        width: 80,
        render: (v: number) => (v ? ms(v) : '—'),
      },
      { title: '步骤', dataIndex: 'steps', key: 'steps', width: 70 },
      { title: '工具', dataIndex: 'toolCalls', key: 'toolCalls', width: 70 },
      {
        title: 'Trace',
        dataIndex: 'traceId',
        key: 'traceId',
        render: (v: string) => (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {v.slice(0, 8)}…
          </Text>
        ),
      },
    ],
    [],
  );

  const auditColumns = useMemo(
    () => [
      { title: '工具', dataIndex: 'tool', key: 'tool', width: 160 },
      {
        title: '结果',
        dataIndex: 'outcome',
        key: 'outcome',
        width: 160,
        render: (v: string) => <Tag color={OUTCOME_COLOR[v] ?? 'default'}>{v}</Tag>,
      },
      {
        title: '耗时',
        dataIndex: 'durationMs',
        key: 'durationMs',
        width: 90,
        render: (v: number) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}ms` : `${v}ns`),
      },
      { title: '说明', dataIndex: 'detail', key: 'detail', ellipsis: true },
    ],
    [],
  );

  const groupColumns = useMemo(
    () => [
      { title: '分组', dataIndex: 'key', key: 'key' },
      { title: '请求数', dataIndex: 'requests', key: 'requests', width: 90 },
      { title: 'Tokens', dataIndex: 'tokens', key: 'tokens', width: 100 },
      {
        title: '成本',
        dataIndex: 'costUsd',
        key: 'costUsd',
        width: 110,
        render: (v: number) => `$${v.toFixed(6)}`,
      },
      { title: '错误', dataIndex: 'errors', key: 'errors', width: 80 },
      {
        title: '平均耗时',
        dataIndex: 'avgLatencyMs',
        key: 'avgLatencyMs',
        width: 110,
        render: (v: number) => ms(v),
      },
    ],
    [],
  );

  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>
            LLMOps 可观测
          </Typography.Title>
          <Text type="secondary">
            AI 侧指标：延迟分位、Token、成本、工具审计、评测与 Prompt 版本
          </Text>
        </Space>
        <Space>
          <Segmented
            value={window}
            onChange={(v) => setWindow(String(v))}
            options={[
              { label: '1h', value: '1h' },
              { label: '6h', value: '6h' },
              { label: '24h', value: '24h' },
              { label: '7d', value: '7d' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void refresh()} loading={loading}>
            刷新
          </Button>
        </Space>
      </Flex>

      {metrics && metrics.requests === 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="当前窗口内还没有 AI 调用记录。去「AI 聊天」发一条消息，这里就会实时出现指标。"
        />
      )}

      <Row gutter={[12, 12]}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="请求数" value={metrics?.requests ?? 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="错误率"
              value={metrics ? metrics.errorRate * 100 : 0}
              precision={1}
              suffix="%"
              valueStyle={{
                color: (metrics?.errorRate ?? 0) > 0.05 ? token.colorError : undefined,
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="降级率"
              value={metrics ? metrics.degradedRate * 100 : 0}
              precision={1}
              suffix="%"
              valueStyle={{
                color: (metrics?.degradedRate ?? 0) > 0 ? token.colorWarning : undefined,
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Tokens" value={metrics?.tokens ?? 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="成本 (USD)" value={metrics?.costUsd ?? 0} precision={4} prefix="$" />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="缓存命中率"
              value={metrics ? metrics.cacheHitRate * 100 : 0}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={8}>
          <Card size="small" title="延迟分位">
            {metrics ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Flex justify="space-between">
                  <Text type="secondary">P50</Text>
                  <Text>{ms(metrics.latency.p50)}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">P95</Text>
                  <Text>{ms(metrics.latency.p95)}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">P99</Text>
                  <Text>{ms(metrics.latency.p99)}</Text>
                </Flex>
                <Divider style={{ margin: '8px 0' }} />
                <Flex justify="space-between">
                  <Text type="secondary">TTFT P95</Text>
                  <Text>{ms(metrics.ttft.p95)}</Text>
                </Flex>
              </Space>
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="请求趋势">
            {metrics && metrics.timeline.length > 0 ? (
              <div>
                <MiniBars values={metrics.timeline.map((b) => b.requests)} />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  共 {metrics.timeline.length} 个桶，峰值{' '}
                  {Math.max(...metrics.timeline.map((b) => b.requests))} req
                </Text>
              </div>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="累计计数">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Flex justify="space-between">
                <Text type="secondary">总请求</Text>
                <Text>{counters.requests ?? 0}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text type="secondary">总 Token</Text>
                <Text>{counters.tokens ?? 0}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text type="secondary">错误</Text>
                <Text>{counters.errors ?? 0}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text type="secondary">降级</Text>
                <Text>{counters.degraded ?? 0}</Text>
              </Flex>
            </Space>
          </Card>
        </Col>
      </Row>

      <Tabs
        style={{ marginTop: 12 }}
        items={[
          {
            key: 'runs',
            label: '运行记录',
            children: (
              <Table
                size="small"
                rowKey="id"
                columns={runColumns}
                dataSource={runs}
                scroll={{ x: 900 }}
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'models',
            label: '模型分布',
            children: (
              <Row gutter={12}>
                <Col span={12}>
                  <Card size="small" title="按模型">
                    <Table
                      size="small"
                      rowKey="key"
                      columns={groupColumns}
                      dataSource={metrics?.byModel ?? []}
                      pagination={false}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="按 Provider">
                    <Table
                      size="small"
                      rowKey="key"
                      columns={groupColumns}
                      dataSource={metrics?.byProvider ?? []}
                      pagination={false}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'traces',
            label: `链路 (${traces.length})`,
            children: (
              <Table
                size="small"
                rowKey="traceId"
                dataSource={traces}
                pagination={{ pageSize: 8 }}
                columns={[
                  { title: '名称', dataIndex: 'name', key: 'name' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    width: 90,
                    render: (v: string) => <Tag color={v === 'error' ? 'red' : 'green'}>{v}</Tag>,
                  },
                  {
                    title: 'Span 数',
                    key: 'spans',
                    width: 90,
                    render: (_: unknown, row: Trace) => row.spans?.length ?? 0,
                  },
                  {
                    title: '耗时',
                    dataIndex: 'durationMs',
                    key: 'durationMs',
                    width: 100,
                    render: (v: number) =>
                      v >= 1_000_000 ? `${Math.round(v / 1_000_000)}ms` : `${v}ns`,
                  },
                ]}
                expandable={{
                  expandedRowRender: (row: Trace) => (
                    <Table
                      size="small"
                      rowKey="spanId"
                      dataSource={row.spans ?? []}
                      pagination={false}
                      columns={[
                        { title: 'Span', dataIndex: 'name', key: 'name' },
                        {
                          title: '类型',
                          dataIndex: 'kind',
                          key: 'kind',
                          width: 100,
                          render: (v: string) => <Tag>{v}</Tag>,
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          width: 80,
                          render: (v: string) => (
                            <Tag color={v === 'error' ? 'red' : 'green'}>{v}</Tag>
                          ),
                        },
                        {
                          title: '耗时',
                          dataIndex: 'durationMs',
                          key: 'durationMs',
                          width: 100,
                          render: (v: number) =>
                            v >= 1_000_000 ? `${Math.round(v / 1_000_000)}ms` : `${v}ns`,
                        },
                      ]}
                    />
                  ),
                }}
              />
            ),
          },
          {
            key: 'audit',
            label: `工具审计 (${audit.length})`,
            children: (
              <div>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic title="审计总数" value={Number(auditSummary.total ?? 0)} />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="成功平均耗时"
                        value={Number(auditSummary.avgSuccessMs ?? 0)}
                        suffix="ms"
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Space direction="vertical" size={4}>
                        <Text type="secondary">拦截分布</Text>
                        {Object.entries((auditSummary.counts ?? {}) as Record<string, number>).map(
                          ([k, v]) => (
                            <Flex key={k} justify="space-between">
                              <Text style={{ fontSize: 12 }}>{k}</Text>
                              <Text style={{ fontSize: 12 }}>{v}</Text>
                            </Flex>
                          ),
                        )}
                      </Space>
                    </Card>
                  </Col>
                </Row>
                <Table
                  size="small"
                  rowKey="id"
                  columns={auditColumns}
                  dataSource={audit}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
          {
            key: 'eval',
            label: '评测',
            children: (
              <div>
                <Paragraph type="secondary">
                  评测集 {datasets.length} 个，历史运行 {evalRuns.length} 次。指标为词典重合度代理
                  （忠实度 / 相关性 / 上下文精度），可在 CI 中作为回归门禁。
                </Paragraph>
                {evalRuns.length === 0 ? (
                  <Empty description="还没有评测运行记录" />
                ) : (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={evalRuns}
                    pagination={false}
                    columns={[
                      { title: '数据集', dataIndex: 'datasetName', key: 'datasetName' },
                      {
                        title: '通过率',
                        key: 'passRate',
                        width: 160,
                        render: (_: unknown, row: EvalRunResult) => (
                          <Progress
                            percent={Number((row.summary.passRate * 100).toFixed(1))}
                            size="small"
                            status={row.summary.passRate >= 0.8 ? 'success' : 'exception'}
                          />
                        ),
                      },
                      {
                        title: '忠实度',
                        key: 'faithfulness',
                        width: 100,
                        render: (_: unknown, row: EvalRunResult) =>
                          row.summary.avgFaithfulness.toFixed(3),
                      },
                      {
                        title: '相关性',
                        key: 'relevancy',
                        width: 100,
                        render: (_: unknown, row: EvalRunResult) =>
                          row.summary.avgRelevancy.toFixed(3),
                      },
                      {
                        title: '检索命中率',
                        key: 'hit',
                        width: 120,
                        render: (_: unknown, row: EvalRunResult) =>
                          pct(row.summary.retrievalHitRate),
                      },
                      {
                        title: '耗时',
                        dataIndex: 'durationMs',
                        key: 'durationMs',
                        width: 90,
                        render: (v: number) => ms(v),
                      },
                    ]}
                    expandable={{
                      expandedRowRender: (row: EvalRunResult) => (
                        <Table
                          size="small"
                          rowKey="caseId"
                          dataSource={row.cases}
                          pagination={false}
                          columns={[
                            { title: '问题', dataIndex: 'question', key: 'question' },
                            {
                              title: '结果',
                              key: 'passed',
                              width: 80,
                              render: (_: unknown, c: { passed: boolean }) => (
                                <Tag color={c.passed ? 'green' : 'red'}>
                                  {c.passed ? 'PASS' : 'FAIL'}
                                </Tag>
                              ),
                            },
                            {
                              title: '忠实度',
                              dataIndex: 'faithfulness',
                              key: 'faithfulness',
                              width: 90,
                              render: (v: number) => v.toFixed(3),
                            },
                            {
                              title: '告警',
                              dataIndex: 'warnings',
                              key: 'warnings',
                              render: (v: string[] | undefined) =>
                                v?.length ? <Text type="warning">{v.join('；')}</Text> : '—',
                            },
                          ]}
                        />
                      ),
                    }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'prompts',
            label: `Prompt (${prompts.length})`,
            children: (
              <div>
                <Paragraph type="secondary">
                  提示词带版本号，可一键回滚；聊天链路会渲染当前激活版本。
                </Paragraph>
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={prompts}
                  pagination={false}
                  columns={[
                    { title: '名称', dataIndex: 'name', key: 'name', width: 180 },
                    {
                      title: '版本',
                      dataIndex: 'version',
                      key: 'version',
                      width: 80,
                      render: (v: number) => <Tag color="blue">v{v}</Tag>,
                    },
                    {
                      title: '变量',
                      dataIndex: 'variables',
                      key: 'variables',
                      width: 200,
                      render: (v: string[]) => v.map((x) => <Tag key={x}>{x}</Tag>),
                    },
                    { title: '说明', dataIndex: 'comment', key: 'comment', ellipsis: true },
                    {
                      title: '操作',
                      key: 'action',
                      width: 120,
                      render: (_: unknown, row: PromptTemplate) => (
                        <Button type="link" size="small" onClick={() => setPromptDetail(row)}>
                          查看内容
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={promptDetail !== null}
        title={promptDetail ? `${promptDetail.name} · v${promptDetail.version}` : ''}
        onCancel={() => setPromptDetail(null)}
        footer={null}
        width={720}
      >
        <pre
          style={{
            background: token.colorFillQuaternary,
            padding: 12,
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}
        >
          {promptDetail?.content}
        </pre>
      </Modal>
    </div>
  );
}
