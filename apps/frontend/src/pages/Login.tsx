import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, message, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { getErrorMessage, http } from '../utils/fetchClient.ts';
import { parseToken, setTokens } from '../utils/token.ts';
import styles from './Login.module.css';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSessionAlert, setShowSessionAlert] = useState(
    searchParams.get('session_replaced') === '1',
  );
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showSessionAlert) {
      setSearchParams(
        (prev) => {
          prev.delete('session_replaced');
          return prev;
        },
        { replace: true },
      );
      alertTimerRef.current = setTimeout(() => {
        setShowSessionAlert(false);
      }, 8000);
    }
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [showSessionAlert, setSearchParams]);

  const handleSubmit = useCallback(
    async (values: { username: string; password: string }) => {
      setLoading(true);
      try {
        const res = await http.post('/api/auth/login', values);
        const data = res.data as { access_token: string; refresh_token: string };

        setTokens(data.access_token, data.refresh_token);

        const payload = parseToken(data.access_token);
        if (payload != null) {
          login({ sub: payload.sub, role: payload.role });
        }

        message.success('登录成功');
        void navigate('/', { replace: true });
      } catch (err) {
        message.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [login, navigate],
  );

  return (
    <div className={styles.container}>
      {/* 涟漪动画 */}
      <div className={styles.rippleLayer}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={styles.ripple}
            style={{
              top: `${String(30 + i * 15)}%`,
              left: `${String(20 + i * 18)}%`,
              width: 120 + i * 40,
              height: 120 + i * 40,
              animationDuration: `${String(4 + i * 1.5)}s`,
              animationDelay: `${String(i * 1.2)}s`,
            }}
          />
        ))}
        <div className={styles.rippleExtra} />
      </div>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* 登录卡片 */}
      <Card className={styles.card} styles={{ body: { padding: '40px 32px 32px' } }}>
        {/* Logo */}
        <div className={styles.logoBox}>
          <div className={styles.logoIcon}>
            <SafetyOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#1a1a2e', fontWeight: 600 }}>
            Interview Demo
          </Title>
          <Text style={{ color: '#8c8c8c', fontSize: 14 }}>全栈技术演示平台</Text>
        </div>

        <Form
          onFinish={handleSubmit}
          initialValues={{ username: 'admin', password: 'admin123' }}
          size="large"
          autoComplete="off"
        >
          {showSessionAlert && (
            <Form.Item style={{ marginBottom: 16 }}>
              <Alert
                title="您的账号已在其他设备登录"
                description="若非本人操作，请立即修改密码"
                type="warning"
                showIcon
                closable={{
                  onClose: () => {
                    setShowSessionAlert(false);
                  },
                }}
              />
            </Form.Item>
          )}
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              style={{
                background: '#f5f5f5',
                border: '1px solid #e8e8e8',
                borderRadius: 10,
                height: 48,
                color: '#1a1a2e',
              }}
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              style={{
                background: '#f5f5f5',
                border: '1px solid #e8e8e8',
                borderRadius: 10,
                height: 48,
                color: '#1a1a2e',
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 28 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 500,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 24px rgba(102,126,234,0.25)',
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text style={{ color: '#bfbfbf', fontSize: 12 }}>演示账号: admin / admin123</Text>
        </div>
      </Card>

      {/* 底部版权 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: '#d9d9d9',
          fontSize: 12,
          letterSpacing: 2,
        }}
      >
        <span>© {new Date().getFullYear()} Interview Demo</span>
        <span style={{ color: '#e8e8e8' }}>|</span>
        <a
          href="https://gitlab.com/KMaybe-01/interview-demo.git/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          GitHub 仓库
        </a>
      </div>
    </div>
  );
}
