# Interview Demo — 全栈技术演示平台

## 项目概述

Monorepo (Bun workspaces + Turborepo) 全栈项目，包含：

- **前端应用**: React 19 + TypeScript 7 + Vite 8 + Rolldown 构建的多应用前端平台，共 **15 个路由演示页面**（Dashboard 仪表盘 + 监控面板 + 13 个专项演示），聚焦前端工程化、性能优化与架构设计。
- **AI 演示应用**: React 19 + @ant-design/x 构建的 AI 全栈工程化演示平台，**8 个选项卡**覆盖 LLM 流式对话（工具调用 + 人工确认 HITL）、混合 RAG 知识库、智能体 Agent、模型管理、MCP/A2A 协议控制台、LLMOps 可观测与 A2UI 声明式 UI。
- **前端知识库**: React 19 + Vite 8 + react-markdown 构建的文档站点，覆盖前端面试**六阶段（S1–S6）**学习路径，共 **117 篇** Markdown 文档。
- **共享包**: `packages/shared-theme`（跨应用主题切换，被 **3 个**前端应用复用）+ `packages/shared-monitor`（声明式前端监控 SDK，当前被 **frontend** 复用）。
- **Go 后端**: Go 1.26 + Gin 1.12，**26 个内部包**覆盖认证、支付、表单、GIS、上传、监控与 AI（LLM Provider 路由 / 工具中心 / MCP / A2A / LLMOps）等全部 API 需求。

