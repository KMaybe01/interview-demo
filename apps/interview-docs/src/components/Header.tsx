import { ThemeToggle, useThemeTransition } from '@interview-demo/shared-theme';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTheme } from '../hooks/useTheme';
import GlobalSearch from './GlobalSearch';

interface HeaderProps {
  /** 移动端抽屉是否打开（用于汉堡按钮的 X 动画与 aria 状态） */
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  /** 首页没有侧边栏，此时不渲染汉堡按钮 */
  showMenuButton: boolean;
}

export default function Header({
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  showMenuButton,
}: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { handleToggleTheme, transitionOverlay } = useThemeTransition(
    theme === 'dark' ? 'dark' : 'light',
    toggleTheme,
    { darkBg: '#1a1a2e', lightBg: '#f5f5f0' },
  );

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="header-logo" onClick={onCloseMenu}>
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Logo"
              className="header-logo-img"
            />
            <span className="header-logo-text">前端知识体系</span>
          </Link>

          {showMenuButton && (
            <button
              className={`mobile-menu-btn${menuOpen ? ' open' : ''}`}
              onClick={onToggleMenu}
              type="button"
              aria-label="菜单"
              aria-expanded={menuOpen}
              aria-controls="site-sidebar"
            >
              <span />
              <span />
              <span />
            </button>
          )}

          <div className="header-actions">
            <button
              className="header-action-btn"
              onClick={() => setSearchOpen(true)}
              type="button"
              aria-label="搜索"
              title="搜索 (Ctrl+K)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            <ThemeToggle mode={theme === 'dark' ? 'dark' : 'light'} onToggle={handleToggleTheme} />
            <a
              href="https://github.com/KMaybe01/interview-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="header-action-btn"
              title="GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {transitionOverlay}

      <AnimatePresence>
        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
