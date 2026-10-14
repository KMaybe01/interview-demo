# ⑤ 第五关 · 协议与多 Agent

> **一句话目标**：让你的 Agent 能被别人用（MCP），也能和别人的 Agent 协作（A2A）。
>
> **产出物**：把你现有的业务能力暴露为标准 MCP 工具；用 A2A 让多个专有 Agent 分工完成一个任务。

← [上一关：企业级工程化](../04-第四关-企业级工程化/index.md) · [返回总纲](../index.md) · → [下一关：前端 AI 交互层](../06-第六关-前端AI交互层/index.md)

---

## 为什么协议很重要

没有协议时，每个 Agent 都有一套私有工具格式：你的工具只能在你的应用里用，换一个客户端就要重写一遍。

**MCP** 解决"Agent ↔ 工具/资源"的互通，**A2A** 解决"Agent ↔ Agent"的互通。它们各自的位置：

| | MCP | A2A |
|---|---|---|
| 解决什么 | Agent 怎么调用外部能力 | Agent 之间怎么协作 |
| 类比 | 设备驱动接口 / USB-C | 服务间通信协议 |
| 交互形态 | 请求-响应式工具调用 | 长生命周期**任务** + 状态机 |
| 谁发现谁 | 客户端发现服务端的工具清单 | 通过 Agent Card 发现对方能力 |

> 「USB-C」只是一个传播用的类比。真正要在面试里说清的是：**MCP 2026-07-28 之后它是无状态的、可发现、可扩展的**——否则会被追问到失分。

## MCP 2026-07-28 的三个关键变化

| 变化 | 内容 | 工程收益 |
|---|---|---|
| **无状态化** | 移除 `initialize` 握手与 `Mcp-Session-Id`，每个请求自包含 | 远程 MCP 可任意实例横向扩展，故障时无需会话亲和 |
| **`server/discover`** | 新增自描述发现方法 + `MCP-Protocol-Version` 头 | 网关可按 `Mcp-Method` / `Mcp-Name` 做路由与限流 |
| **扩展体系** | Apps（`ui://` 资源 + 受限 iframe + postMessage）与 Tasks（长任务句柄） | 对话内能渲染交互 UI；长任务支持跨断线恢复 |

> ⚠️ 写作时请核对 [版本基线真源](../index.md#版本基线唯一真源)，**不要把 MCP 描述成有状态协议**——这是常见扣分点。

## A2A v1.0 的关键要素

```
Agent Card（能力自述） → 任务发现 → message/send → 任务状态机（submitted → working → completed / failed / canceled）
```

要点：**任务是长生命周期对象**（不像一次 RPC 调用），因此必须支持查询、取消与状态推送。

## 章节与里程碑

| # | 章节 | 你会获得的能力 |
|:-:|------|----------------|
| 01 | [MCP 2026-07-28 详解](./01-MCP-2026-07-28详解.md) | 无状态单端点、`server/discover`、版本协商、MRTR、幂等 |
| 02 | [暴露业务系统为 MCP 工具](./02-暴露业务系统为MCP工具.md) | 把内部 API 包装成 MCP 工具，与 Agent 工具共用一套权限/审计 |
| 03 | [A2A 多 Agent 协作](./03-A2A多Agent协作.md) | Agent Card、任务状态机、多 Agent 分工与超时/取消 |
| 附 | [前沿技术与生态](./附-前沿技术与生态.md) | 协议全景与演进脉络（原文保留） |
| 附 | [MCP+A2A 全栈实战](./附-MCP+A2A全栈实战.md) | 完整多 Agent 系统实现手册（原文保留） |

## 与本仓库代码的映射

| 协议能力 | 真实实现 | 可运行入口 |
|---|---|---|
| MCP 2026-07-28 无状态单端点、`tools/call`、MRTR、幂等、双版本兼容 | `backend/internal/mcp/` | `POST /api/ai/mcp`、`GET /api/ai/mcp/tools` |
| A2A v1.0：Agent Card、`message/send`、任务状态机、取消、`.well-known` | `backend/internal/a2a/` | `/api/ai/a2a/*` |
| 工具「一处实现、两处复用」 | `backend/internal/airouter/toolMCPAdapter` | Agent 工具与 MCP 工具共用 registry |
| 协议控制台（实机调用） | `apps/ai-demo/src/components/ProtocolConsole.tsx` | AI Demo → Protocol 选项卡 |
| 教学版协议控制台 | `apps/ai-course/src/stages/05-proto/` | `POST /api/mcp`、`/api/a2a/*` |

> `toolMCPAdapter` 是本仓库一个漂亮的设计：工具只要注册一次，就同时是「Agent 的内部工具」和「对外暴露的 MCP 工具」，权限、沙箱、审计自动继承。

## E:\code\ai 延伸精读（协议与多 Agent）

- `E:\code\ai\hello-agents`：MCP · A2A · ANP 三协议手搓章节 + 多 Agent 案例（旅行助手 / 赛博小镇），与 01 / 03 章互为补充
- 编码 Agent 视角下的多 Agent：`E:\code\ai\claude-code-book`（Fork 子 Agent）对照 [⑩ 编码 Agent 专题 · 子 Agent](../10-编码Agent专题/04-子Agent与多Agent编排.md)

> 注意区分：A2A 是**跨进程 / 跨组织**的 Agent 通信（本章）；子 Agent 是**同进程内**的逻辑隔离（专题 ⑩）。

## 自检清单

- [ ] 能说清 MCP 无状态化前后的差别，以及为什么它让横向扩展变简单
- [ ] 能徒手写出 `tools/call` 的请求/响应结构
- [ ] 能把一个内部 HTTP API 包装成 MCP 工具，并保证它幂等
- [ ] 能说清 A2A 的"任务"为什么不能用一次 RPC 替代
- [ ] 能处理多 Agent 协作中某个子 Agent 超时/失败的场景
- [ ] 能在 UI 上同时展示：工具调用轨迹 + 跨 Agent 的任务状态

## 面试高频

> - MCP 解决什么问题？和 Function Calling 是什么关系？
> - MCP 2026-07-28 相比之前有什么关键变化？为什么要去掉会话？
> - A2A 和 MCP 的区别？什么时候用哪个？
> - 多个 Agent 协作时，怎么避免"谁都不负责"和"互相甩锅"？（→ 第三关 HITL + 第四关 trace）
>
> 完整题库见 [09-面试篇 · 工具与协议](../09-面试篇/04-工具与协议篇.md) 与 [前沿趋势](../09-面试篇/06-前沿趋势篇.md)。
