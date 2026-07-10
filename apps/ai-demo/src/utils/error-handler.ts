export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * config.backoffFactor ** attempt;
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, config.maxDelay);
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000,
  ) {}

  getState(): 'closed' | 'open' | 'half-open' {
    if (this.state === 'open' && Date.now() - this.lastFailureTime > this.resetTimeout) {
      this.state = 'half-open';
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.getState() === 'open') {
      throw new Error('Circuit breaker is open');
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

export interface RetryError extends Error {
  attempt: number;
  lastResponse?: Response;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {},
): Promise<Response> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || !cfg.retryableStatuses.includes(response.status)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`) as RetryError;
      (lastError as RetryError).attempt = attempt;
      (lastError as RetryError).lastResponse = response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      (lastError as RetryError).attempt = attempt;
    }

    if (attempt < cfg.maxRetries) {
      const delay = calculateBackoff(attempt, cfg);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Request failed');
}
