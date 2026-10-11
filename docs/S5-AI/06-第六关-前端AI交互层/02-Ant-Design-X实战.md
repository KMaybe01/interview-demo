# 02 · Ant Design X 实战

> **一句话**：用 `@ant-design/x` 的原子化组件，半小时拼出**像产品**的 AI 界面——而不是手写一堆 div 和 useState。
>
> **前置**：[01-生成式UI与组件生态](./01-生成式UI与组件生态.md)
> **产出**：一个具备对话管理、欢迎态、快捷提示、流式气泡的企业级聊天界面
> **代码**：`apps/ai-demo/src/components/AIChat.tsx`（成品）、`apps/ai-demo/src/services/aiStream.ts`（流式）

---

## 1. 原理（够用即可）

Ant Design X 是**原子化**的：它不给你一个"聊天页面"，而是给你几个可组装的零件。

| 组件 | 解决什么 | 手写要花多久 |
|---|---|---|
| `Bubble.List` | 消息列表 + 角色预设 + typing/淡入动画 + 流式标记 | 半天 |
| `Sender` | 输入框 + loading 态 + 取消 + Enter/Shift+Enter | 小半天 |
| `Conversations` | 会话历史侧栏：创建/切换/重命名/删除 + 右键菜单 | 一天 |
| `Welcome` | 空状态欢迎卡片 | 1 小时 |
| `Prompts` | 快捷提示词按钮 | 1 小时 |
| `XProvider` | 主题与 locale 全局配置 | — |

> 选型判断：**中后台系统里加 AI 功能**首选它（和 antd 设计体系统一）；做独立 AI 产品要极致交互可看 `assistant-ui` / `CopilotKit`。

---

## 2. 企业实现要点

### 与 AI SDK 的关系

两者可以并存，也可以只用其一：

| 组合 | 适用 |
|---|---|
| **Ant Design X + 自建流式客户端** | 本仓库 `apps/ai-demo` 的做法：`aiStream.ts` 手写 SSE 解析 + Go 后端 |
| **Ant Design X + AI SDK `useChat`** | 想要 AI SDK 的状态机，又想用 X 的视觉与交互 |
| 纯 AI SDK + 自绘 UI | 轻量、可控，但交互细节要自己补 |

本仓库选第一种的理由很实在：**后端是 Go，流式协议是自定义的 SSE 事件**（`start/delta/sources/tool_call/approval_required/usage/done`），AI SDK 的 transport 需要适配层；而教学主线（`apps/ai-course`）用 AI SDK 是因为它更贴近前端心智。

> 所以：**协议层是共通的，差异只在 SDK 封装**。面试时把这句话说清楚很加分。

### 流式解析是这里的硬骨头

`apps/ai-demo/src/services/aiStream.ts` 值得逐行读：

- TCP 不保留消息边界 → 必须**累积 buffer，按 `\n\n` 切帧**
- 一个逻辑事件可能被拆成多个 chunk → 切出来的半包要留到下一轮
- 服务端每 15 秒发心跳 → 客户端要能容忍非业务帧

### 状态设计：让"它在干什么"可见

信任来自可解释。至少要区分这些状态：

| 状态 | UI 表现 |
|---|---|
| `submitted`（等待首字） | "正在思考…" + 可取消 |
| `streaming` | 打字机 + 停止按钮 |
| `tool-calling` | 工具卡片（第三关） |
| `awaiting_approval` | 审批卡片（第三关 HITL） |
| `error` | 错误横幅 + 重试 |
| `degraded` | **明确标注"降级模式"**（第四关） |

---

## 3. 代码实现

最小的组装骨架（真实代码见 `apps/ai-demo/src/components/AIChat.tsx`）：

```tsx
<XProvider theme={{ token: { ... } }}>
  <Conversations items={sessions} activeKey={active} onActiveChange={switchSession} />
  {messages.length === 0
    ? <Welcome title="有什么可以帮你？" />
    : <Bubble.List items={messages.map(toBubbleItem)} roles={roles} />}
  <Prompts items={quickPrompts} onItemClick={send} />
  <Sender loading={isStreaming} onCancel={stop} onSubmit={send} />
</XProvider>
```

`Bubble.List` 的 `roles` 预设是关键：把「我/AI」的头像、位置、样式一次性配好，列表里只关心内容。

---

## 4. 验证与观测

| 检查项 | 方法 | 达标 |
|---|---|---|
| 首字延迟 | 从发送到第一个字出现 | < 1s |
| 打字机流畅 | 观察是否有明显卡顿/整段跳出 | 逐批到达 |
| 取消生效 | 点击停止 | 前端停止**且服务端也停止** |
| 会话切换 | 切走再切回 | 消息与滚动位置保持 |
| 空状态 | 清空会话 | 显示 Welcome + Prompts |

---

## 5. 面试追问

> **Q：为什么不用 AI SDK 而要手写 SSE 解析？**
> 当后端协议不是 AI SDK 的 UI Message Stream 时（本仓库是自定义事件 + Go 后端），transport 需要适配。手写解析器的核心难点是 **TCP 分帧边界**：按 `\n\n` 缓冲切帧，不能按行读。

> **Q：AI 聊天界面和普通列表有什么不同？**
> 三点：内容**增量到达**（要处理流式与中断）、结构**运行时决定**（Markdown/组件 DSL）、状态**多样**（思考中/工具调用/待审批/降级）。

> **Q：怎么防止模型输出的 Markdown / HTML 导致 XSS？**
> 渲染前净化（DOMPurify 之类）+ 组件白名单；生成式 UI 场景只允许渲染白名单组件，禁止任意 HTML。

> **Q：会话历史放前端还是后端？**
> 长期记忆放后端（多端同步、可审计）；前端只做当前会话的乐观 UI 与草稿。Token 成本角度：历史越长越贵，要做裁剪或摘要。

> **Q：为什么降级态必须显示出来？**
> 降级回答外观和正常回答一样。不标注等于欺骗用户，也没法统计降级率（第四关）。

---

## 6. 延伸阅读

- [01-生成式UI与组件生态](./01-生成式UI与组件生态.md)
- [03-端侧推理](./03-端侧推理.md)
- [第一关 · 流式协议与前端渲染](../01-第一关-流式对话/03-流式协议与前端渲染.md)
- 成品代码：`apps/ai-demo/src/components/AIChat.tsx`、`apps/ai-demo/src/services/aiStream.ts`
