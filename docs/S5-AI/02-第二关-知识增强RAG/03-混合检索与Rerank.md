# 03 · 混合检索与 Rerank

> **一句话**：向量检索懂"语义"，关键词检索懂"专有名词"；两个都要，再用 Rerank 把顺序排对。
>
> **前置**：[02-分块与Embedding策略](./02-分块与Embedding策略.md)
> **产出**：召回率可量化、Top-K 排序可信的检索层
> **代码**：`apps/ai-course/server/rag.ts`

---

## 1. 原理（够用即可）

| 检索方式 | 擅长 | 不擅长 |
|---|---|---|
| **向量检索**（稠密） | 同义改写、口语化提问 | 专有名词、型号、报错码、精确数字 |
| **关键词检索**（BM25 / 稀疏） | 精确词匹配、低频专有词 | 同义改写、语序变化 |
| **混合** | 两者互补 | 需要融合策略 |

**融合**：最常用的是 **RRF（Reciprocal Rank Fusion）**——不看分数只看名次：

```
score(d) = Σ  1 / (k + rank_i(d))      k 通常取 60
```
优点：两路分数不可比也能融合；不需要调参。

**Rerank**：召回 Top-50 → 用交叉编码器（cross-encoder）精排 → 取 Top-5。
它把 query 和候选拼在一起过一遍模型，精度高但**慢**，所以只能用在少量候选上。

---

## 2. 企业实现要点

### 什么时候才需要 Rerank

| 场景 | 建议 |
|---|---|
| Top-K ≤ 5、文档少、问答简单 | **不上 Rerank**，先把分块和 Embedding 调好 |
| Top-K 较大 / 文档库大 / 精度要求高 | 上 Rerank，注意它增加在线延迟（通常 50-300ms） |
| 延迟预算极紧 | 只在旗舰档链路开 Rerank，快速档不开 |

> 顺序很重要：**先修分块和 Embedding，再考虑 Rerank**。很多"需要 Rerank"的问题，其实换成分块策略就解决了，而且更便宜。

### 混合检索的权重怎么定

专有名词密集的领域（API 文档、法务、医疗编码、报错码）→ BM25 权重调高；
口语化提问多、同义改写多（客服 FAQ、知识社区）→ 向量权重调高。
不必一开始就上加权公式，**先用 RRF**，等两路的真实表现数据出来了再调。

### 后端参考实现

`backend/internal/airouter/runner.go` 的检索参数可以直接对照：

| 参数 | 默认值 | 位置 |
|---|---|---|
| TopK | **3** | 检索调用处 |
| 上下文注入格式 | `[n] (score=…) 内容` | 渲染 `chat.system` 时 |
| 检索用 query | **脱敏后**的 query | 护栏 `InspectInput` 之后 |
| 离线兜底 | 哈希向量 + `Cosine` | `internal/llm/offline.go` |

注意一个细节：**检索发生在护栏之后**，用的是脱敏后的 query。这既避免敏感信息进入检索日志，也符合最小权限原则。

---

## 3. 代码实现

教程代码里，检索是可替换的一层：

```ts
export interface Retriever {
  search(query: string, topK: number): Promise<Chunk[]>;
}

// 现在：BM25 思路的关键词检索（零依赖，先把链路跑通）
export const keywordRetriever: Retriever = { search: (q, k) => search(q, k) };

// 之后：换成向量 / 混合 / 混合+Rerank，只需要替换这个实现
```

接入链路的方式不变：

```ts
const chunks = await retriever.search(safeQuery, topK);
const context = buildContext(chunks);        // "[1] (score=0.82) …"
const { model, entry } = resolveModel(tier);
const result = streamText({ model, system: `${SYSTEM}\n\n参考：\n${context}`, ... });
```

---

## 4. 验证与观测

| 指标 | 定义 | 怎么测 |
|---|---|---|
| **Recall@K** | 正确块是否出现在前 K 个结果里 | 人工标注 30-50 条 QA，脚本跑一遍 |
| **MRR** | 正确块的排名倒数 | 同上 |
| **Context Precision** | 前 K 里有多少比例是相关的 | 本仓库 Go 侧 `internal/obs/eval.go` 有用单块 overlap > 0.15 的代理算法 |
| **端到端延迟** | 检索 + 生成 | Trace 里看 retrieval span |

验收标准：

- [ ] 有两个以上检索实现可切换，且切换不影响上层代码
- [ ] 30 条标注 QA 上 Recall@5 ≥ 0.8（业务强相关，需自定义阈值）
- [ ] 召回块能在前端展示 score 与来源，便于人工排查

---

## 5. 面试追问

> **Q：有了向量检索，为什么还要关键词检索？**
> 向量对低频专有词（型号、报错码、人名、法条号）表征能力弱，而这些恰恰是用户最常精确查询的。BM25 正好反过来，所以混合。

> **Q：RRF 为什么比分数加权好？**
> 两路的分数尺度不可比（余弦相似度 vs BM25 分）。RRF 只用名次，不需要归一化，也不需要调权重。

> **Q：Rerank 放在什么位置？**
> 召回之后、拼上下文之前。它是"精排"，输入是召回的几十条候选；直接对全库 rerank 成本不可接受。

> **Q：Top-K 选大了为什么反而变差？**
> 噪声进入上下文，模型被无关信息干扰（"迷失在中间"），且成本和延迟都上升。

> **Q：怎么判断该不该上 Rerank？**
> 看 Recall@K 曲线：如果 Recall@5 低但 Recall@50 高，说明"召回得到但排不上去"——这正是 Rerank 的用武之地。

---

## 6. 延伸阅读

- [04-RAG评测闭环](./04-RAG评测闭环.md)
- [第四关 · 可观测性 Trace](../04-第四关-企业级工程化/index.md) —— 把 retrieval 做成 span
- 后端参考：`backend/internal/knowledge/`（向量检索）、`backend/internal/obs/eval.go`（评测指标）
