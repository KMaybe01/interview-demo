import { ApiOutlined, SendOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { a2aAPI, mcpAPI } from '../services/aiApi.ts';
import type {
  A2AAgentCard,
  A2AAgentSummary,
  A2ATask,
  MCPCallResult,
  MCPDiscoverResult,
  MCPToolSchema,
} from '../types/ai.ts';

const { Text, Paragraph } = Typography;

const STATUS_COLOR: Record<string, string> = {
  submitted: 'blue',
  working: 'processing',
  'input-required': 'orange',
  completed: 'green',
  failed: 'red',
  canceled: 'default',
};

/** 安全地把用户输入的字符串解析成工具参数对象 */
function parseArguments(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error('参数必须是 JSON 对象');
  } catch (error) {
    throw new Error(`参数 JSON 解析失败：${(error as Error).message}`);
  }
}

// ------------------------------------------------------------------ MCP

function McpPanel() {
  const { token } = theme.useToken();
  const message = useMessageApi();

  const [discover, setDiscover] = useState<MCPDiscoverResult | null>(null);
  const [tools, setTools] = useState<MCPToolSchema[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [argsText, setArgsText] = useState('{}');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [result, setResult] = useState<MCPCallResult | null>(null);
  const [calling, setCalling] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([mcpAPI.discover(), mcpAPI.listTools()]);
      setDiscover(d);
      setTools(t.tools ?? []);
      if (!selected && t.tools?.length) {
        setSelected(t.tools[0].name);
      }
    } catch (error) {
      message.error((error as Error).message || '加载 MCP 能力失败');
    }
  }, [message, selected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const callTool = useCallback(async () => {
    if (!selected) return;
    setCalling(true);
    try {
      const args = parseArguments(argsText);
      const res = await mcpAPI.callTool(selected, args, idempotencyKey.trim() || undefined);
      setResult(res);
      if (res.resultType === 'input_required') {
        message.info('工具需要补充输入（MRTR），请按提示重发');
      } else if (res.isError) {
        message.error('工具返回错误结果');
      } else {
        message.success('调用成功');
      }
    } catch (error) {
      message.error((error as Error).message || '调用失败');
    } finally {
      setCalling(false);
    }
  }, [argsText, idempotencyKey, message, selected]);

  const selectedSchema = useMemo(() => tools.find((t) => t.name === selected), [tools, selected]);

  return (
    <Row gutter={12}>
      <Col span={9}>
        <Card size="small" title="能力发现（server/discover）">
          {discover ? (
            <Descriptions
              size="small"
              column={1}
              items={[
                {
                  key: 'v',
                  label: '协议版本',
                  children: <Tag color="blue">{discover.protocolVersion}</Tag>,
                },
                {
                  key: 's',
                  label: '服务端',
                  children: `${discover.serverInfo.name} v${discover.serverInfo.version}`,
                },
                {
                  key: 'm',
                  label: '方法',
                  children: (
                    <Space size={[4, 4]} wrap>
                      {discover.methods.map((m) => (
                        <Tag key={m}>{m}</Tag>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
          ) : (
            <Empty />
          )}
          {discover?.warning && (
            <Alert type="warning" showIcon style={{ marginTop: 8 }} message={discover.warning} />
          )}
          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
            2026-07-28 起 MCP 为<Text strong>无状态</Text>：没有 initialize 握手、不返回
            Mcp-Session-Id， 每个请求通过 MCP-Protocol-Version / Mcp-Method / Mcp-Name
            三个头自描述。
          </Paragraph>
        </Card>

        <Card size="small" title="工具列表" style={{ marginTop: 12 }}>
          <Table
            size="small"
            rowKey="name"
            dataSource={tools}
            pagination={false}
            scroll={{ y: 260 }}
            onRow={(row) => ({
              onClick: () => {
                setSelected(row.name);
                setResult(null);
              },
              style: {
                cursor: 'pointer',
                background: row.name === selected ? token.colorPrimaryBg : undefined,
              },
            })}
            columns={[
              {
                title: '工具',
                dataIndex: 'name',
                key: 'name',
                render: (v: string) => <Text strong>{v}</Text>,
              },
              {
                title: '说明',
                dataIndex: 'description',
                key: 'description',
                ellipsis: true,
              },
            ]}
          />
        </Card>
      </Col>

      <Col span={15}>
        <Card size="small" title={`调用工具：${selected || '未选择'}`}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">参数（JSON 对象）</Text>
              <Input.TextArea
                rows={5}
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            {selectedSchema && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                schema：{JSON.stringify(selectedSchema.inputSchema)}
              </Text>
            )}
            <Flex gap={8} align="center">
              <Input
                placeholder="幂等键（副作用工具必填）"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                style={{ width: 260 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={calling}
                onClick={() => void callTool()}
                disabled={!selected}
              >
                调用
              </Button>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12 }}>
              相同幂等键的重复调用会被服务端回放首次结果，不会重复执行副作用（MRTR 的硬性要求）。
            </Text>
          </Space>
        </Card>

        {result && (
          <Card size="small" title="调用结果" style={{ marginTop: 12 }}>
            {result.resultType === 'input_required' ? (
              <Alert
                type="warning"
                showIcon
                message="工具返回 input_required（MRTR）"
                description={
                  <div>
                    <div>requestState：{result.requestState}</div>
                    <pre style={{ margin: 0 }}>{JSON.stringify(result.inputRequests, null, 2)}</pre>
                  </div>
                }
              />
            ) : (
              <pre
                style={{
                  background: token.colorFillQuaternary,
                  padding: 12,
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  color: result.isError ? token.colorError : undefined,
                }}
              >
                {result.content.map((c) => c.text ?? '').join('\n')}
              </pre>
            )}
          </Card>
        )}
      </Col>
    </Row>
  );
}

// ------------------------------------------------------------------ A2A

function A2APanel() {
  const { token } = theme.useToken();
  const message = useMessageApi();

  const [agents, setAgents] = useState<A2AAgentSummary[]>([]);
  const [card, setCard] = useState<A2AAgentCard | null>(null);
  const [agentId, setAgentId] = useState('');
  const [text, setText] = useState('');
  const [task, setTask] = useState<A2ATask | null>(null);
  const [tasks, setTasks] = useState<A2ATask[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, recent] = await Promise.all([a2aAPI.agents(), a2aAPI.tasks({ limit: 20 })]);
      setAgents(list.agents ?? []);
      setTasks(recent.tasks ?? []);
      const first = list.agents?.[0]?.id ?? '';
      if (!agentId && first) setAgentId(first);
    } catch (error) {
      message.error((error as Error).message || '加载 A2A Agent 失败');
    }
  }, [agentId, message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!agentId) return;
    void (async () => {
      try {
        setCard(await a2aAPI.card(agentId));
      } catch {
        setCard(null);
      }
    })();
  }, [agentId]);

  const send = useCallback(async () => {
    if (!agentId || !text.trim()) return;
    setBusy(true);
    try {
      const created = await a2aAPI.sendText(agentId, text.trim());
      setTask(created);
      // input-required 时可带同一 taskId 继续
      setTasks(await (await a2aAPI.tasks({ limit: 20 })).tasks);
      message.success(`任务 ${created.status}`);
    } catch (error) {
      message.error((error as Error).message || '发送失败');
    } finally {
      setBusy(false);
    }
  }, [agentId, message, text]);

  const cancel = useCallback(
    async (taskId: string) => {
      try {
        setTask(await a2aAPI.cancel(taskId));
        message.success('任务已取消');
      } catch (error) {
        message.error((error as Error).message || '取消失败');
      }
    },
    [message],
  );

  return (
    <Row gutter={12}>
      <Col span={9}>
        <Card size="small" title="Agent Card（能力名片）">
          {card ? (
            <Descriptions
              size="small"
              column={1}
              items={[
                { key: 'id', label: 'ID', children: card.id },
                { key: 'n', label: '名称', children: card.name },
                { key: 'v', label: '版本', children: card.version ?? '—' },
                {
                  key: 'c',
                  label: '能力',
                  children: (
                    <Space size={[4, 4]} wrap>
                      <Tag color={card.capabilities.streaming ? 'green' : 'default'}>streaming</Tag>
                      <Tag color={card.capabilities.stateTransitionHistory ? 'blue' : 'default'}>
                        history
                      </Tag>
                      {card.authentication?.schemes.map((s) => (
                        <Tag key={s}>{s}</Tag>
                      ))}
                    </Space>
                  ),
                },
                {
                  key: 's',
                  label: '技能',
                  children: (
                    <Space direction="vertical" size={2}>
                      {card.skills.map((s) => (
                        <div key={s.id}>
                          <Tag color="purple">{s.id}</Tag>
                          <Text style={{ fontSize: 12 }}>{s.description}</Text>
                        </div>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
          ) : (
            <Empty />
          )}
          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
            A2A 是 Agent ↔ Agent 的横向协作（类比 HTTP）；MCP 是 Agent ↔ 工具的纵向接入（类比
            USB-C）。两者互补，不是替代关系。
          </Paragraph>
        </Card>
      </Col>

      <Col span={15}>
        <Card size="small" title="message/send">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              style={{ width: 320 }}
              value={agentId || undefined}
              onChange={setAgentId}
              options={agents.map((a) => ({
                value: a.id,
                label: `${a.name}（${a.skills?.join(', ') || '无技能'}）`,
              }))}
              placeholder="选择 Agent"
            />
            <Input.TextArea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="发送给 Agent 的文本"
            />
            <Button
              type="primary"
              icon={<ApiOutlined />}
              loading={busy}
              onClick={() => void send()}
            >
              发送任务
            </Button>
          </Space>
        </Card>

        {task && (
          <Card
            size="small"
            title="最近任务"
            style={{ marginTop: 12 }}
            extra={
              !task.status.includes('completed') &&
              task.status !== 'failed' &&
              task.status !== 'canceled' ? (
                <Button danger size="small" onClick={() => void cancel(task.id)}>
                  取消
                </Button>
              ) : null
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Tag color={STATUS_COLOR[task.status]}>{task.status}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {task.id}
                </Text>
              </Space>
              {task.error && <Alert type="error" showIcon message={task.error} />}
              {task.metadata?.inputRequired !== undefined && (
                <Alert
                  type="warning"
                  showIcon
                  message={`需要补充输入：${String(task.metadata.inputRequired)}`}
                />
              )}
              {(task.artifacts ?? []).map((a) => (
                <div key={`${a.name}-${a.index}`}>
                  <Text strong>{a.name}</Text>
                  <pre
                    style={{
                      background: token.colorFillQuaternary,
                      padding: 8,
                      borderRadius: 6,
                      whiteSpace: 'pre-wrap',
                      margin: '4px 0 0',
                    }}
                  >
                    {a.parts
                      .map((p) =>
                        p.type === 'text'
                          ? p.text
                          : p.type === 'data'
                            ? JSON.stringify(p.data, null, 2)
                            : '',
                      )
                      .join('\n')}
                  </pre>
                </div>
              ))}
            </Space>
          </Card>
        )}

        <Card size="small" title="任务历史" style={{ marginTop: 12 }}>
          <Table
            size="small"
            rowKey="id"
            dataSource={tasks}
            pagination={{ pageSize: 6 }}
            columns={[
              { title: 'Agent', dataIndex: 'agentId', key: 'agentId', width: 140 },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
              },
              {
                title: '产物',
                key: 'artifacts',
                width: 70,
                render: (_: unknown, row: A2ATask) => row.artifacts?.length ?? 0,
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (v: string) => new Date(v).toLocaleString('zh-CN'),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}

export default function ProtocolConsole() {
  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <Typography.Title level={4}>协议控制台</Typography.Title>
      <Tabs
        items={[
          {
            key: 'mcp',
            label: 'MCP 2026-07-28',
            children: <McpPanel />,
          },
          {
            key: 'a2a',
            label: 'A2A v1.0',
            children: <A2APanel />,
          },
        ]}
      />
    </div>
  );
}
