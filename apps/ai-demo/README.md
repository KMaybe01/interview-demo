# AI Demo — AI 全栈工程化演示

基于 React 19 + Ant Design 6 构建的 AI 前端交互演示平台，涵盖 AI 应用开发的 **6 个阶段**：从聊天室搭建到生产化工程化，每个阶段对应 `docs/S5-AI/实战篇/` 中的完整文档。

## 功能模块

| 选项卡 | 对应阶段 | 核心功能 |
|--------|----------|----------|
| **Dashboard** | — | 6 指标概览卡片 + ECharts 趋势图 + 页面渲染排行 |
| **AI 聊天** | 入门期 | LLM 流式对话、Token 估算与上下文指标、PII 脱敏显示、错误自动重试、多模型切换 |
| **知识库** | 进阶期 | 知识库 CRUD、文件批量上传、语义搜索、分块策略配置（固定/递归/语义）、Embedding 模型选择、混合搜索开关 |
| **模型管理** | 技术选型 | 模型列表、参数对比表 |
| **智能体** | 专家期 | Agent 创建/执行/删除、工具注册表（6 个内置工具）、执行轨迹 Tree 可视化、逐步播放 + HITL 审核模拟、记忆管理（短期/长期） |
| **Playground** | 前沿 + 生产化 | MCP/A2A 协议服务注册与管理、模型路由配置与降级策略、遥测监控面板（请求/延迟/缓存命中） |
| **插件中心** | 生产化 | 插件浏览与启停 |

## 工具模块 (`src/utils/`)

| 模块 | 对应文档 | 功能 |
|------|----------|------|
| `token-estimator.ts` | 01-入门期 | 中英文混合 Token 估算，支持消息级和字符级统计 |
| `error-handler.ts` | 01-入门期 | 指数退避重试 + 断路器模式 |
| `context-manager.ts` | 01-入门期 | 上下文窗口计算 + 3 种截断策略（滑动窗口/摘要枢轴/丢弃最旧） |
| `text-splitter.ts` | 02-进阶期 | 3 种分块策略（固定大小/递归分割/语义分割） |
| `prompt-guard.ts` | 05-生产化 | 12 种提示注入检测模式，三级严重度分级 |
| `data-masker.ts` | 05-生产化 | PII 脱敏（手机/邮箱/信用卡/身份证/IP/API Key） |
| `response-cache.ts` | 05-生产化 | LRU 语义缓存，支持 TTL 和按模型失效 |
| `telemetry.ts` | 05-生产化 | 遥测收集器（请求计数/延迟分布/事件统计） |

## 快速启动

```bash
# 从项目根目录
bun run dev                  # turbo 并行启动所有服务

# 或单独启动
bun run --cwd apps/ai-demo dev   # 开发服务器 :5175
bun run --cwd apps/ai-demo build # 生产构建
bun run --cwd apps/ai-demo typecheck  # 类型检查
bun run --cwd apps/ai-demo lint      # Biome 代码检查
```

## 构建与拆包策略

构建配置位于 `vite.config.ts` 的 `build.rolldownOptions.output.codeSplitting.groups`，按优先级将第三方依赖拆分为独立 chunk，配合路由懒加载实现按需加载。

### Vendor Chunk（第三方依赖，长期缓存）

| chunk | 体积 / gzip | 内容 | 加载时机 |
|-------|------------|------|----------|
| `vendor-antd-x` | 1139 KB / 392 KB | `@ant-design/x` + `@ant-design/x-sdk`（Bubble/Sender/Conversations 等 AI 组件） | Chat / A2UI |
| `vendor-antd` | 555 KB / 175 KB | `antd` 核心 | 全局 |
| `vendor-a2ui` | 268 KB / 89 KB | `@a2ui/*` 协议库 | 仅 A2UI |
| `vendor-react` | 234 KB / 75 KB | `react` / `react-dom` / `react-is` / `react-router` / `scheduler` / `zustand` | 全局 |
| `vendor-motion` | 125 KB / 41 KB | `motion` 动画引擎（@ant-design/x 依赖） | Chat / A2UI |
| `vendor-antd-x-markdown` | 120 KB / 40 KB | `@ant-design/x-markdown` 流式 Markdown 渲染 | 仅 Chat |
| `vendor-antd-icons` | 50 KB / 12 KB | `@ant-design/icons` | 全局 |
| `vendor-antd-x-card` | 1.5 KB / 0.8 KB | `@ant-design/x-card` 卡片组件 | 仅 A2UI |
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

