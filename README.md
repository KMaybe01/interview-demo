# Interview Demo - 全栈技术演示平台

## 项目概述

Monorepo (Bun workspaces + Turborepo) 全栈项目，包含：
- **interview-demo**: React 19 + Go 1.26 全栈演示项目，涵盖 **15 个技术场景**（含仪表盘首页 + 14 个核心演示 + 1 个 AI Demo），聚焦前端工程化、性能优化与架构设计。
- **前端知识库**: React 19 文档站点，Markdown 内容，GitHub Pages 部署，覆盖前端面试五阶段 + Go 后端知识体系。

**Keywords:** 无感刷新 · Token Rotation · 递归表单引擎 · 双重校验 · 实时 JSON 编辑 · WebSocket 心跳 · LRU 路由缓存 · Web Worker 分治 · OpenLayers 聚类 · RBAC 位编码 · SSE 流式日志 · 请求加载 Signal · 树形数据引擎 · 大文件断点续传 · 页面性能监控 · 统一支付中台

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript 6, Vite 8 + Rolldown, Ant Design 6, Zustand 5, React Router 7 |
| 前端知识库 | React 19, TypeScript 5.7, Vite 8, React Router 8, react-markdown, Mermaid |
| 工具链 | Biome 2.5 (lint + format), Husky + commitlint (conventional commits), Vitest 4, Turborepo 2 (编排) |
| 样式 | Ant Design tokens + CSS Modules (仅 Login.tsx) |
| 后端 | Go 1.26, Gin 1.12, Gorilla WebSocket, golang-jwt (双 Token 无感刷新), go-openai |
| GIS | OpenLayers 10.9 (Cluster + BBOX 视口裁剪) |
| 表单 | 自定义递归渲染引擎 (非 @rjsf) |
| 运行时 | Bun 1.3（前端依赖安装 + 脚本执行 + CI/CD, Monorepo + Turborepo 编排） |
| CI/CD | GitHub Actions + GitLab CI + Docker (多阶段构建) |
| 部署 | Kubernetes Helm (滚动更新, zero-downtime), Nginx Ingress |

## 项目结构

