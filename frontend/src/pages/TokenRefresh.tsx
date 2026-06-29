import {
  KeyOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../utils/fetchClient.ts';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  parseToken,
  setTokens,
} from '../utils/token.ts';

const { Text } = Typography;

interface PendingItem {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let refreshPromise: Promise<string> | null = null;
const pendingQueue: PendingItem[] = [];

interface TokenRecord {
  id: number;
  type: 'access' | 'refresh';
  status: 'active' | 'used' | 'expired';
  token: string;
  createdAt: number;
  expiresAt: number;
}

export default function TokenRefresh() {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle');
  const [refreshCount, setRefreshCount] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const [tokenHistory, setTokenHistory] = useState<TokenRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [usedTokenCount, setUsedTokenCount] = useState(0);
  const tokenIdRef = useRef(0);
  const logIdRef = useRef(0);

  const addLog = useCallback((msg: string) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setLog((prev) => {
      const next = [...prev, { id: ++logIdRef.current, text: entry }];
      return next.length > 150 ? next.slice(-100) : next;
    });
  }, []);

  const addTokenRecord = useCallback(
    (type: 'access' | 'refresh', token: string, status: 'active' | 'used' | 'expired') => {
      tokenIdRef.current += 1;
      const parsed = parseToken(token);
      setTokenHistory((prev) =>
        [
          {
            id: tokenIdRef.current,
            type,
            status,
            token,
            createdAt: Date.now(),
            expiresAt: parsed ? parsed.exp * 1000 : 0,
          },
          ...prev,
        ].slice(0, 50),
      );
    },
    [],
  );

  const doRefresh = useCallback(async (): Promise<string> => {
    setStatus('refreshing');

    const storedRefresh = getRefreshToken();
    if (storedRefresh == null) {
      setStatus('error');
      addLog('❌ Refresh Token 不存在，需要重新登录');
      throw new Error('Refresh Token not found');
    }

    addLog('🔄 POST /api/auth/refresh — 携带 Refresh Token 请求轮换...');

    const res = await http.post(
      '/api/auth/refresh',
      { refresh_token: storedRefresh },
      { validateStatus: () => true },
    );

    if (res.status === 401) {
      setStatus('error');
      addLog('❌ 刷新失败 — Refresh Token 已过期或被轮换（Replay Attack 检测）');
      setLoggedIn(false);
      clearTokens();
      setAccessToken('');
      setRefreshToken('');
      throw new Error('Refresh Token invalid or reused');
    }

    if (res.status >= 400) {
      setStatus('error');
      addLog(`❌ 刷新失败 HTTP ${String(res.status)}`);
      throw new Error('Refresh failed');
    }

    const data = res.data as {
      access_token: string;
      refresh_token: string;
      rotation: boolean;
    };

    const newAccess = data.access_token;
    const newRefresh = data.refresh_token;

    addTokenRecord('refresh', storedRefresh, 'used');
    addTokenRecord('access', newAccess, 'active');
    addTokenRecord('refresh', newRefresh, 'active');

    addLog('🆕 新的 Access Token 已签发');
    addLog('🔄 旧 Refresh Token 已标记为已用（Rotation）');
    addLog('🆕 新的 Refresh Token 已签发（Token Rotation）');

    setAccessToken(newAccess);
    setRefreshToken(newRefresh);
    setTokens(newAccess, newRefresh);
    setRefreshCount((c) => c + 1);
    setStatus('success');

    return newAccess;
  }, [addLog, addTokenRecord]);

  const acquireRefresh = useCallback(async (): Promise<string> => {
    if (refreshPromise != null) {
      setQueueLength((l) => l + 1);
      addLog(`📋 刷新进行中，加入等待队列（队列长度: ${String(pendingQueue.length + 1)}）`);
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      });
    }

    addLog('🔒 获取刷新锁，后续请求排队等待...');
    refreshPromise = doRefresh();

    try {
      const token = await refreshPromise;
      const queue = [...pendingQueue];
      pendingQueue.length = 0;
      setQueueLength(0);

      if (queue.length > 0) {
        addLog(`🔄 刷新完成，重放 ${String(queue.length)} 个等待请求...`);
        for (const [, item] of queue.entries()) {
          item.resolve(token);
        }
        addLog('✅ 所有等待请求已重放完成');
      }

      return token;
    } catch (err) {
      const queue = [...pendingQueue];
      pendingQueue.length = 0;
      setQueueLength(0);
      for (const item of queue) {
        item.reject(err);
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  }, [doRefresh, addLog]);

