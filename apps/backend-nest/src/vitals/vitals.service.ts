import { Injectable } from '@nestjs/common';

export interface VitalsRecord {
  metric: string;
  value: number;
  rating: string;
  url: string;
  timestamp: number;
}

export interface VitalsSummary {
  metric: string;
  value: number;
  rating: string;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface TelemetryReport {
  requests: number;
  errors: number;
  avgLatency: number;
  cacheHitRate: number;
  timestamp?: number;
}

export interface PageRecord {
  path: string;
  pageName: string;
  renderDuration: number;
  lcp: number;
  inp: number;
  cls: number;
  referrer: string;
  timestamp: number;
}

@Injectable()
export class VitalsService {
  private vitalsStore: VitalsRecord[] = [];
  private telemetryStore: TelemetryReport[] = [];
  private pageStore: PageRecord[] = [];
  private readonly vitalsMax = 2000;
  private readonly telemetryMax = 500;
  private readonly pageMax = 1000;

  reportVitals(reports: any[]) {
    const now = Date.now();
    for (const r of reports) {
      this.vitalsStore.push({
        metric: r.metric,
        value: Math.round(r.value * 100) / 100,
        rating: r.rating,
        url: r.url,
        timestamp: now,
      });
    }
    if (this.vitalsStore.length > this.vitalsMax) {
      this.vitalsStore = this.vitalsStore.slice(-this.vitalsMax);
    }
    return { ok: true, count: reports.length };
  }

  vitalsSummaryReport() {
    const latest = new Map<string, VitalsRecord>();
    const agg = new Map<string, { sum: number; min: number; max: number; count: number }>();

    for (const rec of this.vitalsStore) {
      latest.set(rec.metric, rec);
      const a = agg.get(rec.metric) || { sum: 0, min: rec.value, max: rec.value, count: 0 };
      a.sum += rec.value;
      a.count++;
      if (rec.value < a.min) a.min = rec.value;
      if (rec.value > a.max) a.max = rec.value;
      agg.set(rec.metric, a);
    }

    const summary: VitalsSummary[] = [];
    for (const [metric, rec] of latest) {
      const a = agg.get(metric)!;
      summary.push({
        metric,
        value: rec.value,
        rating: rec.rating,
        min: Math.round(a.min * 100) / 100,
        max: Math.round(a.max * 100) / 100,
        avg: Math.round((a.sum / a.count) * 100) / 100,
        count: a.count,
      });
    }
    return summary;
  }

  vitalsHistory() {
    const grouped: Record<string, { t: number; v: number; rating: string }[]> = {};
    for (const rec of this.vitalsStore) {
      const key = rec.metric;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ t: rec.timestamp, v: rec.value, rating: rec.rating });
    }
    return grouped;
  }

  reportTelemetry(report: TelemetryReport) {
    report.timestamp = Date.now();
    this.telemetryStore.push(report);
    if (this.telemetryStore.length > this.telemetryMax) {
      this.telemetryStore = this.telemetryStore.slice(-this.telemetryMax);
    }
    return { ok: true };
  }

  getTelemetryHistory() {
    return [...this.telemetryStore];
  }

  getTelemetrySummary() {
    if (this.telemetryStore.length === 0) {
      return { totalRequests: 0, totalErrors: 0, avgLatency: 0, cacheHitRate: 0, count: 0 };
    }

    const total = this.telemetryStore.reduce(
      (acc, r) => {
        acc.requests += r.requests;
        acc.errors += r.errors;
        acc.latency += r.avgLatency;
        acc.cache += r.cacheHitRate;
        return acc;
      },
      { requests: 0, errors: 0, latency: 0, cache: 0 },
    );

    const n = this.telemetryStore.length;
    const last = this.telemetryStore[this.telemetryStore.length - 1];

    return {
      totalRequests: total.requests,
      totalErrors: total.errors,
      avgLatency: Math.round((total.latency / n) * 100) / 100,
      cacheHitRate: Math.round((total.cache / n) * 100) / 100,
      latest: last,
      count: n,
    };
  }

  reportPage(reports: any[]) {
    const now = Date.now();
    for (const r of reports) {
      this.pageStore.push({
        path: r.path,
        pageName: r.pageName,
        renderDuration: Math.round(r.renderDuration * 100) / 100,
        lcp: r.lcp || 0,
        inp: r.inp || 0,
        cls: r.cls || 0,
        referrer: r.referrer || '',
        timestamp: now,
      });
    }
    if (this.pageStore.length > this.pageMax) {
      this.pageStore = this.pageStore.slice(-this.pageMax);
    }
    return { ok: true, count: reports.length };
  }

  pageSummaryReport() {
    const agg = new Map<
      string,
      {
        count: number;
        sum: number;
        min: number;
        max: number;
        sumLCP: number;
        sumINP: number;
        sumCLS: number;
        latestLCP: number;
        latestINP: number;
        latestCLS: number;
        last: number;
        name: string;
      }
    >();
    const order: string[] = [];

    for (const rec of this.pageStore) {
      let a = agg.get(rec.path);
      if (!a) {
        a = {
          count: 0,
          sum: 0,
          min: rec.renderDuration,
          max: rec.renderDuration,
          sumLCP: 0,
          sumINP: 0,
          sumCLS: 0,
          latestLCP: 0,
          latestINP: 0,
          latestCLS: 0,
          last: 0,
          name: rec.pageName,
        };
        agg.set(rec.path, a);
        order.push(rec.path);
      }
      a.count++;
      a.sum += rec.renderDuration;
      a.sumLCP += rec.lcp;
      a.sumINP += rec.inp;
      a.sumCLS += rec.cls;
      if (rec.lcp > 0) a.latestLCP = rec.lcp;
      if (rec.inp > 0) a.latestINP = rec.inp;
      if (rec.cls > 0) a.latestCLS = rec.cls;
      if (rec.renderDuration < a.min) a.min = rec.renderDuration;
      if (rec.renderDuration > a.max) a.max = rec.renderDuration;
      if (rec.timestamp > a.last) {
        a.last = rec.timestamp;
        a.name = rec.pageName;
      }
    }

    return order.map((path) => {
      const a = agg.get(path)!;
      return {
        path,
        pageName: a.name,
        visits: a.count,
        avgRenderMs: Math.round((a.sum / a.count) * 100) / 100,
        minRenderMs: a.min,
        maxRenderMs: a.max,
        avgLCP: Math.round((a.sumLCP / a.count) * 100) / 100,
        avgINP: Math.round((a.sumINP / a.count) * 100) / 100,
        avgCLS: Math.round((a.sumCLS / a.count) * 100) / 100,
        latestLCP: Math.round(a.latestLCP * 100) / 100,
        latestINP: Math.round(a.latestINP * 100) / 100,
        latestCLS: Math.round(a.latestCLS * 100) / 100,
        lastVisit: a.last,
      };
    });
  }

  pageHistory() {
    const grouped: Record<
      string,
      {
        t: number;
        renderDuration: number;
        lcp: number;
        inp: number;
        cls: number;
        referrer: string;
      }[]
    > = {};
    for (const rec of this.pageStore) {
      const key = rec.path;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        t: rec.timestamp,
        renderDuration: rec.renderDuration,
        lcp: rec.lcp,
        inp: rec.inp,
        cls: rec.cls,
        referrer: rec.referrer,
      });
    }
    return grouped;
  }
}
