import { create } from "zustand"

export type ChunkStatus = "pending" | "hashing" | "uploading" | "done" | "failed"

export interface ChunkInfo {
  index: number
  status: ChunkStatus
  hash: string
  size: number
  retries: number
  speed: number
  startTime: number
}

export type FileStatus = "pending" | "hashing" | "uploading" | "paused" | "done" | "failed"

export interface UploadResult {
  success: boolean
  fileHash: string
  expected: string
  integrityOK: boolean
  fileSize: number
}

export interface UploadFileItem {
  id: string
  uploadId: string
  filename: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  fileHash: string
  status: FileStatus
  progress: number
  uploadedBytes: number
  speed: number
  elapsed: number
  chunks: ChunkInfo[]
  result: UploadResult | null
  createdAt: number
}

interface UploadState {
  files: UploadFileItem[]
  addFile: (item: UploadFileItem) => void
  removeFile: (id: string) => void
  updateFile: (id: string, partial: Partial<UploadFileItem>) => void
  updateChunk: (fileId: string, chunkIndex: number, partial: Partial<ChunkInfo>) => void
  loadFromStorage: () => void
  clearCompleted: () => void
}

const STORAGE_KEY = "upload_sessions"

function saveToStorage(files: UploadFileItem[]) {
  const serializable = files.map((f) => ({
    id: f.id,
    uploadId: f.uploadId,
    filename: f.filename,
    fileSize: f.fileSize,
    chunkSize: f.chunkSize,
    totalChunks: f.totalChunks,
    fileHash: f.fileHash,
    status: f.status,
    progress: f.progress,
    uploadedBytes: f.uploadedBytes,
    speed: f.speed,
    elapsed: f.elapsed,
    chunks: f.chunks.map((c) => ({
      index: c.index,
      status: c.status,
      hash: c.hash,
      size: c.size,
      retries: c.retries,
      speed: c.speed,
      startTime: c.startTime,
    })),
    result: f.result,
    createdAt: f.createdAt,
  }))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    // storage full or unavailable
  }
}

function loadFromStorage(): UploadFileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as UploadFileItem[]
  } catch {
    return []
  }
}

export const useUploadStore = create<UploadState>((set, get) => ({
  files: [],

  addFile: (item) => {
    set((state) => {
      const next = [...state.files, item]
      saveToStorage(next)
      return { files: next }
    })
  },

  removeFile: (id) => {
    set((state) => {
      const next = state.files.filter((f) => f.id !== id)
      saveToStorage(next)
      return { files: next }
    })
  },

  updateFile: (id, partial) => {
    set((state) => {
      const next = state.files.map((f) => (f.id === id ? { ...f, ...partial } : f))
      saveToStorage(next)
      return { files: next }
    })
  },

  updateChunk: (fileId, chunkIndex, partial) => {
    set((state) => {
      const next = state.files.map((f) => {
        if (f.id !== fileId) return f
        return {
          ...f,
          chunks: f.chunks.map((c) =>
            c.index === chunkIndex ? { ...c, ...partial } : c,
          ),
        }
      })
      saveToStorage(next)
      return { files: next }
    })
  },

  loadFromStorage: () => {
    const saved = loadFromStorage()
    set({ files: saved })
  },

  clearCompleted: () => {
    set((state) => {
      const next = state.files.filter(
        (f) => f.status === "uploading" || f.status === "paused" || f.status === "failed",
      )
      saveToStorage(next)
      return { files: next }
    })
  },
}))
