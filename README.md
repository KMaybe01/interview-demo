# Interview Demo - 技术演示平台

## 项目概述

React 19 + Go 1.26 全栈演示项目，涵盖 **12 个高级技术场景**，聚焦前端工程化、性能优化与架构设计。

**Keywords:** 无感刷新 · Token Rotation · 递归表单引擎 · 双重校验 · 实时 JSON 编辑 · WebSocket 心跳 · LRU 路由缓存 · Web Worker 分治 · OpenLayers 聚类 · RBAC 位编码 · SSE 流式日志 · 请求加载 Signal · 树形数据引擎 · 大文件断点续传

## 技术栈

| 层级     | 技术                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 前端     | React 19, TypeScript 6, Vite 8, Ant Design 6, Zustand 5, React Router 7 |
| 工具链   | Biome 2.5, ESLint 9 (strictTypeChecked)                                 |
| 后端     | Go 1.26, Gin 1.12, Gorilla WebSocket, golang-jwt                       |
| GIS      | OpenLayers 10.9 (Cluster + BBOX)                                        |
| 表单     | 自定义递归渲染引擎 (非 @rjsf)                                            |
| 运行     | Bun 1.3                                                                 |
| CI/CD    | GitLab CI + Docker (多阶段构建)                                         |
| 部署     | Kubernetes Helm (滚动更新, zero-downtime), Nginx Ingress                |

## 项目结构

```
interview-demo/
├── frontend/                       # React 19 前端
│   ├── src/
│   │   ├── main.tsx                # React 入口 (StrictMode, BrowserRouter)
│   │   ├── App.tsx                 # 根组件 (Ant Design ConfigProvider, 路由)
│   │   ├── assets/                 # 静态资源 (图片)
│   │   ├── pages/                  # 13 个演示页面 (含仪表盘)
│   │   │   ├── Dashboard.tsx       # / 仪表盘
│   │   │   ├── JsonSchemaForm.tsx  # /json-schema-form 动态表单 + 实时 JSON 编辑
│   │   │   ├── AlertWebSocket.tsx  # /alert-websocket WebSocket 告警
│   │   │   ├── ChunkedUpload.tsx   # /chunked-upload 大文件分片上传
│   │   │   ├── GisRendering.tsx    # /gis-rendering GIS 十万级点位
│   │   │   ├── LogStream.tsx       # /log-stream 百万行日志流式解密
│   │   │   ├── LruRouteCache.tsx   # /lru-route-cache LRU 路由缓存
│   │   │   ├── RbacPermission.tsx  # /rbac-permission RBAC 位编码权限
│   │   │   ├── RequestLoading.tsx  # /request-loading 请求加载 Signal
│   │   │   ├── SseLogStream.tsx    # /sse-log-stream SSE 日志流
│   │   │   ├── TokenRefresh.tsx    # /token-refresh 双 Token 无感刷新
│   │   │   ├── TreeDataEngine.tsx  # /tree-data-engine 树形数据操作
│   │   │   └── WebWorkerMerge.tsx  # /web-worker-merge 分治归并排序
│   │   ├── components/
│   │   │   └── dynamic-form/       # 自定义递归表单引擎
│   │   │       ├── DynamicForm.tsx  # 容器: forwardRef + onChange + 校验调度
│   │   │       ├── Renderer.tsx     # 递归渲染器 (tabs→card→form→leaf)
│   │   │       ├── registry.tsx     # 策略模式控件注册表
│   │   │       ├── types.ts        # Schema 类型 + AJV 校验 + 工具函数
│   │   │       └── fields/         # 7 个字段组件
│   │   │           ├── StringField.tsx   # Input
│   │   │           ├── NumberField.tsx   # InputNumber
│   │   │           ├── SelectField.tsx   # Select
│   │   │           ├── SwitchField.tsx   # Switch
│   │   │           ├── DateTimeField.tsx # DatePicker
│   │   │           ├── JsonField.tsx     # TextArea (JSON)
│   │   │           └── ArrayField.tsx    # 动态数组 (添加/删除)
│   │   ├── stores/                  # Zustand 状态管理
│   │   │   ├── index.ts            # 桶文件导出
│   │   │   ├── alertStore.ts       # WebSocket 告警
│   │   │   ├── lruRouteStore.ts    # LRU 路由缓存
│   │   │   ├── requestLoadingStore.ts # 请求加载 Signal
│   │   │   └── uploadStore.ts      # 分片上传 (persist + localStorage)
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx      # 侧边栏 + 头部 + 内容区布局
│   │   ├── routes/
│   │   │   └── index.tsx           # 13 条路由配置
│   │   ├── utils/                   # 工具函数
│   │   │   ├── token.ts            # JWT Token 工具
│   │   │   ├── lru.ts              # LRUCache 泛型类
│   │   │   ├── rbac.ts             # RBAC 位运算权限
│   │   │   └── wsTransport.ts      # WebSocket 传输层: 二进制协议/背压/心跳/降级链
│   │   └── workers/                 # Web Worker
│   │       ├── merge.worker.ts     # 归并排序 Worker
│   │       └── decrypt.worker.ts   # 日志解密 Worker
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── vite.config.ts              # Vite + React + Babel + /api 代理
│   ├── tsconfig.json               # TypeScript 配置入口
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── biome.json                  # Biome 2.5 配置
│   ├── eslint.config.js            # ESLint 9 配置
│   ├── package.json
│   └── index.html                  # HTML 入口
├── backend/                        # Go 1.26 后端
│   ├── main.go                     # Gin 入口 :8080
│   ├── go.mod / go.sum
│   ├── handlers/
│   │   ├── alert.go                # WebSocket 告警推送 + HTTP SSE/Polling 多协议适配
│   │   ├── auth.go                 # 登录 + Token 刷新/轮换
│   │   ├── gis.go                  # GIS 点位数据
│   │   ├── schema.go               # Schema 后端业务校验
│   │   ├── sse.go                  # SSE 日志流
│   │   ├── encrypted_logs.go       # 加密日志流
│   │   └── upload.go               # 分片上传 / 状态查询 / 合并
│   ├── middleware/
│   │   └── (CORS 中间件)
│   └── uploads/                    # 上传文件临时存储
├── docs/
│   └── 面试亮点.md                 # 项目技术分析报告 (面试用)
├── helm/                           # Helm Chart 部署
│   ├── Chart.yaml                  # Chart 元数据 (v2, version 0.1.0)
│   ├── values.yaml                 # 集中化配置 (镜像/副本/探针/资源/ingress)
│   └── templates/
│       ├── _helpers.tpl            # 通用标签/选择器模板
│       ├── namespace.yaml          # ns/interview-demo
│       ├── configmap.yaml          # 后端环境变量
│       ├── backend-deployment.yaml # 2 副本, 滚动更新, 健康检查
│       ├── backend-service.yaml    # ClusterIP :8080
│       ├── frontend-deployment.yaml# 2 副本, nginx :80
│       ├── frontend-service.yaml   # ClusterIP :80
│       └── ingress.yaml            # /api /ws → backend, / → frontend
├── Dockerfile                      # 多阶段构建 (frontend-builder → backend-builder → frontend/backend)
├── nginx.conf                      # Nginx 反向代理 (静态文件 + /api + /ws WebSocket)
├── .gitlab-ci.yml                  # GitLab CI/CD 流水线 (validate → build → package → deploy)
└── README.md
```

