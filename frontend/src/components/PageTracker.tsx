import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { routes } from "../routes"
import { http } from "../utils/fetchClient.ts"
import { getVitalsSnapshot } from "../utils/vitalsSnapshot.ts"

function getPageName(pathname: string): string {
  const r = routes.find((r) => r.path === pathname)
  return r?.name ?? pathname
}

const navigationTimings = new Map<string, number>()
let prevPath = ""

if (typeof performance.getEntriesByType === "function") {
  const navEntries = performance.getEntriesByType("navigation")
  if (navEntries.length > 0) {
    const nav = navEntries[0]
    navigationTimings.set("domContentLoaded", nav.domContentLoadedEventEnd - nav.startTime)
    navigationTimings.set("domComplete", nav.domComplete - nav.startTime)
    navigationTimings.set("load", nav.loadEventEnd - nav.startTime)
  }
}

export default function PageTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const renderStartRef = useRef(performance.now())
  const reportedRef = useRef(false)

  useEffect(() => {
    const renderEnd = performance.now()
    const renderDuration = renderEnd - renderStartRef.current
    const path = location.pathname
    const pageName = getPageName(path)

    if (!reportedRef.current) {
      reportedRef.current = true
      const v = getVitalsSnapshot()
      http
        .post("/api/vitals/page-report", [
          {
            path,
            pageName,
            renderDuration: Math.round(renderDuration * 100) / 100,
            lcp: v.LCP,
            inp: v.INP,
            cls: v.CLS,
            referrer: prevPath,
          },
        ])
        .catch(() => undefined)

      const navTimes: Record<string, number> = {}
      navigationTimings.forEach((v, k) => {
        navTimes[k] = v
      })
      if (Object.keys(navTimes).length > 0 && path !== "/login") {
        http
          .post(
            "/api/vitals/report",
            Object.entries(navTimes).map(([metric, value]) => ({
              metric,
              value: Math.round(value * 100) / 100,
              rating: "good",
              url: path,
              version: "navigation",
            })),
          )
          .catch(() => undefined)
      }

      navigationTimings.clear()
    }

    prevPath = path

    return () => {
      prevPath = path
    }
  }, [location.pathname])

  useEffect(() => {
    renderStartRef.current = performance.now()
    reportedRef.current = false
  }, [location.pathname])

  return <>{children}</>
}
