import { type ReportItem, ReportPriority } from './types.ts';

const FLUSH_INTERVAL_MS = 3000;
const MAX_BATCH_SIZE = 50;
const SEND_BEACON_SIZE_LIMIT = 65536;
const DEDUP_WINDOW_MS = 5000;
const DEDUP_CACHE_MAX = 500;

function generateFingerprint(data: unknown): string {
  const obj = data as Record<string, unknown>;
  const type = String(obj.type ?? '');
  const message = String(obj.message ?? '');
  const source = String(obj.source ?? '');
  return `${type}:${message}:${source}`;
}

export class ReportManager {
  private buffer: ReportItem[] = [];
  private isFlushing = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private dedupCache = new Map<string, number>();
  private dedupOrder: string[] = [];

  add(item: ReportItem): void {
    if (item.priority === ReportPriority.HIGH) {
      this.immediateReport(item.data);
      return;
    }

    this.buffer.push(item);
    this.scheduleFlush();
  }

  private immediateReport(data: unknown): void {
    if (!navigator.sendBeacon) {
      this.fetchFallback(data);
      return;
    }

    const payload = JSON.stringify(data);
    if (new Blob([payload]).size > SEND_BEACON_SIZE_LIMIT) {
      this.chunkedSend(data);
      return;
    }

    const sent = navigator.sendBeacon('/api/monitor/report', payload);
    if (!sent) {
      this.fetchFallback(data);
    }
  }

  private chunkedSend(data: unknown): void {
    const payload = JSON.stringify(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(payload);
    const chunkSize = 32768;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      const blob = new Blob([chunk], { type: 'application/octet-stream' });
      navigator.sendBeacon('/api/monitor/report', blob);
    }
  }

  private fetchFallback(data: unknown): void {
    fetch('/api/monitor/report', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => undefined);
  }

  private scheduleFlush(): void {
    if (this.isFlushing) return;

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.flush(), { timeout: FLUSH_INTERVAL_MS });
    } else {
      this.flushTimer ??= setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, 2000);
    }
  }

  private flush(): void {
    this.isFlushing = true;
    const items = this.buffer.splice(0, MAX_BATCH_SIZE);
    if (items.length === 0) {
      this.isFlushing = false;
      return;
    }

    const deduped = items.filter((item) => {
      const fingerprint = generateFingerprint(item.data);
      return !this.isDuplicate(fingerprint);
    });

    if (deduped.length > 0) {
      const payload = JSON.stringify(deduped.map((i) => i.data));

      if (navigator.sendBeacon) {
        if (new Blob([payload]).size > SEND_BEACON_SIZE_LIMIT) {
          this.chunkedSend(deduped.map((i) => i.data));
        } else {
          navigator.sendBeacon('/api/monitor/report', payload);
        }
      } else {
        this.fetchFallback(deduped.map((i) => i.data));
      }
    }

    this.isFlushing = false;

    if (this.buffer.length > 0) {
      this.scheduleFlush();
    }
  }

  private isDuplicate(fingerprint: string): boolean {
    const now = Date.now();
    const last = this.dedupCache.get(fingerprint);

    if (last && now - last < DEDUP_WINDOW_MS) {
      return true;
    }

    this.dedupCache.set(fingerprint, now);
    this.dedupOrder.push(fingerprint);

    if (this.dedupOrder.length > DEDUP_CACHE_MAX) {
      const oldest = this.dedupOrder.shift();
      if (oldest) {
        this.dedupCache.delete(oldest);
      }
    }

    return false;
  }

  flushImmediate(): void {
    if (this.buffer.length === 0) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

export const reportManager = new ReportManager();
