import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLruCacheStore } from '../../stores/lruRouteStore.ts';
import ConfigPage from '../LruRouteCacheConfig.tsx';

beforeEach(() => {
  useLruCacheStore.setState({
    pages: {
      config: { data: null, loading: false, scrollTop: 0, formValues: {}, loadedAt: null },
    },
    order: ['config'],
    activePage: 'config',
    staleKeys: [],
    evictedPage: null,
  });
});

describe('LruRouteCacheConfig', () => {
  it('renders config page', () => {
    render(<ConfigPage pageKey="config" isActive />);
    expect(screen.getByText(/保存配置/)).toBeInTheDocument();
  });
});