## 演示功能

| #  | 页面                | 核心实现                                                                 |
| -- | ------------------- | ------------------------------------------------------------------------ |
| 1  | 告警 WebSocket      | 多协议传输层 (WebSocket→SSE→Polling 降级) + 手动 Segmented 切换 + 直连后端 + 二进制协议 + 背压控制 + 消息合并 + 心跳保活 + 断线重连 + 消息去重 + RAF 节流 + ECharts 实时趋势 |
| 2  | JSON Schema 动态表单 | 自定义递归渲染引擎: 条件显隐 / 数组列表 / 自定义/异步校验 / 字段联动 / ajv / 循环检测 / 实时 JSON 编辑与双向同步 |
| 3  | LRU 路由缓存         | 3 页 Tab 切换 + DOM display:none 保持状态 + LRU 淘汰 + 写后失效缓存一致性 + 过期自动刷新 |
| 4  | Web Worker 分治合并  | Worker Pool + 自适应分区 + 有序归并缓冲区 + 主线程 Array.sort 对比         |
| 5  | GIS 十万级点位渲染   | OpenLayers Cluster 聚类 + BBOX 视口剪裁 + dataCache + moveend 惰性刷新   |
| 6  | 百万行日志流式解密   | 生产/消费模式 + XOR 加解密 + 虚拟滚动                                     |
| 7  | RBAC 位编码权限      | 位运算权限编码: 6 种权限, 5 个预设角色, 三层联动 (菜单/路由/按钮)           |
| 8  | 双 Token 无感刷新    | 请求拦截器 + 并发队列锁 + Promise gate + Refresh Token Rotation + Replay 检测 |
| 9  | SSE 日志流           | ReadableStream + AbortController + RAF 节流 + 暂停/恢复连接               |
| 10 | 请求加载 Signal      | Signal 级别请求追踪 + 方法-路径匹配树                                     |
| 11 | 树形数据操作引擎     | 递归 CRUD + 拖拽排序 + 节点校验 + 批量操作                                |
| 12 | 大文件断点续传       | SHA-256 分片哈希 + 并发分片上传 + 完整性校验 + 暂停/恢复/停止 + 刷新持久化 + 清除已完成 + 重置全部 |

