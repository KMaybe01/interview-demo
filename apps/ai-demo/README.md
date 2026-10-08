# AI Demo — AI 全栈工程化演示

基于 React 19 + Ant Design 6 + @ant-design/x 构建的 AI 前端交互演示平台，由 Go 后端（`backend/internal/*`）统一提供 `/api/ai/*` 能力，覆盖从 LLM 对话到生产化工程化的完整链路：模型路由与降级、RAG、工具调用 + 人工确认（HITL）、MCP / A2A 协议、LLMOps 可观测与离线评测。

## 功能模块

| 选项卡 | 核心功能 | 后端能力 |
|--------|----------|----------|
| **控制台** | 资源统计 + AI 侧 24h 运行指标 | `/api/ai/models` `/tools` `/obs/metrics` `/a2a/agents` |
| **AI 聊天** | 流式对话（SSE）、多模型路由、RAG 引用来源、工具调用轨迹、HITL 人工确认、Token/成本、离线降级提示 | `/api/ai/chat/stream` `/api/ai/approvals` |
| **知识库** | 知识库 CRUD、语义搜索、混合检索、分块配置 | `/api/knowledge/*` |
| **模型管理** | 真实 provider 注册表、可用性标注、连接探测 | `/api/ai/models` `/api/ai/chat` |
| **智能体** | ReAct / Function Calling / Multi-Agent、执行轨迹、HITL、记忆 | `/api/agents/*`（`internal/agent`） |
| **协议控制台** | MCP 2026-07-28（无状态）+ A2A v1.0（Agent 协作）实机调用 | `/api/ai/mcp` `/api/ai/a2a/*` |
| **LLMOps** | 延迟分位 / Token / 成本、链路追踪、工具审计、评测、Prompt 版本 | `/api/ai/obs/*` `/api/ai/eval/*` `/api/ai/prompts` |
| **A2UI** | 声明式 UI 生成 | `@a2ui/react` |

## 工具模块 (`src/utils/`)

| 模块 | 功能 |
|------|------|
| `token-estimator.ts` | 中英文混合 Token 估算，支持消息级和字符级统计 |
| `error-handler.ts` | 指数退避重试 + 断路器模式 |
| `context-manager.ts` | 上下文窗口计算 + 3 种截断策略（滑动窗口/摘要枢轴/丢弃最旧） |
| `text-splitter.ts` | 3 种分块策略（固定大小/递归分割/语义分割） |
| `prompt-guard.ts` | 12 种提示注入检测模式，三级严重度分级 |
| `data-masker.ts` | PII 脱敏（手机/邮箱/信用卡/身份证/IP/API Key） |
| `response-cache.ts` | LRU 语义缓存，支持 TTL 和按模型失效 |
| `telemetry.ts` | 遥测收集器（请求计数/延迟分布/事件统计） |

## 快速启动

```bash
# 从项目根目录
bun run dev                  # turbo 并行启动所有服务

# 或单独启动
bun run --cwd apps/ai-demo dev      # 开发服务器 :5175
bun run --cwd apps/ai-demo build    # 生产构建
bun run --cwd apps/ai-demo typecheck # 类型检查
bun run --cwd apps/ai-demo lint     # Biome 代码检查
```

## 构建与拆包策略

构建配置位于 `vite.config.ts`，按优先级将第三方依赖拆分为独立 chunk，配合路由懒加载实现按需加载。

### Vendor Chunk（第三方依赖，长期缓存）

| chunk | 体积 / gzip | 内容 | 加载时机 |
|-------|------------|------|----------|
| `vendor-antd-x` | 1139 KB / 392 KB | `@ant-design/x` + `@ant-design/x-sdk` | Chat / A2UI |
| `vendor-antd` | 555 KB / 175 KB | `antd` 核心 | 全局 |
| `vendor-a2ui` | 268 KB / 89 KB | `@a2ui/*` 协议库 | 仅 A2UI |
| `vendor-react` | 234 KB / 75 KB | `react` / `react-dom` / `react-is` / `react-router` / `scheduler` / `zustand` | 全局 |
| `vendor-motion` | 125 KB / 41 KB | `motion` 动画引擎 | Chat / A2UI |
| `vendor-antd-x-markdown` | 120 KB / 40 KB | `@ant-design/x-markdown` 流式 Markdown | 仅 Chat |
| `vendor-antd-icons` | 50 KB / 12 KB | `@ant-design/icons` | 全局 |
| `vendor-antd-x-card` | 1.5 KB / 0.8 KB | `@ant-design/x-card` | 仅 A2UI |
| `vendor` | — | 其他 `node_modules` 兜底 | 按需 |

