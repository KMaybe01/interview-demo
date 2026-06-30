# RAG 全栈技术实战

> 从基础概念到企业级部署，系统掌握 Retrieval-Augmented Generation 全栈技术，聚焦 RAG 在企业场景中的落地实践

---

```mermaid
graph LR
    A[RAG基础] --> B[模型选型]
    B --> C[Embedding]
    C --> D[向量数据库]
    D --> E[数据准备]
    E --> F[Baseline RAG]
    F --> G[RAG评估]
    G --> H[检索增强]
    H --> I[Graph RAG]
    I --> J[Agentic RAG]
    J --> K[接口界面]
    J --> L[RAG微调]
    L --> M[总结展望]
    style A fill:#4a90d9,color:#fff
    style H fill:#e67e22,color:#fff
    style I fill:#27ae60,color:#fff
    style J fill:#9b59b6,color:#fff
```



---

## 0. 快速开始

### 环境准备

```bash
node -v
mkdir my-rag-app && cd my-rag-app
npm init -y
npm install @langchain/core @langchain/community @langchain/openai
npm install chromadb @langchain/chroma
npm install pdf-parse mammoth cheerio
```

### Hello RAG: 最小示例

```typescript
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const loader = new TextLoader("docs/sample.txt");
const docs = await loader.load();

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
const chunks = await splitter.splitDocuments(docs);

const embeddings = new OpenAIEmbeddings({ model: "text-embedding-ada-002" });
const vectorStore = await Chroma.fromDocuments(chunks, embeddings, { collectionName: "my_knowledge" });

const retriever = vectorStore.asRetriever(3);
const prompt = PromptTemplate.fromTemplate("基于以下上下文回答问题。\n\n上下文: {context}\n\n问题: {question}");

const chain = RunnableSequence.from([
  {
    context: async (input: { question: string }) => {
      const results = await retriever.getRelevantDocuments(input.question);
      return results.map((d) => d.pageContent).join("\n\n");
    },
    question: (input: { question: string }) => input.question,
  },
  prompt,
  new OpenAI({ model: "gpt-4o-mini" }),
  new StringOutputParser(),
]);

const answer = await chain.invoke({ question: "公司的年假政策是什么？" });
console.log(answer);
```

### RAG 核心流程

```mermaid
graph TB
    subgraph 数据准备
        A[原始文档] --> B[文档解析]
        B --> C[文本分块]
        C --> D[Embedding]
    end
    subgraph 检索
        D --> E[(向量数据库)]
        F[用户查询] --> G[查询Embedding]
        G --> E
        E --> H[相似度检索]
    end
    subgraph 生成
        H --> I[上下文拼接]
        I --> J[LLM 生成]
        J --> K[最终答案]
    end
```

---

## 1. 课程学习必知

### 学习路线建议

- **基础阶段**（第 1-5 章）：理解 RAG 核心概念、模型选型、Embedding、向量数据库
- **实战阶段**（第 6-8 章）：搭建 Baseline RAG 系统并对其进行评估
- **进阶阶段**（第 9-11 章）：掌握检索增强技术、Graph RAG、Agentic RAG
- **工程阶段**（第 12-14 章）：接口开发、微调、总结

### 环境要求

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | >= 18 | 运行时 |
| Python | >= 3.10 | 部分工具依赖 |
| Docker | >= 24 | Milvus/Neo4j 部署 |
| Git | 最新版 | 版本管理 |

---

## 2. RAG 引领大语言模型新纪元

### 2.1 为什么需要 RAG

| 问题 | 表现 | RAG 解决方案 |
|------|------|-------------|
| 知识截止 | 模型只知道训练数据中的信息 | 实时接入外部知识库 |
| 幻觉 (Hallucination) | 生成不符合事实的内容 | 基于检索结果约束生成 |
| 数据隐私 | 企业数据不能用于训练 | 私有知识库本地检索 |
| 可解释性 | 黑盒输出无法追溯来源 | 检索结果可溯源 |
| 长尾知识 | 低频知识不在训练集中 | 按需检索精确信息 |

### 2.2 RAG 三大核心组件

1. **索引 (Indexing)**：将文档处理并存入向量数据库
2. **检索 (Retrieval)**：根据用户查询检索相关文档片段
3. **生成 (Generation)**：将检索结果与查询一同送入 LLM 生成答案

```mermaid
sequenceDiagram
    participant User as 用户
    participant App as 应用层
    participant Ret as 检索器
    participant DB as 向量数据库
    participant LLM as 大语言模型
    User->>App: 提问
    App->>Ret: 查询嵌入
    Ret->>DB: 向量相似度搜索
    DB-->>Ret: 返回 Top-K 文档
    Ret-->>App: 检索结果
    App->>LLM: 上下文 + 问题
    LLM-->>App: 生成答案
    App-->>User: 回答
```

### 2.3 Long Context 与 RAG 的关系

| 维度 | Long Context (纯 LLM) | RAG |
|------|----------------------|-----|
| 成本 | 随输入长度线性增长 | 仅检索相关片段，成本可控 |
| 精度 | 长文本中信息易遗漏 | 聚焦检索到的相关片段 |
| 延迟 | 处理长文本耗时显著 | 仅处理小段上下文 |
| 知识更新 | 需重新训练或微调 | 更新知识库即可 |
| 可扩展性 | 受限于上下文窗口 | 可检索任意规模知识库 |

### 2.4 RAG 技术栈全景

```
┌─────────────────────────────────────────────────────┐
│                    应用层                            │
│       Gradio / FastAPI / Express / Next.js          │
├─────────────────────────────────────────────────────┤
│                    业务逻辑                          │
│   RAG Pipeline / Agent / Graph RAG / Query Router  │
├─────────────────────────────────────────────────────┤
│                    检索层                            │
│  Embedding Model / Vector DB / Reranker / Fusion   │
├─────────────────────────────────────────────────────┤
│                    模型层                            │
│  LLM (GPT/Claude/Llama) + Embedding (text-ada/bge) │
├─────────────────────────────────────────────────────┤
│                    数据层                            │
│  PDF / Word / HTML / DB / API / 知识图谱           │
└─────────────────────────────────────────────────────┘
```

---

## 3. 挑选大语言基石模型

