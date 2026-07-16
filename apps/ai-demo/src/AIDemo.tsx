import {
  ApiOutlined,
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  MessageOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { XProvider } from '@ant-design/x';
import { App as AntApp, Spin, theme } from 'antd';
import type { ReactNode } from 'react';
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import styles from './AIDemo.module.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const A2UI = lazy(() => import('./components/A2UI.tsx'));
const Agents = lazy(() => import('./components/Agents.tsx'));
const Chat = lazy(() => import('./components/Chat.tsx'));
const DashboardLazy = lazy(() => import('./components/Dashboard.tsx'));
const KnowledgeBase = lazy(() => import('./components/KnowledgeBase.tsx'));
const Models = lazy(() => import('./components/Models.tsx'));
const Playground = lazy(() => import('./components/Playground.tsx'));
const Plugins = lazy(() => import('./components/Plugins.tsx'));

function TabFallback() {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
    >
      <Spin size="large" />
    </div>
  );
}

interface MessageApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const defaultMessageApi: MessageApi = {
  success: () => {},
  error: () => {},
  info: () => {},
};

export const MessageApiContext = createContext<MessageApi>(defaultMessageApi);
export const useMessageApi = () => useContext(MessageApiContext);

interface NavItem {
  path: string;
  icon: ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', icon: <DashboardOutlined />, label: '控制台' },
  { path: '/chat', icon: <MessageOutlined />, label: 'AI 聊天' },
  { path: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { path: '/models', icon: <AppstoreOutlined />, label: '模型管理' },
  { path: '/agents', icon: <RobotOutlined />, label: '智能体' },
  { path: '/playground', icon: <ApiOutlined />, label: 'Playground' },
  { path: '/a2ui', icon: <DeploymentUnitOutlined />, label: 'A2UI' },
  { path: '/plugins', icon: <SettingOutlined />, label: '插件中心' },
];

export default function AIDemo() {
  const { message } = AntApp.useApp();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const userToggledRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => {
      if (userToggledRef.current) return;
      setCollapsed(window.innerWidth < 768);
    };
    let timer: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(timer);
      timer = setTimeout(onResize, 100);
    };
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timer);
    };
  }, []);

  // Dashboard 通过该回调跳转到对应路由
  const handleNavigate = useCallback(
    (key: string) => {
      navigate(key === 'dashboard' ? '/' : `/${key}`);
    },
    [navigate],
  );

  const toggleCollapsed = useCallback(() => {
    userToggledRef.current = true;
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <MessageApiContext.Provider value={message}>
      <XProvider>
        <div
          className={styles.container}
          style={
            {
              '--scrollbar-track-bg': token.colorFillQuaternary,
              '--scrollbar-thumb-bg': token.colorFill,
              '--scrollbar-thumb-hover': token.colorFillSecondary,
              '--chat-hover-bg': token.colorFillTertiary,
              '--chat-active-bg': token.colorPrimaryBg,
              '--chat-active-border': token.colorPrimaryBorder,
              '--modal-item-border': token.colorBorderSecondary,
              '--modal-item-hover-bg': token.colorFillTertiary,
              '--modal-item-selected-bg': token.colorPrimaryBg,
              '--modal-item-selected-border': token.colorPrimaryBorder,
              '--upload-zone-border': token.colorBorder,
              '--upload-zone-bg': token.colorFillAlter,
              '--upload-zone-hover-border': token.colorPrimary,
              '--sidebar-bg': token.colorBgElevated,
              '--border-color': token.colorBorderSecondary,
              '--item-hover-bg': token.colorFillTertiary,
              '--item-active-bg': token.colorPrimaryBg,
              '--color-primary': token.colorPrimary,
              '--header-bg': token.colorBgContainer,
              '--text-primary': token.colorText,
              '--text-secondary': token.colorTextSecondary,
            } as React.CSSProperties
          }
        >
          <div
            className={`${styles.sidebar} ${collapsed ? styles['sidebar--collapsed'] : styles['sidebar--expanded']}`}
          >
            <nav className={styles.navList}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles['navItem--active'] : ''}`
                  }
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span
                    className={`${styles.navLabel} ${collapsed ? styles['navLabel--hidden'] : ''}`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={toggleCollapsed}
              aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
                {collapsed ? '>' : '<'}
              </span>
            </button>
          </div>
          <div className={styles.content}>
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<TabFallback />}>
                <Routes>
                  <Route path="/" element={<DashboardLazy onNavigate={handleNavigate} />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/knowledge" element={<KnowledgeBase />} />
                  <Route path="/models" element={<Models />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/playground" element={<Playground />} />
                  <Route path="/a2ui" element={<A2UI />} />
                  <Route path="/plugins" element={<Plugins />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </XProvider>
    </MessageApiContext.Provider>
  );
}
