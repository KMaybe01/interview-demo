import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ModelTier } from '../shared/cost.ts';
import { createOfflineModel } from './mockModel.ts';

/**
 * 模型注册表 —— 企业级 AI 应用的第一块地基。
 *
 * 三条约定：
 *   1. **按任务档位命名**（fast / smart），不按厂商命名。换厂商时不改业务代码。
 *   2. **型号从环境变量读**。厂商型号迭代极快，写死在代码里必过期。
 *   3. **没有 Key 就降级**，而不是让页面白屏 —— 这是"容灾"的最小雏形。
 *
 * 生产环境下还应在这里叠加：健康检查、连续失败熔断、按配额自动降级（见第四关）。
 */

export interface ModelEntry {
  id: string;
  tier: ModelTier;
  label: string;
  provider: 'openai' | 'offline';
}

const hasKey = (value: string | undefined): boolean => Boolean(value && value.length > 0);

const OPENAI_KEY = process.env.OPENAI_API_KEY;

/** 是否处于「零配置离线演示」模式。 */
export const isOfflineMode = !hasKey(OPENAI_KEY);

const openai = OPENAI_KEY ? createOpenAI({ apiKey: OPENAI_KEY }) : null;

const CATALOG: Record<Exclude<ModelTier, 'offline'>, ModelEntry> = {
  // 型号请以厂商当期文档 / Gateway `/v1/models` 实列为准，别照抄这里的默认值
  fast: {
    id: process.env.AI_COURSE_MODEL_FAST ?? 'gpt-5-mini',
    tier: 'fast',
    label: '快速档 · 日常对话',
    provider: 'openai',
  },
  smart: {
    id: process.env.AI_COURSE_MODEL_SMART ?? 'gpt-5',
    tier: 'smart',
    label: '旗舰档 · 复杂任务',
    provider: 'openai',
  },
};

export interface Catalog {
  mode: 'online' | 'offline';
  models: ModelEntry[];
}

export function listModels(): Catalog {
  if (isOfflineMode || !openai) {
    return {
      mode: 'offline',
      models: [
        {
          id: 'course-offline-mock',
          tier: 'offline',
          label: '离线演示 · 本地假模型',
          provider: 'offline',
        },
      ],
    };
  }
  return { mode: 'online', models: [CATALOG.fast, CATALOG.smart] };
}

export interface ResolvedModel {
  model: LanguageModel;
  entry: ModelEntry;
}

/** 按档位拿到可直接喂给 `streamText` 的模型实例。 */
export function resolveModel(tier: ModelTier): ResolvedModel {
  if (isOfflineMode || !openai) {
    return {
      model: createOfflineModel(),
      entry: listModels().models[0],
    };
  }
  const key = tier === 'smart' ? 'smart' : 'fast';
  const entry = CATALOG[key];
  return { model: openai(entry.id), entry };
}