```
interview-demo/                      # Monorepo root (Bun workspaces + Turborepo)
├── apps/
│   ├── frontend/                    # React 19 前端 SPA
│   │   ├── src/
│   │   │   ├── main.tsx                 # React 入口 (StrictMode, BrowserRouter)
│   │   │   ├── App.tsx                  # 根组件 (ConfigProvider, Routes, AuthGuard)
│   │   │   ├── assets/                  # 静态资源
│   │   │   ├── components/
│   │   │   │   ├── AuthGuard.tsx        # 路由守卫 (Zustand 认证状态)
│   │   │   │   ├── PageTracker.tsx      # 页面渲染性能监控
│   │   │   │   └── dynamic-form/        # 自定义递归表单引擎 (4 核心 + 7 字段)
│   │   │   ├── pages/                   # 15 个演示页面 + 登录页
│   │   │   │   ├── Login.tsx (+ Login.module.css)
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── AlertWebSocket.tsx
│   │   │   │   ├── JsonSchemaForm.tsx
│   │   │   │   ├── ChunkedUpload.tsx
│   │   │   │   ├── GisRendering.tsx
│   │   │   │   ├── LogStream.tsx
│   │   │   │   ├── LruRouteCache.tsx (+ Config/Logs/Monitor)
│   │   │   │   ├── RbacPermission.tsx
│   │   │   │   ├── RequestLoading.tsx
│   │   │   │   ├── SseLogStream.tsx
│   │   │   │   ├── TokenRefresh.tsx
│   │   │   │   ├── TreeDataEngine.tsx
│   │   │   │   ├── WebWorkerMerge.tsx
│   │   │   │   ├── UniPay.tsx
│   │   │   │   └── AIDemo/              # AI Demo (6 子选项卡)
│   │   │   ├── stores/                  # Zustand 状态管理 (6 stores)
│   │   │   │   ├── index.ts             # 桶文件导出
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── alertStore.ts
│   │   │   │   ├── lruRouteStore.ts
│   │   │   │   ├── requestLoadingStore.ts
│   │   │   │   ├── themeStore.ts
│   │   │   │   └── uploadStore.ts
│   │   │   ├── routes/
│   │   │   │   └── index.tsx            # 15 条路由 (懒加载)
│   │   │   ├── layouts/
│   │   │   │   └── MainLayout.tsx       # 侧边栏 + Header + Content
│   │   │   ├── test/
│   │   │   │   └── setup.ts             # 测试环境初始化
│   │   │   └── utils/
│   │   │       ├── fetchClient.ts       # 统一请求封装 (401 无感刷新)
│   │   │       ├── token.ts             # JWT Token 工具
│   │   │       ├── lru.ts               # LRUCache 泛型类
│   │   │       ├── rbac.ts              # RBAC 位运算权限
│   │   │       ├── wsTransport.ts       # WebSocket 传输层
│   │   │       ├── vitalsReporter.ts    # Web Vitals 上报
│   │   │       ├── vitalsSnapshot.ts    # Vitals 快照采集
│   │   │       ├── requestResource.ts   # 请求资源追踪
│   │   │       ├── hash.worker.ts       # SHA-256 Worker
│   │   │       ├── merge.worker.ts      # 归并排序 Worker
│   │   │       └── decrypt.worker.ts    # RSA + AES-256-GCM Worker
│   │   ├── public/
│   │   ├── vite.config.ts               # Vite 8 + Rolldown
│   │   ├── tsconfig*.json
│   │   ├── biome.json                   # Biome 2.5
│   │   └── package.json
│   └── interview-docs/                  # 前端知识库文档站点 (React 19)
│       ├── src/
│       ├── public/
│       ├── S1-基础夯实/
│       ├── S2-框架深入/
│       ├── S3-进阶提升/
│       ├── S4-面试冲刺/
│       ├── S5-AI/
│       ├── S6-Go/
│       ├── vite.config.ts
│       ├── biome.json
│       └── package.json
├── backend/                             # Go 1.26 + Gin 1.12 后端
│   ├── cmd/server/main.go               # 入口，优雅关闭，Swagger
│   ├── docs/                            # Swagger API 文档
│   ├── internal/
│   │   ├── agent/                       # 智能体引擎 (ReAct / Function Calling / Multi-Agent)
│   │   ├── alert/                       # 多协议告警 (WebSocket / SSE / HTTP Polling)
│   │   ├── auth/                        # JWT 双 Token 认证
│   │   ├── chat/                        # LLM 对话 (流式 / 模型管理 / OpenAI/DeepSeek/Ollama)
│   │   ├── encryptedlog/                # 加密日志流 (RSA + AES-256-GCM)
│   │   ├── gis/                         # GIS 点位生成
│   │   ├── health/                      # 健康检查
│   │   ├── knowledge/                   # RAG 知识库 (向量数据库)
│   │   ├── lrucache/                    # LRU 缓存演示
│   │   ├── memory/                      # 对话记忆
│   │   ├── middleware/                  # CORS 中间件
│   │   ├── model/                       # 领域类型 (7 文件)
│   │   ├── payment/                     # 支付状态机 + 幂等 + 重试 + 安全
│   │   ├── rbac/                        # RBAC 位运算权限
│   │   ├── requestload/                 # 请求延迟模拟
│   │   ├── schema/                      # JSON Schema 校验
│   │   ├── sse/                         # SSE 日志流
│   │   ├── upload/                      # 分片上传
│   │   └── vitals/                      # Web Vitals 采集
│   ├── go.mod / go.sum
│   ├── .env.example
│   └── uploads/sessions.json            # 上传会话持久化
├── helm/                                # Helm Chart (K8s 部署)
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/                       (namespace / 3 deployments / 3 services / ingress / configmap)
├── docs/                                # 面试文档 (S1-S6)
├── .github/workflows/lint.yml           # GitHub Actions CI
├── .github/workflows/deploy-interview-docs.yml  # GitHub Pages 部署
├── Dockerfile                           # 多阶段构建
├── docker-compose.yml                   # Docker Compose
├── nginx.conf / nginx.compose.conf      # Nginx 配置
├── nginx.interview-docs.conf            # 知识库 Nginx 配置
├── .gitlab-ci.yml                       # GitLab CI/CD
├── package.json                         # Monorepo workspace 配置
├── turbo.json                           # Turborepo 编排配置
└── README.md
```

