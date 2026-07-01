import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLruCacheStore } from '../../stores/lruRouteStore.ts';
import MonitorPage from '../LruRouteCacheMonitor.tsx';

beforeEach(() => {
  useLruCacheStore.setState({
    pages: {
      monitor: {
        data: { services: [] },
        loading: false,
        scrollTop: 0,
        formValues: {},
        loadedAt: Date.now(),
      },
    },
    order: ['monitor'],
    activePage: 'monitor',
    staleKeys: [],
    evictedPage: null,
  });
});

describe('LruRouteCacheMonitor', () => {
  it('renders monitor page', () => {
    render(<MonitorPage pageKey="monitor" isActive />);
    expect(screen.getByText(/全部状态/)).toBeInTheDocument();
  });
});
