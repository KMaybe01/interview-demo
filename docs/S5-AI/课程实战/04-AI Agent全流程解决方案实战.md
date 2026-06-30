# AI Agent 全流程解决方案实战

> 涵盖：LLM 基础 → LangChain 框架 → RAG 知识库 → 链与记忆 → Agent 核心 → 项目实战 → 语音能力 → 数字人集成

## 文档导航地图

```mermaid
flowchart TB
    subgraph 基础入门
        L1[§1 AI2.0 开发者机会] --> L2[§2 LangChain 入门]
        L2 --> L3[§3 LangChain 核心模块]
    end

    subgraph RAG 与记忆
        L3 --> R1[§4 RAG 知识库]
        R1 --> R2[§5 链与记忆]
    end

    subgraph Agent 开发
        R2 --> A1[§6 Agent 核心]
        A1 --> A2[§7 环境搭建]
        A2 --> A3[§8 API 层与性格]
        A3 --> A4[§9 Tool 与向量库]
    end

    subgraph 扩展部署
        A4 --> E1[§10 语音能力]
        E1 --> E2[§11 项目扩展]
        E2 --> E3[§12 总结]
    end

    style A3 fill:#4a90d9,color:#fff
    style A4 fill:#4a90d9,color:#fff
    style E2 fill:#6bb86b,color:#fff
```

---

## 0. 快速入门与课程总览

### 课程知识架构

```mermaid
flowchart LR
    subgraph 板块一[板块一：认知与基础]
        D1[LLM 原理] --> D2[LangChain 框架]
        D2 --> D3[Prompt 工程]
    end

    subgraph 板块二[板块二：RAG 与记忆]
        F1[RAG 知识库] --> F2[Chain 链]
        F2 --> F3[Memory 记忆]
    end

    subgraph 板块三[板块三：Agent 开发]
        G1[Agent 原理] --> G2[项目实战]
        G2 --> G3[Tool 集成]
    end

    subgraph 板块四[板块四：扩展部署]
        H1[语音交互] --> H2[Docker 部署]
        H2 --> H3[数字人集成]
    end
```

### 学习路径

| 阶段 | 章节 | 目标 |
|------|------|------|
| 认知基础 | §1~§3 | 理解 LLM 原理与 LangChain 核心 |
| RAG 与记忆 | §4~§5 | 构建知识库，实现记忆增强 |
| Agent 开发 | §6~§9 | 完成 Agent 项目开发 |
| 扩展部署 | §10~§12 | 语音、Docker、数字人集成 |

---

## 1. 多模型强应用：AI 2.0 时代应用开发者机会

### 1.1 大语言模型基础与发展

```mermaid
timeline
    title 大语言模型演进
    2017 : Transformer 诞生
    2018 : GPT-1 / BERT
    2020 : GPT-3 涌现能力
    2022 : ChatGPT 引爆
    2023 : GPT-4 / Llama 2 / Claude
    2024 : Llama 3 / DeepSeek V2
    2025 : DeepSeek R1 / Llama 4
```

### 1.2 国内外主要 LLM 对比

| 模型 | 厂商 | 特点 | 适合场景 |
|------|------|------|----------|
| GPT-4o | OpenAI | 全能型，多模态 | 通用开发 |
| DeepSeek V3/R1 | 深度求索 | 高性价比，推理强 | 国内业务 |
| Qwen 2.5 | 阿里云 | 中文优秀 | 企业应用 |
| Llama 3 | Meta | 开源可私有化 | 本地部署 |
| GLM-4 | 智谱 AI | 中文理解深 | 知识密集场景 |

### 1.3 大模型的不足与解决方案

| 不足 | 表现 | 解决方案 |
|------|------|----------|
| 知识截止 | 无法回答最新事件 | RAG + 实时检索 |
| 幻觉 | 生成虚假事实 | 检索验证 + 约束生成 |
| 上下文限制 | 长文本遗忘 | 记忆系统 + 摘要 |
| 数学推理 | 简单计算错误 | 代码解释器工具 |

### 1.4 AIGC 产业拆解

