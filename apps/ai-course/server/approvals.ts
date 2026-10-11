/**
 * HITL 审批工单（教学版）。对齐 backend/internal/tool/sandbox.go：
 *   - 工单 ID：apr_<纳秒>
 *   - TTL 默认 10 分钟，过期自动清理（查询时清理）
 *   - Resolve 成功后直接删除工单（一次性票据，而非持久状态机）
 *   - 审批结果只体现在响应里，前端需自行把 toolCallId 计入 approvedToolCalls 重发
 */

export interface Approval {
  id: string;
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  level: 'L2';
  reason: string;
  expiresAt: number;
}

const APPROVAL_TTL_MS = 10 * 60 * 1000;
const approvals = new Map<string, Approval>();
let approvalSequence = 0;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, approval] of approvals) {
    if (approval.expiresAt < now) approvals.delete(id);
  }
}

export function createApproval(call: {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason?: string;
}): Approval {
  approvalSequence += 1;
  const approval: Approval = {
    id: `apr_${Date.now()}_${approvalSequence}`,
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    arguments: call.arguments,
    level: 'L2',
    reason: call.reason ?? '该操作不可逆，需要人工确认',
    expiresAt: Date.now() + APPROVAL_TTL_MS,
  };
  approvals.set(approval.id, approval);
  return approval;
}

export function listApprovals(): Approval[] {
  cleanupExpired();
  return [...approvals.values()];
}

export function resolveApproval(
  id: string,
  approve: boolean,
): { ok: true; approved: boolean } | { error: string } {
  cleanupExpired();
  const approval = approvals.get(id);
  if (!approval) return { error: '工单不存在或已过期' };
  approvals.delete(id);
  return { ok: true, approved: approve };
}

/** 供演示：清空全部工单 */
export function resetApprovals(): void {
  approvals.clear();
}
