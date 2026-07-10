export interface TokenEstimate {
  tokens: number;
  chars: number;
  sources: Record<string, number>;
}

const TOKEN_PER_CHAR_CN = 1.5;
const TOKEN_PER_CHAR_EN = 0.25;
const TOKEN_PER_WORD_EN = 1.3;

function detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
  const total = text.length || 1;
  const ratio = cjkCount / total;
  if (ratio > 0.6) return 'zh';
  if (ratio < 0.1) return 'en';
  return 'mixed';
}

export function estimateTokens(text: string): TokenEstimate {
  const chars = text.length;
  const lang = detectLanguage(text);
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
  const enChars = chars - cjkChars;
  const enWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  let tokens: number;
  let sources: Record<string, number> = {};

  if (lang === 'zh') {
    tokens = Math.ceil(chars * TOKEN_PER_CHAR_CN);
    sources = { cjk: Math.ceil(cjkChars * TOKEN_PER_CHAR_CN) };
  } else if (lang === 'en') {
    tokens = Math.ceil(enWords * TOKEN_PER_WORD_EN + enChars * TOKEN_PER_CHAR_EN);
    sources = {
      words: Math.ceil(enWords * TOKEN_PER_WORD_EN),
      chars: Math.ceil(enChars * TOKEN_PER_CHAR_EN),
    };
  } else {
    const cjkTokens = Math.ceil(cjkChars * TOKEN_PER_CHAR_CN);
    const enTokens = Math.ceil(enWords * TOKEN_PER_WORD_EN + enChars * TOKEN_PER_CHAR_EN);
    tokens = cjkTokens + enTokens;
    sources = { cjk: cjkTokens, en: enTokens };
  }

  return { tokens, chars, sources };
}

export function estimateMessages(messages: Array<{ role: string; content: string }>): {
  totalTokens: number;
  messageBreakdown: Array<{ role: string; tokens: number; chars: number }>;
} {
  const messageBreakdown = messages.map((m) => {
    const est = estimateTokens(m.content);
    return { role: m.role, tokens: est.tokens, chars: est.chars };
  });
  const totalTokens = messageBreakdown.reduce((sum, m) => sum + m.tokens, 0);
  return { totalTokens, messageBreakdown };
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  return `${(tokens / 1000).toFixed(1)}k`;
}

export const MAX_CONTEXT_TOKENS = 8192;
export const MAX_RESPONSE_TOKENS = 2048;
export const TOKEN_WARNING_THRESHOLD = 0.8;
export const TOKEN_CRITICAL_THRESHOLD = 0.95;