  const simulateRequest = useCallback(() => {
    const stored = getAccessToken();
    if (stored == null) {
      setStatus('error');
      addLog('❌ Access Token 不存在');
      return;
    }

    addLog(`📡 GET /api/auth/check — 模拟 API 请求`);

    if (isTokenExpired(stored)) {
      addLog('⏰ Access Token 已过期，触发无感刷新...');
      void acquireRefresh()
        .then((newToken) => {
          const parsed = parseToken(newToken);
          const remaining = parsed ? Math.round((parsed.exp * 1000 - Date.now()) / 1000) : 0;
          addLog(`✅ 无感刷新成功，请求使用新 Token 重放，剩余 ${String(remaining)}s`);
          setStatus('success');
        })
        .catch((err: unknown) => {
          addLog(`❌ 刷新失败: ${String(err)}`);
        });
    } else {
      void http
        .get('/api/auth/check', { validateStatus: () => true })
        .then(async (res) => {
          if (res.status === 401) {
            addLog('⏰ 服务端返回 401，触发无感刷新...');
            return acquireRefresh().then((newToken) => {
              const parsed = parseToken(newToken);
              const remaining = parsed ? Math.round((parsed.exp * 1000 - Date.now()) / 1000) : 0;
              addLog(`✅ 无感刷新成功，重放请求，剩余 ${String(remaining)}s`);
              setStatus('success');
            });
          }
          const data = res.data as { remaining: number };
          addLog(`✅ 请求成功，Token 还剩 ${String(data.remaining)}s 过期`);
          setStatus('success');
        })
        .catch((err: unknown) => {
          addLog(`❌ 请求失败: ${String(err)}`);
        });
    }
  }, [acquireRefresh, addLog]);

