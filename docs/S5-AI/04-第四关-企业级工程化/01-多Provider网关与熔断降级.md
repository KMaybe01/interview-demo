# 01 · 多 Provider 网关与熔断降级

> **一句话**：把"某家厂商挂了 = 你的产品挂了"变成"某家厂商挂了 = 用户拿到一句降级回答"。
>
> **前置**：[第一关 · 流式对话](../01-第一关-流式对话/index.md)
> **产出**：一个带主备切换、熔断、离线兜底的模型网关（可演示可压测）
> **代码**：`apps/ai-course/server/resilience.ts`、`server/models.ts`；后端参考 `apps/backend/internal/llm/`

---

## 1. 原理（够用即可）

单个 Provider 的失败模式比你想象的多：限流（429）、超时、5xx、机房故障、账号被封、模型突然下线。
网关层要解决的就一件事：**把不可用的 Provider 摘掉，让请求落到还能用的地方**。

三个必须分清的概念：

| 概念 | 作用范围 | 典型实现 |
|---|---|---|
| **重试** | 单个请求 | 指数退避 + 抖动，只对**可重试错误**（429/5xx/超时）重试 |
| **熔断** | 一段时间内的一类调用 | 连续失败 N 次 → 打开 → 冷却 → 半开探测 |
| **降级** | 整条链路 | 主 → 备 → 离线兜底（返回有"降级感"的内容，而不是报错） |

---

## 2. 企业实现要点

### 后端参考实现：`apps/backend/internal/llm/`

| 能力 | 实现 | 默认值 |
|---|---|---|
| 注册表 | `Registry`：providers + modelIndex + default/fallback | 未命中按前缀猜 provider（`gpt-`→openai、`claude`→anthropic、`deepseek`/`qwen`/`llama`→对应/ollama），再落到 default |
| 主备 | `ExecuteWithFallback` | 主 provider（`isUsable` = 已配置且 `lastError()==nil`）→ Fallback（改写为兜底首个模型）→ `Offline()` |
| 熔断 | `NewCircuitBreaker`：closed/open/half-open | 阈值 **5 次**失败，开启后 **30s**，半开只放行 1 次探测 |
| 超时 | 非流式 `DefaultRequestTimeout = 45s` | 流式不加超时，改用中断 |
| 离线兜底 | `OfflineProvider` | 单实例、模型 `offline-fallback`、`finishReason="degraded"`、**拒绝编造只回显**（截取 200 字） |

> ⚠️ **现状提示**：熔断器已实现但**尚未挂到 `CompatProvider`**，当前实际降级靠 chain + `isUsable` 判断。
> 讲解时可以把它当作"设计意图"和"接线进度"两个层次来谈——真实工程里这种情况很常见。

### 离线兜底的设计原则：**拒绝编造**

最差的降级不是"答得差"，而是"编得像真的"。
本仓库的 `OfflineProvider` 明确只回显输入并标注 `finishReason="degraded"`，前端据此显示"当前为降级模式"。
这条规则值得抄进你自己的系统：**降级态必须在响应里显式可见**。

### 熔断的三个参数怎么定

| 参数 | 常见取值 | 权衡 |
|---|---|---|
| 失败阈值 | 5 次 | 太小 → 偶发抖动就熔断；太大 → 故障持续太久 |
| 冷却时间 | 30s | 太短 → 反复试探；太长 → 恢复慢 |
| 半开放行 | 1 次 | 只放行一个请求做探测，成功才闭合 |

### 重试的注意点

- **只对幂等/可重试错误**重试（429、5xx、超时）；4xx 参数错误重试没意义
- 指数退避 + 抖动，避免惊群
- 有 `maxRetries` 上限，且**总超时**要封顶
- 流式已经吐了一半再失败，重试要小心重复内容（用 messageId 去重）

---

## 3. 代码实现

教程侧的网关是"薄版"，把主备 + 熔断 + 离线兜底三个语义都跑出来：

```ts
// apps/ai-course/server/resilience.ts
export class CircuitBreaker {
  // 连续失败 threshold 次 → open；冷却 cooldownMs 后 → half-open（只放行 1 次探测）
}

export async function executeWithFallback(tier: ModelTier, call: ModelCall): Promise<Result> {
  for (const candidate of chain(tier)) {     // 主 → 备 → 离线
    if (!breaker.isUsable(candidate.id)) continue;
    try { return await call(candidate); }
    catch (e) { breaker.recordFailure(candidate.id); }
  }
  return degraded();   // 明确标注 degraded，而不是抛错
}
```

`models.ts` 里的降级链则更朴素：**没有 Key 就直接走离线模型**，保证零配置也能跑通链路——这本身就是"降级"的最小形态。

---

## 4. 验证与观测

| 场景 | 怎么造 | 期望 |
|---|---|---|
| 主 Provider 限流 | 把 Key 换成一个无效值，或打满配额 | 自动切到备用 |
| 连续失败 | 连续请求 N 次失败 | 第 N 次后熔断，后续请求直接跳过该 Provider |
| 冷却恢复 | 等 30s 再请求 | 半开探测成功 → 闭合 |
| 全部不可用 | 断网 | 返回 `degraded` 响应，前端显示"降级模式"而不是报错 |

观测指标（第四关可观测章节会落地）：
`provider_failures_total{provider}`、`circuit_state{provider}`、`degraded_responses_total`

---

## 5. 面试追问

> **Q：重试和熔断的区别？**
> 重试是请求级、乐观的（再试一次可能就好了）；熔断是实例级、悲观的（这家最近一直不行，短期内别碰）。没有熔断的重试会在故障期放大流量。

> **Q：熔断打开了，请求怎么办？**
> 走降级链：备用 Provider；都没有就返回降级响应（明确标注），而不是让请求超时。

> **Q：为什么要"半开"？**
> 直接全量放回去，如果下游还没恢复会被再次打垮。半开只放一个探测请求，成功才闭合。

> **Q：离线兜底为什么不能让模型自由发挥？**
> 降级态下模型没有可用的知识来源，自由发挥就是编造。明确"只回显 + 标注 degraded"是诚实的做法，用户也更容易接受。

> **Q：流式请求失败了怎么重试？**
> 已经吐出的内容不能重复。要么放弃重试让前端提示重试，要么用 messageId 去重后从断点续传。多数产品选择前者 + 明确提示。

---

## 6. 延伸阅读

- [02-安全护栏](./02-安全护栏.md)
- [04-可观测性 Trace 与审计](./04-可观测性Trace与审计.md) —— 把熔断状态做成可观测指标
- [07-Go 后端参考实现](../07-Go后端参考实现/index.md)
- 后端源码：`apps/backend/internal/llm/{registry.go,resilience.go,offline.go,pricing.go}`
