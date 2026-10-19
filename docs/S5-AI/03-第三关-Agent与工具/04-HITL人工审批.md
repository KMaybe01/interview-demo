# 04 · HITL 人工审批

> **一句话**：不可逆操作不能靠"模型觉得没问题"——必须有一个人真正点下"同意"，而且这个动作要可追溯。
>
> **前置**：[02-工具设计契约](./02-工具设计契约.md)、[03-停止条件与死循环防护](./03-停止条件与死循环防护.md)
> **产出**：一套审批工单机制（创建 → 展示 → 批准/拒绝 → 续跑），并处理过期与重放
> **代码**：`apps/ai-course/server/approvals.ts`；后端参考 `apps/backend/internal/tool/sandbox.go`

---

## 1. 原理（够用即可）

HITL（Human-in-the-Loop）的本质是：**把不可逆的决策权交回给人**。

为什么不能只在 Prompt 里写"重要操作请先问我"：

| 失败模式 | 说明 |
|---|---|
| 模型不认为它"重要" | 判断权在模型手里 |
| 用户回了一句模棱两可的话 | 模型自行解读成"同意" |
| 没人复核 | 事后无法追溯是谁同意的 |

所以审批必须是**系统级的工单**，不是对话里的客套。

---

## 2. 企业实现要点

### 本仓库的实现（`apps/backend/internal/tool/sandbox.go:128-225`）

| 项 | 实现 |
|---|---|
| 工单 ID | `apr_<纳秒>` |
| 字段 | `ToolCallID / Arguments / Level / Reason / ExpiresAt` |
| TTL | 默认 **10 分钟**，过期自动清理（`Get/Pending` 时清理） |
| 状态 | 实为「pending → resolved」；工单**没有 Status 字段** |
| Resolve | `Resolve(id, approve)` 成功后**直接删除工单** |
| 结果传递 | 审批结果**只体现在 HTTP 响应里**，前端需自行把 `toolCallId` 加入 `approvedToolCalls` 重发 |

最后一条是本仓库一个值得注意的设计取舍：**工单是"一次性票据"而不是状态机**。
好处是实现简单、无状态残留；代价是前端必须自己记住"已批准哪些调用"。

### 审批链路的完整时序

```
① Agent 判定要调 L2 工具
② 创建工单（apr_xxx，TTL 10min）→ 循环中断，finishReason = "awaiting_approval"
③ SSE 推 approval_required 事件 → 前端渲染审批卡片（工具名、参数、理由、剩余时间）
④ 人点"同意" → POST /approvals/:id/resolve
⑤ 前端把该 toolCallId 计入 approvedToolCalls，**重发原请求**
⑥ 服务端校验 approvedToolCalls 命中 → 执行工具 → 继续循环
```

### 四个必须处理的边界

| 边界 | 处理 |
|---|---|
| **工单过期** | 10 分钟后失效，重新发起请求会生成新工单 |
| **重复提交** | 工具侧幂等键，避免点两次执行两次 |
| **审批与其他会话** | 审批是独立的工单对象，**不阻塞**其他会话 |
| **拒绝之后** | 循环终止或让模型改走别的路径，不能"假装没发生"继续跑 |

### 前端要展示什么

审批卡片必须让人能做出判断：

- 工具名 + **人类可读的参数**（不要只甩一个 JSON）
- 为什么需要审批（Level / Reason）
- **剩余有效期**
- 明确的「同意 / 拒绝」双按钮（不要只有"确定"）

---

## 3. 代码实现

```ts
// apps/ai-course/server/approvals.ts
export interface Approval {
  id: string;                  // apr_<timestamp>
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  level: 'L2';
  reason: string;
  expiresAt: number;           // 10 分钟
}

export function createApproval(call): Approval;
export function listApprovals(): Approval[];      // 只返回未过期的
export function resolveApproval(id: string, approve: boolean): { ok: true } | { error: string };
```

`resolveApproval` 成功后删除工单（对齐 Go 侧行为）。前端拿到结果后把 `toolCallId` 放进 `approvedToolCalls` 重发请求——**这一步是 HITL 最容易漏的地方**。

---

## 4. 验证与观测

| 场景 | 期望 |
|---|---|
| 触发 L2 工具 | 返回 `awaiting_approval` + 工单，**工具未执行** |
| 审批同意后重发 | 工具执行**且只执行一次** |
| 审批拒绝后重发 | 不再执行，Agent 给出替代方案或终止 |
| 工单过期 | `listApprovals` 里消失，重发会生成新工单 |
| 并发会话 | 一个会话等审批时，其他会话不受影响 |

审计里应能看到 `blocked_permission`（未审批被拦）与 `success`（审批后执行）两条记录——**成对出现才说明链路正确**。

---

## 5. 面试追问

> **Q：为什么不能在 Prompt 里写"重要操作先问我"？**
> 判断权在模型手里，且没有系统级留痕。真正的审批必须是工单对象 + 系统中断 + 可追溯记录。

> **Q：审批期间服务端在做什么？**
> 什么都不做——**循环已中断**（本仓库 `finishReason = "awaiting_approval"`）。挂起等待会让服务端持有状态，难扩容、难恢复。

> **Q：用户批准后怎么防止重复执行？**
> 两层：客户端在 `approvedToolCalls` 里精确指定本次放行的调用；工具侧有幂等键。缺一层都可能出现"点两次执行两次"。

> **Q：工单为什么要 TTL？**
> 审批是"当下决策"，隔夜的批准没有意义；TTL 也避免工单无限堆积（内存无界是常见的线上事故）。

> **Q：审批工单应该持久化吗？**
> 生产要。本仓库是内存实现（一次性票据），够演示但重启即丢；生产需要落库并关联用户、trace 与审计，用于合规追溯。

---

## 6. 延伸阅读

- [02-工具设计契约](./02-工具设计契约.md)
- [03-停止条件与死循环防护](./03-停止条件与死循环防护.md)
- [第四关 · 可观测性 Trace 与审计](../04-第四关-企业级工程化/04-可观测性Trace与审计.md)
- 后端源码：`apps/backend/internal/tool/sandbox.go`、`apps/backend/internal/airouter/stream.go`（approval_required 事件）