### 设计原则

1. **按生态拆分**：React / antd / @ant-design/x / @a2ui 各自独立 chunk，依赖不变时 hash 稳定，浏览器长期缓存
2. **按页面细分重依赖**：`x-markdown` 仅 Chat 加载、`x-card` + `a2ui` 仅 A2UI 加载，首屏（Dashboard）无需下载这些重依赖
3. **兜底分组**：`vendor` 捕获零散依赖（如 `purify.es`），避免污染其他 vendor chunk
4. **页面 chunk 极轻**：业务逻辑 chunk 均 < 17 KB，路由切换瞬时

### 优化效果

| chunk | 优化前 | 优化后 | 变化 |
|-------|--------|--------|------|
| `vendor-react` | 890 KB | 234 KB | **-74%** |
| `vendor-antd` | 868 KB | 555 KB | **-36%** |
| `Chat` | 195 KB | 14.7 KB | **-92%** |
| `A2UI` | 279 KB | 10.8 KB | **-96%** |

> 优化前 `@ant-design/x` 系列内联在 `Chat` chunk、`@a2ui` 内联在 `A2UI` chunk，且未归类的共享依赖全堆入 `vendor-react` 导致其虚高至 890 KB。

## 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | React 19, TypeScript 7 |
| 构建 | Vite 8 + Rolldown |
| UI | Ant Design 6 + @ant-design/icons + @ant-design/x |
| AI SDK | @ant-design/x-sdk |
| 状态 | Zustand 5 |
| 主题 | @interview-demo/shared-theme（Zustand store via data-theme attribute） |
| 测试 | Vitest 4 + @testing-library/react 16 |
| 格式/Lint | Biome（单引号、分号、尾逗号、行宽 100） |
| 文档 | docs/S5-AI/实战篇/（9 篇 Markdown） |

## 项目结构

```
src/
├── AIDemo.tsx              # 主应用壳，XProvider + 侧边栏 8 选项卡
├── App.tsx                 # 根组件，ConfigProvider + 主题切换
├── components/
│   ├── Chat.tsx            # AI 聊天（Bubble.List + Sender + Conversations + Welcome + Prompts）
│   ├── KnowledgeBase.tsx   # 知识库管理（RAG）
│   ├── Models.tsx          # 模型管理
│   ├── Agents.tsx          # 智能体（工具/记忆/轨迹/HITL）
│   ├── Playground.tsx      # MCP/A2A + 模型路由 + 遥测
│   ├── Plugins.tsx         # 插件中心
│   ├── Dashboard.tsx       # 控制台
│   └── ErrorBoundary.tsx   # 错误边界
├── services/api.ts         # API 客户端，含 SSE 流式读取
├── stores/
│   ├── chatStore.ts        # 对话历史 Zustand store
│   └── themeStore.ts       # 主题切换 (re-export from @interview-demo/shared-theme, data-theme DOM 策略)
├── types/index.ts          # 类型定义
└── utils/                  # 8 个工具模块
```

## 关联文档

- [AI 实战篇](../../docs/S5-AI/实战篇/01-入门期-AI聊天室.md) — 聊天/Token/流式/上下文管理
- [AI 实战篇](../../docs/S5-AI/实战篇/02-进阶期-RAG应用.md) — RAG/分块/Embedding/搜索
- [AI 实战篇](../../docs/S5-AI/实战篇/04-专家期-Agent设计.md) — Agent/工具/记忆/HITL/轨迹
- [AI 实战篇](../../docs/S5-AI/实战篇/05-生产化与工程化.md) — Prompt 安全/数据脱敏/缓存/遥测/网关
- [AI 实战篇](../../docs/S5-AI/实战篇/06-前沿技术与生态.md) — MCP/A2A 协议
