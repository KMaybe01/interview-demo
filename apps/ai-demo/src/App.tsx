import { StyleProvider } from '@ant-design/cssinjs';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useCallback, useEffect, useState } from 'react';
import AIDemo from './AIDemo.tsx';

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme-mode');
      if (stored === 'dark' || stored === 'light') setMode(stored);
    } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

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
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-color, #f0f0f0)',
                background: 'var(--header-bg, #fff)',
              }}
            >
              <h2 style={{ margin: 0 }}>AI Demo</h2>
              <button onClick={toggleTheme} type="button" style={{ cursor: 'pointer' }}>
                {mode === 'light' ? '🌙 暗色' : '☀️ 亮色'}
              </button>
            </header>
            <main style={{ flex: 1, overflow: 'hidden' }}>
              <AIDemo />
            </main>
          </div>
        </AntApp>
      </StyleProvider>
    </ConfigProvider>
  );
}

export default App;
