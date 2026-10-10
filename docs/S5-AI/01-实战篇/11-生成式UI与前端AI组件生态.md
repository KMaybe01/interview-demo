# 生成式 UI 与前端 AI 组件生态

> **为什么单独成章**：这是前端在 Agent 时代最稳固的护城河。后端能编排 Agent，
> 但"Agent 的输出如何在浏览器里被看见、被中断、被审批、被无障碍访问"只能由前端负责。

---

## 一句话理解

| 路线 | 产物 | 时机 | 代表 |
|---|---|---|---|
| **AI 生成代码**（Code Gen） | 源码文件 | 开发期，一次性 | v0.dev、Bolt.new、Claude Artifacts |
| **生成式 UI**（Generative UI） | 结构化**组件描述** | 运行期，每次对话 | `Output.object` + 组件注册表、A2UI、MCP Apps |

**核心区别**：代码生成交给人类 review 后入库；生成式 UI 是**运行时**由 Agent 输出组件树，前端即时渲染，
因此需要 schema 约束、白名单组件、流式渲染与安全边界。

---

## 一、生成式 UI 的三种协议形态

| 形态 | 机制 | 优点 | 代价 | 适用 |
|---|---|---|---|---|
| **结构化对象 + 组件注册表** | 模型输出受 schema 约束的对象，前端映射到白名单组件 | 安全可控、可主题化、易测试 | 表现力受组件集限制 | 企业内部工具、中后台 |
| **A2UI / 组件树描述** | Agent 输出带类型与 props 的组件树，前端递归渲染 | 表现力强、可流式增量渲染 | 需要严格白名单与校验 | 面向 C 端的 AI 原生产品 |
| **MCP Apps** | MCP Server 提供 `ui://` 资源，宿主在**受限 iframe** 渲染，`postMessage` + JSON-RPC 通信 | 跨宿主复用、天然隔离（不接触宿主 DOM/Cookie/Storage） | 需要宿主支持；iframe 交互有延迟 | MCP 生态内的图表/表单/审批 |

> MCP Apps 属于 MCP `2026-07-28` 的**正式扩展**，需要客户端与服务器显式协商后才能使用；
> 详见 [06-前沿技术与生态](./06-前沿技术与生态.md)。

---

## 二、前端 AI 组件库怎么选

| 方案 | 定位 | 技术栈耦合 | 适用 |
|---|---|---|---|
| **AI Elements** | 基于 shadcn/ui 的可组合 AI 组件（会话、消息、工具调用、代码块等） | Tailwind + shadcn | 自建聊天/Agent 界面，要完全掌控样式 |
| **assistant-ui** | 可定制的 Chat UI 组件库 + 运行时 | React | 商业产品级对话界面 |
| **CopilotKit** | Copilot 侧边栏 + 应用状态双向同步 + 生成式 UI 运行时 | React | 给已有应用"加一个 Copilot" |
| **AG-UI** | Agent ↔ UI 的**通信协议**（事件流、状态同步） | 跨框架 | 多 Agent / 跨厂商前端 |
| **@ant-design/x** | Ant Design 体系的 AI 组件（Bubble / Sender / Conversations / Welcome / Prompts） | React + antd | 中后台 AI 界面（本仓库 `apps/ai-demo` 在用） |
| **A2UI** | Agent 输出结构化 UI 描述，前端渲染组件树 | React | 生成式 UI 运行时 |

**选型经验**：

- 已有 antd 中后台 → `@ant-design/x`（本仓库 `apps/ai-demo/src/components/Chat.tsx` 即该路线）
- 用 shadcn/Tailwind 的新项目 → AI Elements
- 要在既有系统里嵌 Copilot → CopilotKit
- 需要跨后端/多 Agent 统一事件模型 → AG-UI
- 要让 Agent **产出界面**而不是文本 → A2UI 或 MCP Apps

---

## 三、AI SDK 7 的最小实现

### 1. 服务端：schema 强约束输出

```typescript
// app/api/ui/route.ts
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';

// ✅ 白名单式 schema：模型只能在这几种卡片里选
const UISchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('metric'), label: z.string(), value: z.string(), delta: z.string().optional() }),
  z.object({ type: z.literal('table'), columns: z.array(z.string()), rows: z.array(z.array(z.string())) }),
  z.object({ type: z.literal('text'), content: z.string() }),
]);

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await generateText({
    model: openai('gpt-5-mini'), // 按 ../../index.md 基线表选当期型号
    prompt,
    output: Output.object({ schema: UISchema }), // generateObject 已废弃
  });

  return Response.json(result.output);
}
```

