import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLruCacheStore } from '../../stores/lruRouteStore.ts';
import LogsPage from '../LruRouteCacheLogs.tsx';

beforeEach(() => {
  useLruCacheStore.setState({
    pages: {
      logs: {
        data: { logs: [] },
        loading: false,
        scrollTop: 0,
        formValues: {},
        loadedAt: Date.now(),
      },
    },
    order: ['logs'],
    activePage: 'logs',
    staleKeys: [],
    evictedPage: null,
  });
});

describe('LruRouteCacheLogs', () => {
  it('renders logs page', () => {
    render(<LogsPage pageKey="logs" isActive />);
    expect(screen.getByText(/无匹配日志/)).toBeInTheDocument();
  });
});
