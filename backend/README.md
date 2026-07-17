# Interview Demo — Backend

Go 1.26 + Gin 1.12 后端服务，为前端 15 个技术演示场景及 AI Demo 提供 API 支持。无外部数据库，所有数据存储在内存中。

## 技术栈

| 组件 | 用途 |
|------|------|
| Go 1.26 | 语言 / 运行时 |
| Gin 1.12 | HTTP Web 框架 |
| golang-jwt v5 | JWT 双 Token（登录、刷新轮换、重放检测） |
| Gorilla WebSocket v1.5 | WebSocket 告警推送 |
| go-openai | LLM 聊天对接 (OpenAI 兼容 API) |
| swaggo/gin-swagger | Swagger API 文档 |

## 项目结构

```
backend/
├── cmd/server/main.go       # 入口 :${PORT}，优雅关闭 + Swagger 路由
├── docs/                    # Swagger 自动生成的 API 文档
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── internal/
│   ├── agent/               # 智能体引擎（ReAct / Function Calling / Multi-Agent）
│   ├── alert/               # 多协议告警（WebSocket / SSE / HTTP Polling 统一分发）
│   ├── auth/                # JWT 双 Token 认证（登录/刷新/重放检测 + Session Nonce）
│   ├── chat/                # LLM 对话（流式 / 模型管理 / 对话历史 / OpenAI/DeepSeek/Ollama）
│   ├── encryptedlog/        # 加密日志流（RSA 密钥交换 + AES-256-GCM 加密）
│   ├── gis/                 # GIS 随机点位生成（上限 50 万点）
│   ├── health/              # 健康检查端点
│   ├── knowledge/           # RAG 知识库（文档加载 / 分块 / 嵌入 / 向量搜索）
│   ├── lrucache/            # LRU 缓存演示（服务列表 / 配置 / 日志）
│   ├── memory/              # 对话记忆管理
│   ├── middleware/          # CORS 中间件
│   ├── model/               # 领域类型（按 domain 拆分 7 个文件）
│   ├── payment/             # 支付状态机 + 幂等性 + 指数退避重试 + 安全校验
│   ├── rbac/                # RBAC 位运算权限校验
│   ├── requestload/         # 模拟请求延迟 / 失败
│   ├── schema/              # 动态 JSON Schema 表单定义 + 递归校验
│   ├── sse/                 # SSE 日志流
│   ├── upload/              # 大文件分片上传（SHA-256 校验 + 会话管理）
│   └── vitals/              # Web Vitals 采集与聚合（CLS/FCP/INP/LCP/TTFB）
├── uploads/
│   └── sessions.json        # 上传会话持久化
├── go.mod / go.sum
├── .env.example
├── .gitignore
└── README.md
```

## 快速启动

```bash
cd backend
go run ./cmd/server/
```

服务默认监听 `$PORT`（默认 8080）。前端开发服务器通过 Vite 代理 `/api` 请求到后端。

## Swagger API 文档

启动服务后访问 http://localhost:8080/swagger/index.html。

```bash
# 重新生成文档
swag init -g cmd/server/main.go -o docs
```

## 测试

```bash
go test ./internal/... -v
```

当前覆盖 19 个内部包，共 37 个非测试源文件 + 29 个测试文件。

## API 路由

### 公开（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/swagger/*any` | Swagger 交互式 API 文档 |
| POST | `/api/auth/login` | 用户名密码登录，返回 Access + Refresh Token |
| POST | `/api/auth/refresh` | 轮换 Refresh Token，返回新双 Token |
| GET | `/api/auth/check` | 校验 Access Token 有效性 |
| GET | `/api/auth/used-tokens` | 已轮换 Refresh Token 计数 |
| GET | `/api/health` | 健康检查 |
| GET | `/healthz` | 健康检查（存活/就绪探针） |
| GET | `/api/sse/logs` | SSE 日志流（`level` / `interval`） |
| GET | `/api/sse/encrypted-logs` | 加密日志流（RSA 公钥参数） |
| GET | `/api/upload/download/:uploadId` | 下载已完成的文件 |
| POST | `/api/chat` | 聊天对话 |
| POST | `/api/chat/stream` | 流式聊天 |
| GET | `/api/chat/history/:conversationId` | 获取聊天历史 |
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
| POST | `/api/vitals/report` | 上报 Web Vitals 指标 |
| GET | `/api/vitals/summary` | Vitals 汇总 |
| GET | `/api/vitals/history` | Vitals 时间序列 |
| POST | `/api/vitals/page-report` | 上报页面渲染数据 |
| GET | `/api/vitals/pages` | 页面访问汇总 |
| GET | `/api/vitals/page-history` | 页面渲染时间序列 |
| GET | `/ws/alerts` | WebSocket 告警推送（`transport` / `rate` / `workers`） |
| GET | `/api/alerts` | SSE / HTTP Polling 告警推送 |

### 受保护（需 JWT Authorization Header）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/gis/points` | GIS 点位数据（`count`，默认 10 万，上限 50 万） |
| GET | `/api/schema/config` | 动态表单 Schema + 初始数据 |
| POST | `/api/schema/validate` | 后端 Schema 校验 + 业务规则校验 |
| POST | `/api/upload/init` | 初始化分片上传会话 |
| POST | `/api/upload/chunk` | 上传分片（SHA-256 哈希校验） |
| POST | `/api/upload/complete` | 合并分片 + 完整性校验 |
| GET | `/api/upload/status/:uploadId` | 查询已接收分片 |
| GET | `/api/upload/sessions` | 上传会话列表 |
| POST | `/api/rbac/check` | RBAC 权限后端校验 |
| GET | `/api/services` | LRU 缓存 - 服务列表 |
| GET | `/api/config` | LRU 缓存 - 配置数据 |
| GET | `/api/logs` | LRU 缓存 - 日志数据 |
| GET | `/api/request-loading/demo` | 模拟请求（`delay` / `failRate`） |
| POST | `/api/payments/create` | 创建支付订单 |
| POST | `/api/payments/process/:id` | 处理支付扣款 |
| GET | `/api/payments/order/:id` | 查询订单详情 |
| GET | `/api/payments/orders` | 订单列表 |
| POST | `/api/payments/transition/:id` | 订单状态转换 |
| POST | `/api/payments/idempotency-test` | 幂等性测试 |
| POST | `/api/payments/security-check` | 安全校验演示 |
| POST | `/api/payments/retry-demo` | 重试机制演示 |

## 认证机制

双 Token 无感刷新：

- **Access Token**：短期有效（15 分钟），携带用户身份
- **Refresh Token**：长期有效，支持轮换（Rotation）
- **重放检测**：旧 Refresh Token 被二次使用视为重放攻击，立即失效
- **Session Nonce**：基于用户会话的唯一标识，可检测多设备同时登录（单用户单设备踢出）

## 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `PORT` | `8080` | 服务监听端口 |
| `GIN_MODE` | `debug` | Gin 运行模式（生产设为 `release`） |
| `JWT_SECRET` | `demo-jwt-secret-key` | JWT 签名密钥 |
| `AUTH_USERNAME` | `admin` | 登录用户名 |
| `AUTH_PASSWORD` | `admin123` | 登录密码 |
| `CORS_ORIGIN` | `*` | CORS / WebSocket 允许来源 |
| `OPENAI_API_KEY` | - | OpenAI API Key（LLM 功能） |

## 容器部署

```bash
# 从项目根目录构建后端镜像
docker build --target backend -t backend:latest .

# Docker Compose 一键启动
docker compose up --build
```