```mermaid
flowchart TB
    subgraph 基础层[基础设施]
        I1[算力 GPU/TPU]
        I2[模型训练]
        I3[推理引擎]
    end

    subgraph 模型层[模型服务]
        M1[闭源 API]
        M2[开源模型]
        M3[微调模型]
    end

    subgraph 应用层[应用开发]
        A1[聊天机器人]
        A2[RAG 系统]
        A3[Agent 智能体]
        A4[代码助手]
    end

    subgraph 集成层[行业集成]
        E1[企业 SaaS]
        E2[数字人]
        E3[自动化流程]
    end

    基础层 --> 模型层 --> 应用层 --> 集成层
```

### 1.5 智能体命理大师项目概述

贯穿课程的项目案例：

| 维度 | 说明 |
|------|------|
| 项目名称 | 命理大师 |
| 需求 | AI 智能体提供命理咨询、排盘、解读 |
| 技术栈 | LangChain + FastAPI + 向量数据库 + TTS |
| Agent 类型 | 单 Agent + 工具调用 |
| 部署方式 | Docker 容器化 |

---

## 2. 初识 LangChain：LLM 与 AI 应用的粘合剂

### 2.1 LangChain 是什么

LangChain 是 LLM 应用开发框架，提供标准化接口连接大模型、构建链式工作流、集成外部工具。

```mermaid
flowchart TB
    subgraph LangChain[LangChain 框架]
        Core[Core 核心] --> Models[Models 模型封装]
        Core --> Prompts[Prompts 提示词管理]
        Core --> Chains[Chains 链式调用]
        Core --> Agents[Agents 智能体]
        Core --> Memory[Memory 记忆系统]
        Core --> Retrievers[Retrievers 检索器]
    end

    subgraph 生态[生态系统]
        M1[OpenAI] --> M2[Anthropic]
        M2 --> M3[DeepSeek]
        M3 --> M4[Ollama]
        M4 --> M5[更多模型]
    end

    LangChain --> 生态
```

### 2.2 核心能力

| 模块 | 功能 | 核心类 |
|------|------|--------|
| Chat Models | 统一 LLM 调用接口 | `ChatOpenAI`, `ChatOllama` |
| Prompt Templates | 模板化提示词管理 | `ChatPromptTemplate` |
| Chains | 串联处理步骤 | `LLMChain`, `SimpleSequentialChain` |
| Agents | 自主决策与工具调用 | `AgentExecutor` |
| Memory | 对话历史管理 | `ConversationBufferMemory` |
| Document Loaders | 文档加载 | `PDFLoader`, `WebBaseLoader` |
| Vector Stores | 向量存储 | `Chroma`, `Milvus` |

### 2.3 环境搭建

```typescript
// 安装 LangChain
// npm i @langchain/core @langchain/community @langchain/openai

// 快速启动
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
const result = await chain.invoke({ input: "什么是 AI Agent？" });
```

### 2.4 优势与劣势

**优势：** 统一抽象、组件化、LCEL 声明式、生态丰富

**劣势：** 版本迭代快、抽象复杂、体积偏大

---


## 3. LangChain 核心模块与实战：用 Prompts 模板调教 LLM

### 3.1 模型 IO 接口

```mermaid
flowchart LR
    I[输入] --> P[Prompt 模板]
    P --> M[LLM / ChatModel]
    M --> O[输出解析器]
    O --> R[结构化结果]
```

### 3.2 Prompt 模板类型

```typescript
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

// 字符串模板
const stringPrompt = ChatPromptTemplate.fromTemplate(
  "请用{language}回答：{question}"
);

// 对话模板
const chatPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个{role}专家。"],
  ["human", "{input}"],
]);

// 消息占位符
const placeholderPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个 AI 助手。"],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);

// 组合模板
const combinedPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate("系统：{system_prompt}"),
  HumanMessagePromptTemplate.fromTemplate("用户：{input}"),
]);
```

### 3.3 LLMs vs ChatModels

| 类型 | 输入 | 输出 | 推荐场景 |
|------|------|------|----------|
| LLM | 纯文本 string | 纯文本 string | 简单生成 |
| ChatModel | `BaseMessage[]` | `AIMessage` | 对话、工具调用 |

### 3.4 流式输出

