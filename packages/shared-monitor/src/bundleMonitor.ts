import { useMonitorStore } from './store.ts';
import { reportManager } from './reportManager.ts';
import { ReportPriority } from './types.ts';

interface BundleChunk {
  name: string;
  type: 'script' | 'style';
  duration: number;
  transferSize: number;
  decodedSize: number;
  startTime: number;
}

interface BundleReport {
  type: 'bundle';
  totalLoadTime: number;
  totalTransferSize: number;
  totalDecodedSize: number;
  chunkCount: number;
  jsCount: number;
  cssCount: number;
  jsTotalSize: number;
  cssTotalSize: number;
  largestChunk: { name: string; size: number; duration: number } | null;
  slowChunks: BundleChunk[];
  chunks: BundleChunk[];
  url: string;
  timestamp: number;
}

const SLOW_CHUNK_THRESHOLD_MS = 500;
const SCRIPT_EXT = /\.(js|mjs|cjs)(\?|$)/;
const CSS_EXT = /\.css(\?|$)/;

function getModuleName(url: string): string {
  try {
    const u = new URL(url, window.location.href);
    const path = u.pathname;
    const parts = path.split('/');
    let name = parts.pop() || parts.pop() || path;
    name = name.replace(/\.(js|mjs|cjs|css)(\?.*)?$/, '');
    if (name === 'index' && parts.length > 0) {
      name = parts[parts.length - 1];
    }
    return name || 'unknown';
  } catch {
    return url.split('/').pop()?.split('?')[0] || 'unknown';
  }
}

export class BundleMonitor {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (document.readyState === 'complete') {
      this.collect();
    } else {
      window.addEventListener('load', () => this.collect(), { once: true });
    }
  }

  private collect(): void {
    const chunks = this.getBundleChunks();
    if (chunks.length === 0) return;

    const jsChunks = chunks.filter((c) => c.type === 'script');
    const cssChunks = chunks.filter((c) => c.type === 'style');
    const jsTotalSize = jsChunks.reduce((s, c) => s + c.transferSize, 0);
    const cssTotalSize = cssChunks.reduce((s, c) => s + c.transferSize, 0);
    const totalTransferSize = jsTotalSize + cssTotalSize;
    const totalDecodedSize = chunks.reduce((s, c) => s + c.decodedSize, 0);
    const slowChunks = chunks.filter((c) => c.duration > SLOW_CHUNK_THRESHOLD_MS);
    const totalLoadTime = this.getTotalLoadTime();

    const sorted = [...chunks].sort((a, b) => b.transferSize - a.transferSize);
    const largest = sorted.length > 0
      ? { name: sorted[0].name, size: sorted[0].transferSize, duration: sorted[0].duration }
      : null;

    const report: BundleReport = {
      type: 'bundle',
      totalLoadTime,
      totalTransferSize,
      totalDecodedSize,
      chunkCount: chunks.length,
      jsCount: jsChunks.length,
      cssCount: cssChunks.length,
      jsTotalSize,
      cssTotalSize,
      largestChunk: largest,
      slowChunks: slowChunks.slice(0, 10),
      chunks: this.trimChunks(chunks, 20),
      url: window.location.pathname,
      timestamp: Date.now(),
    };

    const chunkEntries = this.trimChunks(chunks, 30).map((c) => ({
      name: c.name,
      type: c.type,
      duration: c.duration,
      transferSize: c.transferSize,
      decodedSize: c.decodedSize,
    }));

    useMonitorStore.getState().addBundleReport({
      totalLoadTime,
      totalTransferSize,
      chunkCount: chunks.length,
      jsCount: jsChunks.length,
      cssCount: cssChunks.length,
      largestChunk: largest,
      chunks: chunkEntries,
      timestamp: Date.now(),
    });

    reportManager.add({
      priority: ReportPriority.LOW,
      data: report,
      timestamp: Date.now(),
    });
  }

  private getBundleChunks(): BundleChunk[] {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter((r) => {
        const name = r.name;
        if (!name) return false;
        if (r.initiatorType === 'script' && SCRIPT_EXT.test(name)) return true;
        if (r.initiatorType === 'link' && CSS_EXT.test(name)) return true;
        return false;
      })
      .map((r) => ({
        name: getModuleName(r.name),
        type: r.initiatorType === 'link' ? 'style' as const : 'script' as const,
        duration: r.duration,
        transferSize: (r as unknown as Record<string, number>).transferSize ?? 0,
        decodedSize: (r as unknown as Record<string, number>).decodedBodySize ?? 0,
        startTime: r.startTime,
      }));
  }

  private getTotalLoadTime(): number {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      return nav.loadEventEnd - nav.startTime;
    }
    const legacy = performance.timing as PerformanceTiming | undefined;
    if (legacy) {
      return legacy.loadEventEnd - legacy.navigationStart;
    }
    return 0;
  }

  private trimChunks(chunks: BundleChunk[], max: number): BundleChunk[] {
    if (chunks.length <= max) return chunks;
    const sorted = [...chunks].sort((a, b) => b.transferSize - a.transferSize);
    return [...sorted.slice(0, max), { name: `...and ${chunks.length - max} more`, type: 'script', duration: 0, transferSize: 0, decodedSize: 0, startTime: 0 }];
  }
}

export const bundleMonitor = new BundleMonitor();
