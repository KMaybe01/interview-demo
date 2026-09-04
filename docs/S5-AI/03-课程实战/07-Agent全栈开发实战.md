# AI Agent 全栈开发实战

> 涵盖：AI Agent 原理 → LLM 选型 → LangChain 框架 → LCEL 组件化 → RAG 系统 → 单/多 Agent 实现 → LangGraph 编排 → 部署优化 → CrewAI 框架

## 文档导航地图

```mermaid
flowchart TB
    subgraph 基础
        L1[§1 课程安排] --> L2[§2 AI Agent 概念]
        L2 --> L3[§3 大模型选型]
        L3 --> L4[§4 开发必备]
        L4 --> L5[§5 DeepSeek]
    end

    subgraph LangChain 核心
        L5 --> LC1[§6 LangChain 入门]
        LC1 --> LC2[§7 ChatModels]
        LC2 --> LC3[§8 Prompt 工程]
        LC3 --> LC4[§9 OutputParsers]
        LC4 --> LC5[§10 LCEL]
    end

    subgraph Agent 实战
        LC5 --> A1[§11 RAG 系统]
        A1 --> A2[§12 单 Agent]
        A2 --> A3[§13 多 Agent]
        A3 --> A4[§14 部署优化]
    end

    subgraph 扩展框架
        A4 --> E1[§15 CrewAI]
        E1 --> E2[§16 总结]
    end

    style A3 fill:#4a90d9,color:#fff
    style A4 fill:#4a90d9,color:#fff
    style E1 fill:#6bb86b,color:#fff
```

---

## 0. 快速入门与课程总览

### 课程知识架构

```mermaid
flowchart LR
    subgraph 板块一[板块一：Agent 基础与认知]
        D1[Agent 概念] --> D2[LLM 原理]
        D2 --> D3[DeepSeek 实践]
    end

    subgraph 板块二[板块二：LangChain 核心框架]
        F1[LangChain 入门] --> F2[ChatModels]
        F2 --> F3[Prompt 工程]
        F3 --> F4[OutputParsers]
        F4 --> F5[LCEL 组件化]
    end

    subgraph 板块三[板块三：Agent 系统实战]
        G1[RAG 知识增强] --> G2[单 Agent 实现]
        G2 --> G3[多 Agent 编排]
        G3 --> G4[部署与优化]
    end

    subgraph 板块四[板块四：框架扩展]
        H1[CrewAI] --> H2[课程总结]
    end
```

### 学习路径

| 阶段 | 章节 | 目标 |
|------|------|------|
| 基础认知 | §1~§5 | 理解 Agent 概念、LLM 原理、DeepSeek 实践 |
| 框架掌握 | §6~§10 | 熟练使用 LangChain 核心组件 |
| 系统实战 | §11~§14 | 独立构建单/多 Agent 系统并部署 |
| 框架扩展 | §15~§16 | 掌握 CrewAI，融会贯通 |

---

## 1. 课程学习安排——助你顺利学习以及避坑

### 1.1 课程体系概览

本课程采用**阶梯式**教学设计，从 Agent 基础概念入手，逐步深入到 LangChain 框架、RAG 系统、单/多 Agent 实现，最后覆盖部署优化与 CrewAI 框架。

```mermaid
flowchart TB
    课程目标[掌握 AI Agent 全栈开发能力] --> 阶段1[基础认知]
    阶段1 --> 阶段2[框架掌握]
    阶段2 --> 阶段3[系统实战]
    阶段3 --> 阶段4[框架扩展]

    阶段1 --> P1[Agent 概念<br/>LLM 原理<br/>DeepSeek]
    阶段2 --> P2[LangChain<br/>ChatModels<br/>Prompt 工程<br/>LCEL]
    阶段3 --> P3[RAG 系统<br/>单 Agent<br/>多 Agent<br/>部署优化]
    阶段4 --> P4[CrewAI<br/>总结展望]
```

### 1.2 学习建议

- **动手实践**：每章提供代码示例和练一练环节，务必亲自动手
- **循序渐进**：不建议跳章学习，尤其是 LangChain 基础部分
- **项目驱动**：跟随"小浪助手"项目案例，将知识串联成完整系统
- **避坑指南**：
  - API Key 安全管理，切勿提交到版本控制
  - Token 消耗监控，避免意外费用
  - 本地模型与云端模型的选型权衡

### 1.3 环境准备概览

| 工具/框架 | 用途 | 安装方式 |
|-----------|------|----------|
| Node.js 18+ | TypeScript 运行环境 | \winget install OpenJS.NodeJS.LTS\ |
| TypeScript | 开发语言 | \
pm i -g typescript\ |
| LangChain | Agent 编排框架 | \
pm i @langchain/core @langchain/community\ |
| LangGraph | 多 Agent 工作流 | \
pm i @langchain/langgraph\ |
| Ollama | 本地模型推理 | \winget install Ollama.Ollama\ |

---

## 2. AI 智能体：AI 3.0 时代最大的转型红利

### 2.1 智能体定义与核心特征

AI Agent（智能体）是能够**自主感知环境、做出决策并执行行动**的智能系统。核心循环为：

```mermaid
flowchart LR
    A[感知<br/>Perception] --> B[推理<br/>Reasoning]
    B --> C[行动<br/>Action]
    C --> D[观察<br/>Observation]
    D --> B
```

**三大核心能力：**

| 能力 | 说明 | 类比 |
|------|------|------|
| Planning（规划） | 将复杂任务分解为子任务并制定执行计划 | 项目经理 |
| Memory（记忆） | 短期记忆（上下文窗口）+ 长期记忆（向量数据库） | 人类大脑 |
| Tool Use（工具使用） | 调用外部 API、数据库、搜索引擎等工具 | 人的双手 |

### 2.2 AI 发展的三个阶段

```mermaid
flowchart LR
    subgraph AI1_0[AI 1.0 分析式 AI]
        T1[图像识别<br/>语音识别<br/>推荐系统]
    end

    subgraph AI2_0[AI 2.0 生成式 AI]
        T2[文本生成<br/>代码生成<br/>文生图]
    end

    subgraph AI3_0[AI 3.0 智能体 AI]
        T3[自主决策<br/>工具调用<br/>多步推理]
    end

    AI1_0 --> AI2_0 --> AI3_0
```

### 2.3 Agent 核心架构模式

