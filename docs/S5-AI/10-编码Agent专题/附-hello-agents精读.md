# 附 · hello-agents 精读导引

> **性质**：本文是**阅读导引**而非原文搬运。`hello-agents` 是 `https://github.com/datawhalechina/hello-agents` 下的 Datawhale《从零开始构建智能体》系统教程（16 章 + 自研 HelloAgents 框架），体量很大，**不要求通读**，按下面清单取用即可。
>
> **与本章关系**：它是本专题「从 0 手搓 Agent」最贴手的教学材料，与 `how-pi-agent-works`（Pi Agent 教学版）互为补充。

---

## 0. 三种读法（按需取用）

| 时间 | 读什么 | 拿走什么 |
|------|--------|----------|
| **30 分钟** | 只看下表的「对应本专题」列 + 本文的分工说明 | 知道每块知识在仓库里的落点，面试时能给出代码锚点 |
| **半天** | 精读 ReAct / Plan-and-Solve / Reflection 三章 + 框架实现章 | 能徒手写一个最小 Agent Loop，并说出三种范式的取舍 |
| **一天** | 加上 RAG / 记忆 / 协议 / 多 Agent 四章 | 能把本专题 01~06 串成一条完整链路 |

> ⚠️ 不要从仓库首页顺着读——这是一套书，不是一篇文档。按主题跳读效率最高。

---

## 1. 主题 → 本专题映射

| 主题 | 在 `hello-agents` 中看什么 | 拿走的能力 | 对应本专题 / 本仓库 |
|---|---|---|---|
| ReAct / Plan-and-Solve / Reflection | 经典范式章节的伪代码与实测对比 | 三种 Agent 循环的差异与适用边界 | [01 Agent Loop](./01-Agent-Loop与对话循环.md)、[第三关 · Agent 设计模式](../03-第三关-Agent与工具/01-Agent设计模式.md) |
| 自研 HelloAgents 框架 | 框架实现章节：工具注册 / 调度 / 状态管理 | 一个框架最小骨架该有哪些模块 | [02 工具系统与权限管线](./02-工具系统与权限管线.md)、`apps/backend/internal/tool/` |
| RAG（加载 / 分块 / 嵌入 / 检索） | RAG 章节的端到端流水线 | 索引与检索两阶段的职责划分 | [第二关 · 知识增强 RAG](../02-第二关-知识增强RAG/index.md)、`apps/backend/internal/knowledge/` |
| 记忆与上下文工程 | 记忆章节：短期 / 长期 / 摘要策略 | 什么该进记忆、什么留在会话 | [03 上下文压缩](./03-上下文压缩与长会话.md)、`apps/backend/internal/memory/` |
| MCP · A2A · ANP 协议 | 协议章节的调用示例 | 三种协议解决的是不同层的问题 | [第五关 · 协议与多 Agent](../05-第五关-协议与多Agent/index.md)、`apps/backend/internal/mcp/`、`apps/backend/internal/a2a/` |
| 多 Agent 案例（旅行助手 / 赛博小镇） | 案例章节的角色分工与通信 | 什么时候拆 Agent、怎么避免互相污染 | [04 子 Agent 编排](./04-子Agent与多Agent编排.md)、`apps/backend/internal/agent/` |
| Agentic-RL | 进阶章节 | 训练与推理两条路的区别 | 选读，面试加分项 |

---

## 2. 手搓路线（4 个渐进实验）

按下面顺序做，每一步都能在本仓库找到对照实现：

1. **纯函数 Loop**：模型输出 → 解析 tool-call → 执行 → 回灌 → 再推理。对照 [01](./01-Agent-Loop与对话循环.md) 与 `apps/ai-course/src/stages/03-agent/`。
2. **加工具契约**：给工具加 JSON Schema 与权限分级，拒绝越权调用。对照 [02](./02-工具系统与权限管线.md) 与 `apps/backend/internal/tool/`。
3. **加上下文压缩**：超过阈值做摘要 / 剪枝，保住用户目标。对照 [03](./03-上下文压缩与长会话.md) 与 `apps/backend/internal/memory/`。
4. **加分支与编排**：Fork 子 Agent 做隔离探索，主 Agent 只收结论。对照 [04](./04-子Agent与多Agent编排.md) 与 `apps/backend/internal/agent/`。

> 验收标准：每一步跑完后，都能回答「如果我把它放到生产，最可能先挂在哪一层」。

---

## 3. 与 `how-pi-agent-works` / `claude-code-book` 的分工

| 材料 | 特点 | 用在什么时候 |
|------|------|-------------|
| `hello-agents` | **宽**：范式 / RAG / 协议 / 多 Agent / RL 全覆盖 | 建立全景、找某一块的入门讲法 |
| `how-pi-agent-works` | **深**：只抠 Pi Agent 一个实现，4 个渐进 TS Demo | 照着把一个 Agent 从零写跑 |
| `claude-code-book` | **工业级**：对话循环 / `Tool<>` 协议 / 四阶段权限 / 上下文压缩 / Fork 子 Agent | 看真实 harness 如何产品化，准备「你读过源码吗」追问 |

> 推荐顺序：`hello-agents` 建全景 → `how-pi-agent-works` 写跑一个 → `claude-code-book` 看工业实现 → 回到本专题 01~06 把知识压成面试表述。

---

## 4. 常见误区

- **把范式当银弹**：ReAct 适合短链路试错，Plan-and-Solve 适合长任务规划，Reflection 适合有明确评判标准的任务——没有「最好」，只有「匹配」。
- **只看伪代码不动手**：Agent 的坑全在边界（工具失败、流式分片、上下文爆窗），不跑一遍体会不到。
- **照抄外部教程的版本号**：`hello-agents` 的示例可能与本仓库基线不同；型号 / 协议版本一律以 [根 index.md 的版本基线](../index.md#版本基线唯一真源) 为准。

---

## 注意

`hello-agents` 为外部开源教程，正文不在本仓库内。引用其结论时请回到 `https://github.com/datawhalechina/hello-agents` 原文核对版本与示例代码，不要凭记忆转述。
