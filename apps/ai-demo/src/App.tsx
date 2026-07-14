import { StyleProvider } from '@ant-design/cssinjs';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { App as AntApp, ConfigProvider, Switch, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AIDemo from './AIDemo.tsx';
import { useThemeStore } from './stores/themeStore.ts';

function App() {
  const mode = useThemeStore((s) => s.mode);

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
          <ThemedLayout />
        </AntApp>
      </StyleProvider>
    </ConfigProvider>
  );
}

function ThemedLayout() {
  const { token } = theme.useToken();
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

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
          onChange={toggleTheme}
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