**ReAct（Reasoning + Acting）模式**——当前最主流的 Agent 架构：

```typescript
interface AgentState {
  task: string;
  steps: AgentStep[];
  finalAnswer: string | null;
}

interface AgentStep {
  thought: string;
  action: string;
  actionInput: Record<string, unknown>;
  observation: string;
}

async function reactAgent(task: string, maxSteps = 10): Promise<string> {
  const state: AgentState = { task, steps: [], finalAnswer: null };

  for (let i = 0; i < maxSteps; i++) {
    const thought = await reason(state);

    if (thought.includes("Final Answer:")) {
      state.finalAnswer = thought.replace("Final Answer:", "").trim();
      break;
    }

    const { action, input } = parseAction(thought);
    const observation = await executeTool(action, input);

    state.steps.push({ thought, action, actionInput: input, observation });
  }

  return state.finalAnswer ?? "达到最大步数，未得到最终答案";
}
```

### 2.4 企业级 Agent 应用场景

| 场景 | 描述 | 典型工具 |
|------|------|----------|
| 智能客服 | 7x24 自动回答，复杂问题转人工 | 知识库 + 工单系统 |
| 代码助手 | 代码生成、审查、重构 | IDE 插件 + Git |
| 数据分析 | 自然语言查询数据库并生成报表 | SQL + 可视化库 |
| 自动化流程 | 多步骤业务流程自动化 | API 编排 + RPA |

---

## 3. 大模型：智能体的超级大脑

### 3.1 LLM 发展历程

```mermaid
timeline
    title 大语言模型发展历程
    2017 : Transformer 论文发表
    2018 : GPT-1 / BERT 诞生
    2020 : GPT-3 (175B) 展现涌现能力
    2022 : ChatGPT 引爆全球
    2023 : Llama 2 / GPT-4 / Claude
    2024 : Llama 3 / DeepSeek V2 / Qwen 2
    2025 : DeepSeek R1 / Llama 4 / Gemini 2.5
```

### 3.2 Agent 视角的 LLM 能力要求

| 能力 | 重要性 | 代表模型 |
|------|--------|----------|
| Tool Calling（函数调用） | ⭐⭐⭐ | GPT-4o, DeepSeek, Llama 3.1+ |
| 长上下文 | ⭐⭐⭐ | Gemini 1M, GPT-4o 128K |
| JSON Mode | ⭐⭐⭐ | GPT-4o-mini, Ollama 模型 |
| 推理能力 | ⭐⭐⭐ | DeepSeek R1, o1/o3, Claude 3.5 |

### 3.3 开源 vs 闭源模型选型

```mermaid
flowchart TB
    选型决策[模型选型] --> 数据隐私{数据是否敏感}
    数据隐私 -->|是| 开源[开源模型]
    数据隐私 -->|否| 闭源[闭源 API]

    开源 --> O1[Ollama 本地部署]
    开源 --> O2[vLLM 高性能推理]
    闭源 --> C1[OpenAI / Anthropic]
    闭源 --> C2[DeepSeek / 百度千帆]

    O1 --> 适用1[个人开发 / 原型验证]
    O2 --> 适用2[企业私有部署]
    C1 --> 适用3[国际业务 / 高要求]
    C2 --> 适用4[国内业务 / 合规需求]
```

### 3.4 大模型的局限性及应对

| 局限性 | 表现 | 解决方案 |
|--------|------|----------|
| 知识截止 | 不知道最新事件 | RAG + 实时搜索 |
| 幻觉 | 生成虚假信息 | 检索验证 + 约束生成 |
| 数学计算 | 简单算术错误 | 代码解释器工具 |
| 长文本遗忘 | 丢失上下文 | 滑动窗口 + 摘要压缩 |

---

## 4. AI 应用开发应知必会的那些事

### 4.1 如何正确使用 AI 编程

AI 编程核心原则：**将其视为高级结对编程伙伴，而非独立替代者**。

```typescript
// 正确提示词结构
const PROMPT_TEMPLATE = \
Role: 你是一个资深 TypeScript 开发者
Context: 我在构建一个 Agent 系统，使用 LangChain
Task: 实现一个带重试机制的工具调用函数
Constraints: 使用 TypeScript，错误处理完善
Example: 输入/输出示例
\;
```

### 4.2 Prompt Engineering 基本原理

**思维流模式**引导模型逐步推理：

```typescript
// Chain of Thought (CoT)
const COT_PROMPT = \问题：Agent 每步耗时 2 秒，平均 5 步完成一个任务，
同时处理 10 个并发请求，每分钟能完成多少？

逐步思考：
1. 每个任务：5 步 x 2 秒 = 10 秒
2. 单 Agent 每分钟：60 / 10 = 6 个
3. 10 个并发：6 x 10 = 60 个/分钟

答案：60 个任务/分钟\;
```

### 4.3 小浪助手项目概览

| 形态 | 架构 | 能力 |
|------|------|------|
| 单 Agent 版 | 1 Agent + 工具集 | 情感检测、知识库问答、钉钉通知 |
| 多 Agent 版 | LangGraph 编排 | 任务分解、协作执行、人机交互 |

### 4.4 AI 行业信息渠道

| 渠道 | 频率 |
|------|------|
| GitHub Trending | 每日 |
| Hugging Face Daily Papers | 每日 |
| 机器之心 / 量子位 | 每日 |
| LangChain Blog | 每周 |
| OpenAI / Anthropic Blog | 不定期 |

---

## 5. DeepSeek：国产之光

### 5.1 DeepSeek 模型矩阵

| 模型 | 参数量 | 特点 | API 价格 |
|------|--------|------|----------|
| DeepSeek V3 | 671B MoE | 通用对话，媲美 GPT-4o | 极低 |
| DeepSeek R1 | 671B MoE | 推理增强，数学/代码突出 | 极低 |

### 5.2 推理大模型的核心创新

```mermaid
flowchart LR
    subgraph 传统LLM[传统 LLM]
        A1[输入] --> A2[直接输出]
        A2 --> A3[结果]
    end

    subgraph 推理LLM[DeepSeek R1]
        B1[输入] --> B2[内化推理链]
        B2 --> B3[自我验证]
        B3 --> B4[修正推理]
        B4 --> B5[最终输出]
    end
```

