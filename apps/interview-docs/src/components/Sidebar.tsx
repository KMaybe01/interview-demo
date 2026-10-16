import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { type NavItem, navConfig } from '../data/navigation';
import { MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, useSidebar } from '../hooks/useSidebar';

interface SidebarProps {
  /** 移动端抽屉开合状态（由 App 持有，桌面端恒为 false） */
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}

/** HashRouter 下中文路径可能仍是百分号编码，需安全解码后比较 */
const normalizePath = (path: string): string => {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    decoded = path;
  }
  return decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded;
};

const normalizeLink = (link: string): string => (link === '/' ? '/' : link.replace(/\/+$/, ''));

/**
 * 当前项高亮用精确匹配：`/S6-Go/` 这类"阶段概览"若用前缀匹配，
 * 会在该阶段任意子页面同时亮起。
 */
const isActiveLink = (pathname: string, link?: string): boolean =>
  link !== undefined && normalizeLink(link) === pathname;

/** 前缀匹配，只用于推导"当前页面归属哪个分组"以自动展开祖先分组 */
const matchesPath = (link: string, pathname: string): boolean => {
  const target = normalizeLink(link);
  if (target === '/') return pathname === '/';
  return pathname === target || pathname.startsWith(`${target}/`);
};

const ROOT_KEY = 'n';

const nodeKey = (parentKey: string, index: number): string => `${parentKey}-${index}`;

/** 深度优先查找活跃项索引链，`match` 决定匹配口径（先精确、后前缀） */
const findTrail = (
  items: NavItem[],
  match: (link: string) => boolean,
  trail: number[] = [],
): number[] | null => {
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item.link && match(item.link)) return [...trail, index];
    if (item.items) {
      const found = findTrail(item.items, match, [...trail, index]);
      if (found) return found;
    }
  }
  return null;
};

/** 索引链 → 祖先分组 key 列表（末位是节点自身，其祖先才是分组） */
const trailToGroupKeys = (trail: number[]): string[] => {
  const keys: string[] = [];
  let key = ROOT_KEY;
  for (let i = 0; i < trail.length - 1; i++) {
    key = nodeKey(key, trail[i]);
    keys.push(key);
  }
  return keys;
};

const collectActiveGroupKeys = (pathname: string): string[] => {
  const trail =
    findTrail(navConfig, (link) => normalizeLink(link) === pathname) ??
    findTrail(navConfig, (link) => matchesPath(link, pathname));
  return trail ? trailToGroupKeys(trail) : [];
};

/** 顶层分组 key 形如 `n-3`（只有一段下标），嵌套分组为 `n-3-1`、`n-3-1-2` */
const isTopLevelKey = (key: string): boolean => key.split('-').length === 2;

/** 手风琴：只保留该顶层分组及其子孙分组，其余顶层分组连带子分组一起收起 */
const keepSingleTopGroup = (keys: string[], keep: string): string[] =>
  keys.filter((key) => key === keep || key.startsWith(`${keep}-`));

/** 展开某个顶层分组（已展开则原样返回），同时保证同级只开一个 */
const activateTopGroup = (keys: string[], key: string): string[] => {
  const base = keepSingleTopGroup(keys, key);
  return base.includes(key) ? base : [...base, key];
};

interface NavRenderContext {
  pathname: string;
  openKeys: Set<string>;
  collapsed: boolean;
  onToggleGroup: (key: string) => void;
  onRailExpand: (key: string) => void;
  onNavigate: () => void;
}

/**
 * 折叠态与展开态渲染**完全相同的 DOM**，只靠 CSS 收窄盒宽 + 淡出文字。
 * 若在两种形态间切换节点结构，折叠瞬间会先重排再动画，产生可见的抖动。
 */
