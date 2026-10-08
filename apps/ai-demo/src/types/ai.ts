/**
 * /api/ai/* 的统一类型契约（与 backend/internal/airouter 一一对应）。
 *
 * 设计原则：
 * - 后端是唯一真源，字段名与后端 JSON tag 保持一致，禁止在前端做隐式重命名
 * - 流式事件用可辨识联合（discriminated union），渲染时按 type 收窄
 * - 金额统一用 number（美元），展示层再格式化
 */

// ---------------------------------------------------------------- 模型

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: string[];
  /** provider 是否已配置密钥；false 时请求会走离线降级 */
  available: boolean;
}

export interface AIModelListResponse {
  models: AIModel[];
  providers: string[];
  count: number;
}

// ---------------------------------------------------------------- 工具

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** 可读等级，如 "L0-只读" */
  level: string;
  levelCode: number;
  source: string;
  idempotent: boolean;
  timeoutMs: number;
  calls: number;
  /** 在当前权限档位下是否需要人工确认 */
  needsApproval: boolean;
}

export interface AIToolListResponse {
  tools: AITool[];
  count: number;
  tier: string;
}

export interface AIToolCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
  approved?: boolean;
}

export interface AIToolCallResult {
  toolName: string;
  content: string;
  isError: boolean;
  durationMs: number;
  level: string;
  auditId: string;
}

export interface ApprovalTicket {
  id: string;
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
  level: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
}

export interface ApprovalListResponse {
  tickets: ApprovalTicket[];
  count: number;
}

// ---------------------------------------------------------------- 聊天

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface AIChatRequest {
  model?: string;
  messages: ChatMessage[];
  system?: string;
  knowledgeBaseId?: string;
  /** 指定挂载的工具名；留空表示挂载全部 */
  tools?: string[];
  enableTools?: boolean;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  sessionId?: string;
  topK?: number;
  /** 跳过 HITL，仅受信任场景开启 */
  autoApprove?: boolean;
  /** 本轮已人工放行的 toolCallId */
  approvedToolCalls?: string[];
}

export interface KnowledgeHit {
  content: string;
  source?: string;
  score: number;
  document?: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  isError: boolean;
  durationMs: number;
  approved: boolean;
  pendingTicket?: string;
}

export interface StepRecord {
  index: number;
  toolCalls?: ToolCallRecord[];
  contentLen: number;
}

export interface AIChatOutcome {
  content: string;
  model: string;
  provider: string;
  finishReason: string;
  usage: UsageInfo;
  costUsd: number;
  sources?: KnowledgeHit[];
  steps?: StepRecord[];
  /** true 表示走了离线降级，UI 必须提示用户 */
  degraded: boolean;
  blocked: boolean;
  blockReason?: string;
  traceId: string;
  runId: string;
  latencyMs: number;
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------- 流式事件

export interface StreamStartData {
  runId: string;
  traceId: string;
  model: string;
  provider: string;
  maxSteps: number;
  toolCount: number;
}

export interface StreamDeltaData {
  text: string;
}

export interface StreamSourcesData {
  items: KnowledgeHit[];
  topK: number;
}

export interface StreamToolCallData {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  level: string;
}

export interface StreamToolResultData {
  id: string;
  name: string;
  result: string;
  isError: boolean;
  durationMs: number;
  auditId?: string;
}

export interface StreamApprovalData {
  ticketId: string;
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
  level: string;
  reason: string;
}

export interface StreamStepData {
  index: number;
  maxSteps: number;
  toolCalls: number;
  finishReason?: string;
}

export interface StreamUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  /** 价格来自兜底/模糊匹配时为 true */
  estimated: boolean;
}

export interface StreamDoneData {
  finishReason: string;
  degraded: boolean;
  steps: number;
  toolCalls: number;
  latencyMs: number;
  traceId: string;
  runId: string;
}

export interface StreamErrorData {
  message: string;
  code?: string;
  traceId?: string;
}

/** 流式事件的可辨识联合：渲染时用 switch (event.type) 收窄 */
export type AIStreamEvent =
  | { type: 'start'; data: StreamStartData }
  | { type: 'delta'; data: StreamDeltaData }
  | { type: 'reasoning'; data: StreamDeltaData }
  | { type: 'sources'; data: StreamSourcesData }
  | { type: 'tool_call'; data: StreamToolCallData }
  | { type: 'tool_result'; data: StreamToolResultData }
  | { type: 'approval_required'; data: StreamApprovalData }
  | { type: 'step'; data: StreamStepData }
  | { type: 'usage'; data: StreamUsageData }
  | { type: 'done'; data: StreamDoneData }
  | { type: 'error'; data: StreamErrorData };

// ---------------------------------------------------------------- 可观测

export interface LatencyStats {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
}

export interface GroupStat {
  key: string;
  requests: number;
  tokens: number;
  costUsd: number;
  errors: number;
  avgLatencyMs: number;
}

