# 04 · RAG 评测闭环

> **一句话**：没有评测集的 RAG 优化都是"我觉得变好了"——把直觉换成数字，再把数字接进 CI。
>
> **前置**：[03-混合检索与Rerank](./03-混合检索与Rerank.md)
> **产出**：一个 30-50 条的评测集 + 每次改动都能跑出分数的脚本
> **代码**：`apps/ai-course/shared/cost.ts` 同层思路；后端参考 `backend/internal/obs/eval.go`

---

## 1. 原理（够用即可）

RAG 出错时，问题可能出在**四个不同环节**，评测要先定位再优化：

```
① 检索没召回（Recall 低）   → 调分块 / Embedding / 混合权重
② 召回但没排上去（MRR 低）   → 上 Rerank
③ 上下文有了但模型没用（Faithfulness 低） → 改提示词 / 上下文格式
④ 答非所问（Relevancy 低）  → 改查询改写 / 换档位模型
```

四个指标就是四盏灯，先看哪盏亮，别一上来就调 Prompt。

### 常用指标

| 指标 | 衡量 | 常见计算 |
|---|---|---|
| **Retrieval Hit / Recall@K** | 正确块是否被召回 | 正确块在前 K → 1，否则 0 |
| **Faithfulness** | 答案是否忠于上下文（有没有编） | 答案内容 ∩ 上下文 / 答案内容 |
| **Answer Relevancy** | 答案是否回应问题 | 问题 ∩ 答案 的重合度 |
| **Context Precision** | 前 K 块里相关的比例 | 相关块数 / K |

---

## 2. 企业实现要点

### 后端参考实现：`internal/obs/eval.go`

本仓库已经跑通了一版评测，可以直接读源码：

| 项 | 实现 |
|---|---|
| 四指标 | RetrievalHit（overlap ≥ **0.3**）、Faithfulness、AnswerRelevancy、ContextPrecision（单块 overlap > **0.15**） |
| 判定阈值 | `FaithfulnessFail = 0.7`、`RelevancyWarn = 0.5`、`MinRetrievalHitRate = 0.6` — 任一告警即 Failed |
| 参数 | topK 默认 3，结果保留最近 50 次 |
| 接口 | `POST /api/ai/eval/run`、`GET /api/ai/eval/runs`、`GET/POST /api/ai/eval/datasets` |

> ⚠️ **诚实说明**：这四个分数是**词典重合度的代理值**（中文按单字切），不是 RAGAS 那样的语义评分。
> 源码注释里写得很清楚：余弦重合 0.5 与人工判定 0.8 的差距来自"字面重合 ≠ 语义一致"。
> 所以它的正确用法是**看趋势**（改了之后分数涨没涨），而不是当成绝对质量分对外汇报。

### 训练集怎么来

| 来源 | 优点 | 注意 |
|---|---|---|
| 人工标注 30-50 条 | 最准、最贴近业务 | 要标"应该命中哪块"，不只是标准答案 |
| 线上日志采样 | 真实分布 | 有偏（只覆盖用户真正问的） |
| 模型合成 QA | 快、量大 | 要人工抽检，否则会自我循环 |

**30-50 条就够起步**。评测集的价值在"每次改动都跑同一批"，不在数量。

### 把评测接进 CI

```
改 Prompt / 换模型 / 调分块
        ↓
跑评测集（几十秒）
        ↓
分数下降 > 阈值 → PR 失败并展示 diff
```
这样"改提示词"从玄学变成有回归保护的工程动作。

---

## 3. 代码实现

最小评测脚本的形态（和后端 Go 版同一思路，只是放在 TS 侧）：

```ts
interface EvalCase {
  question: string;
  expectedChunkIds: string[];   // 标注：应该命中哪些块
  referenceAnswer?: string;
}

function runEval(cases: EvalCase[], retriever: Retriever) {
  const rows = cases.map((c) => {
    const hits = retriever.search(c.question, 5);
    const hitRate = c.expectedChunkIds.some((id) => hits.some((h) => h.id === id)) ? 1 : 0;
    const precision = hits.filter((h) => c.expectedChunkIds.includes(h.id)).length / hits.length;
    return { hitRate, precision };
  });
  return {
    retrievalHitRate: avg(rows.map((r) => r.hitRate)),
    contextPrecision: avg(rows.map((r) => r.precision)),
  };
}
```

前端要能看到每次运行的分数与逐条明细——**看不到明细的评测没人会去查**。

---

## 4. 验证与观测

| 动作 | 期望 |
|---|---|
| 基线跑一次 | 得到 RetrievalHitRate / ContextPrecision 基线值 |
| 调整分块大小后重跑 | 分数变化可量化，能选出更优参数 |
| 换 Embedding 后重跑 | 同上（别忘了重建索引） |
| 把基线写进 CI | 分数跌破阈值时 PR 失败 |

验收标准：

- [ ] 有 ≥ 30 条标注数据，且记录了"应该命中哪块"
- [ ] 一条命令能跑出四个指标
- [ ] 能对比两次运行的差异（哪几条变差了）
- [ ] 知道当前分数的**可信度边界**（是代理值，不是语义分）

---

## 5. 面试追问

> **Q：RAG 效果不好，你怎么排查？**
> 不要直接改 Prompt。先分四层看：召回率（检索层）→ 排序（Rerank）→ 忠实度（上下文/提示词）→ 相关性（查询理解）。每层都有对应指标。

> **Q：没有标注数据怎么办？**
> 先从线上日志采样 50 条高频问题人工标注；同时用模型合成一批做扩充，但必须抽检。30-50 条就能开始跑趋势。

> **Q：评测分数下降多少算"坏了"？**
> 定业务阈值（本仓库：Faithfulness < 0.7、Relevancy < 0.5、RetrievalHitRate < 0.6 任一告警）。更实用的是看**相对跌幅**：比基线掉 5% 就人工 review。

> **Q：词典重合度当指标靠谱吗？**
> 不靠谱当绝对值，但靠谱当趋势。它的成本极低、可离线跑、无外部依赖，适合做 CI 门禁；对外汇报质量要换语义级评测（RAGAS 或人工抽检）。

> **Q：为什么评测要接 CI 而不是上线后观察？**
> 上线后观察的是"用户有没有投诉"，那是滞后且稀疏的信号。CI 门禁能在改动进入生产前就拦住回归。

---

## 6. 延伸阅读

- [附-RAG全栈技术实战](./附-RAG全栈技术实战.md)
- [第四关 · 评测体系与 CI 回归门禁](../04-第四关-企业级工程化/index.md) —— 把本章做法推广到 Prompt/模型变更
- 后端参考：`backend/internal/obs/eval.go`（含代理算法的取舍注释）、`internal/obs/prompt.go`（Prompt 版本与回滚）
