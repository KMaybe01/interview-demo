import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import DocPage from './components/DocPage';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import HomePage from './components/HomePage';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification';

export default function App() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 首页保持整屏 Hero 布局，不展示侧边栏与汉堡按钮
  const isHome = location.pathname === '/';

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  // 抽屉仅用于窄屏；路由变化（含浏览器后退、全局搜索跳转）后自动收起
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // 抽屉打开时冻结背景滚动（规则本身收在移动端断点内，桌面端无副作用）
  useEffect(() => {
    document.body.classList.toggle('menu-open', drawerOpen);
    return () => document.body.classList.remove('menu-open');
  }, [drawerOpen]);

  return (
    <div className="app">
      <Header
        menuOpen={drawerOpen}
        onToggleMenu={toggleDrawer}
        onCloseMenu={closeDrawer}
        showMenuButton={!isHome}
      />
      {!isHome && <Sidebar drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />}
      <main className="main-content">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/*" element={<DocPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <UpdateNotification />
    </div>
  );
}
