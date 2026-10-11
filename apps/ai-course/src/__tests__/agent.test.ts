import { beforeEach, describe, expect, it } from 'vitest';
import { runAgent } from '../../server/agent.ts';
import { listApprovals, resetApprovals } from '../../server/approvals.ts';
import { listAudit, TOOLS } from '../../server/tools.ts';

beforeEach(() => {
  resetApprovals();
});

describe('工具注册表', () => {
  it('L2 不可逆工具已显式分级', () => {
    const email = TOOLS.find((tool) => tool.name === 'notify.email');
    expect(email?.level).toBe('L2');
    const search = TOOLS.find((tool) => tool.name === 'knowledge.search');
    expect(search?.level).toBe('L0');
  });

  it('每个工具都声明了超时与幂等标志', () => {
    for (const tool of TOOLS) {
      expect(tool.timeoutMs).toBeGreaterThan(0);
      expect(typeof tool.idempotent).toBe('boolean');
    }
  });
});

describe('Agent 循环', () => {
  it('L0 任务一步收敛', async () => {
    const result = await runAgent({ task: '查一下北京的天气' });
    expect(result.status).toBe('completed');
    expect(result.stopReason).toBe('converged');
    expect(result.steps[0].results[0].toolName).toBe('weather.query');
  });

  it('L2 任务触发审批并中断', async () => {
    const result = await runAgent({ task: '给团队发一封邮件通知' });
    expect(result.status).toBe('awaiting_approval');
    expect(result.approvals.length).toBe(1);
    expect(result.approvals[0].toolName).toBe('notify.email');
    // 中断时不该执行工具
    const auditLog = listAudit();
    expect(
      auditLog.some((entry) => entry.tool === 'notify.email' && entry.outcome === 'success'),
    ).toBe(false);
  });

  it('审批通过后重发才执行，且只执行一次', async () => {
    const first = await runAgent({ task: '给团队发一封邮件通知' });
    const approved = first.approvals.map((approval) => approval.toolCallId);
    const second = await runAgent({
      task: '给团队发一封邮件通知',
      approvedToolCalls: approved,
      idempotencyKey: 'k-email',
    });
    expect(second.status).toBe('completed');
    const emailExecutions = listAudit().filter(
      (entry) => entry.tool === 'notify.email' && entry.outcome === 'success',
    );
    expect(emailExecutions.length).toBe(1);
  });

  it('任务带"反复"时触发重复调用检测', async () => {
    const result = await runAgent({ task: '反复查询知识库' });
    expect(result.stopReason).toBe('repeated_call');
  });

  it('审批工单可被查询并删除', () => {
    const before = listApprovals();
    expect(before.length).toBe(0);
  });
});