### 3.1 理解 Token 与 Transformer

```typescript
import { TokenTextSplitter } from "langchain/text_splitter";
const splitter = new TokenTextSplitter({ encodingName: "cl100k_base", chunkSize: 512 });
const chunks = await splitter.splitText("RAG 技术通过检索增强生成能力，有效缓解了大模型的幻觉问题。");
console.log(`Token 数: ${chunks.length}`);
```

**Transformer 核心组件**：
- **自注意力 (Self-Attention)**：每个 token 关注序列中所有其他 token
- **多头注意力 (Multi-Head Attention)**：并行学习不同维度的关系
- **前馈网络 (FFN)**：对每个 token 进行非线性变换
- **位置编码 (Positional Encoding)**：为模型提供序列位置信息

### 3.2 国内外主流模型对比

| 模型 | 厂商 | 上下文窗口 | 特点 | 适用场景 |
|------|------|-----------|------|---------|
| GPT-4o | OpenAI | 128K | 多模态、指令遵循强 | 通用问答、复杂推理 |
| GPT-4o-mini | OpenAI | 128K | 低成本、快速 | 日常对话、分类 |
| Claude 3.5 Sonnet | Anthropic | 200K | 长文本、代码能力强 | 文档分析、编程 |
| GLM-4 | 智谱 AI | 128K | 中文优秀、开源 | 中文场景 |
| Qwen2.5 | 阿里千问 | 128K | 开源、多尺寸 | 本地部署、微调 |
| DeepSeek-V3 | 深度求索 | 128K | 数学推理强 | 专业问答 |
| Llama 3.1 | Meta | 128K | 开源生态好 | 私有部署 |

### 3.3 模型部署方式选型

```mermaid
graph TB
    A[选择部署方式] --> B{GPU 资源？}
    B -->|>= 24GB| C[本地部署]
    B -->|< 24GB| D[API 调用]
    C --> E[Ollama / vLLM / llama.cpp]
    D --> F[OpenAI / 国内厂商 API]
    E --> G[私有化、数据安全]
    D --> H[成本低、无运维]
```

**本地部署 (Ollama)**：
```typescript
import { ChatOllama } from "@langchain/community/chat_models/ollama";
const model = new ChatOllama({ baseUrl: "http://localhost:11434", model: "qwen2.5:7b", temperature: 0 });
const response = await model.invoke("什么是 RAG？");
```

**API 调用**：
```typescript
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3, apiKey: process.env.OPENAI_API_KEY });
```

### 3.4 模型评估维度

| 评估维度 | 方法 | 指标 |
|---------|------|------|
| 事实准确性 | 人工评估 / GPT 评估 | 准确率 |
| 指令遵循 | 测试集评测 | F1 Score |
| 推理能力 | GSM8K / BBH | Pass@1 |
| 延迟 | 生产环境压测 | P50/P95 |
| 成本 | Token 消耗统计 | 元/千次查询 |
| 中文能力 | C-Eval / CMMLU | 综合得分 |

---

## 4. 向量 Embedding 模型

### 4.1 Embedding 原理

Embedding 将文本映射到高维向量空间，语义相似的文本在向量空间中距离更近。

```mermaid
graph LR
    subgraph 文本空间
        A[猫在睡觉] --> E[Embedding 模型]
        B[一只猫正在打盹] --> E
        C[今天天气很好] --> E
        D[股票市场上涨] --> E
    end
    subgraph 向量空间
        E --> F[[0.23, -0.45, 0.78, ...]]
        E --> G[[0.25, -0.42, 0.80, ...]]
        E --> H[[-0.12, 0.89, -0.33, ...]]
        E --> I[[-0.89, -0.11, 0.56, ...]]
    end
    style F fill:#4a90d9
    style G fill:#4a90d9
    style H fill:#e67e22
    style I fill:#e67e22
```

### 4.2 中文 Embedding 模型排行榜

| 模型 | 维度 | 最大输入 | MTEB-CN | 厂商 |
|------|------|---------|---------|------|
| bge-large-zh-v1.5 | 1024 | 512 | 69.0 | BAAI |
| bge-base-zh-v1.5 | 768 | 512 | 67.8 | BAAI |
| stella-base-zh-v3 | 768 | 512 | 66.5 | infgrad |
| multilingual-e5-large | 1024 | 512 | 66.2 | Microsoft |
| text-embedding-3-small | 1536 | 8191 | 65.8 | OpenAI |
| text-embedding-3-large | 3072 | 8191 | 67.1 | OpenAI |
| m3e-base | 768 | 512 | 63.2 | Moka AI |
| gte-Qwen2-7B-instruct | 3584 | 8192 | 71.5 | Alibaba |

### 4.3 Embedding 实战

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { HuggingFaceInferenceAPIEmbeddings } from "@langchain/community/embeddings/hf";

// OpenAI
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small", dimensions: 512 });
const vector = await embeddings.embedQuery("什么是 RAG 技术？");
console.log(`向量维度: ${vector.length}`);

const vectors = await embeddings.embedDocuments([
  "RAG 是检索增强生成",
  "向量数据库存储 Embedding",
]);
console.log(`生成了 ${vectors.length} 个向量`);

// BGE 本地模型
const bgeEmbeddings = new HuggingFaceInferenceAPIEmbeddings({
  apiKey: process.env.HF_API_KEY,
  model: "BAAI/bge-base-zh-v1.5",
});
const bgeVector = await bgeEmbeddings.embedQuery("企业知识库管理");
```

### 4.4 Embedding 工作流

```mermaid
graph TB
    A[原始文本] --> B[文本预处理]
    B --> C[标准化/清洗]
    C --> D[分句/分块]
    D --> E[Token 化]
    E --> F[模型前向传播]
    F --> G[Pooling 策略]
    G --> H[归一化]
    H --> I[(向量)]
    style I fill:#27ae60,color:#fff
