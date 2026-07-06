import { create } from 'zustand';

function applyExclude<T extends Record<string, unknown>>(obj: T, key: string): T {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as T;
}

export interface PageState {
  data: Record<string, unknown> | null;
  loading: boolean;
  scrollTop: number;
  formValues: Record<string, unknown>;
  loadedAt: number | null;
}

interface LruRouteState {
  pages: Record<string, PageState>;
  order: string[];
  activePage: string | null;
  maxPages: number;
  evictedPage: string | null;
  staleKeys: string[];

  setActive: (key: string) => void;
  updateData: (key: string, data: Record<string, unknown>) => void;
  setLoading: (key: string, loading: boolean) => void;
  setScrollTop: (key: string, top: number) => void;
  updateFormValue: (key: string, path: string, value: unknown) => void;
  closePage: (key: string) => void;
  initPage: (key: string) => void;
  clearEvicted: () => void;
  invalidateCache: (key: string) => void;
  invalidateAll: (except?: string) => void;
  clearStale: (key: string) => void;
}

export const useLruCacheStore = create<LruRouteState>((set, get) => ({
  pages: {},
  order: [],
  activePage: null,
  maxPages: 3,
  evictedPage: null,
  staleKeys: [],

  setActive: (key) => {
    const { order: currentOrder, pages: currentPages, maxPages, staleKeys: currentStale } = get();
    const newOrder = currentOrder.filter((k) => k !== key);
    newOrder.push(key);

    const toEvict = newOrder.length > maxPages ? newOrder[0] : null;

    if (toEvict && toEvict !== key) {
      newOrder.shift();
      const remaining = applyExclude(currentPages, toEvict);
      set({
        activePage: key,
        order: newOrder,
        pages: remaining,
        evictedPage: toEvict,
        staleKeys: currentStale.filter((k) => k !== toEvict),
      });
    } else {
      set({ activePage: key, order: newOrder });
    }
  },

  updateData: (key, data) => {
    const { pages: currentPages } = get();
    if (!(key in currentPages)) return;
    const page = currentPages[key];
    set({
      pages: { ...currentPages, [key]: { ...page, data, loading: false, loadedAt: Date.now() } },
    });
  },

  setLoading: (key, loading) => {
    const { pages: currentPages } = get();
    if (!(key in currentPages)) return;
    const page = currentPages[key];
    set({ pages: { ...currentPages, [key]: { ...page, loading } } });
  },

  setScrollTop: (key, top) => {
    const { pages: currentPages } = get();
    if (!(key in currentPages)) return;
    const page = currentPages[key];
    set({ pages: { ...currentPages, [key]: { ...page, scrollTop: top } } });
  },

  updateFormValue: (key, path, value) => {
    const { pages: currentPages } = get();
    if (!(key in currentPages)) return;
    const page = currentPages[key];
    set({
      pages: {
        ...currentPages,
        [key]: { ...page, formValues: { ...page.formValues, [path]: value } },
      },
    });
  },

  closePage: (key) => {
    const { pages: currentPages, order: currentOrder, activePage: currentActive } = get();
    const remaining = applyExclude(currentPages, key);
    const newOrder = currentOrder.filter((k) => k !== key);
    let newActive = currentActive;
    if (newActive === key) {
      newActive = newOrder.length > 0 ? newOrder[newOrder.length - 1] : null;
    }
    set({ pages: remaining, order: newOrder, activePage: newActive });
  },

  initPage: (key) => {
    const { pages: currentPages, order: currentOrder, activePage: currentActive } = get();
    if (key in currentPages) return;
    set({
      pages: {
        ...currentPages,
        [key]: { data: null, loading: true, scrollTop: 0, formValues: {}, loadedAt: null },
      },
      order: [...currentOrder, key],
      activePage: currentActive ?? key,
    });
  },

  clearEvicted: () => {
    set({ evictedPage: null });
  },

  invalidateCache: (key) => {
    const { pages: currentPages, staleKeys: currentStale } = get();
    if (!(key in currentPages)) return;
    if (currentStale.includes(key)) return;
    set({ staleKeys: [...currentStale, key] });
  },

  invalidateAll: (except) => {
    const { pages: currentPages, staleKeys: currentStale } = get();
    const keys = Object.keys(currentPages).filter((k) => k !== except);
    const newStale = keys.filter((k) => !currentStale.includes(k));
    if (newStale.length === 0) return;
    set({ staleKeys: [...currentStale, ...newStale] });
  },

  clearStale: (key) => {
    const { staleKeys: currentStale } = get();
    if (!currentStale.includes(key)) return;
    set({ staleKeys: currentStale.filter((k) => k !== key) });
  },
}));
