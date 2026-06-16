import { create } from "zustand"

interface LoadingState {
  activeRequests: Record<string, boolean>
  startRequest: (key: string) => void
  endRequest: (key: string) => void
}

export const useRequestLoadingStore = create<LoadingState>((set) => ({
  activeRequests: {},
  startRequest: (key) => {
    set((state) => ({
      activeRequests: { ...state.activeRequests, [key]: true },
    }))
  },
  endRequest: (key) => {
    set((state) => ({
      activeRequests: Object.fromEntries(
        Object.entries(state.activeRequests).filter(([k]) => k !== key),
      ),
    }))
  },
}))
