import { reportManager } from './reportManager.ts';
import { ReportPriority } from './types.ts';

export class PerformanceMonitor {
  private initialized = false;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.collectResourceTiming();
    this.intervalTimer = setInterval(() => {
      this.collectResourceTiming();
    }, 60000);
  }

  destroy(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private collectResourceTiming(): void {
    if (typeof performance.getEntriesByType !== 'function') return;

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      reportManager.add({
        priority: ReportPriority.NORMAL,
        data: {
          type: 'performance',
          category: 'navigation',
          metrics: {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            tls: nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
            ttfb: nav.responseStart - nav.requestStart,
            domInteractive: nav.domInteractive,
            domComplete: nav.domComplete,
            loadEvent: nav.loadEventEnd - nav.loadEventStart,
          },
          url: window.location.pathname,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    if (resources.length === 0) return;

    const totalSize = resources.reduce(
      (sum, r) => sum + ((r as unknown as Record<string, number>).transferSize ?? 0),
      0,
    );
    const totalCount = resources.length;
    const failedCount = resources.filter(
      (r) => (r as unknown as Record<string, number>).responseStatus >= 400,
    ).length;

    reportManager.add({
      priority: ReportPriority.LOW,
      data: {
        type: 'performance',
        category: 'resource',
        metrics: { totalSize, totalCount, failedCount },
        url: window.location.pathname,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();
