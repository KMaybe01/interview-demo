# 02 · LLM 调用与 Token 成本

> **一句话**：学会用「参数 + 预算」而不是「祈祷」来调用模型——知道每次请求发进去了什么、会花多少钱。
>
> **前置**：跑完 [01-30分钟从0到1](./01-30分钟从0到1.md)
> **产出**：一个按任务分档的模型注册表 + 每次调用都能报出 token 与成本的接口
> **代码**：`apps/ai-course/server/models.ts`、`apps/ai-course/shared/cost.ts`

---

## 1. 原理（够用即可）

### 一次调用到底传了什么

```
system    —— 角色设定、规则、输出格式（每轮都要重发）
messages  —— 多轮对话历史（user / assistant / tool 交替）
参数       —— temperature / maxOutputTokens / stopSequences / tools
返回       —— 文本 + finishReason + usage（inputTokens / outputTokens）
```

模型是**无状态**的：第 5 轮对话时，前 4 轮要原样再发一遍。这就是「上下文」的真实含义——它不是模型记住了，是**你每次都重传了一遍**。

### Token ≠ 字符

Token 是子词单位。经验值（仅数量级参考，不同 tokenizer 差异很大）：

| 内容 | 近似 |
|---|---|
| 英文 | 1 token ≈ 4 字符 ≈ 0.75 个单词 |
| 中文 | 1 汉字 ≈ 0.6-1 个 token |
| 代码 | 缩进、符号都会吃掉 token |

### 成本结构

- 输入与输出**分开计价**，输出通常比输入贵 3-10 倍（生成比理解更耗算力）
- 上下文是**累积**的：第 10 轮的输入 token = 前 9 轮 + 第 10 轮
- 命中提示缓存（Prompt Caching）的输入通常有明显折扣

---

## 2. 企业实现要点

### 按「任务档位」选模型，而不是按厂商

| 档位 | 典型场景 | 思路 |
|---|---|---|
| **快速档** | 意图识别、改写、简单问答 | 便宜、快，覆盖 70% 请求 |
| **旗舰档** | 复杂推理、长文档、代码生成 | 只在快速档不够时升级 |

本教程代码里就是两个档位（`apps/ai-course/server/models.ts`）：

```ts
const CATALOG = {
  fast:  { id: process.env.AI_COURSE_MODEL_FAST  ?? 'gpt-5-mini', ... },
  smart: { id: process.env.AI_COURSE_MODEL_SMART ?? 'gpt-5',      ... },
};
```

> 型号写死在代码里**必然过期**：厂商每季度都在换型号。把它放到环境变量，换型号不改业务代码。

### 后端参考实现怎么做的

`apps/backend/internal/llm/` 提供了更完整的形态，值得对照阅读：

| 能力 | 实现 | 关键默认值 |
|---|---|---|
| 注册表 | `Registry`：providers + modelIndex + default/fallback | 未命中时按前缀猜 provider（`gpt-`→openai、`claude`→anthropic、`deepseek`/`qwen`→对应厂商） |
| 定价 | `PricingTable`：美元 / 1M token，前缀模糊匹配 | 未命中走兜底价 `{0.15, 0.6}` 并置 **`Estimated=true`** |
| 熔断 | `NewCircuitBreaker`，closed/open/half-open | **连续失败 5 次**熔断，**30s** 后进入 half-open，只放行 1 次探测 |
| 降级链 | `ExecuteWithFallback` | 主 provider → 兜底 provider → `Offline()`（拒绝编造，只回显，标注 `finishReason="degraded"`） |
| 超时 | 非流式 `DefaultRequestTimeout = 45s` | 流式不加超时（用中断代替） |

> ⚠️ 注意两个**已实现但尚未接线**的点：熔断器目前没有挂到 `CompatProvider` 上（实际降级靠 chain + `isUsable`）；`WrapWithDelimiters` 只有单测覆盖，编排层没调用。
> 这是真实工程的常态——**"写完了"和"接进主链路了"是两件事**，面试时顺手提一句很加分。

### 成本控制的三板斧

1. **分层**：简单任务不上旗舰（省 80% 以上的钱）
2. **截断**：`maxOutputTokens` 设上限，防失控生成
3. **裁剪**：历史消息摘要/裁剪，别让上下文无限膨胀（AI SDK 有 `pruneMessages`）

---

## 3. 代码实现

成本换算抽成前后端共用的纯函数（便于单测与复用）：

```ts
// apps/ai-course/shared/cost.ts
export function estimateCost(usage: TokenUsage, tier: ModelTier): CostBreakdown {
  const price = SAMPLE_PRICING[tier] ?? SAMPLE_PRICING.offline;
  const input = ((usage.inputTokens ?? 0) / TOKENS_PER_MILLION) * price.input;
  const output = ((usage.outputTokens ?? 0) / TOKENS_PER_MILLION) * price.output;
  return { input, output, total: input + output };
}
```

调用侧把 usage 随消息一起下发，前端才能"看见钱"：

```ts
// apps/ai-course/server/handler.ts
const stream = toUIMessageStream({
  stream: result.stream,
  messageMetadata: ({ part }) => {
    if (part.type !== 'finish') return undefined;
    return {
      tier: entry.tier,
      modelId: entry.id,
      usage: { inputTokens: part.totalUsage.inputTokens ?? 0, /* ... */ },
      cost: estimateCost(part.totalUsage, entry.tier),
    };
  },
});
```

---

## 4. 验证与观测

```bash
# 1) 看当前档位与模型（同时能确认是否处于离线演示模式）
curl -s http://localhost:5199/api/models

# 2) 发一次请求，观察 finish 帧里的 usage 与 cost
curl -N -X POST http://localhost:5199/api/chat \
  -H 'content-type: application/json' \
  -d '{"tier":"fast","messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"一句话解释 token"}]}]}'
```

验收标准：

- [ ] UI 每条 AI 消息下方显示 `模型 · N tokens · $x.xxxxxx`
- [ ] 切到旗舰档再问同一个问题，能看到单价明显更高
- [ ] 服务端日志能区分"估算价"与"真实价"（离线模式为 0）

---

## 5. 面试追问

> **Q：为什么输出 token 比输入 token 贵？**
> 输入可以一次并行编码（prefill），输出是自回归逐 token 解码，算力占用时间长得多。所以「让它少说话」比「让它少读」更省钱。

> **Q：怎么估算一个日活 1 万的产品每月的 LLM 成本？**
> 拆成 3 个量：每会话平均轮次 × 每轮平均输入 token（注意历史累积）× 每轮输出 token，再乘单价。别忘了乘上缓存命中率与重试/失败率。

> **Q：`maxOutputTokens` 设小了会怎样？**
> `finishReason` 会变成 `length`，回答被截断——比报错更危险，因为**看起来像正常回答**。要监控 `finishReason` 分布。

> **Q：模型注册表为什么要按档位而不是按厂商命名？**
> 解耦。厂商型号三个月一换，业务代码里写 `models.fast` 十年不变。换厂商只改注册表。

---

## 6. 延伸阅读

- [04-AI SDK 7 核心 API](./04-AI-SDK-7核心API.md) —— `streamText` 的完整参数
- [附-AI聊天室完整实现](./附-AI聊天室完整实现.md) —— 会话历史与持久化
- [第四关 · 成本预算与配额治理](../04-第四关-企业级工程化/index.md) —— 把"看见钱"升级成"管住钱"
- [08-资料库 · 技术选型完整版](../08-资料库/01-技术选型完整版.md)
