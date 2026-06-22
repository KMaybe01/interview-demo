import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals"
import { http } from "./fetchClient.ts"
import { updateVitalsSnapshot } from "./vitalsSnapshot.ts"

const BATCH_INTERVAL = 3000

interface VitalReport {
  metric: string
  value: number
  rating: string
  url: string
  version: string
}

const reportBuffer: VitalReport[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flushReports(): void {
  if (reportBuffer.length === 0) return
  const batch = reportBuffer.splice(0)
  http.post("/api/vitals/report", batch).catch(() => undefined)
}

function scheduleFlush(): void {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushReports()
  }, BATCH_INTERVAL)
}

function getRating(value: number, metric: string): string {
  switch (metric) {
    case "CLS":
      return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor"
    case "FCP":
    case "LCP":
      return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor"
    case "TTFB":
      return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor"
    case "INP":
      return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor"
    default:
      return "good"
  }
}

function report(name: string, value: number) {
  updateVitalsSnapshot(name, value)
  reportBuffer.push({
    metric: name,
    value,
    rating: getRating(value, name),
    url: window.location.pathname,
    version: "web-vitals-5",
  })
  scheduleFlush()
}

export function initVitalsReporter(): void {
  onCLS((m) => {
    report(m.name, m.value)
  })
  onFCP((m) => {
    report(m.name, m.value)
  })
  onINP((m) => {
    report(m.name, m.value)
  })
  onLCP((m) => {
    report(m.name, m.value)
  })
  onTTFB((m) => {
    report(m.name, m.value)
  })
}
