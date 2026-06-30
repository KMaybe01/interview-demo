# 🔴 阶段四：专家期 - 全自动 Agent

> 📖 **本文档为《AI 前端开发体系化学习指南》的阶段拆分文档**
> 完整指南请查看：[学习指南总览](./README.md#-ai-前端开发体系化学习指南)

---

> 🎯 **阶段目标**：赋予 AI 自主规划、工具使用与反思能力，构建真正的智能体。

### 💡 你将学到
- Agent 三大核心架构：[ReAct](https://arxiv.org/abs/2210.03629)、Plan-and-Execute、Reflexion
- Agent六大支柱：Agent Loop、记忆系统、工具系统、Context Engine、推理引擎、上下文压缩
- 工具注册系统设计与动态调用机制（Function Calling本质、MCP协议）
- Thought-Action-Observation 循环的实现
- 多步工作流与任务分解逻辑
- 反思机制（Self-Correction）与结果评估
- Agent效率优化：模型级联、Prompt Caching、Context Budget管理
- Agent边界判断：何时需要Agent，何时用普通LLM应用

### 🔗 前置知识
- 完成 [🟣 阶段三：深耕期](./03-深耕期-端侧推理.md)
- 熟悉函数式编程与组合模式
- 了解 AST 解析与正则表达式基础

### 📚 核心能力指标
- [ ] 理解 Agent 核心架构 ([ReAct](https://arxiv.org/abs/2210.03629), Plan-and-Execute, Reflexion)
- [ ] 实现工具注册系统与动态调用机制
- [ ] 构建多步工作流与任务分解逻辑
- [ ] 掌握反思机制 (Self-Correction) 与结果评估
- [ ] 使用 [WebAssembly](https://webassembly.org) 优化复杂计算性能
- [ ] 理解Agent六大支柱：Agent Loop、记忆系统、工具系统、Context Engine、推理引擎、上下文压缩
- [ ] 掌握Agent效率优化：模型级联、Prompt Caching、Context Budget管理

### 🧠 核心概念解析

#### 4.0 Agent 基础概念

**💡 什么是 Agent？**
Agent（智能体）= **LLM（大脑）** + **工具（手脚）** + **记忆（经验）**。LLM 只能生成文本，Agent 能**感知环境 → 自主决策 → 执行动作**。

> 📌 **精确定义**（来源：企业级Agent架构实践）：
> Agent = 大语言模型 + 任务目标 + 工具调用 + 上下文/记忆 + 执行控制 + 反馈评估
>
> 普通LLM应用是"问答接口"：用户输入问题，模型生成回答。
> Agent是"任务协作者"：需要判断目标、拆解步骤、选择工具、观察结果，并根据结果继续下一步。

**LLM vs Agent 核心差异：**

| 对比维度 | LLM | Agent |
|:---|:---|:---|
| 能力边界 | 文本生成、知识问答 | 调用工具、执行操作、完成任务 |
| 记忆 | 上下文窗口（有限） | 短期 + 长期记忆系统 |
| 自主性 | 被动响应 | 主动规划、执行、反思 |
| 工具使用 | ❌ 不能 | ✅ Function Calling / MCP |
| 状态管理 | 无状态 | 有状态（对话/任务状态） |
| 交互模式 | 一问一答，用户主导每一步 | 目标驱动，用户只需给出最终目标 |

**Workflow vs Agent vs Tool 三者区别：**
- **Tool**：单一功能单元（搜索、计算器），无状态、确定输入输出
- **Agent**：LLM驱动的自主决策体，能选择工具、拆解任务、反思纠错
- **Workflow**：预定义的确定性执行流程（数据Pipeline、审批流）

> 📌 **关键区分**（来自Anthropic《Building Effective Agents》）：
> - Workflow是"告诉系统怎么做"，Agent是"告诉系统做什么，系统自己决定怎么做"
> - Workflow按预定义代码路径执行，Agent是LLM自己决定下一步干什么
> - 能用Workflow解决的问题就别上Agent，复杂度要一级一级往上加

**Agent 循环的本质（Agent Loop）：**
```
while (需要工具调用) {
  1. 推理（Reason）：分析任务，制定计划
  2. 行动（Act）：调用工具，执行操作  
  3. 观察（Observe）：看执行结果，判断是否成功
  4. 迭代（Iterate）：如果失败，调整策略，继续循环
}
```
> 💡 这个while循环就是Agent的核心——一个持续运行的"推理-行动-观察"闭环，直到LLM认为任务完成，或触发安全阀（最大迭代次数、token预算、超时）。

**🎯 什么时候需要Agent？（三问判断法）：**

| 问题 | 判断依据 |
|:---|:---|
| 1. 这个任务是否需要多步骤处理，而不是一次问答？ | 需要 = Agent |
| 2. 这个任务是否需要读取或调用外部系统？ | 需要 = Agent |
| 3. 这个任务的结果是否需要持续验证、审计或反馈改进？ | 需要 = Agent |

> 如果三个问题都是否定 → 先做普通LLM应用更合适
> 如果至少两个问题是肯定 → 考虑Agent架构，并提前设计工具权限、状态管理、评测集和回滚机制

| 场景 | 是否适合Agent | 判断理由 |
|:---|:---:|:---|
| 企业知识问答 | 视复杂度而定 | 简单问答用RAG即可，多轮澄清和工具查询可做Agent |
| 运维告警分析 | ✅ 适合 | 需要查监控、日志、事件和生成处置建议 |
| 自动审批或删除资源 | ⚠️ 谨慎 | 风险高，需要人工确认和强审计 |
| 文案改写 | ❌ 通常不需要 | 单轮生成即可，不需要复杂工具链 |
| 代码辅助和测试生成 | ✅ 适合部分场景 | 需要读取仓库、执行测试、生成补丁和验证结果 |
| 销售或客服辅助 | ✅ 适合 | 需要结合知识库、客户上下文和工单系统 |

**⚠️ Agent 的四大边界：**

| 边界类型 | 说明 | 应对策略 |
|:---|:---|:---|
| **理解边界** | 模型可能误解模糊目标 | 追问机制、澄清确认 |
| **事实边界** | 模型可能生成不可靠事实 | 知识库和引用支撑 |
| **工具边界** | 工具返回错误、超时或权限不足 | 降级策略、错误恢复 |
| **安全边界** | 涉及数据访问、生产变更和费用审批 | 权限控制、审计日志 |
| **成本边界** | 多轮推理和工具调用会增加延迟和调用成本 | 模型分级、Prompt缓存 |

---

#### 4.1 Agent 架构模式

```mermaid
graph TD
    User[👤 用户任务] --> Planner[🧠 规划器]
    Planner -->|分解步骤| Tools[🛠️ 工具集]
    Tools -->|执行结果| Observer[👁️ 观察器]
    Observer -->|反馈| Reflector[🔄 反思器]
    Reflector -->|修正计划| Planner
    Reflector -->|输出最终结果| User

    classDef agent fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    class Planner,Tools,Observer,Reflector agent;
```

**六大核心组件（企业级架构）：**

| 组件 | 职责 | 技术方案 | 设计要点 |
|:---|:---|:---|:---|
| **模型入口** | 统一接入LLM，处理鉴权、限流、重试、版本和成本 | GPT-4o / Claude / DeepSeek | 可以是模型级联（大模型处理复杂决策，小模型处理简单任务） |
| **任务规划器** | 把用户目标拆成可执行步骤，决定是否需要工具 | ReAct / Plan-and-Execute | 分解任务、制定步骤 |
| **工具层** | 连接搜索、数据库、工单、代码仓库、监控或业务系统 | Function Calling / MCP（Streamable HTTP + OAuth 2.1，2025+）/ API | 工具描述清晰、避免工具过多（<10个） |
| **上下文与记忆** | 保留当前会话、任务状态、用户偏好或项目配置 | RAG + 向量数据库 + 摘要 | 短期+中期+长期三层记忆 |
| **执行控制器** | 管理步骤状态、失败重试、人工确认和终止条件 | 状态机 / 任务队列 | 最大迭代次数、超时控制 |
| **反馈与评测** | 记录结果、用户反馈、样例集和回归测试 | LLM-as-Judge / 自动化测试 | 质量审查、自动迭代修正 |

> 📌 **核心洞察**：大语言模型是Agent的核心推理引擎，但不是全部系统。同一个模型可以支撑不同Agent（客服Agent、运维Agent、代码Agent），差异不在模型名字，而在任务边界、工具集合、知识来源和执行策略。

#### 4.2 主流设计模式

| 模式 | 原理 | 适用场景 |
|:---|:---|:---|
| **ReAct** | 思考 (Thought) → 行动 (Action) → 观察 (Observation) 循环 | 3-5 步内的简单决策、工具密集型任务 |
| **Plan-and-Execute** | 先制定完整计划，再逐步执行 | 流程固定、可分解的长任务 |
| **Reflexion** | 执行后自我评估，失败则修正重试 | 对准确率要求极高的场景（如 SQL/Coding Agent） |
| **Multi-Agent** | 多Agent分工协作（主管/工人、辩论模式） | 复杂协作场景 |
| **Tree-of-Thought** | 同时探索多条推理路径 | 需要探索的问题 |
| **ReWOO** | 规划-执行解耦，变量不重复传 LLM | 减少 token 消耗 |
| **LLM Compiler**（ICLR 2024） | DAG 化任务图，并行执行 | 复杂多步任务的并行编排 |

> ⚠️ **ReAct 的已知局限**（生产 Agent 必读）：
> - **长链路脆弱**：超过 10 步循环容易"跑偏"或卡死
> - **Token 消耗大**：每步都要把历史 Observation 喂回 LLM
> - **容易循环**：同一工具可能反复调用而无进展
> - **不适合创意/开放任务**：缺乏全局规划
>
> **生产建议**：
> - 3-5 步内 → ReAct 够用
> - 5-10 步 → 混合 Plan-and-Execute（先规划大框架，步骤内用 ReAct）
> - 10+ 步 → 考虑 ReWOO、LLM Compiler 或 Multi-Agent 分治
> - 高准确率要求 → 叠加 Reflexion 加 Self-Critique

> ⚠️ **Reflexion 的局限**：依赖 Self-Critique 的质量——如果 LLM 错误地"自我认可"了一个错误结果，Reflexion 会陷入重复。生产中常与 Human-in-the-Loop 配合。

**💡 Function Calling 的本质（来自华为云技术博客）：**

Function Calling 不是什么新能力，它就是"预测下一个词"——只不过预测出来的词恰好构成了一个函数调用的JSON。

```
用户输入 → LLM 预测 → 输出文本？结束
                     → 输出工具调用JSON？执行 → 把结果喂回LLM → 继续预测 → ...
```

**关键点**：
- LLM本身从不执行任何工具，它只负责生成一个结构化JSON描述（我要调用哪个工具、参数是什么）
- 真正的执行由外部的编排代码完成，这个设计保证了安全边界——LLM永远隔着一层沙箱
- "决定用什么工具"和"写一段回答"在模型看来没有区别——都是预测下一个token

**📦 工具描述的黄金法则（RAS原则）：**
- **R**elevant（相关性）：工具名称和描述应准确反映其功能
- **A**ctionable（可操作性）：描述应包含使用场景和限制
- **S**pecific（具体性）：避免泛泛而谈，提供具体示例

### 💻 核心实现

#### 4.3 Agent 效率与成本优化（来自腾讯云技术博客）

> 📌 **核心洞察**：Agent是循环调用LLM，成本会随步骤数快速膨胀。output token的价格是input token的3-5倍。

**模型级联策略（降低成本的关键）：**
| 模型类型 | 用途 | 示例配置 |
|:---|:---|:---|
| 主模型 | 复杂推理、决策判断 | GPT-4o / Claude 3.5 Sonnet |
| 辅助模型 | 图片分析、网页抽取、压缩摘要 | Claude Haiku / GPT-4o-mini |
| 审批模型 | 危险命令审批 | GPT-4o-mini |

**Prompt Caching（降低重复计算成本）：**
- Anthropic和OpenAI都支持前缀匹配缓存
- 只要token序列与上一次请求的前缀一致，这部分就直接复用KV缓存，不需要重新计算
- Frozen部分（System Prompt、Tool Declarations）尽量放在稳定前缀中，提高缓存命中率

**Context Budget 管理策略：**
| 内容 | 预算 | 说明 |
|:---|:---|:---|
| System Prompt（Frozen） | 10K | 固定，可缓存 |
| Tool Declarations | 5-20K | MCP按需加载 |
| Session History | 50-100K | 动态增长 |
| Working Memory | 10K | 当前任务上下文 |
| 响应输出 | 10K | Agent输出空间 |

**上下文压缩策略（处理历史过长）：**
| 策略 | 原理 | 代价 |
|:---|:---|:---|
| 有损摘要 | LLM提炼核心信息 | 损失细节 |
| 关键信息提取 | 只保留重要节点 | 可能漏掉有用信息 |
| 滑动窗口 | 只保留最近N条 | 丢失历史 |
| 分层压缩 | 不同层级不同策略 | 复杂度高 |

#### 4.4 工具注册系统

```typescript
// lib/agent/tools.ts
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema 描述参数
  execute: (params: Record<string, unknown>) => Promise<string>;
}

// 🔍 搜索工具
export const searchTool: Tool = {
  name: 'web_search',
  description: '搜索互联网获取最新信息',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
    },
    required: ['query'],
  },
  execute: async ({ query }) => {
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();
    return JSON.stringify(data.results);
  },
};

// 🧮 计算器工具（安全实现）
export const calcTool: Tool = {
  name: 'calculator',
  description: '执行数学计算（仅支持基本数学运算）',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: '数学表达式，如 2 + 2、(3 * 4) / 2' },
    },
    required: ['expression'],
  },
  execute: async (params) => {
    try {
      const expression = String(params.expression);
      // 安全的数学表达式解析器（避免代码注入）
      const cleaned = expression.replace(/\s+/g, '');
      const sanitized = cleaned.replace(/[^0-9+\-*/().%]/g, '');
      if (sanitized !== cleaned) {
        return '错误：表达式包含非法字符，仅支持数字和 + - * / ( ) % 运算符';
      }
      
      // 注意: new Function() 有安全风险，生产环境建议使用 mathjs 等库
      // 使用 Function 构造函数在严格模式下执行（仅限数学表达式）
      const fn = new Function('"use strict"; return (' + sanitized + ')');
      const result = fn();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return '错误：计算结果无效';
      }
      
      return String(result);
    } catch (e) {
      return '计算错误：' + (e instanceof Error ? e.message : '无效的数学表达式');
    }
  },
};

export const toolRegistry = new Map<string, Tool>([
  [searchTool.name, searchTool],
  [calcTool.name, calcTool],
]);

// 需要 import OpenAI from 'openai'
// 转换为 OpenAI tools 格式
export function toOpenAITools(): OpenAI.Chat.CompletionCreateParams.Tool[] {
  return Array.from(toolRegistry.values()).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    },
  }));
}
```

#### 4.5 [ReAct](https://arxiv.org/abs/2210.03629) Agent 核心

```typescript
// lib/agent/react-agent.ts
import OpenAI from 'openai';

export class ReActAgent {
  private maxIterations = 5;
  private openai = new OpenAI();

  async run(task: string): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: '你是一个智能助手，可以使用工具完成任务。' },
      { role: 'user', content: task },
    ];

    const tools = toOpenAITools();

    for (let i = 0; i < this.maxIterations; i++) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools,
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content ?? '未获取到回答';
      }

      for (const toolCall of message.tool_calls) {
        const tool = toolRegistry.get(toolCall.function.name);
        if (!tool) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `工具 ${toolCall.function.name} 不存在`,
          });
          continue;
        }

        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          throw new Error(`Failed to parse tool arguments: ${toolCall.function.arguments}`);
        }
        const observation = await tool.execute(args);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: observation,
        });
      }
    }
    return '达到最大迭代次数，未能完成任务。';
  }
}
```

---

### 🤖 多 Agent 协作模式（进阶）

> **从单 Agent 到 Agent 系统**：解决单个 Agent 能力瓶颈，通过分工协作完成复杂任务。

#### Agent 通信协议设计

```typescript
// agent-protocol.ts
export interface AgentMessage {
  from: string;          // 发送方 ID
  to: string;            // 接收方 ID（'*' 表示广播）
  type: 'request' | 'response' | 'broadcast' | 'interrupt' | 'error';
  payload: {
    taskId: string;       // 任务追踪 ID
    action?: string;      // 动作类型
    data: unknown;        // 消息体
    priority: 1 | 2 | 3; // 优先级 1=最高
  };
  meta: {
    ttl: number;          // 消息过期时间 (ms)
    timestamp: number;    // 发送时间
    hopCount: number;     // 跳数，防止无限循环
  };
}

// Agent 间共享的上下文
export class AgentContext {
  private state: Map<string, unknown> = new Map();
  
  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }
  
  set(key: string, value: unknown): void {
    this.state.set(key, value);
  }
  
  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.state);
  }
}
```

#### 主管/工人模式 (Orchestrator-Worker)

```typescript
// orchestrator-agent.ts
class OrchestratorAgent {
  private workers: Map<string, WorkerAgent> = new Map();
  private context = new AgentContext();
  
  register(name: string, worker: WorkerAgent): void {
    this.workers.set(name, worker);
  }
  
  async execute(task: string): Promise<string> {
    // 1. 任务分析与分解
    const plan = await this.planTask(task);
    this.context.set('plan', plan);
    
    // 2. 并行执行子任务
    const stepResults = await Promise.all(
      plan.steps.map(async step => {
        const worker = this.selectWorker(step);
        const result = await worker.execute(
          step.instruction,
          this.context.snapshot()
        );
        return { step: step.id, result };
      })
    );
    
    // 3. 结果合成
    const synthesis = await this.synthesize(
      task,
      stepResults.map(sr => sr.result)
    );
    
    // 4. 质量审查
    const quality = await this.qualityCheck(synthesis, plan);
    if (!quality.passed) {
      // 自动迭代修正
      return this.iterate(task, synthesis, quality.feedback);
    }
    
    return synthesis;
  }
  
  private async planTask(task: string): Promise<TaskPlan> {
    const response = await this.llm.invoke(`
      将以下任务分解为子任务，输出 JSON 数组：
      ${task}
      [{ "id": "1", "name": "搜索资料", "instruction": "...",
         "dependencies": [], "assignedTo": "researcher" }]
    `);
    return JSON.parse(response);
  }
  
  private selectWorker(step: TaskStep): WorkerAgent {
    // 基于任务类型和 Agent 能力路由
    return this.workers.get(step.assignedTo) || this.workers.get('general')!;
  }
}
```

#### 辩论模式 (Debate)

多个 Agent 就同一问题从不同角度分析，最终达成共识：

```typescript
class DebateAgent {
  private participants: Agent[];
  
  constructor(participants: Agent[]) {
    this.participants = participants;
  }

  async debate(question: string, rounds = 3): Promise<DebateResult> {
    let arguments_: string[] = [];
    
    for (let round = 0; round < rounds; round++) {
      // 每个 Agent 根据已有论点发表意见
      const roundResponses = await Promise.all(
        this.participants.map(agent => 
          agent.argue(question, arguments_, round)
        )
      );
      
      arguments_ = roundResponses;
      
      // 检查是否已达成共识
      const consensus = await this.checkConsensus(roundResponses);
      if (consensus.reached) {
        return {
          consensus: true,
          answer: consensus.answer,
          rounds: round + 1,
          arguments: arguments_,
        };
      }
    }
    
    // 投票决定最终答案
    return this.voteFinalAnswer(question, arguments_);
  }
  
  private async checkConsensus(responses: string[]): Promise<Consensus> {
    const analysis = await this.judgeModel.invoke(`
      以下 ${responses.length} 个 AI 对同一问题的回答：

      ${responses.map((r, i) => `Agent ${i}: ${r}`).join('
')}

      它们是否达成一致？如果一致，总结答案；否则说明分歧点。
    `);
    return this.parseConsensus(analysis);
  }
}
```

| 模式 | 参与者 | 通信方式 | 收敛速度 | 输出质量 |
|:---|:---:|:---:|:---:|:---:|
| **主管/工人** | 1主管 + N工人 | 星型拓扑 | 快 | ⭐⭐⭐⭐ |
| **辩论** | N个对等 Agent | 全连接 | 中 | ⭐⭐⭐⭐⭐ |
| **投票** | N个独立 Agent | 无通信 | 极快 | ⭐⭐⭐ |
| **流水线** | 链式 N 个 | 顺序传递 | 慢 | ⭐⭐⭐⭐ |

#### 错误恢复与自动修正

```typescript
class ResilientAgent {
  private maxRetries = 3;
  private fallbackTools: Map<string, Tool[]> = new Map();
  
  async executeWithFallback(step: Step): Promise<string> {
    const primaryTool = this.getPrimaryTool(step);
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await primaryTool.execute(step.params);
      } catch (error) {
        console.warn(`尝试 ${attempt + 1} 失败:`, error);
        
        // 尝试降级方案
        const fallbacks = this.fallbackTools.get(step.type);
        if (fallbacks?.length) {
          for (const fallback of fallbacks) {
            try {
              return await fallback.execute(step.params);
            } catch { /* continue */ }
          }
        }
        
        // 最后一次失败后重新规划
        if (attempt === this.maxRetries - 1) {
          return this.replan(step, error);
        }
        
        await this.delay(1000 * Math.pow(2, attempt));
      }
    }
    
    throw new Error(`步骤 ${step.id} 执行失败，已重试 ${this.maxRetries} 次`);
  }
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async replan(failedStep: Step, error: unknown): Promise<string> {
    return this.llm.invoke(`
      以下步骤执行失败：${failedStep.instruction}
      错误信息：${error}
      请提供一个替代方案来完成该步骤的目标。
    `);
  }
}
```

#### Agent 评估体系

评估 Agent 比评估纯 LLM 复杂得多，涉及执行成功率、工具选择正确性、路径效率等多维度。

| 评估维度 | 指标 | 采集方式 | 目标值 |
|:---|:---|:---|:---:|
| **任务完成率** | 指定任务的成功完成比例 | 人工标注 + 自动验证 | > 85% |
| **工具选择准确率** | 正确选择工具的次数 / 总调用次数 | 对比预期工具序列 | > 90% |
| **路径效率** | 实际步数 / 最优步数 | 基准测试集 | < 1.5x |
| **幻觉率** | 生成的事实性错误 / 总输出 | LLM-as-Judge 评估 | < 5% |
| **恢复率** | 从错误中自行恢复的比例 | 日志分析 | > 70% |
| **平均执行时间** | 从收到任务到返回结果的时间 | 计时埋点 | < 30s |

```typescript
// agent-evaluator.ts — Agent 自动化评估
interface AgentTestCase {
  task: string;
  expectedSteps: string[];      // 预期的工具调用序列
  expectedTools: string[];      // 预期的工具列表
  validateOutput: (output: string) => boolean;
}

class AgentEvaluator {
  async evaluate(agent: Agent, testCases: AgentTestCase[]) {
    const results = [];
    for (const testCase of testCases) {
      const startTime = Date.now();
      const { output, trace } = await agent.executeWithTrace(testCase.task);
      const elapsed = Date.now() - startTime;

      results.push({
        taskCompleted: testCase.validateOutput(output),
        toolAccuracy: this.matchToolSequence(trace.tools, testCase.expectedTools),
        pathEfficiency: trace.steps.length / testCase.expectedSteps.length,
        executionTime: elapsed,
        trace, // 保留完整轨迹用于分析
      });
    }
    return this.summarize(results);
  }

  private matchToolSequence(actual: string[], expected: string[]): number {
    const correct = actual.filter(t => expected.includes(t)).length;
    return correct / Math.max(actual.length, expected.length);
  }
}
```

#### Agent 执行轨迹追踪

调试 Agent 的核心难点在于理解 LLM 的推理链路。轨迹追踪记录每个 Thought-Action-Observation 循环。

```typescript
// agent-tracer.ts — Agent 推理过程全量追踪
interface TraceStep {
  thought: string;
  action: string;
  actionInput: Record<string, unknown>;
  observation: string;
  timestamp: number;
  duration: number;
}

class AgentTracer {
  private trace: TraceStep[] = [];
  private traces: TraceStep[][] = [];

  record(step: TraceStep): void {
    this.trace.push(step);
  }

  flush(): TraceStep[] {
    const snapshot = [...this.trace];
    this.traces.push(snapshot);
    this.trace = [];
    return snapshot;
  }

  // 可视化输出 — 适合在前端调试面板展示
  toDebugTree(): string {
    return this.trace.map((step, i) => `
      ┌─ Step ${i + 1} (${step.duration}ms)
      ├─ 💭 Thought: ${step.thought}
      ├─ 🔧 Action: ${step.action}(${JSON.stringify(step.actionInput)})
      └─ 👁 Observation: ${step.observation.slice(0, 100)}...
    `).join('
');
  }

  // 导出为 OpenTelemetry Span 用于监控
  toOtelSpans(): Span[] {
    return this.trace.map((step, i) => ({
      name: `agent.step.${i}`,
      attributes: { thought: step.thought, action: step.action },
      startTime: step.timestamp,
      endTime: step.timestamp + step.duration,
    }));
  }
}
```

---

### 🛠️ 工具链与函数调用优化

> **高效的工具调用**：减少 LLM 的工具选择错误率，提升 Agent 稳定性。

#### 工具描述的 Prompt 优化

工具描述的质量直接影响 LLM 正确选择工具的概率：

```typescript
// ❌ 不好的工具描述
const badTool: Tool = {
  name: 'search',
  description: '搜索功能',
  execute: async ({ q }) => { /* ... */ },
};

// ✅ 好的工具描述（RAS 原则 - Role + Action + Schema）
const goodTool: Tool = {
  name: 'web_search',
  description: `
    当用户询问最新信息、新闻、数据或你不知道的内容时使用。
    输入：
    - query (string, 必填): 搜索关键词，尽量使用中文
    - freshness (string, 可选): 'day' | 'week' | 'month' | 'year'
    输出：返回 5-10 条搜索结果，包含标题、链接和摘要
    注意：不要用此工具搜索用户个人信息或内部系统数据
  `,
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
      freshness: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
    },
    required: ['query'],
  },
  execute: async ({ query, freshness }) => { /* ... */ },
};
```

#### 工具调用成功的关键优化

| 优化点 | 方法 | 错误率降低 |
|:---|:---|:---:|
| **参数描述清晰** | 明确每个参数的类型、格式、默认值 | 减少 40% 参数错误 |
| **避免工具过多** | 注册的工具不超过 10 个，过多则分层分组 | 减少 30% 选错工具 |
| **错误信息友好** | 工具失败时返回人类可读的错误原因 | 提高 50% 自动恢复率 |
| **结果格式化** | 返回结构化数据而非纯文本 | 减少 30% 解析错误 |
| **超时控制** | 设置工具执行超时（默认 5s） | 防止 Agent 卡死 |

---

### 🧠 Agent 记忆与状态管理

> **记忆是 Agent 持续学习的基础**：区分短期记忆（对话上下文）和长期记忆（知识库）。

```typescript
class AgentMemory {
  private shortTerm: Map<string, string> = new Map(); // 本次会话记忆
  private longTerm: Map<string, StoredMemory> = new Map(); // 持久化记忆
  
  // 短期记忆 - 自动管理
  remember(key: string, value: string): void {
    this.shortTerm.set(key, value);
    // 当短期记忆超限时，自动归档重要内容到长期记忆
    if (this.shortTerm.size > 100) {
      this.archiveToLongTerm();
    }
  }
  
  recall(key: string): string | undefined {
    return this.shortTerm.get(key) || this.longTerm.get(key)?.content;
  }
  
  // 长期记忆 - 基于重要性的持久化
  private async archiveToLongTerm(): Promise<void> {
    const entries = Array.from(this.shortTerm.entries());
    
    // 让 LLM 判断哪些信息值得长期保存
    const important = await this.judgeModel.invoke(`
      以下对话记忆中，哪些应该长期保存？只返回 JSON key 数组：
      ${JSON.stringify(Object.fromEntries(entries))}
    `);
    
    const importantKeys = JSON.parse(important);
    for (const key of importantKeys) {
      this.longTerm.set(key, {
        content: this.shortTerm.get(key)!,
        storedAt: Date.now(),
        accessCount: 0,
      });
    }
    
    this.shortTerm.clear();
  }
  
  // 定期清理低价值记忆
  prune(): void {
    const now = Date.now();
    for (const [key, memory] of this.longTerm) {
      // 超过 30 天未访问且访问次数低于 3 次则删除
      if (now - memory.storedAt > 30 * 24 * 3600 * 1000 && memory.accessCount < 3) {
        this.longTerm.delete(key);
      }
    }
  }
}

interface StoredMemory {
  content: string;
  storedAt: number;
  accessCount: number;
}
```

---

### 🎨 Agent UX 设计模式

Agent 的异步、多步特性需要特殊的 UI 模式来确保用户可理解、可控。

#### 流式思维展示 (Streaming Thoughts)

```typescript
import React from 'react';
// React 组件：Agent 思维过程实时展示
function AgentThoughtStream({ trace }: { trace: AgentTrace }) {
  return (
    <div className="agent-thought-tree">
      {trace.steps.map((step, i) => (
        <div key={i} className="step-card">
          <div className="step-header">
            <span className="step-number">Step {i + 1}</span>
            <span className="step-duration">{step.duration}ms</span>
          </div>
          <div className="thought-bubble">
            💭 {step.thought}
          </div>
          {step.action && (
            <div className="action-call">
              🔧 调用工具: <code>{step.action}</code>
              <pre>{JSON.stringify(step.actionInput, null, 2)}</pre>
            </div>
          )}
          <div className="observation-result">
            👁 {step.observation}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 人机协同 (Human-in-the-Loop)

某些高风险操作需用户确认后才能执行：

```typescript
import React from 'react';
// HITL 模式 — 工具调用前请求用户批准
const sensitiveTools = new Set(['send_email', 'delete_data', 'execute_payment']);

class HITLGuard {
  async execute(toolName: string, args: unknown, onUserConfirm: () => Promise<boolean>): Promise<unknown> {
    if (!sensitiveTools.has(toolName)) {
      const tool = this.toolRegistry.get(toolName);
      if (!tool) throw new Error(`Tool "${toolName}" not found`);
      return tool.execute(args); // 低风险工具直接执行
    }

    // 高风险工具：先展示给用户
    const approved = await onUserConfirm();
    if (!approved) {
      throw new HITLRejectedError(`用户拒绝了工具调用: ${toolName}`);
    }
    const tool = this.toolRegistry.get(toolName);
    if (!tool) throw new Error(`Tool "${toolName}" not found`);
    return tool.execute(args);
  }
}

// 前端组件：用户确认对话框
function ToolApprovalDialog({ tool, args, onConfirm, onReject }: Props) {
  return (
    <div className="hitl-dialog">
      <h3>⚠️ Agent 请求执行敏感操作</h3>
      <p>工具: <strong>{tool}</strong></p>
      <pre>{JSON.stringify(args, null, 2)}</pre>
      <div className="dialog-actions">
        <button onClick={onReject} className="btn-danger">拒绝</button>
        <button onClick={onConfirm} className="btn-primary">确认执行</button>
      </div>
    </div>
  );
}
```

---

### ❓ 常见问题与自测

#### Q1: ReAct 和 Plan-and-Execute 模式分别适用于什么类型的任务？请各举一个实际案例。

**考察点**: Agent 设计模式选型

> **回答要点**:
> 1. **ReAct 模式**:
>    - 特点: 交替进行推理（Reason）和行动（Act），逐步解决问题
>    - 适用: 探索性任务、需要动态调整策略、信息不完整
>    - 案例: "帮我查找并预订明天北京到上海的最便宜航班"（需要搜索、比较、预订）
> 2. **Plan-and-Execute 模式**:
>    - 特点: 先制定完整计划，再按步骤执行
>    - 适用: 流程固定、步骤明确、可预测的任务
>    - 案例: "生成月度销售报告"（获取数据→分析→生成图表→撰写报告）
> 3. **选择依据**: 任务的不确定性和复杂度
> 4. **混合模式**: 先规划大框架，每个步骤内用 ReAct
> 5. **实际应用**: 大多数生产系统采用混合模式
>
> 💡 **关键要点**: 不确定性高用 ReAct，流程固定用 Plan-and-Execute

#### Q2: 如何防止 Agent 陷入无限循环（同一工具反复调用）？有哪些检测和恢复机制？

**考察点**: Agent 安全机制

> **回答要点**:
> 1. **检测机制**:
>    - 工具调用计数: 设置同一工具最大连续调用次数（如 3 次）
>    - 状态哈希: 记录每次调用的状态，检测重复状态
>    - 超时检测: 设置单次任务最大执行时间
>    - 成本监控: 设置 Token 消耗上限
> 2. **恢复机制**:
>    - 强制中断: 超过阈值后强制停止 Agent
>    - 策略切换: 从 ReAct 切换到 Plan-and-Execute
>    - 人工介入: 触发 Human-in-the-Loop 审批
>    - 回滚重试: 回到上一个有效状态，尝试不同策略
> 3. **预防措施**:
>    - 优化工具描述，避免歧义
>    - 提供示例调用，引导正确使用
>    - 实现工具推荐系统，减少选择错误
> 4. **监控告警**: 记录工具调用日志，异常时告警
> 5. **最佳实践**: 设置多层防护（计数→超时→成本→人工）
>
> 💡 **关键要点**: 检测重复状态 + 多层防护 + 优雅降级

#### Q3: 工具描述的质量如何影响 Agent 的工具选择准确率？RAS 原则是什么？

**考察点**: 工具设计原则

> **回答要点**:
> 1. **工具描述影响**:
>    - 描述模糊: Agent 可能选择错误工具或误用
>    - 描述过长: 增加 Token 消耗，可能超出上下文窗口
>    - 缺少示例: Agent 不知道如何正确调用
> 2. **RAS 原则**:
>    - **R**elevant（相关性）: 工具名称和描述应准确反映其功能
>    - **A**ctionable（可操作性）: 描述应包含使用场景和限制
>    - **S**pecific（具体性）: 避免泛泛而谈，提供具体示例
> 3. **好的工具描述示例**:
>    ```
>    search_web: 在网络上搜索信息。
>    - 输入: query (string) - 搜索关键词
>    - 输出: results (array) - 搜索结果列表
>    - 限制: 每次最多返回 10 条结果
>    - 示例: search_web({ query: "React 19 新特性" })
>    ```
> 4. **评估方法**: A/B 测试不同描述的工具选择准确率
> 5. **迭代优化**: 根据 Agent 实际调用情况持续优化描述
>
> 💡 **关键要点**: 好的工具描述 = 相关 + 可操作 + 具体

#### Q4: Multi-Agent 系统中，主管/工人模式和辩论模式各有什么优缺点？如何选择？

**考察点**: 多 Agent 协作

> **回答要点**:
> 1. **主管/工人模式**:
>    - 优点: 结构清晰，职责明确，易于管理
>    - 缺点: 主管是单点故障，可能成为瓶颈
>    - 适用: 任务可明确分工，需要统一协调
>    - 案例: 客服系统（主管分配工单，工人处理具体问题）
> 2. **辩论模式**:
>    - 优点: 多角度思考，减少偏见，提高决策质量
>    - 缺点: 协调复杂，可能产生冲突，耗时较长
>    - 适用: 需要多角度分析，决策质量优先
>    - 案例: 技术选型（多个 Agent 从不同角度评估方案）
> 3. **选择依据**:
>    - 任务类型: 分工明确用主管/工人，需要辩论用辩论模式
>    - 时间要求: 时间紧用主管/工人，时间充裕用辩论模式
>    - 质量要求: 质量优先用辩论模式
> 4. **混合模式**: 主管/工人 + 内部辩论（工人之间先辩论，主管做最终决策）
> 5. **实际应用**: 大多数系统采用主管/工人模式，关键决策引入辩论
>
> 💡 **关键要点**: 主管/工人适合分工，辩论适合决策，可混合使用

#### Q5: 什么是 Human-in-the-Loop？在 Agent 设计中哪些场景必须引入人工审批？

**考察点**: 人机协同设计

> **回答要点**:
> 1. **Human-in-the-Loop 定义**: 在 Agent 执行过程中，关键节点需要人工确认或干预
> 2. **必要场景**:
>    - **高风险操作**: 删除数据、发送邮件、金融交易
>    - **不可逆操作**: 代码部署、配置修改、权限变更
>    - **敏感信息**: 处理个人隐私、商业机密
>    - **不确定决策**: Agent 置信度低于阈值时
>    - **合规要求**: 法律、审计、监管要求
> 3. **实现方式**:
>    - 审批队列: 操作进入队列，等待人工审批
>    - 实时通知: 通过 Slack/邮件通知，限时审批
>    - 策略配置: 根据风险等级自动设置审批策略
> 4. **用户体验**:
>    - 提供清晰的操作说明和风险提示
>    - 支持批量审批，提高效率
>    - 记录审批日志，便于审计
> 5. **平衡效率与安全**: 低风险操作自动执行，高风险操作强制审批
>
> 💡 **关键要点**: 高风险/不可逆/敏感操作必须引入人工审批

---

### 🏆 阶段四实战项目

| 项目 | 难度 | 核心考察点 | 完成标准 |
|:---|:---:|:---|:---|
| 🟢 **研究助手 Agent** | ⭐⭐⭐⭐ | 搜索、摘要、多步规划 | 自动生成行业研究报告 |
| 🔵 **代码助手 Agent** | ⭐⭐⭐⭐⭐ | 代码理解、Bug 修复、测试生成 | 能修复简单 Bug 并写单测 |
| 🟣 **自动化工作流** | ⭐⭐⭐⭐⭐ | 多工具编排、错误恢复 | 自动完成订票、发邮件等任务 |

---

### 📎 延伸阅读

| 文档 | 内容 | 相关章节 |
|:---|:---|:---|
| [📊 技术选型对比合集](./07-技术选型对比合集.md) | Agent 平台对比、智能体方案评估 | 常用 AI 智能体平台对比 |
| [🛠️ 开发实战与架构指南](./08-开发实战与架构指南.md) | LangGraph 工作流编排、Prompt 进阶 | 第5章：LangGraph 工作流编排 |

---

### 🎯 本章核心总结

> **Agent的本质**：一个LLM在循环里不断调用工具，直到完成目标。辅以规划、记忆和推理框架来提升决策质量。

**六大支柱协同运作：**

| 支柱 | 作用 | 关键点 |
|:---|:---|:---|
| **Agent Loop** | 持续循环是Agent的本质 | while(工具调用) → 执行 → 喂回 → 再想 |
| **记忆系统** | 持久化让Agent"越用越懂你" | 短期（Context Window）+ 中期（Session）+ 长期（持久化存储） |
| **工具系统** | 真正做事的能力 | MCP = AI界的USB-C，统一接口标准 |
| **Context Engine** | 统筹所有信息 | 组装完整prompt，管理Context Budget |
| **推理引擎** | 决定策略和模型 | 主模型+辅助模型级联，降低成本 |
| **上下文压缩** | 管理有限资源 | 历史过长时摘要、提取关键节点 |

> 📌 **黄金法则**（来自Anthropic）：
> - 能用Workflow搞定的别上Agent
> - 能用单Agent搞定的别上Multi-Agent
> - 复杂度不是能力的证明，可靠性才是

**Agent vs 大模型的关系（来自华为云）：**

| Agent中的环节 | 对应大模型的能力 |
|:---|:---|
| 用户输入 → 分词 | Token化处理 |
| Token → 向量 | Embedding语义理解 |
| 理解上下文 | Attention注意力机制 |
| 输出token（文本或JSON） | 推理生成（Function Calling本质就是JSON） |
| 上下文越来越长 | 上下文窗口管理 |

> 大模型系列讲的是"大脑怎么工作"，Agent系列讲的是"大脑怎么指挥四肢"。
> 大脑 + 四肢 = 完整的 AI Agent