```

### 4.5 选择 Embedding 模型考量

1. **语义对齐**：模型是否理解领域语言（法律、金融、医疗等）
2. **维度与性能**：高维度更精确但存储和计算成本更高
3. **输入长度**：长文档需支持长上下文的模型
4. **语言支持**：中文场景优先选择中文预训练模型
5. **对比学习质量**：检索任务需经过对比学习训练的 Embedding
6. **量化支持**：是否支持 INT8 量化降低存储成本

---

## 5. 向量数据库选型与部署

### 5.1 主流向量数据库对比

| 特性 | Chroma | Milvus | Qdrant | Weaviate | Pinecone |
|------|--------|--------|--------|----------|---------|
| 部署方式 | 嵌入/本地 | 分布式 | Docker/K8s | Docker/K8s | 托管 SaaS |
| 安装难度 | 极简 | 中等 | 简单 | 中等 | 无 |
| 持久化 | 磁盘/内存 | 磁盘 | 磁盘 | 磁盘 | 云 |
| 索引类型 | HNSW | IVF/HNSW | HNSW | HNSW | 自动 |
| 混合搜索 | 否 | 是 | 是 | 是 | 是 |
| 过滤条件 | 有限 | 丰富 | 丰富 | 丰富 | 丰富 |
| 分布式 | 否 | 是 | 是 | 是 | 是 |
| 推荐场景 | 原型开发 | 生产大规模 | 中小规模 | 中型项目 | 快速上云 |

### 5.2 向量相似度搜索与索引

```mermaid
graph TB
    subgraph 相似度度量
        A[余弦相似度] --> D[向量夹角越小越相似<br/>常用于语义搜索]
        B[欧氏距离 L2] --> E[向量空间距离<br/>常用于聚类]
        C[点积 Dot Product] --> F[向量内积<br/>常用于评分模型]
    end
    subgraph 索引算法
        G[暴力搜索] --> H["全量对比 O(n)"]
        I[IVF] --> J["聚类后搜索 O(log n)"]
        K[HNSW] --> L["分层导航图 O(log n)"]
    end
```

### 5.3 Chroma 部署与使用

```bash
pip install chromadb
chroma run --path ./chroma_data
```

```typescript
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

// 创建向量库
const vectorStore = await Chroma.fromTexts(
  ["RAG 是检索增强生成的缩写", "向量数据库用于存储和检索向量", "Chroma 是一个轻量级向量数据库"],
  [{ source: "doc1" }, { source: "doc2" }, { source: "doc3" }],
  embeddings,
  { collectionName: "tech-glossary", url: "http://localhost:8000" }
);

// 相似度检索
const results = await vectorStore.similaritySearch("什么是 RAG？", 2);
const resultsWithScore = await vectorStore.similaritySearchWithScore("向量数据库", 3);
resultsWithScore.forEach(([doc, score]) => {
  console.log(`分数: ${score.toFixed(4)} | ${doc.pageContent}`);
});
```

### 5.4 Milvus 部署与使用

```yaml
# docker-compose.yml
version: "3.5"
services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.5
  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
  standalone:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.4.0
    ports: ["19530:19530"]
    depends_on: [etcd, minio]
```

```typescript
import { Milvus } from "@langchain/community/vectorstores/milvus";
import { OpenAIEmbeddings } from "@langchain/openai";

const vectorStore = await Milvus.fromTexts(
  ["文档内容 1", "文档内容 2"],
  [{ id: 1 }, { id: 2 }],
  new OpenAIEmbeddings(),
  { collectionName: "my_collection", url: "http://localhost:19530" }
);

await vectorStore.createIndex({ indexType: "IVF_FLAT", metricType: "IP", params: { nlist: 128 } });
```

### 5.5 索引优化策略

| 策略 | 效果 | 适用场景 |
|------|------|---------|
| HNSW | 检索快、精度高 | 通用场景，100 万级以下 |
| IVF_FLAT | 精度高、速度中等 | 中等规模 |
| IVF_SQ8 | 速度快、存储省 | 精度要求不高的大规模 |
| DiskANN | 支持磁盘索引 | 超大规模（亿级） |
| 量化 (PQ/SQ) | 大幅压缩向量 | 内存有限时 |

---

## 6. 高效处理企业数据

### 6.1 文档质量对 RAG 的影响

| 数据类型 | 常见格式 | 处理难点 |
|---------|---------|---------|
| 制度文档 | PDF, Word | 表格、页眉页脚 |
| 技术手册 | Markdown, HTML | 代码块、层级标题 |
| 邮件往来 | EML, MSG | 嵌套回复、签名 |
| 合同协议 | PDF 扫描件 | OCR 识别错误 |
| 数据库导出 | CSV, Excel | 行列结构丢失 |

### 6.2 多样文档读取

```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";

const pdfDocs = await new PDFLoader("document.pdf", { splitPages: true }).load();
const docxDocs = await new DocxLoader("document.docx").load();
const csvDocs = await new CSVLoader("data.csv").load();
const textDocs = await new TextLoader("notes.txt").load();
const webDocs = await new CheerioWebBaseLoader("https://example.com/docs").load();
```

### 6.3 文本分块策略

```typescript
import { RecursiveCharacterTextSplitter, TokenTextSplitter, MarkdownTextSplitter } from "langchain/text_splitter";

// 递归字符分块（最常用）
const recursiveSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
});
const chunks = await recursiveSplitter.splitDocuments(docs);

// Token 分块
const tokenSplitter = new TokenTextSplitter({ encodingName: "cl100k_base", chunkSize: 256, chunkOverlap: 20 });
const tokenChunks = await tokenSplitter.splitDocuments(docs);

// Markdown 感知分块
const mdSplitter = new MarkdownTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
```

### 6.4 分块策略选择指南

```mermaid
graph TB
    A[文档类型] --> B{文档结构}
    B -->|层级清晰| C[Markdown/HTML 感知分块]
    B -->|段落分明| D[递归字符分块]
    B -->|无结构文本| E[Token 分块]
    C --> F[保留标题元数据]
    D --> G[优化分隔符顺序]
    E --> H[固定 Token 长度]
    F & G & H --> I[chunkSize: 300-800 tokens]
    I --> J[overlap: 10-20% chunkSize]
