export interface MaskRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

const DEFAULT_MASK_RULES: MaskRule[] = [
  {
    name: 'phone',
    pattern: /\b(\d{3})\d{4}(\d{4})\b/g,
    replacement: '$1****$2',
    description: 'Mask phone numbers',
  },
  {
    name: 'email',
    pattern: /\b([\w.-]{2})[\w.-]+@([\w.-]+\.\w{2,})\b/g,
    replacement: '$1***@$2',
    description: 'Mask email addresses',
  },
  {
    name: 'credit-card',
    pattern: /\b(\d{4}[ -]?\d{4}[ -]?\d{4})[ -]?\d{4}\b/g,
    replacement: '$1 ****',
    description: 'Mask credit card numbers',
  },
  {
    name: 'id-card',
    pattern: /\b(\d{6})\d{8}(\d{4})\b/g,
    replacement: '$1********$2',
    description: 'Mask Chinese ID card numbers',
  },
  {
    name: 'ip-address',
    pattern: /\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '$1.x.x',
    description: 'Mask IP addresses',
  },
  {
    name: 'api-key',
    pattern: /\b(sk-[a-zA-Z0-9]{16})[a-zA-Z0-9]+\b/g,
    replacement: '$1...',
    description: 'Mask API keys',
  },
];

export interface MaskResult {
  masked: string;
  appliedRules: string[];
  matchCounts: Record<string, number>;
}

export function maskPII(text: string, rules: MaskRule[] = DEFAULT_MASK_RULES): MaskResult {
  let masked = text;
  const appliedRules: string[] = [];
  const matchCounts: Record<string, number> = {};

  for (const rule of rules) {
    const matches = masked.match(rule.pattern);
    if (matches) {
      appliedRules.push(rule.name);
      matchCounts[rule.name] = matches.length;
      masked = masked.replace(rule.pattern, rule.replacement);
    }
  }

  return { masked, appliedRules, matchCounts };
}

export function getMaskRules(): MaskRule[] {
  return [...DEFAULT_MASK_RULES];
}

export function addMaskRule(rule: MaskRule): void {
  DEFAULT_MASK_RULES.push(rule);
}