## 演示功能

| # | 页面 | 核心实现 |
|---|------|----------|
| 1 | 告警 WebSocket | 多协议传输层 (WebSocket→SSE→Polling 降级) + 手动 Segmented 切换 + 直连后端 + 二进制协议 + 背压控制 + 消息合并 + 心跳保活 + 断线重连 + 消息去重 + RAF 节流 + ECharts 实时趋势 |
| 2 | JSON Schema 动态表单 | 自定义递归渲染引擎: Schema/initialData 从后端 `GET /api/schema/config` 加载 + augmentSchema() 注入校验函数 + `fetchedRef` StrictMode 防重复请求 + 条件显隐 / 数组列表 / 自定义/异步校验 / 字段联动 / ajv / 循环检测 / 实时 JSON 编辑与双向同步 |
| 3 | LRU 路由缓存 | 3 页 Tab 切换 + DOM display:none 保持状态 + LRU 淘汰 + staleKeys 写后失效 + activeRef 两阶段 useEffect + 惰性刷新 + 淘汰通知 |
| 4 | Web Worker 分治合并 | Worker Pool + 自适应分区 + 有序归并缓冲区 + 主线程 Array.sort 对比 |
| 5 | GIS 十万级点位渲染 | OpenLayers Cluster 聚类 + BBOX 视口剪裁 + dataCache + moveend 惰性刷新 |
| 6 | 十万行日志流解密 | 客户端 RSA 密钥对生成 + 服务端用客户端公钥加密 AES 密钥 + AES-256-GCM Worker 并行解密 + Seq 保序合并 + 虚拟滚动 |
| 7 | RBAC 位编码权限 | 位运算权限编码: 6 种权限 (READ/WRITE/DELETE/EXPORT/IMPORT/ADMIN), 5 个预设角色 (GUEST/EDITOR/MODERATOR/ADMIN/SUPER), 菜单/路由/按钮三层可视化联动 + 后端 API (`POST /api/rbac/check`) 双重校验 + 前后端一致性对比 |
| 8 | 双 Token 无感刷新 | Promise gate + 并发队列 + Refresh Token Rotation + Replay 检测 + Session Nonce 单设备登录 + Token 生命周期可视化 |
| 9 | SSE 日志流 | ReadableStream + AbortController + RAF 节流 + 暂停/恢复连接 |
| 10 | 请求加载 Signal | React 19 `use()` + Suspense + ErrorBoundary + AbortController + Signal 级别请求追踪 |
| 11 | 树形数据操作引擎 | 递归 CRUD + 拖拽排序 + 节点校验 + 批量操作 |
| 12 | 大文件断点续传 | SHA-256 分片哈希 + 并发滑动窗口上传 + 完整性校验 + 暂停/恢复/停止 + 刷新持久化 + 代际锁防并发竞态 + 下载已上传文件 |
| 13 | 页面性能监控 (Dashboard) | web-vitals 5 采集 CLS/FCP/INP/LCP/TTFB → PageTracker 自动上报路径+渲染耗时 → 后端存储 → 页面访问明细表 + ECharts 排行，所有 vitals 端点无需认证 |
| 14 | UniPay 统一支付中台 | 支付状态机 (7 状态 × 6 驱动) + Idempotency-Key 幂等性防重复扣款 + 指数退避重试 (1s/2s/4s) + T+1 对账 (groupMap 去重 + 自动退款) + 安全检测 (回调伪造 RSA 验签 + 金额篡改二次验价) |
| 15 | AI Demo | LLM 聊天 (流式)、知识库管理 (RAG)、模型管理 (OpenAI/DeepSeek/Ollama)、智能体管理 (ReAct/Function Calling/Multi-Agent)、插件中心、AI Dashboard |

## 快速启动

### 本地开发 (Bun + Go + Turbo)

