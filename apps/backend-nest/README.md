# Interview Demo — NestJS 后端

NestJS 11 后端服务，完整覆盖 Go 后端 19 个内部模块的功能。为前端 15+ 个技术演示场景提供 API 支持。

## 技术栈

| 组件 | 用途 |
|------|------|
| NestJS 11 | 模块化后端框架 |
| TypeScript 5.7 | 类型系统（strict 模式） |
| @nestjs/swagger | Swagger API 文档生成 |
| @nestjs/jwt | JWT 认证 |
| express | HTTP 服务器 |
| jsonwebtoken | JWT 实现 |
| uuid | 唯一 ID 生成 |
| Vitest 4 | 测试框架 |
| Biome 2.5 | Lint + Format |

## 项目结构

```
src/
├── main.ts                   # 应用入口
├── app.module.ts             # 根模块（16 个功能模块）
├── agent/                    # 智能体引擎（ReAct / Function Calling / Multi-Agent）
├── alert/                    # 多协议告警（WebSocket / SSE / HTTP Polling 统一分发）
├── auth/                     # JWT 双 Token 认证（登录/刷新/重放检测）
├── chat/                     # LLM 对话（流式 / 模型管理 / 对话历史）
├── common/                   # 公共工具（拦截器、过滤器、装饰器等）
├── encrypted-log/            # 加密日志流（RSA 密钥交换 + AES-256-GCM 加密）
├── gis/                      # GIS 随机点位生成（上限 50 万点）
├── health/                   # 健康检查端点
├── knowledge/                # RAG 知识库（文档加载 / 分块 / 嵌入 / 向量搜索）
├── lru-cache/                # LRU 缓存演示（服务列表 / 配置 / 日志）
├── memory/                   # 对话记忆管理
├── payment/                  # 支付状态机 + 幂等性 + 指数退避重试 + 安全校验
├── rbac/                     # RBAC 位运算权限校验
├── request-load/             # 模拟请求延迟 / 失败
├── schema/                   # 动态 JSON Schema 表单定义 + 递归校验
├── sse/                      # SSE 日志流
├── upload/                   # 大文件分片上传（SHA-256 校验 + 会话管理）
└── vitals/                   # Web Vitals 采集与聚合（CLS/FCP/INP/LCP/TTFB）
```

## 快速启动

```bash
# 从项目根目录
bun run --cwd apps/backend-nest dev    # NestJS 开发服务器 (port 8080)
bun run --cwd apps/backend-nest build  # 生产构建
bun run --cwd apps/backend-nest start:prod  # 生产运行
bun run --cwd apps/backend-nest test   # 运行测试
bun run --cwd apps/backend-nest lint   # Biome 代码检查
bun run --cwd apps/backend-nest typecheck  # 类型检查
```

服务默认监听 `8080` 端口。Swagger 文档访问 `http://localhost:8080/swagger`。

## 测试

```bash
bun run --cwd apps/backend-nest test
bun run --cwd apps/backend-nest test:watch  # 监听模式
```

## 代码质量

- **Biome 2.5** lint + format
- **TypeScript** strict 模式 + `tsc -b` 联合编译
- **Vitest 4** 单元测试