```typescript
const stream = await chain.stream({ input: "写一首诗" });
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### 3.5 Token 消耗追踪

```typescript
const response = await model.invoke("Hello");
console.log({
  inputTokens: response.usage_metadata?.input_tokens,
  outputTokens: response.usage_metadata?.output_tokens,
  totalTokens: response.usage_metadata?.total_tokens,
});
```

### 3.6 输出结构性

```typescript
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  skills: z.array(z.string()),
});

const parser = StructuredOutputParser.fromZodSchema(schema);
const chain = prompt.pipe(model).pipe(parser);
```

### 3.7 示例选择器

```typescript
import { SemanticSimilarityExampleSelector } from "@langchain/core/example_selectors";
import { OpenAIEmbeddings } from "@langchain/openai";

const selector = await SemanticSimilarityExampleSelector.fromExamples(
  examples,
  new OpenAIEmbeddings(),
  { k: 3 }
);
```

---

## 4. LangChain 知识库构建与 RAG 设计

### 4.1 RAG 原理

```mermaid
flowchart TB
    U[用户问题] --> R[检索器]
    R --> D[(向量数据库)]
    D -->|Top-K 文档| C[LLM + 上下文]
    C --> A[最终回答]

    subgraph 索引管线
        Docs[原始文档] --> L[Loader 加载器]
        L --> S[文档切割 Splitter]
        S --> E[Embedding 向量化]
        E --> D
    end
```

### 4.2 文档加载与处理

```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// 加载 PDF
const pdfLoader = new PDFLoader("document.pdf");
const pdfDocs = await pdfLoader.load();

// 加载网页
const webLoader = new CheerioWebBaseLoader("https://example.com");
const webDocs = await webLoader.load();

// 文档切割
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const chunks = await splitter.splitDocuments(pdfDocs);
```

### 4.3 文本向量化与向量数据库

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const vectorStore = new Chroma(embeddings, {
  collectionName: "knowledge_base",
  url: "http://localhost:8000",
});

await vectorStore.addDocuments(chunks);

const results = await vectorStore.similaritySearch("AI Agent", 3);
```

### 4.4 ChatDoc 智能文档助手

```typescript
class ChatDoc {
  private vectorStore: Chroma;
  private llm: ChatOpenAI;

  async answer(question: string): Promise<string> {
    const docs = await this.vectorStore.similaritySearch(question, 3);
    const context = docs.map(d => d.pageContent).join("\n");

    const response = await this.llm.invoke([
      { role: "system", content: "基于上下文回答问题：" + context },
      { role: "user", content: question },
    ]);

    return response.content;
  }
}
```

### 4.5 检索优化

| 方式 | 描述 | 代码 |
|------|------|------|
| MMR 搜索 | 兼顾相关性与多样性 | `maxMarginalRelevanceSearch()` |
| 混合搜索 | 组合语义 + 关键词 | BM25 + Vector Search |
| 上下文压缩 | 压缩检索结果 | `ContextualCompressionRetriever` |

---

## 5. LangChain 链与记忆处理

### 5.1 Chain 基础

```mermaid
flowchart LR
    I[输入] --> C1[Chain 1<br/>Prompt + Model]
    C1 --> C2[Chain 2<br/>处理 + 转换]
    C2 --> C3[Chain 3<br/>输出]
    C3 --> O[结果]
```

### 5.2 四种内置链

```typescript
import { LLMChain } from "langchain/chains";
import { SimpleSequentialChain } from "langchain/chains";
import { TransformChain } from "langchain/chains";

// LLMChain —— 基础链
const llmChain = new LLMChain({ llm: model, prompt });

// SimpleSequentialChain —— 顺序链
const sequentialChain = new SimpleSequentialChain({
  chains: [chain1, chain2, chain3],
});

// 文档处理链
import { StuffDocumentsChain } from "langchain/chains";
const stuffChain = new StuffDocumentsChain({
  llmChain,
  documentVariableName: "context",
});
```

### 5.3 Memory 工具

