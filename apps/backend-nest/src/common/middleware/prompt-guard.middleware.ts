import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

interface PromptMatch {
  pattern: string;
  label: string;
}

const INJECTION_PATTERNS: PromptMatch[] = [
  { pattern: 'ignore all previous instructions', label: 'prompt_injection' },
  { pattern: 'ignore all previous', label: 'prompt_injection' },
  { pattern: 'forget all previous', label: 'prompt_injection' },
  { pattern: 'disregard all previous', label: 'prompt_injection' },
  { pattern: '你是一个', label: 'role_override_cn' },
  { pattern: '你现在是', label: 'role_override_cn' },
  { pattern: 'system prompt', label: 'system_prompt_leak' },
  { pattern: '你被设定为', label: 'role_override_cn' },
  { pattern: '你是', label: 'role_override_cn' },
  { pattern: 'print your instructions', label: 'instruction_leak' },
  { pattern: 'output your prompt', label: 'instruction_leak' },
  { pattern: 'reveal your prompt', label: 'instruction_leak' },
  { pattern: 'DAN', label: 'jailbreak' },
  { pattern: 'do anything now', label: 'jailbreak' },
  { pattern: 'you are free', label: 'jailbreak' },
  { pattern: 'jailbreak', label: 'jailbreak_ref' },
];

@Injectable()
export class PromptGuardMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.method !== 'POST') {
      next();
      return;
    }

    const bodyStr = JSON.stringify(req.body).toLowerCase();
    const detected: { pattern: string; label: string }[] = [];

    for (const pm of INJECTION_PATTERNS) {
      if (bodyStr.includes(pm.pattern.toLowerCase())) {
        detected.push({ pattern: pm.pattern, label: pm.label });
      }
    }

    if (detected.length > 0) {
      const content = (req.body as any)?.content || '';
      if (content.length === 0 || detected.length >= 2) {
        res.status(403).json({
          error: '请求被安全策略拦截',
          reason: 'detected_prompt_injection',
          matches: detected,
        });
        return;
      }
    }

    next();
  }
}
