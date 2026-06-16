import { create } from "zustand"

export interface PageState {
  data: Record<string, unknown> | null
  loading: boolean
  scrollTop: number
  formValues: Record<string, unknown>
  loadedAt: number | null
}

interface LruRouteState {
  pages: Record<string, PageState>
  order: string[]
  activePage: string | null
  maxPages: number
  evictedPage: string | null

  setActive: (key: string) => void
  updateData: (key: string, data: Record<string, unknown>) => void
  setLoading: (key: string, loading: boolean) => void
  setScrollTop: (key: string, top: number) => void
  updateFormValue: (key: string, path: string, value: unknown) => void
  closePage: (key: string) => void
  initPage: (key: string) => void
  clearEvicted: () => void
}

export const useLruCacheStore = create<LruRouteState>((set, get) => ({
  pages: {},
  order: [],
  activePage: null,
  maxPages: 3,
  evictedPage: null,

  setActive: (key) => {
    const state = get()
    const newOrder = state.order.filter((k) => k !== key)
    newOrder.push(key)

    const toEvict = newOrder.length > state.maxPages ? newOrder[0] : null

    if (toEvict && toEvict !== key) {
      newOrder.shift()
      const remaining = Object.fromEntries(
        Object.entries(state.pages).filter(([k]) => k !== toEvict),
      ) as Record<string, PageState>
      set({ activePage: key, order: newOrder, pages: remaining, evictedPage: toEvict })
    } else {
      set({ activePage: key, order: newOrder })
    }
  },

  updateData: (key, data) => {
    if (key in get().pages) {
      const page = get().pages[key]
      set({
        pages: { ...get().pages, [key]: { ...page, data, loading: false, loadedAt: Date.now() } },
      })
    }
  },

  setLoading: (key, loading) => {
    if (key in get().pages) {
      const page = get().pages[key]
      set({ pages: { ...get().pages, [key]: { ...page, loading } } })
    }
  },

  setScrollTop: (key, top) => {
    if (key in get().pages) {
      const page = get().pages[key]
      set({ pages: { ...get().pages, [key]: { ...page, scrollTop: top } } })
    }
  },

  updateFormValue: (key, path, value) => {
    if (key in get().pages) {
      const page = get().pages[key]
      set({
        pages: {
          ...get().pages,
          [key]: { ...page, formValues: { ...page.formValues, [path]: value } },
        },
      })
    }
  },

  closePage: (key) => {
    const remaining = Object.fromEntries(
      Object.entries(get().pages).filter(([k]) => k !== key),
    ) as Record<string, PageState>
    const newOrder = get().order.filter((k) => k !== key)
    let newActive = get().activePage
    if (newActive === key) {
      newActive = newOrder.length > 0 ? newOrder[newOrder.length - 1] : null
    }
    set({ pages: remaining, order: newOrder, activePage: newActive })
  },

  initPage: (key) => {
    if (key in get().pages) return
    set({
      pages: {
        ...get().pages,
        [key]: { data: null, loading: true, scrollTop: 0, formValues: {}, loadedAt: null },
      },
      order: [...get().order, key],
      activePage: get().activePage ?? key,
    })
  },

  clearEvicted: () => {
    set({ evictedPage: null })
  },
}))
