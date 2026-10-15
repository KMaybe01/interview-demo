import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  COLLAPSED_SIDEBAR_WIDTH,
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_WIDTH_STORAGE_KEY,
  useSidebar,
} from '../useSidebar';

const appliedWidth = () => document.documentElement.style.getPropertyValue('--sidebar-width');

describe('useSidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--sidebar-width');
    document.body.className = '';
  });

  it('starts from defaults and publishes the width as a CSS variable', () => {
    const { result } = renderHook(() => useSidebar());

    expect(result.current.width).toBe(DEFAULT_SIDEBAR_WIDTH);
    expect(result.current.collapsed).toBe(false);
    expect(appliedWidth()).toBe(`${DEFAULT_SIDEBAR_WIDTH}px`);
  });

  it('restores the persisted width', () => {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, '400');

    const { result } = renderHook(() => useSidebar());

    expect(result.current.width).toBe(400);
    expect(appliedWidth()).toBe('400px');
  });

  it('clamps restored values and falls back on malformed ones', () => {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, '9999');
    const first = renderHook(() => useSidebar());
    expect(appliedWidth()).toBe(`${MAX_SIDEBAR_WIDTH}px`);
    first.unmount();

    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, 'not-a-number');
    renderHook(() => useSidebar());
    expect(appliedWidth()).toBe(`${DEFAULT_SIDEBAR_WIDTH}px`);
  });

  it('restores the persisted collapsed state as the rail width', () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');

    const { result } = renderHook(() => useSidebar());

    expect(result.current.collapsed).toBe(true);
    expect(appliedWidth()).toBe(`${COLLAPSED_SIDEBAR_WIDTH}px`);
  });

  it('persists the collapsed state on toggle', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.toggleCollapsed());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
    expect(appliedWidth()).toBe(`${COLLAPSED_SIDEBAR_WIDTH}px`);

    act(() => result.current.toggleCollapsed());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');
    expect(appliedWidth()).toBe(`${DEFAULT_SIDEBAR_WIDTH}px`);
  });

  it('previews the width while dragging and only persists on release', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.beginResize(300));
    expect(document.body).toHaveClass('sidebar-resizing');

    act(() => result.current.resizeTo(360));
    expect(appliedWidth()).toBe('340px');
    // 拖拽热路径不触发重渲染，也不落盘
    expect(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)).toBeNull();
    expect(result.current.width).toBe(DEFAULT_SIDEBAR_WIDTH);

    act(() => result.current.endResize());
    expect(document.body).not.toHaveClass('sidebar-resizing');
    expect(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)).toBe('340');
    expect(result.current.width).toBe(340);
  });

  it('clamps dragged values into the allowed range', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.beginResize(0));
    act(() => result.current.resizeTo(-500));
    expect(appliedWidth()).toBe(`${MIN_SIDEBAR_WIDTH}px`);

    act(() => result.current.resizeTo(5000));
    expect(appliedWidth()).toBe(`${MAX_SIDEBAR_WIDTH}px`);

    act(() => result.current.endResize());
  });

  it('ignores resize updates that never started a drag', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.resizeTo(420));

    expect(appliedWidth()).toBe(`${DEFAULT_SIDEBAR_WIDTH}px`);
  });

  it('nudges, resets and reports the committed width', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.nudgeWidth(8));
    expect(result.current.width).toBe(DEFAULT_SIDEBAR_WIDTH + 8);
    expect(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)).toBe(String(DEFAULT_SIDEBAR_WIDTH + 8));

    act(() => result.current.resetWidth());
    expect(result.current.width).toBe(DEFAULT_SIDEBAR_WIDTH);
    expect(appliedWidth()).toBe(`${DEFAULT_SIDEBAR_WIDTH}px`);
  });

  it('clampSidebarWidth rejects non-numeric input', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(DEFAULT_SIDEBAR_WIDTH);
    expect(clampSidebarWidth(120)).toBe(MIN_SIDEBAR_WIDTH);
    expect(clampSidebarWidth(1000)).toBe(MAX_SIDEBAR_WIDTH);
    expect(clampSidebarWidth(300.6)).toBe(301);
  });
});