```typescript
import { ConversationBufferMemory } from "langchain/memory";
import { ConversationSummaryMemory } from "langchain/memory";
import { RedisChatMessageHistory } from "@langchain/redis";

// 缓冲记忆
const bufferMemory = new ConversationBufferMemory({
  memoryKey: "history",
  returnMessages: true,
});

// 摘要记忆（压缩历史）
const summaryMemory = new ConversationSummaryMemory({
  llm: model,
  memoryKey: "history",
});

// Redis 持久化记忆
const redisHistory = new RedisChatMessageHistory({
  sessionId: "user-session-1",
  sessionTTL: 86400,
  config: { url: process.env.REDIS_URL },
});

const redisMemory = new ConversationBufferMemory({
  chatHistory: redisHistory,
  memoryKey: "history",
});
```

### 5.4 为链增加记忆

```typescript
import { ConversationChain } from "langchain/chains";

const conversationChain = new ConversationChain({
  llm: model,
  memory: bufferMemory,
});

// 多轮对话
await conversationChain.call({ input: "我叫张三" });
await conversationChain.call({ input: "我叫什么名字？" });
// => "你叫张三"
```

### 5.5 文档处理预制链

```typescript
import {
  StuffDocumentsChain,
  RefineDocumentsChain,
  MapReduceDocumentsChain,
} from "langchain/chains";

// Stuff —— 所有文档直接填充
const stuffChain = new StuffDocumentsChain({ llmChain });

// Refine —— 逐文档迭代优化
const refineChain = new RefineDocumentsChain({
  llmChain,
  refineLLMChain: refineLLMChain,
});

// MapReduce —— 并行处理再合并
const mapReduceChain = new MapReduceDocumentsChain({
  llmChain: mapChain,
  combineDocumentChain: reduceChain,
});
```

---


## 6. Agent 核心与实践

### 6.1 Agent 核心循环

```mermaid
flowchart LR
    U[用户输入] --> A[Agent 推理]
    A --> D{需用工具？}
    D -->|是| T[执行工具]
    T --> O[观察结果]
    O --> A
    D -->|否| R[直接回答]
```

### 6.2 创建第一个 Agent

```typescript
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const searchTool = new DynamicStructuredTool({
  name: "web_search",
  description: "搜索网络信息",
  schema: z.object({
    query: z.string().describe("搜索关键词"),
  }),
  func: async ({ query }) => {
    const res = await fetch(`https://api.search.com?q=${query}`);
    return res.text();
  },
});

const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools: [searchTool],
  prompt: ChatPromptTemplate.fromMessages([
    ["system", "你是一个 AI 助手，使用工具回答问题。"],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]),
});

const executor = new AgentExecutor({
  agent,
  tools: [searchTool],
  verbose: true,
});

const result = await executor.invoke({
  input: "搜索最新的 AI 行业动态",
});
```

### 6.3 Agent 类型对比

| 类型 | 特点 | 适用场景 |
|------|------|----------|
| OpenAI Functions | 原生函数调用，稳定 | 通用 Agent |
| ReAct | 推理+行动循环 | 需要多步骤推理 |
| Structured Chat | 支持结构化工具 | 复杂工具调用 |
| Plan-Execute | 先规划后执行 | 复杂任务分解 |
| XML Agent | 使用 XML 格式通信 | 特殊格式需求 |

### 6.4 Agent + Memory

```typescript
import { AgentExecutor } from "langchain/agents";

const executorWithMemory = new AgentExecutor({
  agent,
  tools,
  memory: new ConversationBufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
  }),
});

// Agent 与 Tool 共享记忆
class SharedMemoryAgent {
  private memory: ConversationBufferMemory;

  async execute(input: string): Promise<string> {
    const history = await this.memory.loadMemoryVariables({});
    const result = await this.agent.invoke({
      input,
      chat_history: history.history,
    });
    await this.memory.saveContext({ input }, { output: result.output });
    return result.output;
  }
}
```

### 6.5 Tool 与 Toolkit

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";

// 自定义工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取城市天气",
  schema: z.object({ city: z.string() }),
  func: async ({ city }) => {
    return `今天${city}气温25°C，晴`;
  },
});

// 工具集
const tools = [searchTool, weatherTool, calculatorTool];
```

### 6.6 LCEL（LangChain Expression Language）

```typescript
import { RunnableSequence, RunnableParallel } from "@langchain/core/runnables";

// 链式管道
const chain = prompt.pipe(model).pipe(parser);

// 并行执行
const parallelChain = RunnableParallel.from({
  summary: summaryChain,
  translation: translateChain,
});

// LCEL Agent
const lcelAgent = RunnableSequence.from([
  { input: new RunnablePassthrough() },
  prompt,
  model,
  parser,
]);
```

