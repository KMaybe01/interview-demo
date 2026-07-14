import { ApiProperty } from '@nestjs/swagger';

export interface Message {
  id?: string;
  role: string;
  content: string;
  timestamp?: string;
  conversationId?: string;
  createdAt?: string;
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
  conversationId?: string;
}

export interface ChatResponse {
  message: Message;
  usage?: Usage;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  type?: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  source?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  chunkIndex: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  docCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchRequest {
  query: string;
  knowledgeBaseId?: string;
  topK?: number;
  minScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  docTitle: string;
  docSource: string;
}

export interface Memory {
  id: string;
  conversationId: string;
  content: string;
  role: string;
  summary?: string;
  importance: number;
  createdAt: string;
  accessedAt: string;
  accessCount: number;
}

export interface MemorySearchRequest {
  query: string;
  conversationId?: string;
  topK?: number;
  minImportance?: number;
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  type?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ToolDefinition {
  type: string;
  function: FunctionDef;
}

export interface FunctionDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Application {
  id: string;
  name: string;
  description?: string;
  type: string;
  config: AppConfig;
  knowledgeBaseIds?: string[];
  tools?: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: boolean;
  memory?: boolean;
  rag?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
  position?: Record<string, number>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface ErrorResponse {
  error: string;
  code: number;
}

export class LoginRequest {
  @ApiProperty() username: string;
  @ApiProperty() password: string;
}

export class TokenResponse {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty() expiresIn: number;
}

export class RefreshRequest {
  @ApiProperty() refreshToken: string;
}

export class VitalsReport {
  @ApiProperty() metric: string;
  @ApiProperty() value: number;
  @ApiProperty() rating: string;
  @ApiProperty() url: string;
  @ApiProperty({ required: false }) ttfb?: number;
  @ApiProperty({ required: false }) fcp?: number;
  @ApiProperty({ required: false }) lcp?: number;
  @ApiProperty({ required: false }) cls?: number;
  @ApiProperty({ required: false }) inp?: number;
  @ApiProperty() version: string;
}

export class TelemetryReport {
  @ApiProperty() requests: number;
  @ApiProperty() errors: number;
  @ApiProperty() avgLatency: number;
  @ApiProperty() cacheHitRate: number;
  @ApiProperty({ required: false }) timestamp?: number;
}

export class PageReport {
  @ApiProperty() path: string;
  @ApiProperty() pageName: string;
  @ApiProperty() renderDuration: number;
  @ApiProperty({ required: false }) lcp?: number;
  @ApiProperty({ required: false }) inp?: number;
  @ApiProperty({ required: false }) cls?: number;
  @ApiProperty({ required: false }) referrer?: string;
}

export class PaymentRequest {
  @ApiProperty() orderNo?: string;
  @ApiProperty() channel: string;
  @ApiProperty() amount: number;
  @ApiProperty({ required: false }) idempotencyKey?: string;
}

export class RBACCheckBody {
  @ApiProperty() roleCode: number;
  @ApiProperty() nodes: { key: string; requiredPerms: number[] }[];
}

export class SchemaValidationRequest {
  @ApiProperty() schema: Record<string, unknown>;
  @ApiProperty() data: Record<string, unknown>;
}

export class InitUploadRequest {
  @ApiProperty() filename: string;
  @ApiProperty() fileSize: number;
  @ApiProperty() chunkSize: number;
  @ApiProperty() totalChunks: number;
  @ApiProperty({ required: false }) fileHash?: string;
}
