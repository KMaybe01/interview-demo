import {
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  MessageOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { App as AntApp, Tabs, theme } from 'antd';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styles from './AIDemo.module.css';
import Agents from './components/Agents.tsx';
import Chat from './components/Chat.tsx';
import Dashboard from './components/Dashboard.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import KnowledgeBase from './components/KnowledgeBase.tsx';
import Models from './components/Models.tsx';
import Plugins from './components/Plugins.tsx';
import { useThemeStore } from './stores/themeStore.ts';

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

type TabKey = 'dashboard' | 'chat' | 'knowledge' | 'models' | 'agents' | 'plugins';

interface TabConfig {
  key: TabKey;
  icon: ReactNode;
  label: string;
  component: ReactNode;
}

export default function AIDemo() {
  const { message } = AntApp.useApp();
  const { token } = theme.useToken();
  const mode = useThemeStore((s) => s.mode);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as TabKey);
  }, []);

  const navigateToTab = useCallback((key: string) => {
    setActiveTab(key as TabKey);
  }, []);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: '控制台',
        component: <Dashboard onNavigate={navigateToTab} />,
      },
      {
        key: 'chat',
        icon: <MessageOutlined />,
        label: 'AI 聊天',
        component: <Chat />,
      },
      {
        key: 'knowledge',
        icon: <BookOutlined />,
        label: '知识库',
        component: <KnowledgeBase />,
      },
      {
        key: 'models',
        icon: <AppstoreOutlined />,
        label: '模型管理',
        component: <Models />,
      },
      {
        key: 'agents',
        icon: <RobotOutlined />,
        label: '智能体',
        component: <Agents />,
      },
      {
        key: 'plugins',
        icon: <SettingOutlined />,
        label: '插件中心',
        component: <Plugins />,
      },
    ],
    [navigateToTab],
  );

  return (
    <MessageApiContext.Provider value={message}>
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
          } as React.CSSProperties
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className={styles.tabs}
          items={tabs.map((tab) => ({
            key: tab.key,
            label: (
              <span>
                {tab.icon}
                <span style={{ marginLeft: 8 }}>{tab.label}</span>
              </span>
            ),
            children: <ErrorBoundary key={tab.key}>{tab.component}</ErrorBoundary>,
          }))}
          tabBarStyle={{
            marginBottom: 0,
            paddingLeft: 8,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        />
      </div>
    </MessageApiContext.Provider>
  );
}
