import { search } from './rag.ts';

/**
 * 工具注册表（教学版）—— 每个工具必须显式声明三件事：
 *   1. level：副作用等级（L0 只读 / L1 可撤销写 / L2 不可逆写）
 *   2. timeoutMs：超时上限（超时返回结构化结果，而不是抛异常）
 *   3. idempotent：是否支持幂等重放
 *
 * 所有工具都通过 executeTool() 这个**统一入口**执行，
 * 这样审批、幂等、超时、审计只需要写一次。
 */

export type ToolLevel = 'L0' | 'L1' | 'L2';

export type AuditOutcome =
  | 'success'
  | 'failure'
  | 'blocked_permission'
  | 'blocked_injection'
  | 'blocked_rate_limit';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  level: ToolLevel;
  timeoutMs: number;
  idempotent: boolean;
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export const TOOLS: AgentTool[] = [
  {
    name: 'knowledge.search',
    description: '检索内部知识库（只读）',
    parameters: { query: 'string' },
    level: 'L0',
    timeoutMs: 1500,
    idempotent: true,
    async execute(args) {
      const hits = search(String(args.query ?? ''), 3);
      return { hits: hits.map((h) => ({ id: h.id, score: h.score, text: h.text.slice(0, 80) })) };
    },
  },
  {
    name: 'weather.query',
    description: '查询城市天气（只读，外部 API）',
    parameters: { city: 'string' },
    level: 'L0',
    timeoutMs: 2000,
    idempotent: true,
    async execute(args) {
      return { city: String(args.city ?? ''), weather: '晴 26℃', source: 'demo' };
    },
  },
  {
    name: 'notify.email',
    description: '发送邮件（**不可逆**，必须人工审批）',
    parameters: { to: 'string', subject: 'string' },
    level: 'L2',
    timeoutMs: 3000,
    idempotent: true,
    async execute(args) {
      return { sent: true, to: String(args.to ?? ''), subject: String(args.subject ?? '') };
    },
  },
  {
    name: 'tickets.create',
    description: '创建工单（**不可逆**，必须人工审批）',
    parameters: { title: 'string' },
    level: 'L2',
    timeoutMs: 3000,
    idempotent: true,
    async execute(args) {
      return { ticketId: `T-${Date.now().toString(36)}`, title: String(args.title ?? '') };
    },
  },
];

export function findTool(name: string): AgentTool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

/** 审计：环形缓冲 + 字段截断，避免内存无界（对齐 backend/internal/tool/audit.go） */
const AUDIT_CAP = 200;

export interface AuditEntry {
  id: string;
  time: number;
  tool: string;
  level: ToolLevel;
  outcome: AuditOutcome;
  args: string;
  detail: string;
  durationMs: number;
}

const auditLog: AuditEntry[] = [];
let auditSequence = 0;

export function audit(entry: Omit<AuditEntry, 'id' | 'time'>): void {
  auditSequence += 1;
  auditLog.push({
    id: `aud_${auditSequence}`,
    time: Date.now(),
    ...entry,
    args: entry.args.slice(0, 200),
    detail: entry.detail.slice(0, 500),
  });
  if (auditLog.length > AUDIT_CAP) auditLog.shift();
}

export function listAudit(): AuditEntry[] {
  return [...auditLog].reverse();
}

const idempotencyStore = new Map<string, { result: unknown; expiresAt: number }>();

export interface ExecuteContext {
  /** 本次请求已批准的工具名（HITL 结果） */
  approved: string[];
  idempotencyKey?: string;
}

export type ExecuteResult =
  | { status: 'ok'; result: unknown }
  | { status: 'approval_required'; tool: string; level: ToolLevel }
  | { status: 'timeout'; tool: string }
  | { status: 'error'; tool: string; message: string };

/** 统一执行入口：审批 → 幂等 → 超时 → 审计。 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ExecuteResult> {
  const tool = findTool(name);
  if (!tool) return { status: 'error', tool: name, message: `工具不存在：${name}` };

  // ① 权限分级：不可逆操作必须审批
  if (tool.level === 'L2' && !ctx.approved.includes(tool.name)) {
    audit({
      tool: name,
      level: tool.level,
      outcome: 'blocked_permission',
      args: JSON.stringify(args),
      detail: 'L2 不可逆操作，未审批',
      durationMs: 0,
    });
    return { status: 'approval_required', tool: name, level: tool.level };
  }

  // ② 幂等：命中直接回放
  const key = ctx.idempotencyKey ? `${tool.name}:${ctx.idempotencyKey}` : undefined;
  if (tool.idempotent && key) {
    const cached = idempotencyStore.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      audit({
        tool: name,
        level: tool.level,
        outcome: 'success',
        args: JSON.stringify(args),
        detail: '幂等回放',
        durationMs: 0,
      });
      return { status: 'ok', result: cached.result };
    }
  }

  // ③ 超时：返回结构化超时结果，而不是抛异常
  const startedAt = Date.now();
  try {
    const result = await withTimeout(tool.timeoutMs, () => tool.execute(args));
    const durationMs = Date.now() - startedAt;
    if (key) idempotencyStore.set(key, { result, expiresAt: Date.now() + 10 * 60 * 1000 });
    audit({
      tool: name,
      level: tool.level,
      outcome: 'success',
      args: JSON.stringify(args),
      detail: JSON.stringify(result).slice(0, 200),
      durationMs,
    });
    return { status: 'ok', result };
  } catch (error) {
    const message = (error as Error).message;
    audit({
      tool: name,
      level: tool.level,
      outcome: 'failure',
      args: JSON.stringify(args),
      detail: message,
      durationMs: Date.now() - startedAt,
    });
    return { status: 'error', tool: name, message };
  }
}

async function withTimeout<T>(ms: number, run: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`工具超时（${ms}ms）`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
