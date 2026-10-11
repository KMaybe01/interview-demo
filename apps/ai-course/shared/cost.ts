/** 一次 LLM 调用的 token 用量。字段可空，兼容各家返回值的差异。 */
export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/** 模型档位。业务侧按「任务难度」选档，而不是按厂商选型号。 */
export type ModelTier = 'fast' | 'smart' | 'offline';

export const TOKENS_PER_MILLION = 1_000_000;

/**
 * 价格表：**教学用示例值**，单位「美元 / 百万 token」。
 *
 * ⚠️ 这不是厂商报价。生产使用前请核对：
 *   1. 厂商当期公示价；
 *   2. 或你所用 Gateway 的 `/v1/models` 返回值。
 * 把它写死进账单系统之前，请先替换成自己的真实定价来源。
 */
export const SAMPLE_PRICING: Record<ModelTier, { input: number; output: number }> = {
  fast: { input: 0.25, output: 2 },
  smart: { input: 2.5, output: 10 },
  offline: { input: 0, output: 0 },
};

export interface CostBreakdown {
  input: number;
  output: number;
  total: number;
}

/** 按档位价格把 token 用量折算成美元成本。 */
export function estimateCost(usage: TokenUsage, tier: ModelTier): CostBreakdown {
  const price = SAMPLE_PRICING[tier] ?? SAMPLE_PRICING.offline;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const input = (inputTokens / TOKENS_PER_MILLION) * price.input;
  const output = (outputTokens / TOKENS_PER_MILLION) * price.output;
  return { input, output, total: input + output };
}

/** 金额格式化。单次对话费用通常远小于 1 美分，所以小金额保留更多小数位。 */
export function formatUsd(value: number): string {
  if (value === 0) return '$0';
  return value < 0.01 ? `$${value.toFixed(6)}` : `$${value.toFixed(4)}`;
}

/** 把多次调用的用量累加，用于展示一轮会话的累计开销。 */
export function sumUsage(usages: TokenUsage[]): Required<TokenUsage> {
  return usages.reduce<Required<TokenUsage>>(
    (acc, usage) => ({
      inputTokens: acc.inputTokens + (usage.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (usage.outputTokens ?? 0),
      totalTokens: acc.totalTokens + (usage.totalTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
}
