# AGENTS.md — 项目开发指南

## 项目简介

React 19 + Go 1.26 全栈演示平台，覆盖 12 个高级技术场景（WebSocket/SSE/Token Refresh/动态表单/GIS/Web Worker/LRU/RBAC/分片上传/日志流/树操作/请求追踪）。

**仓库**: `https://github.com/KMaybe01/interview-demo`

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript 6, Vite 8, Ant Design 6, Zustand 5, React Router 7 |
| 格式/检查 | Biome 2.5 (space 缩进 2, 无分号, 行宽 100, trailing commas) + ESLint 9 |
| 后端 | Go 1.26, Gin 1.12, Gorilla WebSocket, golang-jwt |
| 部署 | Docker 多阶段构建, Helm Chart, GitLab CI/CD |

---

## 常用命令

```bash
# 前端开发
cd frontend
bun run dev          # Vite 开发服务器 (localhost:5173, /api → :8080)
bun run build        # tsc -b + vite build
bun run lint         # Biome 格式化 + 检查
bun run format       # Biome 格式化

# 后端开发
cd backend
go run .             # Gin :8080
```

---

## 代码规范

### 导入风格

```typescript
// 第三方库在前，内部模块在后
import { useEffect, useRef, useState } from "react"
import { Button, Card, Input, message } from "antd"
import { useCallback } from "react"
import DynamicForm, { type DynamicFormHandle } from "../components/dynamic-form/DynamicForm.tsx"

// 多行导入用花括号换行格式 (Biome 自动格式化)
import {
  Button,
  Card,
  Col,
  Divider,
  Input,
  message,
  notification,
  Row,
  Space,
  Tag,
  Tabs,
  Typography,
} from "antd"
```

### 命名

- 组件: PascalCase, 默认导出函数组件 (`export default function MyPage()`)
- 文件: PascalCase.tsx (组件), camelCase.ts (工具)
- 接口: `XxxProps`, `XxxHandle`, `XxxState`
- 类型: PascalCase
- 枚举: PascalCase (值: UPPER_SNAKE_CASE)
- React hooks: camelCase (`handleXxx`, `setXxx`, `useXxx`)
- ref: camelCase + Ref 后缀 (`wsRef`, `formRef`, `genRef`)
- biome.json: 无分号 (`semicolons: "asNeeded"`), trailing commas

### TypeScript 约束

```json
{
  "strict": true,
  "allowImportingTsExtensions": true,
  "noUncheckedSideEffectImports": true
}
```

- 所有页面组件路径导入需带 `.tsx` 扩展名
- 避免 `any`，使用 `unknown` + type narrowing

### 组件模式

```typescript
// 函数组件 + 默认导出
export default function WebWorkerMerge() {
  // ...
}

// forwardRef 暴露句柄
const DynamicForm = forwardRef<DynamicFormHandle, DynamicFormProps>(function DynamicForm(props, ref) {
  useImperativeHandle(ref, () => ({
    setFormData(newData) { setData(newData) },
  }), [])
  // ...
})

// useCallback + 稳定引用
const handleSubmit = useCallback((data: Record<string, unknown>) => {
  // ...
}, [])

// 闭包陷阱修复: ref 持有最新回调
const onUpdateRef = useRef(onUpdate)
onUpdateRef.current = onUpdate
```

### 样式

- 使用 Ant Design 组件 + inline `style` props
- 无 CSS 模块文件，无 styled-components
- 字体: monospace 用 `"'Courier New', monospace"`

---

## 页面开发指南

### 添加新页面

1. 在 `src/pages/` 新建 `.tsx` 文件
2. 默认导出函数组件
3. 在 `src/routes/index.tsx` 添加路由配置:
   ```typescript
   import NewPage from "../pages/NewPage.tsx"
   import { NewIcon } from "@ant-design/icons"
   // 在 routes 数组中添加:
   { path: "/new-page", name: "新页面", icon: NewIcon, element: NewPage }
   ```
4. 可选: 在 `src/layouts/MainLayout.tsx` 侧边栏会自动显示路由

### 页面结构

```typescript
import { Card, Col, Row, Typography } from "antd"
import { useCallback, useState } from "react"

const { Text, Title } = Typography

export default function MyPage() {
  const [data, setData] = useState<Record<string, unknown>>({})
  const handleChange = useCallback(() => { /* ... */ }, [])

  return (
    <div>
      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card />
        </Col>
        <Col xs={24} lg={10}>
          {/* 右侧面板 */}
        </Col>
      </Row>
    </div>
  )
}
```

---

## 动态表单引擎

路径: `src/components/dynamic-form/`

| 文件 | 职责 |
|------|------|
| `DynamicForm.tsx` | 容器组件: `forwardRef` + `onChange` + 校验调度 + 提交/重置 |
| `Renderer.tsx` | 递归遍历 FormSchema AST, tabs→card→form→leaf 四层渲染 |
| `registry.tsx` | 策略模式: `Map<FieldType, Component>`, `registerField()` / `getField()` |
| `types.ts` | `FormSchema` / `LeafSchema` 类型 + AJV 集成 + `flattenSchema` / `validateSchema` / `updateValue` |
| `fields/*.tsx` | 7 个字段组件, 全部接收 `FieldComponentProps` 接口 |

**字段组件接口**:

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

**注册新字段类型**:

