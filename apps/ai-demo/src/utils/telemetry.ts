export interface TelemetryEvent {
  type: string;
  timestamp: number;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface TelemetrySummary {
  totalRequests: number;
  totalErrors: number;
  avgLatency: number;
  p95Latency: number;
  eventsByType: Record<string, number>;
}

class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private maxEvents: number = 1000;

  setMaxEvents(max: number): void {
    this.maxEvents = max;
    if (this.events.length > max) {
      this.events = this.events.slice(-max);
    }
  }

  track(type: string, metadata: Record<string, unknown> = {}, duration?: number): void {
    this.events.push({ type, timestamp: Date.now(), duration, metadata });
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  trackAsync<T>(
    type: string,
    fn: () => Promise<T>,
    metadata: Record<string, unknown> = {},
  ): Promise<T> {
    const start = performance.now();
    return fn()
      .then((result) => {
        this.track(type, { ...metadata, success: true }, performance.now() - start);
        return result;
      })
      .catch((error) => {
        this.track(
          type,
          { ...metadata, success: false, error: String(error) },
          performance.now() - start,
        );
        throw error;
      });
  }

  getEvents(type?: string, limit: number = 50): TelemetryEvent[] {
    const filtered = type ? this.events.filter((e) => e.type === type) : [...this.events];
    return filtered.slice(-limit).reverse();
  }

  getSummary(): TelemetrySummary {
    const requestEvents = this.events.filter((e) => e.type === 'llm-request');
    const errorEvents = this.events.filter((e) => e.metadata.success === false);
    const latencies: number[] = [];
    for (const e of requestEvents) {
      if (e.duration !== undefined) latencies.push(e.duration);
    }
    const totalRequests = requestEvents.length;
    const totalErrors = errorEvents.length;
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95Latency = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const eventsByType: Record<string, number> = {};
    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
    }

    return { totalRequests, totalErrors, avgLatency, p95Latency, eventsByType };
  }

  clear(): void {
    this.events = [];
  }
}

export const telemetry = new TelemetryCollector();
