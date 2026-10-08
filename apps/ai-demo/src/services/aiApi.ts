/**
 * /api/ai/* 的 REST 客户端。
 *
 * 覆盖：模型 / 工具 / HITL 审批 / LLMOps 可观测 / 评测 / Prompt 版本 / MCP / A2A。
 * 流式聊天不在这里，见 aiStream.ts。
 */

import type {
  A2AAgentCard,
  A2AAgentListResponse,
  A2ASendParams,
  A2ATask,
  A2ATaskListResponse,
  AIChatOutcome,
  AIChatRequest,
  AIModel,
  AIModelListResponse,
  AITool,
  AIToolCallRequest,
  AIToolCallResult,
  AIToolListResponse,
  ApprovalListResponse,
  ApprovalTicket,
  AuditEvent,
  CaseResult,
  EvalCase,
  EvalDataset,
  EvalRunResult,
  EvalThresholds,
  GroupStat,
  JSONRPCResponse,
  MCPCallResult,
  MCPDiscoverResult,
  MCPToolsResponse,
  MetricsResult,
  PromptHistoryResponse,
  PromptListResponse,
  PromptTemplate,
  RunRecord,
  ToolAuditResponse,
  Trace,
  TraceListResponse,
} from '../types/ai.ts';

const AI_BASE = '/api/ai';
const REQUEST_TIMEOUT = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${AI_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        (payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error?: unknown }).error)
          : '') || `请求失败（HTTP ${response.status}）`;
      const code =
        payload && typeof payload === 'object' && 'code' in payload
          ? String((payload as { code?: unknown }).code)
          : undefined;
      throw new ApiError(message, response.status, code);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') throw new ApiError('请求超时');
    throw new ApiError((error as Error).message || '网络错误');
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

// ---------------------------------------------------------------- 模型与工具

export const aiAPI = {
  listModels: () => request<AIModelListResponse>('/models'),

  listTools: () => request<AIToolListResponse>('/tools'),

  callTool: (payload: AIToolCallRequest) => post<AIToolCallResult>('/tools/call', payload),

  chat: (payload: AIChatRequest) => post<AIChatOutcome>('/chat', payload),
};

// ---------------------------------------------------------------- HITL 审批

export const approvalAPI = {
  list: () => request<ApprovalListResponse>('/approvals'),

  resolve: (id: string, approve: boolean) =>
    post<{ ticketId: string; toolName: string; toolCallId: string; approved: boolean }>(
      `/approvals/${encodeURIComponent(id)}/resolve`,
      { approve },
    ),
};

// ---------------------------------------------------------------- 可观测

export const obsAPI = {
  /** window 取值：1h(默认) / 6h / 24h / 7d / 30d，也接受 Go duration 字符串 */
  metrics: (window = '1h') =>
    request<MetricsResult>(`/obs/metrics?window=${encodeURIComponent(window)}`),

  runs: (limit = 50) =>
    request<{ runs: RunRecord[]; counters: Record<string, number> }>(`/obs/runs?limit=${limit}`),

  traces: (limit = 20) => request<TraceListResponse>(`/obs/traces?limit=${limit}`),

  trace: (traceId: string) => request<Trace>(`/obs/traces/${encodeURIComponent(traceId)}`),

  audit: (limit = 100) => request<ToolAuditResponse>(`/obs/audit?limit=${limit}`),
};

// ---------------------------------------------------------------- 评测

export const evalAPI = {
  datasets: () => request<{ datasets: EvalDataset[]; count: number }>('/eval/datasets'),

  createDataset: (name: string, cases: EvalCase[]) =>
    post<EvalDataset>('/eval/datasets', { name, cases }),

  run: (payload: {
    datasetId: string;
    topK?: number;
    knowledgeBaseId?: string;
    thresholds?: Partial<EvalThresholds>;
  }) => post<EvalRunResult>('/eval/run', payload),

  runs: (limit = 20) => request<{ runs: EvalRunResult[] }>(`/eval/runs?limit=${limit}`),
};

export type { CaseResult, EvalDataset, EvalRunResult };

// ---------------------------------------------------------------- Prompt

