import { describe, expect, it } from 'vitest';
import { estimateCost, formatUsd, sumUsage } from '../../shared/cost.ts';

describe('estimateCost', () => {
  it('按每百万 token 单价折算成本', () => {
    const cost = estimateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'smart');
    expect(cost.input).toBe(2.5);
    expect(cost.output).toBe(10);
    expect(cost.total).toBe(12.5);
  });

  it('缺少 usage 字段时按 0 处理，不抛错', () => {
    const cost = estimateCost({}, 'fast');
    expect(cost).toEqual({ input: 0, output: 0, total: 0 });
  });

  it('离线档不计费', () => {
    const cost = estimateCost({ inputTokens: 500, outputTokens: 500 }, 'offline');
    expect(cost.total).toBe(0);
  });
});

describe('formatUsd', () => {
  it('零值直接显示 $0', () => {
    expect(formatUsd(0)).toBe('$0');
  });

  it('极小金额保留 6 位小数', () => {
    expect(formatUsd(0.000123)).toBe('$0.000123');
  });
});

describe('sumUsage', () => {
  it('累加多轮调用的用量', () => {
    const total = sumUsage([
      { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      { inputTokens: 5 },
    ]);
    expect(total).toEqual({ inputTokens: 15, outputTokens: 20, totalTokens: 30 });
  });
});
