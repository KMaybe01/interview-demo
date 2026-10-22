import { reportManager } from './reportManager.ts';
import { ReportPriority } from './types.ts';

interface DegradationOptions {
  timeout?: number;
  retryCount?: number;
  module?: string;
}

class BusinessError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export async function withDegradation<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  options?: DegradationOptions,
): Promise<T> {
  let retries = options?.retryCount ?? 2;
  const moduleName = options?.module ?? 'unknown';

  const fetchWithTimeout = async (): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options?.timeout ?? 3000);

    const originalFetcher = fetcher;
    const wrappedFetcher = async (): Promise<T> => {
      const result = await originalFetcher();
      const res = result as Record<string, unknown> | null;
      if (res && typeof res.code === 'number' && res.code !== 0) {
        throw new BusinessError(String(res.message ?? 'Business error'), res.code);
      }
      return result;
    };

    try {
      const result = await wrappedFetcher();
      clearTimeout(timer);
      return result;
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof BusinessError) {
        reportManager.add({
          data: {
            code: error.code,
            fallback: String(fallback),
            module: moduleName,
            reason: 'business_deny' as const,
            timestamp: Date.now(),
            type: 'degradation',
          },
          priority: ReportPriority.NORMAL,
          timestamp: Date.now(),
        });
        return fallback;
      }

      if (retries > 0) {
        retries--;
        return fetchWithTimeout();
      }

      reportManager.add({
        data: {
          fallback: String(fallback),
          module: moduleName,
          reason: 'network_timeout' as const,
          timestamp: Date.now(),
          type: 'degradation',
        },
        priority: ReportPriority.NORMAL,
        timestamp: Date.now(),
      });

      return fallback;
    }
  };

  return fetchWithTimeout();
}
