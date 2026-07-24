# AGENTS.md

## 先做

```bash
bun install          # 只能用 bun, 不能用 npm（从根目录安装所有 workspace）
```

## 开发命令

### Turborepo（根目录执行）

| 命令 | 说明                                                                       |
|------|--------------------------------------------------------------------------|
| `bun run dev` | 并行启动所有 dev server（frontend :5173 + ai-demo :5175 + interview-docs :5000） |
| `bun run preview` | `turbo run preview` — 预览所有已构建的 Vite 应用（依赖 build）                         |
| `bun run build` | `turbo run build` — 构建所有 workspace（缓存加速）                                 |
| `bun run build --filter=@interview-demo/frontend` | 仅构建 frontend                                                             |
| `bun run test` | `turbo run test` — 运行所有 workspace 测试                                     |
| `bun run lint` | `turbo run lint` — 并行 lint 所有 workspace                                  |
| `bun run format` | `turbo run format` — 并行 format 所有 workspace                              |
| `bun run typecheck` | `turbo run typecheck` — 并行类型检查                                           |

### 单个 workspace 直接执行

`apps/frontend/`：

| 命令 | 说明 |
|------|------|
| `bun run --cwd apps/frontend dev` | Vite 开发服务器 (port 5173, `/api` + `/ws` 代理到 `:8080`) |
| `bun run --cwd apps/frontend build` | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit && vite build` (Rolldown Rust 打包) |
| `bun run --cwd apps/frontend test:watch` | `vitest` (监听模式) |
| `bun run --cwd apps/frontend lint` | `bunx biome check --write src/` (Biome 是**唯一**的 linter/formatter) |
| `bun run --cwd apps/frontend format` | `bunx biome format --write src/` |
| `bun run --cwd apps/frontend typecheck` | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit` — 类型检查 |

也可直接 `cd apps/frontend` 后执行上述命令。

`apps/ai-demo/`（AI Demo 独立项目）：

| 命令 | 说明 |
|------|------|
| `bun run --cwd apps/ai-demo dev` | Vite 开发服务器 (port 5175, `/api` 代理到 `:8080`) |
| `bun run --cwd apps/ai-demo build` | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit && vite build` |
| `bun run --cwd apps/ai-demo test` | `vitest run` |
| `bun run --cwd apps/ai-demo lint` | `bunx biome check --write src/` |
| `bun run --cwd apps/ai-demo typecheck` | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit` |

`apps/interview-docs/`（前端知识库文档站点）：