```

**分块参数建议**：

| 应用场景 | chunkSize | chunkOverlap | 分块方式 |
|---------|-----------|-------------|---------|
| 问答 (Q&A) | 300-500 | 30-50 | 递归字符 |
| 摘要生成 | 500-800 | 50-100 | Markdown 感知 |
| 代码搜索 | 200-400 | 20-30 | Token |
| 法律文档 | 600-1000 | 100-200 | 段落感知 |

---

## 7. 搭建制度问答 Baseline RAG

### 7.1 需求分析

1. 覆盖所有公司制度文档
2. 实时更新知识库
3. 精确检索制度条款
4. 答案可追溯（附来源引用）
5. 权限控制

### 7.2 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| LLM | GPT-4o-mini | 性价比高、指令遵循好 |
| Embedding | text-embedding-3-small | 1536 维、兼容性好 |
| 向量数据库 | Chroma | 轻量、无需额外服务 |
| 文档解析 | LangChain Loaders | 支持多种格式 |

### 7.3 架构设计

```mermaid
graph TB
    subgraph 离线索引
        A[制度文档] --> B[文档解析器]
        B --> C[文本分块]
        C --> D[Embedding]
        D --> E[(Chroma 向量库)]
    end
    subgraph 在线查询
        F[员工提问] --> G[问题预处理]
        G --> H[Embedding]
        H --> E
        E --> I[Top-5 检索]
    end
    subgraph 生成答案
        I --> J[Prompt 组装]
        J --> K[GPT-4o-mini]
        K --> L[答案 + 引用]
    end
```

### 7.4 完整实现

```typescript
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

async function buildIndex() {
  const loader = new DirectoryLoader("docs/policies/", {
    ".pdf": (path) => new PDFLoader(path),
    ".docx": (path) => new DocxLoader(path),
  });
  const rawDocs = await loader.load();
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const chunks = await splitter.splitDocuments(rawDocs);
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const vectorStore = await Chroma.fromDocuments(chunks, embeddings, { collectionName: "company-policies" });
  return vectorStore;
}

async function createQAChain(vectorStore: Chroma) {
  const retriever = vectorStore.asRetriever({ k: 5 });
  const prompt = PromptTemplate.fromTemplate(`
你是一个企业制度问答助手。基于以下制度文档回答问题。
答案必须严格基于提供的上下文，并在末尾引用来源文档。

上下文：{context}
问题：{question}

请用中文回答：`);

  const chain = RunnableSequence.from([
    {
      context: async (input: { question: string }) => {
        const docs = await retriever.getRelevantDocuments(input.question);
        return docs.map((d, i) => `[来源 ${i+1}: ${d.metadata.source}]\n${d.pageContent}`).join("\n\n");
      },
      question: (input: { question: string }) => input.question,
    },
    prompt,
    new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
    new StringOutputParser(),
  ]);
  return chain;
}

// 运行
const vectorStore = await buildIndex();
const chain = await createQAChain(vectorStore);
const answer = await chain.invoke({ question: "年假有多少天？" });
console.log(answer);
```

### 7.5 文档元数据管理

```typescript
const enrichedChunks = chunks.map((chunk, index) => ({
  ...chunk,
  metadata: {
    ...chunk.metadata,
    chunkIndex: index,
    totalChunks: chunks.length,
    department: "人力资源部",
  },
}));

const results = await vectorStore.similaritySearch("年假政策", 5, { department: "人力资源部" });
```

---

## 8. 有效评估 RAG

### 8.1 评估步骤

```mermaid
graph TB
    A[定义评估指标] --> B[构建测试集]
    B --> C[运行 Baseline]
    C --> D[逐项打分]
    D --> E[分析结果]
    E --> F{达标？}
    F -->|是| G[部署上线]
    F -->|否| H[定位瓶颈]
    H --> I[优化组件]
    I --> C
```

### 8.2 Ragas 评估框架

| 指标 | 含义 | 衡量内容 |
|------|------|---------|
| Faithfulness (忠实度) | 答案是否基于检索结果 | 答案与上下文的一致性 |
| Answer Relevancy (答案相关性) | 答案是否回答了问题 | 答案与问题的相关性 |
| Context Precision | 检索结果是否相关 | 相关文档排在前面 |
| Context Recall | 所需信息是否被检索到 | 答案所需信息是否在上下文中 |

```typescript
// 调 Python Ragas 评估
// from ragas import evaluate
// from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
// from datasets import Dataset
//
// data = {
//     "question": ["年假有几天？", "报销流程是什么？"],
//     "answer": ["工作满一年有5天年假。", "报销需填写报销单并审批。"],
//     "contexts": [["员工手册第三章..."], ["报销流程：1.填写报销单..."]],
//     "ground_truth": ["工作满一年有5天年假", "报销需填单并审批"],
// }
// dataset = Dataset.from_dict(data)
// result = evaluate(dataset, metrics=[faithfulness, answer_relevancy])
// print(result)
```

### 8.3 TypeScript 端实现

```typescript
import { ChatOpenAI } from "@langchain/openai";

interface EvalSample {
  question: string;
  answer: string;
  contexts: string[];
  groundTruth: string;
}

async function evaluateFaithfulness(answer: string, contexts: string[], model: ChatOpenAI): Promise<number> {
  const prompt = `判断以下回答是否忠实于给定的上下文 (0-1分)。\n\n上下文：${contexts.join("\n\n")}\n\n回答：${answer}\n\n仅返回数字分数。`;
  const response = await model.invoke(prompt);
  return parseFloat(response.content as string);
}

async function evaluateRAGSystem(testCases: EvalSample[]) {
  const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
  let total = 0;
  for (const tc of testCases) {
    const score = await evaluateFaithfulness(tc.answer, tc.contexts, model);
    total += score;
    console.log(`[${tc.question}] Faithfulness: ${score.toFixed(3)}`);
  }
  console.log(`平均: ${(total / testCases.length).toFixed(3)}`);
}
```

### 8.4 测试集构建策略

| 方法 | 优点 | 缺点 |
|------|------|------|
| 人工标注 | 质量高 | 成本高 |
| LLM 生成 | 成本低、规模大 | 质量参差 |
| 用户日志 | 反映真实分布 | 隐私问题 |
| 回溯测试 | 基准对齐 | 覆盖面有限 |

---

## 9. 14 种检索增强技能

### 9.1 检索技术全景

```mermaid
graph TB
    A[检索增强技术] --> B[基础检索]
    A --> C[查询增强]
    A --> D[多路检索]
    A --> E[后处理优化]
    A --> F[迭代检索]
    B --> B1[稀疏检索 BM25]
    B --> B2[稠密检索 Embedding]
    B --> B3[混合检索]
    C --> C1[HyDE]
    C --> C2[Query2doc]
    C --> C3[子问题分解]
    D --> D1[多索引检索]
    D --> D2[多查询检索]
    D --> D3[融合检索]
    E --> E1[Rerank]
    E --> E2[上下文压缩]
    E --> E3[过滤去重]
    F --> F1[迭代检索]
    F --> F2[Self-RAG]
    F --> F3[Corrective RAG]