```bash
# 后端
cd backend && go run ./cmd/server/
go test ./internal/... -v

# 前端（使用 Turborepo 并行启动所有 workspace dev server）
bun run dev

# 或单独启动前端
cd apps/frontend && bun run dev
```

Swagger 文档启动后访问 http://localhost:8080/swagger/index.html。

### Docker Compose (完整环境)

```bash
docker compose up --build
```

访问 `http://localhost` 即可使用完整功能 (含 WebSocket、SSE 等)。

## 构建验证

```bash
# 使用 Turborepo 构建所有 workspace（缓存加速）
bun run build

# 仅构建 frontend
bun run build --filter=@interview-demo/frontend

# 类型检查（turbo 并行 + 缓存 .tsbuildinfo）
bun run typecheck

# 运行测试（turbo 并行，与 build 无依赖关系）
bun run test

# 单独构建前端
cd apps/frontend && bun run build   # tsc -b + vite build (Rolldown Rust bundler)
bun run lint                        # Biome check
```

## API 路由

### 公开（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/swagger/*any` | Swagger 交互式 API 文档 |
| POST | `/api/auth/login` | 登录 (AUTH_USERNAME / AUTH_PASSWORD) |
| POST | `/api/auth/refresh` | 轮换 Refresh Token |
| GET | `/api/auth/check` | 校验 Access Token 有效性 |
| GET | `/api/auth/used-tokens` | 已轮换 Refresh Token 计数 |
| GET | `/api/health` | 健康检查 |
| GET | `/healthz` | 健康检查 (存活/就绪探针) |
| GET | `/api/sse/logs` | SSE 日志流 |
| GET | `/api/sse/encrypted-logs` | 加密日志流 |
| GET | `/api/upload/download/:uploadId` | 下载已完成文件 |
| POST | `/api/chat` | 聊天对话 |
| POST | `/api/chat/stream` | 流式聊天 |
| GET | `/api/chat/history/:conversationId` | 聊天历史 |
| DELETE | `/api/chat/history/:conversationId` | 清空聊天历史 |
| GET | `/api/models` | 列出 AI 模型 |
| GET | `/api/models/:id` | 模型详情 |
| POST | `/api/models/:id/chat` | 指定模型对话 |
| GET | `/api/agents` | 智能体列表 |
| POST | `/api/agents` | 创建智能体 |
| POST | `/api/agents/:id/execute` | 执行智能体 |
| DELETE | `/api/agents/:id` | 删除智能体 |
| GET | `/api/knowledge-base` | 知识库列表 |
| POST | `/api/knowledge-base` | 创建知识库 |
| GET | `/api/knowledge-base/:id` | 知识库详情 |
| DELETE | `/api/knowledge-base/:id` | 删除知识库 |
| POST | `/api/knowledge-base/:id/document` | 添加文档 |
| GET | `/api/knowledge-base/:id/document` | 文档列表 |
| DELETE | `/api/knowledge-base/:id/document/:docId` | 删除文档 |
| POST | `/api/knowledge-base/:id/documents/batch` | 批量添加文档 |
| POST | `/api/knowledge-base/search` | 搜索知识库 |
| POST | `/api/knowledge-base/init-docs` | 从本地目录加载文档 |
| POST | `/api/vitals/report` | 上报 Web Vitals |
| GET | `/api/vitals/summary` | Vitals 汇总 |
| GET | `/api/vitals/history` | Vitals 时间序列 |
| POST | `/api/vitals/page-report` | 上报页面渲染数据 |
| GET | `/api/vitals/pages` | 页面访问汇总 |
| GET | `/api/vitals/page-history` | 页面渲染时间序列 |
| GET | `/ws/alerts` | WebSocket 告警推送 |
| GET | `/api/alerts` | SSE / HTTP Polling 告警推送 |

