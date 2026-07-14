import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, Typography, theme } from 'antd';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../routes';
import { useAuthStore, useThemeStore } from '../stores';
import { clearTokens } from '../utils/token.ts';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [themeTransition, setThemeTransition] = useState(false);
  const [overlayBg, setOverlayBg] = useState('');
  const [clipOrigin, setClipOrigin] = useState('100% 0%');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const { token } = theme.useToken();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 992) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleToggleTheme = useCallback(() => {
    const goingDark = mode === 'light';
    const origin = goingDark ? '100% 0%' : '0% 100%';
    const oldBg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
    setOverlayBg(oldBg || (mode === 'dark' ? '#141414' : '#ffffff'));
    setClipOrigin(origin);
    setThemeTransition(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toggleTheme();
      });
    });
  }, [toggleTheme, mode]);

  const handleLogout = useCallback(() => {
    clearTokens();
    logout();
    void navigate('/login', { replace: true });
  }, [logout, navigate]);

  const menuItems = useMemo(
    () =>
      routes.map((r) => ({
        key: r.path,
        icon: <r.icon />,
        label: r.name,
      })),
    [],
  );

  return (
    <>
      <Layout style={{ height: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme={mode === 'dark' ? 'dark' : 'light'}
          width={220}
          style={{
            overflow: 'hidden',
            borderRight: `1px solid ${token.colorBorderSecondary}`,
          }}
          trigger={
            <span style={{ fontSize: 16, fontWeight: 600, userSelect: 'none' }}>
              {collapsed ? '>' : '<'}
            </span>
          }
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Title level={5} style={{ color: token.colorPrimary, margin: 0, whiteSpace: 'nowrap' }}>
              {collapsed ? 'Demo' : 'Interview Demo'}
            </Title>
          </div>
          <div style={{ overflow: 'auto', height: 'calc(100vh - 64px)' }}>
            <Menu
              theme={mode === 'dark' ? 'dark' : 'light'}
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
            />
          </div>
        </Sider>
        <Layout style={{ height: '100vh' }}>
          <Header
            style={{
              background: token.colorBgContainer,
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: `0 1px 4px ${token.colorBgMask}08`,
              height: 64,
              lineHeight: '64px',
            }}
          >
            <Title level={4} style={{ margin: 0 }}>
              {routes.find((r) => r.path === location.pathname)?.name ?? 'Interview Demo'}
            </Title>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.label
                className="theme-switch"
                title={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={mode === 'dark'}
                  onChange={handleToggleTheme}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: mode === 'dark' ? '#333355' : '#e2e2e3',
                    transition: 'background 0.3s',
                  }}
                >
                  <motion.span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: mode === 'dark' ? '#1a1a2e' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                    animate={{
                      left: mode === 'dark' ? 22 : 2,
                      rotate: mode === 'dark' ? 360 : 0,
                    }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <motion.svg
                      key={`sun-${mode}`}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={mode === 'dark' ? '#666' : '#f59e0b'}
                      strokeWidth="2"
                      style={{ position: 'absolute' }}
                      initial={{ rotate: 0, scale: 1 }}
                      animate={{
                        rotate: mode === 'dark' ? 90 : 0,
                        scale: mode === 'dark' ? 0 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </motion.svg>
                    <motion.svg
                      key={`moon-${mode}`}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={mode === 'dark' ? '#a78bfa' : '#999'}
                      strokeWidth="2"
                      style={{ position: 'absolute' }}
                      initial={{ rotate: -90, scale: 0 }}
                      animate={{
                        rotate: mode === 'dark' ? 0 : -90,
                        scale: mode === 'dark' ? 1 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </motion.svg>
                  </motion.span>
                </span>
              </motion.label>

              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: '退出登录',
                      onClick: handleLogout,
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar size={28} style={{ backgroundColor: token.colorPrimary }}>
                    {user?.sub ? user.sub[0].toUpperCase() : <UserOutlined />}
                  </Avatar>
                  <Text>{user?.sub ?? '用户'}</Text>
                </Button>
              </Dropdown>
            </div>
          </Header>
          <Content style={{ padding: 24, overflow: 'auto', height: 'calc(100vh - 64px)' }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>

      <AnimatePresence>
        {themeTransition && (
          <motion.div
            className="theme-reveal-overlay"
            style={{ backgroundColor: overlayBg }}
            initial={{ clipPath: `circle(150% at ${clipOrigin})` }}
            animate={{ clipPath: `circle(0% at ${clipOrigin})` }}
            exit={{ clipPath: `circle(0% at ${clipOrigin})` }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => setThemeTransition(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