```

### 9.2 检索技术分类总表

| # | 技术 | 类型 | 原理 | 适用场景 |
|---|------|------|------|---------|
| 1 | 稀疏检索 BM25 | 基础 | 词频统计精确匹配 | 术语查询、代码搜索 |
| 2 | 稠密检索 | 基础 | 向量语义匹配 | 语义搜索、开放 QA |
| 3 | 混合检索 | 基础 | 稀疏+稠密加权融合 | 通用最佳综合效果 |
| 4 | HyDE | 查询增强 | 生成假设文档再检索 | 短查询、模糊需求 |
| 5 | Query2doc | 查询增强 | 扩展查询为完整句子 | 查询信息不足 |
| 6 | 子问题分解 | 查询增强 | 复杂问题拆解 | 多跳推理 |
| 7 | 多索引检索 | 多路 | 不同索引分别检索 | 异构数据源 |
| 8 | 多查询检索 | 多路 | 生成多种查询变体 | 提高召回率 |
| 9 | 融合检索 Fusion | 后处理 | 合并多路结果重排序 | 多源结果合并 |
| 10 | Rerank | 后处理 | 交叉编码器精细排序 | 高精度场景 |
| 11 | 上下文压缩 | 后处理 | 提取核心内容 | 长文档低预算 |
| 12 | 迭代检索 | 迭代 | 根据结果补充搜索 | 信息不足扩展 |
| 13 | Self-RAG | 迭代 | 反思是否需检索 | 动态检索决策 |
| 14 | Corrective RAG | 迭代 | 纠错不相关结果 | 检索质量不稳 |

### 9.3 稀疏检索 BM25

```typescript
import { BM25Retriever } from "langchain/retrievers/bm25";

const retriever = new BM25Retriever({
  documents: [
    { pageContent: "RAG 是检索增强生成的技术", metadata: {} },
    { pageContent: "向量数据库用于存储 Embedding", metadata: {} },
    { pageContent: "BM25 是一种基于词频的检索算法", metadata: {} },
  ],
  k: 2,
});

const results = await retriever.getRelevantDocuments("检索算法");
```

### 9.4 稠密检索 + 混合检索 (RRF 融合)

```typescript
async function hybridRetrieve(query: string, vectorStore: Chroma, bm25Retriever: BM25Retriever, k = 4) {
  const [vectorResults, bm25Results] = await Promise.all([
    vectorStore.similaritySearch(query, k),
    bm25Retriever.getRelevantDocuments(query),
  ]);

  // Reciprocal Rank Fusion
  const scoreMap = new Map<string, number>();
  const RRF = 60;

  bm25Results.forEach((doc, i) => {
    scoreMap.set(doc.pageContent, (scoreMap.get(doc.pageContent) || 0) + 1 / (i + RRF));
  });
  vectorResults.forEach((doc, i) => {
    scoreMap.set(doc.pageContent, (scoreMap.get(doc.pageContent) || 0) + 1 / (i + RRF));
  });

  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);
}
```

### 9.5 HyDE (Hypothetical Document Embedding)

```mermaid
graph LR
    A[用户查询] --> B[LLM 生成假设文档]
    B --> C[假设文档 Embedding]
    C --> D[向量检索]
    D --> E[检索结果]
    style B fill:#e67e22,color:#fff
```

```typescript
async function hydeRetrieve(query: string, retriever: any, llm: ChatOpenAI) {
  const hydePrompt = PromptTemplate.fromTemplate(
    "请根据以下问题，写一段能够回答该问题的理想文档内容。\n问题：{question}\n假设文档："
  );
  const hydeChain = RunnableSequence.from([hydePrompt, llm, new StringOutputParser()]);
  const hypotheticalDoc = await hydeChain.invoke({ question: query });
  return retriever.getRelevantDocuments(hypotheticalDoc);
}
```

### 9.6 子问题分解

```typescript
async function multiHopRetrieve(question: string, retriever: any, llm: ChatOpenAI) {
  const prompt = PromptTemplate.fromTemplate(
    "将以下复杂问题分解为多个独立子问题，JSON 数组格式返回。\n问题：{question}\n子问题："
  );
  const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);
  const subQuestions = JSON.parse(await chain.invoke({ question }));

  let allContexts: string[] = [];
  for (const subQ of subQuestions) {
    const docs = await retriever.getRelevantDocuments(subQ);
    allContexts.push(...docs.map((d: any) => d.pageContent));
  }
  return [...new Set(allContexts)];
}
```

### 9.7 多查询检索

```typescript
async function multiQueryRetrieve(question: string, retriever: any, llm: ChatOpenAI, numQueries = 3) {
  const prompt = PromptTemplate.fromTemplate(
    `将问题改写为 ${numQueries} 种不同表述，JSON 数组返回。\n原始问题：{question}\n改写后：`
  );
  const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);
  const queries = JSON.parse(await chain.invoke({ question }));

  const allDocs = await Promise.all(queries.map((q: string) => retriever.getRelevantDocuments(q)));
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const docs of allDocs) {
    for (const doc of docs) {
      if (!seen.has(doc.pageContent)) {
        seen.add(doc.pageContent);
        merged.push(doc);
      }
    }
  }
  return merged;
}
```

### 9.8 Rerank 重排序

```mermaid
graph TB
    A[查询] --> B[Bi-Encoder 初筛]
    C[候选文档池] --> B
    B --> D[Top-K 候选]
    D --> E[Cross-Encoder Rerank]
    E --> F[精细排序结果]
```

```typescript
// Cohere Rerank
import { CohereRerank } from "@langchain/cohere";
const reranker = new CohereRerank({ apiKey: process.env.COHERE_API_KEY, model: "rerank-multilingual-v3.0", topN: 3 });
const initialDocs = await retriever.getRelevantDocuments("年假政策");
const rerankedDocs = await reranker.compressDocuments(initialDocs, "年假政策");

