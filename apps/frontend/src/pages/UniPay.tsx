import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  KeyOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Row,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

const { Text } = Typography;

type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAIL'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'CLOSED';

interface PaymentOrder {
  id: string;
  orderNo: string;
  channel: string;
  amount: number;
  status: PaymentStatus;
  idempotencyKey: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<PaymentStatus, { color: string; icon: React.ReactNode; label: string }> =
  {
    PENDING: { color: 'default', icon: <ShoppingCartOutlined />, label: '待支付' },
    PROCESSING: { color: 'processing', icon: <SyncOutlined spin />, label: '处理中' },
    SUCCESS: { color: 'success', icon: <CheckCircleOutlined />, label: '支付成功' },
    FAIL: { color: 'error', icon: <CloseCircleOutlined />, label: '支付失败' },
    REFUNDING: { color: 'warning', icon: <RollbackOutlined />, label: '退款中' },
    REFUNDED: { color: 'default', icon: <RollbackOutlined />, label: '已退款' },
    CLOSED: { color: 'default', icon: <StopOutlined />, label: '已关闭' },
  };

const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PROCESSING', 'CLOSED'],
  PROCESSING: ['SUCCESS', 'FAIL', 'CLOSED'],
  SUCCESS: ['REFUNDING'],
  REFUNDING: ['REFUNDED', 'FAIL'],
  REFUNDED: [],
  FAIL: ['PROCESSING'],
  CLOSED: [],
};

const STATUS_DRIVERS: Record<string, string> = {
  PAY_SUBMIT: '用户发起支付',
  CALLBACK: '渠道回调',
  TIMEOUT: '超时关闭',
  REFUND_REQ: '用户申请退款',
  REFUND_CB: '退款回调',
  RECONCILE: '对账确认',
};

function generateId(): string {
  return crypto.randomUUID();
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const meta = STATUS_META[status];
  return (
    <Tag icon={meta.icon} color={meta.color}>
      {meta.label}
    </Tag>
  );
}

const STATE_MACHINE_STEPS = [
  { title: 'PENDING', description: '订单已创建' },
  { title: 'PROCESSING', description: '已调起支付渠道' },
  { title: 'SUCCESS', description: '支付成功' },
  { title: 'REFUNDING', description: '退款处理中' },
  { title: 'REFUNDED', description: '退款成功' },
];

function StatusFlowDiagram({ currentStatus }: { currentStatus: PaymentStatus }) {
  const statusOrder: PaymentStatus[] = [
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'REFUNDING',
    'REFUNDED',
  ];
  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <div style={{ margin: '16px 0' }}>
      <Steps
        current={currentIdx >= 0 ? currentIdx : undefined}
        status={currentStatus === 'FAIL' || currentStatus === 'CLOSED' ? 'error' : 'process'}
        items={
          currentStatus === 'FAIL'
            ? [
                { title: 'PENDING', content: '订单已创建' },
                { title: 'PROCESSING', content: '已调起支付渠道' },
                { title: 'FAIL', content: '支付失败', status: 'error' },
              ]
            : currentStatus === 'CLOSED'
              ? [
                  { title: 'PENDING', content: '订单已创建' },
                  { title: 'CLOSED', content: '订单已关闭', status: 'error' },
                ]
              : STATE_MACHINE_STEPS
        }
      />
    </div>
  );
}

function TransitionMatrix() {
  const columns = [
    { title: '当前状态', dataIndex: 'from', key: 'from', width: 120 },
    { title: '可转换至', dataIndex: 'to', key: 'to' },
  ];

  const data = (Object.keys(TRANSITIONS) as PaymentStatus[]).map((from) => ({
    key: from,
    from: <StatusBadge status={from} />,
    to:
      TRANSITIONS[from].length > 0 ? (
        <Space>
          {TRANSITIONS[from].map((to) => (
            <StatusBadge key={to} status={to} />
          ))}
        </Space>
      ) : (
        <Text type="secondary">终态</Text>
      ),
  }));

  return <Table columns={columns} dataSource={data} pagination={false} size="small" bordered />;
}

function simulateBackendDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function UniPay() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const retryLogRef = useRef<{ msg: string; id: number }[]>([]);
  const logIdRef = useRef(0);
  const [retryLog, setRetryLog] = useState<{ msg: string; id: number }[]>([]);
  const [duplicateDetected, setDuplicateDetected] = useState(false);
  const [securityLog, setSecurityLog] = useState<string[]>([]);

  const idempotentCacheRef = useRef<Map<string, PaymentOrder>>(new Map());
  const retryLogBodyRef = useRef<HTMLDivElement>(null);
  const securityLogBodyRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const id = ++logIdRef.current;
    const entry = { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, id };
    retryLogRef.current = [...retryLogRef.current, entry];
    setRetryLog(retryLogRef.current);
  }, []);

  const addSecurityLog = useCallback((msg: string) => {
    setSecurityLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const scrollRetryLog = useCallback(() => {
    const el = retryLogBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const scrollSecurityLog = useCallback(() => {
    const el = securityLogBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollRetryLog();
  }, [scrollRetryLog]);

  useEffect(() => {
    scrollSecurityLog();
  }, [scrollSecurityLog]);

  const createOrder = useCallback(async () => {
    const order: PaymentOrder = {
      id: generateId(),
      orderNo: `ORD${String(Date.now())}`,
      channel: 'wechat',
      amount: Math.floor(Math.random() * 10000) + 100,
      status: 'PENDING',
      idempotencyKey: generateId(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => [order, ...prev]);
    setProcessingId(order.id);
    addLog(`📦 创建订单: ${order.orderNo}, 金额: ¥${(order.amount / 100).toFixed(2)}`);
    addLog(`🔑 生成 Idempotency-Key: ${order.idempotencyKey}`);

    await simulateBackendDelay(500);

    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'PROCESSING' } : o)));
    addLog(`🔄 订单 ${order.orderNo} → PROCESSING（调起支付渠道）`);

    await simulateBackendDelay(1500);

    const success = Math.random() > 0.3;
    if (success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id && o.status === 'PROCESSING' ? { ...o, status: 'SUCCESS' } : o,
        ),
      );
      addLog(`✅ 订单 ${order.orderNo} → SUCCESS（支付成功）`);
      addSecurityLog(`✓ 回调签名验证通过 | 订单: ${order.orderNo}`);
      addSecurityLog(`✓ IP 白名单校验通过 | 金额二次校验: ¥${(order.amount / 100).toFixed(2)}`);
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id && o.status === 'PROCESSING' ? { ...o, status: 'FAIL' } : o,
        ),
      );
      addLog(`❌ 订单 ${order.orderNo} → FAIL（支付失败）`);
    }

    setProcessingId(null);
  }, [addLog, addSecurityLog]);

  const retryPayments = useCallback(
    async (maxRetries = 3) => {
      setRetryLog([]);
      setSecurityLog([]);
      retryLogRef.current = [];
      logIdRef.current = 0;
      await simulateBackendDelay(50);
      addLog('🚀 开始指数退避重试演示...');
      let attempt = 1;
      let success = false;

      while (attempt <= maxRetries && !success) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
        const jitter = delay * (0.5 + Math.random() * 0.5);

        addLog(`  尝试 #${String(attempt)}: 等待 ${String(Math.round(jitter))}ms 后重试...`);
        await simulateBackendDelay(jitter);

        const ok = attempt >= 2;
        if (ok) {
          addLog(`  ✅ 尝试 #${String(attempt)} 成功！`);
          success = true;
        } else if (attempt < maxRetries) {
          addLog(`  ❌ 尝试 #${String(attempt)} 失败 (5xx)，进行下一次重试`);
        } else {
          addLog(`  ❌ 尝试 #${String(attempt)} 失败，已达最大重试次数`);
          addLog('  ⚠️ 已通知人工介入处理');
        }
        attempt++;
      }

      addLog(success ? '✅ 重试演示完成' : '❌ 重试演示完成（所有重试均失败）');

      // 联动更新当前订单状态
      setOrders((prev) => {
        const target: PaymentOrder | undefined = prev[0];
        if (success) {
          addSecurityLog(`✓ 重试成功 | 订单: ${target.orderNo}`);
          return prev.map((o) => (o.id === target.id ? { ...o, status: 'SUCCESS' } : o));
        }
        return prev.map((o) => (o.id === target.id ? { ...o, status: 'FAIL' } : o));
      });
    },
    [addLog, addSecurityLog],
  );

  const testIdempotency = useCallback(async () => {
    addLog('🧪 Idempotency-Key 幂等性测试...');
    const key = `idem_${String(Date.now())}`;
    const orderNo = `ORD${String(Date.now())}`;

    addLog(`  首次请求: key=${key}, orderNo=${orderNo}`);
    await simulateBackendDelay(400);
    idempotentCacheRef.current.set(key, {
      id: generateId(),
      orderNo,
      channel: 'alipay',
      amount: 2999,
      status: 'SUCCESS',
      idempotencyKey: key,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    addLog(`  ✅ 首次请求成功，结果已缓存`);

    await simulateBackendDelay(300);

    addLog(`  重复请求: 相同 key=${key}`);
    const cached = idempotentCacheRef.current.get(key);
    if (cached) {
      addLog(`  🔄 检测到重复 Idempotency-Key，返回缓存结果`);
      addLog(`  ✅ 订单 ${cached.orderNo} 未重复扣款（幂等性保障）`);
      setDuplicateDetected(true);
      setTimeout(() => {
        setDuplicateDetected(false);
      }, 3000);
    }
  }, [addLog]);

  const testSecurity = useCallback(async () => {
    addSecurityLog('🔐 安全检测演示...');
    await simulateBackendDelay(300);
    addSecurityLog('⚠️ 模拟攻击: 回调伪造检测');
    await simulateBackendDelay(200);
    addSecurityLog('  → RSA 签名验签: 失败 ❌（签名不匹配）');
    addSecurityLog('  → IP 白名单校验: 192.168.1.100 不在允许列表 ❌');
    addSecurityLog('  → 回调已丢弃（默认拒绝原则）');
    await simulateBackendDelay(300);
    addSecurityLog('⚠️ 模拟攻击: 金额篡改检测');
    await simulateBackendDelay(200);
    addSecurityLog('  → 请求金额: ¥999.00, 订单金额: ¥29.99');
    addSecurityLog('  → 后端二次验价: 不匹配 ❌');
    addSecurityLog('  → 支付请求已拒绝');
    await simulateBackendDelay(300);
    addSecurityLog('✅ 安全防护正常运作');
  }, [addSecurityLog]);

  const refundOrder = useCallback(
    async (orderId: string) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'REFUNDING' } : o)));
      addLog(`🔄 订单发起退款...`);
      await simulateBackendDelay(1000);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'REFUNDED' } : o)));
      addLog(`✅ 退款成功`);
    },
    [addLog],
  );

  const closeOrder = useCallback(
    (orderId: string) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CLOSED' } : o)));
      addLog(`🔒 订单已关闭`);
    },
    [addLog],
  );

  const reconciliation = useCallback(async () => {
    addLog('🔍 启动 T+1 对账脚本...');
    await simulateBackendDelay(400);

    // 1. 生成测试数据：故意制造几笔重复订单
    const now = Date.now();
    const testOrders: PaymentOrder[] = [
      {
        id: generateId(),
        orderNo: 'ORD20240601001',
        channel: 'wechat',
        amount: 2999,
        status: 'SUCCESS',
        idempotencyKey: generateId(),
        version: 1,
        createdAt: new Date(now - 172800000).toISOString(),
        updatedAt: new Date(now - 172800000).toISOString(),
      },
      {
        id: generateId(),
        orderNo: 'ORD20240601001',
        channel: 'wechat',
        amount: 2999,
        status: 'SUCCESS',
        idempotencyKey: generateId(),
        version: 1,
        createdAt: new Date(now - 172700000).toISOString(),
        updatedAt: new Date(now - 172700000).toISOString(),
      },
      {
        id: generateId(),
        orderNo: 'ORD20240601002',
        channel: 'alipay',
        amount: 5999,
        status: 'SUCCESS',
        idempotencyKey: generateId(),
        version: 1,
        createdAt: new Date(now - 86400000).toISOString(),
        updatedAt: new Date(now - 86400000).toISOString(),
      },
      {
        id: generateId(),
        orderNo: 'ORD20240601003',
        channel: 'wechat',
        amount: 1299,
        status: 'SUCCESS',
        idempotencyKey: generateId(),
        version: 1,
        createdAt: new Date(now - 43200000).toISOString(),
        updatedAt: new Date(now - 43200000).toISOString(),
      },
      {
        id: generateId(),
        orderNo: 'ORD20240601003',
        channel: 'wechat',
        amount: 1299,
        status: 'SUCCESS',
        idempotencyKey: generateId(),
        version: 1,
        createdAt: new Date(now - 43100000).toISOString(),
        updatedAt: new Date(now - 43100000).toISOString(),
      },
      {
        id: generateId(),
        orderNo: 'ORD20240601003',
        channel: 'wechat',
        amount: 1299,
        status: 'SUCCESS',
        idempotencyKey: generateId(),
        version: 1,
        createdAt: new Date(now - 43000000).toISOString(),
        updatedAt: new Date(now - 43000000).toISOString(),
      },
    ];

    setOrders((prev) => [...testOrders, ...prev]);
    addLog(`  拉取渠道结算单... 共 ${String(testOrders.length)} 笔`);

    await simulateBackendDelay(600);

    // 2. 按 orderNo + channel 分组，筛选重复
    const groupMap = new Map<string, PaymentOrder[]>();
    for (const o of testOrders) {
      if (o.status !== 'SUCCESS') continue;
      const key = `${o.orderNo}|${o.channel}`;
      const group = groupMap.get(key);
      if (group) group.push(o);
      else groupMap.set(key, [o]);
    }

    const duplicates: PaymentOrder[] = [];
    for (const [, group] of groupMap) {
      if (group.length > 1) {
        // 按创建时间排序，保留最早的一笔，其余视为重复
        group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        duplicates.push(...group.slice(1));
      }
    }

    addLog(`  分组对比: orderNo + channel 为唯一键`);
    for (const [key, group] of groupMap) {
      const [orderNo, channel] = key.split('|');
      if (group.length > 1) {
        addLog(`  ⚠️ 重复: ${orderNo} (${channel}) × ${String(group.length)} 笔`);
      }
    }

    await simulateBackendDelay(400);

    if (duplicates.length === 0) {
      addLog(`  ✅ 对账完成: 无重复订单`);
      return;
    }

    addLog(`  📊 发现 ${String(duplicates.length)} 笔重复订单，开始自动退款...`);

    // 3. 逐笔退款
    for (const dup of duplicates) {
      await simulateBackendDelay(500);
      setOrders((prev) => prev.map((o) => (o.id === dup.id ? { ...o, status: 'REFUNDING' } : o)));
      addLog(`  🔄 退款中: ${dup.orderNo} (${dup.channel}) ¥${(dup.amount / 100).toFixed(2)}`);

      await simulateBackendDelay(600);
      setOrders((prev) => prev.map((o) => (o.id === dup.id ? { ...o, status: 'REFUNDED' } : o)));
      addLog(`  ✅ 已退款: ${dup.orderNo}`);
    }

    addLog(
      `  📊 对账完成: 共处理 ${String(testOrders.length)} 笔, 发现 ${String(duplicates.length)} 笔重复, 已全部自动退款`,
    );
  }, [addLog]);

  const currentOrder = orders.find(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <Row gutter={16}>
        <Col span={16}>
          <Card
            title={
              <Space>
                <CreditCardOutlined />
                <Text strong>统一支付中台演示</Text>
              </Space>
            }
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  onClick={createOrder}
                  loading={!!processingId}
                >
                  创建支付订单
                </Button>
                <Button icon={<KeyOutlined />} onClick={testIdempotency}>
                  幂等性测试
                </Button>
                <Button icon={<SafetyCertificateOutlined />} onClick={testSecurity}>
                  安全检测
                </Button>
                <Button icon={<ReloadOutlined />} onClick={reconciliation}>
                  对账演示
                </Button>
              </Space>
            }
          >
            {currentOrder ? (
              <div>
                <Descriptions
                  column={3}
                  size="small"
                  bordered
                  styles={{ label: { fontWeight: 600, width: 120 } }}
                >
                  <Descriptions.Item label="订单号">{currentOrder.orderNo}</Descriptions.Item>
                  <Descriptions.Item label="支付渠道">
                    <Tag>{currentOrder.channel.toUpperCase()}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="金额">
                    ¥{(currentOrder.amount / 100).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态" span={3}>
                    <StatusBadge status={currentOrder.status} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Idempotency-Key" span={3}>
                    <Text code style={{ fontSize: 11 }}>
                      {currentOrder.idempotencyKey}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>

                <Divider titlePlacement="start" plain>
                  状态机流转
                </Divider>
                <StatusFlowDiagram currentStatus={currentOrder.status} />

                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Text type="secondary">可用操作: </Text>
                  {currentOrder.status === 'PROCESSING' && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={() => {
                        addLog(`📱 模拟渠道回调: 订单 ${currentOrder.orderNo} 支付成功`);
                        addSecurityLog(`✓ 回调签名验证通过 | 订单: ${currentOrder.orderNo}`);
                        setOrders((prev) =>
                          prev.map((o) =>
                            o.id === currentOrder.id ? { ...o, status: 'SUCCESS' } : o,
                          ),
                        );
                      }}
                    >
                      模拟回调成功
                    </Button>
                  )}
                  {currentOrder.status === 'PROCESSING' && (
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        addLog(`📱 模拟渠道回调: 订单 ${currentOrder.orderNo} 支付失败`);
                        setOrders((prev) =>
                          prev.map((o) =>
                            o.id === currentOrder.id ? { ...o, status: 'FAIL' } : o,
                          ),
                        );
                      }}
                    >
                      模拟回调失败
                    </Button>
                  )}
                  {currentOrder.status === 'SUCCESS' && (
                    <Button
                      size="small"
                      icon={<RollbackOutlined />}
                      onClick={() => refundOrder(currentOrder.id)}
                    >
                      发起退款
                    </Button>
                  )}
                  {currentOrder.status === 'PENDING' && (
                    <Button
                      size="small"
                      icon={<StopOutlined />}
                      onClick={() => {
                        closeOrder(currentOrder.id);
                      }}
                    >
                      关闭订单
                    </Button>
                  )}
                  {currentOrder.status === 'FAIL' && (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                          addLog(`🔄 重新支付: 订单 ${currentOrder.orderNo}`);
                          addSecurityLog(`✓ 重新支付: 重新生成 Idempotency-Key`);
                          const newKey = generateId();
                          setOrders((prev) =>
                            prev.map((o) =>
                              o.id === currentOrder.id
                                ? {
                                    ...o,
                                    status: 'PROCESSING',
                                    idempotencyKey: newKey,
                                    version: o.version + 1,
                                  }
                                : o,
                            ),
                          );
                          await simulateBackendDelay(1500);
                          setOrders((prev) => {
                            const target = prev.find((o) => o.id === currentOrder.id);
                            if (target?.status === 'PROCESSING') {
                              addLog(`✅ 订单 ${currentOrder.orderNo} → SUCCESS（重新支付成功）`);
                              addSecurityLog(`✓ 回调签名验证通过 | 订单: ${currentOrder.orderNo}`);
                              return prev.map((o) =>
                                o.id === currentOrder.id ? { ...o, status: 'SUCCESS' } : o,
                              );
                            }
                            return prev;
                          });
                        }}
                      >
                        重新支付
                      </Button>
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => retryPayments(3)}
                      >
                        重试演示
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <ShoppingCartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <br />
                点击&quot;创建支付订单&quot;开始演示
              </div>
            )}
          </Card>

          {duplicateDetected && (
            <Alert
              style={{ marginTop: 12 }}
              title="幂等性防护已触发 - 重复的 Idempotency-Key 返回了缓存结果，未产生重复扣款"
              type="success"
              showIcon
              closable
            />
          )}

          <Card
            size="small"
            title={<Text strong>历史订单</Text>}
            style={{ marginTop: 16 }}
            styles={{ body: { padding: 0, maxHeight: 200, overflow: 'auto' } }}
          >
            <Table
              dataSource={orders.slice(0, 20)}
              pagination={false}
              size="small"
              rowKey="id"
              columns={[
                { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
                {
                  title: '金额',
                  dataIndex: 'amount',
                  key: 'amount',
                  width: 100,
                  render: (v: number) => `¥${(v / 100).toFixed(2)}`,
                },
                {
                  title: '渠道',
                  dataIndex: 'channel',
                  key: 'channel',
                  width: 90,
                  render: (v: string) => <Tag>{v.toUpperCase()}</Tag>,
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 130,
                  render: (v: PaymentStatus) => <StatusBadge status={v} />,
                },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  width: 170,
                  render: (v: string) => new Date(v).toLocaleTimeString(),
                },
              ]}
            />
          </Card>
          <Collapse
            size="small"
            style={{ marginTop: 12 }}
            items={[
              {
                key: 'idempotency-retry',
                label: <Text strong>幂等性架构 & 重试策略</Text>,
                children: (
                  <>
                    <Collapse
                      size="small"
                      items={[
                        {
                          key: 'L1',
                          label: 'L1 前端层 - 按钮防重复',
                          children: (
                            <Text style={{ fontSize: 12 }}>
                              disabled + loading 状态，防止用户多次点击提交
                            </Text>
                          ),
                        },
                        {
                          key: 'L2',
                          label: 'L2 网关层 - Idempotency-Key',
                          children: (
                            <Text style={{ fontSize: 12 }}>
                              相同 Key 自动返回缓存结果，防止请求穿透
                            </Text>
                          ),
                        },
                        {
                          key: 'L3',
                          label: 'L3 业务层 - 唯一索引 + Redis 锁',
                          children: (
                            <Text style={{ fontSize: 12 }}>
                              UNIQUE(order_no, channel) + SETNX 分布式锁
                            </Text>
                          ),
                        },
                        {
                          key: 'L4',
                          label: 'L4 对账层 - T+1 对账兜底',
                          children: (
                            <Text style={{ fontSize: 12 }}>异步对账脚本发现重复订单自动退款</Text>
                          ),
                        },
                      ]}
                    />
                    <Divider style={{ margin: '8px 0' }} />
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="请求失败">
                        指数退避 1s/2s/4s/8s, max 3 次
                      </Descriptions.Item>
                      <Descriptions.Item label="处理中断">
                        定时轮询 15s/30s/60s/120s
                      </Descriptions.Item>
                      <Descriptions.Item label="回调丢失">
                        30s 未收到回调 → 主动查单
                      </Descriptions.Item>
                      <Descriptions.Item label="人工兜底">
                        手动同步按钮 + 退款/补单
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                ),
              },
            ]}
          />
          <Collapse
            size="small"
            style={{ marginTop: 12 }}
            items={[
              {
                key: 'status-driver',
                label: <Text strong>状态转换矩阵 & 状态驱动力</Text>,
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <TransitionMatrix />
                    </Col>
                    <Col span={12}>
                      <Table
                        dataSource={Object.entries(STATUS_DRIVERS).map(([key, val]) => ({
                          key,
                          driver: key,
                          desc: val,
                        }))}
                        pagination={false}
                        size="small"
                        showHeader={false}
                        columns={[
                          { title: '驱动力', dataIndex: 'driver', key: 'driver', width: 110 },
                          { title: '描述', dataIndex: 'desc', key: 'desc' },
                        ]}
                      />
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Col>

        <Col span={8}>
          <Card
            size="small"
            title={
              <Space>
                <ReloadOutlined />
                <Text strong>重试 & 幂等日志</Text>
              </Space>
            }
            styles={{ body: { padding: 8, height: 240 } }}
          >
            <div ref={retryLogBodyRef} style={{ height: 224, overflow: 'auto' }}>
              {retryLog.length === 0 ? (
                <Text type="secondary">暂无日志</Text>
              ) : (
                retryLog.map((entry) => (
                  <div
                    key={entry.id}
                    style={{ fontSize: 12, lineHeight: '20px', fontFamily: 'monospace' }}
                  >
                    {entry.msg}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <SafetyCertificateOutlined />
                <Text strong>安全日志</Text>
              </Space>
            }
            style={{ marginTop: 12 }}
            styles={{ body: { padding: 8, height: 240 } }}
          >
            <div ref={securityLogBodyRef} style={{ height: 224, overflow: 'auto' }}>
              {securityLog.length === 0 ? (
                <Text type="secondary">暂无日志</Text>
              ) : (
                securityLog.map((log) => (
                  <div
                    key={log}
                    style={{
                      fontSize: 12,
                      lineHeight: '20px',
                      fontFamily: 'monospace',
                      color: log.includes('❌')
                        ? '#f5222d'
                        : log.includes('⚠️')
                          ? '#fa8c16'
                          : undefined,
                    }}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
