import { http } from '../utils/fetchClient.ts';
import { reportManager } from './reportManager.ts';
import { type APIReport, ReportPriority } from './types.ts';

const SLOW_API_THRESHOLD_MS = 1000;

export class APIMonitor {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    http.interceptors.request.use((config) => {
      const metadata = { startTime: performance.now() };
      (config as unknown as Record<string, unknown>).__monitorStart = metadata;
      return config;
    });

    http.interceptors.response.use(
      (response) => {
        const metadata = (response.config as unknown as Record<string, unknown>).__monitorStart as
          | { startTime: number }
          | undefined;
        if (!metadata) return response;

        const duration = performance.now() - metadata.startTime;
        const url = response.config.url ?? '';
        const method = (response.config.method ?? 'GET').toUpperCase();
        const size = parseInt(response.headers['content-length'] as string, 10) || 0;

        if (duration > SLOW_API_THRESHOLD_MS) {
          const report: APIReport = {
            type: 'slow_api',
            url,
            method,
            duration,
            status: response.status,
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
      (error) => {
        const metadata = (error.config as unknown as Record<string, unknown>).__monitorStart as
          | { startTime: number }
          | undefined;
        const duration = metadata ? performance.now() - metadata.startTime : 0;
        const url = error.config?.url ?? '';
        const method = (error.config?.method ?? 'GET').toUpperCase();

        const report: APIReport = {
          type: 'api_error',
          url,
          method,
          duration,
          status: error.response?.status ?? 0,
          size: 0,
          error: error.message ?? 'Unknown error',
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