| 维度 | DeepSeek V3 | DeepSeek R1 |
|------|-------------|-------------|
| 推理方式 | 直接生成答案 | 内化 CoT |
| 数学能力 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 代码能力 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 延迟 | 低 | 较高 |
| 适用场景 | 通用对话、写作 | 数学、代码、推理 |

### 5.3 DeepSeek 云端 API 集成

```typescript
import { ChatDeepSeek } from "@langchain/deepseek";

const model = new ChatDeepSeek({
  model: "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const response = await model.invoke([
  { role: "system", content: "你是一个 AI 助手。" },
  { role: "user", content: "搜索最新 AI 新闻" },
], {
  tools: [{
    type: "function",
    function: {
      name: "search_news",
      description: "搜索新闻",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  }],
});
```

### 5.4 10 个 DeepSeek 魔法指令

| 指令 | 示例 | 用途 |
|------|------|------|
| 角色扮演 | "你是一个资深架构师" | 设定专业角色 |
| 格式约束 | "用 JSON 格式输出" | 结构化输出 |
| 分步推理 | "请逐步分析" | 激活推理能力 |
| 示例引导 | "参考以下示例" | Few-shot 学习 |
| 反思修正 | "检查你的回答" | 自我验证 |
| 约束条件 | "不超过 200 字" | 长度控制 |
| 风格指定 | "用通俗语言" | 适配受众 |
| 多轮引导 | "基于上一步继续" | 复杂任务分解 |
| 反向激励 | "如果你是专家" | 提升质量 |
| 角色辩论 | "正反两方面分析" | 多角度思考 |

---


## 6. 初识 LangChain：LLM 大模型与 AI 应用的"粘合剂"

### 6.1 LangChain 是什么

LangChain 是**大语言模型应用开发框架**，提供标准化接口连接 LLM、构建链式工作流、集成外部工具。

```mermaid
flowchart TB
    subgraph 应用层[AI 应用]
        A[聊天机器人] --> B[RAG 系统]
        B --> C[Agent 智能体]
    end

    subgraph LangChain[LangChain 框架]
        LC[Core 核心抽象] --> LC1[Models]
        LC --> LC2[Prompts]
        LC --> LC3[Chains / LCEL]
        LC --> LC4[Agents]
        LC --> LC5[Memory]
        LC --> LC6[Retrievers]
    end

    subgraph 模型层[LLM 提供商]
        M1[OpenAI] --> M2[Anthropic]
        M2 --> M3[DeepSeek]
        M3 --> M4[Ollama]
    end

    LangChain --> 模型层
```

### 6.2 核心能力一览

| 模块 | 功能 | 核心类 |
|------|------|--------|
| Models | 统一 LLM 调用接口 | \BaseChatModel\ |
| Prompts | 模板化提示词管理 | \ChatPromptTemplate\ |
| Chains | 串联处理步骤 | \RunnableSequence\ |
| Agents | 自主决策与工具调用 | \AgentExecutor\ |
| Memory | 对话历史管理 | \BaseChatMemory\ |
| Retrievers | 文档检索增强 | \BaseRetriever\ |
| Tools | 外部工具集成 | \DynamicStructuredTool\ |

### 6.3 优势与劣势

**优势：** 统一抽象屏蔽 LLM 差异、丰富生态、组件化可组合、LCEL 声明式范式

**劣势：** 版本迭代快 API 变化频繁、抽象复杂调试困难、体积较大

### 6.4 第一个 LangChain 实例

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个 AI 助手。"],
  ["human", "{input}"],
]);

const chain = prompt.pipe(model).pipe(new StringOutputParser());

const result = await chain.invoke({
  input: "用一句话解释什么是 AI Agent",
});
```

---

## 7. ChatModels：磨平不同 LLM 的差异

### 7.1 LLMs vs ChatModels

| 类型 | 输入 | 输出 | 适用场景 |
|------|------|------|----------|
| \LLM\ (旧) | 纯文本 string | 纯文本 string | 简单文本生成 |
| \ChatModel\ (推荐) | \BaseMessage[]\ | \AIMessage\ | 对话、工具调用 |

**始终使用 ChatModel。**

### 7.2 统一模型调用

```typescript
import { ChatOllama } from "@langchain/ollama";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

function createModel(provider: string): BaseChatModel {
  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        model: "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
      });
    case "deepseek":
      return new ChatDeepSeek({
        model: "deepseek-chat",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });
    case "ollama":
      return new ChatOllama({
        model: "llama3.2",
        baseUrl: "http://localhost:11434",
      });
    default:
      throw new Error("Unknown provider: " + provider);
  }
}
```

### 7.3 Token 与上下文监控

```typescript
const response = await model.invoke("Hello");

console.log({
  inputTokens: response.usage_metadata?.input_tokens,
  outputTokens: response.usage_metadata?.output_tokens,
  totalTokens: response.usage_metadata?.total_tokens,
});
```

| 模型 | 上下文窗口 | 适合场景 |
|------|-----------|----------|
| GPT-4o | 128K | 长文档分析、复杂 Agent |
| DeepSeek | 64K | 通用开发 |
| Llama 3.2 | 128K | 本地部署 |
| Gemini 2.5 | 1M | 极限长上下文 |

### 7.4 异常处理与缓存

```typescript
async function safeModelCall(
  model: BaseChatModel,
  messages: BaseMessage[],
  options?: { maxRetries?: number }
): Promise<AIMessage> {
  const maxRetries = options?.maxRetries ?? 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.invoke(messages);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error("Unreachable");
}
```

### 7.5 Ollama 本地模型集成

```typescript
import { ChatOllama } from "@langchain/ollama";

const localModel = new ChatOllama({
  model: "llama3.2:3b",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
});

// 工具调用
const response = await localModel.invoke(
  [{ role: "user", content: "北京的天气怎么样？" }],
  {
    tools: [{
      name: "get_weather",
      description: "查询天气",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    }],
  }
);
```

### 7.6 Tool Calling 流程

```mermaid
flowchart LR
    U[用户请求] --> M[LLM 推理]
    M --> D{需用工具？}
    D -->|是| T1[选择工具<br/>填充参数]
    T1 --> T2[执行工具<br/>获取结果]
    T2 --> M
    D -->|否| R[直接回答]
```

---

## 8. PromptTemple 提示词工程在 LangChain 中的实践

### 8.1 五种 Prompt 模板

```typescript
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

// 1. 字符串模板
const stringPrompt = ChatPromptTemplate.fromTemplate(
  "请用{language}回答：{question}"
);

