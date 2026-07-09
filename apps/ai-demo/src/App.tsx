import { StyleProvider } from '@ant-design/cssinjs';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { App as AntApp, ConfigProvider, Switch, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useCallback, useEffect, useState } from 'react';
import AIDemo from './AIDemo.tsx';

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('theme-mode');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      /* ignore */
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', next);
      return next;
    });
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#667eea' },
      }}
    >
      <StyleProvider layer>
        <AntApp>
          <ThemedLayout mode={mode} onToggleTheme={toggleTheme} />
        </AntApp>
      </StyleProvider>
    </ConfigProvider>
  );
}

function ThemedLayout({
  mode,
  onToggleTheme,
}: {
  mode: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          color: token.colorText,
        }}
      >
        <h2 style={{ margin: 0, color: token.colorText }}>AI Demo</h2>
        <Switch
          checked={mode === 'dark'}
          onChange={onToggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <AIDemo />
      </main>
    </div>
  );
}

export default App;
