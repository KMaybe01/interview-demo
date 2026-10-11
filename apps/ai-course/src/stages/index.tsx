import type { ComponentType } from 'react';
import ChatStage from './01-chat/ChatStage.tsx';
import RagStage from './02-rag/RagStage.tsx';
import AgentStage from './03-agent/AgentStage.tsx';
import ProdStage from './04-prod/ProdStage.tsx';
import ProtoStage from './05-proto/ProtoStage.tsx';
import UiStage from './06-ui/UiStage.tsx';

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
 * 六关全部交付：① 流式对话、② 知识增强 RAG、③ Agent 与工具、
 * ④ 企业级工程化、⑤ 协议与多 Agent、⑥ 前端 AI 交互层。
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
    goal: '工具分级 / 停止条件 / 人工审批',
    status: 'ready',
    docPath: 'docs/S5-AI/03-第三关-Agent与工具/index.md',
    component: AgentStage,
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
    goal: 'MCP 无状态单端点 / A2A 任务状态机',
    status: 'ready',
    docPath: 'docs/S5-AI/05-第五关-协议与多Agent/index.md',
    component: ProtoStage,
  },
  {
    id: 'ui',
    title: '⑥ 前端 AI 交互层',
    goal: '生成式 UI 渲染沙箱 / 端侧推理',
    status: 'ready',
    docPath: 'docs/S5-AI/06-第六关-前端AI交互层/index.md',
    component: UiStage,
  },
];
