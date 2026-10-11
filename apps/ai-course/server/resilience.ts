/**
 * 熔断 + 主备降级（教学版）。
 *
 * 阈值口径与 backend/internal/llm/resilience.go 对齐：
 * 连续失败 5 次 → open；冷却 30s → half-open；half-open 只放行 1 次探测。
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitStatus {
  id: string;
  state: CircuitState;
  failures: number;
  openedAt?: number;
  /** 距 half-open 还有多少毫秒（open 状态下） */
  retryAfterMs: number;
}

const DEFAULT_THRESHOLD = 5;
const DEFAULT_COOLDOWN_MS = 30_000;

interface Circuit {
  failures: number;
  state: CircuitState;
  openedAt?: number;
  probeInFlight: boolean;
}

export class CircuitBreaker {
  private readonly circuits = new Map<string, Circuit>();

  constructor(
    private readonly threshold = DEFAULT_THRESHOLD,
    private readonly cooldownMs = DEFAULT_COOLDOWN_MS,
  ) {}

  private get(id: string): Circuit {
    const existing = this.circuits.get(id);
    if (existing) return existing;
    const created: Circuit = { failures: 0, state: 'closed', probeInFlight: false };
    this.circuits.set(id, created);
    return created;
  }

  /** 当前是否可以把请求发给这个 provider */
  isUsable(id: string): boolean {
    const circuit = this.get(id);
    if (circuit.state === 'closed') return true;

    if (circuit.state === 'open') {
      if (Date.now() - (circuit.openedAt ?? 0) < this.cooldownMs) return false;
      circuit.state = 'half-open'; // 冷却结束 → 半开，放行一次探测
    }

    // half-open：只放行一个探测请求
    if (circuit.probeInFlight) return false;
    circuit.probeInFlight = true;
    return true;
  }

  recordSuccess(id: string): void {
    const circuit = this.get(id);
    circuit.failures = 0;
    circuit.state = 'closed';
    circuit.openedAt = undefined;
    circuit.probeInFlight = false;
  }

  recordFailure(id: string): void {
    const circuit = this.get(id);
    circuit.failures += 1;
    circuit.probeInFlight = false;
    if (circuit.state === 'half-open' || circuit.failures >= this.threshold) {
      circuit.state = 'open';
      circuit.openedAt = Date.now();
    }
  }

  /** 供前端/接口展示当前状态 */
  snapshot(id?: string): CircuitStatus[] {
    const ids = id ? [id] : [...this.circuits.keys()];
    return ids.map((key) => {
      const circuit = this.get(key);
      const elapsed = circuit.openedAt ? Date.now() - circuit.openedAt : 0;
      return {
        id: key,
        state: circuit.state,
        failures: circuit.failures,
        openedAt: circuit.openedAt,
        retryAfterMs: circuit.state === 'open' ? Math.max(0, this.cooldownMs - elapsed) : 0,
      };
    });
  }
}

/** 全局单例：教程里所有请求共用它，方便在 UI 上观察状态变化 */
export const breaker = new CircuitBreaker();

export interface Candidate {
  id: string;
  label: string;
}

/**
 * 主备降级链：按顺序尝试，全部不可用时返回降级结果而不是抛错。
 *
 * 与 Go 侧 ExecuteWithFallback 同构：主 → 备 → 离线兜底。
 */
export async function executeWithFallback<T>(
  candidates: Candidate[],
  call: (candidate: Candidate) => Promise<T>,
  degraded: () => T,
): Promise<{ value: T; used: string; degraded: boolean }> {
  for (const candidate of candidates) {
    if (!breaker.isUsable(candidate.id)) continue;
    try {
      const value = await call(candidate);
      breaker.recordSuccess(candidate.id);
      return { value, used: candidate.id, degraded: false };
    } catch {
      breaker.recordFailure(candidate.id);
    }
  }
  return { value: degraded(), used: 'offline-fallback', degraded: true };
}
