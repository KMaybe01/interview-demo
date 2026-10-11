import type { ComponentType } from 'react';
import ChatStage from './01-chat/ChatStage.tsx';
import RagStage from './02-rag/RagStage.tsx';
import ProdStage from './04-prod/ProdStage.tsx';

export type StageStatus = 'ready' | 'building';

export interface StageMeta {
  id: string;
  title: string;
  goal: string;
  status: StageStatus;
  /** 对应 docs/S5-AI 的哪一篇，方便文档与代码互相跳转。 */
  docPath?: string;
  component: ComponentType;
}

/**
 * 关卡注册表 —— 每完成一关就把它加进来。
 * 已交付：① 流式对话、② 知识增强 RAG、④ 企业级工程化（护栏/熔断/Trace）。
 * 其余关卡给出占位卡片，说明它们解决什么问题。
 */
export const STAGES: StageMeta[] = [
  {
    id: 'chat',
    title: '① 流式对话',
    goal: 'TTFT、parts 渲染、中断与成本可见',
    status: 'ready',
    docPath: 'docs/S5-AI/01-第一关-流式对话/index.md',
    component: ChatStage,
  },
  {
    id: 'rag',
    title: '② 知识增强 RAG',
    goal: '分块 / 检索 / 溯源 / 评测闭环',
    status: 'ready',
    docPath: 'docs/S5-AI/02-第二关-知识增强RAG/index.md',
    component: RagStage,
  },
  {
    id: 'agent',
    title: '③ Agent 与工具',
    goal: '工具契约 / 停止条件 / 人工审批',
    status: 'building',
    docPath: 'docs/S5-AI/03-第三关-Agent与工具/index.md',
    component: () => <StagePlaceholder title="③ Agent 与工具" stageId="agent" />,
  },
  {
    id: 'prod',
    title: '④ 企业级工程化',
    goal: '护栏 / 熔断降级 / Trace 瀑布 / 成本',
    status: 'ready',
    docPath: 'docs/S5-AI/04-第四关-企业级工程化/index.md',
    component: ProdStage,
  },
  {
    id: 'proto',
    title: '⑤ 协议与多 Agent',
    goal: 'MCP 2026-07-28 / A2A v1.0',
    status: 'building',
    docPath: 'docs/S5-AI/05-第五关-协议与多Agent/index.md',
    component: () => <StagePlaceholder title="⑤ 协议与多 Agent" stageId="proto" />,
  },
  {
    id: 'ui',
    title: '⑥ 前端 AI 交互层',
    goal: '生成式 UI / 端侧推理',
    status: 'building',
    docPath: 'docs/S5-AI/06-第六关-前端AI交互层/index.md',
    component: () => <StagePlaceholder title="⑥ 前端 AI 交互层" stageId="ui" />,
  },
];

/** 占位卡片：说明这一关做什么、为什么现在还没有。 */
export function StagePlaceholder({ title, stageId }: { title: string; stageId: string }) {
  return (
    <div style={{ padding: 28, maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ color: '#9aa3b2', lineHeight: 1.8 }}>
        这一关正在建设中。按计划会交付：<strong>网关/护栏/观测/评测</strong>{' '}
        等企业级能力的最小可跑实现， 并且全部能落到本仓库已有的 Go 后端实现上对照阅读。
      </p>
      <p style={{ color: '#9aa3b2', lineHeight: 1.8 }}>
        当前可以先做两件事：看完第一关的代码把它跑起来；再去
        <code style={{ margin: '0 4px' }}>backend/internal/</code>
        里读对应能力的服务端实现。
      </p>
      <p style={{ color: '#6b7280', fontSize: 12 }}>stage id: {stageId}</p>
    </div>
  );
}
