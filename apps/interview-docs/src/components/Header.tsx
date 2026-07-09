import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { type NavItem, navConfig } from '../data/navigation';
import { useTheme } from '../hooks/useTheme';
import GlobalSearch from './GlobalSearch';

function NavDropdown({
  item,
  currentPath,
  depth = 0,
}: {
  item: NavItem;
  currentPath: string;
  depth?: number;
}) {
  const isActive = item.link ? currentPath.startsWith(item.link) : false;

  if (!item.items) {
    return (
      <li>
        <Link to={item.link || '#'} className={`nav-link${isActive ? ' active' : ''}`}>
          {item.icon && <span className="nav-item-icon">{item.icon}</span>}
          {item.text}
        </Link>
      </li>
    );
  }

  return (
    <li className={`nav-dropdown${depth > 0 ? ' nested-dropdown' : ''}`}>
      <button className={`nav-dropdown-toggle${isActive ? ' active' : ''}`} type="button">
        {item.icon && <span className="nav-item-icon">{item.icon}</span>}
        {item.text}
        <svg
          className="chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <ul className={`nav-dropdown-menu${depth > 0 ? ' nested' : ''}`}>
        {item.items.map((child, i) => (
          <NavDropdown key={i} item={child} currentPath={currentPath} depth={depth + 1} />
        ))}
      </ul>
    </li>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const timeoutRef = useRef<number>(undefined);
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="header-logo">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Logo"
              className="header-logo-img"
            />
            <span className="header-logo-text">前端知识体系</span>
          </Link>

          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
            aria-label="菜单"
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            className={`header-nav${menuOpen ? ' open' : ''}`}
            onMouseEnter={() => {
              clearTimeout(timeoutRef.current);
            }}
            onMouseLeave={() => {
              timeoutRef.current = setTimeout(() => setMenuOpen(false), 200);
            }}
          >
            <ul className="nav-list">
              {navConfig.map((item, i) => (
                <NavDropdown key={i} item={item} currentPath={currentPath} />
              ))}
            </ul>
          </nav>

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

            <label
              className="theme-switch"
              title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            >
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="theme-switch-track">
                <span className="theme-switch-thumb">
                  <svg
                    className="theme-switch-sun"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  <svg
                    className="theme-switch-moon"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                </span>
              </span>
            </label>
            <a
              href="https://gitlab.com/KMaybe-01/interview-demo"
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
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
