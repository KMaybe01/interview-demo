# AI Demo — AI 全栈工程化演示

基于 React 19 + Ant Design 6 + @ant-design/x 构建的 AI 前端交互演示平台，涵盖 AI 应用开发的 **6 个阶段**：从聊天室搭建到生产化工程化。

## 功能模块

| 选项卡 | 对应阶段 | 核心功能 |
|--------|----------|----------|
| **Dashboard** | — | 6 指标概览卡片 + ECharts 趋势图 |
| **AI 聊天** | 入门期 | LLM 流式对话（Bubble.List + Sender）、Token 估算与上下文指标、PII 脱敏显示、错误自动重试、多模型切换 |
| **知识库** | 进阶期 | 知识库 CRUD、文件批量上传、语义搜索、分块策略配置（固定/递归/语义）、Embedding 模型选择、混合搜索开关 |
| **模型管理** | 技术选型 | 模型列表、参数对比表 |
| **智能体** | 专家期 | Agent 创建/执行/删除、工具注册表（6 个内置工具）、执行轨迹 Tree 可视化、逐步播放 + HITL 审核模拟、记忆管理（短期/长期） |
| **Playground** | 前沿 + 生产化 | MCP/A2A 协议服务注册与管理、模型路由配置与降级策略、遥测监控面板（请求/延迟/缓存命中） |
| **插件中心** | 生产化 | 插件浏览与启停 |
| **A2UI** | 前沿 | @a2ui/react 集成 A2A 协议 UI 组件 |

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
│   ├── Chat.tsx            # AI 聊天（Bubble.List + Sender + Conversations + Welcome + Prompts）
│   ├── KnowledgeBase.tsx   # 知识库管理（RAG）
│   ├── Models.tsx          # 模型管理
│   ├── Agents.tsx          # 智能体（工具/记忆/轨迹/HITL）
│   ├── Playground.tsx      # MCP/A2A + 模型路由 + 遥测
│   ├── Plugins.tsx         # 插件中心
│   ├── Dashboard.tsx       # 控制台
│   ├── A2UI.tsx            # A2A 协议 UI 集成
│   └── ErrorBoundary.tsx   # 错误边界
├── services/api.ts         # API 客户端，含 SSE 流式读取
├── stores/
│   ├── chatStore.ts        # 对话历史 Zustand store
│   └── themeStore.ts       # 主题切换 (re-export from @interview-demo/shared-theme)
├── types/index.ts          # 类型定义
└── utils/                  # 8 个工具模块
```
