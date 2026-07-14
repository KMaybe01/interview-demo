import { reportManager } from './reportManager.ts';
import { type ErrorReport, ReportPriority } from './types.ts';

const JS_ERROR_SAMPLE_RATE = 0.1;
const DEDUP_WINDOW_MS = 5000;
const DEDUP_CACHE_MAX = 500;

export class ErrorMonitor {
  private initialized = false;
  private dedupCache = new Map<string, number>();
  private dedupOrder: string[] = [];

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    window.onerror = (
      message: string | Event,
      source?: string,
      line?: number,
      col?: number,
      error?: Error,
    ): void => {
      this.report({
        type: 'js_error',
        message: typeof message === 'string' ? message : 'Script error.',
        stack: error?.stack,
        source,
        line,
        col,
        url: window.location.href,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      this.report({
        type: 'promise_error',
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
      });
    });

    window.addEventListener(
      'error',
      (event: ErrorEvent | Event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const tagName = target.tagName?.toUpperCase();
        if (tagName === 'SCRIPT' || tagName === 'LINK' || tagName === 'IMG') {
          const elSrc =
            (target as HTMLScriptElement).src ??
            (target as HTMLLinkElement).href ??
            (target as HTMLImageElement).src ??
            '';
          this.report({
            type: 'resource_error',
            message: `Resource load failed: ${tagName}`,
            source: tagName,
            url: elSrc || window.location.href,
            timestamp: Date.now(),
          });
        }
      },
      true,
    );
  }

  private report(report: ErrorReport): void {
    if (report.type === 'js_error' && Math.random() > JS_ERROR_SAMPLE_RATE) {
      return;
    }
    const fingerprint = this.generateFingerprint(report);
    if (this.isDuplicate(fingerprint)) return;
    report.fingerprint = fingerprint;
    reportManager.add({
      priority: ReportPriority.HIGH,
      data: report,
      timestamp: Date.now(),
    });
    this.storeToSession(fingerprint);
  }

  private generateFingerprint(report: ErrorReport): string {
    const lines = (report.stack ?? '').split('\n').slice(0, 3).join('\n');
    return `${report.type}:${report.message}:${lines}:${report.source ?? ''}`;
  }

  private isDuplicate(fingerprint: string): boolean {
    const now = Date.now();
    const last = this.dedupCache.get(fingerprint);
    if (last && now - last < DEDUP_WINDOW_MS) return true;
    const stored = this.loadFromSession(fingerprint);
    if (stored && now - stored < DEDUP_WINDOW_MS) return true;
    this.dedupCache.set(fingerprint, now);
    this.dedupOrder.push(fingerprint);
    if (this.dedupOrder.length > DEDUP_CACHE_MAX) {
      const oldest = this.dedupOrder.shift();
      if (oldest) this.dedupCache.delete(oldest);
    }
    return false;
  }

  private storeToSession(fingerprint: string): void {
    try {
      const map = this.getSessionDedupMap();
      map[fingerprint] = Date.now();
      const entries = Object.entries(map);
      if (entries.length > 100) {
        entries.sort((a, b) => a[1] - b[1]);
        const trimmed = Object.fromEntries(entries.slice(-50));
        sessionStorage.setItem('__monitor_dedup', JSON.stringify(trimmed));
      } else {
        sessionStorage.setItem('__monitor_dedup', JSON.stringify(map));
      }
    } catch {
      // sessionStorage may be full or unavailable
    }
  }

  private loadFromSession(fingerprint: string): number | null {
    try {
      const map = this.getSessionDedupMap();
      return map[fingerprint] ?? null;
    } catch {
      return null;
    }
  }

  private getSessionDedupMap(): Record<string, number> {
    try {
      const raw = sessionStorage.getItem('__monitor_dedup');
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }
}

export const errorMonitor = new ErrorMonitor();