// 2. 对话模板
const chatPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个{role}专家。"],
  ["human", "{input}"],
]);

// 3. 消息占位符 —— 动态插入历史
const placeholderPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个 AI 助手。"],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);

// 4. Message 组合模板
const combinedPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate("系统：{system_prompt}"),
  HumanMessagePromptTemplate.fromTemplate("用户：{input}"),
]);

// 5. 自定义模板
class MyCustomPrompt extends BaseMessagePromptTemplate {
  async formatMessages(values: Record<string, unknown>): Promise<BaseMessage[]> {
    return [new SystemMessage(JSON.stringify(values))];
  }
}
```

### 8.2 Few-Shot 学习

```typescript
import { FewShotChatMessagePromptTemplate } from "@langchain/core/prompts";

const examples = [
  { input: "翻译 hello", output: "你好" },
  { input: "翻译 goodbye", output: "再见" },
];

const examplePrompt = ChatPromptTemplate.fromMessages([
  ["human", "{input}"],
  ["ai", "{output}"],
]);

const fewShotPrompt = new FewShotChatMessagePromptTemplate({
  examplePrompt,
  examples,
  inputVariables: ["input"],
});

const finalPrompt = ChatPromptTemplate.fromMessages([
  ["system", "翻译助手。"],
  fewShotPrompt,
  ["human", "{input}"],
]);

const result = await finalPrompt.invoke({ input: "翻译 computer" });
```

### 8.3 示例选择器

```typescript
import { SemanticSimilarityExampleSelector } from "@langchain/core/example_selectors";
import { OpenAIEmbeddings } from "@langchain/openai";

// 按语义相似度选择
const selector = await SemanticSimilarityExampleSelector.fromExamples(
  examples,
  new OpenAIEmbeddings(),
  { k: 3 }
);

// MMR —— 兼顾相关性与多样性
const mmrSelector = await SemanticSimilarityExampleSelector.fromExamples(
  examples,
  new OpenAIEmbeddings(),
  { k: 3, fetchK: 10, lambda: 0.5 }
);
```

### 8.4 LangChain Hub

```typescript
import { Hub } from "@langchain/core/hub";

// 加载社区提示词
const prompt = await Hub.pull("rlm/rag-prompt");

// 推送（需 Token）
await Hub.push("my-user/my-prompt", prompt, { newRepoIsPublic: false });
```

---

## 9. 规范化输出：OutputParsers 的关键技术

### 9.1 解析器家族

```mermaid
flowchart TB
    subgraph OutputParsers[OutputParsers 解析器]
        P1[StringOutputParser]
        P2[JsonOutputParser]
        P3[StructuredOutputParser]
        P4[CustomOutputParser]
    end

    P1 --> S1[文本生成]
    P2 --> S2[API 数据]
    P3 --> S3[Schema 验证]
    P4 --> S4[自定义格式]
```

### 9.2 解析器实战

```typescript
import { StringOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

// StringOutputParser
const stringParser = new StringOutputParser();

// JsonOutputParser
const jsonParser = new JsonOutputParser();

// StructuredOutputParser —— Zod Schema
const schema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().min(0).max(150),
  skills: z.array(z.string()),
});

const structuredParser = StructuredOutputParser.fromZodSchema(schema);
const instructions = structuredParser.getFormatInstructions();

const result = await chain.pipe(structuredParser).invoke({
  input: "张三，28岁，擅长 TypeScript 和 Python",
  format_instructions: instructions,
});
// => { name: "张三", age: 28, skills: ["TypeScript", "Python"] }
```

### 9.3 容错机制

```typescript
import { OutputFixingParser } from "@langchain/core/output_parsers";

// 自动修复解析失败
const fixParser = OutputFixingParser.fromLLM(
  new ChatOpenAI({ model: "gpt-4o-mini" }),
  { parser: structuredParser }
);

try {
  const result = await fixParser.parse(badOutput);
} catch (error) {
  console.error("解析修复失败", error);
}
```

---


## 10. LCEL：组件化开发的新范式

### 10.1 LCEL 简介

LCEL（LangChain Expression Language）使用 **管道操作符（|）** 声明式地组合 LangChain 组件，是 LangChain 推荐的链式编程方式。

```mermaid
flowchart LR
    A[Prompt] -->|pipe| B[Model]
    B -->|pipe| C[OutputParser]
    C -->|pipe| D[Result]
```

### 10.2 链的基本应用

```typescript
import { RunnableSequence, RunnableParallel } from "@langchain/core/runnables";

// 管道操作符快速构建链
const chain = prompt.pipe(model).pipe(new StringOutputParser());
const result = await chain.invoke({ input: "你好" });

// 流式调用
const stream = await chain.stream({ input: "写一首诗" });
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// 并行运行多条链
const parallelChain = RunnableParallel.from({
  summary: summaryChain,
  translation: translationChain,
  sentiment: sentimentChain,
});

const results = await parallelChain.invoke({ text: "I love AI" });
// => { summary: "...", translation: "...", sentiment: "positive" }
```

### 10.3 链的高级应用

```typescript
import { RunnablePassthrough, RunnableLambda } from "@langchain/core/runnables";

// 在链中使用函数
const chain = prompt
  .pipe(model)
  .pipe(new StringOutputParser())
  .pipe(RunnableLambda.from((text: string) => text.trim()));

// 使用 RunnablePassthrough 传递值
const chainWithPass = RunnableSequence.from([
  { context: retriever, question: new RunnablePassthrough() },
  prompt,
  model,
  parser,
]);

// 自定义支持流输出的函数
const streamingFunc = RunnableLambda.from(async function* (input: string) {
  for (const char of input) {
    yield char;
    await new Promise(r => setTimeout(r, 10));
  }
});

// 运行时动态配置
const configurableChain = prompt.pipe(model).pipe(parser);
const result = await configurableChain.invoke(
  { input: "你好" },
  { configurable: { model: "gpt-4" } }
);
```

### 10.4 链的记忆能力

```typescript
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

// 短期记忆（InMemoryHistory）
const history = new InMemoryChatMessageHistory();
const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: () => history,
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// Redis 长期记忆
import { RedisChatMessageHistory } from "@langchain/redis";