| 命令 | 说明 |
|------|------|
| `cd apps/interview-docs && bun run dev` | Vite 开发服务器 (port 5000) |
| `cd apps/interview-docs && bun run build` | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit && vite build && node gen-version.mjs` |
| `cd apps/interview-docs && bun run lint` | `bunx biome check --write .` |

`backend/`（Go backend）：

```bash
go run ./cmd/server/          # Gin :8080
go test ./internal/... -v
```

## 架构

- **前端入口**: `apps/frontend/src/main.tsx` → `apps/frontend/src/App.tsx` → `apps/frontend/src/layouts/MainLayout.tsx`
- **路由**: `apps/frontend/src/routes/index.tsx` — 14 个懒加载页面（含 Dashboard）+ 1 个 Eager 加载登录页，自动映射到侧边栏
- **认证守卫**: `apps/frontend/src/components/AuthGuard.tsx` 保护除 `/login` 外的所有路由
- **状态管理**: Zustand store 位于 `apps/frontend/src/stores/`，通过 `apps/frontend/src/stores/index.ts` 桶文件导出
- **API 客户端**: `apps/frontend/src/utils/fetchClient.ts` (Axios，自动注入 Bearer Token，401 自动刷新 + 请求重放)
- **后端**: Go backend (`backend/`) — 19 个内部包覆盖认证、支付、表单、GIS、上传、监控等全部 API 需求
- **前端知识库**: `apps/interview-docs/` — React 19 文档站点，Markdown 内容，GitHub Pages 部署
- **AI Demo**: `apps/ai-demo/` — 独立项目，6 选项卡 AI 演示（聊天/知识库/模型/智能体/插件/控制台）
- **共享主题包**: `packages/shared-theme/` — 统一管理 dark/light 主题切换，提供 Zustand store（`useThemeStore`）和 React hook（`useTheme`）两种接口，支持 `class`/`attribute` 两种 DOM 策略

## 代码规范

- Biome 配置 (`根目录 biome.json`) 是唯一标准：2 空格缩进、单引号、**必须分号**、尾逗号、行宽 100
- 所有页面导入路径必须带 `.tsx` 扩展名 (`allowImportingTsExtensions`)
- 组件：PascalCase 文件名，`export default function ComponentName()`
- 工具函数：camelCase 文件名
- 样式只用 Ant Design 组件 + `style` prop，无 CSS modules、无 styled-components（**例外**：`Login.tsx` 使用 `Login.module.css`）
- 避免 `any`，优先 `unknown` + 类型收窄
- `useCallback` + `useRef` 保证引用稳定；用 ref 持有最新回调避免闭包陷阱
- `dynamic-form/` 使用 forwardRef + useImperativeHandle + 策略模式字段注册表
- `StyleProvider` 来自 `@ant-design/cssinjs`，在 `main.tsx` 中包裹整个应用

## 状态管理

- 简单页面级状态：`useState` + `useRef`
- 全局共享：Zustand（通过 `apps/frontend/src/stores/index.ts` 桶文件导出）
- 持久化：Zustand `persist` 中间件 (仅 uploadStore)
- 新增 store 必须在 `apps/frontend/src/stores/index.ts` 中添加导出

6 个 Store：`alertStore`(告警消息)、`authStore`(认证)、`lruRouteStore`(路由缓存)、`requestLoadingStore`(请求追踪)、`themeStore`(主题切换，re-export from `@interview-demo/shared-theme`)、`uploadStore`(上传持久化)

## AI Demo 架构

路径：`apps/ai-demo/`

| 文件 | 职责 |
|------|------|
| `App.tsx` | 根组件，ConfigProvider + 主题切换 + 布局 |
| `AIDemo.tsx` | 主页面，XProvider 包裹 + 8 选项卡布局（Chat / KnowledgeBase / Models / Agents / Plugins / Dashboard / Playground / A2UI） |
| `components/Chat.tsx` | LLM 聊天 — 使用 `@ant-design/x` 组件（Bubble.List + Sender + Conversations + Welcome + Prompts），配套 `@ant-design/x-sdk` 数据流 |
| `components/KnowledgeBase.tsx` | 知识库管理（CRUD + 文档添加） |
| `components/Models.tsx` | 模型管理与选择 |
| `components/Agents.tsx` | 智能体管理（ReAct / Function Calling / Multi-Agent） |
| `components/Plugins.tsx` | 插件中心 |
| `components/Dashboard.tsx` | AI Dashboard 统计概览 |
| `components/ErrorBoundary.tsx` | 错误边界 |
| `services/api.ts` | AI 相关 API 封装 |
| `stores/chatStore.ts` | 聊天状态管理 |
| `stores/themeStore.ts` | 主题状态管理（light/dark，re-export from `@interview-demo/shared-theme`） |
| `types/index.ts` | AI Demo 类型定义 |

### Ant Design X 集成说明

使用 `@ant-design/x` 提供的原子化 AI 组件重构 Chat 界面：

- **Bubble.List** — 替代自定义消息气泡渲染，支持 role 预设（user/ai）+ typing/fade-in 动画 + 流式标记
- **Sender** — 替代 Input.TextArea，支持 loading 态/取消/快捷键（Enter 发送，Shift+Enter 换行）
- **Conversations** — 替代自定义对话历史侧边栏，支持创建/切换/重命名/删除 + 右键菜单
- **Welcome** — 空状态欢迎卡片
- **Prompts** — 快捷提示词按钮

全局通过 `XProvider`（AIDemo.tsx 内）配置 ant-design/x 主题与 locale。保留原 Zustand + 自定义 API 服务层不变。

## 关键模式

- **代际锁 (Generation Lock)**：`uploadingRef` + `genRef` 防止上传并发操作
- **StrictMode 保护**：`reportedRef` 避免开发模式下 double-invoke 导致重复请求
- **Web Workers**：3 个 worker 文件 (`merge.worker.ts`、`decrypt.worker.ts`、`hash.worker.ts`)
- **性能监控**：`initVitalsReporter()` 在 `main.tsx` 模块级调用，3 秒批处理上报
- **Promise Park**：暂停上传时用未 resolve 的 Promise 挂起循环，恢复时 resolve 继续

## 动态表单引擎

路径：`apps/frontend/src/components/dynamic-form/`

| 文件 | 职责 |
|------|------|
| `DynamicForm.tsx` | 容器组件：forwardRef + onChange + 校验调度 + 提交/重置 |
| `Renderer.tsx` | 递归遍历 FormSchema AST，tabs→card→form→leaf 四层渲染 |
| `registry.tsx` | 策略模式：`Map<FieldType, Component>`，`registerField()` / `getField()` |
| `types.ts` | FormSchema/LeafSchema 类型 + AJV 集成 + flattenSchema/validateSchema/updateValue |
| `fields/*.tsx` | 7 个字段组件（StringField / NumberField / SelectField / SwitchField / DateTimeField / JsonField / ArrayField），均接收 `FieldComponentProps` 接口 |

字段组件接口：
```typescript
interface FieldComponentProps {
  schema: LeafSchema
  value: unknown
  path: string
  onChange: (path: string, value: unknown) => void
  onBlur?: (path: string) => void
  error?: string
  asyncValidating?: boolean
  allData?: Record<string, unknown>
}
```

注册新字段类型：
```typescript
import { registerField } from "../components/dynamic-form/registry.tsx"
import MyField from "./MyField.tsx"
registerField("myType", MyField)
```

`DynamicFormHandle` 接口：
```typescript
interface DynamicFormHandle {
  setFormData: (data: Record<string, unknown>) => void
}
// 父组件通过 ref + onChange 实现双向绑定：
<DynamicForm ref={formRef} onChange={setLiveData} />
```

## 登录认证

```
/login  → Login.tsx (无侧边栏，登录后跳转 /)
其他    → AuthGuard.tsx (检查登录态) → MainLayout (侧边栏 + Header)
```

| 文件 | 职责 |
|------|------|
| `stores/authStore.ts` | Zustand 认证状态 (user, isLoggedIn, login/logout) |
| `pages/Login.tsx` | 登录表单 (admin/admin123)，使用 CSS Module |
| `components/AuthGuard.tsx` | 路由守卫，ref 同步初始化免闪烁，未登录重定向 /login |
| `utils/fetchClient.ts` | Axios 封装，自动 Bearer Token、401 无感刷新、失败后清除 Token 跳转 /login |
| `utils/token.ts` | localStorage 管理 access_token / refresh_token |

## Web Vitals & 页面渲染监控

```
initVitalsReporter() (main.tsx 启动时调用)
  → web-vitals 监听 CLS/FCP/INP/LCP/TTFB
  → POST /api/vitals/report (逐条上报)

PageTracker (App.tsx 中包裹每个路由)
  → useLocation 监听路由变化
  → performance.now() 计算渲染耗时
  → POST /api/vitals/page-report (路径 + 耗时)

后端 in-memory 存储 → GET /api/vitals/summary|history|pages
  → Dashboard 展示: 指标卡片 + ECharts 趋势图 + 页面渲染排行
```

## 测试

- Vitest 4 + jsdom + `@testing-library/react` 16 + `@testing-library/user-event` 14
- 测试设置：`src/test/setup.ts` (frontend) / `src/test-setup.ts` (ai-demo, interview-docs) (引入 jest-dom vitest matcher，mock ResizeObserver + matchMedia)
- 测试文件与源码同目录，放在 `__tests__/` 下
- 用 `userEvent` 而不是 `fireEvent` 模拟用户交互
- frontend 28 测试文件 148 测试，interview-docs 7 测试文件 39 测试，ai-demo 1 测试文件 1 测试

## 后端模块

`backend/internal/` 包含 19 个内部包：

| 包 | 职责 |
|----|------|
| `agent` | 智能体引擎（ReAct / Function Calling / Multi-Agent） |
| `alert` | 多协议告警（WebSocket / SSE / HTTP Polling 统一分发） |
| `auth` | JWT 双 Token 认证（登录/刷新/重放检测/ Session Nonce） |
| `chat` | LLM 对话（流式 / 模型管理 / 对话历史 / OpenAI/DeepSeek/Ollama） |
| `encryptedlog` | 加密日志流（RSA 密钥交换 + AES-256-GCM 加密） |
| `gis` | GIS 随机点位生成（上限 50 万点） |
| `health` | 健康检查端点 |
| `knowledge` | RAG 知识库（文档加载 / 分块 / 嵌入 / 向量搜索） |
| `lrucache` | LRU 缓存演示（服务列表 / 配置 / 日志） |
| `memory` | 对话记忆管理 |
| `middleware` | CORS 中间件 |
| `model` | 领域类型（按 domain 拆分 7 个文件） |
| `payment` | 支付状态机（7 状态 × 6 驱动）+ 幂等性 + 指数退避重试 + 安全校验 |
| `rbac` | RBAC 位运算权限校验 |
| `requestload` | 模拟请求延迟 / 失败 |
| `schema` | 动态 JSON Schema 表单定义 + 递归校验 |
| `sse` | SSE 日志流 |
| `upload` | 大文件分片上传（SHA-256 校验 + 会话管理） |
| `vitals` | Web Vitals 采集与聚合（CLS/FCP/INP/LCP/TTFB） |

## CI/CD

- **GitHub Actions**:
  - `.github/workflows/lint.yml`：push/PR 到 `main` → `go vet`、`go test`、`bun run lint`、`bun run test`、`bun run typecheck`（使用 `turbo run` 并行加速前端任务，且 `test` 不再依赖 `^build`，可和 `build` 完全并行）
  - `.github/workflows/deploy-interview-docs.yml`：push 到 `main` 且改动 `apps/interview-docs/` → build + deploy 到 GitHub Pages
- **GitLab CI** (`.gitlab-ci.yml`)：validate → build → package (Docker `frontend`/`backend`/`interview-docs` 三镜像) → deploy (Helm 到 K8s)

## Git

- Conventional commits，由 commitlint (`@commitlint/config-conventional`) 和 husky + lint-staged 强制执行
- 允许类型：feat、fix、docs、style、refactor、perf、test、build、ci、chore、revert
- 提交前先 `git status` + `git diff` 了解变更范围
- 避免提交 `node_modules/`、`dist/`、`.env` 等

## 文档维护

- 修改代码后同步更新 `README.md` 和 `docs/` 目录下相关文档
- 更新 `README.md` 的"演示功能"表时同步更新 `routes/index.tsx`
- 新增/修改 `Wiki.md` 的难点章节时，同步更新 `README.md` 的对应描述

## 共享主题包

路径：`packages/shared-theme/`

统一管理各 app 的 dark/light 主题切换逻辑，消除重复代码。

| 文件 | 职责 |
|------|------|
| `src/types.ts` | `ThemeMode`、`ThemeConfig` 类型定义 |
| `src/dom.ts` | DOM 工具函数 — `applyTheme`、`getInitialTheme`、`getDOMSnapshot`、`subscribeToDOM` |
| `src/store.ts` | Zustand store — `useThemeStore` + `configureTheme()` |
| `src/hook.ts` | React hook — `useTheme`（`useSyncExternalStore`）+ `configureThemeHook()` |

各 app 通过本地 wrapper 文件调用 `configureTheme()` / `configureThemeHook()` 注入配置，再 re-export：

```typescript
// apps/frontend/src/stores/themeStore.ts
import { configureTheme, useThemeStore } from '@interview-demo/shared-theme';
configureTheme({ storageKey: 'theme-mode', domStrategy: 'class', domTarget: 'dark' });
export { useThemeStore };
```

| App | 接口 | storageKey | DOM 策略 |
|-----|------|-----------|----------|
| frontend | `useThemeStore` (Zustand) | `'theme-mode'` | `.dark` class |
| ai-demo | `useThemeStore` (Zustand) | `'theme-mode'` | `data-theme` attribute |
| interview-docs | `useTheme` (hook) | `'theme'` | `.dark` class |

## 注意事项

- commitlint 配置在根 `commitlint.config.cjs`，作为全局 devDependencies 管理
- `backend/Makefile` **不存在**于仓库中
- **Monorepo**: 使用 Bun workspaces + Turborepo 管理，根 `package.json` 定义 `apps/*`、`packages/*` 工作区，`turbo.json` 配置编排管道
- `package.json` 必须包含 `"packageManager": "bun@1.3.14"` 字段（Turborepo 2+ 要求）
- 使用 `--filter` 参数限定 turbo 只作用于特定 workspace，如 `bun run build --filter=@interview-demo/frontend`
- Vite 配置中 `form` 代码分割组包含 ajv 但**未使用** @rjsf
- **TypeScript 7** (Go 原生编译器 tsgo)：`@biomejs/biome` 统一在根 `package.json` 管理，各 app 无独立 biome.json
