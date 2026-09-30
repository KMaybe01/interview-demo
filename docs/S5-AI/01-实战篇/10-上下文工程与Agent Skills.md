# 上下文工程与 Agent Skills

> **为什么单独成章**：2026 年 Agent 工程的胜负手已经不是"选哪个模型"，而是"模型在每一刻看到了什么"。
> Anthropic《2026 Agentic Coding Trends Report》把上下文工程列为开发者最重要的转型技能；
> 前端转型者往往写过状态管理，这一层反而是最能迁移既有经验的地方。

---

## 一句话理解

| 概念 | 前端类比 | 说明 |
|---|---|---|
| **Prompt** | 一行 JSX | 单次指令，写清楚"做什么" |
| **Context（上下文）** | 整个组件树的 props + store 快照 | 模型做决策时能看到的一切 |
| **Context Engineering** | 状态管理设计（select / memo / 边界） | 决定什么信息在什么时刻进入上下文，以及何时被裁剪 |
| **Agent Skills** | 可复用的业务组件库 | 把"做事方法"沉淀为可版本化、可复用、按需加载的能力单元 |

**核心认知**：上下文是**有预算的稀缺资源**，不是"能塞多少塞多少"。
上下文越多 ≠ 效果越好：无关信息会稀释注意力、抬高成本、拖慢 TTFT，还会引入污染与注入风险。

---

## 一、上下文的五个层次

从内到外，每层都要单独设计：

| 层次 | 内容 | 常见错误 | 处理手法 |
|---|---|---|---|
| **1. 系统指令** | 角色、边界、输出格式、安全约束 | 越写越长，互相矛盾 | 保持在几百行内；冲突规则显式排序；用结构化格式 |
| **2. 工具定义** | 工具名、描述、schema | 一股脑注册几十个工具 | 按场景分组挂载；描述写"何时用/何时不用"；schema 用完整 JSON Schema 但限制深度 |
| **3. 检索内容** | RAG 召回、MCP 资源 | 召回 50 段全塞进去 | topK 控制 + Rerank + 去重 + 引用溯源；配合缓存 TTL |
| **4. 对话历史** | 多轮消息、工具调用轨迹 | 无限追加直到超窗 | 滑动窗口 + 摘要压缩 + 工具结果裁剪（只留关键字段） |
| **5. 输出约束** | 结构化 schema、格式示例 | 靠自然语言描述格式 | 用 `Output.object({ schema })` 强约束，前端才能稳定渲染 |

### 上下文预算（Context Budget）

一个可落地的分配示例（按 token 计）：

```
总窗口 200K
├─ 系统指令          3%   固定，永不裁剪
├─ 工具定义         10%   按场景挂载，非全量
├─ 检索内容         30%   topK + Rerank 后的结果
├─ 对话历史         40%   最近 N 轮 + 更早的摘要
└─ 输出预留         17%   保证不被输入挤爆
```

> 预算不是一次性设定：用可观测性记录"实际输入 token 分布"，按 P95 调整（见
> [05-生产化与工程化](./05-生产化与工程化.md)）。

---

## 二、上下文工程四板斧

### 1. 选择（Select）——少即是多

```typescript
// ❌ 反模式：把整个知识库塞进 system
const system = allDocs.map(d => d.content).join('\n');

// ✅ 先检索再注入：只放命中的片段，并带上引用
const hits = await vectorStore.similaritySearchWithScore(query, 5);
const context = hits
  .filter(([, score]) => score > THRESHOLD)
  .map(([doc, score], i) => `[${i + 1}] ${doc.pageContent}`)
  .join('\n---\n');
```

### 2. 压缩（Compress）——历史与工具结果

```typescript
// 工具结果往往很大（整页 HTML、完整 JSON），裁剪后再回灌给模型
function compactToolResult(raw: string, maxChars = 2000): string {
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n...[已截断，共 ${raw.length} 字符]`;
}

// 历史压缩：超过窗口时，把早期对话替换为摘要消息
function compactHistory(messages: UIMessage[], keepRecent = 6) {
  if (messages.length <= keepRecent) return messages;
  const early = messages.slice(0, -keepRecent);
  const summary = summarize(early); // 可用低成本档模型做摘要
  return [{ id: 'summary', role: 'system', parts: [{ type: 'text', text: `历史摘要：${summary}` }] }, ...messages.slice(-keepRecent)];
}
```

### 3. 隔离（Isolate）——子 Agent 与沙箱

把"探索性、脏活"放到**子 Agent / 沙箱**里跑，只把结论回传主上下文：

- 主 Agent 保持短上下文（只含目标与结论）
- 子 Agent 可以在长上下文里翻文档、跑命令、试错
- 收益：主上下文不被污染，成本与延迟可控

> 对应 AI SDK 7 的 `ToolLoopAgent` + `SandboxSession`；详见 [09-AI SDK 数据连接与聊天](./09-AI%20SDK%20数据连接与聊天.md)。

### 4. 缓存（Cache）——省钱与降延迟

- **Prompt 前缀缓存**：系统指令 + 工具定义放在最前面且保持稳定，命中缓存可显著降本降延迟
- **工具列表缓存**：MCP `2026-07-28` 的 `tools/list` 结果带 `ttlMs` / `cacheScope`，不要每次重拉
- **检索缓存**：对高频 query 做语义缓存（注意 `cacheScope: private` 的用户隔离边界）

---

## 三、Agent Skills：把"做事方法"变成资产

### 什么是 Skill

Skill = **一段可版本化、可复用、按需加载的"能力说明书"**（指令 + 资源 + 可选脚本）。
它不是 Prompt 模板，而是有目录结构、有元数据、能被 Agent 运行时**渐进式加载**的单元。

典型结构：

```
my-skill/
├── SKILL.md              # 必需：能力说明 + 使用时机 + 步骤
├── references/           # 可选：按需读取的参考资料
│   └── api-spec.md
└── scripts/              # 可选：可执行脚本（确定性步骤交给代码）
    └── scaffold.ts
