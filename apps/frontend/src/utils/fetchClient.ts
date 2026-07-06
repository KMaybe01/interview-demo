import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  setTokens,
} from './token.ts';

interface PendingItem {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let refreshPromise: Promise<string> | null = null;
const pendingQueue: PendingItem[] = [];
let isRedirecting = false;

function getResponseData(err: AxiosError): Record<string, unknown> | null {
  const data = err.response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

async function doRefresh(): Promise<string> {
  const storedRefresh = getRefreshToken();
  if (storedRefresh == null) {
    refreshPromise = null;
    throw new Error('Refresh Token not found');
  }

  try {
    const res = await axios.post('/api/auth/refresh', { refresh_token: storedRefresh });
    const data = res.data as { access_token: string; refresh_token: string };
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : null;
    if (status === 401) {
      const apiData = axios.isAxiosError(err) ? getResponseData(err) : null;
      const code = apiData?.code;
      if (code === 'SESSION_REPLACED') {
        redirectToLogin('session_replaced=1');
        refreshPromise = null;
        // eslint-disable-next-line preserve-caught-error
        throw new Error('Session replaced');
      }
      clearTokens();
    }
    refreshPromise = null;
    // eslint-disable-next-line preserve-caught-error
    throw new Error(status === 401 ? 'Refresh Token invalid or reused' : 'Refresh failed');
  }
}

async function acquireRefresh(): Promise<string> {
  if (refreshPromise != null) {
    return new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
  }

  refreshPromise = doRefresh();

  try {
    const token = await refreshPromise;
    const queue = [...pendingQueue];
    pendingQueue.length = 0;
    for (const item of queue) item.resolve(token);
    return token;
  } catch (err) {
    const queue = [...pendingQueue];
    pendingQueue.length = 0;
    for (const item of queue) item.reject(err);
    throw err;
  } finally {
    refreshPromise = null;
  }
}

function parseSimpleToken(token: string): { exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
    return { exp: payload.exp as number };
  } catch {
    return null;
  }
}

function isLoginPage(): boolean {
  return window.location.pathname === '/login';
}

function redirectToLogin(params?: string): void {
  if (isRedirecting || isLoginPage()) return;
  isRedirecting = true;
  clearTokens();
  const query = params ? `?${params}` : '';
  // replace avoids polluting browser history with a broken page
  window.location.replace(`/login${query}`);
}

const http = axios.create({
  timeout: 30000,
});

http.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token == null) return config;

  // Proactive wait: if token is expired and a refresh is already in flight,
  // wait for the new token instead of sending a request doomed to 401
  if (isTokenExpired(token) && refreshPromise != null) {
    try {
      const newToken = await acquireRefresh();
      config.headers.Authorization = `Bearer ${newToken}`;
      return config;
    } catch {
      // Refresh in flight failed → let request go with old token,
      // response interceptor will handle the 401 and redirect
    }
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      const apiData = getResponseData(error);
      if (apiData?.code === 'SESSION_REPLACED') {
        redirectToLogin('session_replaced=1');
        return Promise.reject(error);
      }

      const token = getAccessToken();
      if (token == null) {
        redirectToLogin();
        return Promise.reject(error);
      }

      // Only attempt refresh if the token is actually expired
      // (30s buffer for clock drift). If token still has >30s life,
      // a 401 here is not about expiry (e.g. permissions revoked).
      const parsed = parseSimpleToken(token);
      if (parsed && parsed.exp * 1000 > Date.now() + 30000) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await acquireRefresh();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return await http(originalRequest);
      } catch {
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = getResponseData(error);
    if (data?.error && typeof data.error === 'string') return data.error;
    if (data?.message && typeof data.message === 'string') return data.message;
    if (error.response?.status === 400) return '请求参数错误';
    if (error.response?.status === 403) return '没有权限访问该资源';
    if (error.response?.status === 404) return '请求的资源不存在';
    if (error.response?.status === 409) return '资源冲突';
    if (error.response?.status === 422) return '请求数据校验失败';
    if (error.response?.status === 429) return '请求过于频繁，请稍后重试';
    if (error.response?.status && error.response.status >= 500) return '服务器内部错误';
    if (!error.response) return '网络错误，请检查后端服务是否正常运行';
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `请求失败 (${error.response.status})`;
  }
  if (error instanceof Error) return error.message;
  return '发生未知错误';
}

export async function fetchClient(
  url: string,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse> {
  return http(url, options);
}

export { http };