// LLM 作为 Reranker
async function llmRerank(query: string, documents: Document[], llm: ChatOpenAI, topK = 3) {
  const prompt = PromptTemplate.fromTemplate(
    `评估每个文档与查询的相关性 (1-5分)。\n查询：${query}\n\n候选文档：\n${documents.map((d, i) => `[${i+1}] ${d.pageContent}`).join("\n")}\n\nJSON 输出：{"scores": [3, 5, 2, ...]}`
  );
  const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);
  const { scores } = JSON.parse(await chain.invoke({}));
  return documents.map((doc, i) => ({ doc, score: scores[i] || 0 }))
    .sort((a, b) => b.score - a.score).slice(0, topK).map((item) => item.doc);
}
```

### 9.9 融合检索 (RRF 算法)

```typescript
interface RankedResult { pageContent: string; metadata: Record<string, any> }

function reciprocalRankFusion(rankingLists: RankedResult[][], k = 60): RankedResult[] {
  const scoreMap = new Map<string, { score: number; metadata: Record<string, any> }>();
  for (const ranking of rankingLists) {
    ranking.forEach((item, rank) => {
      const key = item.pageContent;
      if (!scoreMap.has(key)) scoreMap.set(key, { score: 0, metadata: item.metadata });
      scoreMap.get(key)!.score += 1 / (rank + k);
    });
  }
  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([content, data]) => ({ pageContent: content, metadata: data.metadata }));
}

async function fusionRetrieve(query: string, retrievers: any[], topK = 4) {
  const results = await Promise.all(retrievers.map((r) => r.getRelevantDocuments(query)));
  return reciprocalRankFusion(results).slice(0, topK);
}
```

### 9.10 迭代检索

```typescript
async function iterativeRetrieve(question: string, retriever: any, llm: ChatOpenAI, maxIter = 3) {
  let context = "";
  let collected: string[] = [];
  for (let i = 0; i < maxIter; i++) {
    const query = context ? `已知：${context}\n还需查找：${question}` : question;
    const docs = await retriever.getRelevantDocuments(query);
    const newInfo = docs.map((d: any) => d.pageContent);
    if (newInfo.every((info: string) => collected.includes(info))) break;
    collected.push(...newInfo);
    context = collected.join("\n\n");
  }
  return collected;
}
```

### 9.11 Self-RAG

```mermaid
graph TB
    A[输入问题] --> B{需要检索？}
    B -->|是| C[检索]
    C --> D{结果相关？}
    D -->|是| E[生成答案]
    D -->|否| F[调整查询] --> C
    B -->|否| G[直接生成]
    E --> H[输出]
    G --> H
```

```typescript
async function selfRAG(question: string, retriever: any, llm: ChatOpenAI) {
  const needCheck = RunnableSequence.from([
    PromptTemplate.fromTemplate("回答问题是否需要查找外部知识？仅回答 YES 或 NO。\n问题：{question}"),
    llm, new StringOutputParser()
  ]);
  const needsRetrieval = (await needCheck.invoke({ question })).trim();
  if (needsRetrieval === "NO") {
    return RunnableSequence.from([
      PromptTemplate.fromTemplate("回答问题：{question}"), llm, new StringOutputParser()
    ]).invoke({ question });
  }

  const docs = await retriever.getRelevantDocuments(question);

  const relCheck = RunnableSequence.from([
    PromptTemplate.fromTemplate("检索结果是否与问题相关？仅 YES 或 NO。\n问题：{question}\n结果：{context}"),
    llm, new StringOutputParser()
  ]);
  const isRelevant = (await relCheck.invoke({ question, context: docs.map((d: any) => d.pageContent).join("\n") })).trim();

  if (isRelevant !== "YES") return "无法从知识库中找到相关信息。";

  return RunnableSequence.from([
    PromptTemplate.fromTemplate("基于信息回答问题。\n信息：{context}\n问题：{question}"),
    llm, new StringOutputParser()
  ]).invoke({ question, context: docs.map((d: any) => d.pageContent).join("\n") });
}
```

---

## 10. Graph RAG 金融智库

### 10.1 知识图谱基础

知识图谱以实体 (Entity) 和关系 (Relation) 组织知识，支持多跳推理和复杂关系查询。

```mermaid
graph TB
    A[公司A] -->|投资| B[公司B]
    A -->|持有股份| C[公司C]
    B -->|竞争对手| D[公司D]
    B -->|CEO| E[张三]
    E -->|毕业于| F[清华大学]
```

### 10.2 RAG vs Graph RAG

| 维度 | 传统 RAG | Graph RAG |
|------|---------|-----------|
| 数据结构 | 向量（语义空间） | 图（关系空间） |
| 检索方式 | 向量相似度 | 图遍历 + 向量检索 |
| 多跳推理 | 弱 | 强（自然支持路径查询） |
| 可解释性 | 文档来源 | 关系路径 |
| 构建复杂度 | 低 | 高（需实体/关系抽取） |

```mermaid
graph TB
    subgraph 传统RAG
        A1[文档] --> B1[Chunk] --> C1[向量] --> D1[语义检索]
    end
    subgraph GraphRAG
        A2[文档] --> B2[实体抽取]
        A2 --> C2[关系抽取]
        B2 & C2 --> D2[节点] --> E2[图遍历+向量检索]
    end
```

### 10.3 Neo4j 部署

```bash
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password123 -e NEO4J_PLUGINS='["apoc"]' neo4j:5-community
```

### 10.4 Graph RAG 构建实战

```typescript
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOpenAI } from "@langchain/openai";

const graph = await Neo4jGraph.initialize({ url: "bolt://localhost:7687", username: "neo4j", password: "password123" });

// 创建知识图谱
await graph.query(`
  CREATE (c1:Company {name: "阿里巴巴集团", code: "BABA", industry: "电商/云计算"})
  CREATE (c2:Company {name: "腾讯控股", code: "0700.HK", industry: "社交/游戏"})
  CREATE (p1:Person {name: "张勇", title: "前CEO"})
  CREATE (p2:Person {name: "马化腾", title: "CEO"})
  CREATE (c1)-[:INVESTED_IN {amount: "50亿", year: 2020}]->(c2)
  CREATE (p1)-[:CEO_OF]->(c1)
  CREATE (p2)-[:CEO_OF]->(c2)
`);