### 受保护（需 JWT Authorization Header）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/gis/points` | GIS 点位数据 (count, 默认 10 万, 上限 50 万) |
| GET | `/api/schema/config` | 动态表单 Schema + initialData |
| POST | `/api/schema/validate` | 后端 Schema 校验 |
| POST | `/api/upload/init` | 初始化上传会话 |
| POST | `/api/upload/chunk` | 上传分片 (SHA-256 校验) |
| POST | `/api/upload/complete` | 合并分片 + 完整性校验 |
| GET | `/api/upload/status/:uploadId` | 查询上传进度 |
| GET | `/api/upload/sessions` | 上传会话列表 |
| POST | `/api/rbac/check` | RBAC 权限后端校验 |
| GET | `/api/services` | LRU 缓存 — 服务列表 |
| GET | `/api/config` | LRU 缓存 — 配置 |
| GET | `/api/logs` | LRU 缓存 — 日志 |
| GET | `/api/request-loading/demo` | 请求延迟模拟 (?delay&fail&type) |
| POST | `/api/payments/create` | 创建支付订单 |
| POST | `/api/payments/process/:id` | 处理支付 |
| GET | `/api/payments/order/:id` | 查询订单详情 |
| GET | `/api/payments/orders` | 订单列表 |
| POST | `/api/payments/transition/:id` | 状态流转 |
| POST | `/api/payments/idempotency-test` | 幂等性测试 |
| POST | `/api/payments/security-check` | 安全校验演示 |
| POST | `/api/payments/retry-demo` | 重试机制演示 |

## 代码校验 (GitHub Actions + GitLab CI, Turborepo 编排)

| Job | 命令 | 工具 |
|-----|------|------|
| lint-backend | `go vet ./...` | Go vet |
| test-backend | `go test ./internal/...` | Go test |
| lint-workspaces | `bun run lint`（turbo 三 workspace 并行） | Biome 2.5 |
| test-workspaces | `bun run test`（turbo 并行缓存，不依赖 build） | Vitest 4 |
| typecheck-workspaces | `bun run typecheck`（turbo 并行缓存 .tsbuildinfo） | TypeScript 6 |

## CI/CD + K8s 部署

```
用户 → Nginx Ingress → /api /ws        → backend-service:8080
                     → /interview-demo → interview-docs-service:80
                     → /               → frontend-service:80 (nginx 静态文件)
```

### Docker 多阶段构建

| Stage | 基础镜像 | 产出 |
|-------|----------|------|
| `frontend-builder` | oven/bun:1.3 | `bun install && bun run build` → `apps/frontend/dist/`（turbo 缓存加速） |
| `interview-docs-builder` | oven/bun:1.3 | `bun install && bun run build` → `apps/interview-docs/dist/` |
| `backend-builder` | golang:1.26 | `CGO_ENABLED=0 go build` → 二进制 |
| `frontend` | nginx:alpine | `dist/` + `nginx.conf` → :80 |
| `interview-docs` | nginx:alpine | `dist/` + `nginx.interview-docs.conf` → :80 (root `/`) |
| `backend` | alpine:3.19 | 二进制 + ca-certificates → :8080 |

### Helm Chart

```bash
helm upgrade --install interview-demo ./helm \
  --namespace interview-demo --create-namespace \
  --set backend.image.repository=registry.example.com/backend \
  --set frontend.image.repository=registry.example.com/frontend \
  --set interviewDocs.image.repository=registry.example.com/interview-docs \
  --wait --timeout 120s
```

### 零停机滚动更新

- `maxSurge: 1` — 额外启动 1 个新 Pod
- `maxUnavailable: 0` — 确保始终有旧 Pod 提供服务
- `terminationGracePeriodSeconds: 30` — 优雅关闭

### 健康检查

| 部署 | 存活探针 | 就绪探针 |
|------|----------|----------|
| backend | `GET /healthz` 10s | `GET /healthz` 5s |
| frontend | `GET /` 10s | `GET /` 5s |

## 认证机制

双 Token 无感刷新 + 单设备登录：

- **Access Token**：15 分钟有效，携带用户身份
- **Refresh Token**：长期有效，支持轮换 (Rotation)
- **重放检测**：旧 Refresh Token 二次使用立即失效
- **Session Nonce**：基于用户会话的唯一标识，后登录踢掉前设备