### 2. 客户端：流式对象 + 组件注册表

```tsx
'use client';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { UISchema } from './schema';

const registry = {
  metric: MetricCard,
  table: DataTable,
  text: TextBlock,
} as const;

export function GenerativePanel({ prompt }: { prompt: string }) {
  const { object, submit, isLoading, error, stop } = useObject({
    api: '/api/ui',
    schema: UISchema,
  });

  // ✅ 渲染前做一次校验：未知类型一律降级为文本
  const Comp = object && object.type in registry ? registry[object.type] : TextBlock;

  return (
    <div>
      {isLoading && <Skeleton active />}
      {error && <Alert type="error" message="生成失败，请重试" />}
      {object && <Comp {...object} />}
      <Button onClick={stop}>停止</Button>
    </div>
  );
}
```

> 关键点：**schema 既是输出约束，也是安全边界**。宁可表现力受限，也不要让模型输出任意 HTML。

---

## 四、前端必须做对的六件事

| 事项 | 要求 | 为什么 |
|---|---|---|
| **流式渲染** | 首字尽快出现；按语义粒度分块（中文用词粒度，避免逐字抖动） | TTFT 是体感第一指标；`smoothStream` 可平滑分块 |
| **状态机** | `status: ready / submitted / streaming / error` 驱动 UI，不要自己猜 | 中断、重试、错误提示才有确定行为 |
| **可中断** | 提供 stop，并正确处理"部分结果" | 用户不会为长任务无限等待 |
| **工具调用可视化** | 展示 `tool-call` / `tool-result` part，长任务显示进度 | 黑盒执行会摧毁信任感 |
| **审批 UI（HITL）** | 高风险动作（写库、付款、发消息）必须显式确认，附参数预览 | 对应 MCP 的 MRTR `input_required` 与 `Tasks` |
| **安全渲染** | 不 `dangerouslySetInnerHTML` 模型输出；Markdown 渲染要开 sanitize | 模型输出是不可信输入，等价于用户输入 |

**无障碍**：流式区域用 `aria-live="polite"` 而不是 `assertive`；骨架屏与停止按钮要有可读标签；
键盘可达性不能因为流式更新而丢失焦点。

---

## 五、面试问答

**Q：生成式 UI 和 AI 生成代码有什么区别？**

> 生成代码是**开发期**产物，要人工 review 后入库；生成式 UI 是**运行期**由 Agent 输出结构化组件描述、
> 前端即时渲染。因此后者必须解决 schema 约束、白名单组件、流式渲染、中断与审批、以及安全边界。

**Q：模型返回任意 HTML/JS，前端直接渲染会怎样？**

> 等于把不可信输入当代码执行：XSS、数据外带、UI 欺骗（伪造确认按钮）都可能发生。
> 正确做法是 schema 约束 + 组件白名单 + 渲染前校验；确需富文本时先 sanitize，
> 需要第三方界面时用 iframe 隔离（MCP Apps 就是这条路线）。

**Q：AI 聊天界面和普通列表渲染有什么本质区别？**

> 三点：① 数据是**增量流式**的，组件要能接受"不完整的中间态"；② 存在**状态机**（提交/流式/错误），
> UI 要驱动中断与重试；③ 内容里混有**异构 part**（文本、推理、工具调用、来源、文件），
> 而不是纯文本字符串（AI SDK 7 的 `message.parts`）。

---

## 延伸阅读

- 本仓库实现：`apps/ai-demo/src/components/Chat.tsx`（`@ant-design/x` + Zustand）
- 本仓库实现：`apps/ai-demo/src/components/AISDKDemo.tsx`（`streamText` + 流式）
- [09-AI SDK 数据连接与聊天](./09-AI%20SDK%20数据连接与聊天.md) — `UIMessageStream`、`parts`、`experimental_useObject`
- [10-上下文工程与Agent Skills](./10-上下文工程与Agent%20Skills.md) — 决定 Agent 产出质量的上下文设计
- [06-前沿技术与生态](./06-前沿技术与生态.md) — MCP Apps、AG-UI