## 快速启动

```bash
# 后端
cd backend && go run .

# 前端
cd frontend && bun dev
```

## 构建验证

```bash
cd frontend
bun run build          # tsc -b + vite build (Rolldown Rust bundler)
bun run lint:eslint    # ESLint 严格模式检查
```

## 构建产物 (dist/)

Rolldown 代码分割 + `React.lazy()` 页面级懒加载后，首屏仅 **~50 kB**，其余页面按需加载：

```
dist/
├── index.html                             0.58 kB       (HTML 入口)
├── assets/
│   ├── rolldown-runtime-*.js              0.82 kB       (Rolldown 运行时)
│   ├── index-*.js                         7.15 kB       (应用入口: 路由+布局)
│   ├── vendor-*.js                      231.93 kB       (React / Zustand / Router)
│   ├── antd-*.js                     1,111.19 kB       [缓存] Ant Design
│   ├── echarts-*.js                  1,118.10 kB       [缓存] ECharts
│   ├── gis-*.js                        304.84 kB       [缓存] OpenLayers
│   │
│   ├── pages/ (React.lazy 懒加载)                        首屏不加载
│   │   ├── Dashboard-*.js                1.05 kB        仪表盘
│   │   ├── RequestLoading-*.js           2.30 kB        请求加载 Signal
│   │   ├── SseLogStream-*.js             3.90 kB        SSE 日志流
│   │   ├── GisRendering-*.js             5.05 kB        GIS 点位渲染
│   │   ├── WebWorkerMerge-*.js           5.25 kB        Worker 分治合并
│   │   ├── LogStream-*.js                8.09 kB        日志流式解密
│   │   ├── TokenRefresh-*.js             9.07 kB        无感刷新
│   │   ├── TreeDataEngine-*.js           9.46 kB        树形数据操作
│   │   ├── ChunkedUpload-*.js           11.69 kB        大文件断点续传
│   │   ├── RbacPermission-*.js          16.94 kB        RBAC 位编码权限
│   │   ├── AlertWebSocket-*.js          18.29 kB        WebSocket 告警
│   │   ├── LruRouteCache-*.js           19.92 kB        LRU 路由缓存
│   │   └── JsonSchemaForm-*.js         142.11 kB        动态表单引擎
│   │
│   └── workers/
│       ├── merge.worker-*.js             0.35 kB        归并排序 Worker
│       └── decrypt.worker-*.js           0.48 kB        日志解密 Worker
```

- **代码分割**: 12 页面通过 `React.lazy()` 独立 chunk，`codeSplitting.groups` 按优先级分割 vendor
- **缓存策略**: antd/echarts/gis 等大型库独立缓存，版本不变即 `304 Not Modified`
- **构建时间**: ~3.2s (3911 modules, Rolldown Rust bundler)
- **对比**: 单 bundle 3,034 kB → 首屏 ~50 kB (↓98%)

| 路由                   | 方法   | 说明                        |
| ---------------------- | ------ | --------------------------- |
| `/ws/alerts`           | GET    | WebSocket 告警推送          |
| `/api/alerts`          | GET    | SSE/Polling 告警推送 (同路由分发) |
| `/api/gis/points`      | GET    | GIS 点位数据                |
| `/api/sse/logs`        | GET    | SSE 日志流                  |
| `/api/auth/login`      | POST   | 登录获取双 Token            |
| `/api/auth/refresh`    | POST   | 轮换 Refresh Token + 返回新双 Token |
| `/api/auth/check`      | GET    | 验证 Access Token 有效性     |
| `/api/auth/used-tokens`| GET    | 已轮换 Refresh Token 计数   |
| `/api/schema/validate` | POST   | 后端 Schema + 业务语义校验   |
| `/api/upload/init`     | POST   | 初始化大文件上传 (uploadId, chunkSize, totalChunks) |
| `/api/upload/chunk`    | POST   | 上传单个分片 (SHA-256 校验)  |
| `/api/upload/complete` | POST   | 分片合并 + 完整性验证        |
| `/api/upload/status/:uploadId` | GET | 查询某个上传的已接收分片列表 |
| `/api/upload/sessions` | GET    | 列出所有进行中的上传会话      |

