# AI Agent 全栈知识体系

> 七维度系统掌握 AI Agent 开发：RAG 检索增强生成 · 多 Agent 协作协议 · 编程智能体实战 · 全流程解决方案 · 大模型训练微调 · Ollama 本地推理部署 · Agent 全栈开发实战

---

## 知识体系总览

```mermaid
graph TB
    subgraph 基础能力
        A1[大模型调用] --> A2[Prompt 工程]
        A2 --> A3[工具调用 Function Calling]
    end

    subgraph 核心框架
        B1[LangChain] --> B2[LCEL 链式编排]
        B2 --> B3[Agent 框架]
        B3 --> B4[Memory 记忆系统]
    end

    subgraph 检索增强 RAG
        C1[Embedding 选型] --> C2[向量数据库]
        C2 --> C3[检索策略 BM25/混合]
        C3 --> C4[Graph RAG]
        C4 --> C5[Agentic RAG]
    end

    subgraph 多Agent协作
        D1[MCP 协议] --> D2[工具标准化]
        D2 --> D3[A2A 协议]
        D3 --> D4[编排/Planner/Worker]
    end

    subgraph 模型微调与部署
        E1[LLaMA-Factory] --> E2[SFT 微调]
        E2 --> E3[DPO 偏好对齐]
        E3 --> E4[模型导出 + Ollama 部署]
    end

    subgraph 工程落地
        F1[FastAPI/Express] --> F2[Docker 沙箱]
        F2 --> F3[Playwright 自动化]
        F3 --> F4[语音/数字人集成]
    end

    基础能力 --> 核心框架 --> 检索增强RAG
    核心框架 --> 多Agent协作
    基础能力 --> 模型微调与部署
    模型微调与部署 --> 检索增强RAG
    检索增强RAG --> 工程落地
    多Agent协作 --> 工程落地
```

---

## 文档导航

| 文档 | 核心主题 | 文档数 | 前置知识 | 进阶方向 | 适合人群 |
|------|---------|--------|---------|---------|---------|
| [01-RAG 全栈技术实战](./01-RAG全栈技术实战.md) | 检索增强生成全链路 | 14 章 | LLM 基础 | Graph RAG → Agentic RAG | 知识库/NLP 开发者 |
| [02-MCP+A2A 多 Agent 全栈实战](./02-MCP+A2A多Agent全栈实战.md) | 多 Agent 协作系统 | 17 章 | Agent 基础 | MCP 协议 → A2A 协议 | 全栈/系统架构师 |
| [03-AI 编程智能体实战](./03-AI编程智能体实战.md) | 编程辅助 Agent | 19 章 | LangChain 基础 | LangGraph → 沙盒运行 | IDE/DevTools 开发者 |
| [04-AI Agent 全流程解决方案实战](./04-AI%20Agent全流程解决方案实战.md) | 完整项目落地 | 12 章 | 综合基础 | 语音/数字人/Docker | 项目负责人/全栈 |
| [05-大模型训练](./05-大模型训练.md) | 模型微调与部署 | 多节 | Python/ML 基础 | LLaMA-Factory → 量化部署 | ML/AI 工程师 |
| [06-Ollama 学习文档](./06-Ollama学习文档.md) | 本地推理与 Agent 开发 | 多节 | 命令行基础 | Ollama → Open WebUI → LangChain | 个人开发者/研究者 |
| [07-Agent 全栈开发实战](./07-Agent全栈开发实战.md) | Agent 应用全栈开发 | 多节 | LangChain 基础 | LangGraph → CrewAI → 多 Agent | 全栈开发者 |

---

## 学习路径推荐

### 路径一：RAG 检索增强（企业知识库方向）

```
01-RAG 全栈技术实战
├── 第 1-2 章：RAG 基础与模型选型
├── 第 3-5 章：Embedding + 向量数据库
├── 第 6-8 章：数据准备 + Baseline + 评估
├── 第 9-11 章：检索增强 + Graph RAG + Agentic RAG
└── 第 12-14 章：接口 + 微调 + 总结
```

### 路径二：多 Agent 协作系统（自动化方向）

```
02-MCP+A2A 多 Agent 全栈实战
├── 第 1-3 章：Agent 概念 + MAS 架构
├── 第 4-6 章：技术栈 + DDD + 通用模块
├── 第 7 章：MCP 协议 Server/Client
├── 第 8-10 章：LLM 模块 + Agent 模块 + 工具模块
├── 第 11-13 章：Playwright + 沙箱
└── 第 14-17 章：A2A + 上下文 + Next.js
```

### 路径三：编程智能体（DevTools 方向）

```
03-AI 编程智能体实战
├── 第 1-3 章：Agent 概念 + 大模型调用
├── 第 4-7 章：LangChain 工具 + MCP + Cursor
├── 第 8-9 章：多轮对话 + 记忆能力
├── 第 10-15 章：终端 + 知识库 + 沙盒 + 浏览器
└── 第 16-19 章：LangGraph + 前后端实战
```

### 路径四：全流程项目落地（综合方向）

```
04-AI Agent 全流程解决方案实战
├── 第 1-3 章：LLM 认知 + LangChain 框架
├── 第 4-5 章：RAG 知识库 + Chain 与 Memory
├── 第 6-9 章：Agent 核心 + 环境搭建 + 工具集成
└── 第 10-12 章：语音 + Docker + 数字人
```

### 路径五：模型微调与部署（ML 方向）