---

## 7. AI Agent 智能体开发环境搭建

### 7.1 项目需求分析

"命理大师"智能体需求：

| 模块 | 功能 | 技术选型 |
|------|------|----------|
| API 层 | RESTful 接口 | FastAPI |
| Agent 框架 | 工具调用 + 记忆 | LangChain Agent |
| 知识库 | 命理知识检索 | Chroma 向量库 |
| 语音 | 文本转语音 | Microsoft TTS |
| 部署 | 容器化 | Docker |

### 7.2 技术架构

```mermaid
flowchart TB
    subgraph 前端[前端/IM]
        F1[Web 界面]
        F2[Telegram Bot]
        F3[数字人]
    end

    subgraph API[API 层 - FastAPI]
        A1[路由层]
        A2[Service 层]
        A3[Agent 引擎]
    end

    subgraph 服务[支撑服务]
        S1[(向量数据库)]
        S2[(Redis 缓存)]
        S3[TTS 引擎]
    end

    F1 --> A1
    F2 --> A1
    F3 --> A1
    A1 --> A2 --> A3
    A3 --> S1
    A3 --> S2
    A3 --> S3
```

### 7.3 项目结构

```
project/
  api/             # FastAPI 路由
  agent/           # Agent 核心逻辑
  tools/           # 工具定义
  memory/          # 记忆模块
  knowledge/       # 知识库
  voice/           # TTS 语音
  config/          # 配置
  docker/          # Docker 配置
```

---

## 8. API 层与智能体性格设计

### 8.1 FastAPI API 层

```typescript
import express from "express";
import { AgentExecutor } from "langchain/agents";

const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  const result = await agentExecutor.invoke({
    input: message,
  });

  res.json({ reply: result.output, sessionId });
});

app.listen(3000);
```

### 8.2 Agent 主框架

```typescript
class FortuneTellerAgent {
  private executor: AgentExecutor;
  private personality: string;

  constructor(personality: string) {
    this.personality = personality;
    this.executor = this.createAgent();
  }

  private createAgent(): AgentExecutor {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.buildSystemPrompt()],
      new MessagesPlaceholder("history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools: this.tools,
      prompt,
    });

    return new AgentExecutor({ agent, tools: this.tools });
  }

  private buildSystemPrompt(): string {
    return `你是"命理大师"，一位精通中国传统命理的 AI 专家。
你的性格特征：${this.personality}

能力范围：
- 八字排盘与解读
- 五行生克分析
- 运势预测
- 取名建议

回答风格：
- 专业但不失亲切
- 结合传统文化知识
- 每次回答提供实用建议`;
  }
}
```

### 8.3 情绪感知

```typescript
class EmotionDetector {
  private chain: LLMChain;

  constructor(model: BaseChatModel) {
    this.chain = new LLMChain({
      llm: model,
      prompt: ChatPromptTemplate.fromMessages([
        ["system", "分析用户情绪。只返回 JSON：{sentiment, intensity, suggestion}"],
        ["human", "{input}"],
      ]),
    });
  }

  async detect(input: string): Promise<EmotionResult> {
    return this.chain.call({ input });
  }
}
```

### 8.4 LangServe 部署

```typescript
import { RemoteRunnable } from "@langchain/core/runnables";

// LangServe 服务端部署
// langchain serve 自动创建 API 端点

// 远程调用
const remoteChain = new RemoteRunnable({
  url: "http://localhost:8000/chain",
});
const result = await remoteChain.invoke({ input: "你好" });
```

---

## 9. Tool 与向量数据库

### 9.1 工具设计

```typescript
// 命理工具集
const zodiacTool = new DynamicStructuredTool({
  name: "zodiac_calculator",
  description: "计算八字、五行、生肖",
  schema: z.object({
    birthYear: z.number(),
    birthMonth: z.number(),
    birthDay: z.number(),
    birthHour: z.number().optional(),
  }),
  func: async ({ birthYear }) => {
    const zodiac = (birthYear - 4) % 12;
    const elements = ["木", "火", "土", "金", "水"];
    return `生肖：${["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"][zodiac]}