export interface TimelineBucket {
  timestamp: string;
  requests: number;
  errors: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

export interface MetricsResult {
  window: string;
  since: string;
  requests: number;
  errors: number;
  errorRate: number;
  degradedRate: number;
  cacheHitRate: number;
  tokens: number;
  promptTokens: number;
  outputTokens: number;
  costUsd: number;
  avgCostPerReq: number;
  latency: LatencyStats;
  ttft: LatencyStats;
  byModel: GroupStat[];
  byProvider: GroupStat[];
  byKind: GroupStat[];
  timeline: TimelineBucket[];
}

export interface RunRecord {
  id: string;
  traceId: string;
  kind: string;
  model: string;
  provider: string;
  userId?: string;
  sessionId?: string;
  knowledgeBaseId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  ttftMs: number;
  steps: number;
  toolCalls: number;
  retrievals: number;
  status: string;
  degraded: boolean;
  cacheHit: boolean;
  error?: string;
  createdAt: string;
}

export interface RunListResponse {
  runs: RunRecord[];
  counters: Record<string, number>;
}

export interface SpanEvent {
  name: string;
  time: string;
  attrs?: Record<string, unknown>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentId?: string;
  name: string;
  kind: string;
  start: string;
  end: string;
  durationMs: number;
  status: string;
  error?: string;
  attrs?: Record<string, unknown>;
  events?: SpanEvent[];
}

export interface Trace {
  traceId: string;
  name: string;
  start: string;
  end: string;
  durationMs: number;
  status: string;
  spans: Span[];
}

export interface TraceListResponse {
  traces: Trace[];
}

export interface AuditEvent {
  id: string;
  time: string;
  tool: string;
  user?: string;
  traceId?: string;
  outcome: string;
  detail?: string;
  args?: Record<string, unknown>;
  durationMs: number;
}

export interface ToolAuditResponse {
  events: AuditEvent[];
  summary: Record<string, unknown>;
  calls: Record<string, number>;
}

// ---------------------------------------------------------------- 评测

export interface EvalCase {
  id: string;
  question: string;
  reference?: string;
  keywords?: string[];
}

export interface EvalDataset {
  id: string;
  name: string;
  createdAt: string;
  cases: EvalCase[];
}

export interface EvalThresholds {
  faithfulnessFail: number;
  relevancyWarn: number;
  minRetrievalHitRate: number;
}

export interface CaseResult {
  caseId: string;
  question: string;
  answer: string;
  contexts: string[];
  retrievalHit: boolean;
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  passed: boolean;
  warnings?: string[];
  error?: string;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgFaithfulness: number;
  avgRelevancy: number;
  avgPrecision: number;
  retrievalHitRate: number;
  latencyP95: number;
  totalCostUsd: number;
  totalTokens: number;
}

export interface EvalRunResult {
  id: string;
  datasetId: string;
  datasetName: string;
  topK: number;
  thresholds: EvalThresholds;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cases: CaseResult[];
  summary: EvalSummary;
}

// ---------------------------------------------------------------- Prompt

export interface PromptTemplate {
  id: string;
  name: string;
  version: number;
  content: string;
  variables: string[];
  tags?: string[];
  active: boolean;
  createdAt: string;
  comment?: string;
}

export interface PromptListResponse {
  prompts: PromptTemplate[];
}

export interface PromptHistoryResponse {
  name: string;
  versions: PromptTemplate[];
}

// ---------------------------------------------------------------- MCP

export interface MCPToolSchema {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolsResponse {
  tools: MCPToolSchema[];
  count: number;
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: string;
  id: unknown;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface MCPCallResult {
  content: { type: string; text?: string; mimeType?: string; data?: string }[];
  isError: boolean;
  /** MRTR：需要用户输入时置位 */
  resultType?: string;
  inputRequests?: { id: string; type: string; prompt: string; required: boolean }[];
  requestState?: string;
  /** Dual-era 迁移提示 */
  warning?: string;
}

export interface MCPDiscoverResult {
  protocolVersion: string;
  serverInfo: { name: string; version: string };
  capabilities: Record<string, unknown>;
  methods: string[];
  extensions: string[];
  warning?: string;
}

// ---------------------------------------------------------------- A2A

export type A2ATaskStatus =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface A2APart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name?: string; mimeType?: string; bytes?: string; uri?: string };
}

export interface A2AArtifact {
  name: string;
  parts: A2APart[];
  index: number;
  lastChunk: boolean;
  metadata?: Record<string, unknown>;
}

export interface A2AMessage {
  role: string;
  parts: A2APart[];
  messageId: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface A2ATask {
  id: string;
  agentId: string;
  sessionId?: string;
  status: A2ATaskStatus;
  history?: A2AMessage[];
  artifacts?: A2AArtifact[];
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface A2ASkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface A2AAgentCard {
  id: string;
  name: string;
  description?: string;
  url?: string;
  version?: string;
  provider?: { organization?: string; url?: string };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  authentication?: { schemes: string[]; credentials?: string };
  skills: A2ASkill[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export interface A2AAgentSummary {
  id: string;
  name: string;
  description?: string;
  version?: string;
  skills?: string[];
  streaming: boolean;
}

export interface A2AAgentListResponse {
  agents: A2AAgentSummary[];
  count: number;
}

export interface A2ATaskListResponse {
  tasks: A2ATask[];
  count: number;
}

export interface A2ASendParams {
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}
