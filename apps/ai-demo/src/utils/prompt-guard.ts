export interface GuardResult {
  flagged: boolean;
  severity: 'safe' | 'suspicious' | 'malicious';
  categories: string[];
  matches: string[];
}

const INJECTION_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, category: 'instruction-override' },
  {
    pattern: /forget\s+(all\s+)?(prior|previous)\s+(instructions|prompts?)/i,
    category: 'instruction-override',
  },
  { pattern: /you\s+(are\s+)?(now|must)\s+(act\s+as|pretend|play\s+role)/i, category: 'role-play' },
  { pattern: /system\s+prompt/i, category: 'prompt-leak' },
  {
    pattern: /reveal\s+(your\s+)?(instructions|prompts?|system\s+message)/i,
    category: 'prompt-leak',
  },
  { pattern: /output\s+(above|the\s+above)\s+in\s+/i, category: 'output-control' },
  { pattern: /say\s+the\s+words?\s+["']/, category: 'forced-output' },
  { pattern: /DAN|do\s+anything\s+now/i, category: 'jailbreak' },
  {
    pattern: /you\s+(have\s+)?(no\s+)?(rules?|restrictions?|limits?|boundaries?)/i,
    category: 'jailbreak',
  },
  { pattern: /bypass\s+(your\s+)?(guidelines?|safet|rules?)/i, category: 'jailbreak' },
  { pattern: /roleplay|role-play/i, category: 'role-play' },
];

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(\d{3}-?){2}\d{4}\b/, category: 'phone' },
  { pattern: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/, category: 'email' },
  { pattern: /\b(?:\d[ -]*?){13,19}\b/, category: 'credit-card' },
  { pattern: /\b[A-Z]{2}\d{6}[A-Z\d]?\b/, category: 'passport' },
];

export function guardPrompt(input: string, checkSensitive: boolean = false): GuardResult {
  const categories: string[] = [];
  const matches: string[] = [];

  for (const { pattern, category } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      categories.push(category);
      const match = input.match(pattern);
      if (match) matches.push(match[0]);
    }
  }

  if (checkSensitive) {
    for (const { pattern, category } of SENSITIVE_PATTERNS) {
      if (pattern.test(input)) {
        categories.push(`sensitive-${category}`);
        const match = input.match(pattern);
        if (match) matches.push(match[0]);
      }
    }
  }

  let severity: GuardResult['severity'] = 'safe';
  if (categories.length > 0) {
    severity = categories.some((c) => c === 'jailbreak' || c === 'instruction-override')
      ? 'malicious'
      : 'suspicious';
  }

  return { flagged: categories.length > 0, severity, categories, matches };
}