五行：${elements[birthYear % 5]}`;
  },
});

const fortuneTool = new DynamicStructuredTool({
  name: "daily_fortune",
  description: "查询今日运势",
  schema: z.object({ zodiac: z.string() }),
  func: async ({ zodiac }) => {
    return `今日${zodiac}运势：★★★☆☆
财运：良好
感情：顺利
健康：注意休息`;
  },
});
```

### 9.2 Memory 处理

```typescript
class AgentMemoryManager {
  private shortTerm: ConversationBufferMemory;
  private longTerm: RedisChatMessageHistory;

  async saveInteraction(input: string, output: string): Promise<void> {
    await this.shortTerm.saveContext({ input }, { output });
    await this.longTerm.addMessage(new HumanMessage(input));
    await this.longTerm.addMessage(new AIMessage(output));
  }

  async loadContext(): Promise<BaseMessage[]> {
    const recent = await this.shortTerm.loadMemoryVariables({});
    const historical = await this.longTerm.getMessages();

    // 合并记忆，优先使用短期记忆
    return [...recent.history, ...historical.slice(-20)];
  }
}
```

### 9.3 学习能力构建

```typescript
class KnowledgeBase {
  private vectorStore: Chroma;

  async learn(content: string, metadata: Record<string, unknown>): Promise<void> {
    await this.vectorStore.addDocuments([
      new Document({ pageContent: content, metadata }),
    ]);
  }

  async recall(query: string, k = 3): Promise<Document[]> {
    return this.vectorStore.similaritySearch(query, k);
  }

  async generateResponse(query: string): Promise<string> {
    const docs = await this.recall(query);
    const context = docs.map(d => d.pageContent).join("\n");

    return this.llm.invoke([
      { role: "system", content: `基于知识库信息回答：\n${context}` },
      { role: "user", content: query },
    ]);
  }
}
```

---


## 10. 语音能力

### 10.1 语音逻辑设计

```mermaid
flowchart LR
    T[文本输入] --> E[情绪分析]
    E --> L[LLM 生成回复]
    L --> S[SSML 格式化]
    S --> TS[Text-to-Speech]
    TS --> A[音频输出]
```

### 10.2 Microsoft TTS 集成

```typescript
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

class AzureTTS {
  private synthesizer: sdk.SpeechSynthesizer;

  constructor() {
    const config = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY!,
      process.env.AZURE_SPEECH_REGION!
    );
    this.synthesizer = new sdk.SpeechSynthesizer(config);
  }

  async speak(text: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.synthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(Buffer.from(result.audioData));
          } else {
            reject(new Error(`TTS failed: ${result.reason}`));
          }
        },
        reject
      );
    });
  }

  // SSML 控制语速、语调、音色
  async speakWithStyle(text: string, style: string): Promise<Buffer> {
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis">
      <voice name="zh-CN-XiaoxiaoNeural">
        <mstts:express-as style="${style}" styledegree="2">
          ${text}
        </mstts:express-as>
      </voice>
    </speak>`;

    return this.synthesizeSsml(ssml);
  }
}
```

### 10.3 语音克隆

```typescript
// 语音克隆流程
// 1. 收集目标人声音频样本（>10分钟）
// 2. 训练声学模型
// 3. 生成自定义语音模型
// 4. 部署 TTS 服务

class CustomVoice {
  async createVoiceProfile(audioFiles: Buffer[]): Promise<string> {
    // 调用语音克隆 API
    const response = await fetch("https://api.cognitive.microsoft.com/customvoice", {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      },
      body: JSON.stringify({
        name: "custom-agent-voice",
        audioData: audioFiles.map(f => f.toString("base64")),
      }),
    });
    return response.json().then(r => r.voiceId);
  }
}
```

---

## 11. 项目扩展与集成

### 11.1 Telegram Bot 集成

```typescript
import TelegramBot from "node-telegram-bot-api";

class TelegramAgent {
  private bot: TelegramBot;
  private agent: FortuneTellerAgent;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.agent = new FortuneTellerAgent("温柔体贴");
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text || "";

      // 发送"正在输入"状态
      this.bot.sendChatAction(chatId, "typing");

      const result = await this.agent.execute(text);

