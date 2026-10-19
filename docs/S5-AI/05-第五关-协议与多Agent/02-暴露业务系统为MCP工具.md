# 02 · 把业务系统暴露成 MCP 工具

> **一句话**：最有价值的 MCP 工具不是"查天气"，而是你公司里那些**已经有权限体系的内部接口**——暴露它们的难点从来不是协议，是权限与副作用。
>
> **前置**：[01-MCP-2026-07-28详解](./01-MCP-2026-07-28详解.md)
> **产出**：一套"内部 API → MCP 工具"的包装规范，与 Agent 内部工具共用同一套权限/沙箱/审计
> **代码**：后端参考 `apps/backend/internal/airouter/router.go`（`toolMCPAdapter`）、`apps/backend/internal/tool/`

---

## 1. 原理（够用即可）

把内部接口包装成 MCP 工具，需要给出四样东西：

```jsonc
{
  "name": "agent::create_ticket",
  "description": "创建工单（会真实写入，需审批）",
  "inputSchema": { /* JSON Schema */ },
  "annotations": { "sideEffect": "irreversible" }   // 副作用等级
}
```

`description` 不是注释，它是**模型决定要不要调用的唯一依据**——写得含糊，模型就会乱调。

---

## 2. 企业实现要点

### 关键设计：一处实现，两处复用

本仓库的 `toolMCPAdapter`（`apps/backend/internal/airouter/router.go:69-110`）是一个很漂亮的做法：

```
apps/backend/internal/tool.Registry  ──adapter──▶  mcp.ToolProvider
        │                                    │
    Agent 内部工具                      对外 MCP 工具
```

- 把 `tool.Registry` 的 `Name/Description/Parameters` 转成 `mcp.Tool`
- 执行时统一走 `registry.Execute(..., Tier: LevelWrite, User: "mcp")`
- 注册为 namespace `agent`，**对外名 `agent::xxx`**（`server.go:84-86`）
- 结果：**权限分级、沙箱、HITL、审计全部自动继承**，不需要为 MCP 重写一套安全逻辑

> 这条设计原则值得直接抄：**不要让 MCP 成为绕过既有安全体系的后门**。

### 工具设计的三条铁律（第三关已建立，这里必须重申）

| 铁律 | MCP 场景下的具体要求 |
|---|---|
| **幂等** | 写操作必须有幂等键；`params._meta.idempotencyKey` 与业务幂等键要一致 |
| **有界** | 声明超时；超时返回结构化超时结果；长任务转 `taskId` |
| **分级** | 只读 / 可撤销写 / 不可逆写；**不可逆的必须走审批** |

MCP 的 `User: "mcp"` 是一个重要约定：**调用方身份不能丢**，否则审计里全是匿名操作。

### 命名与粒度

| 建议 | 反例 |
|---|---|
| 按业务动作命名：`create_ticket`、`search_orders` | 按实现命名：`call_internal_api` |
| 一个工具做一件事 | 万能工具（模型选不准） |
| 用 namespace 隔离来源：`agent::`、`crm::` | 全平铺，容易撞名 |

工具数量不是越多越好：**模型能选对的工具集合，通常不超过 20 个**。

---

## 3. 代码实现

教学版 `apps/ai-course/server/mcp.ts` 里的工具注册表刻意做成"可插拔"：

```ts
export interface McpTool {
  name: string;                 // 对外名，如 knowledge.search
  description: string;          // 模型靠它决定要不要调用
  inputSchema: Record<string, unknown>;
  sideEffect: 'read' | 'reversible' | 'irreversible';
  execute(args: Record<string, unknown>): Promise<unknown>;
}
```

新增一个工具就是往注册表里加一项，`tools/list` 与 `tools/call` 自动生效——这就是"协议标准化"带来的收益。

对照后端的 adapter 模式，重点看它如何把既有 registry 适配成 `mcp.ToolProvider`，而不是另起炉灶。

---

## 4. 验证与观测

| 检查项 | 方法 |
|---|---|
| 工具能被发现 | `tools/list` 返回的 schema 是否完整、描述是否可懂 |
| 模型能选对 | 用 10 个问题测试，看是否调用了预期工具 |
| 幂等生效 | 同一个 `idempotencyKey` 调两次写工具，只产生一次副作用 |
| 权限继承 | 让 MCP 调一个不可逆工具，确认**同样触发审批**（而不是绕过） |
| 审计可追溯 | 审计记录里 `User` 是否为 `mcp`，是否带 `TraceID` |

---

## 5. 面试追问

> **Q：为什么不让 MCP 直接暴露数据库查询能力？**
> 权限与副作用失控。MCP 是给模型用的，模型会按描述自主调用；暴露裸 SQL 等于把数据层开放给一个会犯错的调用方。

> **Q：内部工具已经有权限体系，MCP 化会不会绕过它？**
> 取决于实现方式。正确做法是让 MCP 工具**走同一套执行入口**（本仓库 `registry.Execute` 统一入口 + `User: "mcp"`），权限、沙箱、审批、审计自动继承。

> **Q：工具描述写得不好会怎样？**
> 模型选错工具或用错参数。描述要写清"什么时候用、什么时候不该用、会有什么副作用"。

> **Q：工具太多怎么办？**
> 分层暴露：先给一组核心工具，按任务动态加载其余（工具太多会稀释模型注意力，且增加 token 成本）。

> **Q：MCP 工具和 Agent 内部工具要维护两套吗？**
> 不应该。用 adapter 让两者共用一份实现（本仓库 `toolMCPAdapter`），否则安全策略必然漂移。

---

## 6. 延伸阅读

- [01-MCP-2026-07-28详解](./01-MCP-2026-07-28详解.md)
- [03-A2A 多 Agent 协作](./03-A2A多Agent协作.md)
- [第三关 · Agent 与工具](../03-第三关-Agent与工具/index.md) —— 工具三条铁律
- 后端源码：`apps/backend/internal/airouter/router.go`、`apps/backend/internal/tool/`
