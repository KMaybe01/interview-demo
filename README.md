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