```

```markdown
---
name: release-notes
description: 根据 Git 提交历史生成发布说明，并按变更类型分组。用于发版、周报、变更日志场景。
---

# Release Notes

## 何时使用
- 用户要求生成发版说明 / changelog / 周报
- 需要把提交记录按 feat / fix / refactor 分组

## 步骤
1. 运行 `scripts/collect-commits.ts` 获取区间内的提交（**不要**自己猜提交范围）
2. 按 Conventional Commits 类型分组
3. 输出 Markdown，保留 breaking change 高亮

## 约束
- 只依据实际提交，不臆测未记录的改动
- 不输出内部私密分支名
```

### 渐进式披露（Progressive Disclosure）

| 加载时机 | 内容 | 目的 |
|---|---|---|
| **常驻** | 所有 Skill 的 `name` + `description`（几百 token） | 让模型知道"有哪些能力" |
| **命中时** | 对应 Skill 的 `SKILL.md` 正文 | 只在需要时付出上下文成本 |
| **执行中** | `references/` 与 `scripts/` 的具体内容 | 按需读取，读完即弃 |

> 这正是上下文工程在"能力组织"上的落地：**元数据常驻，正文按需**。

### Skills 与相邻概念的区别

| 概念 | 粒度 | 谁执行 | 典型载体 |
|---|---|---|---|
| **Prompt** | 单次指令 | 模型 | 字符串 |
| **Tool / MCP Server** | 单个动作 | 代码（确定性） | MCP `tools/call` |
| **Skill** | 一类任务的**方法论** | 模型 + 脚本混合 | `SKILL.md` 目录 |
| **Sub-Agent** | 独立上下文的完整执行体 | 另一个 Agent 循环 | 框架运行时 |
| **MCP Apps / A2UI** | 交互界面 | 前端渲染 | `ui://` 资源 / 组件树 |

### 规则文件：`AGENTS.md` / `CLAUDE.md`

2026 年的事实标准：

- **`AGENTS.md`**：开放标准，被 Claude Code、Cursor、Codex、Windsurf、Gemini CLI 等主流工具共同支持，可跨工具移植
- **`CLAUDE.md`**：Anthropic 系工具的规则文件，优先级高于 `AGENTS.md`

写法要点（和写 Skill 一致）：**短、具体、可执行、可验证**。
避免把整个项目文档堆进去——那是上下文污染，不是上下文工程。

---

## 四、落地清单

| 阶段 | 动作 | 验收标准 |
|---|---|---|
| ① 盘点 | 统计每次请求的输入 token 构成（系统/工具/检索/历史） | 能说出四类占比 |
| ② 设预算 | 给每类设上限，超限即裁剪或告警 | P95 输入 token 稳定在预算内 |
| ③ 裁剪 | 工具结果截断 + 历史摘要 + 检索 Rerank | 相同任务下 token 下降且质量不降 |
| ④ 缓存 | 稳定前缀 + 工具列表 TTL + 语义缓存 | 命中率可观测 |
| ⑤ 沉淀 | 高频任务抽成 Skill，配 `AGENTS.md` | 新会话无需重复说明即可执行 |
| ⑥ 回归 | 用固定评测集对比改动前后 | eval 指标不回退 |

> ⚠️ 任何上下文改动都要配 **eval**：改 prompt/裁剪/换模型都可能悄悄劣化质量，
> 评测集与回归流程见 [05-生产化与工程化](./05-生产化与工程化.md)。

---

## 五、面试问答

**Q：什么是上下文工程？和 Prompt 工程有什么区别？**

> Prompt 工程关注"这一句话怎么说"；上下文工程关注"模型在做决策的那一刻，视野里有什么"。
> 后者要处理预算分配（系统指令 / 工具 / 检索 / 历史 / 输出）、裁剪与压缩、缓存命中、
> 以及子 Agent 隔离，是系统性工程而不是文案工作。

**Q：上下文越多越好吗？**

> 不是。无关内容会稀释注意力、抬高成本与延迟，并扩大注入攻击面。实践上先做**选择**（检索/Rerank），
> 再做**压缩**（历史摘要、工具结果截断），必要时**隔离**到子 Agent，最后用**缓存**降本。

**Q：Skill 和 Tool 有什么区别，什么时候该抽 Skill？**

> Tool 是确定性动作，由代码执行；Skill 是一类任务的方法论，由模型按步骤执行（步骤里可以调 Tool/脚本）。
> 当一个任务需要"多步 + 领域约定 + 参考资料"，且会**重复出现**时，就该抽成 Skill，
> 用渐进式披露控制上下文成本。

---

## 延伸阅读

- [09-AI SDK 数据连接与聊天](./09-AI%20SDK%20数据连接与聊天.md) — `ToolLoopAgent`、`uploadSkill`、`Output.object`
- [06-前沿技术与生态](./06-前沿技术与生态.md) — MCP `2026-07-28` 的缓存提示（`ttlMs` / `cacheScope`）与 Tasks
- [11-生成式UI与前端AI组件生态](./11-生成式UI与前端AI组件生态.md) — Skill 产出的界面怎么渲染
