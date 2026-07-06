export interface Message {
	id?: string;
	role: "user" | "assistant" | "system";
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

export interface KnowledgeSearchRequest {
	query: string;
	knowledgeBaseId?: string;
	topK?: number;
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
	type: "react" | "function" | "multi" | "rag";
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
	category:
		| "utility"
		| "information"
		| "data"
		| "communication"
		| "development";
}

export interface PluginParameter {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

export type MenuKey =
	| "dashboard"
	| "chat"
	| "knowledge"
	| "models"
	| "agents"
	| "plugins";