// Graph RAG 问答链
const chain = GraphCypherQAChain.fromLLM({
  llm: new ChatOpenAI({ model: "gpt-4o", temperature: 0 }),
  graph, verbose: true, validateCypher: true,
});

const answer = await chain.invoke({ query: "阿里巴巴投资了哪些公司？其CEO是谁？" });
// 自动执行 Cypher: MATCH (c:Company {name:"阿里巴巴"})-[r:INVESTED_IN]->(target) RETURN target.name, r.amount
```

### 10.5 文档到知识图谱构建

```typescript
interface Triplet { entities: { name: string; type: string; properties: Record<string, string> }[]; relations: { source: string; target: string; type: string; properties: Record<string, string> }[] }

async function extractTriplets(text: string, llm: ChatOpenAI): Promise<Triplet> {
  const prompt = PromptTemplate.fromTemplate(
    "从文本中提取实体和关系，JSON 格式。\n文本：{text}\n输出：{\"entities\": [...], \"relations\": [...]}"
  );
  const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);
  return JSON.parse(await chain.invoke({ text }));
}

async function buildKnowledgeGraph(documents: string[], graph: Neo4jGraph, llm: ChatOpenAI) {
  for (const doc of documents) {
    const { entities, relations } = await extractTriplets(doc, llm);
    for (const entity of entities) {
      await graph.query(`MERGE (n:${entity.type} {name: '${entity.name}'})`);
    }
    for (const rel of relations) {
      await graph.query(`
        MATCH (a {name: '${rel.source}'})
        MATCH (b {name: '${rel.target}'})
        MERGE (a)-[r:${rel.type}]->(b)
      `);
    }
  }
}
```

---

## 11. Agentic RAG

### 11.1 Agent 原理

Agent 是能够自主决策、调用工具的 LLM 程序。Agentic RAG 将 RAG 系统包装为工具，根据查询类型自动选择处理策略。

### 11.2 ReAct 框架

```mermaid
graph TB
    A[用户输入] --> B[思考 Thought]
    B --> C[行动 Action]
    C --> D[观察 Observation]
    D --> E{完成？}
    E -->|否| B
    E -->|是| F[最终回答]
    style B fill:#4a90d9,color:#fff
    style C fill:#e67e22,color:#fff
    style D fill:#27ae60,color:#fff
```

### 11.3 RAG Router 实现

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/community/tools";
import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";

const policyTool = new DynamicStructuredTool({
  name: "retrieve_policy",
  description: "检索公司制度政策",
  schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  func: async ({ query }) => {
    const docs = await policyRetriever.getRelevantDocuments(query);
    return docs.map((d) => d.pageContent).join("\n\n");
  },
});

const graphTool = new DynamicStructuredTool({
  name: "query_finance_knowledge_graph",
  description: "查询金融知识图谱",
  schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  func: async ({ query }) => graphQAChain.invoke({ query }),
});

const calcTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算",
  schema: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] },
  func: async ({ expression }) => String(eval(expression)),
});

const agent = await createStructuredChatAgent({
  llm: new ChatOpenAI({ model: "gpt-4o", temperature: 0 }),
  tools: [policyTool, graphTool, calcTool],
  prompt: PromptTemplate.fromTemplate(
    "根据问题类型选择合适工具。\n\n可用工具：{tools}\n\n{agent_scratchpad}"
  ),
});

const executor = new AgentExecutor({ agent, tools: [policyTool, graphTool, calcTool], verbose: true, maxIterations: 5 });

const response = await executor.invoke({
  input: "根据公司年假政策，3年工龄能休几天？如果日薪500元，休满年假能拿多少补贴？",
});
```

### 11.4 路由逻辑独立实现

```typescript
async function routeQuery(query: string, llm: ChatOpenAI): Promise<"policy" | "finance" | "general" | "calculation"> {
  const chain = RunnableSequence.from([
    PromptTemplate.fromTemplate("分析问题类别 (policy/finance/calculation/general)。\n问题：{query}\n类别："),
    llm, new StringOutputParser()
  ]);
  return (await chain.invoke({ query })).trim().toLowerCase() as any;
}

async function agenticRAG(query: string, handlers: Record<string, (q: string) => Promise<string>>) {
  const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const category = await routeQuery(query, llm);
  const context = await (handlers[category] || handlers.general)(query);
  return RunnableSequence.from([
    PromptTemplate.fromTemplate("基于以下信息回答问题。\n信息：{context}\n问题：{query}"),
    llm, new StringOutputParser()
  ]).invoke({ context, query });
}
```

---

## 12. 接口和界面开发

### 12.1 Express API

```typescript
import express from "express";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const app = express();
app.use(express.json());

const vectorStore = await Chroma.fromExistingCollection(new OpenAIEmbeddings(), { collectionName: "company-policies" });
const retriever = vectorStore.asRetriever(5);

const ragChain = RunnableSequence.from([
  {
    context: async (input: { question: string }) => {
      const docs = await retriever.getRelevantDocuments(input.question);
      return docs.map((d) => d.pageContent).join("\n\n");
    },
    question: (input: { question: string }) => input.question,
  },
  PromptTemplate.fromTemplate("基于以下信息回答问题。\n信息：{context}\n问题：{question}"),
  new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
  new StringOutputParser(),
]);

app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;
    const answer = await ragChain.invoke({ question });
    res.json({ answer, source: "知识库" });
  } catch (error) {
    res.status(500).json({ error: "查询失败" });
  }
});

app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.listen(3000, () => console.log("RAG API: http://localhost:3000"));
```

### 12.2 React 聊天界面

```typescript
import React, { useState } from "react";

interface Message { role: "user" | "assistant"; content: string }

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "查询失败，请重试。" }]);
    } finally { setLoading(false); }
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}><strong>{msg.role === "user" ? "用户" : "助手"}:</strong><p>{msg.content}</p></div>
      ))}
      {loading && <div>思考中...</div>}
      <div>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="输入问题..." />
        <button onClick={sendMessage}>发送</button>
      </div>
    </div>
  );
}
```

