import { useCallback, useEffect, useState } from 'react';
import { badge, buttonStyle, card, colors } from '../../ui/styles.ts';

/**
 * 第三关：Agent 与工具。
 *
 * 演示四个工程点：
 *   1. 工具清单带副作用分级（L0 只读 / L2 不可逆）
 *   2. L2 工具触发审批工单 → 循环中断（awaiting_approval）
 *   3. 审批后带 approvedToolCalls 重发，工具只执行一次
 *   4. 步数上限 / 重复调用检测（任务里带"反复"可触发）
 */

interface ToolMeta {
  name: string;
  description: string;
  level: 'L0' | 'L1' | 'L2';
  timeoutMs: number;
  idempotent: boolean;
}

interface StepRecord {
  step: number;
  calls: Array<{ toolName: string; arguments: Record<string, unknown> }>;
  results: Array<{ toolName: string; status: string; output: unknown }>;
}

interface Approval {
  id: string;
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason: string;
  level: string;
}

interface AgentResult {
  status: 'completed' | 'awaiting_approval' | 'stopped';
  stopReason?: string;
  steps: StepRecord[];
  approvals: Approval[];
  answer: string;
}

interface AuditEntry {
  id: string;
  tool: string;
  level: string;
  outcome: string;
  args: string;
  detail: string;
  durationMs: number;
}

export default function AgentStage() {
  const [tools, setTools] = useState<ToolMeta[]>([]);
  const [task, setTask] = useState('查一下北京的天气');
  const [result, setResult] = useState<AgentResult | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const refreshAudit = useCallback(async () => {
    const res = await fetch('/api/agent/audit');
    const data = (await res.json()) as { audit: AuditEntry[] };
    setAudit(data.audit);
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/agent/tools');
      setTools((await res.json()) as ToolMeta[]);
      await refreshAudit();
    })();
  }, [refreshAudit]);

  const run = async (approved: string[] = []) => {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, approvedToolCalls: approved, idempotencyKey: `run-${task}` }),
    });
    setResult((await res.json()) as AgentResult);
    await refreshAudit();
  };

  const resolve = async (id: string, approve: boolean) => {
    await fetch(`/api/agent/approvals/${id}/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approve }),
    });
    // 审批通过后，把已批准的 toolCallId 重发原请求
    const approvedCalls =
      result?.approvals
        .filter((approval) => (approve ? approval.id === id : false))
        .map((approval) => approval.toolCallId) ?? [];
    await run(approve ? approvedCalls : []);
  };

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <section style={{ ...card, width: 420 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>工具清单（副作用分级）</div>
          {tools.map((tool) => (
            <div key={tool.name} style={{ marginBottom: 6, fontSize: 13 }}>
              <span style={badge(tool.level === 'L2' ? 'warn' : 'ok')}>{tool.level}</span>{' '}
              {tool.name} · {tool.description} · {tool.timeoutMs}ms ·{' '}
              {tool.idempotent ? '幂等' : '非幂等'}
            </div>
          ))}

          <div style={{ fontWeight: 600, margin: '14px 0 8px' }}>下发任务</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTask('查一下北京的天气')}
              style={buttonStyle('ghost')}
            >
              天气（L0）
            </button>
            <button
              type="button"
              onClick={() => setTask('给团队发一封邮件通知')}
              style={buttonStyle('ghost')}
            >
              邮件（L2）
            </button>
            <button
              type="button"
              onClick={() => setTask('创建一个工单')}
              style={buttonStyle('ghost')}
            >
              工单（L2）
            </button>
            <button
              type="button"
              onClick={() => setTask('反复查询知识库')}
              style={buttonStyle('ghost')}
            >
              反复（重复检测）
            </button>
          </div>
          <input
            value={task}
            onChange={(event) => setTask(event.target.value)}
            style={inputStyle}
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => run()} style={buttonStyle('primary')}>
              运行 Agent
            </button>
          </div>

          {result ? (
            <div style={{ marginTop: 12 }}>
              <span style={badge(result.status === 'completed' ? 'ok' : 'warn')}>
                {result.status}
                {result.stopReason ? ` · ${result.stopReason}` : ''}
              </span>
              <div style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {result.answer}
              </div>
              <div style={{ marginTop: 10 }}>
                {result.steps.map((step) => (
                  <div
                    key={step.step}
                    style={{ fontSize: 12, color: colors.textDim, marginBottom: 4 }}
                  >
                    step {step.step}：
                    {step.results.map((r) => `${r.toolName}(${r.status})`).join('、')}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section style={{ ...card, width: 400 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>审批工单（HITL）</div>
          {!result?.approvals?.length ? (
            <div style={{ fontSize: 12, color: colors.textDim }}>
              还没有待审批的工单。跑一个 L2 任务（邮件 / 工单）试试。
            </div>
          ) : (
            result.approvals.map((approval) => (
              <div
                key={approval.id}
                style={{
                  border: `1px solid ${colors.warn}`,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <b>{approval.toolName}</b>（{approval.level}）
                </div>
                <div style={{ fontSize: 12, color: colors.textDim, margin: '4px 0' }}>
                  {approval.reason}
                </div>
                <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 8 }}>
                  参数：{JSON.stringify(approval.arguments)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => resolve(approval.id, true)}
                    style={buttonStyle('primary')}
                  >
                    同意
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(approval.id, false)}
                    style={buttonStyle('danger')}
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section style={{ ...card, flex: 1, minWidth: 360 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>工具审计（outcome 区分拦截原因）</div>
          <button type="button" onClick={refreshAudit} style={buttonStyle('ghost')}>
            刷新
          </button>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            {audit.map((entry) => (
              <div key={entry.id} style={{ marginBottom: 6 }}>
                <span style={badge(entry.outcome === 'success' ? 'ok' : 'warn')}>
                  {entry.outcome}
                </span>{' '}
                {entry.tool}（{entry.level}）{entry.durationMs}ms
                {entry.outcome.startsWith('blocked') ? ` · ${entry.detail}` : ''}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.panelSoft,
  color: colors.text,
  fontSize: 13,
  outline: 'none',
  marginTop: 8,
} as const;
