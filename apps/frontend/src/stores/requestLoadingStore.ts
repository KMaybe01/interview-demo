import { create } from 'zustand';

export type RequestStatus = 'pending' | 'resolved' | 'rejected' | 'cancelled';

export interface RequestRecord {
  key: string;
  method: string;
  path: string;
  delay: number;
  startTime: number;
  duration: number | null;
  status: RequestStatus;
  error: string | null;
}

interface LoadingState {
  requests: RequestRecord[];
  addRequest: (rec: RequestRecord) => void;
  recordResolved: (key: string) => void;
  recordRejected: (key: string, error: string) => void;
  recordCancelled: (key: string) => void;
  removeRequest: (key: string) => void;
  clearCompleted: () => void;
}

function buildUpdatedRequest(
  record: RequestRecord,
  status: RequestStatus,
  extra: Partial<RequestRecord> = {},
): RequestRecord {
  const duration =
    extra.duration ?? (status !== 'pending' ? performance.now() - record.startTime : null);
  return { ...record, status, duration, ...extra };
}

export const useRequestLoadingStore = create<LoadingState>((set) => ({
  requests: [],

  addRequest: (rec) => {
    set((state) => ({ requests: state.requests.concat(rec) }));
  },

  recordResolved: (key) => {
    set((state) => ({
      requests: state.requests.map((r) => (r.key === key ? buildUpdatedRequest(r, 'resolved') : r)),
    }));
  },

  recordRejected: (key, error) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.key === key ? buildUpdatedRequest(r, 'rejected', { error }) : r,
      ),
    }));
  },

  recordCancelled: (key) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.key === key ? buildUpdatedRequest(r, 'cancelled', { error: '请求已取消' }) : r,
      ),
    }));
  },

  removeRequest: (key) => {
    set((state) => ({ requests: state.requests.filter((r) => r.key !== key) }));
  },

  clearCompleted: () => {
    set((state) => ({
      requests: state.requests.filter((r) => r.status === 'pending'),
    }));
  },
}));
