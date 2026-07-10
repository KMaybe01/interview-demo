export interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private defaultTtl: number;

  constructor(maxSize: number = 100, defaultTtlMs: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtlMs;
  }

  private makeKey(prompt: string, model: string, params?: Record<string, unknown>): string {
    const paramStr = params ? JSON.stringify(Object.entries(params).sort()) : '';
    return `${model}::${prompt.trim().toLowerCase()}::${paramStr}`;
  }

  get(prompt: string, model: string, params?: Record<string, unknown>): string | null {
    const key = this.makeKey(prompt, model, params);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.response;
  }

  set(
    prompt: string,
    model: string,
    response: string,
    ttl?: number,
    params?: Record<string, unknown>,
  ): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.entries().next();
      if (oldest.value) this.cache.delete(oldest.value[0]);
    }

    const key = this.makeKey(prompt, model, params);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      hitCount: 0,
    });
  }

  invalidate(model?: string): void {
    if (model) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${model}::`)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  stats(): { size: number; maxSize: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) totalHits += entry.hitCount;
    return { size: this.cache.size, maxSize: this.maxSize, totalHits };
  }
}

export const responseCache = new ResponseCache();
