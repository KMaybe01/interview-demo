/**
 * A2A v1.0（教学版）：Agent Card + 任务状态机。
 *
 * 对照 backend/internal/a2a：
 *   - 状态机 submitted → working → input-required → completed / failed / canceled
 *   - 终态不可再迁移、不可回退
 *   - 取消终态任务返回 -32001
 */

export type TaskStatus =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled';

export const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'failed', 'canceled'];

export interface AgentCard {
  id: string;
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: { streaming: boolean; pushNotifications: boolean; stateTransitionHistory: boolean };
  authentication: { schemes: string[] };
  skills: Array<{ id: string; name: string; description: string }>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
}

export interface Artifact {
  name: string;
  parts: Array<{ type: 'text'; text: string }>;
}

export interface Task {
  id: string;
  agentId: string;
  sessionId: string;
  status: TaskStatus;
  history: Array<{ role: 'user' | 'agent'; content: string }>;
  artifacts: Artifact[];
  error?: { code: number; message: string };
  metadata?: Record<string, unknown>;
}

interface AgentRunner {
  card: AgentCard;
  run(text: string): { done: true; artifact: Artifact } | { done: false; need: string };
}

const AGENTS: AgentRunner[] = [
  {
    card: {
      id: 'researcher',
      name: '调研 Agent',
      description: '围绕一个主题产出结构化调研要点',
      url: '/api/a2a/agents/researcher',
      version: '1.0.0',
      capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
      authentication: { schemes: ['none'] },
      skills: [{ id: 'research', name: '主题调研', description: '把一个主题拆成 3-5 条要点' }],
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
    },
    run: (text) => ({
      done: true,
      artifact: {
        name: 'research-notes',
        parts: [
          {
            type: 'text',
            text: `调研主题：${text}\n1. 定义与边界\n2. 主流做法\n3. 取舍点\n4. 落地建议`,
          },
        ],
      },
    }),
  },
  {
    card: {
      id: 'writer',
      name: '写作 Agent',
      description: '把要点写成一段可直接使用的文案（信息不足时会进入 input-required）',
      url: '/api/a2a/agents/writer',
      version: '1.0.0',
      capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
      authentication: { schemes: ['none'] },
      skills: [{ id: 'draft', name: '文案起草', description: '根据要点产出一段文案' }],
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
    },
    run: (text) =>
      text.trim().length < 8
        ? { done: false as const, need: '请补充更具体的写作要求（至少 8 个字）' }
        : {
            done: true as const,
            artifact: { name: 'draft', parts: [{ type: 'text', text: `草稿：${text}` }] },
          },
  },
];

const tasks = new Map<string, Task>();
let taskSequence = 0;

export function listAgents(): AgentCard[] {
  return AGENTS.map((agent) => agent.card);
}

export function getCard(agentId: string): AgentCard | undefined {
  return AGENTS.find((agent) => agent.card.id === agentId)?.card;
}

export interface SendMessageParams {
  agentId: string;
  text: string;
  taskId?: string;
  sessionId?: string;
}

/** message/send：新建任务（submitted→working→…）或用 taskId 续跑 input-required 任务。 */
export function sendMessage(
  params: SendMessageParams,
): Task | { error: { code: number; message: string } } {
  const agent = AGENTS.find((item) => item.card.id === params.agentId);
  if (!agent) return { error: { code: -32601, message: `未知 agent：${params.agentId}` } };

  // 续跑：只有 input-required 状态允许继续
  if (params.taskId) {
    const existing = tasks.get(params.taskId);
    if (!existing) return { error: { code: -32602, message: `任务不存在：${params.taskId}` } };
    if (TERMINAL_STATUSES.includes(existing.status)) {
      return { error: { code: -32602, message: `任务已处于终态 ${existing.status}，不可续跑` } };
    }
    existing.status = 'working';
    existing.history.push({ role: 'user', content: params.text });
    const outcome = agent.run(params.text);
    if (outcome.done) {
      existing.status = 'completed';
      existing.artifacts.push(outcome.artifact);
      existing.metadata = {};
    } else {
      existing.status = 'input-required';
      existing.metadata = { inputRequired: outcome.need };
    }
    return existing;
  }

  taskSequence += 1;
  const task: Task = {
    id: `task_${Date.now().toString(36)}_${taskSequence}`,
    agentId: params.agentId,
    sessionId: params.sessionId ?? `session_${taskSequence}`,
    status: 'working',
    history: [{ role: 'user', content: params.text }],
    artifacts: [],
  };
  tasks.set(task.id, task);

  const outcome = agent.run(params.text);
  if (outcome.done) {
    task.status = 'completed';
    task.artifacts.push(outcome.artifact);
  } else {
    task.status = 'input-required';
    task.metadata = { inputRequired: outcome.need };
  }
  return task;
}

export function getTask(taskId: string): Task | undefined {
  return tasks.get(taskId);
}

export function listTasks(limit = 20): Task[] {
  return [...tasks.values()].slice(-limit).reverse();
}

/** 取消：终态返回 -32001，否则直接置 canceled。 */
export function cancelTask(taskId: string): Task | { error: { code: number; message: string } } {
  const task = tasks.get(taskId);
  if (!task) return { error: { code: -32602, message: `任务不存在：${taskId}` } };
  if (TERMINAL_STATUSES.includes(task.status)) {
    return { error: { code: -32001, message: `任务已处于终态 ${task.status}，无法取消` } };
  }
  task.status = 'canceled';
  return task;
}
