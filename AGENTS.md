# AGENTS.md

## 先做

```bash
cd frontend
bun install          # 只能用 bun, 不能用 npm
```

## 开发命令

除非注明，均在 `frontend/` 下执行：

| 命令 | 说明 |
|------|------|
| `bun run dev` | Vite 开发服务器 (port 5173, `/api` + `/ws` 代理到 `:8080`) |
| `bun run build` | `tsc -b && vite build` (Rolldown Rust 打包) |
| `bun run test` | `vitest run` |
| `bun run test:watch` | `vitest` (监听模式) |
| `bun run lint` | `biome check --write src/` (Biome 是**唯一**的 linter/formatter) |
| `bun run format` | `biome format --write src/` |
| `bunx tsc -b --noEmit` | TypeScript 类型检查 (CI 用) |

`backend/` 下：

```bash
go run ./cmd/server/          # Gin :8080
go test ./internal/... -v
```

## 架构

- **前端入口**: `src/main.tsx` → `src/App.tsx` → `src/layouts/MainLayout.tsx`
- **路由**: `src/routes/index.tsx` — 15 个懒加载页面，自动映射到侧边栏
- **认证守卫**: `src/components/AuthGuard.tsx` 保护除 `/login` 外的所有路由
- **状态管理**: Zustand store 位于 `src/stores/`，通过 `src/stores/index.ts` 桶文件导出
- **API 客户端**: `src/utils/fetchClient.ts` (Axios，自动注入 Bearer Token，401 自动刷新 + 请求重放)
- **后端**: Go 1.26 + Gin — 全内存存储，无外部数据库

## 代码规范

- Biome 配置 (`biome.json`) 是唯一标准：2 空格缩进、单引号、**必须分号**、尾逗号、行宽 100
- 所有页面导入路径必须带 `.tsx` 扩展名 (`allowImportingTsExtensions`)
- 组件：PascalCase 文件名，`export default function ComponentName()`
- 工具函数：camelCase 文件名
- 样式只用 Ant Design 组件 + `style` prop，无 CSS modules、无 styled-components
- 避免 `any`，优先 `unknown` + 类型收窄
- `useCallback` + `useRef` 保证引用稳定；用 ref 持有最新回调避免闭包陷阱
- `dynamic-form/` 使用 forwardRef + useImperativeHandle + 策略模式字段注册表
- `StyleProvider` 来自 `@ant-design/cssinjs`，在 `main.tsx` 中包裹整个应用

## 状态管理

- 简单页面级状态：`useState` + `useRef`
- 全局共享：Zustand（通过 `src/stores/index.ts` 桶文件导出）
- 持久化：Zustand `persist` 中间件 (仅 uploadStore)
- 新增 store 必须在 `src/stores/index.ts` 中添加导出

## 关键模式

- **代际锁 (Generation Lock)**：`uploadingRef` + `genRef` 防止上传并发操作
- **StrictMode 保护**：`reportedRef` 避免开发模式下 double-invoke 导致重复请求
- **Web Workers**：3 个 worker 文件 (`merge.worker.ts`、`decrypt.worker.ts`、`hash.worker.ts`)
- **性能监控**：`initVitalsReporter()` 在 `main.tsx` 模块级调用，3 秒批处理上报

## 动态表单引擎

路径：`src/components/dynamic-form/`

| 文件 | 职责 |
|------|------|
| `DynamicForm.tsx` | 容器组件：forwardRef + onChange + 校验调度 + 提交/重置 |
| `Renderer.tsx` | 递归遍历 FormSchema AST，tabs→card→form→leaf 四层渲染 |
| `registry.tsx` | 策略模式：`Map<FieldType, Component>`，`registerField()` / `getField()` |
| `types.ts` | FormSchema/LeafSchema 类型 + AJV 集成 + flattenSchema/validateSchema/updateValue |
| `fields/*.tsx` | 7 个字段组件，均接收 `FieldComponentProps` 接口 |

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
| `pages/Login.tsx` | 登录表单 (admin/admin123) |
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
  → WebVitals.tsx 展示: 指标卡片 + ECharts 趋势图 + 页面渲染排行
```

## 测试

- Vitest 4 + jsdom + `@testing-library/react` 16 + `@testing-library/user-event` 14
- 测试设置：`src/test/setup.ts` (引入 jest-dom matcher，mock ResizeObserver + matchMedia)
- 测试文件与源码同目录，放在 `__tests__/` 下
- 用 `userEvent` 而不是 `fireEvent` 模拟用户交互

## CI/CD

- **GitHub Actions** (`.github/workflows/lint.yml`)：push/PR 到 `main` → `go vet`、`go test`、`bun run lint`、`bun run test`、`bunx tsc -b --noEmit`
- **GitLab CI** (`.gitlab-ci.yml`)：validate → build → package (Docker) → deploy (Helm 到 K8s)

## Git

- Conventional commits，由 commitlint (`@commitlint/config-conventional`) 和 husky + lint-staged 强制执行
- 允许类型：feat、fix、docs、style、refactor、perf、test、build、ci、chore、revert
- 提交前先 `git status` + `git diff` 了解变更范围
- 避免提交 `node_modules/`、`dist/`、`.env` 等

## 文档维护

- 修改代码后同步更新 `README.md` 和 `docs/` 目录下相关文档
- 更新 `README.md` 的"演示功能"表时同步更新 `routes/index.tsx`
- 新增/修改 `docs/面试亮点.md` 的难点章节时，同步更新 `README.md` 的对应描述

## 注意事项

- `.husky/` 目录不在 git 中 — 本地需运行 `bun run prepare` 安装 hooks
- `backend/Makefile` **不存在**于仓库中