const redisHistory = new RedisChatMessageHistory({
  sessionId: "user-123",
  sessionTTL: 86400,  // 24 小时过期
  config: { url: process.env.REDIS_URL },
});
```

### 10.5 自定义路由链

```typescript
function routeByIntent(input: { text: string }): Runnable {
  const intent = detectIntent(input.text);

  switch (intent) {
    case "qa": return qaChain;
    case "chat": return chatChain;
    case "code": return codeChain;
    default: return fallbackChain;
  }
}

const routerChain = RunnableLambda.from(routeByIntent);
const finalChain = routerChain.pipe(parser);
```

---

## 11. RAG：知识增强型 AI 系统

### 11.1 RAG 原理

RAG（Retrieval-Augmented Generation）通过检索外部知识库来增强 LLM 回答的准确性和时效性。

```mermaid
flowchart TB
    U[用户问题] --> R[检索器]
    R --> D[(向量数据库)]
    D -->|Top-K 相关文档| C[LLM 生成]
    C --> A[最终回答]

    subgraph 索引管线
        Docs[原始文档] --> L[加载器 Loader]
        L --> S[文档切分 Splitter]
        S --> E[Embedding 向量化]
        E --> D
    end
```

### 11.2 知识预处理

```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// 加载器
const pdfLoader = new PDFLoader("doc.pdf");
const webLoader = new CheerioWebBaseLoader("https://example.com");
const csvLoader = new CSVLoader("data.csv");

// 文档切分
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const docs = await splitter.splitDocuments(rawDocs);
```

### 11.3 Embedding 与向量库

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Chroma } from "@langchain/community/vectorstores/chroma";

// Embedding 模型
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// 内存向量库（开发测试）
const memoryStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

// Chroma 向量库（生产可用）
const chromaStore = new Chroma(embeddings, {
  collectionName: "my-knowledge",
  url: "http://localhost:8000",
});

// 向量操作
await chromaStore.addDocuments(docs);
await chromaStore.delete({ ids: ["doc-1"] });

// 相似性搜索
const results = await chromaStore.similaritySearch("AI Agent 是什么", 3);

// MMR 搜索 —— 兼顾相关性与多样性
const mmrResults = await chromaStore.maxMarginalRelevanceSearch(
  "AI Agent", { k: 3, fetchK: 10 }
);

// 混合搜索
const hybridResults = await chromaStore.similaritySearchWithScore(
  "query", { k: 3, filter: { source: "pdf" } }
);
```

### 11.4 检索器与查询重写

```typescript
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";
import { LLMChainExtractor } from "langchain/retrievers/document_compressors";

// 基本检索器
const retriever = chromaStore.asRetriever({ k: 3 });

// BM25 混合检索
import { BM25Retriever } from "@langchain/community/retrievers/bm25";

// 上下文压缩
const compressor = LLMChainExtractor.fromLLM(model);
const compressionRetriever = new ContextualCompressionRetriever({
  baseRetriever: retriever,
  baseCompressor: compressor,
});

// 查询重写（处理非结构化查询）
const queryRewritePrompt = ChatPromptTemplate.fromMessages([
  ["system", "将用户的问题改写成适合检索的查询。"],
  ["human", "{input}"],
]);
const rewriteChain = queryRewritePrompt.pipe(model).pipe(parser);
const rewrittenQuery = await rewriteChain.invoke({ input: "讲一下那个框架" });
```

### 11.5 多模态 PDF 加载

```typescript
// 多模态 PDF 加载（含图片表格）
import { UnstructuredLoader } from "@langchain/community/document_loaders/fs/unstructured";

const multiModalLoader = new UnstructuredLoader("report.pdf", {
  strategy: "hi_res",  // 高精度模式
  includePageBreaks: true,
});
```

### 11.6 RAG 技术演进

```mermaid
flowchart LR
    subgraph 演进[RAG 技术演进]
        N[Naive RAG] --> A[Advanced RAG]
        A --> M[Modular RAG]
        M --> G[GraphRAG]
    end

    N --> N1[检索+生成]
    A --> A1[查询重写+HyDE]
    A --> A2[层次索引+句子窗口]
    M --> M1[顺序/条件/分支模式]
    G --> G1[知识图谱增强]
```

---

## 12. Agents 实战：单 Agent 实现自定义 BOT

### 12.1 单 Agent 架构

```mermaid
flowchart TB
    U[用户输入] --> A[Agent]
    A --> T1[情感检测工具]
    A --> T2[知识库工具]
    A --> T3[钉钉通知工具]
    T1 --> R[推理循环]
    T2 --> R
    T3 --> R
    R --> U
    A -->|最终回答| U
```

### 12.2 创建第一个 Agent

```typescript
import { AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// 定义工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "查询城市天气",
  schema: z.object({
    city: z.string().describe("城市名"),
  }),
  func: async ({ city }) => {
    const res = await fetch(`https://api.weather.com/${city}`);
    return res.text();
  },
});

// 创建 Agent
const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools: [weatherTool],
  prompt: ChatPromptTemplate.fromMessages([
    ["system", "你是一个 AI 助手，使用可用工具回答问题。"],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]),
});

const agentExecutor = new AgentExecutor({
  agent,
  tools: [weatherTool],
});
```

### 12.3 小浪助手项目架构

```typescript
// 项目模块结构
interface XiaoLangConfig {
  llm: BaseChatModel;
  emotionDetection: EmotionDetector;
  knowledgeBase: KnowledgeBase;
  dingtalk: DingTalkTool;
  memory: ConversationMemory;
  observability: Observable;
}

class XiaoLangAgent {
  private config: XiaoLangConfig;

  constructor(config: XiaoLangConfig) {
    this.config = config;
  }

  async run(input: string): Promise<string> {
    // 1. 情感检测
    const emotion = await this.config.emotionDetection.detect(input);

    // 2. 知识库检索
    const context = await this.config.knowledgeBase.query(input);

    // 3. 工具调度
    const tools = this.selectTools(emotion, input);

    // 4. Agent 推理循环
    const answer = await this.agentLoop(input, context, tools);

    return answer;
  }
}
```

### 12.4 记忆系统

```typescript
class ConversationMemory {
  private history: BaseMessage[] = [];
  private maxTokens: number;

  constructor(maxTokens = 4096) {
    this.maxTokens = maxTokens;
  }

  addMessage(message: BaseMessage): void {
    this.history.push(message);
    this.trim();
  }