### 页面 Chunk（业务逻辑，路由懒加载）

| 页面 | 体积 / gzip |
|------|------------|
| Agents | 16.9 KB / 5.8 KB |
| Chat | 14.7 KB / 5.3 KB |
| KnowledgeBase | 11.0 KB / 4.1 KB |
| A2UI | 10.8 KB / 3.5 KB |
| Dashboard | 9.1 KB / 3.2 KB |
| Playground | 8.7 KB / 3.2 KB |
| Plugins | 5.8 KB / 2.2 KB |
| Models | 4.0 KB / 1.6 KB |

### 优化效果

| chunk | 优化前 | 优化后 | 变化 |
|-------|--------|--------|------|
| `vendor-react` | 890 KB | 234 KB | **-74%** |
| `vendor-antd` | 868 KB | 555 KB | **-36%** |
| `Chat` | 195 KB | 14.7 KB | **-92%** |
| `A2UI` | 279 KB | 10.8 KB | **-96%** |

## 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | React 19, TypeScript 7 |
| 构建 | Vite 8 + Rolldown |
| UI | Ant Design 6 + @ant-design/x |
| AI SDK | @ant-design/x-sdk |
| 状态 | Zustand 5 |
| 主题 | @interview-demo/shared-theme（Zustand store via data-theme attribute） |
| 测试 | Vitest 4 + @testing-library/react 16 |
| 格式/Lint | Biome（单引号、分号、尾逗号、行宽 100） |

## 项目结构

```
src/
├── AIDemo.tsx              # 主应用壳，XProvider + 侧边栏 8 选项卡
├── App.tsx                 # 根组件，ConfigProvider + 主题切换
├── components/
│   ├── AIChat.tsx          # 企业级聊天：流式 + 工具调用 + RAG 引用 + HITL + 用量
│   ├── KnowledgeBase.tsx   # 知识库管理（RAG）
│   ├── Models.tsx          # 模型管理（真实 provider 注册表）
│   ├── Agents.tsx          # 智能体（工具/记忆/轨迹/HITL）
│   ├── ProtocolConsole.tsx # MCP 2026-07-28 + A2A v1.0 协议控制台
│   ├── Observability.tsx   # LLMOps：指标/链路/审计/评测/Prompt
│   ├── Dashboard.tsx       # 控制台
│   ├── A2UI.tsx            # 声明式 UI
│   └── ErrorBoundary.tsx   # 错误边界
├── services/
│   ├── api.ts              # 旧版知识库/智能体 API 客户端
│   ├── aiApi.ts            # /api/ai/* REST 客户端（模型/工具/HITL/obs/评测/Prompt/MCP/A2A）
│   └── aiStream.ts         # /api/ai/chat/stream SSE 解析器（处理分帧边界）
├── stores/
│   ├── chatStore.ts        # 对话历史 Zustand store
│   └── themeStore.ts       # 主题切换 (re-export from @interview-demo/shared-theme)
├── types/
│   ├── index.ts            # 通用类型
│   └── ai.ts               # /api/ai/* 契约类型（与后端 JSON tag 对齐）
└── utils/                  # 8 个工具模块
```

## 后端契约（backend/）

前端不再直连模型厂商（旧的 `AISDKDemo` 直连 Google 密钥的方式已移除，存在密钥泄露风险）。所有 AI 能力统一由 Go 后端 `backend/internal/` 提供：

| 包 | 职责 |
|----|------|
| `llm` | Provider 注册表（OpenAI/DeepSeek/Gemini/Qwen/Ollama）+ 离线降级 + 熔断 + 定价估算 |
| `tool` | 工具注册中心：参数净化沙箱 + 权限分级（L0/L1/L2）+ 幂等 + 超时 + 审计 |
| `guard` | Prompt 注入检测 + PII 脱敏 + 输入分隔符隔离 |
| `airouter` | 编排层：Agentic 循环（RAG → 工具 → 重试 → HITL） + SSE 事件 + HTTP handler |
| `mcp` | MCP 2026-07-28 无状态单端点 + MRTR + 幂等 + 双版本兼容 |
| `a2a` | A2A v1.0：Agent 卡片 / message/send / 任务状态机 / 取消 |
| `obs` | 链路追踪 / 运行计数 / 工具审计 / 离线评测 / Prompt 版本 |

配置方式：在 `backend/.env` 中填入对应厂商的 `*_API_KEY`，后端启动时自动装配；未配置密钥的请求会走离线降级链（`degraded=true`），UI 会明确提示。