## 代码校验 (GitHub Actions)

每次 Push / Pull Request 到 `main` 分支时自动触发：

| Job           | 命令                | 工具        |
| ------------- | ------------------- | ----------- |
| lint-backend  | `go vet ./...`      | Go vet      |
| lint-frontend | `npm run lint`      | Biome 2.5   |

配置文件: `.github/workflows/lint.yml`

## CI/CD + K8s 部署

### 架构

```
用户 → Nginx Ingress → /api /ws → backend-service:8080
                    → /       → frontend-service:80 (nginx 静态文件)
```

- 前端 nginx 容器: 静态资源 + gzip + `proxy_pass` 到 `backend-service:8080` 代理 `/api` 和 `/ws`
- WebSocket 通过 nginx `Upgrade` header 转发，3600s 超时

### Docker 多阶段构建

| Stage              | 基础镜像        | 产出                              |
| ------------------ | --------------- | --------------------------------- |
| `frontend-builder` | node:22-alpine  | `tsc -b && vite build` → `dist/` |
| `backend-builder`  | golang:1.26     | `CGO_ENABLED=0 go build` → 二进制 |
| `frontend`         | nginx:alpine    | `dist/` + `nginx.conf` → :80      |
| `backend`          | alpine:3.19     | 二进制 + ca-certificates → :8080  |

构建命令:

```bash
docker build --target frontend -t registry/backend:tag .
docker build --target backend  -t registry/frontend:tag .
```

### GitLab CI/CD 流水线

| Stage      | Job              | 说明                                  |
| ---------- | ---------------- | ------------------------------------- |
| validate   | lint-backend     | `go vet ./...`                        |
| validate   | lint-frontend    | `biome check --write src/`           |
| build      | build-backend    | `go build -o bin/server .`            |
| build      | build-frontend   | `npm ci && npm run build`             |
| package    | docker-backend   | 多阶段构建 backend 镜像并推送 Registry |
| package    | docker-frontend  | 多阶段构建 frontend 镜像并推送 Registry |
| deploy     | deploy-k8s       | `helm upgrade --install` + `--wait`    |

流水线入口: `.gitlab-ci.yml`

### Helm Chart 结构

```
helm/
├── Chart.yaml        # Chart 元数据
├── values.yaml       # 所有可配置参数 (镜像/副本/探针/资源/域名等)
└── templates/
    ├── _helpers.tpl          # Go template 辅助函数
    ├── namespace.yaml        # 命名空间
    ├── configmap.yaml        # 后端 ConfigMap
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    └── ingress.yaml          # 可通过 ingress.enabled 开关
```

### 部署到 K8s

前提: 已安装 `helm` 并配置 `kubectl` 连接目标集群。

```bash
# 安装/升级部署
helm upgrade --install interview-demo ./helm \
  --namespace interview-demo \
  --create-namespace \
  --set backend.image.repository=registry.example.com/backend \
  --set backend.image.tag=latest \
  --set frontend.image.repository=registry.example.com/frontend \
  --set frontend.image.tag=latest \
  --wait --timeout 120s

# 验证
kubectl rollout status deployment/backend -n interview-demo
kubectl rollout status deployment/frontend -n interview-demo

# 卸载
helm uninstall interview-demo -n interview-demo
```

### 常用 Helm 操作

```bash
# 渲染模板 (本地预览)
helm template interview-demo ./helm

# 查看当前 values
helm get values interview-demo -n interview-demo

# 升级指定镜像版本 (CI 中使用)
helm upgrade --install interview-demo ./helm \
  --set backend.image.tag=$CI_COMMIT_SHORT_SHA \
  --set frontend.image.tag=$CI_COMMIT_SHORT_SHA \
  --wait --timeout 120s

# 回滚
helm rollback interview-demo 1 -n interview-demo
```

### 零停机滚动更新

- `maxSurge: 1` — 允许额外启动 1 个新 Pod
- `maxUnavailable: 0` — 确保始终有旧 Pod 提供服务
- 新 Pod readiness 通过后才终止旧 Pod
- `terminationGracePeriodSeconds: 30` — 优雅关闭

### 健康检查

| 部署      | 存活探针                      | 就绪探针                      |
| --------- | ----------------------------- | ----------------------------- |
| backend   | `GET /api/auth/check` 10s     | `GET /api/auth/check` 5s      |
| frontend  | `GET /` 10s                   | `GET /` 5s                    |
