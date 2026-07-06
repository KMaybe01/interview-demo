import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChunkStatus = 'pending' | 'hashing' | 'uploading' | 'done' | 'failed';

export interface ChunkInfo {
  index: number;
  status: ChunkStatus;
  hash: string;
  size: number;
  retries: number;
  speed: number;
  startTime: number;
}

export type FileStatus = 'pending' | 'hashing' | 'uploading' | 'paused' | 'done' | 'failed';

export interface UploadResult {
  success: boolean;
  fileHash: string;
  expected: string;
  integrityOK: boolean;
  fileSize: number;
}

export interface UploadFileItem {
  id: string;
  uploadId: string;
  filename: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  fileHash: string;
  status: FileStatus;
  progress: number;
  uploadedBytes: number;
  speed: number;
  elapsed: number;
  chunks: ChunkInfo[];
  result: UploadResult | null;
  createdAt: number;
}

interface UploadState {
  files: UploadFileItem[];
  addFile: (item: UploadFileItem) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, partial: Partial<UploadFileItem>) => void;
  updateChunk: (fileId: string, chunkIndex: number, partial: Partial<ChunkInfo>) => void;
  clearCompleted: () => void;
  resetAll: () => void;
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set) => ({
      files: [],

      addFile: (item) => {
        set((state) => ({ files: [...state.files, item] }));
      },

      removeFile: (id) => {
        set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
      },

      updateFile: (id, partial) => {
        set((state) => ({
          files: state.files.map((f) => (f.id === id ? { ...f, ...partial } : f)),
        }));
      },

      updateChunk: (fileId, chunkIndex, partial) => {
        set((state) => ({
          files: state.files.map((f) => {
            if (f.id !== fileId) return f;
            return {
              ...f,
              chunks: f.chunks.map((c) => (c.index === chunkIndex ? { ...c, ...partial } : c)),
            };
          }),
        }));
      },

      clearCompleted: () => {
        set((state) => ({
          files: state.files.filter(
            (f) => f.status === 'uploading' || f.status === 'paused' || f.status === 'failed',
          ),
        }));
      },

      resetAll: () => {
        set({ files: [] });
      },
    }),
    {
      name: 'upload_sessions',
      partialize: (state) => ({
        files: state.files.map(({ speed, elapsed, chunks, ...rest }) => ({
          ...rest,
          // Reset runtime fields on rehydrate, they will be recalculated
          speed: 0,
          elapsed: 0,
          chunks: chunks.map(({ speed: cs, startTime: cst, ...crest }) => ({
            ...crest,
            speed: 0,
            startTime: 0,
          })),
        })),
      }),
    },
  ),
);
