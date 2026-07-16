import { Injectable } from '@nestjs/common';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  contextWindow: number;
  maxTokens: number;
  pricing: { input: number; output: number };
  isAvailable: boolean;
}

@Injectable()
export class ModelManager {
  private models: ModelConfig[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      description: 'OpenAI 最新多模态旗舰模型',
      capabilities: ['chat', 'vision', 'tool_use', 'code'],
      contextWindow: 128000,
      maxTokens: 4096,
      pricing: { input: 2.5, output: 10 },
      isAvailable: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      description: '轻量级多模态模型',
      capabilities: ['chat', 'vision', 'tool_use'],
      contextWindow: 128000,
      maxTokens: 4096,
      pricing: { input: 0.15, output: 0.6 },
      isAvailable: true,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      description: '快速经济的对话模型',
      capabilities: ['chat'],
      contextWindow: 16385,
      maxTokens: 4096,
      pricing: { input: 0.5, output: 1.5 },
      isAvailable: true,
    },
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'DeepSeek',
      description: 'DeepSeek 对话模型',
      capabilities: ['chat', 'code'],
      contextWindow: 65536,
      maxTokens: 8192,
      pricing: { input: 0.14, output: 0.28 },
      isAvailable: true,
    },
    {
      id: 'qwen-max',
      name: 'Qwen Max',
      provider: 'Alibaba Cloud',
      description: '通义千问 Max',
      capabilities: ['chat', 'code'],
      contextWindow: 32768,
      maxTokens: 8192,
      pricing: { input: 0.04, output: 0.12 },
      isAvailable: true,
    },
    {
      id: 'qwen-plus',
      name: 'Qwen Plus',
      provider: 'Alibaba Cloud',
      description: '通义千问 Plus',
      capabilities: ['chat'],
      contextWindow: 32768,
      maxTokens: 8192,
      pricing: { input: 0.02, output: 0.06 },
      isAvailable: true,
    },
    {
      id: 'glm-4',
      name: 'GLM-4',
      provider: 'Zhipu AI',
      description: '智谱 GLM-4 对话模型',
      capabilities: ['chat', 'code'],
      contextWindow: 131072,
      maxTokens: 4096,
      pricing: { input: 0.1, output: 0.1 },
      isAvailable: true,
    },
    {
      id: 'ollama/llama3',
      name: 'Llama 3 (Ollama)',
      provider: 'Ollama',
      description: '本地运行的开源模型',
      capabilities: ['chat'],
      contextWindow: 8192,
      maxTokens: 2048,
      pricing: { input: 0, output: 0 },
      isAvailable: true,
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'Google',
      description: 'Google Gemini 快速多模态模型',
      capabilities: ['chat', 'vision', 'tool_use'],
      contextWindow: 1048576,
      maxTokens: 8192,
      pricing: { input: 0.15, output: 0.6 },
      isAvailable: true,
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      description: 'Google Gemini 旗舰模型',
      capabilities: ['chat', 'vision', 'tool_use', 'code'],
      contextWindow: 1048576,
      maxTokens: 8192,
      pricing: { input: 3.5, output: 10.5 },
      isAvailable: true,
    },
  ];

  listModels() {
    return this.models;
  }

  modelDetail(modelId: string) {
    return this.models.find((m) => m.id === modelId) || null;
  }

  getModel(modelId: string) {
    return this.models.find((m) => m.id === modelId);
  }
}