  private trim(): void {
    let total = 0;
    const trimmed: BaseMessage[] = [];

    for (const msg of [...this.history].reverse()) {
      total += msg.content.length;
      if (total > this.maxTokens) break;
      trimmed.unshift(msg);
    }

    this.history = trimmed;
  }

  getHistory(): BaseMessage[] {
    return this.history;
  }
}
```

### 12.5 可观测性

```typescript
// LangSmith 集成
import { LangSmithTracer } from "langchain/callbacks";

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  callbacks: [new LangSmithTracer({ projectName: "xiao-lang" })],
});

// 自定义日志
class AgentLogger {
  log(step: string, data: unknown): void {
    console.log(\[Agent] \: \, JSON.stringify(data, null, 2));
  }

  error(step: string, error: Error): void {
    console.error(\[Agent Error] \: \, error.message);
  }
}
```

### 12.6 容器化部署

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=\
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---


## 13. Agents 深入：多 Agents 工作流的实现

### 13.1 为什么需要多 Agent 架构

```mermaid
flowchart TB
    subgraph 单Agent[单 Agent 局限性]
        A1[单一角色<br/>认知受限]
        A2[单一工具集<br/>能力受限]
        A3[线性执行<br/>效率受限]
    end

    subgraph 多Agent[多 Agent 优势]
        B1[角色专业化<br/>各司其职]
        B2[并行执行<br/>提升效率]
        B3[协作决策<br/>质量更高]
    end

    A1 -.-> B1
    A2 -.-> B2
    A3 -.-> B3
```

### 13.2 常见多智能体架构

| 架构 | 描述 | 适用场景 |
|------|------|----------|
| 监督式 | 一个 Supervisor Agent 分配任务给子 Agent | 任务分解明确 |
| 协作式 | 多个 Agent 平等协作 | 需要多角色讨论 |
| 流水线式 | Agent 链式传递结果 | 明确的前后依赖 |
| 竞争式 | 多个 Agent 分别解答，投票选出最优 | 追求高准确率 |

### 13.3 LangGraph 核心概念

LangGraph 是构建**有状态、可控**的多 Agent 工作流的框架。

```mermaid
flowchart TB
    subgraph LangGraph[LangGraph 核心组件]
        N[Node 节点<br/>每个 Agent 或函数]
        E[Edge 边<br/>节点间的连接]
        S[State 状态<br/>共享的全局状态]
        C[Control 控制<br/>条件路由+循环]
    end

    N --> C
    E --> C
    S --> C
```

### 13.4 第一个 LangGraph

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

// 定义状态
const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
  }),
  next: Annotation<string>,
});

// 定义节点
async function agentNode(state: typeof State.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

async function toolNode(state: typeof State.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = lastMessage.tool_calls;

  if (!toolCalls) return { messages: [] };

  const results = await Promise.all(
    toolCalls.map(tc => executeTool(tc.name, tc.args))
  );

  return { messages: results.map(r => new ToolMessage(r)) };
}

// 构建图
const graph = new StateGraph(State)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", (state) => {
    const lastMsg = state.messages[state.messages.length - 1];
    return lastMsg.tool_calls?.length ? "tools" : END;
  })
  .addEdge("tools", "agent")
  .compile();

// 运行
const result = await graph.invoke({
  messages: [{ role: "user", content: "北京的天气怎么样？" }],
});
```

### 13.5 节点控制

```typescript
// 串行控制 —— 默认顺序执行
.addEdge("agent_a", "agent_b")
.addEdge("agent_b", "agent_c")

// 分支控制 —— 条件路由
.addConditionalEdges("router", (state) => {
  if (state.taskType === "code") return "coder_agent";
  if (state.taskType === "write") return "writer_agent";
  return "default_agent";
})

// 循环控制 —— 反思自愈
.addConditionalEdges("agent", (state) => {
  const lastAnswer = state.messages[state.messages.length - 1];
  if (state.iterationCount >= 3) return END;
  if (isSatisfactory(lastAnswer)) return END;
  return "agent";  // 继续循环改进
})

// Map-Reduce —— 并行处理
const parallelAgents = await Promise.all(
  items.map(item => agentExecutor.invoke({ input: item }))
);
const merged = mergeResults(parallelAgents);
```

### 13.6 持久化与记忆

```typescript
import { MemorySaver } from "@langchain/langgraph";

// 线程隔离的持久层
const memory = new MemorySaver();

const graphWithMemory = graph.compile({ checkpointer: memory });

// 跨线程持久化调用
const config = { configurable: { thread_id: "user-session-123" } };

await graphWithMemory.invoke(
  { messages: [{ role: "user", content: "我叫张三" }] },
  config
);

const laterResult = await graphWithMemory.invoke(
  { messages: [{ role: "user", content: "我叫什么名字？" }] },
  config
);
// 能正确回答"张三"

// 短期记忆 —— 滑动窗口
// 长期记忆 —— Redis/PostgreSQL 持久化
// 摘要压缩 —— 当历史过长时自动总结
async function compressHistory(messages: BaseMessage[]): Promise<string> {
  const summaryPrompt = ChatPromptTemplate.fromTemplate(
    "请总结以下对话：\n{history}"
  );
  const chain = summaryPrompt.pipe(model).pipe(parser);
  return chain.invoke({ history: formatMessages(messages) });
}
```

### 13.7 人机交互（Human-in-the-Loop）

```typescript
// 审查工具调用 —— 在执行前等待人工确认
.addConditionalEdges("agent", (state) => {
  const lastMsg = state.messages[state.messages.length - 1];
  if (lastMsg.tool_calls?.length) {
    return "human_review";  // 暂停等待审批
  }
  return END;
})

// 编辑图的状态 —— 人工修正后再继续
async function humanReview(state: typeof State.State) {
  const pendingToolCalls = state.messages
    .filter(m => m.tool_calls)
    .flatMap(m => m.tool_calls);

  for (const tc of pendingToolCalls) {
    const approved = await askHuman(批准调用 \?);
    if (!approved) {
      state.messages.push(
        new ToolMessage("用户取消此工具调用", { tool_call_id: tc.id })
      );
    }
  }

  return state;
}
```

### 13.8 时光旅行（Time Travel）

```typescript
// 回退到之前的状态节点
const history = await graphWithMemory.getStateHistory(config);
const lastCheckpoint = history[history.length - 2];

// 从该节点重新执行
const rerunResult = await graphWithMemory.invoke(
  null,
  { ...config, checkpointId: lastCheckpoint.checkpointId }
);
```

