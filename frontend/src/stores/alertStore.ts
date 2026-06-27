import { create } from "zustand"

export type AlertLevel = "critical" | "major" | "minor" | "info"

export interface AlertMessage {
  id: string
  seq: number
  topic: "alert" | "status" | "log"
  category: string
  level: AlertLevel
  message: string
  time: string
}

export interface AlertMetrics {
  totalReceived: number
  countByLevel: Record<AlertLevel, number>
  countByTopic: Record<string, number>
  timestamps: number[]
  interruptionCount: number
  totalDowntimeMs: number
  lastSeq: number
  gapsDetected: number
}

interface AlertState {
  alerts: AlertMessage[]
  metrics: AlertMetrics
  addAlerts: (items: AlertMessage[]) => void
  logInterruption: (downtimeMs: number) => void
  logGap: (from: number, to: number) => void
  setSeq: (seq: number) => void
  clearAlerts: () => void
  resetMetrics: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  system: "#722ed1",
  network: "#13c2c2",
  database: "#fa8c16",
  security: "#eb2f96",
  application: "#1890ff",
}

export { CATEGORY_COLORS }

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  metrics: {
    totalReceived: 0,
    countByLevel: { critical: 0, major: 0, minor: 0, info: 0 },
    countByTopic: { alert: 0, status: 0, log: 0 },
    timestamps: [],
    interruptionCount: 0,
    totalDowntimeMs: 0,
    lastSeq: 0,
    gapsDetected: 0,
  },
  addAlerts: (items) => {
    set((state) => {
      const now = Date.now()
      const { metrics } = state
      const newTimestamps = metrics.timestamps.slice()

      const countByLevel = { ...metrics.countByLevel }
      const countByTopic = { ...metrics.countByTopic }
      let lastSeq = metrics.lastSeq
      let gaps = metrics.gapsDetected

      for (const item of items) {
        countByLevel[item.level]++
        countByTopic[item.topic]++
        newTimestamps.push(now)
        if (item.seq > 0) {
          if (lastSeq > 0 && item.seq > lastSeq + 1) {
            gaps++
          }
          if (item.seq > lastSeq) {
            lastSeq = item.seq
          }
        }
      }

      if (newTimestamps.length > 20000) {
        newTimestamps.splice(0, newTimestamps.length - 20000)
      }

      return {
        alerts: items.concat(state.alerts),
        metrics: {
          ...metrics,
          totalReceived: metrics.totalReceived + items.length,
          countByLevel,
          countByTopic,
          timestamps: newTimestamps,
          lastSeq,
          gapsDetected: gaps,
        },
      }
    })
  },
  logInterruption: (downtimeMs) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        interruptionCount: state.metrics.interruptionCount + 1,
        totalDowntimeMs: state.metrics.totalDowntimeMs + downtimeMs,
      },
    }))
  },
  logGap: (_from, _to) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        gapsDetected: state.metrics.gapsDetected + 1,
      },
    }))
  },
  setSeq: (seq) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        lastSeq: seq,
      },
    }))
  },
  clearAlerts: () => {
    set({ alerts: [] })
  },
  resetMetrics: () => {
    set({
      metrics: {
        totalReceived: 0,
        countByLevel: { critical: 0, major: 0, minor: 0, info: 0 },
        countByTopic: { alert: 0, status: 0, log: 0 },
        timestamps: [],
        interruptionCount: 0,
        totalDowntimeMs: 0,
        lastSeq: 0,
        gapsDetected: 0,
      },
    })
  },
}))
