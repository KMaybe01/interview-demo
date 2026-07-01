import { beforeEach, describe, expect, it } from 'vitest';
import { useLruCacheStore } from '../lruRouteStore.ts';

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

describe('lruRouteStore', () => {
  it('initPage creates a new page entry', () => {
    useLruCacheStore.getState().initPage('/dashboard');
    const state = useLruCacheStore.getState();
    expect(state.pages['/dashboard']).toEqual({
      data: null,
      loading: true,
      scrollTop: 0,
      formValues: {},
      loadedAt: null,
    });
    expect(state.activePage).toBe('/dashboard');
  });

  it('initPage does not overwrite existing page', () => {
    useLruCacheStore.getState().initPage('/dashboard');
    useLruCacheStore.getState().updateData('/dashboard', { key: 'value' });
    useLruCacheStore.getState().initPage('/dashboard');
    expect(useLruCacheStore.getState().pages['/dashboard'].data).toEqual({ key: 'value' });
  });

  it('setActive marks page as most recently used', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().initPage('/b');
    useLruCacheStore.getState().setActive('/a');
    expect(useLruCacheStore.getState().order).toEqual(['/b', '/a']);
  });

  it('setActive evicts least recently used when over capacity', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().initPage('/b');
    useLruCacheStore.getState().initPage('/c');
    useLruCacheStore.getState().setActive('/d');
    const state = useLruCacheStore.getState();
    expect(state.pages['/a']).toBeUndefined();
    expect(state.evictedPage).toBe('/a');
  });

  it('closePage removes page and updates order', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().initPage('/b');
    useLruCacheStore.getState().closePage('/a');
    expect(useLruCacheStore.getState().pages['/a']).toBeUndefined();
    expect(useLruCacheStore.getState().order).toEqual(['/b']);
  });

  it('closePage switches active to last page if closing active', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().initPage('/b');
    useLruCacheStore.getState().setActive('/b');
    useLruCacheStore.getState().closePage('/b');
    expect(useLruCacheStore.getState().activePage).toBe('/a');
  });

  it('setScrollTop updates scroll position', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().setScrollTop('/a', 100);
    expect(useLruCacheStore.getState().pages['/a'].scrollTop).toBe(100);
  });

  it('updateFormValue sets nested form value', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().updateFormValue('/a', 'name', 'test');
    expect(useLruCacheStore.getState().pages['/a'].formValues).toEqual({ name: 'test' });
  });

  it('invalidateCache marks page as stale', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().invalidateCache('/a');
    expect(useLruCacheStore.getState().staleKeys).toContain('/a');
  });

  it('invalidateCache does not duplicate stale keys', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().invalidateCache('/a');
    useLruCacheStore.getState().invalidateCache('/a');
    expect(useLruCacheStore.getState().staleKeys).toHaveLength(1);
  });

  it('invalidateAll marks all pages as stale except excluded', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().initPage('/b');
    useLruCacheStore.getState().invalidateAll('/a');
    expect(useLruCacheStore.getState().staleKeys).toContain('/b');
    expect(useLruCacheStore.getState().staleKeys).not.toContain('/a');
  });

  it('clearStale removes key from stale list', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().invalidateCache('/a');
    useLruCacheStore.getState().clearStale('/a');
    expect(useLruCacheStore.getState().staleKeys).not.toContain('/a');
  });

  it('clearEvicted resets evictedPage', () => {
    useLruCacheStore.getState().initPage('/a');
    useLruCacheStore.getState().initPage('/b');
    useLruCacheStore.getState().initPage('/c');
    useLruCacheStore.getState().initPage('/d');
    useLruCacheStore.getState().clearEvicted();
    expect(useLruCacheStore.getState().evictedPage).toBeNull();
  });
});