---

## 13. RAG 微调

### 13.1 微调目标

| 组件 | 微调目标 | 预期效果 |
|------|---------|---------|
| Embedding 模型 | 提升领域语义理解 | 检索精度提升 5-15% |
| LLM | 提升指令遵循 + 输出格式 | 答案质量提升 |
| Reranker | 提升排序精确度 | Top-K 准确率提升 |

### 13.2 Embedding 微调 (Python 参考)

```python
# Python 微调代码
from sentence_transformers import SentenceTransformer, losses

model = SentenceTransformer("BAAI/bge-base-zh-v1.5")

# 对比学习训练数据
train_data = [
    ("年假政策", "工作满一年可休5天年假", 1.0),  # 正样本
    ("年假政策", "报销流程需要填单审批", 0.0),  # 负样本
]

# 训练
model.fit(
    train_objectives=[(train_dataloader, losses.CosineSimilarityLoss(model))],
    epochs=3,
    warmup_steps=100,
)
model.save("finetuned-bge-zh")
```

### 13.3 微调后效果对比

```typescript
// 微调前
const before = "Q: 年假有几天？\nA: 根据公司规定，工作满一年有5天年假。";

// 微调后 - 输出更结构化
const after = `Q: 年假有几天？
A: 【回答】根据公司制度第三条第2款，正式员工工作满一年可享受5天带薪年假。
【引用】员工手册-休假制度-v3.2.pdf
【相关条款】第3条 年假管理
【补充说明】工龄每增加一年，年假增加1天，上限15天。`;
```

---

## 14. 总结与展望

### 14.1 核心知识点回顾

```mermaid
mindmap
  root((RAG 全栈))
    数据层
      文档解析
      文本分块
      数据清洗
    检索层
      Embedding 选型
      向量数据库
      混合检索
      Graph RAG
    推理层
      ReAct Agent
      Query Router
      多步推理
    评估层
      Ragas 指标
      A/B 测试
      持续监控
    工程化
      API 封装
      Gradio 界面
      容器化部署
```

### 14.2 RAG 技术演进方向

| 方向 | 当前状态 | 未来趋势 |
|------|---------|---------|
| 检索粒度 | 固定 Chunk | 语义自适应分块 |
| 多模态 RAG | 文本为主 | 图文/音视频混合检索 |
| Agent 化 | 简单路由 | 复杂工作流编排 |
| 评估 | 离线评估 | 在线持续评估 |
| 知识更新 | 全量重建 | 增量实时更新 |

### 14.3 企业落地建议

1. **分阶段实施**：V1.0 Baseline RAG → V2.0 检索增强+评估 → V3.0 Graph RAG + Agentic RAG
2. **效果度量**：检索准确率 (Precision@K)、用户满意度、P95 延迟 < 3s
3. **持续优化**：建立 Bad Case 库、定期人工标注、监控性能漂移、审计更新知识库

---

## 附录 A: 术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| RAG | Retrieval-Augmented Generation | 检索增强生成 |
| LLM | Large Language Model | 大语言模型 |
| Embedding | Embedding | 文本到向量的映射表示 |
| Token | Token | 文本的最小处理单元 |
| Chunk | Chunk | 文档分块后的片段 |
| Vector DB | Vector Database | 向量数据库 |
| HNSW | Hierarchical Navigable Small World | 分层导航小世界索引算法 |
| IVF | Inverted File Index | 倒排文件索引 |
| BM25 | BM25 | 基于词频的排序函数 |
| HyDE | Hypothetical Document Embeddings | 假设文档嵌入 |
| RRF | Reciprocal Rank Fusion | 倒数排序融合 |
| Cross-Encoder | Cross-Encoder | 交叉编码器 |
| Bi-Encoder | Bi-Encoder | 双编码器 |
| Self-RAG | Self-Reflective RAG | 自我反思检索增强 |
| Graph RAG | Graph RAG | 基于知识图谱的检索增强 |
| Agent | Agent | 自主决策的 AI 程序 |
| ReAct | Reasoning + Acting | 推理+行动框架 |
| Cypher | Cypher | Neo4j 图查询语言 |
| LoRA | Low-Rank Adaptation | 低秩适配微调方法 |
| Ragas | RAG Assessment | RAG 评估框架 |
| Faithfulness | Faithfulness | 忠实度 |

## 附录 B: 环境变量与配置

```bash
# .env
OPENAI_API_KEY=sk-your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
COHERE_API_KEY=your-cohere-key
HF_API_KEY=your-hf-key
CHROMA_URL=http://localhost:8000
MILVUS_URL=http://localhost:19530
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password123
```

```typescript
import "dotenv/config";
const config = {
  openai: { apiKey: process.env.OPENAI_API_KEY, baseUrl: process.env.OPENAI_BASE_URL },
  chroma: { url: process.env.CHROMA_URL || "http://localhost:8000" },
  neo4j: { uri: process.env.NEO4J_URI || "bolt://localhost:7687", username: process.env.NEO4J_USERNAME, password: process.env.NEO4J_PASSWORD },
};
```

## 附录 C: 推荐资源

### 论文

| 论文 | 核心贡献 | 年份 |
|------|---------|------|
| Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | 提出 RAG 原始框架 | 2020 |
| Self-RAG: Learning to Retrieve, Generate, and Critique | 自我反思机制 | 2023 |
| GraphRAG: Unlocking LLM Discovery on Narrative Private Data | 微软 Graph RAG | 2024 |
| ReAct: Synergizing Reasoning and Acting in Language Models | ReAct 框架 | 2022 |

### 开源工具

| 工具 | 用途 | 地址 |
|------|------|------|
| LangChain | 框架核心 | github.com/langchain-ai/langchainjs |
| Chroma | 向量数据库 | github.com/chroma-core/chroma |
| Milvus | 向量数据库 | github.com/milvus-io/milvus |
| Neo4j | 图数据库 | github.com/neo4j/neo4j |
| Ragas | RAG 评估 | github.com/explodinggradients/ragas |
| Ollama | 本地 LLM 部署 | github.com/ollama/ollama |
| vLLM | 高性能推理 | github.com/vllm-project/vllm |

---

> 本文档基于《RAG全栈技术从基础到精通，打造高精准AI应用》课程整理
