import { StyleProvider } from '@ant-design/cssinjs';
import type { ThemeMode } from '@interview-demo/shared-theme';
import { ThemeToggle, useThemeTransition } from '@interview-demo/shared-theme';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AIDemo from './AIDemo.tsx';
import { useThemeStore } from './stores/themeStore.ts';

interface ThemeStoreState {
  mode: ThemeMode;
  toggle: () => void;
}

function App() {
  const mode = useThemeStore((s: ThemeStoreState) => s.mode);

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
          <style>{`html, body, #root { margin: 0; height: 100%; overflow: hidden; }`}</style>
          <ThemedLayout />
        </AntApp>
      </StyleProvider>
    </ConfigProvider>
  );
}

function ThemedLayout() {
  const { token } = theme.useToken();
  const mode = useThemeStore((s: ThemeStoreState) => s.mode);
  const toggleTheme = useThemeStore((s: ThemeStoreState) => s.toggle);
  const { handleToggleTheme, transitionOverlay } = useThemeTransition(mode, toggleTheme, {
    darkBg: '#141414',
    lightBg: '#ffffff',
  });

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
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
        <ThemeToggle mode={mode} onToggle={handleToggleTheme} />
      </header>
      <main style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <AIDemo />
      </main>
      {transitionOverlay}
    </div>
  );
}

export default App;
