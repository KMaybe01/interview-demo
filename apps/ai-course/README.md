# apps/ai-course · AI 教程配套代码

> 这是 [docs/S5-AI](../../docs/S5-AI/index.md) 教程的**主线条码**：AI SDK 7 + TypeScript 全栈。
> 每个关卡（stage）对应教程的一关，目标是**能跑、能改、能对得上文档**。

---

## 30 秒跑起来

```bash
bun install
bun run --cwd apps/ai-course dev     # http://localhost:5199
```

打开页面后：左下不用配任何东西，直接问一句 —— 你现在跑的是**离线演示模式**。

| 模式 | 触发条件 | 表现 |
|---|---|---|
| **离线演示** | 没有 `OPENAI_API_KEY` | 本地假模型应答，完整链路照跑，用量/成本为 0 |
| **真实模型** | 配了 `OPENAI_API_KEY` | 走真实 Provider，消息下方显示真实 token 数与估算成本 |

切到真实模型：

```bash
cp apps/ai-course/.env.example apps/ai-course/.env
# 编辑 .env 填入 OPENAI_API_KEY，然后重启 dev
```

> ⚠️ 型号请以厂商当期文档或你所用 Gateway 的 `/v1/models` 实列为准，别照抄默认值。

## 目录结构

```
apps/ai-course/
├── shared/           前后端共用
│   └── cost.ts       token 用量 → 美元成本的换算（有单测）
├── server/           BFF（薄的一层，企业级能力会在第四关加进来）
│   ├── index.ts      独立进程入口（`bun run server`）
│   ├── handler.ts    GET /api/models、POST /api/chat
│   ├── models.ts     模型注册表：按任务分档 + 无 Key 自动降级
│   └── mockModel.ts  离线演示模型（实现 LanguageModelV2）
└── src/
    ├── App.tsx       关卡导航外壳（显示当前运行模式）
    ├── stages/       六个关卡，每关一个目录
    │   ├── 01-chat/ChatStage.tsx   ← 已交付：第一关
    │   └── index.tsx               关卡注册表 + 占位卡片
    └── ui/styles.ts  内联样式 token（本仓库不用 CSS Module）
```

## 已交付的关卡

| 关卡 | 目录 | 演示什么 |
|---|---|---|
| ① 流式对话 | `src/stages/01-chat/` | TTFT、parts 渲染、中断、错误重试、token/成本 |
| ② 知识增强 RAG | `src/stages/02-rag/` | 灌库分块 → 检索调试 → 带溯源的问答 |
| ③ Agent 与工具 | `src/stages/03-agent/` | 工具分级 L0/L2、审批工单（HITL）、步数/重复检测、审计流 |
| ④ 企业级工程化 | `src/stages/04-prod/` | 护栏拦截、熔断状态机（5 次失败/30s）、Trace 瀑布图 |
| ⑤ 协议与多 Agent | `src/stages/05-proto/` | MCP 无状态单端点（幂等/MRTR/版本协商）+ A2A 任务状态机 |
| ⑥ 前端 AI 交互层 | `src/stages/06-ui/` | 生成式 UI 沙箱（白名单组件 + 递归校验） |

后端接口：`/api/models`、`/api/chat`（`stage=rag` 走检索增强）、`/api/rag/{documents,search}`、
`/api/guard/inspect`、`/api/obs/traces`、`/api/resilience`、`/api/mcp`、`/api/a2a/*`、
`/api/agent/{tools,run,approvals,audit}`。

**为什么 BFF 挂在 Vite 里**：`server/handler.ts` 导出的是一个 connect 风格中间件，
`vite.config.ts` 把它挂到 dev server，所以 `bun run dev` 一条命令就够了；
想前后端分开部署时，同一个 handler 也能直接跑在 `node:http` 上（`bun run server`）。

## 第一关要看的四个工程点

| 位置 | 看点 |
|---|---|
| `ChatStage.tsx` `transport` | v7 起必须显式传 `DefaultChatTransport`（旧的 `api` 配置项已移除） |
| `ChatStage.tsx` `message.parts` | 只渲染 `content` 会丢掉工具调用/推理/来源，必须遍历 parts |
| `ChatStage.tsx` `status` | `submitted` / `streaming` / `error` 三态决定按钮能不能点、要不要显示「等待首字」 |
| `handler.ts` `messageMetadata` | 把 usage 与估算成本随消息一起下发，做「成本可见」 |
| `handler.ts` `controller.abort()` | 用户关页面/点停止时中止生成，别让服务端继续烧钱 |

## 常见问题

**Q：控制台里有 `specificationVersion is used in a compatibility mode` 告警？**
离线 mock 模型实现的是 `LanguageModelV2`，AI SDK 7 会以兼容模式消费它。
换成真实 Provider 后告警自动消失；也可以设 `globalThis.AI_SDK_LOG_WARNINGS = false`。

**Q：成本数字能拿来对账吗？**
不能。`shared/cost.ts` 里的价格是**教学用示例值**（美元/百万 token 档位），
生产请替换成厂商当期公示价或 Gateway 返回的价格。

**Q：端口冲突 / 想换端口？**
改 `vite.config.ts` 的 `server.port`（默认 5199）。

## 和仓库其它部分的关系

| 用途 | 位置 |
|---|---|
| 教程文档 | `docs/S5-AI/index.md`（第一关 / 第二关 / 第四关已交付正文） |
| 企业级能力的**服务端参考实现** | `apps/backend/internal/{llm,tool,guard,airouter,obs,mcp,a2a}/` |
| 成品级 AI Demo（Ant Design X + Go 后端） | `apps/ai-demo/` |

写自己的关卡时请参考 [99-写作约定.md](../../docs/S5-AI/99-写作约定.md)。
