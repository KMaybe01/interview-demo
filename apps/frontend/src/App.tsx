import { App as AntApp, ConfigProvider, theme } from 'antd';
import { AnimatePresence } from 'motion/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AuthGuard from './components/AuthGuard.tsx';
import PageTracker from './components/PageTracker.tsx';
import PageTransition from './components/PageTransition.tsx';
import MainLayout from './layouts/MainLayout.tsx';
import Login from './pages/Login.tsx';
import { routes } from './routes';
import { useThemeStore } from './stores';

export default function App() {
  const mode = useThemeStore((s) => s.mode);
  const location = useLocation();

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/login"
              element={
                <PageTracker>
                  <PageTransition>
                    <Login />
                  </PageTransition>
                </PageTracker>
              }
            />
            <Route element={<AuthGuard />}>
              <Route element={<MainLayout />}>
                {routes.map((r) => (
                  <Route
                    key={r.path}
                    path={r.path}
                    element={
                      <PageTracker>
                        <PageTransition>
                          <r.element />
                        </PageTransition>
                      </PageTracker>
                    }
                  />
                ))}
              </Route>
            </Route>
          </Routes>
        </AnimatePresence>
      </AntApp>
    </ConfigProvider>
  );
}
