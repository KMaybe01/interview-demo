import { estimateTokens } from './token-estimator.ts';

export interface ContextBudget {
  maxTokens: number;
  maxMessages: number;
  systemReserved: number;
  responseReserved: number;
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  maxTokens: 8192,
  maxMessages: 50,
  systemReserved: 1024,
  responseReserved: 2048,
};

export interface Message {
  role: string;
  content: string;
}

export interface ContextInfo {
  totalTokens: number;
  availableTokens: number;
  messageCount: number;
  usagePercent: number;
  isTruncated: boolean;
  truncationStrategy: string;
}

export function calculateContextUsage(
  messages: Message[],
  systemPrompt: string,
  budget: ContextBudget = DEFAULT_CONTEXT_BUDGET,
): ContextInfo {
  const systemTokens = estimateTokens(systemPrompt).tokens;
  const messageTokens = estimateTokens(messages.map((m) => m.content).join('\n')).tokens;
  const totalTokens = systemTokens + messageTokens;
  const availableTokens = budget.maxTokens - budget.systemReserved - budget.responseReserved;
  const usagePercent = Math.min(100, Math.round((totalTokens / availableTokens) * 100));

  return {
    totalTokens,
    availableTokens,
    messageCount: messages.length,
    usagePercent,
    isTruncated: totalTokens > availableTokens,
    truncationStrategy: totalTokens > availableTokens ? 'sliding-window' : 'none',
  };
}

export type TruncationStrategy = 'sliding-window' | 'summary-pivot' | 'drop-oldest';

export function truncateMessages(
  messages: Message[],
  maxTokens: number,
  strategy: TruncationStrategy = 'sliding-window',
): Message[] {
  if (messages.length === 0) return messages;

  const systemMessages = messages.filter((m) => m.role === 'system');
  const historyMessages = messages.filter((m) => m.role !== 'system');

  if (strategy === 'drop-oldest') {
    let tokens = estimateTokens(systemMessages.map((m) => m.content).join('\n')).tokens;
    const result = [...systemMessages];
    for (const msg of [...historyMessages].reverse()) {
      const msgTokens = estimateTokens(msg.content).tokens;
      if (tokens + msgTokens > maxTokens) break;
      tokens += msgTokens;
      result.push(msg);
    }
    result.push(...historyMessages.slice(0, 1)); // keep the last user message
    return result;
  }

  if (strategy === 'summary-pivot') {
    const recent = historyMessages.slice(-6);
    const olderTokens = estimateTokens(
      historyMessages
        .slice(0, -6)
        .map((m) => m.content)
        .join('\n'),
    ).tokens;
    const pivotMsg: Message = {
      role: 'system',
      content: `[Earlier conversation summarized: ~${Math.ceil(olderTokens)} tokens omitted]`,
    };
    return [...systemMessages, pivotMsg, ...recent];
  }

  // sliding-window: keep newest messages up to maxTokens
  const systemContent = systemMessages.map((m) => m.content).join('\n');
  let tokenBudget = maxTokens - estimateTokens(systemContent).tokens;
  const window: Message[] = [];

  for (const msg of [...historyMessages].reverse()) {
    const msgTokens = estimateTokens(msg.content).tokens;
    if (tokenBudget - msgTokens < 0) break;
    tokenBudget -= msgTokens;
    window.unshift(msg);
  }

  return [...systemMessages, ...window];
}
