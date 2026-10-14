# 01 · Agent 设计模式

> **一句话**：Agent 不是「更大的模型」，而是「模型 + 工具 + 记忆 + 规划」在一个循环里反复推理；
> 这一章讲清这个循环的本质、三种主流范式、以及怎么把循环落到可运行的代码（参考 `how-pi-agent-works` 与 `pi` 的真实实现）。
>
> **前置**：第二关「知识增强 RAG」
> **产出**：能手写一个 ReAct 循环，并说清它在哪些任务上不如 Plan-and-Execute
> **代码**：`apps/ai-course/src/stages/03-agent/`、`backend/internal/agent/`（ReAct / Function Calling 引擎）

---

## 1. 原理（够用即可）

### 1.1 Agent 是什么

`Agent = LLM（大脑）+ Tools（手脚）+ Memory（记忆）+ Planning（规划）`。LLM 只能生成文本，Agent 能**感知环境 → 自主决策 → 执行动作 → 观察结果 → 再决策**。

**LLM vs Agent 的核心差异**：

| 维度 | LLM | Agent |
|---|---|---|
| 能力边界 | 文本生成、知识问答 | 调用工具、执行操作、完成任务 |
| 记忆 | 上下文窗口（有限） | 短期 + 长期记忆系统 |
| 自主性 | 被动响应 | 主动规划、执行、反思 |
| 工具使用 | ❌ 不能 | ✅ Function Calling / MCP |
| 状态 | 无状态 | 有状态（对话 / 任务状态） |

> **黄金法则**（来自 Anthropic）：能用 Workflow 搞定的别上 Agent；能用单 Agent 搞定的别上 Multi-Agent。复杂度不是能力的证明，**可靠性才是**。

### 1.2 Agent Loop 的本质

```
while (需要工具调用) {
  1. 推理（Reason）：分析任务，决定下一步
  2. 行动（Act）：调用工具，执行操作
  3. 观察（Observe）：看执行结果，判断是否成功
  4. 迭代（Iterate）：失败则调整策略，继续循环
}
```

循环在两种情况下停止：**模型认为任务完成**（不再请求工具），或触发**安全阀**（最大迭代次数 / token 预算 / 超时 / 用户中断）。

**工程视角拆解**（参考 `https://github.com/cellinlab/how-pi-agent-works` 的四个渐进 Demo）：一个生产级 Loop 必须解决四件事——

| 要素 | 说明 | 易错点 |
|---|---|---|
| **消息归一** | 上下文由 `user` / `assistant` / `tool` 三类 message 线性组成 | 工具结果不回灌 → 模型瞎编 |
| **流式事件** | 文本 + 工具调用 + 工具结果 + 状态，分类型增量推送 | 前端不知道"它在想还是在做" |
| **工具结果回灌** | 工具输出要重新塞回上下文，作为下一轮推理输入 | 大文件输出撑爆上下文（见 ⑩ 第三章） |
| **会话树** | 每次"尝试"建分支，失败分支可丢弃，主路径只保留结论 | 试错污染主上下文 |

### 1.3 三种主流范式

| 模式 | 原理 | 适用场景 | 已知局限 |
|---|---|---|---|
| **ReAct** | 思考 → 行动 → 观察 循环 | 3-5 步内的简单决策、工具密集型任务 | 超过 10 步易跑偏 / 卡死；Token 消耗大；易循环 |
| **Plan-and-Execute** | 先制定完整计划，再逐步执行 | 流程固定、可分解的长任务 | 计划僵化，难应对意外 |
| **Reflexion** | 执行后自我评估，失败则修正重试 | 对准确率要求极高的场景（SQL / Coding Agent） | 依赖 Self-Critique 质量，可能"错误自我认可"陷入重复 |

> 生产建议：**3-5 步 → ReAct**；**5-10 步 → 混合**（先规划大框架，步骤内用 ReAct）；**10+ 步 → ReWOO / LLM Compiler / Multi-Agent 分治**；高准确率要求叠 Reflexion。其它范式（Tree-of-Thought、ReWOO、LLM Compiler DAG 并行）按需取用。

---

## 2. 企业实现要点

### 2.1 Function Calling 的本质

Function Calling 不是新能力——它就是"预测下一个词"，只不过预测出的词恰好构成一个函数调用的 JSON。

- LLM **从不执行任何工具**，它只生成结构化 JSON 描述（调哪个工具、参数是什么）
- 真正的执行由外部编排代码完成——**这一层沙箱保证了安全边界**
- "决定用什么工具"和"写一段回答"在模型看来没有区别，都是预测 token

### 2.2 工具描述的黄金法则（RAS）

- **R**elevant（相关性）：名称和描述准确反映功能
- **A**ctionable（可操作性）：含使用场景和限制
- **S**pecific（具体性）：提供具体示例

> 经验值：参数描述清晰 ↓40% 参数错误；工具不超过 10 个 ↓30% 选错；错误信息友好 ↑50% 自动恢复率；超时控制（默认 5s）防卡死。

### 2.3 模型级联 / 缓存 / 上下文预算

| 手段 | 做法 | 收益 |
|---|---|---|
| **模型级联** | 复杂决策用旗舰档，图片分析 / 摘要用低成本档，审批用低成本档 + 规则 | 成本随步骤数快速膨胀，级联是降本关键 |
| **Prompt Caching** | System Prompt / Tool Declarations 放稳定前缀，命中 KV 缓存前缀复用 | 重复计算大幅下降 |
| **Context Budget** | System(10K) + Tools(5-20K) + Session(50-100K) + Working(10K) + 输出(10K) 分层分配 | 长会话不爆窗 |

