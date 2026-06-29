import {
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  MessageOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { App as AntApp, Tabs } from 'antd';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import styles from './AIDemo.module.css';

// ─── Lazy-loaded tab components ─────────────────────────────────────────

import Agents from './components/Agents';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import KnowledgeBase from './components/KnowledgeBase';
import Models from './components/Models';
import Plugins from './components/Plugins';

// ─── Message API context (replaces original App.tsx context) ────────────

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

// ─── Tab config ──────────────────────────────────────────────────────────

type TabKey = 'dashboard' | 'chat' | 'knowledge' | 'models' | 'agents' | 'plugins';

interface TabConfig {
  key: TabKey;
  icon: ReactNode;
  label: string;
  component: ReactNode;
}

// ─── AIDemo Page ─────────────────────────────────────────────────────────

export default function AIDemo() {
  const { message } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as TabKey);
  }, []);

  // Navigate between tabs (passed to Dashboard for quick-actions)
  const navigateToTab = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { key: 'dashboard', icon: <DashboardOutlined />, label: '控制台', component: <Dashboard onNavigate={navigateToTab} /> },
      { key: 'chat', icon: <MessageOutlined />, label: 'AI 聊天', component: <Chat /> },
      { key: 'knowledge', icon: <BookOutlined />, label: '知识库', component: <KnowledgeBase /> },
      { key: 'models', icon: <AppstoreOutlined />, label: '模型管理', component: <Models /> },
      { key: 'agents', icon: <RobotOutlined />, label: '智能体', component: <Agents /> },
      { key: 'plugins', icon: <SettingOutlined />, label: '插件中心', component: <Plugins /> },
    ],
    [navigateToTab],
  );

  return (
    <MessageApiContext.Provider value={message}>
      <div className={styles.container}>
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
            children: (
              <ErrorBoundary key={tab.key}>
                {tab.component}
              </ErrorBoundary>
            ),
          }))}
          tabBarStyle={{
            marginBottom: 0,
            paddingLeft: 8,
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
          }}
        />
      </div>
    </MessageApiContext.Provider>
  );
}
