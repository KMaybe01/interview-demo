# 03 · A2A 多 Agent 协作

> **一句话**：A2A 与 MCP 的分界线是——MCP 调用**能力**，A2A 协作**智能体**；所以 A2A 的核心抽象是"任务"而不是"请求"。
>
> **前置**：[01-MCP-2026-07-28详解](./01-MCP-2026-07-28详解.md)
> **产出**：能跑通「发消息 → 拿任务 → 查状态 → 取消」的完整任务生命周期
> **代码**：`apps/ai-course/server/a2a.ts`（教学版）；后端参考 `apps/backend/internal/a2a/`

---

## 1. 原理（够用即可）

| | MCP | A2A |
|---|---|---|
| 解决 | Agent 怎么用外部能力 | Agent 之间怎么协作 |
| 抽象 | **请求-响应**（一次调用） | **任务**（长生命周期对象） |
| 发现 | `server/discover` + `tools/list` | **Agent Card** |
| 中间态 | 无（或 MRTR 的 input_required） | `working` / `input-required` |

为什么必须是"任务"：一次 Agent 协作可能跑几分钟、需要多轮澄清、可能被取消——**一次 RPC 承载不了这些语义**。

---

## 2. 企业实现要点

### Agent Card：能力自述

本仓库 `a2a/types.go:183-195` 的字段：

```
id / name / description / url / version
provider { organization, url }
capabilities { streaming, pushNotifications, stateTransitionHistory }
authentication { schemes, credentials }
skills[]
defaultInputModes / defaultOutputModes
```

注册时默认补 `schemes: ["none"]`、modes `["text"]`（`registry.go:30-37`）。
**`skills` 是调度的依据**——编排方靠它决定把子任务派给谁。

### 任务状态机

```
submitted → working → input-required → completed
                                    ↘ failed
                                    ↘ canceled
```

| 规则 | 说明 |
|---|---|
| 初始 | 新建任务为 `submitted`，`message/send` 后立即置 `working` |
| 终态 | `completed` / `failed` / `canceled` **不可再迁移、不可回退** |
| 需要澄清 | Runner 返回 `ErrInputRequired` → `input-required`，提示语写入 `metadata.inputRequired` |
| 取消 | 终态取消返回 `-32001`（HTTP 409）；否则直接置 `canceled` |

### 接口一览（本仓库 `a2a/server.go:51-61`）

| 方法 | 路径 |
|---|---|
| 列出 Agent | `GET /api/ai/a2a/agents` |
| Agent Card | `GET /api/ai/a2a/agents/:agentId/card`、`GET /agents/:agentId/.well-known/agent.json` |
| 全局卡 | `GET /.well-known/agent.json` |
| 发消息 | `POST /api/ai/a2a/agents/:agentId/tasks` |
| 流式 | `POST /agents/:agentId/tasks/stream`、`POST /tasks/stream`（SSE） |
| 查任务 | `GET /api/ai/a2a/tasks`、`GET /tasks/:taskId` |
| 取消 | `POST /tasks/:taskId/cancel` |
| JSON-RPC 单入口 | `HandleRPC`：`message/send`、`tasks/get`、`cancel`、`list`、`agent/getCard`、`agents/list` |

### 多 Agent 协作的三个工程难点

| 难点 | 处理 |
|---|---|
| **超时与失联** | 子 Agent 要有超时；父 Agent 不能无限等待，要有降级路径 |
| **责任划分** | 每个子任务归属明确 Agent，trace 里能看出是谁产出的（TraceID 贯穿） |
| **结果聚合** | 由编排方（Planner）汇总，避免"多个 Agent 各说各话" |

---

## 3. 代码实现（教学版）

`apps/ai-course/server/a2a.ts` 保留了状态机与生命周期的最小实现：

```ts
export type TaskStatus = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';

export function listAgents(): AgentCard[];
export function getCard(agentId: string): AgentCard | undefined;
export function sendMessage(params: { agentId: string; text: string; taskId?: string }): Task;
export function getTask(taskId: string): Task | undefined;
export function cancelTask(taskId: string): Task;   // 终态返回错误码
```

前端 `ProtoStage` 把三个动作都做成了按钮：发消息 → 轮询状态 → 取消，能直观看到 `submitted → working → completed` 的流转。

---

## 4. 验证与观测

```bash
# 1) 有哪些 Agent
curl -s http://localhost:5199/api/a2a/agents

# 2) 看能力自述
curl -s http://localhost:5199/api/a2a/agents/researcher/card

# 3) 发消息拿任务
curl -s -X POST http://localhost:5199/api/a2a/agents/researcher/tasks \
  -H 'content-type: application/json' -d '{"text":"调研一下 MCP 与 A2A 的分工"}'

# 4) 查状态 / 取消
curl -s http://localhost:5199/api/a2a/tasks/<taskId>
curl -s -X POST http://localhost:5199/api/a2a/tasks/<taskId>/cancel
```

验收标准：

- [ ] 能看到状态从 `submitted` → `working` → `completed`
- [ ] 取消终态任务会被拒绝（而不是静默成功）
- [ ] Task 里带 `history` 与 `artifacts`，可追溯产出

---

## 5. 面试追问

> **Q：A2A 和 MCP 到底怎么选？**
> 调能力（查数据库、发消息、建工单）→ MCP；派活给另一个有推理能力的智能体（调研、写代码、审合同）→ A2A。

> **Q：为什么 A2A 要引入"任务"而不是一次 RPC？**
> Agent 执行可能持续分钟级、需要中间态、需要澄清、可能被取消。这些语义需要可查询、可取消的长生命周期对象。

> **Q：`input-required` 状态怎么用？**
> 子 Agent 缺关键信息时进入该状态，把提示写进 `metadata.inputRequired`；调用方补齐后用同一个 `taskId` 续跑（终态任务续跑会被拒绝）。

> **Q：子 Agent 超时了父 Agent 怎么办？**
> 要有显式策略：重试 / 换 Agent / 降级为部分结果。绝不能无限等待——超时是分布式协作的常态。

> **Q：多 Agent 的 trace 怎么做？**
> TraceID 贯穿父子任务，每个子任务一个 span（`kind: agent`），这样才能回答"最终答案里这一段是谁产出的"。

---

## 6. 延伸阅读

- [01-MCP-2026-07-28详解](./01-MCP-2026-07-28详解.md)
- [附-MCP+A2A全栈实战](./附-MCP+A2A全栈实战.md)
- [第四关 · 可观测性 Trace](../04-第四关-企业级工程化/04-可观测性Trace与审计.md)
- 前端成品参考：`apps/ai-demo/src/components/ProtocolConsole.tsx`
- 后端源码：`apps/backend/internal/a2a/{server.go,types.go,registry.go,store.go}`