> 上下文压缩（摘要 / 剪枝 / 懒加载 / 会话树）的深入做法见 [⑩ 编码 Agent 专题 · 上下文压缩](../10-编码Agent专题/03-上下文压缩与长会话.md)。

### 2.4 真实 harness 的分层（参考 `https://github.com/earendil-works/pi`）

| 包 | 职责 | 教程映射 |
|---|---|---|
| `pi-ai` | 统一多厂商 LLM API（OpenAI / Anthropic / Google） | 第四关多 Provider 网关 |
| `pi-agent-core` | Agent 运行时：工具调用 + 状态管理 | 本章 Loop + 下一章工具契约 |
| `pi-coding-agent` | 交互式编码 Agent CLI | ⑩ 编码 Agent 专题 |

> `pi` 的启发：把「模型接入」「Agent 循环」「工具执行」三层解耦，工具与状态管理独立成 runtime，才能在多种场景复用。本仓库 `backend/internal/agent/`（引擎）+ `tool/`（权限分级）+ `memory/`（记忆）是同一思路的 Go 实现。

---

## 3. 代码实现

### 3.1 最小 ReAct 循环（对齐 `backend/internal/agent/`）

```typescript
// 工具注册：名称 + 描述 + JSON Schema 参数 + 执行函数
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

async function reactLoop(task: string, tools: Map<string, Tool>, maxSteps = 5) {
  const messages = [
    { role: 'system', content: '你是可用工具的智能助手。' },
    { role: 'user', content: task },
  ];
  const openaiTools = [...tools.values()].map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let i = 0; i < maxSteps; i++) {
    const res = await llm.chat({ messages, tools: openaiTools, tool_choice: 'auto' });
    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) return msg.content ?? '完成'; // 停止条件①：不再调工具

    for (const call of msg.tool_calls) {
      const tool = tools.get(call.function.name);
      const args = JSON.parse(call.function.arguments);
      const observation = tool ? await tool.execute(args) : `工具 ${call.function.name} 不存在`;
      messages.push({ role: 'tool', tool_call_id: call.id, content: observation }); // 工具结果回灌
    }
  }
  return '达到最大迭代次数'; // 停止条件②：步数上限
}
```

### 3.2 how-pi 风格：带流式事件与 parts 的 Loop

`https://github.com/cellinlab/how-pi-agent-works` 把上面的循环升级为「流式 + 会话树」：每个 part（`text` / `tool-call` / `tool-result`）增量推给前端，工具结果回灌前先做截断/懒加载，失败分支挂到会话树而非污染主上下文。AI SDK 7 下等价于：

```typescript
import { streamText } from 'ai';

const result = streamText({
  model, messages, tools,
  stopWhen: stepCountIs(25), // 停止条件：步数上限
});
for await (const part of result.fullStream) {
  // part.type: 'text' | 'tool-call' | 'tool-result' | 'finish'
  renderEvent(part); // 前端把每个 part 渲染成「思考/工具/结果」卡片
}
```

---

## 4. 验证与观测

| 检查项 | 方法 | 达标 |
|---|---|---|
| 循环收敛 | 给一个 3 步任务，观察是否在不再调工具后停止 | 不多跑、不早停 |
| 工具结果回灌 | 故意让工具返回错误，确认下一步推理参考了错误 | 模型基于真实输出 |
| 停止条件 | 给一个无解任务，确认触发步数上限 | 不无限烧钱 |
| 轨迹可观测 | 打印每轮 Thought-Action-Observation | 能复盘推理链路 |

Agent 评估维度（自动化）：任务完成率 >85%、工具选择准确率 >90%、路径效率（实际步数/最优）<1.5x、幻觉率 <5%、自动恢复率 >70%。详见 `AgentEvaluator` 思路（轨迹比对预期工具序列）。

---

## 5. 面试追问

- **ReAct 和 Plan-and-Execute 分别适用什么？** 不确定性高、需动态调整 → ReAct；流程固定、可预测 → Plan-and-Execute；多数生产系统是混合。
- **怎么防止 Agent 死循环？** 多层防护：工具调用计数 → 状态哈希检测重复 → 超时 → token 预算 → 人工（HITL）。追问：状态哈希比步数上限准在哪？
- **工具描述质量如何影响工具选择？** 模糊→选错/误用；过长→涨 token；缺示例→不会调。按 RAS 原则写，并 A/B 验证。
- **Function Calling 为什么安全？** LLM 只生成 JSON 描述，执行在外部沙箱，模型永远隔着一层。
- **Multi-Agent 的主管/工人 vs 辩论怎么选？** 分工明确、要统一协调 → 主管/工人（单点瓶颈风险）；质量优先、多角度 → 辩论（耗时）。可混合。

---

## 6. 延伸阅读

- [02-工具设计契约](./02-工具设计契约.md) — 副作用分级 L0/L1/L2、幂等、超时、审计
- [03-停止条件与死循环防护](./03-停止条件与死循环防护.md) — 步数 / 重复检测 / 超时 / 预算
- [04-HITL人工审批](./04-HITL人工审批.md) — 危险操作挂起审批
- [⑩ 编码 Agent 专题 · Agent Loop](../10-编码Agent专题/01-Agent-Loop与对话循环.md) — 编码场景的 Loop 特殊性与流式事件
- `https://github.com/cellinlab/how-pi-agent-works` — Agent Loop / 消息 / 流式事件 / 会话树（4 个渐进 TS Demo）
- `https://github.com/earendil-works/pi` — `pi-ai` / `pi-agent-core` / `pi-coding-agent` 分层 harness
- `https://github.com/datawhalechina/hello-agents` — ReAct / Plan-and-Solve / Reflection 手搓 + 多 Agent 案例
- 工业实现：`backend/internal/agent/`、`backend/internal/tool/`、`backend/internal/memory/`
