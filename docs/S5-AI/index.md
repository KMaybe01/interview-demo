# AI Agent 全栈开发 · 前端转型指南

> **定位**：面向有 React/TS 基础的前端开发者，从零到一构建生产级 AI Agent 应用。
>
> **前置要求**：熟悉 TypeScript + React Hooks，了解 HTTP/API 基本概念。不需要机器学习背景。
>
> **技术基线**：AI SDK 7 + MCP 2026-07-28 + A2A v1.0（Linux Foundation）

---

## 版本基线（唯一真源）

> 全库所有版本声明以此表为准。各章节**只引用、不自创**版本号；如与下表冲突，以本表为准并回帖修正。

**基线核对日期**：2026-09-30

| 维度 | 基线值 | 核验来源 |
|------|--------|---------|
| **AI SDK** | `ai@7.0.123`（`engines: node >= 22`，peerDeps `zod ^3.25.76 \|\| ^4.1.8`） | npm registry `ai/latest` |
| **React 适配器** | `@ai-sdk/react@^4` | 本仓库 `apps/ai-demo/package.json` |
| **React** | `19.x` | 本仓库 `apps/ai-demo/package.json` |
| **MCP 规范** | `2026-07-28`（上一稳定版 `2025-11-25`） | modelcontextprotocol.io/specification/2026-07-28 |
| **A2A 规范** | `v1.0`（2026-03 发布，首个生产就绪版） | a2aproject / Linux Foundation Agentic AI Foundation |
| **前沿模型** | GPT-6 Astra/Sol/Luna、Claude Opus 5.5 / Sonnet 5.5、Gemini 3 系、DeepSeek V4、Qwen3.x | 2026-09 公开发布信息 |
| **前端 AI UI** | AI Elements、assistant-ui、CopilotKit、AG-UI、`@ant-design/x`、`@a2ui/react` | 公开仓库 / 发布信息 |
| **包管理器** | `bun`（本仓库禁止 npm/yarn/pnpm） | 根 `AGENTS.md` |

### 关于「AI SDK 6.x」

`01-实战篇/06-前沿技术与生态.md` 曾把 AI SDK 6.x 描述为「2026+ 新版」，该表述已作废。
当前主线为 **AI SDK 7**；v6→v7 存在 breaking change（详见 [01-实战篇/09](./01-实战篇/09-AI%20SDK%20数据连接与聊天.md) 的迁移小节）。
历史版本仅可在「演进脉络」语境中出现，不得作为示例基线。

### 关于模型代际

`GPT-4o` / `Claude 3.5 Sonnet` / `Gemini 1.5 Pro` / `Llama 3.1` / `Qwen 2.5` 属 **2024 代际**，
仅可出现在「技术演进史」语境；**选型与示例一律使用上表的 2026 基线**。

---

## 目录结构

```
S5-AI/
├── index.md                              ← 你在这里（含版本基线表）
├── 00-入门与选型/                         # 入门指南
│   ├── 01-前端转型Agent路线图.md          # 学习路径
│   ├── 02-技术选型对比合集.md             # 技术栈对比（精简版）
│   └── 03-AI应用市场与生态.md             # MCP/平台/工具全景
├── 01-实战篇/                            # 实战教程
│   ├── 00-AI推荐学习.md                   # 学习资源与术语
│   ├── 01-入门期-AI聊天室.md
│   ├── 02-进阶期-RAG应用.md
│   ├── 03-深耕期-端侧推理.md
│   ├── 04-专家期-Agent设计.md
│   ├── 05-生产化与工程化.md
│   ├── 06-前沿技术与生态.md               # MCP 2026-07-28 / A2A v1.0
│   ├── 07-技术选型对比合集.md             # 完整版选型（模型矩阵在此）
│   ├── 08-开发实战与架构指南.md
│   ├── 09-AI SDK 数据连接与聊天.md        # AI SDK 7 专题（全库对齐参照）
│   ├── 10-上下文工程与Agent Skills.md     # 2026 核心范式
│   └── 11-生成式UI与前端AI组件生态.md      # AI Elements / assistant-ui / CopilotKit / AG-UI
├── 02-面试篇/                            # 面试准备
│   ├── 00-面试技巧与回答模板.md           # 方法论
│   ├── 01-LLM基础篇.md                  # LLM 核心考点
│   ├── 02-RAG与知识库篇.md              # RAG 考点
│   ├── 03-Agent设计篇.md                # Agent 架构
│   ├── 04-工具与协议篇.md               # Function Calling / MCP / A2A
│   ├── 05-框架与工程篇.md               # AI SDK vs LangChain、部署、监控
│   └── 06-前沿趋势篇.md                 # 2026 趋势
├── 03-课程实战/                          # 课程资源
│   ├── index.md
│   ├── 01-RAG全栈技术实战.md
│   ├── 02-MCP+A2A多Agent实战.md
│   ├── 03-AI编程智能体实战.md
│   └── ...（更多课程）
└── 04-LLM后端/                          # Go 后端教程（与 TS 主线并行的第二条支线）
    ├── index.md
    └── ...（阶段教程）
```

---

## 快速开始

### 1. 学习路径

**六阶段进阶**：

| 阶段 | 主题 | 时间 | 产出 |
|:----:|------|:----:|------|
| ① | AI 原生 UI | 1-2 周 | 流式聊天应用 |
| ② | RAG 知识库 | 2-3 周 | 知识问答系统 |
| ③ | 端侧推理 | 2 周 | 浏览器内 AI |
| ④ | Agent 设计 | 3-4 周 | 自主 Agent |
| ⑤ | 工程化 | 持续 | 生产级系统 |
| ⑥ | 前沿协议 | 持续 | MCP/A2A |

