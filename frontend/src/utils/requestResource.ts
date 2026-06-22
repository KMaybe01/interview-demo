import { http } from "./fetchClient.ts"

export interface RequestResource<T = unknown> {
  key: string
  method: string
  path: string
  delay: number
  failRate: number
  promise: Promise<T>
  abort: () => void
  startTime: number
}

const RESOURCE_DELAYS: Record<string, { delay: number; failRate: number }> = {
  "GET /api/users": { delay: 1500, failRate: 0 },
  "POST /api/users": { delay: 2000, failRate: 0.3 },
  "DELETE /api/users/1": { delay: 1000, failRate: 0 },
  "PUT /api/users/1": { delay: 2500, failRate: 0.1 },
  "GET /api/reports": { delay: 3000, failRate: 0 },
  "POST /api/export": { delay: 4000, failRate: 0.2 },
}

function getType(key: string): string {
  if (key.includes("/users")) return "users"
  if (key.includes("/reports")) return "reports"
  if (key.includes("/export")) return "export"
  return "default"
}

function getDelay(key: string): number {
  return isResourceKey(key) ? RESOURCE_DELAYS[key].delay : 1000
}

function getFailRate(key: string): number {
  return isResourceKey(key) ? RESOURCE_DELAYS[key].failRate : 0
}
function isResourceKey(key: string): key is keyof typeof RESOURCE_DELAYS {
  return key in RESOURCE_DELAYS
}

export function createRequestResource(key: string, method: string, path: string): RequestResource {
  const controller = new AbortController()
  const startTime = performance.now()
  const delay = getDelay(key)
  const failRate = getFailRate(key)

  const promise = http
    .get<{ success: boolean; data: unknown }>("/api/request-loading/demo", {
      params: { type: getType(key), delay: String(delay), fail: String(failRate) },
      signal: controller.signal,
    })
    .then((res) => {
      return res.data
    })

  return {
    key,
    method,
    path,
    delay,
    failRate,
    promise,
    abort: () => {
      controller.abort()
    },
    startTime,
  }
}
