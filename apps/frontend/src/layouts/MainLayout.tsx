import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, Switch, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../routes';
import { useAuthStore, useThemeStore } from '../stores';
import { clearTokens } from '../utils/token.ts';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
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
            <Switch
              checked={mode === 'dark'}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
              onChange={toggleTheme}
            />

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
  );
}