### 13.9 小浪助手多 Agent 版实战

```typescript
// 多 Agent 编排：主管 + 专家 Agent 协作
const supervisorAgent = createAgent("supervisor", [planningTool]);
const researcherAgent = createAgent("researcher", [searchTool, webTool]);
const writerAgent = createAgent("writer", []);
const reviewerAgent = createAgent("reviewer", []);

const multiAgentGraph = new StateGraph(State)
  .addNode("supervisor", supervisorAgent)
  .addNode("researcher", researcherAgent)
  .addNode("writer", writerAgent)
  .addNode("reviewer", reviewerAgent)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", (state) => {
    const next = state.nextAgent;
    if (next === "researcher") return "researcher";
    if (next === "writer") return "writer";
    if (next === "reviewer") return "reviewer";
    return END;
  })
  .addEdge("researcher", "supervisor")
  .addEdge("writer", "reviewer")
  .addEdge("reviewer", "supervisor")
  .compile();
```

---

## 14. Agents 深入：部署优化与云平台使用

### 14.1 Agent 优化策略

```mermaid
flowchart TB
    优化策略 --> O1[架构优化]
    优化策略 --> O2[效果评估]
    优化策略 --> O3[云平台]

    O1 --> O1a[计划-执行模式]
    O1 --> O1b[反思模式]

    O2 --> O2a[模拟用户评估]
    O2 --> O2b[LangSmith 评估]

    O3 --> O3a[LangGraph Cloud]
    O3 --> O3b[LangGraph Studio]
```

### 14.2 计划-执行架构优化

```typescript
// 将任务拆分为 Plan→Execute 两个阶段
class PlanExecuteAgent {
  async plan(task: string): Promise<Plan> {
    const planPrompt = ChatPromptTemplate.fromTemplate(
      "将以下任务分解为多个步骤：\n{task}"
    );
    const chain = planPrompt.pipe(model).pipe(parser);
    return chain.invoke({ task });
  }

  async execute(plan: Plan): Promise<string> {
    for (const step of plan.steps) {
      const result = await this.executeStep(step);
      step.result = result;
    }
    return this.summarize(plan);
  }
}
```

### 14.3 反思架构优化

```typescript
class ReflexionAgent {
  async run(task: string, maxReflections = 3): Promise<string> {
    let answer = await this.initialAnswer(task);

    for (let i = 0; i < maxReflections; i++) {
      const feedback = await this.reflect(task, answer);
      if (feedback.isSatisfactory) break;
      answer = await this.improve(task, answer, feedback);
    }

    return answer;
  }

  private async reflect(task: string, answer: string): Promise<Feedback> {
    const chain = reflectionPrompt.pipe(model).pipe(parser);
    return chain.invoke({ task, answer });
  }
}
```

### 14.4 LangGraph Cloud 部署

```yaml
# langgraph.json
{
  "node_version": "20",
  "dockerfile": "Dockerfile",
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:graph"
  },
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}"
  }
}
```

```typescript
// LangGraph Cloud API 调用
const response = await fetch("https://api.langgraph.cloud/v1/runs", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${LANGGRAPH_API_KEY}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    graph_id: "agent",
    input: { messages: [{ role: "user", content: "你好" }] },
    config: { thread_id: "session-1" },
  }),
});
```

### 14.5 LangSmith 评估

```typescript
import { RunEvaluator } from "langsmith/evaluation";

// 定义评估指标
const correctnessEvaluator = new RunEvaluator({
  evaluator: async (run: Run) => {
    const expected = run.inputs.expected;
    const actual = run.outputs.answer;
    return {
      key: "correctness",
      score: await calculateSimilarity(expected, actual),
    };
  },
});

// 模拟用户评估
const simulatedUser = new ChatOpenAI({
  model: "gpt-4o",
  prompt: "你是一个用户，评估 AI 助手的回答质量。",
});
```

---


## 15. CrewAI：又一款主流的 Agents 开发框架

### 15.1 CrewAI 简介

CrewAI 是一个专注于**多 Agent 协作**的框架，核心概念围绕"团队"展开。

```mermaid
flowchart TB
    subgraph Crew[Crew 团队]
        A1[Agent 1<br/>研究员] --> T1[Task 1<br/>搜索资料]
        A2[Agent 2<br/>写手] --> T2[Task 2<br/>撰写文章]
        A3[Agent 3<br/>审核员] --> T3[Task 3<br/>内容审核]

        T1 --> T2 --> T3
    end

    subgraph 共享资源
        K[知识库]
        M[记忆]
        T[工具集]
    end

    A1 --> K
    A2 --> M
    A3 --> T
```

### 15.2 安装与第一个示例

```bash
npm i crewai
```

```typescript
import { Crew, Agent, Task, Process } from "crewai";

// 定义 Agent
const researcher = new Agent({
  role: "研究员",
  goal: "搜索并整理最新的 AI 行业动态",
  backstory: "你是一名资深 AI 行业分析师",
  tools: [searchTool],
  allowDelegation: false,
});

const writer = new Agent({
  role: "技术写手",
  goal: "将研究结果写成通俗易懂的文章",
  backstory: "你是一名技术科普作者",
  allowDelegation: false,
});

// 定义 Task
const researchTask = new Task({
  description: "搜索 2025 年 AI Agent 的三大趋势",
  expectedOutput: "包含来源和关键数据的调研报告",
  agent: researcher,
});

const writeTask = new Task({
  description: "基于调研报告撰写一篇科普文章",
  expectedOutput: "通俗易懂的 800 字文章",
  agent: writer,
});

// 创建 Crew
const crew = new Crew({
  agents: [researcher, writer],
  tasks: [researchTask, writeTask],
  process: Process.sequential,  // 顺序执行
  verbose: true,
});

// 运行
const result = await crew.kickoff();
console.log(result);
```

### 15.3 核心组件详解

