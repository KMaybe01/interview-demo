export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
}

export interface ChatResponse {
  message: Message;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatEnhancedRequest {
  content: string;
  conversationId?: string;
  knowledgeBaseId?: string;
  useAgent?: boolean;
  agentType?: string;
  agentId?: string;
  model?: string;
}

export interface ChatEnhancedResponse {
  response: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ChatStreamRequest {
  content: string;
  knowledgeBaseId?: string;
  useAgent?: boolean;
  agentType?: string;
  agentId?: string;
  model?: string;
}

export type ChunkStrategyType = 'fixed' | 'recursive' | 'token' | 'markdown';

export interface ChunkStrategy {
  type: ChunkStrategyType;
  chunkSize: number;
  overlap: number;
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
}

export interface KnowledgeConfig {
  chunkStrategy: ChunkStrategyType;
  chunkSize: number;
  overlap: number;
  embeddingModel: string;
  dimensions: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
  enabled: boolean;
}

export interface MemoryEntry {
  id: string;
  type: 'short-term' | 'long-term' | 'episodic';
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface MemoryConfig {
  maxShortTerm: number;
  maxLongTerm: number;
  summarizationInterval: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolDTO {
  name: string;
  description: string;
  version: string;
  endpoint: string;
}

export interface A2AToolDTO {
  name: string;
  description: string;
  agentType: string;
  capabilities: string[];
}

export interface MCPListResponse {
  mcp_tools: MCPToolDTO[];
  a2a_tools: A2AToolDTO[];
  count: number;
}

export interface TelemetryReportData {
  requests: number;
  errors: number;
  avgLatency: number;
  cacheHitRate: number;
}

export interface AgentStreamEvent {
  type: string;
  step?: number;
  thought?: string;
  action?: string;
  action_input?: string;
  observation?: string;
  content?: string;
  done?: boolean;
  error?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  protocol: 'mcp' | 'a2a';
  tools: MCPTool[];
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
}

export interface ModelRouterConfig {
  defaultModel: string;
  fallbackModel: string;
  routingRules: Array<{
    id: string;
    name: string;
    condition: string;
    model: string;
    priority: number;
  }>;
  enableFallback: boolean;
  enableCache: boolean;
}

export interface TelemetrySnapshot {
  totalRequests: number;
  totalErrors: number;
  avgLatency: number;
  p95Latency: number;
  eventsByType: Record<string, number>;
  cacheHitRate: number;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  docCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface KnowledgeBaseListResponse {
  knowledgeBases: KnowledgeBase[];
  count: number;
}

export interface KnowledgeBaseDetailResponse {
  documents: Document[];
}

export interface Document {
  id: string;
  title: string;
  content: string;
  source?: string;
  mimeType?: string;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata?: Record<string, unknown>;
}

export interface DocumentChunksResponse {
  chunks: DocumentChunk[];
  count: number;
}

export interface KnowledgeSearchRequest {
  query: string;
  knowledgeBaseId?: string;
  topK?: number;
  hybrid?: boolean;
}

export interface KnowledgeSearchResult {
  docTitle?: string;
  score: number;
  chunk?: { content: string };
  content?: string;
}

export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
}

export interface AddDocumentRequest {
  title: string;
  content: string;
  source?: string;
  mimeType?: string;
}

export interface BatchAddDocumentsRequest {
  documents: AddDocumentRequest[];
}

export interface BatchAddDocumentsResponse {
  added: number;
  errors?: number;
}

export interface Model {
  id: string;
  model_name: string;
  provider: string;
  context_window?: number;
  max_tokens?: number;
  temperature?: number;
  supports_tools: boolean;
  supports_vision: boolean;
}

export interface ModelListResponse {
  models: Model[];
  count: number;
}

export interface Agent {
  id: string;
  name: string;
  type: 'react' | 'function' | 'multi' | 'rag';
  tools_count: number;
  max_steps: number;
  createdAt?: string;
}

export interface AgentListResponse {
  agents: Agent[];
  count: number;
}

export interface AgentExecuteResponse {
  response: string;
  steps?: AgentStep[];
}

export interface AgentStep {
  thought?: string;
  action?: string;
  observation?: string;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  parameters: PluginParameter[];
  category: 'utility' | 'information' | 'data' | 'communication' | 'development';
}

export interface PluginParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export type MenuKey =
  | 'dashboard'
  | 'chat'
  | 'knowledge'
  | 'models'
  | 'agents'
  | 'plugins'
  | 'playground';