function renderNavNode(item: NavItem, key: string, ctx: NavRenderContext): ReactNode {
  const rail = ctx.collapsed;
  const icon = item.icon ? <span className="sidebar-icon">{item.icon}</span> : null;

  if (!item.items || item.items.length === 0) {
    const active = isActiveLink(ctx.pathname, item.link);
    return (
      <li key={key}>
        <Link
          to={item.link ?? '#'}
          className={`sidebar-link${active ? ' active' : ''}`}
          title={rail ? item.text : undefined}
          aria-current={active ? 'page' : undefined}
          onClick={ctx.onNavigate}
        >
          {icon}
          <span className="sidebar-label">{item.text}</span>
        </Link>
      </li>
    );
  }

  const open = ctx.openKeys.has(key);

  return (
    <li key={key}>
      <button
        type="button"
        className="sidebar-group-toggle"
        aria-expanded={open && !rail}
        title={rail ? item.text : undefined}
        // 折叠态点图标：先展开侧边栏再打开该分组
        onClick={() => (rail ? ctx.onRailExpand(key) : ctx.onToggleGroup(key))}
      >
        {icon}
        <span className="sidebar-label">{item.text}</span>
        <svg
          className={`sidebar-chevron${open ? ' is-open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open && (
        <ul className="sidebar-sublist">
          {item.items.map((child, index) => renderNavNode(child, nodeKey(key, index), ctx))}
        </ul>
      )}
    </li>
  );
}

interface SidebarTreeProps {
  pathname: string;
  openKeys: string[];
  collapsed: boolean;
  onToggleGroup: (key: string) => void;
  onRailExpand: (key: string) => void;
  onNavigate: () => void;
}

/**
 * 导航树用 memo 隔离：拖拽宽度时 Sidebar 外壳会重渲染，
 * 但这里的 props 不变（key 数组按引用比较），整棵树直接跳过。
 */
const SidebarTree = memo(function SidebarTree({
  pathname,
  openKeys,
  collapsed,
  onToggleGroup,
  onRailExpand,
  onNavigate,
}: SidebarTreeProps) {
  const openKeySet = useMemo(() => new Set(openKeys), [openKeys]);
  const ctx: NavRenderContext = {
    pathname,
    openKeys: openKeySet,
    collapsed,
    onToggleGroup,
    onRailExpand,
    onNavigate,
  };
  return (
    <ul className="sidebar-nav">
      {navConfig.map((item, index) => renderNavNode(item, nodeKey(ROOT_KEY, index), ctx))}
    </ul>
  );
});

export default function Sidebar({ drawerOpen, onCloseDrawer }: SidebarProps) {
  const { pathname } = useLocation();
  const normalizedPath = useMemo(() => normalizePath(pathname), [pathname]);
  const {
    collapsed,
    width,
    toggleCollapsed,
    beginResize,
    resizeTo,
    endResize,
    nudgeWidth,
    resetWidth,
  } = useSidebar();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  // 移动端抽屉打开时强制完整形态：折叠只作用于桌面端固定栏
  const rail = collapsed && !drawerOpen;

  // 路由变化：自动展开当前页面所属的祖先分组（顶层仍遵循只开一个的手风琴规则）
  useEffect(() => {
    const ancestors = collectActiveGroupKeys(normalizedPath);
    if (ancestors.length === 0) return;
    setOpenKeys((prev) => {
      const topKey = ancestors.find(isTopLevelKey);
      const merged = [...(topKey ? activateTopGroup(prev, topKey) : prev)];
      for (const key of ancestors) {
        if (!merged.includes(key)) merged.push(key);
      }
      return merged;
    });
  }, [normalizedPath]);

  // 展开后把高亮项滚到可视区（jsdom 未实现 scrollIntoView，需容错）
  useEffect(() => {
    const active = document.querySelector<HTMLElement>('.sidebar-link[aria-current="page"]');
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [normalizedPath, openKeys]);

  const handleToggleGroup = useCallback((key: string) => {
    setOpenKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      // 顶层互斥：展开下一个顶层分组前先折叠上一个
      return isTopLevelKey(key) ? activateTopGroup(prev, key) : [...prev, key];
    });
  }, []);

  const handleRailExpand = useCallback(
    (key: string) => {
      toggleCollapsed();
      setOpenKeys((prev) => activateTopGroup(prev, key));
    },
    [toggleCollapsed],
  );

  const handleNavigate = useCallback(() => {
    onCloseDrawer();
  }, [onCloseDrawer]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: PointerEvent) => resizeTo(event.clientX);
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      endResize();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, resizeTo, endResize]);

  const handleResizerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingRef.current = true;
    beginResize(event.clientX);
    setDragging(true);
  };

  const handleResizerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgeWidth(-step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgeWidth(step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      resetWidth();
    }
  };

  return (
    <>
      <div
        className={`sidebar-backdrop${drawerOpen ? ' is-visible' : ''}`}
        onClick={onCloseDrawer}
        role="presentation"
      />
      <aside
        id="site-sidebar"
        className={`sidebar${rail ? ' is-collapsed' : ''}${drawerOpen ? ' is-open' : ''}${
          dragging ? ' is-resizing' : ''
        }`}
        aria-label="文档导航"
      >
        <SidebarTree
          pathname={normalizedPath}
          openKeys={openKeys}
          collapsed={rail}
          onToggleGroup={handleToggleGroup}
          onRailExpand={handleRailExpand}
          onNavigate={handleNavigate}
        />

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {/* 无文字：折叠态显示"展开"符号（朝右双箭头），展开态显示"折叠"符号（朝左双箭头） */}
            <svg
              className="sidebar-collapse-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {collapsed ? (
                <>
                  <path d="M13 6l6 6-6 6" />
                  <path d="M5 6l6 6-6 6" />
                </>
              ) : (
                <>
                  <path d="M11 6l-6 6 6 6" />
                  <path d="M19 6l-6 6 6 6" />
                </>
              )}
            </svg>
          </button>
        </div>

        {!rail && (
          <div
            className="sidebar-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧边栏宽度"
            aria-valuenow={width}
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            tabIndex={0}
            onPointerDown={handleResizerPointerDown}
            onDoubleClick={resetWidth}
            onKeyDown={handleResizerKeyDown}
          />
        )}
      </aside>
    </>
  );
}
