# 附 · hello-agents 精读导引

> **性质**：本文是**阅读导引**而非原文搬运。`hello-agents` 是 `https://github.com/datawhalechina/hello-agents` 下的 Datawhale《从零开始构建智能体》系统教程（16 章 + 自研 HelloAgents 框架），体量很大，**不要求通读**，按下面清单取用即可。
>
> **与本章关系**：它是本专题「从 0 手搓 Agent」最贴手的教学材料，与 `how-pi-agent-works`（Pi Agent 教学版）互为补充。

---

## 建议阅读顺序（按需取用）

| 主题 | 在 `hello-agents` 中的位置 | 对应本专题 |
|---|---|---|
| ReAct / Plan-and-Solve / Reflection 手搓 | 经典范式章节 | 01 Agent Loop、[第三关 · Agent 设计模式](../03-第三关-Agent与工具/01-Agent设计模式.md) |
| 自研 HelloAgents 框架 | 框架实现章节 | 01 / 02 工具系统 |
| RAG（文档加载 / 分块 / 嵌入 / 检索） | RAG 章节 | [第二关 · 知识增强 RAG](../02-第二关-知识增强RAG/index.md) |
| 记忆与上下文工程 | 记忆章节 | 03 上下文压缩、[第四关 · 上下文工程](../04-第四关-企业级工程化/03-上下文工程与Skills.md) |
| MCP · A2A · ANP 协议 | 协议章节 | [第五关 · 协议与多 Agent](../05-第五关-协议与多Agent/index.md) |
| 多 Agent 案例（旅行助手 / 赛博小镇） | 案例章节 | 04 子 Agent 编排 |
| Agentic-RL | 进阶章节 | 选读，面试加分项 |

## 与 `how-pi-agent-works` 的分工

- `hello-agents`：**宽**——覆盖范式、RAG、协议、多 Agent、RL，适合建立全景。
- `how-pi-agent-works`：**深**——只抠「Pi Agent 一个实现」，从 Loop 到会话树到上下文压缩，4 个渐进 TS Demo，适合照着写。

> 学习路线建议：先 `hello-agents` 建立范式全景 → 再用 `how-pi-agent-works` 把一个 Agent 写跑 → 最后用 `claude-code-book` 看工业级 harness 怎么把这些都产品化。

## 注意

`hello-agents` 为外部开源教程，正文不在本仓库内。引用其结论时请回到 `https://github.com/datawhalechina/hello-agents` 原文核对版本与示例代码，不要凭记忆转述。
