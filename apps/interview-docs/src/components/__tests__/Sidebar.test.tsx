import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';

const TOP_LEVEL = ['首页', '基础夯实', '框架深入', '进阶提升', '面试冲刺', 'AI 前沿', 'Go 语言'];

interface SidebarProps {
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

function renderSidebar(props: SidebarProps = {}, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar
        drawerOpen={props.drawerOpen ?? false}
        onCloseDrawer={props.onCloseDrawer ?? (() => {})}
      />
    </MemoryRouter>,
  );
}

// jsdom 对 PointerEvent 支持不稳定，用同名 MouseEvent 派发即可（handler 只读 clientX/button）
const dragEvent = (type: string, clientX: number) =>
  new MouseEvent(type, { clientX, bubbles: true, cancelable: true, button: 0 });

const appliedWidth = () => document.documentElement.style.getPropertyValue('--sidebar-width');

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--sidebar-width');
    document.body.className = '';
  });

  it('renders every top-level navigation entry', () => {
    renderSidebar();

    for (const text of TOP_LEVEL) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    // 未展开的分组不渲染子项，避免一次性铺开上百条链接
    expect(screen.queryByText('HTML')).not.toBeInTheDocument();
  });

  it('expands and collapses a group on toggle', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const toggle = screen.getByRole('button', { name: /基础夯实/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('HTML')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /基础夯实/ }));
    expect(screen.queryByText('HTML')).not.toBeInTheDocument();
  });

  it('keeps only one top-level group open at a time', async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole('button', { name: /基础夯实/ }));
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /框架深入/ }));

    expect(screen.getByRole('button', { name: /框架深入/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('HTML')).not.toBeInTheDocument();
    expect(screen.getByText('Vue3')).toBeInTheDocument();
  });

  it('moves the single open top group along with the route', async () => {
    const user = userEvent.setup();
    renderSidebar({}, '/S1-基础夯实/01-HTML');
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /框架深入/ }));
    await user.click(screen.getByRole('link', { name: /阶段概览/ }));

    expect(screen.getByRole('button', { name: /框架深入/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('highlights the active route and auto-expands its ancestor groups', () => {
    renderSidebar({}, '/S1-基础夯实/JavaScript核心/02-JavaScript基础');

    const link = screen.getByRole('link', { name: /JavaScript 基础/ });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('does not highlight a stage overview item on its child pages', () => {
    renderSidebar({}, '/S6-Go/1-01-Go基础语法与类型系统');

    const overview = screen.getByRole('link', { name: /阶段概览/ });
    expect(overview).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /01 Go 基础语法与类型系统/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // 三层嵌套：顶层 Go 语言 + 篇一 分组都应自动展开
    expect(screen.getByRole('button', { name: /篇一 · 语言内功/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapses into an icon rail and remembers the state', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const aside = document.getElementById('site-sidebar');
    expect(aside).not.toHaveClass('is-collapsed');

    await user.click(screen.getByRole('button', { name: '收起侧边栏' }));

    expect(aside).toHaveClass('is-collapsed');
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
    expect(appliedWidth()).toBe('64px');

    await user.click(screen.getByRole('button', { name: '展开侧边栏' }));

    expect(aside).not.toHaveClass('is-collapsed');
    expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
    expect(appliedWidth()).toBe('280px');
  });

  it('resizes by dragging the divider and persists the width on release', () => {
    renderSidebar();

    const resizer = screen.getByRole('separator', { name: '调整侧边栏宽度' });
    expect(appliedWidth()).toBe('280px');

    fireEvent(resizer, dragEvent('pointerdown', 300));
    expect(document.body).toHaveClass('sidebar-resizing');

    fireEvent(window, dragEvent('pointermove', 400));
    expect(appliedWidth()).toBe('380px');

    fireEvent(window, dragEvent('pointerup', 400));
    expect(document.body).not.toHaveClass('sidebar-resizing');
    expect(localStorage.getItem('sidebar-width')).toBe('380');
    expect(resizer).toHaveAttribute('aria-valuenow', '380');
  });

  it('clamps the dragged width to the allowed range', () => {
    renderSidebar();

    const resizer = screen.getByRole('separator', { name: '调整侧边栏宽度' });
    fireEvent(resizer, dragEvent('pointerdown', 0));

    fireEvent(window, dragEvent('pointermove', -5000));
    expect(appliedWidth()).toBe('200px');

    fireEvent(window, dragEvent('pointermove', 5000));
    expect(appliedWidth()).toBe('480px');

    fireEvent(window, dragEvent('pointerup', 5000));
    expect(localStorage.getItem('sidebar-width')).toBe('480');
  });

  it('resets to the default width on double click', () => {
    localStorage.setItem('sidebar-width', '440');
    renderSidebar();

    fireEvent.doubleClick(screen.getByRole('separator', { name: '调整侧边栏宽度' }));

    expect(appliedWidth()).toBe('280px');
    expect(localStorage.getItem('sidebar-width')).toBe('280');
  });

  it('nudges the width with the arrow keys', () => {
    renderSidebar();

    const resizer = screen.getByRole('separator', { name: '调整侧边栏宽度' });
    fireEvent.keyDown(resizer, { key: 'ArrowRight' });
    expect(appliedWidth()).toBe('288px');

    fireEvent.keyDown(resizer, { key: 'ArrowLeft' });
    expect(appliedWidth()).toBe('280px');
  });

  it('closes the drawer when the backdrop is clicked while open', async () => {
    const user = userEvent.setup();
    const onCloseDrawer = vi.fn();
    const { container } = renderSidebar({ drawerOpen: true, onCloseDrawer });

    const backdrop = container.querySelector('.sidebar-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop as Element).toHaveClass('is-visible');

    await user.click(backdrop as Element);
    expect(onCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it('keeps the full drawer layout in the mobile drawer even when collapsed', () => {
    localStorage.setItem('sidebar-collapsed', 'true');
    renderSidebar({ drawerOpen: true });

    const aside = document.getElementById('site-sidebar');
    expect(aside).toHaveClass('is-open');
    expect(aside).not.toHaveClass('is-collapsed');
    expect(screen.getByRole('button', { name: /基础夯实/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('requests the drawer to close when a navigation link is followed', async () => {
    const user = userEvent.setup();
    const onCloseDrawer = vi.fn();
    renderSidebar({ drawerOpen: true, onCloseDrawer });

    await user.click(screen.getByRole('link', { name: /首页/ }));

    expect(onCloseDrawer).toHaveBeenCalledTimes(1);
  });
});
