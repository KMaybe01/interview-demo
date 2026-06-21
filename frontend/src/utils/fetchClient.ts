import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios"
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./token.ts"

interface PendingItem {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

let refreshPromise: Promise<string> | null = null
const pendingQueue: PendingItem[] = []
let isRedirecting = false

async function doRefresh(): Promise<string> {
  const storedRefresh = getRefreshToken()
  if (storedRefresh == null) {
    refreshPromise = null
    throw new Error("Refresh Token not found")
  }

  try {
    const res = await axios.post("/api/auth/refresh", { refresh_token: storedRefresh })
    const data = res.data as { access_token: string; refresh_token: string }
    setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : null
    if (status === 401) {
      clearTokens()
    }
    refreshPromise = null
    throw new Error(status === 401 ? "Refresh Token invalid or reused" : "Refresh failed", {
      cause: err,
    })
  }
}

async function acquireRefresh(): Promise<string> {
  if (refreshPromise != null) {
    return new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject })
    })
  }

  refreshPromise = doRefresh()

  try {
    const token = await refreshPromise
    const queue = [...pendingQueue]
    pendingQueue.length = 0
    for (const item of queue) item.resolve(token)
    return token
  } catch (err) {
    const queue = [...pendingQueue]
    pendingQueue.length = 0
    for (const item of queue) item.reject(err)
    throw err
  } finally {
    refreshPromise = null
  }
}

function parseSimpleToken(token: string): { exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as Record<string, unknown>
    return { exp: payload.exp as number }
  } catch {
    return null
  }
}

const http = axios.create({
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
})

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token != null) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status === 401 && !originalRequest._retry) {
      const token = getAccessToken()
      if (token == null) {
        if (!isRedirecting) {
          isRedirecting = true
          window.location.href = "/login"
        }
        return Promise.reject(error)
      }

      const parsed = parseSimpleToken(token)
      if (parsed && parsed.exp * 1000 > Date.now() - 5000) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const newToken = await acquireRefresh()
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return await http(originalRequest)
      } catch {
        if (!isRedirecting) {
          isRedirecting = true
          clearTokens()
          window.location.href = "/login"
        }
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export async function fetchClient(
  url: string,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse> {
  return http(url, options)
}

export { http }