      this.bot.sendMessage(chatId, result.output, {
        parse_mode: "Markdown",
      });
    });
  }
}
```

### 11.2 Docker 部署

```dockerfile
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
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AZURE_SPEECH_KEY=${AZURE_SPEECH_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma

volumes:
  chroma-data:
```

### 11.3 调试与追踪

```typescript
import { LangSmithTracer } from "langchain/callbacks";

const executor = new AgentExecutor({
  agent,
  tools,
  callbacks: [new LangSmithTracer({ projectName: "fortune-agent" })],
});
```

### 11.4 数字人集成

```typescript
// 数字人集成架构
// Agent 回复文本 → TTS 语音 → 数字人口型驱动 → 视频渲染

class DigitalHumanIntegration {
  async speak(response: string): Promise<void> {
    // 1. Agent 生成回复
    const agentReply = await this.agent.execute(response);

    // 2. TTS 生成语音
    const audio = await this.tts.speak(agentReply);

    // 3. 驱动数字人口型
    await this.driveLipSync(audio);

    // 4. 流式输出到前端
    this.streamToFrontend(audio);
  }

  private async driveLipSync(audio: Buffer): Promise<void> {
    // 调用数字人 API 驱动口型动画
    await fetch("http://digital-human:8000/drive", {
      method: "POST",
      body: audio,
    });
  }
}
```

---

## 12. 课程总结

### 12.1 技能图谱

| 技能 | 掌握程度 | 相关章节 |
|------|---------|----------|
| LLM 原理与选型 | ??? | §1 |
| LangChain 框架核心 | ??? | §2, §3 |
| Prompt 模板与工程 | ??? | §3 |
| RAG 系统构建 | ??? | §4 |
| Chain 链与 Memory | ??? | §5 |
| Agent 开发与工具 | ??? | §6 |
| 项目实战（API + 性格设计） | ??? | §7, §8, §9 |
| TTS 语音集成 | ?? | §10 |
| Docker 部署 | ?? | §11 |
| Telegram Bot / 数字人 | ?? | §11 |

### 12.2 学习路径回顾

```mermaid
flowchart TB
    入门[LLM 认知] --> 框架[LangChain 框架]
    框架 --> RAG[RAG 知识库]
    RAG --> 记忆[Chain + Memory]
    记忆 --> Agent[Agent 开发]
    Agent --> 项目[项目实战]
    项目 --> 扩展[语音 + 部署 + 数字人]

    入门 --> L1[理解 LLM 原理]
    框架 --> L2[掌握 LangChain 核心]
    RAG --> L3[构建知识增强系统]
    记忆 --> L4[实现对话记忆]
    Agent --> L5[开发智能体]
    项目 --> L6[完成命理大师]
    扩展 --> L7[企业级部署]
```

### 12.3 推荐后续方向

| 方向 | 说明 |
|------|------|
| 多 Agent 协作 | LangGraph / CrewAI |
| MCP 协议 | 标准化工具接口 |
| Graph RAG | 知识图谱增强 |
| 多模态 Agent | 视觉 + 语音融合 |
| 生产级监控 | LangSmith + 可观测性 |

---

## 附录

### 附录A：术语表

| 术语 | 说明 |
|------|------|
| LLM | 大语言模型 |
| LangChain | LLM 应用开发框架 |
| RAG | 检索增强生成 |
| Agent | 自主感知、推理、行动的智能体 |
| Chain | LangChain 中的链式调用 |
| Memory | 对话历史记忆 |
| Tool | Agent 可调用的外部工具 |
| Prompt | 提示词模板 |
| Embedding | 文本向量化 |
| TTS | 文本转语音 |

### 附录B：环境变量

| 变量 | 用途 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `AZURE_SPEECH_KEY` | Azure TTS Key |
| `AZURE_SPEECH_REGION` | Azure 区域 |
| `REDIS_URL` | Redis 连接地址 |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token |

### 附录C：推荐资源

- LangChain JS 文档：https://js.langchain.com
- LangGraph 指南：https://langchain-ai.github.io/langgraph
- Azure Speech SDK：https://learn.microsoft.com/azure/cognitive-services/speech-service
- Docker Compose：https://docs.docker.com/compose
- Chroma DB：https://docs.trychroma.com

---

