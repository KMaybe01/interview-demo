import { reportManager } from './reportManager.ts';
import { type APIReport, ReportPriority } from './types.ts';

const SLOW_API_THRESHOLD_MS = 1000;

let axiosInstance: {
  interceptors: {
    request: { use: (...args: unknown[]) => number };
    response: { use: (...args: unknown[]) => number };
  };
} | null = null;

export function setAxiosInstance(instance: unknown): void {
  axiosInstance = instance as {
    interceptors: {
      request: { use: (...args: unknown[]) => number };
      response: { use: (...args: unknown[]) => number };
    };
  };
}

export class APIMonitor {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    if (!axiosInstance) return;
    this.initialized = true;

    axiosInstance.interceptors.request.use((config: unknown) => {
      const metadata = { startTime: performance.now() };
      (config as Record<string, unknown>).__monitorStart = metadata;
      return config;
    });

    axiosInstance.interceptors.response.use(
      (response: unknown) => {
        const res = response as { config: Record<string, unknown>; status: number; headers: Record<string, string> };
        const metadata = res.config.__monitorStart as { startTime: number } | undefined;
        if (!metadata) return response;
        const duration = performance.now() - metadata.startTime;
        const url = String(res.config.url ?? '');
        const method = (String(res.config.method ?? 'GET')).toUpperCase();
        const size = parseInt(res.headers['content-length'] as string, 10) || 0;

        if (duration > SLOW_API_THRESHOLD_MS) {
          const report: APIReport = {
            type: 'slow_api',
            url,
            method,
            duration,
            status: res.status,
            size,
            timestamp: Date.now(),
          };
          reportManager.add({
            priority: ReportPriority.NORMAL,
            data: report,
            timestamp: Date.now(),
          });
        }
        return response;
      },
      (error: unknown) => {
        const err = error as { config?: Record<string, unknown>; message?: string; response?: { status: number } };
        const metadata = err.config?.__monitorStart as { startTime: number } | undefined;
        const duration = metadata ? performance.now() - metadata.startTime : 0;
        const url = String(err.config?.url ?? '');
        const method = (String(err.config?.method ?? 'GET')).toUpperCase();
        const report: APIReport = {
          type: 'api_error',
          url,
          method,
          duration,
          status: err.response?.status ?? 0,
          size: 0,
          error: err.message ?? 'Unknown error',
          timestamp: Date.now(),
        };
        reportManager.add({
          priority: ReportPriority.HIGH,
          data: report,
          timestamp: Date.now(),
        });
        return Promise.reject(error);
      },
    );
  }
}

export const apiMonitor = new APIMonitor();
