import { describe, expect, it } from 'vitest';
import {
  cancelTask,
  getCard,
  listAgents,
  sendMessage,
  TERMINAL_STATUSES,
} from '../../server/a2a.ts';
import { handleMcpRequest, MCP_PROTOCOL_VERSION } from '../../server/mcp.ts';

describe('MCP 2026-07-28', () => {
  it('server/discover 自描述返回当前协议版本', async () => {
    const res = await handleMcpRequest({ id: 1, method: 'server/discover' }, {});
    const result = res.result as { protocolVersion: string };
    expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
  });

  it('无状态：整个流程不出现 session id', async () => {
    const res = await handleMcpRequest({ id: 2, method: 'tools/list' }, {});
    expect(JSON.stringify(res)).not.toMatch(/session/i);
  });

  it('未知协议版本被拒绝 -32600', async () => {
    const res = await handleMcpRequest(
      { id: 3, method: 'ping' },
      { protocolVersion: '2099-01-01' },
    );
    expect(res.error?.code).toBe(-32600);
  });

  it('旧版本可用但响应注入 warning', async () => {
    const res = await handleMcpRequest(
      { id: 4, method: 'ping' },
      { protocolVersion: '2025-11-25' },
    );
    expect(res.error).toBeUndefined();
    expect(res.warning).toContain('2026-07-28');
  });

  it('幂等键命中时直接回放', async () => {
    const params = {
      name: 'knowledge.search',
      arguments: { query: '报销' },
      _meta: { idempotencyKey: 'k-unit-1' },
    };
    const first = await handleMcpRequest({ id: 5, method: 'tools/call', params }, {});
    const second = await handleMcpRequest({ id: 6, method: 'tools/call', params }, {});
    const { idempotent, ...replayed } = second.result as { idempotent?: boolean } & Record<
      string,
      unknown
    >;
    expect(idempotent).toBe(true);
    expect(first.result).toEqual(replayed);
  });

  it('缺输入时返回 MRTR 的 input_required', async () => {
    const res = await handleMcpRequest(
      {
        id: 7,
        method: 'tools/call',
        params: { name: 'tickets.create', arguments: { title: '报销异常' } },
      },
      {},
    );
    const result = res.result as { resultType: string; inputRequests: Array<{ id: string }> };
    expect(result.resultType).toBe('input_required');
    expect(result.inputRequests[0].id).toBe('approver');
  });

  it('补齐 inputResponses 后重发即可完成', async () => {
    const res = await handleMcpRequest(
      {
        id: 8,
        method: 'tools/call',
        params: {
          name: 'tickets.create',
          arguments: { title: '报销异常' },
          _meta: { inputResponses: [{ id: 'approver', value: '李主管' }] },
        },
      },
      {},
    );
    expect((res.result as { approver?: string }).approver).toBe('李主管');
  });
});

describe('A2A v1.0', () => {
  it('Agent Card 可被发现', () => {
    expect(listAgents().length).toBeGreaterThan(0);
    expect(getCard('researcher')?.skills.length).toBeGreaterThan(0);
  });

  it('消息发送后任务进入终态 completed', () => {
    const task = sendMessage({ agentId: 'researcher', text: '调研 MCP 与 A2A' });
    expect('status' in task && task.status).toBe('completed');
  });

  it('信息不足时进入 input-required，并可续跑', () => {
    const first = sendMessage({ agentId: 'writer', text: '帮我写' });
    expect('status' in first && first.status).toBe('input-required');
    const second = sendMessage({
      agentId: 'writer',
      text: '帮我写一封催办邮件',
      taskId: 'id' in first ? first.id : '',
    });
    expect('status' in second && second.status).toBe('completed');
  });

  it('终态任务取消返回 -32001', () => {
    const task = sendMessage({ agentId: 'researcher', text: '调研主题' });
    const cancelled = cancelTask('id' in task ? task.id : '');
    expect('error' in cancelled ? cancelled.error?.code : 0).toBe(-32001);
  });

  it('未知 agent 返回 -32601', () => {
    const res = sendMessage({ agentId: 'nobody', text: 'hi' });
    expect('error' in res ? res.error?.code : 0).toBe(-32601);
  });

  it('终态集合包含 completed/failed/canceled', () => {
    expect(TERMINAL_STATUSES).toEqual(['completed', 'failed', 'canceled']);
  });
});