export const promptAPI = {
  list: () => request<PromptListResponse>('/prompts'),

  create: (payload: {
    name: string;
    content: string;
    comment?: string;
    tags?: string[];
    activate?: boolean;
  }) => post<PromptTemplate>('/prompts', payload),

  history: (name: string) =>
    request<PromptHistoryResponse>(`/prompts/${encodeURIComponent(name)}/versions`),

  activate: (name: string, version: number) =>
    post<PromptTemplate>(`/prompts/${encodeURIComponent(name)}/activate`, { name, version }),
};

// ---------------------------------------------------------------- MCP

/** MCP 2026-07-28：单端点 POST /api/ai/mcp，无状态（无 initialize、无会话 ID） */
export const mcpAPI = {
  /** 能力发现（取代旧版 initialize 握手返回值） */
  discover: async (): Promise<MCPDiscoverResult> => {
    const resp = await post<JSONRPCResponse<MCPDiscoverResult>>('/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'server/discover',
      params: {},
    });
    if (resp.error) throw new ApiError(resp.error.message, undefined, String(resp.error.code));
    return (resp.result ?? {}) as MCPDiscoverResult;
  },

  listTools: () => request<MCPToolsResponse>('/mcp/tools'),

  /**
   * 调用工具。
   * @param idempotencyKey 副作用工具必须传，重发时服务端会回放首次结果
   */
  callTool: async (
    name: string,
    args: Record<string, unknown> = {},
    idempotencyKey?: string,
  ): Promise<MCPCallResult> => {
    const params: Record<string, unknown> = { name, arguments: args };
    if (idempotencyKey) {
      params._meta = { idempotencyKey };
    }
    const resp = await post<JSONRPCResponse<MCPCallResult>>('/mcp', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params,
    });
    if (resp.error) throw new ApiError(resp.error.message, undefined, String(resp.error.code));
    return (resp.result ?? { content: [], isError: true }) as MCPCallResult;
  },

  /** MRTR：补齐输入后重发原请求 */
  respondToInput: async (
    name: string,
    args: Record<string, unknown>,
    requestState: string,
    responses: { id: string; value: unknown }[],
  ): Promise<MCPCallResult> => {
    const resp = await post<JSONRPCResponse<MCPCallResult>>('/mcp', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args, requestState, inputResponses: responses },
    });
    if (resp.error) throw new ApiError(resp.error.message, undefined, String(resp.error.code));
    return (resp.result ?? { content: [], isError: true }) as MCPCallResult;
  },
};

// ---------------------------------------------------------------- A2A

/** A2A v1.0：Agent ↔ Agent 横向协作 */
export const a2aAPI = {
  agents: () => request<A2AAgentListResponse>('/a2a/agents'),

  card: (agentId: string) =>
    request<A2AAgentCard>(`/a2a/agents/${encodeURIComponent(agentId)}/card`),

  /**
   * message/send。
   * @param params.taskId 非空表示继续一个 input-required 的任务
   */
  send: (agentId: string, params: A2ASendParams) =>
    post<A2ATask>(`/a2a/agents/${encodeURIComponent(agentId)}/tasks`, params),

  sendText: (agentId: string, text: string) => a2aAPI.send(agentId, { text }),

  tasks: (opts: { agentId?: string; status?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (opts.agentId) query.set('agentId', opts.agentId);
    if (opts.status) query.set('status', opts.status);
    if (opts.limit) query.set('limit', String(opts.limit));
    const suffix = query.toString();
    return request<A2ATaskListResponse>(`/a2a/tasks${suffix ? `?${suffix}` : ''}`);
  },

  task: (taskId: string) => request<A2ATask>(`/a2a/tasks/${encodeURIComponent(taskId)}`),

  cancel: (taskId: string) => post<A2ATask>(`/a2a/tasks/${encodeURIComponent(taskId)}/cancel`),
};

// 供 UI 层复用的轻量类型别名
export type {
  AIModel,
  AITool,
  ApprovalTicket,
  AuditEvent,
  GroupStat,
  PromptTemplate,
  RunRecord,
  Trace,
};
