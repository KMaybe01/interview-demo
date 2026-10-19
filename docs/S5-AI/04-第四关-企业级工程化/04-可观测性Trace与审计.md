# 04 · 可观测性 Trace 与审计

> **一句话**：一次 AI 请求里发生了十几次调用（护栏、检索、模型、工具），没有 trace 你就是在猜。
>
> **前置**：[01-多Provider网关与熔断降级](./01-多Provider网关与熔断降级.md)
> **产出**：一个能画出请求瀑布图的 trace 系统 + 一条工具调用审计流
> **代码**：`apps/ai-course/server/obs.ts`；后端参考 `apps/backend/internal/obs/`、`apps/backend/internal/tool/audit.go`

---

## 1. 原理（够用即可）

传统 APM 看的是"接口慢不慢"，AI 应用要回答的是：

- 这次请求**调了几次模型**？每次多少 token、多少钱？
- 检索召回了什么？分数多少？
- 工具调用了几次？哪次被拦下了？
- 慢在哪一环？是 TTFT 还是生成？

所以 AI 的可观测要多一层 **span 语义**：`llm` / `retrieval` / `tool` / `guard` / `agent`。

---

## 2. 企业实现要点

### 后端参考实现：`apps/backend/internal/obs/`

| 能力 | 实现 |
|---|---|
| Span 模型 | `TraceID / SpanID / ParentID / Name / Kind / Start / End / Duration / Status(ok\|error) / Error / Attrs / Events`；`Kind` 取值 `llm \| tool \| retrieval \| agent \| guard \| http` |
| Trace | span 组成的树，Recorder 默认 runCap **2000**、traceTTL **30 分钟** |
| Run | 成本与统计的最小粒度：含 `TTFTMs / Steps / ToolCalls / Retrievals / Degraded / CacheHit` |
| 接口 | `GET /api/ai/obs/{metrics,runs,traces,traces/:traceId}` |

### 工具审计：`apps/backend/internal/tool/audit.go`

```go
AuditEvent{ ID, Time, Tool, User, TraceID, Outcome, Detail, Args, DurationMs }
```

`Outcome` 的取值很关键，它直接对应"哪一层防线拦下了这次调用"：

| Outcome | 含义 |
|---|---|
| `success` | 正常执行 |
| `failure` | 执行报错 |
| `blocked_permission` | 权限分级拦下（第三关的 L2 不可逆操作） |
| `blocked_injection` | 护栏/沙箱判定为注入 |
| `blocked_rate_limit` | 限流 |

存储是**环形缓冲，上限 500 条**；`Args` 截断 200 字符、`Detail` 截断 500 字符。
两个细节值得学：**审计要限长**（不然一条大 payload 撑爆内存），**审计 ID 要回传到调用方**（`result.AuditID`，见 `airouter/stream.go`），这样前端能把"这条回答"和"这次工具调用"对起来。

### 前端要展示什么

| 视图 | 用途 |
|---|---|
| **瀑布图** | 一眼看出慢在哪一环 |
| **Token / 成本面板** | 每次调用的输入输出 token 与折算费用 |
| **工具审计流** | 谁调了什么、被拦了几次、为什么 |
| **降级标记** | 这次回答是不是 `degraded`（诚实披露） |

本仓库 `apps/ai-demo/src/components/Observability.tsx` 就是这套视图的成品参考。

---

## 3. 代码实现

教程侧的 trace 器保持极简，只保留"能画出瀑布图"的最小字段集：

```ts
// apps/ai-course/server/obs.ts
export interface Span {
  traceId: string; spanId: string; parentId?: string;
  name: string; kind: 'llm' | 'tool' | 'retrieval' | 'guard' | 'http';
  startMs: number; endMs?: number; status: 'ok' | 'error';
  attrs?: Record<string, unknown>;
}

export function startSpan(name: string, kind: Span['kind'], parentId?: string): Span;
export function endSpan(span: Span, status?: 'ok' | 'error', attrs?: Record<string, unknown>): void;
export function listTraces(): Trace[];      // GET /api/obs/traces
```

埋点方式（本教程的 chat handler 已经这么做）：

```ts
const root = startSpan('chat', 'http');
const guardSpan = startSpan('guard.inspectInput', 'guard', root.spanId);
// …检测…
endSpan(guardSpan, 'ok', { blocked: report.blocked, pii: report.pii.length });
```

最后把 `traceId` 通过 `messageMetadata` 回给前端，前端就能"点这条消息 → 看它的完整链路"。

---

## 4. 验证与观测

| 验证点 | 方法 | 期望 |
|---|---|---|
| 链路完整 | 发一次请求看 trace | guard → retrieval → llm 三个 span 都在 |
| 耗时可信 | 看 span 的 duration | 能定位 TTFT 与生成耗时 |
| 拦截可查 | 触发一次注入 | 出现 `guard` span 且 `blocked: true` |
| 审计留痕 | 调用一个受限工具 | 审计里出现 `blocked_permission` |
| 成本归属 | 看 llm span 的 attrs | 有 token 与折算费用 |

```bash
curl -s http://localhost:5199/api/obs/traces | head
```

---

## 5. 面试追问

> **Q：AI 应用的可观测和普通后端有什么不同？**
> 多一层"模型内部"的黑盒：要记录 token、档位、降级标记、工具调用与检索命中，而不只是 HTTP 状态码和耗时。所以 span 要带 `kind` 语义。

> **Q：Trace 里应该记什么、不该记什么？**
> 记：结构、耗时、token、成本、档位、是否降级、工具名与结果摘要。**不要记**完整 Prompt 与用户原文（隐私）；真要排障，用截断 + 脱敏 + 访问控制。

> **Q：为什么审计要单独一条流，而不是混在 trace 里？**
> 关注点不同：trace 回答"为什么慢/为什么错"，审计回答"谁做了什么、有没有被拦"。审计要长期留存、要能导出合规， trace 是短期的（本仓库 TTL 30 分钟）。

> **Q：`degraded` 标记为什么重要？**
> 降级回答看起来和正常回答一样。不标记的话，用户会拿降级内容当真，SRE 也无法统计降级率。

> **Q：审计日志无限增长怎么办？**
> 环形缓冲限长（本仓库 500 条、字段截断 200/500 字符），并定期导出到真正的日志系统。内存里只留"最近的可排查量"。

---

## 6. 延伸阅读

- [05-评测体系与 CI 回归门禁](./05-评测体系与CI回归门禁.md)
- [03-上下文工程与 Skills](./03-上下文工程与Skills.md)
- 前端成品参考：`apps/ai-demo/src/components/Observability.tsx`
- 后端源码：`apps/backend/internal/obs/{types.go,eval.go,prompt.go}`、`apps/backend/internal/tool/audit.go`
