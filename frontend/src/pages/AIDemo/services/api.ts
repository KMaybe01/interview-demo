import type {
  AddDocumentRequest,
  AgentExecuteResponse,
  AgentListResponse,
  BatchAddDocumentsResponse,
  ChatEnhancedRequest,
  ChatEnhancedResponse,
  ChatRequest,
  ChatResponse,
  CreateKnowledgeBaseRequest,
  KnowledgeBaseDetailResponse,
  KnowledgeBaseListResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  ModelListResponse,
  StreamChunk,
} from '../types';

const API_BASE = '/api';
const REQUEST_TIMEOUT = 30_000;

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }));
      throw new ApiError(error.error || '请求失败', response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('请求超时');
    }
    throw new ApiError(error instanceof Error ? error.message : '网络错误');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestVoid(url: string, options?: RequestInit): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }));
      throw new ApiError(error.error || '请求失败', response.status);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('请求超时');
    }
    throw new ApiError(error instanceof Error ? error.message : '网络错误');
  } finally {
    clearTimeout(timeoutId);
  }
}

export const chatAPI = {
  async chat(req: ChatRequest): Promise<ChatResponse> {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ ...req, stream: false }),
    });
  },

  async chatEnhanced(req: ChatEnhancedRequest): Promise<ChatEnhancedResponse> {
    return request<ChatEnhancedResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async chatStream(
    content: string,
    signal?: AbortSignal,
    onChunk?: (chunk: string) => void,
    onDone?: () => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onDone?.();
              return;
            }
            try {
              const parsed: StreamChunk = JSON.parse(data);
              if (parsed.content) onChunk?.(parsed.content);
            } catch {
              onChunk?.(data);
            }
          }
        }
      }

      onDone?.();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        onDone?.();
        return;
      }
      onError?.(error instanceof Error ? error.message : '流式响应失败');
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

export const knowledgeAPI = {
  async create(data: CreateKnowledgeBaseRequest): Promise<unknown> {
    return request('/knowledge-base', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(): Promise<KnowledgeBaseListResponse> {
    return request<KnowledgeBaseListResponse>('/knowledge-base');
  },

  async get(id: string): Promise<KnowledgeBaseDetailResponse> {
    return request<KnowledgeBaseDetailResponse>(`/knowledge-base/${id}`);
  },

  async delete(id: string): Promise<void> {
    return requestVoid(`/knowledge-base/${id}`, { method: 'DELETE' });
  },

  async addDocument(kbId: string, data: AddDocumentRequest): Promise<unknown> {
    return request(`/knowledge-base/${kbId}/document`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async batchAddDocuments(kbId: string, documents: AddDocumentRequest[]): Promise<BatchAddDocumentsResponse> {
    return request<BatchAddDocumentsResponse>(`/knowledge-base/${kbId}/documents/batch`, {
      method: 'POST',
      body: JSON.stringify({ documents }),
    });
  },

  async search(req: KnowledgeSearchRequest): Promise<KnowledgeSearchResponse> {
    return request<KnowledgeSearchResponse>('/knowledge-base/search', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};

export const modelAPI = {
  async list(): Promise<ModelListResponse> {
    return request<ModelListResponse>('/models');
  },

  async chat(modelId: string, messages: { role: string; content: string }[]): Promise<ChatResponse> {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ model: modelId, messages }),
    });
  },
};

export const agentAPI = {
  async list(): Promise<AgentListResponse> {
    return request<AgentListResponse>('/agents');
  },

  async create(type: string, name: string): Promise<unknown> {
    return request('/agents', {
      method: 'POST',
      body: JSON.stringify({ type, name }),
    });
  },

  async delete(id: string): Promise<void> {
    return requestVoid(`/agents/${id}`, { method: 'DELETE' });
  },

  async execute(id: string, input: string): Promise<AgentExecuteResponse> {
    return request<AgentExecuteResponse>(`/agents/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  },
};
