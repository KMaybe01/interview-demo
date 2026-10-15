import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 480;
export const DEFAULT_SIDEBAR_WIDTH = 280;
export const COLLAPSED_SIDEBAR_WIDTH = 64;

export const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width';
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

/** 拖拽 / 键盘 / 记忆恢复共用的宽度钳制：非法值一律回落到默认宽度 */
export const clampSidebarWidth = (width: number): number => {
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
};

const readStoredWidth = (): number => {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (raw === null) return DEFAULT_SIDEBAR_WIDTH;
    return clampSidebarWidth(Number(raw));
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
};

const readStoredCollapsed = (): boolean => {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 隐私模式 / 存储被禁用时静默降级：只丢失记忆能力，不影响本次交互
  }
};

export interface UseSidebarResult {
  /** 是否折叠为图标栏 */
  collapsed: boolean;
  /** 最近一次提交的展开宽度（供 aria-valuenow 等可访问性信息使用） */
  width: number;
  toggleCollapsed: () => void;
  /** 记录拖拽起点，并给 body 加 resizing 类（禁用过渡，保证跟手） */
  beginResize: (clientX: number) => void;
  /** 拖拽过程：只写 CSS 变量与 ref，不触发 React 重渲染 */
  resizeTo: (clientX: number) => void;
  /** 拖拽结束：落盘并同步 React 状态 */
  endResize: () => void;
  /** 键盘微调，立即落盘 */
  nudgeWidth: (delta: number) => void;
  /** 复位到默认宽度 */
  resetWidth: () => void;
}

/**
 * 侧边栏宽度 / 折叠态的单一真源。
 *
 * 布局由 `:root` 上的 `--sidebar-width` 变量驱动（侧边栏宽度 + 内容区左偏移），
 * 因此拖拽热路径直接写 CSS 变量而不 setState，避免每帧重渲染整棵导航树。
 */
export function useSidebar(): UseSidebarResult {
  const [width, setCommittedWidth] = useState(readStoredWidth);
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const widthRef = useRef(width);
  const dragOriginRef = useRef<{ x: number; startWidth: number } | null>(null);

  // 必须用 layoutEffect：否则折叠时"类名先在浏览器绘制时生效、宽度变量晚一帧"，会出现一帧错位抖动
  useLayoutEffect(() => {
    const applied = collapsed ? COLLAPSED_SIDEBAR_WIDTH : width;
    document.documentElement.style.setProperty('--sidebar-width', `${applied}px`);
  }, [width, collapsed]);

  const applyWidth = useCallback((next: number) => {
    const clamped = clampSidebarWidth(next);
    widthRef.current = clamped;
    document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
  }, []);

  const commitWidth = useCallback(() => {
    writeStorage(SIDEBAR_WIDTH_STORAGE_KEY, String(widthRef.current));
    setCommittedWidth(widthRef.current);
  }, []);

  const beginResize = useCallback((clientX: number) => {
    dragOriginRef.current = { x: clientX, startWidth: widthRef.current };
    document.body.classList.add('sidebar-resizing');
  }, []);

  const resizeTo = useCallback(
    (clientX: number) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      applyWidth(origin.startWidth + (clientX - origin.x));
    },
    [applyWidth],
  );

  const endResize = useCallback(() => {
    dragOriginRef.current = null;
    document.body.classList.remove('sidebar-resizing');
    commitWidth();
  }, [commitWidth]);

  const nudgeWidth = useCallback(
    (delta: number) => {
      applyWidth(widthRef.current + delta);
      commitWidth();
    },
    [applyWidth, commitWidth],
  );

  const resetWidth = useCallback(() => {
    applyWidth(DEFAULT_SIDEBAR_WIDTH);
    commitWidth();
  }, [applyWidth, commitWidth]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeStorage(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // 组件卸载（如拖拽中途路由切换）时清理拖拽残留状态
  useEffect(() => {
    return () => {
      dragOriginRef.current = null;
      document.body.classList.remove('sidebar-resizing');
    };
  }, []);

  return {
    collapsed,
    width,
    toggleCollapsed,
    beginResize,
    resizeTo,
    endResize,
    nudgeWidth,
    resetWidth,
  };
}