  const login = useCallback(async () => {
    pendingQueue.length = 0;
    refreshPromise = null;
    setTokenHistory([]);
    setUsedTokenCount(0);

    try {
      addLog('🔑 POST /api/auth/login — 登录中...');
      const res = await http.post('/api/auth/login', {
        username: 'admin',
        password: 'admin123',
      });
      if (res.status >= 400) {
        addLog('❌ 登录失败');
        return;
      }
      const data = res.data as { access_token: string; refresh_token: string };

      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token);
      setTokens(data.access_token, data.refresh_token);
      setLoggedIn(true);
      setRefreshCount(0);
      setStatus('idle');
      setQueueLength(0);
      setLog([]);
      addTokenRecord('access', data.access_token, 'active');
      addTokenRecord('refresh', data.refresh_token, 'active');

      const parsed = parseToken(data.access_token);
      const expiresIn = parsed ? parsed.exp * 1000 - Date.now() : 60000;
      addLog(
        `✅ 登录成功，Access Token（${String(Math.round(expiresIn / 1000))}s） / Refresh Token（1h）`,
      );
      addLog('🔌 请求拦截器已启用，API 返回 401 时自动无感刷新');
    } catch {
      addLog('❌ 登录请求异常');
    }
  }, [addLog, addTokenRecord]);

  const logout = useCallback(() => {
    pendingQueue.length = 0;
    refreshPromise = null;
    clearTokens();
    setAccessToken('');
    setRefreshToken('');
    setLoggedIn(false);
    setStatus('idle');
    setQueueLength(0);
    setLog([]);
    addLog('🔓 已登出，Token 已清除');
    setTokenHistory([]);
  }, [addLog]);

  const refreshAccessToken = useCallback(() => {
    void acquireRefresh();
  }, [acquireRefresh]);

  const expireNow = useCallback(() => {
    const stored = getAccessToken();
    if (stored == null) return;
    addLog('⏱️ 手动过期 Access Token，下次请求将触发刷新...');
    const parts = stored.split('.');
    if (parts.length !== 3) return;
    const payload = JSON.parse(atob(parts[1])) as {
      exp: number;
      sub: string;
      role: string;
      iat: number;
    };
    payload.exp = Math.floor(Date.now() / 1000) - 60;
    const newPayload = utf8ToBase64(JSON.stringify(payload));
    const expiredToken = `${parts[0]}.${newPayload}.${parts[2]}`;
    setTokens(expiredToken, getRefreshToken() ?? '');
    setAccessToken(expiredToken);
    addLog('⚠️ Access Token 已强制过期（exp 设为过去时间）');
  }, [addLog]);

  useEffect(() => {
    if (!loggedIn || !accessToken) return;
    const parsed = parseToken(accessToken);
    if (!parsed) return;

    const updateTimeLeft = () => {
      const remaining = Math.max(0, Math.round((parsed.exp * 1000 - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [loggedIn, accessToken]);

  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(async () => {
      try {
        const res = await http.get('/api/auth/used-tokens');
        const data = res.data as { count: number };
        setUsedTokenCount(data.count);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [loggedIn]);

  const repeatRequest = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        simulateRequest();
      }, i * 100);
    }
    addLog('📦 并发发送 3 个请求，验证队列合并机制');
  }, [simulateRequest, addLog]);

  const tokenCodeStyle: React.CSSProperties = { fontSize: 11 };

  const tokenHistoryColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 40,
      render: (_: unknown, __: unknown, idx: number) => idx + 1,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'access' ? 'blue' : 'purple'}>
          {v === 'access' ? 'Access' : 'Refresh'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          active: { color: 'green', text: '有效' },
          used: { color: 'orange', text: '已轮换' },
          expired: { color: 'red', text: '已过期' },
        };
        const m = map[v] ?? { color: 'default', text: v };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: 'Token (前 40 位)',
      dataIndex: 'token',
      key: 'token',
      ellipsis: true,
      render: (v: string) => (
        <Text code style={tokenCodeStyle}>
          {v.slice(0, 40)}...
        </Text>
      ),
    },
  ];

  return (
    <div>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Card>
          <Space wrap>
            {!loggedIn ? (
              <Button type="primary" icon={<LoginOutlined />} onClick={login}>
                登录
              </Button>
            ) : (
              <>
                <Badge status="success" text="已登录" />
                <Button icon={<KeyOutlined />} onClick={simulateRequest}>
                  模拟请求
                </Button>
                <Button icon={<WarningOutlined />} onClick={expireNow}>
                  强制过期
                </Button>
                <Button icon={<ReloadOutlined />} onClick={refreshAccessToken}>
                  手动刷新
                </Button>
                <Button onClick={repeatRequest}>并发 3 请求</Button>
                <Button icon={<LogoutOutlined />} onClick={logout}>
                  退出
                </Button>
              </>
            )}
          </Space>
        </Card>

        {loggedIn && (
          <>
            <Alert
              type={status === 'error' ? 'error' : status === 'success' ? 'success' : 'info'}
              showIcon
              title={
                status === 'refreshing'
                  ? '正在无感刷新 Token...'
                  : status === 'success'
                    ? '操作成功'
                    : status === 'error'
                      ? '操作失败'
                      : '就绪 — 请求拦截器已启用'
              }
            />

            <Card title="Token 信息" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Access Token">
                  <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                    {(accessToken || '(空)').slice(0, 60)}...
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Refresh Token">
                  <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                    {(refreshToken || '(空)').slice(0, 60)}...
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Token 剩余时间" span={1}>
                  <Space>
                    <Progress
                      type="circle"
                      percent={timeLeft > 0 ? Math.round((timeLeft / 60) * 100) : 0}
                      size={40}
                      format={() => `${String(timeLeft)}s`}
                      status={timeLeft < 10 ? 'exception' : timeLeft < 30 ? 'active' : 'success'}
                    />
                    <Text type="secondary">
                      Access Token 将在 {String(timeLeft)}s 后过期
                      {timeLeft < 30 ? '（即将自动刷新）' : ''}
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="刷新次数">
                  <Tag color="blue">{refreshCount}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="等待队列">
                  <Tag color={queueLength > 0 ? 'orange' : 'default'}>{queueLength}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="已轮换 Refresh Token">
                  <Tooltip title="旧 Refresh Token 被标记为已用，无法再次使用">
                    <Tag color="volcano">{usedTokenCount}</Tag>
                  </Tooltip>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card
              title={
                <Space>
                  <Text strong>Token 生命周期</Text>
                  <Tag color="green">Active</Tag>
                  <Tag color="orange">Rotated</Tag>
                  <Tag color="red">Expired</Tag>
                </Space>
              }
              size="small"
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={tokenHistory}
                columns={tokenHistoryColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Card>

            <Card title="操作日志" size="small" styles={{ body: { padding: 0 } }}>
              <div
                style={{
                  maxHeight: 200,
                  overflow: 'auto',
                  padding: 12,
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {log.map((l) => (
                  <div key={l.id}>{l.text}</div>
                ))}
                {log.length === 0 && <Text type="secondary">暂无日志</Text>}
              </div>
            </Card>
          </>
        )}
      </Space>
    </div>
  );
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
