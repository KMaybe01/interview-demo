import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLruCacheStore } from '../../stores/lruRouteStore.ts';
import LruRouteCache from '../LruRouteCache.tsx';

beforeEach(() => {
  useLruCacheStore.setState({
    pages: {},
    order: [],
    activePage: null,
    maxPages: 3,
    evictedPage: null,
    staleKeys: [],
  });
});

describe('LruRouteCache', () => {
  it('renders tab buttons', () => {
    render(<LruRouteCache />);
    expect(screen.getByText(/业务监控/)).toBeInTheDocument();
    expect(screen.getByText(/配置管理/)).toBeInTheDocument();
    expect(screen.getByText(/日志查询/)).toBeInTheDocument();
  });

  it('shows capacity info', () => {
    render(<LruRouteCache />);
    expect(screen.getByText(/容量/)).toBeInTheDocument();
  });

  it('shows 0/3 open pages initially', () => {
    render(<LruRouteCache />);
    expect(screen.getByText(/0 \/ 3 已打开/)).toBeInTheDocument();
  });

  it('opens a page on tab click', async () => {
    const user = userEvent.setup();
    render(<LruRouteCache />);
    await user.click(screen.getByText(/业务监控/));
    const state = useLruCacheStore.getState();
    expect(state.pages).toHaveProperty('monitor');
    expect(state.activePage).toBe('monitor');
  });

  it('shows cache status section', async () => {
    const user = userEvent.setup();
    render(<LruRouteCache />);
    await user.click(screen.getByText(/业务监控/));
    expect(screen.getByText(/1 \/ 3 已打开/)).toBeInTheDocument();
  });

  it('opens multiple tabs and tracks order', async () => {
    const user = userEvent.setup();
    render(<LruRouteCache />);
    await user.click(screen.getByText(/业务监控/));
    await user.click(screen.getByText(/配置管理/));
    const state = useLruCacheStore.getState();
    expect(state.order).toEqual(['monitor', 'config']);
  });

  it('closes a page with close button', async () => {
    const user = userEvent.setup();
    render(<LruRouteCache />);
    await user.click(screen.getByText(/业务监控/));
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);
    expect(useLruCacheStore.getState().pages).not.toHaveProperty('monitor');
  });

  it('reset button clears all open pages', async () => {
    const user = userEvent.setup();
    render(<LruRouteCache />);
    await user.click(screen.getByText(/业务监控/));
    await user.click(screen.getByText(/重置/));
    expect(useLruCacheStore.getState().pages).toEqual({});
  });
});
