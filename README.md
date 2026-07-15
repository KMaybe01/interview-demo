# Interview Demo - 全栈技术演示平台

## 项目概述

Monorepo (Bun workspaces + Turborepo) 全栈项目，包含：
- **interview-demo**: React 19 + Go 1.26 全栈演示项目，涵盖 **22 个技术场景**（含仪表盘首页 + 15 个核心演示 + 6 个 AI 后端进阶模式），聚焦前端工程化、性能优化、架构设计与 AI 工程化。
- **前端知识库**: React 19 文档站点，Markdown 内容，GitHub Pages 部署，覆盖前端面试五阶段 + Go 后端知识体系。

**Keywords:** 无感刷新 · Token Rotation · 递归表单引擎 · 双重校验 · 实时 JSON 编辑 · WebSocket 心跳 · LRU 路由缓存 · Web Worker 分治 · OpenLayers 聚类 · RBAC 位编码 · SSE 流式日志 · 请求加载 Signal · 树形数据引擎 · 大文件断点续传 · 页面性能监控 · 统一支付中台 · AI Agent 流式执行 · MCP/A2A 协议 · 混合检索 RRF · 声明式埋点 · 优先级上报队列 · 多级去重 · 柔性降级

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
| 15 | AI Demo | 7 选项卡：AI 聊天（流式 SSE + Token 统计 + 上下文管理 + PII 脱敏 + 错误重试 + PromptGuard 注入防护）、知识库管理（4 种分块策略/Embedding/混合搜索 BM25+Vector RRF）、模型管理、智能体（工具注册表/记忆管理/流式执行轨迹 SSE/HITL 审核 + 多步骤 thought/action/observation）、Playground（MCP/A2A 协议 + 模型路由 + 遥测监控）、插件中心、AI Dashboard；后端: MockStream 回退 / 响应缓存 / Telemetry 采集 / 智能体 StepEvent |
| 16 | 前端监控与埋点系统 | 声明式 data-stat 埋点 + 优先级上报队列 (sendBeacon/RIC/64KB 分片) + 异常全捕获 (onerror/unhandledrejection/资源错误/API 监控) + 性能采集 (Navigation/Resource Timing) + 5s 内存+sessionStorage 二级去重 + 采样降级 + 柔性降级 withDegradation + Zustand 监控大盘 |

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
| typecheck-workspaces | `bun run typecheck` | TypeScript 6 |

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

## 性能优化


| 指标 | 优化前 (估算) | 优化后 | 提升 |
|------|--------------|--------|------|
| 初始 JS (压缩) | ~180 KB | ~96 KB (frontend) / ~72 KB (ai-demo) | 47-60% ↓ |
| CSS (压缩) | ~2 KB | ~2 KB (不变) | — |
| 导航体验 | 路由切换白屏 | Suspense + Spin 加载态 + 预渲染 | 即时反馈 |
| 页面切换 | 所有 Tab 组件预加载 | React.lazy 按需加载 | 按需加载 |


### 性能预算达标情况

| 资源 | 预算 | Frontend | Ai-demo | 状态 |
|------|------|----------|---------|------|
| 初始 JS (压缩) | < 300 KB | ~96 KB | ~72 KB | ✅ |
| CSS (压缩) | < 100 KB | ~2 KB | ~4 KB | ✅ |
| 字体 | < 100 KB | 系统字体，无额外加载 | 系统字体 | ✅ |
| 第三方 | < 200 KB | 无 | 无 | ✅ |