# Interview Demo — Backend

Go 1.26 + Gin 1.12 后端服务，为前端 13 个技术演示场景提供 API 支持。无外部数据库，所有数据存储在内存中。

## 技术栈

| 组件 | 用途 |
|------|------|
| Go 1.26 | 语言 / 运行时 |
| Gin 1.12 | HTTP Web 框架（路由、中间件、JSON 绑定） |
| golang-jwt v5 | JWT 双 Token 登录、刷新轮换、重放检测、签名算法校验 |
| Gorilla WebSocket v1.5 | WebSocket 告警推送、可配置来源校验 |

## 项目结构

```
backend/
├── cmd/server/main.go       # 入口 :${PORT}，优雅关闭
├── internal/
│   ├── agent/               # 智能体引擎（ReAct / Function Calling / Multi-Agent）
│   ├── auth/                # JWT 双 Token 认证（登录/刷新/重放检测）
│   ├── chat/                # 对话处理（LLM 调用 / 流式 / 模型管理）
│   ├── demo/                # 13 个技术演示场景
│   │   ├── alert.go         # WebSocket + SSE + HTTP Polling 多协议告警
│   │   ├── encrypted_logs.go # 加密日志流
│   │   ├── gis.go           # GIS 点位生成
│   │   ├── health.go        # 健康检查
│   │   ├── lru_cache.go     # LRU 缓存演示
│   │   ├── rbac.go          # RBAC 位运算权限校验
│   │   ├── request_loading.go # 模拟请求延迟/失败
│   │   ├── schema.go        # 动态 JSON Schema 表单 + 递归校验
│   │   ├── sse.go           # SSE 日志流
│   │   ├── upload.go        # 大文件分片上传
│   │   └── vitals.go        # Web Vitals 采集与聚合
│   ├── knowledge/           # RAG 知识库（文档加载 / 分块 / 嵌入 / 搜索）
│   ├── memory/              # 对话记忆管理
│   ├── middleware/          # CORS 中间件
│   ├── models/              # 领域类型（按 domain 拆分多文件）
│   └── payment/             # 支付状态机 + 幂等性 + 重试
├── uploads/
│   └── sessions.json        # 上传会话持久化
├── go.mod / go.sum
├── .env.example
├── .gitignore
└── Makefile
```

## 快速启动

```bash
cd backend
go run ./cmd/server/
```

服务默认监听 `$PORT`（默认 8080），日志输出 `Backend running on :PORT`。前端开发服务器通过 Vite 代理 `/api` 请求到后端。

## 生产构建

```bash
go build -ldflags="-s -w" -o bin/server ./cmd/server/
```

## 测试

```bash
go test ./internal/... -v
```

## API 路由

### 公开（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户名密码登录（环境变量 `AUTH_USERNAME` / `AUTH_PASSWORD`），返回 Access + Refresh Token |
| POST | `/api/auth/refresh` | 轮换 Refresh Token，返回新双 Token |
| GET | `/api/auth/check` | 校验 Access Token 有效性 |
| GET | `/api/auth/used-tokens` | 已轮换 Refresh Token 计数（重放检测） |
| GET | `/api/sse/logs` | SSE 日志流（查询参数 `level` / `interval`） |
| GET | `/api/sse/encrypted-logs` | 加密日志流（通过查询参数传递 RSA 公钥） |
| GET | `/api/upload/download/:uploadId` | 下载已完成的文件 |
| GET | `/healthz` | 健康检查（存活/就绪探针） |
| GET | `/ws/alerts` | WebSocket 告警推送 |
| GET | `/api/alerts` | SSE / HTTP Polling 告警推送（同路由分发） |

### 受保护（需 JWT Authorization Header）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/gis/points` | GIS 点位数据（查询参数 `count`，默认 10 万，上限 50 万） |
| GET | `/api/schema/config` | 动态表单 Schema + 初始数据 |
| POST | `/api/schema/validate` | 后端 Schema 校验 + 业务规则校验 |
| POST | `/api/upload/init` | 初始化分片上传会话 |
| POST | `/api/upload/chunk` | 上传分片（含 SHA-256 哈希校验） |
| POST | `/api/upload/complete` | 合并分片 + 完整性校验 |
| GET | `/api/upload/status/:uploadId` | 查询已接收分片列表 |
| GET | `/api/upload/sessions` | 列出所有进行中的上传会话 |
| POST | `/api/rbac/check` | RBAC 权限后端校验 |
| GET | `/api/services` | LRU 缓存 — 服务列表 |
| GET | `/api/config` | LRU 缓存 — 配置数据 |
| GET | `/api/logs` | LRU 缓存 — 日志数据 |
| POST | `/api/vitals/report` | 上报 Web Vitals 指标 |
| GET | `/api/vitals/summary` | Web Vitals 汇总（最新值 + 聚合统计） |
| GET | `/api/vitals/history` | Web Vitals 时间序列 |
| POST | `/api/vitals/page-report` | 上报页面渲染数据 |
| GET | `/api/vitals/pages` | 页面访问汇总 |
| GET | `/api/vitals/page-history` | 页面渲染时间序列 |
| GET | `/api/request-loading/demo` | 模拟请求（查询参数 `delay` / `failRate`） |

## 认证机制

双 Token 无感刷新：

- **Access Token**：短期有效（15 分钟），携带用户身份
- **Refresh Token**：长期有效，支持轮换（Rotation），每次使用发放新双 Token
- **重放检测**：旧 Refresh Token 被二次使用视为重放攻击，立即失效
- **Session Nonce**：基于用户会话的唯一标识，可检测多设备同时登录

## 容器部署

```bash
# 从项目根目录构建后端镜像
docker build --target backend -t backend:latest .

# Docker Compose 一键启动（含前端+nginx）
docker compose up --build
```

## 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `GIN_MODE` | `debug` | Gin 运行模式（生产设为 `release`） |
| `PORT` | `8080` | 服务监听端口 |
| `JWT_SECRET` | `demo-jwt-secret-key` | JWT 签名密钥 |
| `AUTH_USERNAME` | `admin` | 登录用户名 |
| `AUTH_PASSWORD` | `admin123` | 登录密码 |
| `CORS_ORIGIN` | `*` | CORS / WebSocket 允许的来源（生产环境应设为具体域名） |