```typescript
// Agent 配置
const agent = new Agent({
  role: "分析师",
  goal: "分析数据并给出洞察",
  backstory: "资深数据分析师",
  tools: [sqlTool, chartTool],
  llm: new ChatOpenAI({ model: "gpt-4o" }),
  memory: true,           // 启用记忆
  maxIter: 5,             // 最大迭代次数
  allowDelegation: true,  // 允许委派任务
  verbose: true,
});

// Task 配置
const task = new Task({
  description: "分析{quarter}季度的销售数据",
  expectedOutput: "包含图表和文字的分析报告",
  agent: analyst,
  context: [previousTask],  // 依赖前置任务
  asyncExecution: true,     // 异步执行
});

// Crew 与 Flow
const crew = new Crew({
  agents: [agent1, agent2, agent3],
  tasks: [task1, task2, task3, task4],
  process: Process.hierarchical,  // 层级执行（有 Manager）
  managerAgent: managerAgent,
  memory: true,
  maxRounds: 3,
});
```

### 15.4 知识库与记忆

```typescript
// CrewAI 内置记忆系统
// 1. 短期记忆 —— 当前会话
// 2. 长期记忆 —— 跨会话持久化
// 3. 实体记忆 —— 记住关键实体信息
// 4. 任务记忆 —— 记录已执行任务

// 知识库集成
const agent = new Agent({
  role: "客服代表",
  goal: "基于知识库回答用户问题",
  backstory: "7x24 客服代表",
  knowledgeSources: [
    "https://docs.example.com/faq.md",
    "./product-knowledge.pdf",
  ],
});
```

### 15.5 实战案例

**游戏开发助手**：策划 Agent → 开发 Agent → 测试 Agent

**营销策略大师**：市场分析 Agent → 策略制定 Agent → 内容生成 Agent → 效果评估 Agent

```typescript
class GameDevCrew {
  async buildGame(concept: string) {
    const designer = new Agent({
      role: "游戏策划",
      goal: "设计游戏玩法",
      backstory: "资深游戏策划师",
    });

    const developer = new Agent({
      role: "游戏开发者",
      goal: "实现游戏代码",
      backstory: "全栈游戏开发者",
      tools: [codeTool],
    });

    const tester = new Agent({
      role: "测试员",
      goal: "发现并报告 bug",
      backstory: "专业 QA 工程师",
    });

    const designTask = new Task({
      description: `设计游戏《${concept}》的玩法`,
      expectedOutput: "完整的设计文档",
      agent: designer,
    });

    const devTask = new Task({
      description: "基于设计文档实现游戏",
      expectedOutput: "可运行的游戏代码",
      agent: developer,
    });

    const testTask = new Task({
      description: "测试游戏并报告问题",
      expectedOutput: "测试报告",
      agent: tester,
    });

    const crew = new Crew({
      agents: [designer, developer, tester],
      tasks: [designTask, devTask, testTask],
      process: Process.sequential,
    });

    return crew.kickoff();
  }
}
```

---

## 16. 课程总结

### 16.1 技能图谱

| 技能 | 掌握程度 | 相关章节 |
|------|---------|----------|
| Agent 核心概念与架构 | ⭐⭐⭐ | §2, §12 |
| LLM 选型与 DeepSeek 使用 | ⭐⭐⭐ | §3, §5 |
| LangChain 框架核心组件 | ⭐⭐⭐ | §6, §7, §8 |
| 提示词工程与输出解析 | ⭐⭐⭐ | §8, §9 |
| LCEL 组件化开发 | ⭐⭐⭐ | §10 |
| RAG 系统构建 | ⭐⭐⭐ | §11 |
| 单 Agent 开发与部署 | ⭐⭐⭐ | §12 |
| 多 Agent LangGraph 编排 | ⭐⭐⭐ | §13 |
| Agent 优化与评估 | ⭐⭐ | §14 |
| CrewAI 框架 | ⭐⭐ | §15 |

### 16.2 学习路径回顾

```mermaid
flowchart TB
    入门[Agent 入门] --> 基础[LangChain 基础]
    基础 --> RAG[RAG 知识增强]
    RAG --> 单Agent[单 Agent 实战]
    单Agent --> 多Agent[多 Agent 编排]
    多Agent --> 部署[部署优化]
    部署 --> 扩展[CrewAI 扩展]

    入门 --> L1[理解 Agent 原理]
    基础 --> L2[掌握 LangChain 核心]
    RAG --> L3[构建知识增强系统]
    单Agent --> L4[完成小浪助手]
    多Agent --> L5[LangGraph 工作流]
    部署 --> L6[上云部署]
    扩展 --> L7[框架融会贯通]
```

### 16.3 从入门到精通的五个阶段

1. **会用**：能调用 LLM API，完成基本对话
2. **会搭**：能用 LangChain 构建链式应用
3. **会做**：能独立开发单 Agent 系统
4. **会编排**：能用 LangGraph/CrewAI 构建多 Agent 协作
5. **会优化**：能评估、部署、优化生产级 Agent

### 16.4 推荐的后续学习方向

| 方向 | 资源 |
|------|------|
| 深入 LangGraph | LangGraph 官方文档 + GitHub |
| Agent 安全 | OWASP LLM Top 10 |
| 生产级部署 | LangSmith + LangGraph Cloud |
| 多模态 Agent | GPT-4o Vision / Gemini 多模态 |
| 开源 Agent 框架 | AutoGen、Semantic Kernel、Dify |

---

## 附录

### 附录A：常用术语表

| 术语 | 说明 |
|------|------|
| Agent | 能自主感知、推理、行动的智能体 |
| LLM | 大语言模型 |
| LangChain | LLM 应用开发框架 |
| LCEL | LangChain Expression Language，声明式链编程 |
| RAG | 检索增强生成 |
| Tool Calling | 模型调用外部工具的能力 |
| ReAct | Reasoning + Acting，Agent 核心模式 |
| LangGraph | 有状态多 Agent 工作流框架 |
| CrewAI | 多 Agent 协作框架 |
| HITL | Human-in-the-Loop，人机交互 |
| CoT | Chain of Thought，思维链 |

### 附录B：环境变量速查

| 变量 | 用途 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `LANGCHAIN_API_KEY` | LangSmith/LangGraph API Key |
| `LANGCHAIN_TRACING_V2` | 启用 LangSmith 追踪 |
| `REDIS_URL` | Redis 连接地址 |

### 附录C：推荐资源

- LangChain 官方文档：https://js.langchain.com
- LangGraph 指南：https://langchain-ai.github.io/langgraph
- CrewAI 文档：https://docs.crewai.com
- DeepSeek 平台：https://platform.deepseek.com
- Ollama 官网：https://ollama.com

---
