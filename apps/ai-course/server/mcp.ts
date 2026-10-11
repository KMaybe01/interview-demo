import { search } from './rag.ts';

/**
 * MCP 2026-07-28 单端点（教学版）。
 *
 * 刻意保留协议的关键语义，方便对照 backend/internal/mcp：
 *   - 无 initialize 握手、无 Mcp-Session-Id（每个请求自包含）
 *   - server/discover 自描述
 *   - 版本协商：未知版本 → -32600；旧版本 → 响应注入 warning
 *   - 幂等：params._meta.idempotencyKey（TTL 10 分钟）
 *   - MRTR：缺输入时返回 input_required，客户端补齐后**重发原请求**
 */

export const MCP_PROTOCOL_VERSION = '2026-07-28';
export const MCP_COMPATIBLE_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

export type SideEffect = 'read' | 'reversible' | 'irreversible';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  sideEffect: SideEffect;
  /** inputResponses 是 MRTR 补齐后重发带来的输入 */
  execute(
    args: Record<string, unknown>,
    inputResponses: Array<{ id: string; value: unknown }>,
  ): Promise<unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
  /** 旧版本客户端协商成功时的迁移提示 */
  warning?: string;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface CallParams extends Record<string, unknown> {
  name?: string;
  arguments?: Record<string, unknown>;
  _meta?: { idempotencyKey?: string; inputResponses?: Array<{ id: string; value: unknown }> };
}

const idempotencyCache = new Map<string, { result: unknown; expiresAt: number }>();

const MCP_TOOLS: McpTool[] = [
  {
    name: 'knowledge.search',
    description: '在已入库文档里检索相关内容（只读，可安全调用）',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: '检索关键词' } },
      required: ['query'],
    },
    sideEffect: 'read',
    async execute(args) {
      const hits = search(String(args.query ?? ''), 3);
      return { count: hits.length, hits: hits.map((h) => ({ id: h.id, score: h.score })) };
    },
  },
  {
    name: 'tickets.create',
    description: '创建工单（**会真实写入**，需要审批人，缺失时触发 MRTR）',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        approver: { type: 'string', description: '审批人，缺失时会反向索取' },
      },
      required: ['title'],
    },
    sideEffect: 'irreversible',
    async execute(args, inputResponses) {
      const approver =
        (args.approver as string | undefined) ??
        (inputResponses?.find((item) => item.id === 'approver')?.value as string | undefined);
      if (!approver) return { __needInput: 'approver' as const };
      return { ticketId: `T-${Date.now().toString(36)}`, title: args.title, approver };
    },
  },
];

export function listTools(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { sideEffect: SideEffect };
}> {
  return MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { sideEffect: tool.sideEffect },
  }));
}

function error(id: number | string | null, code: number, message: string): McpResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

/** 单端点入口：method 由 JSON-RPC 信封给出，路由头 Mcp-Method 由网关侧使用。 */
export async function handleMcpRequest(
  request: JsonRpcRequest,
  headers: { protocolVersion?: string },
): Promise<McpResponse> {
  const id = request.id ?? null;
  const method = request.method ?? '';

  // 版本协商：未知版本直接拒绝；旧版本放行但注入 warning
  let warning: string | undefined;
  const version = headers.protocolVersion;
  if (version && version !== MCP_PROTOCOL_VERSION) {
    if (!MCP_COMPATIBLE_VERSIONS.includes(version)) {
      return error(id, -32600, `不支持的协议版本：${version}（当前 ${MCP_PROTOCOL_VERSION}）`);
    }
    warning = `客户端使用旧版协议 ${version}，请尽快升级到 ${MCP_PROTOCOL_VERSION}`;
  }

  switch (method) {
    case 'server/discover':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          compatibleVersions: MCP_COMPATIBLE_VERSIONS,
          serverInfo: { name: 'ai-course-mcp', version: '0.1.0' },
          capabilities: { tools: {}, resources: {}, prompts: {} },
          tools: MCP_TOOLS.length,
        },
        ...(warning ? { warning } : {}),
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: listTools() },
        ...(warning ? { warning } : {}),
      };

    case 'tools/call':
      return await callTool(id, (request.params ?? {}) as CallParams, warning);

    case 'ping':
      return { jsonrpc: '2.0', id, result: {}, ...(warning ? { warning } : {}) };

    default:
      return error(id, -32601, `未知方法：${method}`);
  }
}

async function callTool(
  id: number | string | null,
  params: CallParams,
  warning?: string,
): Promise<McpResponse> {
  const tool = MCP_TOOLS.find((item) => item.name === params.name);
  if (!tool) return error(id, -32602, `工具不存在：${params.name ?? ''}`);

  const key = params._meta?.idempotencyKey;
  if (key) {
    const cached = idempotencyCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      // 命中缓存直接回放，并标记出来便于前端展示
      return { jsonrpc: '2.0', id, result: { ...(cached.result as object), idempotent: true } };
    }
  }

  const args = params.arguments ?? {};
  const inputResponses = params._meta?.inputResponses;
  const output = await tool.execute(args, inputResponses ?? []);

  // MRTR：工具执行中发现缺输入 → 返回非终态，等待客户端重发
  if (
    output !== null &&
    typeof output === 'object' &&
    '__needInput' in (output as Record<string, unknown>)
  ) {
    const field = (output as { __needInput: string }).__needInput;
    return {
      jsonrpc: '2.0',
      id,
      result: {
        resultType: 'input_required',
        inputRequests: [
          {
            id: field,
            type: 'text',
            prompt: `请补充${field === 'approver' ? '审批人' : field}`,
            required: true,
          },
        ],
        requestState: `${tool.name}:${Date.now()}`,
      },
    };
  }

  if (key)
    idempotencyCache.set(key, { result: output, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
  return { jsonrpc: '2.0', id, result: output, ...(warning ? { warning } : {}) };
}