## 配置 (后端)

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `PORT` | `8080` | 服务监听端口 |
| `GIN_MODE` | `debug` | Gin 运行模式 |
| `JWT_SECRET` | `demo-jwt-secret-key` | JWT 签名密钥 |
| `AUTH_USERNAME` | `admin` | 登录用户名 |
| `AUTH_PASSWORD` | `admin123` | 登录密码 |
| `CORS_ORIGIN` | `*` | CORS 允许来源 |
| `OPENAI_API_KEY` | - | OpenAI API Key |
| `DOCS_DIR` | `../docs` | 文档目录路径 |

## 构建产物 (apps/frontend/dist/)

Rolldown 代码分割 + `React.lazy()` 页面级懒加载后，首屏仅 **~50 kB**：

```
apps/frontend/dist/
├── index.html                        0.94 kB       (HTML 入口)
├── assets/
│   ├── rolldown-runtime-*.js         0.82 kB       (Rolldown 运行时)
│   ├── index-*.js                   23.38 kB       (应用入口)
│   ├── vendor-react-*.js           241.29 kB       [缓存] React / Zustand / Router
│   ├── vendor-common-*.js          50.20 kB        [缓存] 公共依赖
│   ├── antd-*.js                1,013.63 kB        [缓存] Ant Design
│   ├── antd-icons-*.js            106.74 kB        [缓存] Ant Design 图标
│   ├── antd-cssinjs-*.js          32.36 kB         [缓存] Ant Design CSS-in-JS
│   ├── echarts-*.js             1,120.10 kB        [缓存] ECharts
│   ├── gis-*.js                  306.00 kB         [缓存] OpenLayers
│   ├── form-*.js                 112.59 kB         [缓存] 表单引擎
│   └── pages/ (懒加载)                              首屏不加载
│       ├── Dashboard-*.js           1.07 kB
│       ├── RequestLoading-*.js      9.75 kB
│       ├── SseLogStream-*.js        4.02 kB
│       ├── GisRendering-*.js        3.66 kB
│       ├── WebWorkerMerge-*.js      5.40 kB
│       ├── UniPay-*.js             21.42 kB
│       ├── TokenRefresh-*.js        8.78 kB
│       ├── LogStream-*.js           8.95 kB
│       ├── TreeDataEngine-*.js      9.49 kB
│       ├── RbacPermission-*.js     14.67 kB
│       ├── ChunkedUpload-*.js      14.23 kB
│       ├── AlertWebSocket-*.js     18.71 kB
│       ├── LruRouteCache-*.js      25.89 kB
│       ├── JsonSchemaForm-*.js     26.29 kB
│       ├── merge.worker-*.js        0.35 kB
│       ├── decrypt.worker-*.js      0.48 kB
│       └── hash.worker-*.js         0.38 kB
```

- 单 bundle 3,034 kB → 首屏 ~50 kB (↓98%)
- 构建时间 ~3.41s (3990 modules, Rolldown Rust bundler)

## 代码质量优化 (Code Review — 2026.06)

### Bug 修复 (3 项)
| 文件 | 问题 | 修复 |
|------|------|------|
| `DateTimeField.tsx` | DatePicker value 三元表达式始终为 `undefined` | 改为 `dayjs(value)` 解析 |
| `alertStore.ts` | alerts 数组无限增长 → OOM | 添加 `MAX_ALERTS = 5000` 上限 |
| `Renderer.tsx` | `Space` 组件 `...props.style` 解构错误 | 改为正确的 `{ children, style }` 解构 |

### 可靠性改进 (6 项)
| 文件 | 改进 |
|------|------|
| `DynamicForm.tsx` | 合并嵌套 setData 消除竞态；flattenSchema useMemo 缓存 |
| `fetchClient.ts` | `location.href` → `redirectToLogin()` + `window.location.replace` |
| `token.ts` | `isTokenExpired` 增加 30s buffer |
| `uploadStore.ts` | persist 添加 `partialize` 过滤运行时字段 |
| `PageTracker.tsx` | ref 操作移至 `useEffect` |

### 架构优化 (3 项)
| 文件 | 优化 |
|------|------|
| `authStore.ts` | `initUser()` → `hydrate()` 延迟初始化 + `window` 守卫 |
| `Login.tsx` | 全局 `<style>` 注入 → CSS Module |
| `types.ts` | ajv 单例 → `configureAjv()` 可配置 |
