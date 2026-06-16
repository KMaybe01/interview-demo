# Interview Demo - 技术演示平台

## 项目概述

React 19 + Go 1.26 全栈演示项目，涵盖 **11 个高级技术场景**，聚焦前端工程化、性能优化与架构设计。

**Keywords:** 无感刷新 · Token Rotation · 递归表单引擎 · 双重校验 · WebSocket 心跳 · LRU 路由缓存 · Web Worker 分治 · OpenLayers 聚类 · RBAC 位编码 · SSE 流式日志 · 请求加载 Signal · 树形数据引擎

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
| 部署     | Kubernetes (滚动更新, zero-downtime), Nginx Ingress                     |

## 项目结构

```
interview-demo/
├── frontend/
│   ├── src/
│   │   ├── pages/                  # 11 个演示页面
│   │   ├── components/
│   │   │   └── dynamic-form/       # 自定义递归表单引擎
│   │   │       ├── DynamicForm.tsx  # 容器：提交/重置/校验
│   │   │       ├── Renderer.tsx     # 递归渲染器 (tabs→card→form→leaf)
│   │   │       ├── registry.tsx     # 控件注册表
│   │   │       ├── types.ts        # Schema 类型 + 校验逻辑
│   │   │       └── fields/         # 7 个字段组件
│   │   ├── stores/                  # Zustand 状态管理
│   │   ├── utils/                   # LRU, RBAC, Token 工具
│   │   ├── workers/                 # Web Worker
│   │   ├── layouts/                 # Ant Design 布局
│   │   └── routes/                  # 路由配置
│   ├── biome.json
│   └── eslint.config.js
├── backend/
│   ├── main.go                     # Gin 入口 :8080
│   ├── handlers/                    # WebSocket, Auth, SSE, GIS, Schema
│   └── middleware/                  # CORS
├── Dockerfile                      # 多阶段构建 (frontend-builder → backend-builder → frontend/backend)
├── nginx.conf                      # Nginx 反向代理 (静态文件 + /api + /ws WebSocket)
├── .gitlab-ci.yml                  # GitLab CI/CD 流水线 (validate → build → package → deploy)
└── k8s/
    ├── namespace.yml               # ns/interview-demo
    ├── configmap.yml               # 后端环境变量
    ├── backend-deployment.yml      # 2 副本, 滚动更新, 健康检查
    ├── backend-service.yml         # ClusterIP :8080
    ├── frontend-deployment.yml     # 2 副本, nginx :80
    ├── frontend-service.yml        # ClusterIP :80
    ├── ingress.yml                 # /api /ws → backend, / → frontend
    └── kustomization.yml           # Kustomize 统一管理
```

## 演示功能

| #  | 页面                | 核心实现                                                                 |
| -- | ------------------- | ------------------------------------------------------------------------ |
| 1  | 告警 WebSocket      | 指数退避重连 + 心跳 Ping/Pong + 消息去重 + RAF 节流 + ECharts 实时趋势     |
| 2  | JSON Schema 动态表单 | 自定义递归渲染引擎: 条件显隐 / 数组列表 / 自定义/异步校验 / 字段联动 / ajv / 循环检测 |
| 3  | LRU 路由缓存         | 3 页 Tab 切换 + DOM display:none 保持状态 + LRU 淘汰 + 切回后台刷新       |
| 4  | Web Worker 分治合并  | Worker Pool + 自适应分区 + 有序归并缓冲区 + 主线程 Array.sort 对比         |
| 5  | GIS 十万级点位渲染   | OpenLayers Cluster 聚类 + BBOX 视口剪裁 + dataCache + moveend 惰性刷新   |
| 6  | 百万行日志流式解密   | 生产/消费模式 + XOR 加解密 + 虚拟滚动                                     |
| 7  | RBAC 位编码权限      | 位运算权限编码: 6 种权限, 5 个预设角色, 三层联动 (菜单/路由/按钮)           |
| 8  | 双 Token 无感刷新    | 请求拦截器 + 并发队列锁 + Promise gate + Refresh Token Rotation + Replay 检测 |
| 9  | SSE 日志流           | ReadableStream + AbortController + RAF 节流 + 暂停/恢复连接               |
| 10 | 请求加载 Signal      | Signal 级别请求追踪 + 方法-路径匹配树                                     |
| 11 | 树形数据操作引擎     | 递归 CRUD + 拖拽排序 + 节点校验 + 批量操作                                |

## 双重校验策略 (动态表单)

| 层级   | 校验内容                            | 错误样式     |
| ------ | ----------------------------------- | ------------ |
| 前端   | ajv 结构校验 (类型/必填/枚举/正则)   | 黄色警告提示 |
| 前端   | 自定义校验 (IP 格式/端口范围)        | 黄色警告提示 |
| 前端   | 异步校验 (唯一性 1s 延迟模拟)        | 加载 Spin    |
| 后端   | 业务语义 (IP 合法性/Cell ID 格式/MCC 白名单/端口-类型关联/带宽标准值) | 红色错误 + setFields 映射 |

## 无感刷新架构 (Token)

```
请求 → 401 → 队列锁 → POST /api/auth/refresh → Token Rotation → 重放队列
                       ↓ 失败
                    Refresh 过期 → 强制登出
```

- **Refresh Token Rotation**: 每次刷新后旧 Refresh Token 标记为已用，禁止重放攻击
- **并发队列**: 刷新期间并发请求排队等待，刷新完成统一重放

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
bun run build          # tsc -b + vite build
bun run lint:eslint    # ESLint 严格模式检查
```

## 后端 API

| 路由                   | 方法   | 说明                        |
| ---------------------- | ------ | --------------------------- |
| `/ws/alerts`           | GET    | WebSocket 告警推送          |
| `/api/gis/points`      | GET    | GIS 点位数据                |
| `/api/sse/logs`        | GET    | SSE 日志流                  |
| `/api/auth/login`      | POST   | 登录获取双 Token            |
| `/api/auth/refresh`    | POST   | 轮换 Refresh Token + 返回新双 Token |
| `/api/auth/check`      | GET    | 验证 Access Token 有效性     |
| `/api/auth/used-tokens`| GET    | 已轮换 Refresh Token 计数   |
| `/api/schema/validate` | POST   | 后端 Schema + 业务语义校验   |

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
| deploy     | deploy-k8s       | `kubectl set image` + `rollout status` |

流水线入口: `.gitlab-ci.yml`

### 部署到 K8s

前提: 已配置 `kubectl` 连接目标集群，`CI_REGISTRY_USER`/`CI_REGISTRY_PASSWORD` 变量。

```bash
# 本地测试部署 (替换镜像地址)
kubectl apply -k k8s/

# 验证
kubectl rollout status deployment/backend -n interview-demo
kubectl rollout status deployment/frontend -n interview-demo
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