**Keywords:** 无感刷新 · Token Rotation · 递归表单引擎 · 双重校验 · 实时 JSON 编辑 · WebSocket 心跳 · LRU 路由缓存 · Web Worker 分治 · OpenLayers 聚类 · RBAC 位编码 · SSE 流式日志 · 请求加载 Signal · 树形数据引擎 · 大文件断点续传 · 页面性能监控 · 统一支付中台 · AI Agent 流式执行 · MCP/A2A 协议 · 混合检索 RRF · 声明式埋点 · 优先级上报队列 · 多级去重 · 柔性降级 · 共享主题包 · 声明式监控 SDK

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 (frontend) | React 19, TypeScript 7, Vite 8 + Rolldown, Ant Design 6, Zustand 5, React Router 8, ECharts 6, OpenLayers 10, AJV 8, web-vitals 5 |
| AI 前端 (ai-demo) | React 19, @ant-design/x (Bubble/Sender/Conversations), Ant Design X SDK, @a2ui/* 协议库 |
| 文档站 (interview-docs) | React 19, Vite 8, React Router 8 (HashRouter), react-markdown 9, Mermaid 11, highlight.js 11 |
| 共享包 | `shared-theme` (Zustand + DOM 策略 + useSyncExternalStore + ThemeToggle 组件), `shared-monitor` (声明式监控 SDK) |
| 工具链 | Biome 2.5 (lint + format), Husky + commitlint, Vitest 4, Turborepo 2 (编排) |
| 样式 | Ant Design tokens + CSS Modules (Login) + BEM (interview-docs) |
| 后端 (Go) | Go 1.26, Gin 1.12, Gorilla WebSocket, golang-jwt, go-openai |
| 运行时 | Bun 1.4.2（依赖安装 + 脚本执行 + CI/CD, Monorepo + Turborepo 编排） |
| CI/CD | GitHub Actions (lint/test/typecheck) + GitHub Pages (文档站) + GitLab CI (validate → build → Docker 镜像) |
| 部署 | Helm Chart 手工部署到 K8s (RollingUpdate, maxUnavailable=0 → zero-downtime) + Nginx Ingress；文档站同时发布到 GitLab Pages |

> Helm Chart 覆盖 `frontend` / `backend` / `interview-docs` 三个应用；`ai-demo` 目前只构建 Docker 镜像，尚未纳入 Chart。

## 演示功能

`apps/frontend` 在 `src/routes/index.tsx` 中定义 **15 个懒加载路由页面**（自动映射为侧边栏菜单），另有 Eager 加载的 `/login`（在 `App.tsx` 中单独声明，不进侧边栏）。下表 #1–#14 与 #17 为这 15 个路由页，#15/#16/#18 为跨应用与共享包能力。

| # | 页面 | 核心实现 |
|---|------|----------|
| 1 | 告警 WebSocket | 多协议传输层 (WebSocket→SSE→Polling 降级) + 手动 Segmented 切换 + 直连后端 + 二进制协议 + 背压控制 + 消息合并 + 心跳保活 + 断线重连 + 消息去重 + RAF 节流 + ECharts 实时趋势 |
| 2 | JSON Schema 动态表单 | 自定义递归渲染引擎: Schema/initialData 从后端 `GET /api/schema/config` 加载 + augmentSchema() 注入校验函数 + `fetchedRef` StrictMode 防重复请求 + 条件显隐 / 数组列表 / 自定义/异步校验 / 字段联动 / ajv / 循环检测 / 实时 JSON 编辑与双向同步 |
| 3 | LRU 路由缓存 | 3 页 Tab + Config + Logs + Monitor 子页 + DOM display:none 保持状态 + LRU 淘汰 + staleKeys 写后失效 + activeRef 两阶段 useEffect + 惰性刷新 + 淘汰通知 |
| 4 | Web Worker 分治合并 | Worker Pool + 自适应分区 + 有序归并缓冲区 + 主线程 Array.sort 对比 |
| 5 | GIS 十万级点位渲染 | OpenLayers Cluster 聚类 + BBOX 视口剪裁 + dataCache + moveend 惰性刷新 |
| 6 | 十万行日志流解密 | 客户端 RSA 密钥对生成 + 服务端用客户端公钥加密 AES 密钥 + AES-256-GCM Worker 并行解密 + Seq 保序合并 + 虚拟滚动 |
| 7 | RBAC 位编码权限 | 位运算权限编码: 6 种权限 (READ/WRITE/DELETE/EXPORT/IMPORT/ADMIN), 5 个预设角色 (GUEST/EDITOR/MODERATOR/ADMIN/SUPER), 菜单/路由/按钮三层可视化联动 + 后端 API (`POST /api/rbac/check`) 双重校验 + 前后端一致性对比 |
| 8 | 双 Token 无感刷新 | Promise gate + 并发队列 + Refresh Token Rotation + Replay 检测 + Session Nonce 单设备登录 + Token 生命周期可视化 |
| 9 | SSE 日志流 | ReadableStream + AbortController + RAF 节流 + 暂停/恢复连接 |
| 10 | 请求加载 Signal | React 19 `use()` + Suspense + ErrorBoundary + AbortController + Signal 级别请求追踪 |
| 11 | 树形数据操作引擎 | 递归 CRUD + 拖拽排序 + 节点校验 + 批量操作 |
| 12 | 大文件分片上传（断点续传） | SHA-256 分片哈希 + 并发滑动窗口上传 + 完整性校验 + 暂停/恢复/停止 + 刷新持久化 + 代际锁防并发竞态 + 下载已上传文件 |
| 13 | 页面性能监控 (Dashboard) | web-vitals 5 采集 CLS/FCP/INP/LCP/TTFB → PageTracker 自动上报路径+渲染耗时 → 后端存储 → 页面访问明细表 + ECharts 排行 |
| 14 | UniPay 统一支付中台 | 支付状态机 (7 状态 × 6 驱动) + Idempotency-Key 幂等性防重复扣款 + 指数退避重试 (1s/2s/4s) + T+1 对账 + 安全检测 |
| 15 | AI Demo | 8 选项卡：AI 聊天（流式 SSE + 工具调用轨迹 + RAG 引用来源 + HITL 人工确认 + Token/成本 + 离线降级提示）、知识库管理（4 种分块策略/Embedding/混合搜索 BM25+Vector RRF）、模型管理（真实 provider 注册表 + 连接探测）、智能体（ReAct/Function Calling/Multi-Agent 流式执行轨迹 + HITL）、协议控制台（MCP 2026-07-28 无状态 + A2A v1.0 实机调用）、LLMOps 可观测（延迟分位/链路追踪/工具审计/离线评测/Prompt 版本）、A2UI 集成 |
| 16 | 前端监控与埋点系统 | `packages/shared-monitor` 共享包：声明式 data-stat 埋点 + 优先级上报队列 (sendBeacon/RIC/64KB 分片) + 异常全捕获 (onerror/unhandledrejection/资源错误/API 监控) + 性能采集 (Navigation/Resource Timing / Bundle Timing) + 5s 内存+sessionStorage 二级去重 + 采样降级 + 柔性降级 withDegradation + Zustand 监控大盘 |
| 17 | 监控面板 (MonitorDashboard) | 前端监控数据可视化大盘 — 异常统计 / Bundle 体积趋势 / API 慢查询 / 资源加载瀑布 / 埋点事件热力图 + ECharts 多维度展示 |
| 18 | 共享主题包 (shared-theme) | 跨应用 dark/light 主题切换统一管理 — 支持 `class`（`.dark`）和 `attribute`（`data-theme`）两种 DOM 策略 + Zustand store + `useSyncExternalStore` hook + 动画过渡 + ThemeToggle 组件 |

## 快速启动

### 本地开发 (Bun + Turborepo)

```bash
# 从项目根目录并行启动所有前端应用
bun run dev

# 或单独启动
cd apps/frontend && bun run dev       # 主前端 :5173
cd apps/ai-demo && bun run dev        # AI 演示 :5175
cd apps/interview-docs && bun run dev # 文档站 :5000

# Go 后端
cd backend && go run ./cmd/server/    # :8080
```

### Docker Compose (完整环境)

```bash
docker compose up --build
```

| 服务 | 地址 |
|------|------|
| frontend | http://localhost (`:80`) |
| ai-demo | http://localhost:5175 |
| interview-docs | http://localhost:5000 |
| backend | http://localhost:8080 |

frontend 与 ai-demo 依赖 backend 健康检查通过后启动，因此可直接使用 WebSocket、SSE 等完整能力。

## 构建验证

```bash
# 使用 Turborepo 构建所有 workspace（缓存加速）
bun run build

# 仅构建 frontend
bun run build --filter=@interview-demo/frontend

# 类型检查（turbo 并行；各 app 为 noEmit，不产出 .tsbuildinfo）
bun run typecheck

# 运行测试（turbo 并行，与 build 无依赖关系）
bun run test

# 单独构建前端
cd apps/frontend && bun run build   # tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit && vite build (Rolldown)
bun run lint                        # Biome check
bun run test                        # Vitest run
```

## 代码校验 (GitHub Actions + GitLab CI, Turborepo 编排)

GitHub Actions（`.github/workflows/lint.yml`，Go 1.26 / Bun）：

| Job | 命令 | 工具 |
|-----|------|------|
| lint-backend | `go vet ./...` | Go vet |
| test-backend | `go test ./internal/...` + `go test -race -coverprofile ./...` | Go test |
| lint-ai-demo | `bun run build --filter=@interview-demo/ai-demo` | Vite 8 |
| lint-workspaces | `bun run lint`（turbo 并行） | Biome 2.5 |
| test-workspaces | `bun run test`（turbo 并行缓存，不依赖 build） | Vitest 4 |
| typecheck-workspaces | `bun run typecheck` | TypeScript 7 |

GitLab CI（`.gitlab-ci.yml`）分四阶段：`validate`（go vet / go test -race / lint / test / typecheck）→ `build`（backend 二进制 + 三个前端 dist）→ `package`（构建并推送 4 个 Docker 镜像）→ `deploy`（GitLab Pages 发布文档站）。

另有 `.github/workflows/deploy-interview-docs.yml`：push 到 `main` 且改动 `apps/interview-docs/**` 时，构建并部署到 GitHub Pages。

## CI/CD + K8s 部署

```
用户 → Nginx Ingress → /api /ws        → backend-service:8080
                     → /interview-demo → interview-docs-service:80
                     → /               → frontend-service:80 (nginx 静态文件)
```

### Docker 多阶段构建

| Stage | 基础镜像 | 产出 |
|-------|----------|------|
| `frontend-builder` | oven/bun:1.4 | `bun install && bun run build` → `apps/frontend/dist/` |
| `interview-docs-builder` | oven/bun:1.4 | `bun install && bun run build` → `apps/interview-docs/dist/` |
| `backend-builder` | golang:1.26-alpine | `CGO_ENABLED=0 go build` → 二进制 |
| `ai-demo-builder` | oven/bun:1.4 | `bun install && bun run build` → `apps/ai-demo/dist/` |
| `frontend` | nginx:alpine | `dist/` + `nginx.conf` → :80 |
| `interview-docs` | nginx:alpine | `dist/` + `nginx.interview-docs.conf` → :80 |
| `ai-demo` | nginx:alpine | `dist/` + `nginx.ai-demo.conf` → :80 |
| `backend` | alpine:3.19 | 二进制 + ca-certificates → :8080 |

### Helm Chart

Chart 位于 `helm/`，包含 `backend` / `frontend` / `interview-docs` 三组 Deployment + Service、Ingress、ConfigMap 与 Namespace 模板（**不含 ai-demo**）。

Ingress 路由（与 `helm/templates/ingress.yaml` 一致）：

| Path | 后端 Service |
|------|--------------|
| `/api` `/ws` | `backend-service:8080` |
| `/interview-demo` | `interview-docs-service:80` |
| `/` | `frontend-service:80` |

```bash
helm upgrade --install interview-demo ./helm \
  --namespace interview-demo --create-namespace \
  --set backend.image.repository=registry.example.com/backend \
  --set frontend.image.repository=registry.example.com/frontend \
  --set interviewDocs.image.repository=registry.example.com/interview-docs \
  --wait --timeout 120s
```

## 性能优化

实测口径：`dist/index.html` 首屏直接引用的 JS / CSS 资源之和；gzip 为本地 gzip 压缩后的体积。

| 指标 | Frontend | Ai-demo | Interview-docs |
|------|----------|---------|----------------|
| 首屏 JS（未压缩） | ~1550 KB | ~2190 KB | ~1455 KB |
| 首屏 JS（gzip） | ~487 KB | ~713 KB | ~466 KB |
| 首屏 CSS（未压缩） | ~1.5 KB | ~10.8 KB | ~18.5 KB |
| 首屏请求数 | 9 | 10 | 5 |
| JS chunk 总数（含按需） | 29 | 23 | 221（117 篇 md 各一个，合计 ~10 MB，全部按需） |

数据来源：frontend / ai-demo 采自 2026-09-30 构建产物，interview-docs 采自 2026-10-08 重建产物。执行 `bun run build` 后可重新采集（或用 `bun run analyze:frontend` 生成 `stats.html` 查看逐包构成）。

导航体验：路由 `React.lazy` 懒加载 + `Suspense` + Spin 加载态；文档站另按标题做虚拟滚动、Mermaid 仅命中图表时加载。

### 性能预算达标情况

| 资源 | 预算 | Frontend | Ai-demo | Interview-docs | 状态 |
|------|------|----------|---------|----------------|------|
| 首屏 JS（gzip） | < 300 KB | ~487 KB | ~713 KB | ~466 KB | ⚠️ 超预算 |
| 首屏 CSS | < 100 KB | ~1.5 KB | ~10.8 KB | ~18.5 KB | ✅ |
| 字体 | < 100 KB | 系统字体 | 系统字体 | 系统字体 | ✅ |
| 首屏请求数 | < 15 | 9 | 10 | 5 | ✅ |

### 已知优化点

- **interview-docs 主 chunk ~991 KB**：主要来自全量引入 `highlight.js`（190+ 语言）。改为按需注册语言子集即可大幅缩减首屏。
- **ai-demo 首屏最大**：`@ant-design/x` 全家桶（x / x-sdk / x-markdown / x-card）约 1.2 MB 未压缩已进入首屏关键路径，可按选项卡做路由级懒加载。
- **frontend antd vendor ~964 KB**：`antd` 整体打入一个 vendor chunk，可评估按页面拆分。