```
05-大模型训练
├── 基础知识：LLM 原理 + 显存计算
├── SFT 微调：数据集准备 + LLaMA-Factory 实战
├── DPO 对齐：偏好数据 + 奖励模型
├── 模型评估：Benchmark + 人工评估
├── 模型导出：合并 + 量化（GGUF/GPTQ/AWQ）
└── 部署推理：Ollama + vLLM + Triton
```

### 路径六：本地开发环境（入门方向）

```
06-Ollama 学习文档
├── 安装部署：Windows/Mac/Linux + Docker
├── 模型管理：拉取 + 自定义 + Modelfile
├── API 调用：REST API + Python/JS SDK
├── 工具链：Open WebUI + Continue + LangChain
├── 高级用法：并发 + 函数调用 + 视觉
└── Agent 开发：MCP + CodeGPT + Cline
```

### 路径七：Agent 全栈实战（应用开发方向）

```
07-Agent 全栈开发实战
├── 基础知识：Agent 概念 + 架构模式
├── LangChain：模型封装 + Prompt + 解析器
├── 工具系统：Tool + Toolkit + MCP 工具
├── 记忆系统：对话记忆 + 持久化
├── LangGraph：状态图 + 条件边 + 循环
├── 多 Agent：CrewAI + 角色协作 + 任务委派
└── 项目实战：需求分析 + 架构设计 + 代码实现
```

---

## 关键技术栈速览

| 技术 | 文档位置 | 核心库 | 版本建议 |
|------|---------|--------|---------|
| LangChain | 全系列 | `@langchain/core` | >= 0.3 |
| LangGraph | 03 第 16 章 / 07 | `@langchain/langgraph` | >= 0.1 |
| MCP 协议 | 02 第 7 章 | `@modelcontextprotocol/sdk` | latest |
| Chroma | 01 第 5 章 | `chromadb` / `@langchain/chroma` | >= 0.5 |
| Playwright | 02 第 11 章 | `playwright` | >= 1.40 |
| FastAPI | 02 第 5 章 | `express` / `fastapi` | latest |
| Docker | 全系列 | Docker Desktop | >= 24 |
| LLaMA-Factory | 05 | `llama-factory` | latest |
| Ollama | 06 | `ollama` | >= 0.3 |
| Open WebUI | 06 | `open-webui` | latest |
| vLLM | 05 | `vllm` | >= 0.6 |
| Milvus | 01 | `pymilvus` | >= 2.4 |

---

## 核心概念关联表

| 概念 | 出现文档 | 相关概念 | 典型工具 |
|------|---------|---------|---------|
| RAG | 01、04 | Embedding、向量数据库、检索 | Chroma、Milvus |
| Agent | 全系列 | LLM、Tool、Memory、Planner | LangChain Agent |
| MCP | 02、03 | Server、Client、Tool | MCP SDK |
| A2A | 02 | Agent-to-Agent、编排 | 自定义协议 |
| Memory | 03、04、07 | 短期/长期记忆、向量检索 | Redis、MongoDB |
| Graph RAG | 01 第 10 章 | 知识图谱、实体抽取 | Neo4j |
| LCEL | 全系列 | Runnable、Chain、Pipeline | LangChain Core |
| Function Calling | 全系列 | Tool、Schema、参数绑定 | OpenAI API |
| SFT | 05 | 微调、数据集、LoRA | LLaMA-Factory |
| DPO | 05 | 偏好对齐、奖励模型 | LLaMA-Factory |
| 量化 | 05、06 | GGUF、GPTQ、AWQ | llama.cpp、AutoGPTQ |
| Ollama | 06 | 本地推理、Modelfile | Ollama CLI |
| CrewAI | 07 | 角色、任务、流程 | CrewAI |
| LangGraph | 07、03 | 状态图、条件边 | LangGraph |



---

## 快速开始

```bash
# 1. 环境准备
node -v  # >= 18
pnpm -v  # 推荐包管理器

# 2. 基础依赖
npm install @langchain/core @langchain/community @langchain/openai

# 3. 向量数据库（选一）
pip install chromadb        # 轻量开发
docker run -d milvusdb/milvus:v2.4.0  # 生产级

# 4. 大模型 API Key
export OPENAI_API_KEY=sk-xxx
export DEEPSEEK_API_KEY=sk-xxx
```

---

## 附录：技术选型决策树

```mermaid
graph TB
    Q[项目需求] --> Q1{需要检索增强？}
    Q1 -->|是| RAG[01-RAG 全栈技术实战]
    Q1 -->|否| Q2{多 Agent 协作？}

    Q2 -->|是| MAS[02-MCP+A2A 多 Agent 实战]
    Q2 -->|否| Q3{编程辅助场景？}

    Q3 -->|是| CODING[03-AI 编程智能体实战]
    Q3 -->|否| Q4{模型需微调？}

    Q4 -->|是| TRAIN[05-大模型训练]
    Q4 -->|否| Q5{本地部署？}

    Q5 -->|是| OLLAMA[06-Ollama 学习文档]
    Q5 -->|否| Q6{全栈应用？}

    Q6 -->|是| FULLSTACK[07-Agent 全栈开发实战]
    Q6 -->|否| FULL[04-AI Agent 全流程方案实战]

    RAG -->|进阶| MAS
    MAS -->|工具集成| CODING
    TRAIN -->|部署| OLLAMA
    OLLAMA -->|开发| FULLSTACK
    FULLSTACK -->|深入| RAG & MAS
    FULL -->|深入任一方向| RAG & MAS & CODING & TRAIN
```
