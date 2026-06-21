import { create } from "zustand"

export type RequestStatus = "pending" | "resolved" | "rejected" | "cancelled"

export interface RequestRecord {
  key: string
  method: string
  path: string
  delay: number
  startTime: number
  duration: number | null
  status: RequestStatus
  error: string | null
}

interface LoadingState {
  requests: RequestRecord[]
  addRequest: (rec: RequestRecord) => void
  recordResolved: (key: string) => void
  recordRejected: (key: string, error: string) => void
  recordCancelled: (key: string) => void
  removeRequest: (key: string) => void
  clearCompleted: () => void
}

function updateStatus(
  state: LoadingState,
  key: string,
  status: RequestStatus,
  extra: Partial<RequestRecord> = {},
): LoadingState {
  const reqs = state.requests.map((r) => {
    if (r.key !== key) return r
    return {
      ...r,
      status,
      duration: extra.duration ?? (status !== "pending" ? performance.now() - r.startTime : null),
      ...extra,
    }
  })
  return { ...state, requests: reqs }
}

export const useRequestLoadingStore = create<LoadingState>((set) => ({
  requests: [],

  addRequest: (rec) => {
    set((state) => ({ requests: [...state.requests, rec] }))
  },

  recordResolved: (key) => {
    set((state) => updateStatus(state, key, "resolved"))
  },

  recordRejected: (key, error) => {
    set((state) => updateStatus(state, key, "rejected", { error }))
  },

  recordCancelled: (key) => {
    set((state) => updateStatus(state, key, "cancelled", { error: "请求已取消" }))
  },

  removeRequest: (key) => {
    set((state) => ({ requests: state.requests.filter((r) => r.key !== key) }))
  },

  clearCompleted: () => {
    set((state) => ({
      requests: state.requests.filter((r) => r.status === "pending"),
    }))
  },
}))
