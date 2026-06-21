import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals"
import { http } from "./fetchClient.ts"
import { updateVitalsSnapshot } from "./vitalsSnapshot.ts"

const BATCH_INTERVAL = 3000

const pendingReports = new Map<string, number>()

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
  const now = Date.now()
  const payload = [
    {
      metric: name,
      value,
      rating: getRating(value, name),
      url: window.location.pathname,
      version: "web-vitals-5",
    },
  ]

  updateVitalsSnapshot(name, value)

  const key = `${name}@${String(Math.floor(now / BATCH_INTERVAL))}`
  pendingReports.set(key, (pendingReports.get(key) ?? 0) + 1)

  http.post("/api/vitals/report", payload).catch(() => undefined)
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