```typescript
import { registerField } from "../components/dynamic-form/registry.tsx"
import MyField from "./MyField.tsx"
registerField("myType", MyField)
```

**暴露给父组件的句柄** (`DynamicFormHandle`):

```typescript
interface DynamicFormHandle {
  setFormData: (data: Record<string, unknown>) => void  // 外部写入表单数据
}
// 父组件通过 ref 和 onChange 实现双向绑定:
<DynamicForm ref={formRef} onChange={setLiveData} />
```

---

## 状态管理

全部使用 Zustand, 位于 `src/stores/`:

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useXxxStore = create<XxxState>()(
  persist(                          // 可选: localStorage 持久化
    (set) => ({
      // state + actions
    }),
    { name: "xxx-store" },
  ),
)
```

- 简单页面级状态: `useState` + `useRef`
- 全局共享: Zustand
- 持久化: Zustand `persist` 中间件 (uploadStore)

---

## 布局

- `main.tsx`: `BrowserRouter > StyleProvider > App.tsx`
- `App.tsx`: `ConfigProvider (Ant Design theme) > AntApp > Routes`
- `MainLayout.tsx`: 侧边栏 + 面包屑 + 内容区, 所有页面包裹在 `<Route element={<MainLayout />}>`

---

## Web Vitals & 页面渲染监控

### 架构

```
initVitalsReporter() (main.tsx 启动时调用)
  → web-vitals 监听 CLS/FCP/INP/LCP/TTFB
  → POST /api/vitals/report (逐条上报)

PageTracker (App.tsx 中包裹每个路由)
  → useLocation 监听路由变化
  → performance.now() 计算渲染耗时
  → POST /api/vitals/page-report (页面路径 + 渲染时长)

后端 in-memory 存储 → GET /api/vitals/summary|history|pages
  → WebVitals.tsx 展示: 指标卡片 + ECharts 趋势图 + 页面渲染排行
```

### 模块

| 文件 | 职责 |
|------|------|
| `utils/vitalsReporter.ts` | 订阅 web-vitals 事件, 上报至后端 |
| `components/PageTracker.tsx` | 包裹每个路由, 上报路径 + 渲染耗时 + Navigation Timing |
| `pages/WebVitals.tsx` | 可视化页面: 指标卡片 + ECharts 趋势图 + 页面渲染排行 + 访问明细表 |
| `backend/handlers/vitals.go` | 上报接收 / 汇总 / 历史 / 页面跟踪接口 |

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/vitals/report` | 上报 Web Vitals 指标 (批量) |
| GET | `/api/vitals/summary` | 最新值 + min/max/avg/count |
| GET | `/api/vitals/history` | 按指标分组的时间序列 |
| POST | `/api/vitals/page-report` | 上报页面渲染数据 (路径 + 渲染耗时) |
| GET | `/api/vitals/pages` | 页面访问汇总 (访问次数 / 平均渲染时长) |
| GET | `/api/vitals/page-history` | 按路径分组的页面渲染时间序列 |

---

## 登录认证

### 架构

```
/login  → Login.tsx (无侧边栏, 登录后跳转 /)
其他    → AuthGuard.tsx (检查登录态) → MainLayout (侧边栏 + Header)
```

### 模块

| 文件 | 职责 |
|------|------|
| `stores/authStore.ts` | Zustand 认证状态 (user, isLoggedIn, login/logout) |
| `pages/Login.tsx` | 登录表单 (admin/admin123) |
| `components/AuthGuard.tsx` | 路由守卫, 未登录重定向 /login |
| `utils/fetchClient.ts` | 统一 fetch 封装, 自动附加 Bearer Token, 401 时自动无感刷新 |
| `utils/token.ts` | localStorage 读写 access_token / refresh_token |

### 使用 fetchClient

所有经过后端的 API 请求应使用 `fetchClient` 替代原生 `fetch`:
```typescript
import { fetchClient } from "../utils/fetchClient.ts"

const res = await fetchClient("/api/some-endpoint", {
  method: "POST",
  body: JSON.stringify(payload),
})
```

`fetchClient` 自动处理:
- Authorization header 注入
- 401 响应 → 无感刷新 Token → 重放请求
- 刷新失败 → 清除 Token → 重定向 /login

## 文档

- `README.md`: 项目级文档 (技术栈 / 项目结构 / 演示功能 / 部署 / API)
- `docs/面试亮点.md`: 面试用技术分析报告 (项目概述 / 难点剖析 / 设计模式 / 面试追问)
- 更新 `README.md` 的"演示功能"表时同步更新 `routes/index.tsx`
- 新增/修改 `docs/面试亮点.md` 的难点章节时, 同步更新 `README.md` 的对应描述

---

## 构建验证

```bash
cd frontend
bun run build          # 必须通过 (tsc -b + vite build)
bun run lint           # Biome 无 error
bun run lint:eslint    # eslint 无 error

cd backend
go vet ./...       # 通过代码规范校验
go build -o bin/server.exe .   # build 可运行文件
```

- `tsc --noEmit` 做类型检查
- `bun run build` 做完整构建
- 所有代码变更后必须跑构建验证

---

## Git 提交

- 遵循现有 commit message 风格 (中英文均可)
- 先 `git status` + `git diff` 了解变更范围
- 避免提交 `node_modules/`, `dist/`, `.env` 等
- 不要修改 `.git/config` 或全局 git 配置
