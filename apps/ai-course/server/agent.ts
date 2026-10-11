import { type Approval, createApproval } from './approvals.ts';
import { type AuditEntry, executeTool, listAudit, type ToolLevel } from './tools.ts';

/**
 * Agent 循环（教学版）—— 用确定性的"计划器"模拟模型的工具选择，
 * 重点是演示第三关的四个工程点：
 *   1. 最大步数 MaxSteps = 5、单步最大工具调用数 = 4
 *   2. 重复调用检测（同工具 + 同参数 → 停止）
 *   3. L2 工具 → 生成审批工单 → 循环中断（awaiting_approval）
 *   4. 每次调用走统一执行入口，留下审计
 */

export const MAX_STEPS = 5;
export const MAX_TOOL_CALLS_PER_STEP = 4;

interface PlannedCall {
  toolName: string;
  arguments: Record<string, unknown>;
}

interface StepRecord {
  step: number;
  calls: Array<{ toolName: string; arguments: Record<string, unknown> }>;
  results: Array<{ toolName: string; status: string; output: unknown }>;
}

export interface AgentResult {
  status: 'completed' | 'awaiting_approval' | 'stopped';
  stopReason?: 'converged' | 'max_steps' | 'repeated_call' | 'too_many_calls';
  steps: StepRecord[];
  approvals: Approval[];
  answer: string;
}

/**
 * 确定性计划器：真实系统里这里是"模型 + 工具定义"的输出。
 * 关键词规则便于在离线模式下演示行为：
 *   - 天气  → weather.query（L0）
 *   - 邮件  → notify.email（L2，触发审批）
 *   - 工单  → tickets.create（L2，触发审批）
 *   - 反复  → 永远返回同一个调用（演示重复检测）
 *   - 其他  → knowledge.search，然后收敛
 */
function plan(task: string, step: number): PlannedCall[] {
  if (task.includes('反复')) return [{ toolName: 'knowledge.search', arguments: { query: task } }];
  if (step > 1) return []; // 一步之后自然收敛
  if (task.includes('天气')) return [{ toolName: 'weather.query', arguments: { city: '北京' } }];
  if (task.includes('邮件')) {
    return [{ toolName: 'notify.email', arguments: { to: 'team@example.com', subject: task } }];
  }
  if (task.includes('工单')) {
    return [{ toolName: 'tickets.create', arguments: { title: task } }];
  }
  return [{ toolName: 'knowledge.search', arguments: { query: task } }];
}

export interface AgentRunInput {
  task: string;
  approvedToolCalls?: string[];
  idempotencyKey?: string;
}

export async function runAgent(input: AgentRunInput): Promise<AgentResult> {
  const steps: StepRecord[] = [];
  const approvals: Approval[] = [];
  const seen = new Set<string>();
  const approved = input.approvedToolCalls ?? [];

  const answer = await executeLoop(input, steps, approvals, seen, approved);

  return {
    status: answer.status,
    stopReason: answer.stopReason,
    steps,
    approvals,
    answer: answer.text,
  };
}

async function executeLoop(
  input: AgentRunInput,
  steps: StepRecord[],
  approvals: Approval[],
  seen: Set<string>,
  approved: string[],
): Promise<{
  status: AgentResult['status'];
  stopReason?: AgentResult['stopReason'];
  text: string;
}> {
  const produced: string[] = [];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const calls = plan(input.task, step);

    if (calls.length === 0) {
      return {
        status: 'completed',
        stopReason: 'converged',
        text: composeAnswer(input.task, produced),
      };
    }

    if (calls.length > MAX_TOOL_CALLS_PER_STEP) {
      return {
        status: 'stopped',
        stopReason: 'too_many_calls',
        text: composeAnswer(input.task, produced, '单步工具调用数超限'),
      };
    }

    const signatures = calls.map((call) => `${call.toolName}:${JSON.stringify(call.arguments)}`);
    if (signatures.some((signature) => seen.has(signature))) {
      return {
        status: 'stopped',
        stopReason: 'repeated_call',
        text: composeAnswer(input.task, produced, '检测到重复调用'),
      };
    }
    for (const signature of signatures) seen.add(signature);

    const results: StepRecord['results'] = [];
    for (let index = 0; index < calls.length; index += 1) {
      const call = calls[index];
      const result = await executeTool(call.toolName, call.arguments, {
        approved,
        idempotencyKey: input.idempotencyKey,
      });

      if (result.status === 'approval_required') {
        // 中断（不是等待）：创建工单，把控制权交回前端
        approvals.push(
          createApproval({
            toolCallId: call.toolName,
            toolName: call.toolName,
            arguments: call.arguments,
          }),
        );
        steps.push({
          step,
          calls,
          results: [
            ...results,
            { toolName: call.toolName, status: 'approval_required', output: null },
          ],
        });
        return {
          status: 'awaiting_approval',
          text: `已暂停：${call.toolName} 是不可逆操作，需要人工审批。`,
        };
      }

      results.push({
        toolName: call.toolName,
        status: result.status,
        output: result.status === 'ok' ? result.result : result.status,
      });
      if (result.status === 'ok')
        produced.push(`${call.toolName} → ${JSON.stringify(result.result).slice(0, 100)}`);
    }

    steps.push({ step, calls, results });
  }

  return {
    status: 'stopped',
    stopReason: 'max_steps',
    text: composeAnswer(input.task, produced, '达到最大步数'),
  };
}

function composeAnswer(task: string, produced: string[], note?: string): string {
  const head = note ? `[${note}] ` : '';
  if (produced.length === 0) return `${head}关于「${task}」没有需要调用的工具。`;
  return `${head}关于「${task}」的执行结果：\n${produced.map((line, index) => `${index + 1}. ${line}`).join('\n')}`;
}

export function getAudit(): AuditEntry[] {
  return listAudit();
}

export type { ToolLevel };