→ 详细路线图：[01-前端转型Agent路线图](./00-入门与选型/01-前端转型Agent路线图.md)

### 2. 技术选型

| 决策点 | 推荐 |
|-------|------|
| **前端框架** | AI SDK 7（React）/ LangChain + LangGraph（后端编排） |
| **向量库** | 小规模 Chroma / pgvector，大规模 Milvus / Qdrant |
| **模型** | 旗舰：GPT-6 系 / Claude Opus 5.5 / Gemini 3；性价比：DeepSeek V4 / Qwen3 |
| **网关** | LiteLLM + LangFuse |
| **部署** | Vercel（MVP）/ AWS（生产） |

→ 详细对比：[02-技术选型对比合集](./00-入门与选型/02-技术选型对比合集.md)（精简）/ [07-技术选型对比合集](./01-实战篇/07-技术选型对比合集.md)（完整）

### 3. 生态全景

| 领域 | 内容 |
|------|------|
| **MCP 工具** | Playwright、GitHub、PostgreSQL、Brave Search |
| **应用平台** | Dify、FastGPT、Coze、MaxKB |
| **Coding 工具** | Cursor、Claude Code、Copilot |
| **SaaS 服务** | OpenAI、Anthropic、DeepSeek、阿里云 |

→ 详细地图：[03-AI应用市场与生态](./00-入门与选型/03-AI应用市场与生态.md)

---

## 面试准备

### 核心考点

| 文件 | 覆盖内容 |
|------|---------|
| [00-面试技巧](./02-面试篇/00-面试技巧与回答模板.md) | 自我介绍、STAR 法则、技术选型答辩 |
| [01-LLM基础](./02-面试篇/01-LLM基础篇.md) | Transformer、KV Cache、Prompt 工程 |
| [02-RAG知识库](./02-面试篇/02-RAG与知识库篇.md) | 分块、检索、重排序、Agentic RAG |
| [03-Agent设计](./02-面试篇/03-Agent设计篇.md) | ReAct、工具设计、安全防护 |
| [04-工具协议](./02-面试篇/04-工具与协议篇.md) | Function Calling、MCP 2026-07-28、A2A v1.0 |
| [05-框架工程](./02-面试篇/05-框架与工程篇.md) | AI SDK vs LangChain、部署、监控 |
| [06-前沿趋势](./02-面试篇/06-前沿趋势篇.md) | 2026 趋势、商业落地 |

### 面试表述要点

> 用「原理 + 取舍」替背口号。下面每条都可以继续追问到实现层。

| 场景 | 表述要点 |
|------|---------|
| 解释 Agent | `Agent = LLM + Tools + Memory + Planning`，并说明停止条件、审批点与可观测性如何落地 |
| 解释 MCP | 「LLM 世界的 USB-C」只是类比；要说清 2026-07-28 后的**无状态请求 + `server/discover` + 扩展体系** |
| 解释 RAG | 「开卷考试」之外，要能讲分块策略、混合检索、Rerank 与 RAGAS 评测闭环 |
| 解释 KV Cache | 用空间换时间；attention 计算量仍是二次增长，缓存消除的是**历史 token 的重复计算** |

---

## 实战资源

### 课程体系

| 课程 | 核心内容 |
|------|---------|
| [01-RAG全栈](./03-课程实战/01-RAG全栈技术实战.md) | 检索增强生成全链路 |
| [02-MCP+A2A](./03-课程实战/02-MCP+A2A多Agent全栈实战.md) | 多 Agent 协作系统 |
| [03-AI编程](./03-课程实战/03-AI编程智能体实战.md) | 编程辅助 Agent |
| [04-全流程](./03-课程实战/04-AI%20Agent全流程解决方案实战.md) | 完整项目落地 |
| [05-大模型训练](./03-课程实战/05-大模型训练.md) | 模型微调与部署 |
| [06-Ollama](./03-课程实战/06-Ollama学习文档.md) | 本地推理 |
| [07-Agent全栈](./03-课程实战/07-Agent全栈开发实战.md) | Agent 应用开发 |

### Go 后端教程

→ [04-LLM后端/index.md](./04-LLM后端/index.md) — Go + Gin 视角的 LLM 后端实现

---

## 一句话理解

| 前端传统开发 | AI Agent 开发 |
|---|---|
| 用户点击 → 代码执行 → UI 更新 | 用户输入 → LLM 推理 + 工具调用 → 结构化输出 |
| 路由定义页面跳转 | Prompt + Context 定义"智能行为" |
| API 调用后端 | Agent 编排 LLM + 工具 + 记忆 |
| CSS 控制视觉 | Architecture 控制智能边界 |

**核心公式**：`Agent = LLM（大脑）+ Tools（手脚）+ Memory（记忆）+ Planning（规划）`

**2026 补充**：还需一层 `Context Engineering（上下文工程）` 决定「什么信息在什么时刻进入模型视野」——
详见 [10-上下文工程与Agent Skills](./01-实战篇/10-上下文工程与Agent%20Skills.md)。

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2025-09 | 重构为新目录结构，精简面试篇，新增应用市场与面试技巧 |
| 2026-07 | 对齐 AI SDK 7 + MCP 2026-07-28 |
| 2026-09 | 建立唯一版本基线表；修正 MCP「有状态」误述与 A2A v0.3→v1.0；AI SDK v4→v7 示例迁移；重做 2026 模型矩阵；新增上下文工程/Agent Skills 与生成式 UI 两章；清理无出处数字与重复章节 |
