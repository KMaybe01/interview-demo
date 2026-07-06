## 🚀 [React 19](https://react.dev) 完整学习指南

> 🎯 **面试星级**：★★★★★ | **建议用时**：5 天
> React 19 系统学习指南，融合核心原理、高级特性、工程实践与面试题，从入门到精通、源码级原理、React Compiler 深度、项目实战重难点、内存泄漏排查、深度面试追问题

### 🎯 React 核心概念关系图

```mermaid
mindmap
  root((React 核心))
    组件系统
      函数组件
      JSX 语法
      Props / State
      组合模式
    Hooks 系统
      useState
      useEffect
      useContext
      useReducer
      useRef
      自定义 Hooks
    并发特性
      startTransition
      useDeferredValue
      Suspense
      ["use()"]
    服务端组件
      RSC 架构
      'use client'
      流式 SSR
      选择性水合
    状态管理
      Context API
      Zustand
      Redux Toolkit
      Jotai/Recoil
    数据获取
      TanStack Query
      SWR
      React Query
    路由系统
      React Router
      Next.js App Router
      动态路由
      嵌套路由
    工程化
      Vite / Webpack
      TypeScript
      测试策略
      React Compiler
```

### 📈 React 技术栈完整知识体系

```mermaid
flowchart TB
    subgraph 基础层
        A1["HTML/CSS/JS"] --> A2["TypeScript"]
        A2 --> A3["ES6+ 语法"]
    end

    subgraph React 核心
        B1["组件化思想"] --> B2["JSX 语法"]
        B2 --> B3["Hooks 系统"]
        B3 --> B4["状态管理"]
    end

    subgraph 并发特性
        C1["Fiber 架构"] --> C2["时间切片"]
        C2 --> C3["优先级调度"]
        C3 --> C4["Suspense"]
    end

    subgraph 服务端渲染
        D1["Next.js"] --> D2["SSR/SSG/ISR"]
        D2 --> D3["RSC 架构"]
        D3 --> D4["流式渲染"]
    end

    subgraph 高级主题
        E1["性能优化"] --> E2["React Compiler"]
        E2 --> E3["虚拟列表"]
        E3 --> E4["内存管理"]
    end

    A3 --> B1
    B4 --> C1
    C4 --> D1
    D4 --> E1
```

## 第一部分：核心基础

### 1️⃣ React 是什么？

#### 📌 核心定义

**React** 是由 Facebook 开发的 JavaScript 库，用于构建用户界面。它通过**组件化思想**和**声明式编程**，帮助开发者高效构建交互式、动态的 Web 应用。

```jsx
// React 的三大特性：
// 1. 声明式：描述你想要什么，而不是如何实现
// 2. 组件化：封装独立可复用的 UI 单元
// 3. 虚拟 DOM：高效批量更新真实 DOM
```

#### 🎯 React 的核心角色

```mermaid
graph TD
    A["React 库"] --> B["组件系统"]
    A --> C["虚拟 DOM"]
    A --> D["状态管理"]
    A --> E["事件处理"]

    B --> B1["函数组件"]
    B --> B2["类组件"]
    B --> B3["组件复用"]

    D --> D1["useState"]
    D --> D2["useContext"]
    D --> D3["Redux/Zustand"]
```

#### 📊 React vs 其他框架

| 特性 | React | Vue | Angular |
|-----|-------|-----|---------|
| 学习曲线 | 🟡 中等 | 🟢 平缓 | 🔴 陡峭 |
| 灵活性 | ✅ 极高 | ⚠️ 中等 | ❌ 受限 |
| 生态系统 | ✅ 最庞大 | ⚠️ 中等 | ✅ 完整 |
| 性能 | ✅ 优秀 | ✅ 优秀 | ✅ 优秀 |
| 企业应用 | ✅ 完美 | ⚠️ 可行 | ✅ 完美 |

#### 🗺️ 课程学习路径

```mermaid
graph LR
    A["第1章<br/>React 概述"] --> B["第2章<br/>环境搭建"]
    B --> C["第3章<br/>组件化基础"]
    C --> D["第4章<br/>高效渲染"]
    D --> E["第5章<br/>Tailwind CSS"]
    E --> F["第6章<br/>状态管理"]
    F --> G["第7章<br/>TypeScript"]
    G --> H["第8章<br/>路由系统"]
    H --> I["第9章<br/>数据请求"]
    I --> J["第10章<br/>Context API"]
    J --> K["第11章<br/>Hooks 深入"]
    K --> L["第12章<br/>useReducer"]
    L --> M["第13章<br/>Redux/RTK"]
    M --> N["第14章<br/>全栈实战"]
```

#### 🎨 React 五大设计理念深度解析

React 的设计哲学可以概括为 **"UI = f(state)"** — 视图是状态函数的输出。这个简洁公式背后是五大设计理念的支撑。

##### ① 声明式（Declarative）

> **核心思想**：描述"想要什么"，而非"怎么做"

```jsx
// ❌ 命令式（jQuery 思维）
const div = document.createElement('div');
div.className = 'card';
div.textContent = 'Hello';
parent.appendChild(div);

// ✅ 声明式（React 思维）
function Card({ text }) {
  return <div className="card">{text}</div>;
}
```

**为什么重要？**
- **认知负荷降低**：开发者的精力集中在"什么状态对应什么 UI"，而非 DOM 操作的细节
- **可预测性**：给定相同 props + state，永远渲染相同结果
- **React 帮你做"脏活"**：Diff 对比、批量更新、DOM 操作全由框架管理
- **本质是抽象**：声明式将"如何操作 DOM"的复杂性封装在框架层

##### ② 组件化（Component-Based）

> **核心思想**：UI = 组件树（compose(Component₁, Component₂, ...)）

```jsx
// 组件 = 独立单元
function UserCard({ user }) {
  return (
    <Card>
      <Avatar src={user.avatar} />
      <Name>{user.name}</Name>
      <Stats posts={user.postCount} />
    </Card>
  );
}
```

**为什么重要？**
- **单一职责**：每个组件只做一件事，降低复杂度
- **可复用性**：组件像乐高积木，自由组合
- **可测试性**：每个组件独立测试，无需渲染整个页面
- **并行开发**：组件是天然的开发边界，团队可并行工作

##### ③ 虚拟 DOM（Virtual DOM）

> **核心思想**：在内存中维护 UI 的轻量级表示，批量计算差异后再操作真实 DOM

```
状态变化 → 新虚拟 DOM → Diff(旧虚拟DOM, 新虚拟DOM) → Patch(真实DOM)
```

**虚拟 DOM 的核心价值：**

1. **声明式编程**：开发者只需描述UI状态，框架处理DOM更新细节
2. **跨平台抽象**：同一套组件代码可渲染到Web、Native、Terminal等多平台
3. **性能保底**：即使开发者未做优化，也能保证基本性能
4. **高效 Diff**：O(n)复杂度的差异比较算法，比手动操作更可靠

**虚拟 DOM 的本质是"性能保底"**：React 通过虚拟 DOM 保证即使在没有手动优化的情况下，性能也不会太差。React 的设计原则是 **"默认足够快，需要极致时可手动优化"**。

**虚拟 DOM 的终极评价：** 它不是最快的 UI 更新方案（直接操作 DOM 或 Fine-grained Reactivity 更快），但它是**最优雅的折衷方案**——在开发体验（声明式）、性能（批量更新）、跨平台（抽象层）之间找到了最佳平衡点。React Compiler 的目标是通过编译时优化减少不必要的 Diff，进一步提升性能。

##### ④ 函数式编程（Functional）

> **核心思想**：纯函数 + 不可变数据

```jsx
// ❌ 可变数据（违反函数式）
function BadList({ items }) {
  items.push('new item');  // 直接修改 props
  return <ul>{items.map(/* ... */)}</ul>;
}

// ✅ 不可变数据
function GoodList({ items }) {
  return <ul>{[...items, 'new item'].map(/* ... */)}</ul>;
}
```

**为什么重要？**
- **可预测性**：纯函数 → 相同输入永远相同输出
- **时间旅行调试**：不可变数据允许保存/回放状态快照
- **并发安全**：不可变数据天然支持 React 18+ 的并发渲染
- **易于推理**：无需追踪"谁修改了什么"

##### ⑤ 一次学习，随处编写（Learn Once, Write Anywhere）

```
React DOM      → Web 应用
React Native   → iOS / Android 原生应用
React Three    → 3D 场景（Three.js 封装）
React Ink      → 命令行终端 UI
React 360      → VR 应用
React PDF      → PDF 文档生成
```

**设计决策：** React 将"平台无关的 UI 逻辑"与"平台特定的渲染"彻底分离。`react` 包只关心组件树、状态、生命周期；渲染到哪个平台由 `react-dom`/`react-native` 等负责。这是 React 跨平台的架构基石。

#### React 19 核心新特性

| 特性 | 说明 | 适用场景 |
|------|------|---------|
| **Server Components** | 组件在服务端渲染，零客户端JS | 静态内容、数据展示 |
| **Server Actions** | 服务端表单处理，无需API层 | 表单提交、数据变更 |
| **React Compiler** | 自动memo化，减少手动优化 | 所有React应用 |
| **use() Hook** | 在渲染时读取Promise/Context | 数据获取、异步操作 |
| **Asset Loading** | 组件级资源加载管理 | 图片、字体、脚本 |

---

#### 💡 一个公式理解 React

```
UI = f(state)
│     │
▼     ▼
视图  纯函数  状态
```

- **f** 是 React 组件（理想中的纯函数，实际可能包含副作用）
- **state** 包括 props / state / context
- React 在 **f 变化时** 自动重新计算 UI

> ⚠️ **注意**：公式 `UI = f(state)` 描述的是**渲染逻辑**这一层。完整的 React 组件还会涉及**副作用**（`useEffect` / `useLayoutEffect`、外部 IO、订阅等），实际公式更接近 `UI = f(state) + Effects`。`React 19` 引入的 `use()` / `Actions` 等机制让"渲染 + 副作用"的边界更模糊，但**核心思想**仍是"UI 是状态的派生"。

**与 Vue / Angular 的核心差异：**

| 维度 | React | Vue | Angular |
|------|-------|-----|---------|
| **UI 公式** | UI = f(state) | UI = template + state | UI = class + template |
| **更新时机** | setState → 全量重渲染 | Proxy 自动追踪 → 精确更新 | Zone.js → 全量检测 / Signals 精确 |
| **数据流** | 单向（强制） | 双向（v-model 可选） | 双向（[(ngModel)]） |
| **副作用** | useEffect 显式管理 | watchEffect 自动追踪 | 生命周期 + Observable |
| **范式的本质** | **纯函数式**: 状态快照不可变 | **响应式**: 状态变化自动追踪 | **面向对象**: 类 + 装饰器 |

---

### 2️⃣ React 版本迭代史（2013—2026）

> React 的演进史，就是前端声明式编程的进化史。

#### 版本演进路线图

```mermaid
timeline
    title React 版本演进（2013—2026）
    2013 : React 0.3 开源
         : 虚拟 DOM 新范式
    2016 : React 15
         : React Native 跨平台
    2017 : React 16 Fiber
         : 架构重写（核心转折）
    2019 : React 16.8 Hooks
         : 函数式革命
    2022 : React 18
         : 并发模式
     2024 : React 19
          : Actions + Compiler
    2026 : React 19 生态成熟
         : RSC 普及化
```

#### 关键版本逐代解析

| 版本 | 年份 | 核心变化 | 对开发者的影响 |
|------|------|---------|--------------|
| **React 0.3** | 2013 | 虚拟 DOM，JSX 首次开源 | 开创性范式：声明式 UI |
| **React 15** | 2016 | DOM 重构 + React Native | 跨平台能力，一次学习随处编写 |
| **React 16** | 2017 | **Fiber 架构重写** | 可中断渲染，优先级调度 |
| **React 16.8** | 2019 | **Hooks** 发布 | 函数组件拥有状态，告别 class |
| **React 17** | 2020 | 渐进升级桥梁版 | 无重大新特性，平滑过渡 |
| **React 18** | 2022 | 并发模式、自动批处理 | 更好的用户体验，Suspense 完善 |
| **React 19** | 2024 | Actions、use()、React Compiler | 表单革新、自动记忆化、RSC |

#### React 15 → 16 → 17 → 18 → 19 核心变化

| 维度 | 15 (DOM) | 16 (Fiber) | 17 | 18 (Concurrent) | 19 (Compiler) |
|------|---------|-----------|-----|-----------------|---------------|
| **架构** | Stack 栈递归 | Fiber 链表中断 | 桥接 | 并发模式 | 编译优化 |
| **渲染** | 同步不可中断 | 可中断/恢复 | 渐进升级 | 自动批处理 | 自动记忆化 |
| **组件** | class 为主 | class + function | 过渡 | 函数为主 | 函数 + Server |
| **状态** | setState | setState + Hooks(2019) | Hooks 完善 | useDeferredValue | Actions + use() |
| **编译** | 无 | 无 | React Refresh | 基础优化 | **React Compiler** |
| **生态** | 早期 | Redux 为主 | Context 增强 | Suspense + Streaming | RSC 主流 |

**Fiber 架构核心突破：**
```jsx
// Fiber 节点结构（简化）
interface Fiber {
  tag: WorkTag          // 节点类型
  key: string | null    // 唯一标识
  type: any             // 函数/类/原生标签
  stateNode: any        // 对应真实 DOM

  return: Fiber | null  // 父节点
  child: Fiber | null   // 第一个子节点
  sibling: Fiber | null // 右边兄弟节点

  pendingProps: any     // 新 props
  memoizedProps: any    // 旧 props
  memoizedState: any    // 状态
  updateQueue: any      // 更新队列

  lanes: Lanes          // 优先级
  alternate: Fiber | null // workInProgress 树关联
}
```

Fiber 将原本不可中断的**递归渲染**（Stack Reconciler）改造成了可中断/恢复的**链表遍历**（Fiber Reconciler），这是 React 并发能力的基石。

---

### 3️⃣ React 19 新特性详解

#### 🌟 重要特性速览

```
React 19 (2024)
├─ React Compiler (自动优化)
├─ Actions (统一表单处理)
├─ use() Hook (异步数据)
├─ useOptimistic() (乐观更新)
├─ useFormStatus/useActionState (原 useFormState)
├─ Server Components 支持
└─ Web Components 增强
```

#### 🔧 React Compiler 详解

##### 问题背景

手动优化 React 性能很复杂：

```jsx
import { memo, useCallback, useMemo } from 'react';

// ❌ 需要手动记忆化
const MyComponent = memo((props) => {
  const handleClick = useCallback(() => {}, []);
  const value = useMemo(() => expensiveComputation(), [dep]);
  return <Child onClick={handleClick} value={value} />;
});
```

##### 解决方案：Compiler 自动优化

```jsx
// ✅ 自动转换，无需手动记忆化
function MyComponent(props) {
  const handleClick = () => {};        // ← Compiler 自动缓存
  const value = expensiveComputation(); // ← Compiler 自动缓存
  return <Child onClick={handleClick} value={value} />;
}
```

**性能收益：**
- 自动消除不必要的重新渲染
- 减少 90%+ 的手写优化代码
- 编译时静态分析，极低运行时开销（仍需要运行时支持）

#### 🎯 Actions 机制

```jsx
// 注意：useFormStatus 需要从 'react-dom' 导入
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

async function submitForm(prevState, formData) {
  const username = formData.get('username');
  const password = formData.get('password');
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return { success: true, message: '登录成功!' };
  } catch (error) {
    return { success: false, message: '登录失败' };
  }
}

export function LoginForm() {
  const [state, formAction] = useActionState(submitForm, null);
  const { pending } = useFormStatus();

  return (
    <form action={formAction}>
      <input name="username" />
      <button type="submit" disabled={pending}>
        {pending ? '登录中...' : '登录'}
      </button>
      {state?.message && <p>{state.message}</p>}
    </form>
  );
}
```

**改进点：**
- ✅ 自动加载状态管理
- ✅ 简化异步操作处理
- ✅ 内置乐观更新支持

#### ⏳ `use()` Hook - 异步数据获取与 Context 读取

`use()` 是 React 19 新增的 Hook，可用于：
1. 读取 Promise（需配合 Suspense 使用）
2. 读取 Context（与 `useContext` 类似，但可在条件语句中调用）

```jsx
import { use, Suspense } from 'react';

// 方式 1：读取 Promise
function DataComponent() {
  const data = use(fetchPromise); // fetchPromise 是一个 Promise 对象
  return <div>{data.title}</div>;
}

// 方式 2：读取 Context（React 19 新用法）
function ThemedButton() {
  const theme = use(ThemeContext); // 也可用 useContext(ThemeContext)
  return <button style={{ color: theme }}>按钮</button>;
}
```

> ⚠️ **注意**：`use()` 可以在条件语句中调用（与 Hooks 规则不同），但 Promise 必须在 Suspense 边界内使用。

#### ⏱️ React 18 vs 19 关键变化

| 特性 | React 18 (2022) | React 19 (2024) |
|------|-----------------|-----------------|
| 并发模式 | useTransition/useDeferredValue （可选项） | 默认启用，并发特性为内置行为 |
| startTransition | ✅ | ✅ 增强 |
| use() | ❌ | ✅ |
| useOptimistic | ❌ | ✅ |
| Server Components | 实验性 | ✅ 稳定 |
| ref 传参 | forwardRef | 直接传 ref |
| Compiler | 实验性 | ✅ 自动 memo |

---

#### 🚀 React 在 2026 年的最新进展

##### React 技术发展演进时间线

```mermaid
timeline
    title React 框架演进历程
    2013 : React 首次开源
         : JSX 语法引入
         : 虚拟 DOM 概念
    2015 : React 0.14
         : 函数组件引入
         : Stateless Functional Components
    2016 : React 15
         : 虚拟 DOM 优化
         : 错误边界
    2017 : React 16
         : Fiber 架构重构
         : 错误边界组件
         : Portals / Fragments
    2018 : React 16.8
         : Hooks 正式发布
         : useState / useEffect
    2019 : React 16.9-16.13
         : Concurrent Mode 预览
         : Suspense 实验性
    2021 : React 17
         : 新 JSX 转换
         : 事件代理迁移到根节点
    2022 : React 18
         : 并发特性正式发布
         : Automatic Batching
         : startTransition
         : Suspense SSR
    2023 : React Server Components
         : Next.js App Router
         : 'use client' 指令
    2024 : React 19
         : React Compiler (Forget)
         : Actions 机制
         : use() Hook
         : useOptimistic
    2025+ : React 未来规划（预期）
          : Compiler 默认启用
          : Server Components 稳定
          : View Transitions API
          : 更智能的编译优化
```

##### React Compiler 工作原理

```mermaid
flowchart TB
    subgraph 编译前
        A1["原始 React 代码"] --> A2["手动 useMemo/useCallback"]
        A2 --> A3["React.memo 包裹"]
        A3 --> A4["容易出错/遗漏"]
    end

    subgraph Compiler 转换
        B1["AST 解析"] --> B2["依赖关系分析"]
        B2 --> B3["值可达性分析"]
        B3 --> B4["自动生成记忆化代码"]
    end

    subgraph 编译后
        C1["优化的 React 代码"] --> C2["自动缓存函数"]
        C2 --> C3["自动缓存计算"]
        C3 --> C4["零运行时开销"]
    end

    A4 --> B1
    B4 --> C1
```

##### Compiler 优化对比

| 优化项 | 手动优化 | Compiler 自动优化 |
|--------|---------|------------------|
| 函数缓存 | useCallback | 自动识别并缓存 |
| 计算缓存 | useMemo | 自动识别并缓存 |
| 组件缓存 | React.memo | 自动包裹 |
| 依赖数组 | 手动维护 | 自动推导 |
| 性能收益 | 60-70% | 90%+（实验阶段） |
| 代码量 | 增加 30% | 减少 50% |

##### React Server Components 成为默认

```jsx
// app/page.jsx - 默认就是 Server Component
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  return <DataDisplay data={data} />
}

// app/component.client.jsx - 需要交互时标记
'use client'
export function InteractiveComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

##### RSC 架构工作原理

```mermaid
flowchart TB
    subgraph 服务端
        S1["Server Component"] --> S2["直接访问数据库"]
        S2 --> S3["生成序列化 UI"]
        S3 --> S4["发送 RSC Payload"]
    end

    subgraph 客户端
        C1["接收 RSC Payload"] --> C2["Client Component 水合"]
        C2 --> C3["交互式 UI"]
        C3 --> C4["事件处理"]
    end

    S4 --> C1
```

##### 🚨 水合失败排查专栏（Hydration Mismatch）

> **面试高频痛点**：RSC 架构下，Server 与 Client 两端生成的 HTML 不一致导致 `Hydration failed` 警告。

**核心原因**：Server 渲染时生成静态 HTML，Client 激活（hydrate）时浏览器重新执行组件。如果两端渲染结果不同，React 无法复用服务端 DOM，只能丢弃并重新渲染。

```mermaid
flowchart LR
    A["Server 渲染 HTML"] --> B{"客户端水合<br/>对比两端 HTML"}
    B -->|一致| C["复用 DOM ✅"]
    B -->|不一致| D["丢弃服务端 DOM<br/>客户端重新渲染 ❌"]
    D --> E["页面闪烁 / 布局偏移"]
```

**常见触发场景与解法：**

| 场景 | 问题代码 | 解决方案 |
|------|---------|---------|
| 时间戳差异 | `new Date().toISOString()` | `suppressHydrationWarning` / useEffect 延迟挂载 |
| 随机数/ID | `Math.random()` / `nanoid()` | 使用 `useId()` 保证 SSR 一致性 |
| 浏览器 API | `window.innerWidth` | 服务端返回占位，客户端 mount 后覆盖 |
| 第三方库 | 仅客户端可用的库 | 动态导入 + `ssr: false`（Next.js） |
| 数据竞态 | fetch 结果时间戳不同 | 序列化数据通过 props 从 Server 传给 Client |

**三种核心解决策略：**

**策略 1：useEffect 延迟 Client 渲染（推荐）**

```jsx
'use client'
import { useState, useEffect } from 'react'

function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null // Server 与首次水合跳过
  return children
}

// 使用
function Timestamp() {
  return (
    <ClientOnly>
      <span>{new Date().toISOString()}</span>
    </ClientOnly>
  )
}
```

**策略 2：suppressHydrationWarning（单节点兜底）**

```jsx
// 仅适用于无法避免的节点级不一致
function Timestamp({ date }: { date: Date }) {
  return <span suppressHydrationWarning>{date.toISOString()}</span>
}
```

⚠️ 仅在单个叶子节点使用，不可滥用——React 会跳过该节点的水合检查。

**策略 3：useId 生成 SSR 安全的唯一 ID**

```jsx
'use client'
import { useId } from 'react'

function FormField({ label }: { label: string }) {
  const id = useId() // SSR 期间 Server 与 Client 生成一致 ID
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  )
}
```

`useId` 基于组件树路径生成，不依赖随机数，保证 Server/Client 两端结果一致。

**追问链**：

- **Q：`suppressHydrationWarning` 和 `useEffect` 延迟渲染有什么区别？**
  > `suppressHydrationWarning` 仅在叶子节点跳过水合警告，但 React 仍需比对 DOM 结构，如果深层结构不一致仍会全量重渲染。`useEffect` 延迟渲染让 Server 和 Client 首次渲染结果一致（都返回 null），从根本上避免 mismatch。
- **Q：RSC 中如何保证数据库查询结果在两端一致？**
  > RSC Payload 包含序列化的数据，Client 不重新执行 Server Component，所以数据天然一致。问题仅出现在 Client Component 中使用非确定性 API（Date/Math/浏览器 API）。
- **Q：Next.js App Router 中如何排查水合错误？**
  > 打开浏览器 DevTools → Console 过滤 `Hydration failed` → 查看堆栈定位具体组件 → 检查是否有浏览器 API 在渲染路径被调用 → 用 `useEffect` + `'use client'` 隔离。

##### View Transitions API 集成（实验性）

> ⚠️ View Transitions API 在 React 19 中仍处于实验阶段，尚未正式发布。

```jsx
// React 实验性支持 View Transitions
// import { ViewTransition } from 'react'  // 尚未稳定

function PageTransition({ children }) {
  // 可用原生 document.startViewTransition 实现
  return <div>{children}</div>
}
```

##### 2026 年 React 生态工具链

| 工具 | 最新版本 | 关键变化 |
|------|----------|----------|
| React | 19 | Compiler 推荐启用，RSC 稳定 |
| Next.js | 15+ | App Router 默认，Turbopack |
| React Router | 8.3 | 三模式路由（Declarative/Data/Framework） |
| Redux | 5+ | RTK 简化，更好的 TS |
| Zustand | 5+ | 更轻量，持久化内置 |
| TanStack Query | 5+ | 更精细缓存，SSR 优化 |
| React Testing Library | 16+ | 更好的异步测试 |

#### 🎯 Ant Design 版本与 React 18/19 兼容性

| React 版本 | Ant Design 版本 | 兼容状态 | 说明 |
|-----------|----------------|---------|------|
| React 16-17 | antd 4.x | ✅ 兼容 | v4 已停止功能更新，仅维护 |
| React 18 | antd 5.x | ✅ 原生支持 | 默认完全兼容，推荐使用 |
| React 19 | antd 5.x (≥5.22.6) | ⚠️ 需补丁 | 需安装 `@ant-design/v5-patch-for-react-19` |
| React 18+ | antd 6.x | ✅ 原生支持 | 最低要求 React 18，无需额外补丁 |
| React 19 | antd 6.x | ✅ 原生支持 | 完全兼容，可移除 v5 兼容补丁 |

##### 升级策略

```mermaid
graph TD
    A["当前项目"] --> B{"React 版本?"}
    B -->|"React 18"| C["antd 5.x 直接使用<br/>无需额外配置"]
    B -->|"React 19"| D{"Ant Design 版本?"}
    D -->|"antd 5.x"| E["安装 @ant-design/v5-patch-for-react-19<br/>antd >= 5.22.6"]
    D -->|"antd 6.x"| F["原生支持 React 19<br/>可移除兼容补丁"]
    E --> G["入口文件导入补丁"]
    F --> H["直接使用，无需额外配置"]
```

**升级路径建议：**

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1️⃣ | React 18 → React 19 | 先升级到 React 18.3（过渡版），解决废弃 API 警告后再升 19 |
| 2️⃣ | antd 5.x 升级最新 | 确保 `antd >= 5.22.6`，获得最佳 React 19 兼容 |
| 3️⃣ | 安装兼容补丁 | `npm install @ant-design/v5-patch-for-react-19 --save` |
| 4️⃣ | 入口导入补丁 | `import '@ant-design/v5-patch-for-react-19'` |
| 5️⃣ | (可选) 升级 antd 6.x | v6 原生支持 React 19，移除兼容补丁 |

##### 已知问题

| 问题 | 影响范围 | 解决方案 |
|------|---------|---------|
| Wave 点击波纹效果异常 | 全局 Button、Tag 等 | 安装兼容补丁或升级 v6 |
| Modal/Notification/Message 静态方法失效 | `Modal.confirm()`、`message.success()` 等 | 安装兼容补丁；hooks 调用方式不受影响 |
| `element.ref` 访问移除 | 依赖 ref 的组件 | React 19 中 `ref` 是常规 prop，避免直接访问 `element.ref` |
| Next.js 15 + React 19 兼容 | SSR 场景 | 安装 `@ant-design/nextjs-registry` + 兼容补丁 |
| `findDOMNode` 废弃警告 | 使用类组件的场景 | v6 已移除相关兼容逻辑，推荐迁移到函数组件 |

> 💡 **升级到 antd 6.x 可完全解决上述问题**：v6 最低要求 React 18，原生支持 React 19，无需 `@ant-design/v5-patch-for-react-19` 补丁包。v5 主分支将进入 1 年维护期，不再提供功能更新。

#### 🎨 Tailwind CSS v4.0 CSS-First 配置范式

> 2025/2026 正式普及的 Tailwind CSS v4.0 彻底重构配置体系，移除传统的 `tailwind.config.js`，转向纯 CSS 声明式配置。

**核心变化对比：**

| 维度 | Tailwind v3 | Tailwind v4 |
|------|------------|------------|
| **配置方式** | `tailwind.config.js`（JS 对象） | `@theme` 指令（纯 CSS） |
| **编译器** | PostCSS + 自定义 JS 编译器 | Lightning CSS / Rolldown 插件，10x+ 提速 |
| **设计令牌** | `theme.extend.colors` | CSS 变量 `--color-*` 配合 `@theme` 块 |
| **自定义值** | 任意值语法 `w-[100px]` | `@property` 自定义属性 + 直接值 |
| **层叠控制** | `@layer` 指令 | 原生 CSS 层叠（`@layer`） |
| **构建依赖** | postcss + tailwindcss 包 | 无需额外 JS 运行时 |

**CSS-First 配置方式：**

```css
/* app.css — v4 入口文件，零 JS 配置 */
@import "tailwindcss";

/* @theme 块定义设计令牌（替代 tailwind.config.js） */
@theme {
  /* 颜色：--color-* 前缀自动生成 color-* 工具类 */
  --color-brand: #3b82f6;
  --color-brand-light: #60a5fa;
  --color-brand-dark: #2563eb;
  --color-surface: #f8fafc;

  /* 字体：--font-* 前缀自动生成 font-* 工具类 */
  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* 间距：--spacing-* 前缀替代 theme.extend.spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;

  /* 断点：--breakpoint-* 前缀替代 screens */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;

  /* 圆角 */
  --radius-card: 0.75rem;
  --radius-btn: 0.375rem;
}

/* 自定义工具类 — 使用 @utility 替代 @layer components */
@utility container-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacing-lg);
}

/* 变体扩展 — 使用 @variant 替代 variants 配置 */
@variant dark (&:where(.dark, .dark *));
```

**在 React 中的使用：**

```tsx
// 与 React 19 / Next.js 完美配合
function BrandButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="bg-brand text-white font-sans px-md py-sm rounded-btn hover:bg-brand-dark transition-colors">
      {children}
    </button>
  )
}

// 结合 CSS Modules（v4 原生支持）
import styles from './Card.module.css'

function Card() {
  return <div className="container-card shadow-md" />
}
```

**Vite 8 + Tailwind v4 集成：**

```javascript
// vite.config.ts — 无需额外 PostCSS 配置
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 官方 Vite 插件

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 自动处理 @import "tailwindcss" 编译
  ],
})
```

**追问链：**

- **Q：v4 移除 tailwind.config.js 后如何覆盖预设样式？**
  > 使用 `@theme` 块中的 `--color-*`、`--font-*` 变量覆盖。如需引用预设主题色，通过 CSS 的 `color-mix()` 函数或直接声明新变量名。v4 的 `@theme` 优先级高于预设但低于行内样式。
- **Q：v4 是否向后兼容 v3 的自定义配置？**
  > 不直接兼容。`tailwind.config.js` 中的 `theme.extend`、`plugins`、`variants` 等需手动迁移到 `@theme`、`@utility`、`@variant` 指令。社区提供 `@tailwindcss/upgrade` 工具辅助自动迁移。
- **Q：v4 构建速度提升的底层原因？**
  > v3 使用 PostCSS 插件在 JS 层解析配置 → 生成所有工具类 → 扫描 HTML 提取使用类 → PurgeCSS 删除未用。v4 改用 Lightning CSS（Rust）在 CSS 层直接完成：解析 `@theme` → 按需生成工具类（非全量）→ 无 JS 运行时开销。大型项目构建从 10s+ 降到 <1s。

##### 2026 年前端框架格局

| 框架 | 定位 | 2026 状态 |
|------|------|-----------|
| React 19 + Next.js | 全栈应用首选 | 最广泛使用 |
| Angular 22 | 企业级应用 | Zoneless 默认，性能大幅提升 |
| Vue 3.6 + Nuxt 5 | 渐进式开发 | Vapor Mode 实验性，性能接近 Solid |
| Svelte 5 | 编译时优化 | Runes 响应式，轻量级首选 |
| Solid.js | 细粒度响应式 | 性能标杆，生态增长中 |
| Astro 5 | 内容型网站 | Islands 架构，零 JS 默认 |

##### React 生态全景图

```mermaid
mindmap
  root((React 生态))
    核心库
      React 19/20
      React DOM
      React Native
    元框架
      Next.js 16
      Remix
      Gatsby
    路由
      React Router 8.3
      TanStack Router
    状态管理
      Zustand
      Redux Toolkit
      Jotai
      Recoil
      Valtio
    数据获取
      TanStack Query
      SWR
      Apollo Client
      urql
    表单
      React Hook Form
      Formik
      Zod 验证
    样式方案
      Tailwind CSS
      Styled Components
      CSS Modules
      Vanilla Extract
    测试
      Vitest
      Jest
      React Testing Library
      Playwright
    开发工具
      React DevTools
      ESLint
      Prettier
      Storybook
```

---

### 4️⃣ JSX 与 Babel

#### 📝 JSX 详解

JSX 是 **JavaScript XML**，让你能在 JS 中写 HTML 结构。JSX 本质是 `React.createElement` 的语法糖，经 Babel 编译为 AST → createElement 调用 → React 元素对象 → 虚拟 DOM → 真实 DOM。

```jsx
// 原始 JSX
const element = <h1 className="greeting">Hello, {name}!</h1>;

// Babel 编译后
const element = React.createElement(
  "h1",
  { className: "greeting" },
  "Hello, ", name, "!"
);
```

#### 🔄 JSX 转换流程图

```mermaid
graph LR
    A["JSX 代码<br/>&lt;Component /&gt;"] -->|Babel 解析| B["AST<br/>抽象语法树"]
    B -->|转换| C["createElement 调用"]
    C -->|运行时| D["React 元素对象"]
    D -->|渲染| E["虚拟 DOM"]
    E -->|比对| F["真实 DOM"]
```

#### ⚙️ JSX 规则

```jsx
// ✅ 使用 Fragment 避免多余 DOM
return (
  <>
    <p>Hello</p>
    <p>World</p>
  </>
);

// ✅ 属性驼峰命名
<div className="card" data-testid="card" />

// ✅ 表达式插值
<p>Count: {count * 2}</p>

// ✅ 条件渲染
{showTitle ? <h1>Title</h1> : null}
{showTitle && <h1>Title</h1>}
```

> 🔗 **链式思考**：JSX 是 React 的"模板语言"，本质是 `createElement` 函数的语法糖。Vue 采用 SFC（单文件组件）用 `<template>` 分离模板和逻辑，Angular 则用 `@Component` 装饰器绑定模板、样式和逻辑。三者的组件化本质相同——都是"模板/渲染函数 + 状态 + 属性"，差异在代码组织和编译策略：JSX 灵活但难以编译优化，Vue SFC 结构清晰且易于 PatchFlag 优化，Angular 装饰器配置式且有 AOT 编译。详见 [04-框架对比](../框架对比/) 的"组件化方案对比"。

---

### 5️⃣ 组件与 Props 深度剖析

#### 🧩 组件解剖

```jsx
import { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  onClick?: (id: string) => void;
  disabled?: boolean;
}

function Card({ title, children, onClick, disabled = false }: CardProps) {
  return (
    <div className="card" style={{ opacity: disabled ? 0.5 : 1 }}>
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
      <button onClick={() => onClick?.(title)} disabled={disabled}>Click Me</button>
    </div>
  );
}
```

#### 📊 Props 完整对比

| 特征 | Props | State |
|------|-------|-------|
| 来源 | 父组件 | 组件自身 |
| 可修改 | ❌ 只读 | ✅ 可修改 |
| 默认值 | Component.defaultProps | useState 初值 |
| 影响重建 | ✅ Props 变化默认重新渲染 | ✅ State 变化默认重新渲染 |

#### 🎯 Props 高级用法

```jsx
// 解构 + 默认值
function Card({ title = '默认标题', children }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// Spread 批量传递
const productProps = { name: '手机', price: 2999, stock: 10 };
<ProductCard {...productProps} />

// 回调呼叫（子→父通信）
function Parent() {
  const handleChildEvent = (data: string) => console.log(data);
  return <Child onAction={handleChildEvent} />;
}

// 使用 eslint 防止 props 被非法修改
// eslint.config.js
// export default [{ rules: { "react/no-direct-mutation-state": "error" } }];
```

#### 🔄 React.Component vs React.PureComponent

```mermaid
flowchart LR
    A["Component 更新"] --> B["shouldComponentUpdate<br/>默认返回 true"]
    B --> C["总是重新渲染"]

    D["PureComponent 更新"] --> E["shouldComponentUpdate<br/>自动浅比较"]
    E --> F{"props/state 引用是否变化?"}
    F -->|是| G["重新渲染"]
    F -->|否| H["跳过渲染"]
```

**注意：** PureComponent 进行**浅比较**，引用类型只比较地址。如需深比较的数据变更，必须创建新对象。

> ⚠️ **易错点**：直接在现有对象上修改属性然后 `setState` 不会触发 PureComponent 重新渲染。务必使用展开运算符或 Object.assign 创建新对象。

#### 🆚 类组件与函数组件对比

> 面试高频考点：理解两种组件范式的本质差异与演进方向。

##### 语法与结构对比

```jsx
// 类组件（Class Component）
import React, { Component } from 'react';

class ClassCounter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.handleClick}>+1</button>
      </div>
    );
  }
}

// 函数组件（Function Component）+ Hooks
import { useState } from 'react';

function FunctionCounter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

##### 核心差异对比表

| 维度 | 类组件 | 函数组件 |
|------|--------|----------|
| **语法基础** | ES6 Class | 函数 |
| **状态管理** | `this.state` + `this.setState` | `useState` / `useReducer` |
| **生命周期** | `componentDidMount` 等方法 | `useEffect` Hook |
| **`this` 绑定** | 需要手动绑定（构造器或箭头函数） | 无 `this` 概念 |
| **代码量** | 较多（模板代码） | 简洁 |
| **可读性** | 生命周期分散 | 逻辑集中 |
| **性能** | 差异可忽略 | 差异可忽略（现代引擎中实例开销极小） |
| **复用机制** | HOC / Render Props | 自定义 Hooks |
| **React 19 支持** | ✅ 兼容 | ✅ **官方推荐** |

##### 生命周期对照

```mermaid
flowchart TD
    subgraph 类组件生命周期
        C1["constructor"] --> C2["componentDidMount"]
        C2 --> C3["componentDidUpdate"]
        C3 --> C4["componentWillUnmount"]
    end

    subgraph 函数组件等价
        F1["useState 初始化"] --> F2["useEffect([], ...)"]
        F2 --> F3["useEffect([dep], ...)"]
        F3 --> F4["useEffect 返回清理函数"]
    end

    C1 -.-> F1
    C2 -.-> F2
    C3 -.-> F3
    C4 -.-> F4
```

##### 状态管理对比

```jsx
// 类组件状态管理
class ClassComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: null, loading: false };
    this.fetchUser = this.fetchUser.bind(this);
  }

  async fetchUser() {
    this.setState({ loading: true });
    const user = await getUser();
    this.setState({ user, loading: false });
  }

  render() {
    const { user, loading } = this.state;
    return loading ? <Spinner /> : <UserCard user={user} />;
  }
}

// 函数组件状态管理
function FunctionComponent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUser = async () => {
    setLoading(true);
    const userData = await getUser();
    setUser(userData);
    setLoading(false);
  };

  return loading ? <Spinner /> : <UserCard user={user} />;
}
```

##### 选择建议

| 场景 | 推荐 | 原因 |
|------|------|------|
| 新项目开发 | ✅ **函数组件** | React 官方推荐，生态主流 |
| 需要复用状态逻辑 | ✅ **函数组件** | 自定义 Hooks 更灵活 |
| 维护旧项目 | ⚠️ 看情况 | 已有类组件无需强制重构 |
| 需要 Error Boundaries | ✅ **函数组件** | React 19 可通过 ErrorBoundary + `use()` 统一处理异步错误 |
| 需要 getSnapshotBeforeUpdate | ✅ **类组件** | 函数组件暂无等价 Hook |

> 💡 **React 演进方向**：从 React 16.8 Hooks 发布后，函数组件已成为主流。React 19 的 Compiler、Actions 等新特性均围绕函数组件设计。类组件不会被移除，但新功能不再为其扩展。

#### 🧩有状态/无状态、受控/非受控组件

> 这两组概念是 React 组件分类的核心维度，面试高频考点。

##### 一、有状态组件 & 无状态组件

**状态（state）**：组件内部**私有数据**，数据变化驱动视图更新。

```mermaid
flowchart LR
    subgraph 有状态组件 Stateful
        A1["拥有内部 state"] --> A2["可维护、修改自身数据"]
        A2 --> A3["需要交互/数据变化"]
    end

    subgraph 无状态组件 Stateless
        B1["没有自身 state"] --> B2["只接收 props 渲染 UI"]
        B2 --> B3["纯展示、逻辑简单"]
    end

    A3 -.->|实现方式| A4["类组件<br/>函数组件 + Hooks"]
    B3 -.->|实现方式| B4["函数组件"]
```

**无状态组件（Stateless）**

- 特点：**没有自身 state**，只接收 `props` 渲染 UI，纯展示
- 实现方式：**函数组件**（主流）
- 适用：纯展示、逻辑简单、仅接收父组件数据

```jsx
// 无状态函数组件
function Hello(props) {
  return <div>{props.name}</div>;
}
```

**有状态组件（Stateful）**

- 特点：**拥有内部 state**，可维护、修改自身数据
- 实现方式：
  1. 类组件（`class Component`）
  2. 函数组件 + **Hooks**（`useState`/`useReducer`，现在主流）
- 适用：需要交互、数据变化、表单、计数器等

```jsx
// 函数组件 + Hooks（有状态）
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

| 维度 | 无状态组件 | 有状态组件 |
|------|-----------|-----------|
| 内部 state | ❌ 无 | ✅ 有 |
| 数据来源 | 仅 props | props + state |
| 实现方式 | 函数组件 | 类组件 / 函数组件 + Hooks |
| 可变数据 | ❌ 不可修改 | ✅ 可通过 setState/useState 修改 |
| 适用场景 | 展示、列表、文案 | 表单、计数器、交互逻辑 |
| 测试难度 | 🟢 简单 | 🟡 中等 |
| 性能 | 🟢 更快（无需跟踪状态） | 🟡 略慢（需要状态管理） |

##### 二、受控组件 & 非受控组件

> **专针对表单元素**：`input` / `textarea` / `select` 等表单标签，依据**数据来源**划分。

```mermaid
flowchart LR
    subgraph 受控组件 Controlled
        A["state 作为唯一数据源"] --> B["onChange 事件更新 state"]
        B --> C["setState 触发重新渲染"]
        C --> D["value 绑定 state"]
        D --> B
    end

    subgraph 非受控组件 Uncontrolled
        E["DOM 自身维护状态"] --> F["通过 ref 获取值"]
        F --> G["需要时读取 DOM 值"]
    end
```

**受控组件（Controlled）**

- 核心：**表单值由 React state 完全控制**，视图 ↔ state 双向绑定
- 规则：
  1. `value` 绑定组件 state
  2. 通过 `onChange` 事件更新 state
- 特点：数据统一托管在 React，**完全可控**，推荐业务使用

```jsx
import { useState } from 'react';

function InputDemo() {
  const [val, setVal] = useState('');
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
    />
  );
}
```

**非受控组件（Uncontrolled）**

- 核心：**表单值由 DOM 原生控制**，React 不托管 state
- 规则：
  1. 使用 `defaultValue` 设置默认值
  2. 通过 **ref** 直接获取 DOM 取值
- 特点：简单粗暴，适合**一次性取值**（文件上传、简单搜索）

```jsx
import { useRef } from 'react';

function InputDemo() {
  const inputRef = useRef(null);
  const getVal = () => {
    console.log(inputRef.current.value); // 直接读DOM
  };
  return (
    <>
      <input ref={inputRef} defaultValue="默认值" />
      <button onClick={getVal}>获取值</button>
    </>
  );
}
```

| 维度 | 受控组件 | 非受控组件 |
|------|---------|-----------|
| 数据源 | React state | DOM 自身 |
| 值获取 | state 变量 | ref 读取 |
| 表单验证 | ✅ 容易 | ❌ 困难 |
| 实时校验 | ✅ onChange 即时校验 | ❌ 需手动触发 |
| 动态控制 | ✅ 随意修改 value | ❌ 不方便 |
| 适用场景 | 复杂表单、需要验证 | 文件上传、简单一次性输入 |

##### 三、两组概念对比总结

```mermaid
flowchart TD
    subgraph 组件分类维度
        D1["按是否拥有内部 state"]
        D2["按表单数据由谁管理"]
    end

    D1 --> C1["有状态组件<br/>Stateful"]
    D1 --> C2["无状态组件<br/>Stateless"]
    D2 --> C3["受控组件<br/>Controlled"]
    D2 --> C4["非受控组件<br/>Uncontrolled"]

    C1 -.->|适用范围| R1["所有组件"]
    C2 -.->|适用范围| R1
    C3 -.->|适用范围| R2["仅表单元素"]
    C4 -.->|适用范围| R2
```

**快速记忆：**
- 无状态 = 纯展示，靠 props
- 有状态 = 内部存数据，靠 state/Hooks
- 受控表单 = state 管值，onChange 更新（推荐）
- 非受控表单 = DOM 管值，ref 取值

##### 四、使用场景建议

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 大部分表单、复杂交互 | ✅ **受控组件** | 数据可控，支持验证、格式化 |
| 纯展示、列表、文案 | ✅ **无状态函数组件** | 简单高效，无需状态管理 |
| 文件上传 | ✅ **非受控组件** | 文件输入框是只读的，只能用 ref |
| 简单搜索框（无需实时校验） | ✅ **非受控组件** | 一次性取值，更简单 |
| 需要动态禁用/修改表单 | ✅ **受控组件** | value 由 state 控制，随心所欲 |
| 首次渲染后不再关心的值 | ✅ **非受控组件** | 无需维护 state |

---

### 6️⃣ React 事件机制

#### 📌 合成事件（SyntheticEvent）

React 的事件并非绑定在真实的 DOM 节点上，而是通过**事件代理（Event Delegation）**的方式，将所有事件统一绑定在根容器上。当事件冒泡到根容器时，React 将事件内容封装并交由真正的处理函数运行。

```mermaid
flowchart TD
    A["用户点击 button"] --> B["原生 click 事件触发"]
    B --> C["事件冒泡传播"]
    C --> D["到达根容器节点"]
    D --> E["React 统一事件监听器接管"]
    E --> F["从映射表中查找对应的<br/>组件事件处理函数"]
    F --> G["创建 SyntheticEvent 合成事件对象"]
    G --> H["调用 handleClick 处理函数"]
    H --> I["事件回调结束后<br/>回收合成事件对象到事件池"]
```

**React 事件与原生 HTML 事件的区别：**

| 对比项 | 原生事件 | React 事件 |
|--------|---------|-----------|
| 命名方式 | 全小写 `onclick` | 小驼峰 `onClick` |
| 处理函数语法 | 字符串 `"handle()"` | 函数 `{handleClick}` |
| 阻止默认行为 | `return false` | `e.preventDefault()` |
| 执行顺序 | 先执行 | 后执行（冒泡到根容器） |

> 💡 React 17+ 将事件代理从 document 迁移到 root DOM 容器，为微前端和多版本 React 共存提供更好的隔离性。

#### 🔄 React 各版本事件代理演进

| 版本 | 事件代理位置 | 事件池机制 | 主要变化 |
|------|-------------|-----------|---------|
| **React 16** | `document` | ✅ 启用 | 所有事件代理到 document，需 `e.persist()` |
| **React 17** | `root DOM 容器` | ❌ **移除** | 事件代理从 document 迁移到 root，不再需要 persist |
| **React 18** | `root DOM 容器` | ❌ 已移除 | 同 React 17，保持向后兼容 |
| **React 19** | `root DOM 容器` | ❌ 已移除 | 同 React 18 |

##### 详细说明

**React 16 及以前：document 事件代理**
```jsx
// React 16：所有事件绑定在 document 上
<div id="root">
  <button onClick={handleClick}>Click</button>
</div>
// 事件监听器绑定在 document 上
// 事件冒泡到 document 后被 React 接管
```

**React 17+：root DOM 容器事件代理**
```jsx
// React 17+：事件绑定在 root 容器上
<div id="root">
  <button onClick={handleClick}>Click</button>
</div>
// 事件监听器绑定在 #root 上
// 更好的微前端隔离性，多版本 React 可共存
```

**React 18+：移除事件池**
```jsx
// React 16-17：需要调用 persist() 保留事件对象
function handleClick(e) {
  e.persist(); // 必须调用，否则异步访问会被回收
  setTimeout(() => {
    console.log(e.target); // React 16-17 需要 persist
  }, 100);
}

// React 18+：直接访问，无需 persist
function handleClick(e) {
  setTimeout(() => {
    console.log(e.target); // React 18+ 直接可用
  }, 100);
}
```

##### 事件代理迁移影响

| 影响场景 | React 16 | React 17+ | 解决方案 |
|---------|----------|-----------|---------|
| 微前端多版本共存 | ❌ 事件冲突 | ✅ 隔离 | 无 |
| 第三方库依赖 document 事件 | ✅ 正常工作 | ⚠️ 可能失效 | 使用 `stopPropagation` 阻止 |
| 事件对象异步访问 | ❌ 需要 persist | ✅ 直接访问 | 无 |

> 🔗 **链式思考**：React Hooks 的核心设计是"函数即组件"，每次渲染重新执行函数，通过链表维护状态顺序。Vue 的 Composition API（`ref`/`reactive`/`computed`）同样是把状态逻辑抽取到函数中，但依赖 Proxy 自动追踪而非手动声明依赖。Angular 的 `inject()` 函数（Angular 14+）则是 DI 驱动的依赖注入，与 React/Vue 的"按需调用"不同，Angular 的状态来自 Service 注入，而非函数调用。详见 [04-框架对比](../框架对比/) 的"组件化方案对比"。

---

### 7️⃣ Hooks 系统完全指南

#### 🎣 Hooks 工作原理

```mermaid
graph TD
    A["函数组件<br/>每次渲染执行"] --> B["Hooks 调用"]
    B --> C["Hook 闭包<br/>保存状态"]
    C --> D["Fiber 对象<br/>存储 Hook 链表"]
    D --> E["更新时<br/>恢复状态"]
    E --> A
```

#### 📍 useState - 状态管理

```jsx
const [count, setCount] = useState(0);

// 函数式初始化（避免重复计算）
const [state, setState] = useState(() => expensiveComputation());

// 更新函数（基于前一个状态）
setState(prev => prev + 1);
```

**规则 ⚠️：**
- ✅ 只在组件顶层调用
- ✅ 只在函数组件中调用
- ❌ 不要在循环、条件、嵌套函数中调用

#### 📍 useEffect - 副作用管理

```jsx
function EffectDemo() {
  useEffect(() => {
    console.log('挂载 + 每次渲染后');
    return () => console.log('清理副作用');
  }); // 没有依赖数组，每次都运行

  useEffect(() => {
    console.log('仅在挂载时运行');
    return () => console.log('卸载时清理');
  }, []); // 空依赖数组，仅一次

  useEffect(() => {
    console.log('count 或 name 变化时运行');
  }, [count, name]); // 指定依赖

  return null;
}
```

**常见模式：**

```jsx
// 数据获取（处理竞态条件）
useEffect(() => {
  let ignore = false;
  fetchData().then(data => { if (!ignore) setData(data); });
  return () => { ignore = true; };
}, []);

// 事件监听
useEffect(() => {
  const handleResize = () => console.log('resized');
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// 定时器
useEffect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(timer);
}, []);

//⚠️ 闭包冻结（Stale Closure）风险
function StaleClosureExample() {
  const [count, setCount] = useState(0);

  // ❌ 闭包陷阱
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // 永远是 0！
      setCount(count + 1); // 永远是 1
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖，count 被冻结

  // ✅ 使用函数式更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + 1); // 正确的做法
    }, 1000);
    return () => clearInterval(timer);
  }, []);
}
```

#### ⚡ StrictMode 双重调用

React 严格模式下，开发环境的 useEffect 会执行两次，用于检测副作用的清理是否正确。

```jsx
function App() {
  return (
    <StrictMode>
      <Main />
    </StrictMode>
  );
}

// 开发环境：组件挂载 → 卸载 → 重新挂载
// 用于检测：清理函数是否正确、是否有内存泄漏
```

#### 🌊 useEffect 异步请求完全指南

##### 请求竞态与取消（AbortController）

```jsx
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const res = await fetch('/api/products', {
        signal: controller.signal,
      });
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('请求已取消');
        return;
      }
      console.error('请求失败', err);
    }
  };

  fetchData();

  return () => {
    controller.abort(); // 组件卸载时取消请求
  };
}, []);
```

##### 自定义 useDebounce 防抖 Hook

```jsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 使用
function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

##### 搜索功能完整示例

```jsx
function SearchProducts() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?q=${query}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('搜索失败', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [query]);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索产品..." />
      {loading && <div>搜索中...</div>}
      <ul>
        {results.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### 📍 useContext - 跨组件通信

```jsx
const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button style={{
    background: theme === 'light' ? '#fff' : '#333',
    color: theme === 'light' ? '#000' : '#fff'
  }}>按钮</button>;
}
```

#### 📍 useReducer - 复杂状态逻辑

```jsx
type Action =
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'REMOVE_TODO'; payload: number }
  | { type: 'TOGGLE_TODO'; payload: number };

function todoReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, action.payload] };
    case 'REMOVE_TODO':
      return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(t => t.id === action.payload ? { ...t, completed: !t.completed } : t)
      };
    default:
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  return (
    <div>
      {state.todos.map(todo => (
        <input type="checkbox" checked={todo.completed}
          onChange={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })} />
      ))}
    </div>
  );
}

// 🎯 Action Creator 模式

// Action Creator 统一创建 action 对象，避免直接在组件中写 action 字面量。

const addItem = (product: Product): CartAction => ({
  type: 'ADD_ITEM',
  payload: product,
});

const removeItem = (id: number): CartAction => ({
  type: 'REMOVE_ITEM',
  payload: id,
});

const updateQuantity = (id: number, quantity: number): CartAction => ({
  type: 'UPDATE_QUANTITY',
  payload: { id, quantity },
});

// 使用
dispatch(addItem(product));
dispatch(removeItem(id));
```

##### 🎯 useReducer + Immer 草案模式

使用 `use-immer` 以可变语法写不可变逻辑：

```jsx
import { useImmerReducer } from 'use-immer';

function cartReducer(draft: CartState, action: CartAction) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = draft.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        draft.items.push({ ...action.payload, quantity: 1 });
      }
      break;
    }
    case 'REMOVE_ITEM':
      draft.items = draft.items.filter(i => i.id !== action.payload);
      break;
    case 'UPDATE_QUANTITY':
      const item = draft.items.find(i => i.id === action.payload.id);
      if (item) item.quantity = action.payload.quantity;
      break;
    case 'CLEAR_CART':
      draft.items = [];
      draft.coupon = null;
      draft.discount = 0;
      break;
  }
}
```

#### 📍 useRef - 访问 DOM 和保存值

```jsx
// 访问 DOM 元素
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => { inputRef.current?.focus(); };
  return <><input ref={inputRef} /><button onClick={focusInput}>Focus Input</button></>;
}

// 保存可变值（不触发重新渲染）
function StopWatch() {
  const intervalRef = useRef<number | null>(null);
  const start = () => { intervalRef.current = setInterval(() => {}, 1000); };
  const stop = () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  return <><button onClick={start}>Start</button><button onClick={stop}>Stop</button></>;
}
```

#### 📍 useCallback & useMemo - 性能优化

```jsx
// ❌ 问题：每次重新创建函数，导致子组件重新渲染
function Parent() {
  const handleClick = () => console.log('clicked');
  return <Child onClick={handleClick} />;
}

// ✅ useCallback 缓存函数
function Parent() {
  const handleClick = useCallback(() => console.log('clicked'), []);
  return <Child onClick={handleClick} />;
}

// ✅ useMemo 缓存计算结果
function Component() {
  const expensiveValue = useMemo(() => complexComputation(data), [data]);
  return <div>{expensiveValue}</div>;
}
```

#### ⚠️ useCallback 安全使用完全指南

useCallback 本身不是不安全 API，问题大多来自**误用、依赖项写错、闭包陷阱、搭配组件重渲染**。

##### 核心作用回顾

`useCallback(fn, deps)`：缓存函数引用。
- 依赖不变 → 返回同一个函数引用
- 依赖变化 → 重新创建新函数
- 常配合 `React.memo`、子组件 props、`useEffect`、事件监听使用

##### 主要安全 / 稳定性风险

###### 1️⃣ 闭包陷阱（最常见、最隐蔽）

**现象**：函数里拿到的状态 / 变量永远是旧值，逻辑错乱、接口参数错误、状态不更新。

**原因**：useCallback 只在依赖数组变化时重建函数；如果依赖没加全，函数会锁住旧闭包快照。

```jsx
// ❌ 错误：漏掉 count 依赖
const handleClick = useCallback(() => {
  console.log(count); // 永远输出初始值，不会更新
}, []);
```

**风险后果**：业务逻辑错误、接口传参错误、表单提交数据旧值、定时器/轮询逻辑异常。

###### 2️⃣ 依赖项滥用 / 缺失（衍生风险）

- **依赖漏写** → 闭包旧值
- **依赖滥加** → useCallback 彻底失效

```jsx
// ❌ 每次渲染 deps 都变，函数每次重建，缓存完全无效
const handle = useCallback(() => {}, [obj, arr]);
// 字面量对象 / 数组每次渲染都是新引用，导致缓存失效
```

- 依赖写死空数组 `[]` 强行锁函数：短期看似稳定，长期迭代极易引入隐性 bug。

###### 3️⃣ 搭配 React.memo 失效 & 反向性能问题

父组件频繁渲染，把 useCallback 函数传给 memo 子组件：
- 依赖正确：子组件不会重渲染（预期）
- 依赖错误 / 频繁变化：子组件照样频繁重渲染，白加缓存

**隐性风险**：过度使用 useCallback + memo，增加内存、增加依赖维护成本，得不偿失。

###### 4️⃣ 异步逻辑 + useCallback 组合风险

setTimeout、Promise、接口请求、定时器在缓存函数中：
- 函数被缓存，但内部状态是闭包旧值
- 定时器 / 事件监听残留旧函数，造成重复执行、内存泄漏

```jsx
const fetchData = useCallback(() => {
  setTimeout(() => {
    console.log(id); // 旧 id
  }, 1000);
}, []);
```

###### 5️⃣ 事件解绑 / 原生 DOM 监听内存泄漏

如果把 useCallback 函数绑定到 addEventListener、第三方库监听：
- 依赖变化 → 生成新函数
- 旧函数没手动解绑 → 多个监听共存 → 内存泄漏、多次触发

###### 6️⃣ 严格模式下重复执行（React 18+）

React 18 严格模式会双重执行函数：useCallback 会执行两次创建函数；若内部有副作用、计数、上报、接口，会出现重复请求、重复埋点。

##### 哪些场景必须谨慎 / 不用 useCallback

| 场景 | 原因 |
|------|------|
| 仅组件内部调用、不传给子组件、不进 useEffect | 完全没必要，徒增维护成本 |
| 函数内部频繁依赖临时对象 / 数组 | 缓存基本失效，优先用 useMemo 稳定引用 |
| 一次性执行、初始化函数 | 直接写普通函数即可 |

##### 安全使用规范（避坑最佳实践）

###### 1️⃣ 依赖项严格遵守 ESLint 规则

- 开启 `react-hooks/exhaustive-deps` 强制校验
- 所有用到的 state、props、外部函数必须进依赖
- **不要手动屏蔽 ESLint 警告**（99% 会埋坑）

###### 2️⃣ 稳定对象 / 数组引用（解决依赖频繁变更）

把字面量对象、数组抽进 `useMemo`，再作为 `useCallback` 依赖：

```jsx
const params = useMemo(() => ({ id, name }), [id, name]);

const handle = useCallback(() => {
  api.fetch(params);
}, [params]);
```

###### 3️⃣ 异步 / 定时器场景处理

- 异步逻辑优先把实时值通过**参数传入**，不要依赖闭包
- 组件卸载时清除定时器、移除监听

###### 4️⃣ 解绑监听防泄漏

```jsx
const handler = useCallback(() => {}, []);

useEffect(() => {
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, [handler]); // 依赖 handler，自动解绑旧函数
```

###### 5️⃣ 区分「该不该缓存」

只在以下场景使用 useCallback：
- 传给 `React.memo` 子组件的回调
- 作为 `useEffect` / 定时器 / 事件监听依赖
- 自定义 Hook 对外暴露回调
- 其余场景：直接写普通函数

##### 安全结论

| 维度 | 结论 |
|------|------|
| API 本身 | 安全，无底层漏洞 |
| 最大威胁 | 闭包旧值、依赖不全、引用不稳定、内存泄漏 |
| 安全底线 | 开启 hooks 依赖校验 + 对象用 useMemo 稳引用 + 监听/定时器配套清理 + 按需使用 |

#### ⏱️ useEffect vs useLayoutEffect

```mermaid
sequenceDiagram
    participant R as 组件渲染
    participant D as DOM 更新
    participant B as 浏览器绘制
    participant E as useEffect
    participant LE as useLayoutEffect

    R->>D: render 输出 VNode
    D->>B: React 更新真实 DOM
    D->>LE: useLayoutEffect (同步，阻塞绘制)
    LE->>D: 同步执行副作用
    D->>B: 浏览器绘制
    B->>E: useEffect (异步，不阻塞绘制)
```

| 特性 | useEffect | useLayoutEffect |
|------|-----------|----------------|
| 执行时机 | 浏览器绘制后（异步） | DOM 更新后绘制前（同步） |
| 阻塞绘制 | ❌ 不阻塞 | ✅ 阻塞 |
| 适用场景 | 数据获取、订阅、日志 | DOM 测量、样式调整 |
| 推荐度 | ⭐ 优先使用 | ⚠️ 特殊场景使用 |

#### 📋 Hooks 与 Class 生命周期对照

```mermaid
flowchart TD
    subgraph Class 生命周期
        C1["constructor"] --> C2["getDerivedStateFromProps"]
        C2 --> C3["shouldComponentUpdate"]
        C3 --> C4["render"]
        C4 --> C5["componentDidMount / DidUpdate"]
        C5 --> C6["componentWillUnmount"]
    end

    subgraph Hooks 等价
        H1["useState"] --> H2["渲染过程中更新 state"]
        H2 --> H3["React.memo<br/>作用同 shouldComponentUpdate"]
        H3 --> H4["函数体本身<br/>相当于 render"]
        H4 --> H5["useEffect<br/>组合 DidMount + DidUpdate + WillUnmount"]
    end

    C1 -.-> H1
    C3 -.-> H3
    C4 -.-> H4
    C5 -.-> H5
    C6 -.-> H5
```

#### 📍 React 19 新增 Hooks

```jsx
// use() - 异步数据获取
import { use } from 'react';
function DataComponent() {
  const data = use(fetchPromise);
  return <div>{data}</div>;
}

// useOptimistic() - 乐观更新
import { useOptimistic } from 'react';
function TodoList() {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(todos);
  const handleAdd = async (todo: Todo) => {
    addOptimisticTodo([...optimisticTodos, todo]);
    await saveTodo(todo);
  };
  return <ul>{optimisticTodos.map(todo => <li key={todo.id}>{todo.text}</li>)}</ul>;
}

// useFormStatus() - 表单状态（需从 react-dom 导入）
import { useFormStatus } from 'react-dom';
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? '提交中...' : '提交'}</button>;
}

// useActionState() - 表单结果（React 19 中 useFormState 已重命名）
import { useActionState } from 'react';
function LoginForm() {
  const [state, formAction] = useActionState(login, null);
  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <button type="submit">登录</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

---

### 8️⃣ 自定义 Hooks 设计模式

#### 🎣 常用自定义 Hooks

```jsx
// useAsync - 异步操作管理
function useAsync<T>(asyncFunction: () => Promise<T>, immediate = true) {
  const [state, setState] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    data: T | null;
    error: Error | null;
  }>({ status: 'idle', data: null, error: null });

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null });
    try {
      const response = await asyncFunction();
      setState({ status: 'success', data: response, error: null });
      return response;
    } catch (error) {
      setState({ status: 'error', data: null, error: error as Error });
    }
  }, [asyncFunction]);

  useEffect(() => { if (immediate) execute(); }, [execute, immediate]);

  return { ...state, execute };
}

// useLocalStorage - 本地存储 Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) { console.error(error); }
  };

  return [storedValue, setValue] as const;
}

// useDebounce - 防抖 Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

---

### 9️⃣ 生命周期与 Fiber 架构

#### 🔄 组件生命周期（React 16+）

```mermaid
flowchart TD
    subgraph 挂载阶段 Mount
        M1["constructor"] --> M2["getDerivedStateFromProps"]
        M2 --> M3["render"]
        M3 --> M4["React 更新 DOM 和 refs"]
        M4 --> M5["componentDidMount"]
    end

    subgraph 更新阶段 Update
        U0{"触发更新"} --> U1{"props/state/forceUpdate"}
        U1 --> U2["getDerivedStateFromProps"]
        U2 --> U3["shouldComponentUpdate"]
        U3 -->|true| U4["render"]
        U3 -->|false| U5["终止更新"]
        U4 --> U6["getSnapshotBeforeUpdate"]
        U6 --> U7["React 更新 DOM"]
        U7 --> U8["componentDidUpdate"]
    end

    subgraph 卸载阶段 Unmount
        D1["componentWillUnmount"]
        D1 --> D2["清除 timer/取消请求/取消订阅"]
    end

    subgraph 错误处理 Error
        E1["后代组件抛出错误"] --> E2["getDerivedStateFromError"]
        E2 --> E3["渲染 fallback UI"]
        E1 --> E4["componentDidCatch"]
        E4 --> E5["记录错误日志"]
    end

    M5 --> U0
    U8 --> D1
```

##### 废弃的三个生命周期（React 16.3+）

```mermaid
flowchart LR
    dep["废弃的三个生命周期"] --> W1["componentWillMount"]
    dep --> W2["componentWillReceiveProps"]
    dep --> W3["componentWillUpdate"]

    W1 -.->|替代| R1["constructor / componentDidMount"]
    W2 -.->|替代| R2["getDerivedStateFromProps"]
    W3 -.->|替代| R3["getSnapshotBeforeUpdate + componentDidUpdate"]
```

**核心废弃原因（Fiber 架构导致）：**

React 15 的 Stack Reconciler 采用递归同步渲染，一旦开始就不能中断。而 Fiber 架构将渲染过程改造为**可中断的异步任务**，这意味着 `render` 阶段可能被打断后重新执行。这直接导致了三个 `will` 生命周期在一次更新中可能被**多次调用**，产生严重的副作用问题：

```
Stack Reconciler (React 15):
  开始渲染 → 同步执行 → 完成
  生命周期只调用一次 ✅

Fiber Reconciler (React 16+):
  开始渲染 → 执行一部分 → 浏览器需要控制权 → 暂停
  → 恢复渲染 → 重新执行 render 前的生命周期
  → 生命周期可能被调用多次 ❌
```

**逐个分析：**

| 废弃方法 | 问题 | 替代方案 |
|---------|------|---------|
| `componentWillMount` | 在 render 前执行，可能因中断被调用多次；SSR 中不触发 | `constructor` 或 `componentDidMount` |
| `componentWillReceiveProps` | 每次 props 变化前调用，容易用 `this.state` 存派生值，破坏单一数据源；可被多次调用 | `static getDerivedStateFromProps` 或 `getDerivedStateFromProps` |
| `componentWillUpdate` | render 前调用，无法可靠读取 DOM；可能被多次调用 | `getSnapshotBeforeUpdate` + `componentDidUpdate` |

###### 1. componentWillMount → constructor / componentDidMount

```javascript
// ❌ 废弃写法
class UserProfile extends React.Component {
  componentWillMount() {
    // 危险：Fiber 中可能被多次调用
    this.fetchData(this.props.userId);  // 重复请求
    this.state = { data: null };         // 可能被覆盖
  }

  fetchData(userId) {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => this.setState({ data }));
  }

  render() {
    return <div>{this.state.data?.name || 'Loading...'}</div>;
  }
}

// ✅ 替代方案 1：异步操作放 componentDidMount
class UserProfile extends React.Component {
  state = { data: null };

  componentDidMount() {
    this.fetchData(this.props.userId);  // 只调用一次
  }

  fetchData(userId) {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => this.setState({ data }));
  }

  render() {
    return <div>{this.state.data?.name || 'Loading...'}</div>;
  }
}

// ✅ 替代方案 2：同步初始化放 constructor
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    // 同步初始化 state
    this.state = {
      data: null,
      derivedValue: computeExpensiveValue(props.someProp)
    };
  }
  // ...
}
```

**对比：**

| 场景 | componentWillMount | constructor | componentDidMount |
|------|-------------------|-------------|-------------------|
| 初始化 state | ✅ 可以（但 constructor 更早） | ✅ 最佳 | ❌ 已渲染 |
| 异步请求 | ⚠️ 重复调用 | ❌ 不合适 | ✅ 只执行一次 |
| DOM 操作 | ❌ DOM 不存在 | ❌ DOM 不存在 | ✅ DOM 已挂载 |
| 事件监听 | ❌ 组件未挂载 | ❌ 组件未挂载 | ✅ 可以绑定 |

###### 2. componentWillReceiveProps → getDerivedStateFromProps / 直接计算

```javascript
// ❌ 废弃写法：破坏单一数据源
class EmailInput extends React.Component {
  state = {
    email: this.props.email  // 用 state 存派生数据
  };

  componentWillReceiveProps(nextProps) {
    // 每次 props 变化都会调用
    if (nextProps.email !== this.props.email) {
      this.setState({
        email: nextProps.email  // 派生 state，来源不唯一
      });
    }
  }

  render() {
    return <input value={this.state.email} />;
  }
}
// 问题：email 有 props 和 state 两个来源，读哪个？

// ✅ 方案 1：getDerivedStateFromProps（有派生需求时）
class EmailInput extends React.Component {
  state = { email: '' };

  static getDerivedStateFromProps(props, state) {
    // 返回要更新 state 的对象，返回 null 表示不更新
    if (props.email !== state.prevEmail) {
      return {
        email: props.email,
        prevEmail: props.email  // 记住上一次的 props
      };
    }
    return null;
  }

  render() {
    return <input value={this.state.email} />;
  }
}

// ✅ 方案 2：完全受控组件（推荐）
function EmailInput({ email, onChange }) {
  return <input value={email} onChange={e => onChange(e.target.value)} />;
}

// ✅ 方案 3：非受控组件 + key 重置
function EmailInput({ email, onChange }) {
  const [localValue, setLocalValue] = useState(email);
  // key 变化时重新创建组件
  return <input key={email} defaultValue={email}
    onChange={e => setLocalValue(e.target.value)} />;
}
```

**componentWillReceiveProps vs getDerivedStateFromProps 对比：**

| 特性 | componentWillReceiveProps | getDerivedStateFromProps |
|------|--------------------------|------------------------|
| 调用时机 | 接收新 props 后、render 前 | 接收新 props 后、render 前 |
| 返回值 | 无 | 返回要更新 state 的对象或 null |
| 访问 this | ✅ 可以访问当前 props/state | ❌ 静态方法，无法访问 this |
| 副作用 | ✅ 可以（但可能导致重复调用） | ❌ 纯函数，禁止副作用 |
| 多次调用 | ✅ Fiber 中可能多次 | ✅ 多次调用但纯函数无影响 |
| 推荐度 | ⚠️ 废弃 | ⭐ 有派生需求时使用 |

> ⚠️ **重要**：`getDerivedStateFromProps` 应极少使用。大多数场景下，**完全受控组件**（props 作为唯一数据源）才是正确答案。

###### 3. componentWillUpdate → getSnapshotBeforeUpdate + componentDidUpdate

```javascript
// ❌ 废弃写法：无法可靠获取 DOM
class ChatList extends React.Component {
  state = { messages: [] };

  componentWillUpdate() {
    // 危险：Fiber 中可能被多次调用
    // 且此时 DOM 还未更新，但无法获取可靠的滚动位置
    this.scrollHeight = this.list.scrollHeight;  // 可能不准确
  }

  render() {
    return (
      <div ref={el => this.list = el}>
        {this.state.messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
      </div>
    );
  }

  componentDidUpdate() {
    // 如果新消息到来，恢复滚动位置
    if (this.shouldScroll) {
      this.list.scrollTop = this.scrollHeight;
    }
  }
}

// ✅ 正确写法：getSnapshotBeforeUpdate
class ChatList extends React.Component {
  state = { messages: [] };

  // 在 React 更新 DOM 之前同步调用
  // 返回值会传给 componentDidUpdate 的第三个参数
  getSnapshotBeforeUpdate(prevProps, prevState) {
    const list = this.listRef.current;
    if (prevProps.messages.length < this.props.messages.length) {
      // 新消息到来，记录当前滚动信息
      return {
        scrollHeight: list.scrollHeight,
        scrollTop: list.scrollTop,
        clientHeight: list.clientHeight
      };
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // snapshot 就是 getSnapshotBeforeUpdate 返回的值
    if (snapshot) {
      const list = this.listRef.current;
      // 如果之前在底部，新消息后自动滚到底部
      const isAtBottom =
        snapshot.scrollTop + snapshot.clientHeight >= snapshot.scrollHeight - 50;
      if (isAtBottom) {
        list.scrollTop = list.scrollHeight;
      }
    }
  }

  render() {
    return (
      <div ref={this.listRef}>
        {this.props.messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
      </div>
    );
  }
}
```

**componentWillUpdate vs getSnapshotBeforeUpdate 对比：**

| 特性 | componentWillUpdate | getSnapshotBeforeUpdate |
|------|---------------------|------------------------|
| 调用时机 | render 前（DOM 更新前） | render 后、DOM 更新前（Pre-commit 阶段） |
| 读取 DOM | ⚠️ 可读但不可靠（可能被多次调用） | ✅ 可靠（只调用一次） |
| 返回值 | 无 | 返回值传给 componentDidUpdate |
| 适用场景 | 几乎没有安全场景 | DOM 测量/快照 |
| 推荐度 | ⚠️ 废弃 | ⭐ 唯一的 DOM 快照方案 |

##### 新旧生命周期完整对比

```mermaid
flowchart TD
    subgraph "Class 生命周期 (React 16+)"
        C1["constructor"]
        C2["static getDerivedStateFromProps<br/>(替代 componentWillReceiveProps)"]
        C3["shouldComponentUpdate"]
        C4["render"]
        C5["getSnapshotBeforeUpdate<br/>(替代 componentWillUpdate)"]
        C6["componentDidMount / DidUpdate"]
        C7["componentWillUnmount"]
        C8["componentDidCatch / getDerivedStateFromError"]
    end

    subgraph Hooks 等价实现
        H1["useState 初始化<br/>(替代 constructor 中的 state 初始化)"]
        H2["useEffect + 依赖项<br/>(自动跟踪 props 变化)"]
        H3["React.memo + useMemo<br/>(替代 shouldComponentUpdate)"]
        H4["函数体本身<br/>(替代 render)"]
        H5["useEffect 清理函数<br/>(替代 componentWillUnmount)"]
        H6["useRef<br/>(替代 getSnapshotBeforeUpdate 中的 DOM 测量)"]
    end

    C1 -.-> H1
    C2 -.-> H2
    C3 -.-> H3
    C4 -.-> H4
    C5 -.-> H6
    C6 -.-> H2
    C7 -.-> H5
```

##### Hooks 替换 Class 生命周期完整示例

```javascript
// ========== Class 组件写法 ==========
class TimerWithLifecycle extends React.Component {
  constructor(props) {
    super(props);
    this.state = { seconds: 0, message: '' };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetOnPropChange !== state.prevProp) {
      return { seconds: 0, prevProp: props.resetOnPropChange };
    }
    return null;
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState(prev => ({ seconds: prev.seconds + 1 }));
    }, 1000);

    document.title = `Timer: ${this.state.seconds}s`;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.seconds !== this.state.seconds) {
      document.title = `Timer: ${this.state.seconds}s`;
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  getSnapshotBeforeUpdate() {
    return window.scrollY;  // DOM 快照
  }

  render() {
    return <div>Seconds: {this.state.seconds}</div>;
  }
}

// ========== Hooks 写法 ==========
function TimerWithHooks({ resetOnPropChange }) {
  const [seconds, setSeconds] = useState(0);

  // 等价 getDerivedStateFromProps
  const prevPropRef = useRef(resetOnPropChange);
  useEffect(() => {
    if (resetOnPropChange !== prevPropRef.current) {
      setSeconds(0);
      prevPropRef.current = resetOnPropChange;
    }
  }, [resetOnPropChange]);

  // 等价 componentDidMount + componentDidUpdate + componentWillUnmount
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    document.title = `Timer: ${seconds}s`;

    return () => clearInterval(interval);  // 等价 componentWillUnmount
  }, [seconds]);

  return <div>Seconds: {seconds}</div>;
}
```

#### 🏗️ Fiber 架构

Fiber 架构将虚拟 DOM 从递归不可中断的 Stack Reconciler 重构为可中断的 Fiber 链表结构，引入时间切片和优先级调度机制。

```mermaid
flowchart TB
    subgraph React 15: Stack Reconciler
        S1["递归遍历 Virtual DOM"] --> S2["同步更新 DOM"]
        S2 --> S3["过程中不可中断"]
        S3 --> S4["长时间占用主线程<br/>导致卡顿/掉帧"]
    end

    subgraph React 16+: Fiber Reconciler
        F1["虚拟 DOM → Fiber 链表"] --> F2["可中断的异步渲染"]
        F2 --> F3["时间切片 + 优先级调度"]
        F3 --> F4{"浏览器空闲?"}
        F4 -->|是| F5["继续执行 Fiber 工作单元"]
        F4 -->|否| F6["让出主线程"]
        F5 --> F7["完成 Reconciliation"]
        F7 --> F8["一次性提交 DOM 更新"]
    end
```

**Fiber 架构核心概念：**
- **Fiber Node**：每个组件对应一个 Fiber 节点，构成 Fiber 树（单链表结构）
- **双缓冲**：`current` 树（当前 UI）和 `workInProgress` 树（内存中构建的新树）
- **时间切片（Time Slicing）**：将一个渲染任务拆分成多个小单元，每执行完一个单元就让出主线程
- **优先级调度**：任务分优先级，高优先级任务（如用户输入）可打断低优先级任务（如数据加载）

#### 🔄 Reconciliation（协调）过程

```mermaid
flowchart TD
    A["触发更新: setState / props 变化"] --> B["进入 Render 阶段<br/>可中断"]
    B --> C["从 Fiber Root 开始遍历"]
    C --> D["构建 workInProgress 树"]
    D --> E{"节点是否可复用?"}
    E -->|是| F["复用旧 Fiber，更新 props"]
    E -->|否| G["创建新 Fiber"]
    F --> H["收集 effectTag"]
    G --> H
    H --> I{"还有更多节点?"}
    I -->|是| J["深度优先遍历"]
    J --> D
    I -->|否| K["workInProgress 树构建完成"]
    K --> L["进入 Commit 阶段<br/>不可中断"]
    L --> M["根据 effect 链表执行 DOM 操作"]
    M --> N["current 指针切换"]
    N --> O["触发生命周期回调"]
```

| 阶段 | 是否可中断 | 主要工作 |
|------|-----------|---------|
| Render | 可中断 | 构建 workInProgress 树，diff 对比，标记 effect |
| Pre-commit | 不可中断 | 读取 DOM 快照（getSnapshotBeforeUpdate） |
| Commit | 不可中断 | 执行 DOM 操作，触发生命周期 |

---

### 🔟 代码复用方案对比

#### 🧩 HOC vs Render Props vs Hooks

```mermaid
flowchart LR
    subgraph 代码复用方案演进
        A["HOC<br/>高阶组件"] --> B["Render Props"]
        B --> C["Hooks<br/>React 16.8+"]
    end

    A --> A1["优点: 逻辑复用<br/>不影响内部逻辑"]
    A --> A2["缺点: props 命名冲突<br/>嵌套层级深"]

    B --> B1["优点: 数据共享灵活"]
    B --> B2["缺点: 嵌套地狱"]

    C --> C1["优点: 简洁直观<br/>解决props覆盖和嵌套地狱"]
    C --> C2["限制: 只能在顶层调用"]
```

| 维度 | HOC | Render Props | Hooks |
|------|-----|-------------|-------|
| 模式 | 装饰器模式 | 函数作为 children | 组合式函数 |
| 命名冲突 | ⚠️ 容易冲突 | ✅ 不冲突 | ✅ 不冲突 |
| 嵌套层级 | 深 | 深（嵌套地狱） | 浅 |
| 模板代码 | 多 | 多 | 少 |
| 推荐度 | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |

**HOC 示例：**

```javascript
function withSubscription(WrappedComponent, selectData) {
  return class extends React.Component {
    constructor(props) {
      super(props)
      this.state = { data: selectData(DataSource, props) }
    }
    render() {
      return <WrappedComponent data={this.state.data} {...this.props} />
    }
  }
}
```

**Render Props 示例：**

```javascript
class DataProvider extends React.Component {
  state = { name: 'Tom' }
  render() {
    return <div>{this.props.render(this.state)}</div>
  }
}
// 使用: <DataProvider render={data => <h1>Hello {data.name}</h1>} />
```

---


## 第二部分：高级特性

### 1️⃣ Context API 深度应用

#### 🔄 Context 完整工作流

```mermaid
graph TD
    A["createContext"] -->|创建| B["Context 对象"]
    B --> C["Provider 组件"]
    B --> D["useContext Hook"]

    C -->|提供| E["value"]
    E -->|传递给| F["后代组件"]
    D -->|消费| F
    F -->|获取| E
```

#### 🎯 实战：主题系统

```jsx
// theme-context.ts
interface ThemeContextType {
  theme: { primary: string; background: string; text: string };
  toggleTheme: () => void;
  currentThemeName: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes = {
  light: { primary: '#007bff', background: '#ffffff', text: '#000000' },
  dark: { primary: '#0d6efd', background: '#1a1a1a', text: '#ffffff' }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<'light' | 'dark'>('light');
  const value: ThemeContextType = {
    theme: themes[themeName],
    toggleTheme: () => setThemeName(prev => prev === 'light' ? 'dark' : 'light'),
    currentThemeName: themeName
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

#### 🛒 实战：购物车 Context

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const totalAmount = useMemo(() =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const totalCount = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{
      items, addItem,
      removeItem: (id) => setItems(prev => prev.filter(i => i.id !== id)),
      updateQuantity: (id, qty) => setItems(prev =>
        prev.map(i => i.id === id ? { ...i, quantity: qty } : i)
      ),
      clearCart: () => setItems([]),
      totalAmount, totalCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
```

##### 购物车持久化（localStorage）

```jsx
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 自动持久化
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // 多标签同步
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cart' && e.newValue) {
        setItems(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ... rest of the provider
}
```

> 🔗 **链式思考**：React 状态管理生态最为多元——从内置的 `useState`/`useReducer` 到第三方 Zustand/Redux/Jotai，体现"轻核心 + 重生态"哲学。Vue 的 Pinia 是官方统一方案，深度集成响应式系统。Angular 的 NgRx SignalStore 则结合了 RxJS 和 Signals。选择策略：小型应用用内置方案，中型应用用 Zustand/Pinia/SignalStore，大型应用用 Redux/NgRx。详见 [框架对比](../框架对比/) 的"状态管理生态"。

---

### 2️⃣ 状态管理完全指南

#### 📊 状态管理全景图

| 本地状态 | 跨组件共享 | 全局状态 | 服务器状态 |
| :--- | :--- | :--- | :--- |
| `useState` | Context API | Redux | TanStack Query |
| `useReducer` | `useMemo`(值) | Zustand | SWR |
| `useRef` | | Jotai | Apollo |
| | | MobX | RTK Query |
| | | Valtio | |
| | | Legend State | |

#### 🧭 状态管理分类与演进

**四个象限分类法：**

| 象限 | 范围 | 典型方案 | 核心问题 |
|------|------|---------|---------|
| **本地** | 单个组件内 | useState / useReducer / useRef | 表单输入、UI 开关 |
| **共享** | 组件树内 | Context API / 组合提升 | 主题、语言、用户 |
| **全局（客户端）** | 整个应用 | Redux / Zustand / Jotai / MobX | 缓存数据、复杂交互 |
| **全局（服务端）** | 服务端来源 | TanStack Query / SWR / Apollo | API 数据同步 |

**版本演进时间线：**

```
2014: Redux 发布（Flux 理念 + 单一状态树）
2015: MobX 发布（响应式可变状态）
2016: Redux 成为 React 标配
2018: React Context + useReducer（内置替代方案）
2019: Recoil 发布（原子化先驱，Meta）
      SWR 发布（stale-while-revalidate）
2020: Zustand 发布（极简 API，~1KB）
      Jotai 发布（原子化改进，Recoil 竞争者）
      TanStack Query v3（服务器状态管理）
2021: Valtio 发布（Proxy 响应式）
      Redux Toolkit 成为官方推荐
2022: Legend State 发布（高性能信号式）
2023: Zustand v4 + Middleware
      Jotai v2（突破性改进）
2024-2026: React 19 + Signal 状态库融合
           Server State + Client State 界限模糊
           Zustand v5 / Jotai v2 稳定
```

#### 💡 实战：useState 状态模式

##### SKU 选择器

```jsx
interface SKU {
  color: string;
  size: string;
  stock: number;
  price: number;
}

function SKUSelector({ skus }: { skus: SKU[] }) {
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const availableSizes = useMemo(() =>
    [...new Set(skus.filter(s => !selectedColor || s.color === selectedColor).map(s => s.size))],
    [skus, selectedColor]
  );

  const currentSKU = useMemo(() =>
    skus.find(s => s.color === selectedColor && s.size === selectedSize),
    [skus, selectedColor, selectedSize]
  );

  return (
    <div>
      <div className="mb-4">
        <label className="block mb-2">颜色：</label>
        <div className="flex gap-2">
          {[...new Set(skus.map(s => s.color))].map(color => (
            <button key={color}
              onClick={() => { setSelectedColor(color); setSelectedSize(''); }}
              className={`px-4 py-2 rounded ${selectedColor === color ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-2">尺寸：</label>
        <div className="flex gap-2">
          {availableSizes.map(size => (
            <button key={size}
              onClick={() => setSelectedSize(size)}
              className={`px-4 py-2 rounded ${selectedSize === size ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {size}
            </button>
          ))}
        </div>
      </div>

      {currentSKU && (
        <div className="p-4 bg-gray-50 rounded">
          <p>价格：¥{currentSKU.price}</p>
          <p>库存：{currentSKU.stock > 0 ? `${currentSKU.stock}件` : '已售罄'}</p>
        </div>
      )}
    </div>
  );
}
```

##### 状态提升（Lifting State Up）

```mermaid
graph LR
    subgraph 错误: 状态分散
        A["父组件"] --> B["子组件A<br/>有自己的 count"]
        A --> C["子组件B<br/>有自己的 count"]
    end

    subgraph 正确: 状态提升
        D["父组件<br/>count 状态在此"] --> E["子组件A<br/>props 接收 count"]
        D --> F["子组件B<br/>props 接收 count"]
    end
```

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <CounterDisplay count={count} />
      <CounterControls count={count} setCount={setCount} />
    </div>
  );
}

function CounterDisplay({ count }: { count: number }) {
  return <h2>计数：{count}</h2>;
}

function CounterControls({ count, setCount }: {
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>-</button>
    </div>
  );
}
```

##### Immer：复杂状态简化

```jsx
import { produce } from 'immer';

interface User {
  name: string;
  address: { city: string; district: string; detail: string };
  hobbies: string[];
}

const [user, setUser] = useState<User>({
  name: '张三',
  address: { city: '北京', district: '海淀', detail: '...' },
  hobbies: ['读书', '跑步'],
});

// Immer：以可变的方式写不可变逻辑
function updateAddress(district: string) {
  setUser(produce(draft => {
    draft.address.district = district;
  }));
}

function addHobby(hobby: string) {
  setUser(produce(draft => {
    draft.hobbies.push(hobby);
  }));
}

// State 不可变更新速查
// ❌ 直接修改：todos.push('c'), setTodos(todos) → 不触发渲染
// ✅ 添加：setTodos([...todos, 'c'])
// ✅ 删除：setTodos(todos.filter(t => t !== 'a'))
// ✅ 修改：setTodos(todos.map(t => t === 'a' ? 'A' : t))
```

#### 🎯 主流方案快速对比

| 方案 | 范式 | Bundle | Star | 学习曲线 | TS 支持 | 适用规模 |
|------|------|--------|------|---------|---------|---------|
| **useState** | 不可变 | 0KB（内置） | — | 🟢 极低 | ✅ | 单组件 |
| **Context + useReducer** | 不可变 | 0KB（内置） | — | 🟢 低 | ✅ | 小功能 |
| **Zustand** | 不可变 | ~1KB | 50k+ | 🟢 低 | ✅ 优秀 | 中/大型 |
| **Jotai** | 原子不可变 | ~3KB | 22k+ | 🟢 低 | ✅ 优秀 | 中/大型 |
| **Valtio** | 可变（Proxy） | ~2KB | 9k+ | 🟢 低 | ✅ 好 | 中/大型 |
| **MobX** | 可变（Proxy） | ~16KB | 27k+ | 🟡 中 | ⚠️ 一般 | 中/大型 |
| **Redux Toolkit** | 不可变（Immer） | ~12KB | 60k+ | 🔴 中-高 | ✅ 优秀 | 大型企业 |
| **TanStack Query** | 不可变（缓存） | ~13KB | 45k+ | 🟡 中 | ✅ 优秀 | 任意（服务端） |
| **Legend State** | 信号式 | ~3KB | 4k+ | 🟢 低 | ✅ 好 | 中/大型 |

#### 🏆 方案深度对比

##### 1. [Zustand](https://github.com/pmndrs/zustand) — 极简全局状态（💡 推荐首选）

```jsx
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

interface BearStore {
  bears: number;
  fishes: number;
  addBear: () => void;
  consumeFish: (n: number) => void;
}

export const useBearStore = create<BearStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        (set) => ({
          bears: 0,
          fishes: 10,
          addBear: () => set((s) => ({ bears: s.bears + 1 })),
          consumeFish: (n) => set((s) => ({ fishes: s.fishes - n })),
        }),
        { name: 'bear-storage' }
      ),
      { name: 'BearStore' }
    )
  )
);

// 组件外读写
const bears = useBearStore.getState().bears;
useBearStore.getState().addBear();
useBearStore.subscribe((s) => console.log('changed:', s.bears));

// 选择器自动优化重渲染
function BearCounter() {
  const bears = useBearStore((s) => s.bears);
  return <h1>{bears} bears</h1>;
}

// 组合多个选择器
const { bears, fishes } = useBearStore((s) => ({ bears: s.bears, fishes: s.fishes }), shallow);
```

**Zustand vs Context 核心差异：**
- Context 导致 Provider 嵌套地狱，Zustand 无 Provider
- Context 会重渲染所有消费者，Zustand 选择器精确订阅
- Zustand 可在组件外读写（Router/Promise 回调）

##### 2. Redux Toolkit — 大型企业标准

```jsx
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

// slice：action + reducer 自动生成
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },      // Immer 可变写法
    decrement: (state) => { state.value -= 1; },
    incrementByAmount: (state, action) => { state.value += action.payload; },
  },
});

// 异步 thunk
const incrementAsync = createAsyncThunk('counter/fetchCount', async (amount: number) => {
  const response = await fetch('/api/count');
  return response.json() as number;
});

const store = configureStore({
  reducer: { counter: counterSlice.reducer },
  middleware: (gDM) => gDM().concat(logger),
});

// Hooks 封装 + TypeScript 类型
type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

function Counter() {
  const count = useAppSelector((s) => s.counter.value);
  const dispatch = useAppDispatch();
  return <button onClick={() => dispatch(increment())}>{count}</button>;
}
```

```mermaid
flowchart TD
    A["React Component"] -->|useAppDispatch| B["dispatch(action)"]
    B --> C["Middleware Chain"]
    C --> D["createAsyncThunk<br/>请求/成功/失败"]
    C --> E["reducer (Immer)"]
    E --> F["Store<br/>configureStore"]
    F -->|useAppSelector| A

    subgraph 三大原则
        P1["单一数据源"]
        P2["状态只读"]
        P3["纯函数修改"]
    end
```

**Redux 中间件洋葱模型：**

```mermaid
flowchart LR
    A["dispatch"] --> B["logger"]
    B --> C["thunk"]
    C --> D["saga"]
    D --> E["reducer"]
    E --> F["store"]
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#e3f2fd
```

##### 3. Jotai — 原子化状态

```jsx
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage, splitAtom, loadable } from 'jotai/utils';

// 基础原子
const countAtom = atom(0);

// 派生原子（懒计算，自动缓存）
const doubledAtom = atom((get) => get(countAtom) * 2);

// 异步原子
const userAtom = atom(async () => {
  const res = await fetch('/api/user');
  return res.json();
});

// 存储原子（自动持久化）
const themeAtom = atomWithStorage('theme', 'light');

// 拆分原子（数组管理）
const itemsAtom = atom([{ id: 1, text: 'hello' }]);
const itemAtomsAtom = splitAtom(itemsAtom);

function Counter() {
  const count = useAtomValue(countAtom);       // 只读
  const setCount = useSetAtom(countAtom);       // 只写
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// 异步 + loading 状态
function User() {
  const user = useAtomValue(loadable(userAtom));
  if (user.state === 'loading') return <Spinner />;
  if (user.state === 'hasError') return <Error message={user.error} />;
  return <div>{user.data.name}</div>;
}
```

| 维度 | Context API | Jotai | Recoil（已停更） |
|------|-------------|-------|-----------------|
| 渲染优化 | ❌ 所有消费者重渲染 | ✅ 仅关联原子变化 | ✅ 仅关联原子变化 |
| 组合性 | ❌ 多层 Provider 嵌套 | ✅ 原子自由组合 | ✅ 原子自由组合 |
| 异步支持 | ❌ 需手动管理 | ✅ loadable / 异步原子 | ✅ selector |
| Bundle | 0KB | ~3KB | ~15KB |
| 维护状态 | ✅ 活跃 | ✅ 活跃 | ❌ Meta 已不推荐 |

##### 4. MobX — 可变响应式

```jsx
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

// 可观察状态（class-based）
class TodoStore {
  todos: Todo[] = [];
  filter: 'all' | 'active' | 'completed' = 'all';

  constructor() {
    makeAutoObservable(this);  // 自动将属性转为 observable
  }

  // action：修改状态
  addTodo(text: string) {
    this.todos.push({ id: Date.now(), text, completed: false });
  }

  // computed：自动衍生
  get filteredTodos() {
    if (this.filter === 'all') return this.todos;
    return this.todos.filter(t => t.completed === (this.filter === 'completed'));
  }
}

const todoStore = new TodoStore();

// 组件自动追踪依赖
const TodoList = observer(({ store }: { store: TodoStore }) => (
  <ul>
    {store.filteredTodos.map(todo => (
      <li key={todo.id}>{todo.text}</li>
    ))}
  </ul>
));
```

**MobX 与 Zustand 核心差异：**
- MobX 可变响应式（类似 Vue reactive），Zustand 不可变（类似 React setState）
- MobX 自动追踪依赖，Zustand 手动选择器
- MobX 更适合 OOP 思维，Zustand 更适合函数式

##### 5. Valtio — Proxy 响应式

```jsx
import { proxy, useSnapshot } from 'valtio';

// Proxy 代理对象，类似 Vue reactive
const state = proxy({
  count: 0,
  user: { name: 'John', todos: [] as Todo[] },
});

// mutations
state.count++;
state.user.todos.push({ id: 1, text: 'hello' });

// 组件订阅快照（不可变）
function Counter() {
  const snap = useSnapshot(state);        // 只读快照
  return <button onClick={() => state.count++}>{snap.count}</button>;
}

// 派生状态
const doubled = ref(0);
subscribe(state, () => { doubled.value = state.count * 2; });
```

##### 6. Legend State — 信号式高性能

```jsx
import { observable, useObservable, batch } from '@legendapp/state';

// 信号式状态（类似 Angular Signals）
const state = observable({
  count: 0,
  user: { name: '' },
});

// 精确依赖追踪，无需选择器
function Counter() {
  const count = useObservable(state.count);
  return <button onClick={() => state.count.set(c => c + 1)}>{count}</button>;
}

// 批量更新（合并触发）
batch(() => {
  state.count.set(5);
  state.user.name.set('Jane');
});
```

#### 📊 八维对比矩阵

| 维度 | useState | Zustand | Redux Toolkit | Jotai | MobX | Valtio | TanStack Query |
|------|----------|---------|--------------|-------|------|--------|----------------|
| **范式** | 不可变 | 不可变 | 不可变(Immer) | 不可变 | 可变 | **Proxy** | 不可变 |
| **Bundle** | 0KB | ~1KB | ~12KB | ~3KB | ~16KB | ~2KB | ~13KB |
| **模板代码** | 无 | 极少 | 中 | 少 | 少 | 极少 | 少 |
| **组件外访问** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **异步支持** | ❌ | Promise | createAsyncThunk | atom(async) | flow | proxy + | ✅ 内置 |
| **中间件** | — | persist/imber | thunk/saga | utils | — | — | 查询/变更 |
| **DevTools** | React DevTools | Zustand DevTools | **Redux DevTools** | Jotai DevTools | MobX DevTools | — | React Query Devtools |
| **SSR 友好** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |

#### 🎯 技术选型决策树

```mermaid
graph TD
    A["状态管理选型"] --> B{"状态来源"}
    B -->|"服务端 API"| C["TanStack Query / SWR / RTK Query"]
    B -->|"客户端"| D{"应用规模"}

    D -->|"单组件"| E["useState"]
    D -->|"少数组件"| F["Context + useReducer"]
    D -->|"中等规模"| G{"团队偏好"}
    D -->|"大型企业"| H["Redux Toolkit<br/>（规范 + 生态）"]

    G -->|"极简 API"| I["Zustand 💡"]
    G -->|"原子化"| J["Jotai"]
    G -->|"响应式/可变"| K["MobX / Valtio"]

    I --> L{"需要中间件"}
    L -->|"持久化"| M["Zustand + persist"]
    L -->|"DevTools"| N["Zustand + devtools"]
    L -->|"大项目"| O["Zustand + immer"]
```

#### 📊 性能基准（粗略）

```
## 更新 1000 个状态项 + 订阅组件重渲染（ms）
Zustand:     ~2ms  （选择器精确订阅）
Jotai:       ~3ms  （原子级依赖追踪）
MobX:        ~4ms  （自动追踪）
Valtio:      ~3ms  （Proxy + 快照对比）
Redux:       ~8ms  （全量 selector 检查）
Context:     ~15ms （所有消费者重渲染）

## Bundle 体积（gzip）
Zustand:     1.2KB
Valtio:      1.8KB
Jotai:       2.5KB
MobX:        12KB
RTK:         10KB
TanStack Q:  11KB
```

> 🔗 **链式思考**：React Router v8 的 `loaders`/`actions` 本质是"声明式数据获取"，在路由匹配时自动加载数据——这与 Vue Router 的导航守卫 + 手动数据获取模式不同，更接近 Angular Router 的 `resolve` 守卫。三者都支持懒加载和嵌套路由，但 React Router 以 URL 为中心，Vue Router 以组件树为中心，Angular Router 以配置为中心。详见 [框架对比](../框架对比/) 的"路由方案"。

---

### 3️⃣ 路由完全指南

#### 📊 React Router v6 vs v7 vs v8 核心对比

| 维度 | v6 (2021-2024) | v7 (2024-2025) | v8 (2026+) |
|------|---------------|---------------|------------|
| **包名** | `react-router-dom` + `react-router` | 统一为 `react-router`，DOM API 从 `react-router/dom` 导入 | `react-router`（已移除 `react-router-dom`） |
| **最低 React** | 16.8 | 18 | 19.2.7 |
| **最低 Node** | 12 | 20 | 22.22 |
| **最低 Vite** | 4 | 5 | 7 |
| **ESM** | CJS + ESM | CJS + ESM | **ESM-only** |
| **架构模式** | 元素路由 + 数据路由 | 三模式：Declarative / Data / **Framework** | 三模式继续，Framework 为默认推荐 |
| **数据加载** | `loader` / `action`（v6.4+） | `loader` / `action` + Framework 模式路由模块 | 同上 + Split Route Modules 默认启用 |
| **路由配置** | `createBrowserRouter` | `createBrowserRouter` + `@react-router/dev` | 同上 + `routes.ts` 集中式配置 |
| **Middleware** | ❌ | ✅（v7.9 稳定） | ✅ 默认启用 |
| **RSC 支持** | ❌ | ⚠️ 实验性 | ⚠️ 实验性 |
| **Type-safe href** | ❌ | ✅ | ✅ |
| **SSR / SSG** | ❌ 需额外配置 | ✅ Framework 模式内置 | ✅ 内置 |
| **测试** | `MemoryRouter` | `createRoutesStub` | `createRoutesStub` |
| **React Compiler** | ❌ | ✅ 兼容 | ✅ 原生优化 |
| **升级路径** | — | 通过 Future Flags 无断裂升级 | v7 → v8 非断裂，移除 Future Flags |

**v8 关键变化总结：**
- `react-router-dom` 包已移除，所有导入统一从 `react-router`
- Future Flags（`v8_middleware`, `v8_splitRouteModules` 等）已默认启用
- 最低要求：Node 22.22+ / React 19.2.7+ / Vite 7+
- Split Route Modules 默认启用，支持零配置代码分割
- Middleware API 稳定，支持认证/日志/错误处理等拦截逻辑

#### 📍 React Router 实现原理

```mermaid
flowchart TD
    subgraph HashRouter
        H1["URL: http://xxx/#/path"] --> H2["监听 hashchange 事件"]
        H2 --> H3["hash 变化 → 匹配路由 → 渲染组件"]
    end

    subgraph BrowserRouter
        B1["URL: http://xxx/path"] --> B2["使用 History API"]
        B2 --> B3["pushState/replaceState<br/>改变 URL 不刷新页面"]
        B3 --> B4["监听 popstate 事件 → 匹配路由"]
    end

    subgraph react-router 封装
        L1["history 库<br/>抹平 hash 与 history 差异"]
        L2["Route 组件<br/>path 匹配当前 URL"]
        L3["Link 组件<br/>阻止 a 默认行为"]
    end
```

#### 🛣️ 完整路由配置（v8 Data Mode）

```jsx
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: '*', element: <NotFound /> }
    ]
  }
]);

function RootLayout() {
  return <div><Header /><Outlet /></div>;
}

export default function App() {
  return <RouterProvider router={router} />;
}
```

**参数读取与导航：**

```jsx
import { useParams, useNavigate, Navigate } from 'react-router';

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return <div>Product: {id}<button onClick={() => navigate('/')}>返回</button></div>;
}

// 受保护路由
function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}
```

#### 📍 loaders / actions（数据加载与突变）

```jsx
import {
  createBrowserRouter,
  useLoaderData,
  useActionData,
  Form,
} from 'react-router';

const router = createBrowserRouter([
  {
    path: '/products/:id',
    element: <ProductDetail />,
    loader: async ({ params }) => {
      const product = await fetch(`/api/products/${params.id}`);
      return product.json();
    },
    action: async ({ request, params }) => {
      const formData = await request.formData();
      await fetch(`/api/products/${params.id}`, { method: 'PUT', body: formData });
      return { success: true };
    },
  },
]);

function ProductDetail() {
  const product = useLoaderData();
  const actionData = useActionData();
  return (
    <div>
      <h1>{product.name}</h1>
      <Form method="put">
        <input name="price" defaultValue={product.price} />
        <button type="submit">更新</button>
        {actionData?.success && <p>更新成功</p>}
      </Form>
    </div>
  );
}
```

**defer / Await（延迟数据加载）：**

```jsx
import { defer, Await, useLoaderData, Suspense } from 'react-router';

async function loader() {
  const reviewsPromise = fetch('/api/reviews').then(r => r.json());
  return defer({
    product: await fetch('/api/product').then(r => r.json()),
    reviews: reviewsPromise,
  });
}

function ProductPage() {
  const data = useLoaderData();
  return (
    <div>
      <ProductDetail product={data.product} />
      <Suspense fallback={<ReviewsSkeleton />}>
        <Await resolve={data.reviews}>
          {(reviews) => <ReviewsList reviews={reviews} />}
        </Await>
      </Suspense>
    </div>
  );
}
```

#### 📍 Middleware（v8 稳定 API）

v8 将 `future.v8_middleware` 默认启用，支持在路由处理前后执行拦截逻辑：

```jsx
import { createBrowserRouter } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <Dashboard />,
    loader: ({ context }) => {
      if (!context.isAuthenticated) throw new Response('Unauthorized', { status: 401 });
      return fetchDashboardData();
    },
    // v8 middleware：before/after 拦截
    unstable_middleware: [
      async ({ request, context }, next) => {
        const start = Date.now();
        const response = await next();
        console.log(`/${request.url} took ${Date.now() - start}ms`);
        return response;
      },
    ],
  },
]);
```

---

### 4️⃣ 表单系统

#### 📋 受控组件完整示例

```jsx
interface FormData {
  name: string;
  email: string;
  password: string;
  agreeTerms: boolean;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', password: '', agreeTerms: false
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!formData.name) newErrors.name = '姓名必填';
    if (!formData.email) newErrors.email = '邮箱必填';
    if (!formData.password || formData.password.length < 6) newErrors.password = '密码至少6个字符';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await submitForm(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      {errors.name && <span>{errors.name}</span>}
      <input type="email" name="email" value={formData.email} onChange={handleChange} />
      <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
      <button type="submit">提交</button>
    </form>
  );
}
```

---

### 5️⃣ 组件设计模式

#### 🎭 复合组件 (Compound Component)

```jsx
const AccordionContext = createContext(null);

function Accordion({ children }) {
  const [openIndex, setOpenIndex] = useState(null);
  return (
    <AccordionContext.Provider value={{ openIndex, setOpenIndex }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

function Item({ index, children }) {
  const { openIndex, setOpenIndex } = useContext(AccordionContext);
  const isOpen = openIndex === index;
  return (
    <div className="accordion-item">
      <button onClick={() => setOpenIndex(isOpen ? null : index)}>{children}</button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

Accordion.Item = Item;
// 使用: <Accordion><Accordion.Item index={0}>内容</Accordion.Item></Accordion>
```

#### 🎨 Render Props 模式

```jsx
function MouseTracker({ render }: { render: (data: MousePosition) => ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  return render(position);
}
```

#### 🔧 Control Props（受控属性）

```jsx
function Toggle({ on, onChange, defaultOn = false }) {
  const isControlled = on !== undefined;
  const [internalOn, setInternalOn] = useState(defaultOn);
  const isOn = isControlled ? on : internalOn;

  function toggle() {
    if (isControlled) onChange?.(!isOn);
    else setInternalOn(!isOn);
  }

  return <button onClick={toggle}>{isOn ? 'ON' : 'OFF'}</button>;
}
```

#### 💡 State Reducer（状态归约器）

```jsx
function useToggle({ reducer = defaultReducer } = {}) {
  const [state, dispatch] = useReducer(reducer, { on: false });
  return { on: state.on, toggle: () => dispatch({ type: 'toggle' }) };
}

function customReducer(state, action) {
  switch (action.type) {
    case 'toggle': return { on: !state.on };
    default: return state;
  }
}
```

---


## 第三部分：工程实践

### 1️⃣ 工程化与测试

#### 🔧 测试策略

| 层级 | 工具 | 测试内容 |
|------|------|---------|
| 单元测试 | Vitest + React Testing Library | 组件、Hooks、工具函数 |
| 集成测试 | Vitest + RTL | 组件交互、数据流 |
| E2E 测试 | Playwright / Cypress | 用户流程 |

**Vitest + React Testing Library：**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Counter', () => {
  it('renders initial count', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  it('increments count on click', () => {
    render(<Counter />);
    fireEvent.click(screen.getByText('+1'));
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

**Hooks 测试：**

```tsx
import { renderHook, act } from '@testing-library/react';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    act(() => { result.current.increment(); });
    expect(result.current.count).toBe(1);
  });
});
```

**E2E 测试（Playwright）：**

```tsx
import { test, expect } from '@playwright/test';

test('user can complete purchase flow', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await expect(page.locator('.cart-count')).toHaveText('1');
});
```

#### 🛠️ 构建工具

| 工具 | 用途 |
|------|------|
| Vite | 开发/构建（推荐） |
| Turbopack | Next.js 构建 |
| Webpack | 传统项目 |

---

### 2️⃣ [Next.js](https://nextjs.org)（React 元框架）

#### 🏗️ App Router vs Pages Router

**Pages Router（旧）：**
```
pages/
  index.tsx        → /
  about.tsx        → /about
  blog/[slug].tsx  → /blog/:slug
```

**App Router（新，推荐）：**
```
app/
  page.tsx         → /
  layout.tsx       → 根布局
  about/page.tsx   → /about
  blog/[slug]/page.tsx → /blog/:slug
```

**Layout 嵌套布局：**

```tsx
// app/layout.tsx - 根布局
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx - 仪表盘布局
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <section><DashboardSidebar />{children}</section>;
}
```

**loading / error / not-found 边界：**

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div>Loading dashboard...</div>;
}

// app/dashboard/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <div><h2>Something went wrong!</h2><button onClick={() => reset()}>Try again</button></div>;
}
```

#### 📡 数据获取模式

```tsx
// Server-side fetching（async 组件 fetch）
async function PostsPage() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 } // ISR: 60秒后重新验证
  }).then(r => r.json());

  return <ul>{posts.map(post => <li key={post.id}>{post.title}</li>)}</ul>;
}

// Static Generation（构建时）
export const dynamic = 'force-static';

// ISR（增量静态再生）
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetch(`/api/products/${params.id}`, {
    next: { revalidate: 300 }
  }).then(r => r.json());
  return <ProductDetail product={product} />;
}

// Streaming SSR
async function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<SlowWidgetSkeleton />}>
        <SlowWidget />
      </Suspense>
    </div>
  );
}
```

#### 🗄️ 缓存策略

**多层缓存体系：**

```mermaid
graph TB
    subgraph "请求生命周期"
        A["用户请求"] --> B["Router Cache"]
        B -->|命中| C["客户端缓存页面"]
        B -->|未命中| D["Next.js Server"]
    end

    subgraph "服务端缓存层"
        D --> E["Full Route Cache"]
        E -->|命中| F["返回缓存的HTML"]
        E -->|未命中| G["渲染组件"]
        G --> H["Data Cache"]
        H -->|命中| I["使用缓存数据"]
        H -->|未命中| J["执行 fetch"]
        J --> K["写入 Data Cache"]
        I --> L["生成HTML"]
        K --> L
        L --> M["写入 Full Route Cache"]
    end

    M --> N["返回HTML给客户端"]
    N --> O["更新 Router Cache"]
```

| 缓存类型 | 作用 | 控制方式 |
|---------|------|---------|
| Full Route Cache | 静态路由构建时缓存 | `revalidate` / `dynamic` |
| Data Cache | fetch 响应缓存 | `cache: 'no-store'` / `next: { revalidate }` |
| Router Cache | 客户端预加载 | `prefetch` / `<Link prefetch>` |

#### 🏪 Next.js vs Remix vs Gatsby

| 维度 | Next.js | Remix | Gatsby |
|------|---------|-------|--------|
| 渲染模式 | SSR/SSG/ISR/CSR | SSR + 渐进增强 | 纯 SSG |
| 路由 | App Router (RSC) + Pages Router | 嵌套路由 + loaders | 基于 GraphQL |
| 数据获取 | 服务端 fetch / RSC | loaders / actions | GraphQL 查询 |
| 缓存 | 多层缓存策略 | HTTP 缓存优先 | 静态文件 CDN |
| 学习曲线 | 中等 | 低 | 中 |
| 适用场景 | 通用/企业级 | SaaS/CRUD | 内容型网站 |

---

### 3️⃣ 开发环境搭建与 TypeScript 集成

#### 🏗️ 环境要求

```
Node.js 22+（推荐 LTS）
npm / yarn / pnpm
VS Code + ESLint + Prettier 插件
```

#### ⚡ Vite + React 19 项目创建

```bash
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
npm run dev
```

#### 📁 项目目录结构

```
my-react-app/
├── index.html          # 入口 HTML
├── src/
│   ├── main.tsx        # 应用入口
│   ├── App.tsx         # 根组件
│   ├── App.css
│   ├── index.css
│   ├── assets/
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── public/
```

#### 📦 package.json 配置

```json
{
  "name": "my-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^6.0.0",
    "typescript": "^5.7.0",
    "vite": "^8.0.0"
  }
}
```

#### 🔧 vite.config.ts 配置

```jsx
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

#### 🎨 CSS 方案对比

| 方案 | 作用域 | 动态样式 | 运行时 | Bundle |
|------|--------|---------|--------|--------|
| 原生 CSS | 全局 | ❌ | 无 | 0 |
| CSS Modules | 组件级 | ❌ | 无 | 0 |
| Styled-components | 组件级 | ✅ 主题 | ✅ 有 | ~15KB |
| Tailwind CSS | 全局 | ✅ 条件 | 无 | 可 tree-shake |

**CSS Modules 示例：**

```css
/* Card.module.css */
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}
.title {
  font-size: 18px;
  font-weight: 600;
}
```

```tsx
import styles from './Card.module.css';

function Card({ title, children }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </div>
  );
}
```

**Styled-components 示例：**

```tsx
import styled, { css } from 'styled-components';

const Button = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  border: none;
  cursor: pointer;

  ${({ $primary }) => $primary && css`
    background: #007bff;
    color: white;
    &:hover {
      background: #0056b3;
    }
  `}
`;
```

#### 🔤 TypeScript 集成

**tsconfig.json 核心配置：**

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true
  }
}
```

**组件 Props 类型声明：**

```tsx
// type 别名
type ButtonProps = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

// interface
interface CardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}
```

**interface extends 继承：**

```tsx
interface BaseInputProps {
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

interface TextInputProps extends BaseInputProps {
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}
```

**React 事件类型：**

```tsx
// 鼠标事件
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  console.log(e.clientX, e.clientY);
}

// 表单事件
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log(e.target.value);
}

// 表单提交
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  console.log('submitted');
}

// 键盘事件
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') console.log('pressed enter');
}
```

**useState 类型安全：**

```tsx
// 类型推断
const [count, setCount] = useState(0); // type: number

// 显式类型
const [user, setUser] = useState<User | null>(null);

// 联合类型
type Status = 'idle' | 'loading' | 'success' | 'error';
const [status, setStatus] = useState<Status>('idle');
```

**`.d.ts` 类型声明文件：**

```jsx
// src/types/global.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

// 为环境变量添加类型
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}
```

---

### 4️⃣ React 最佳实践

#### 🎭 现代组件模式

**Props Collection（属性集合）：**

```jsx
function useToggle() {
  const [on, setOn] = useState(false);
  const toggle = () => setOn(!on);

  const getTogglerProps = ({ onClick, ...props } = {}) => ({
    'aria-expanded': on,
    onClick: () => { onClick?.(); toggle(); },
    ...props,
  });

  return { on, toggle, getTogglerProps };
}

function MyComponent() {
  const { on, getTogglerProps } = useToggle();
  return <button {...getTogglerProps({ onClick: () => console.log('clicked') })}>
    {on ? 'ON' : 'OFF'}
  </button>;
}
```

#### 🧪 Bundle 分析优化

- 使用 `vite-bundle-visualizer` 或 `webpack-bundle-analyzer`
- 动态导入大型库（`import('moment')` → 按需使用）
- 使用 `lodash-es` 替代 `lodash`

#### 🧩 组件通信方式总结

| 方式 | 适用场景 | 方向 |
|------|----------|------|
| props | 父子组件 | 父→子 |
| 回调函数 | 父子组件 | 子→父 |
| 共同父组件转发 | 兄弟组件 | — |
| Context API | 跨层级 | 祖先→后代 |
| Redux / Zustand | 任意组件 | 全局 |

---

### 5️⃣ Tailwind CSS 原子化样式

> Tailwind CSS 是**原子化 CSS** 框架，提供大量工具类（utility class）来快速构建 UI，不命名、不冲突、不冗余。

#### CSS 四大痛点 vs Tailwind 魔法

| 传统 CSS 痛点 | Tailwind 解决方案 |
|--------------|------------------|
| 命名困难（BEM/语义化） | 不命名，直接用工具类 |
| 样式冲突（全局污染） | 作用域天然隔离 |
| 重复代码多 | 组合可复用工具类 |
| 难以维护 | 修改即改 HTML |

#### React + Tailwind CSS 开发配置

```bash
npm install -D tailwindcss @tailwindcss/vite
```

```jsx
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* index.css */
@import "tailwindcss";
```

#### Flex 三板斧

```tsx
<div className="flex justify-center items-center h-screen">
  <div className="flex-1 bg-blue-500 p-4">项目1</div>
  <div className="flex-1 bg-green-500 p-4">项目2</div>
  <div className="flex-1 bg-red-500 p-4">项目3</div>
</div>
```

#### Grid 网格布局

```tsx
<div className="grid grid-cols-3 gap-4">
  {products.map(product => (
    <div key={product.id} className="bg-white rounded-lg shadow p-4">
      <h3>{product.name}</h3>
    </div>
  ))}
</div>
```

#### 响应式：手机、平板、PC 三屏联动

```tsx
<div className="
  grid
  grid-cols-1         /* 手机：1列 */
  sm:grid-cols-2      /* 平板：2列 */
  lg:grid-cols-3      /* 桌面：3列 */
  xl:grid-cols-4      /* 大屏：4列 */
  gap-4
  p-4
">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

#### 状态特效

```tsx
<button className="
  px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold
  hover:bg-blue-700 hover:shadow-lg hover:scale-105
  focus:outline-none focus:ring-2 focus:ring-blue-400
  transition-all duration-200
">
  悬停发光按钮
</button>

<input className="
  w-full px-4 py-2 border border-gray-300 rounded-lg
  focus:border-blue-500 focus:ring-2 focus:ring-blue-200
  outline-none transition-all duration-200
" />
```

#### 黑暗模式

```tsx
function ThemedCard() {
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold">暗黑模式切换</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          使用 Tailwind 的 dark: 前缀实现
        </p>
        <button
          onClick={() => setDark(!dark)}
          className="mt-4 px-4 py-2 bg-blue-500 dark:bg-yellow-500 text-white rounded"
        >
          切换 {dark ? '亮色' : '暗黑'} 模式
        </button>
      </div>
    </div>
  );
}
```

#### 主题与指令：自定义 CSS 变量

```css
@import "tailwindcss";

@theme {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-accent: #ffc107;
}
```

---

### 6️⃣ 全栈实战：认证与购物车系统

#### 🔐 JWT 认证原理

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端

    U->>F: 输入用户名密码
    F->>B: POST /api/login
    B->>B: 验证凭证
    B->>B: 生成 JWT（Header.Payload.Signature）
    B->>F: 返回 JWT Token
    F->>F: 存储 Token（localStorage）
    F->>B: 请求携带 Authorization: Bearer <token>
    B->>B: 验证 Signature
    B->>F: 返回受保护资源
```

JWT 结构：`Header.Payload.Signature`

```
Header:    { "alg": "HS256", "typ": "JWT" }
Payload:   { "sub": "user123", "iat": 1516239022, "exp": 1516242622 }
Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

#### 🔑 自定义 Auth Hook

```jsx
interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return {
      token,
      user: user ? JSON.parse(user) : null,
      loading: false,
      error: null,
    };
  });

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('登录失败');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setState({ user: data.user, token: data.token, loading: false, error: null });
      return true;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: (err as Error).message }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, loading: false, error: null });
  }, []);

  return { ...state, login, logout, isAuthenticated: !!state.token };
}
```

#### 🛡️ 路由守卫 + Token 管理

```jsx
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Token 过期检查
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

// 路由配置
<Route path="/checkout" element={
  <AuthGuard>
    <CheckoutPage />
  </AuthGuard>
} />
```

#### 🔄 本地存储 vs 后端数据：联网版购物车

```jsx
function useSyncCart() {
  const { isAuthenticated } = useAuth();
  const localCart = useLocalStorage<CartItem[]>('cart', []);
  const [serverCart, setServerCart] = useState<CartItem[]>([]);

  // 登录后：将本地购物车同步到服务器
  useEffect(() => {
    if (isAuthenticated && localCart[0].length > 0) {
      syncCartToServer(localCart[0]);
      localCart[1]([]);
      fetchServerCart().then(setServerCart);
    }
  }, [isAuthenticated]);

  const items = isAuthenticated ? serverCart : localCart[0];
  const setItems = isAuthenticated ? setServerCart : localCart[1];

  return { items, setItems };
}
```

#### 💳 从购物车到支付成功

```jsx
function CheckoutFlow() {
  const { items, totalAmount } = useCart();
  const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'confirm'>('cart');
  const [orderId, setOrderId] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ items, totalAmount }),
      });
      const order = await res.json();
      setOrderId(order.id);
      setStep('confirm');
    } catch (err) {
      console.error('下单失败', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 'cart' && <CartStep onNext={() => setStep('shipping')} />}
      {step === 'shipping' && <ShippingForm onNext={() => setStep('payment')} />}
      {step === 'payment' && <PaymentForm onSubmit={handlePlaceOrder} />}
      {step === 'confirm' && <OrderConfirmation orderId={orderId!} />}
    </div>
  );
}
```

---

> 🔗 **链式思考**：React 性能优化的核心矛盾是"不知道什么变了，所以需要 Diff"——因此 `React.memo`、`useMemo`、`useCallback` 都是手动告诉 React"这里没变，跳过渲染"。Vue 3 的 Proxy 响应式天然知道"什么变了"，所以不需要手动 memo。Angular 的 OnPush + Signals 则介于两者之间——OnPush 缩小检测范围，Signals 精确到依赖。详见 [框架对比](../框架对比/) 的"性能优化策略"。

---


## 第四部分：性能优化

### 1️⃣ 性能优化完全指南

#### 📊 优化策略金字塔

```mermaid
graph TD
    Opt[🚀 性能优化] --> UX[用户体验优化<br/>Core Web Vitals]
    Opt --> Runtime[运行时优化<br/>渲染/状态]

    subgraph 网络层优化
    Net1[代码分割]
    Net2[资源预加载]
    Net3[CDN 部署]
    Net4[HTTP/2 多路复用]
    end

    subgraph 编译时优化
    Comp1[React Compiler]
    Comp2[Tree-shaking]
    Comp3[代码压缩]
    Comp4[静态分析]
    end

    subgraph 运行时优化策略
    Run1[React.memo]
    Run2[useMemo / useCallback]
    Run3[虚拟列表]
    Run4[并发特性]
    end

    UX -.-> Net1
    Runtime -.-> Comp1
    Runtime -.-> Run1
```

##### 性能优化决策树

```mermaid
flowchart TD
    A["性能问题诊断"] --> B{"问题类型?"}

    B -->|"首屏加载慢"| C["网络层优化"]
    C --> C1["路由懒加载"]
    C --> C2["组件 React.lazy"]
    C --> C3["资源压缩/CDN"]
    C --> C4["预加载关键资源"]

    B -->|"运行时卡顿"| D["渲染优化"]
    D --> D1{"列表渲染?"}
    D1 -->|"是"| D2["react-window 虚拟列表"]
    D1 -->|"否"| D3["React.memo 缓存组件"]
    D --> D4["useMemo 缓存计算"]
    D --> D5["useCallback 缓存函数"]

    B -->|"频繁重渲染"| E["状态优化"]
    E --> E1["拆分状态"]
    E --> E2["提升状态位置"]
    E --> E3["使用 Context 优化"]
    E --> E4["原子化状态 Jotai"]

    B -->|"交互响应慢"| F["并发优化"]
    F --> F1["startTransition"]
    F --> F2["useDeferredValue"]
    F --> F3["Suspense 边界"]
    F --> F4["流式 SSR"]
```

#### 🎯 渲染优化技巧

```jsx
// ❌ 问题 1：列表没有正确的 key
{items.map((item, index) => <li key={index}>{item.name}</li>)} // ❌

// ✅ 解决
{items.map((item) => <li key={item.id}>{item.name}</li>)} // ✅

// ❌ 问题 2：不必要的重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  return <ExpensiveChild onUpdate={() => {}} />; // ❌ 每次创建新函数
}

// ✅ 解决方案：React.memo + useCallback
const MemoChild = React.memo(ExpensiveChild);
function Parent() {
  const handleUpdate = useCallback(() => {}, []);
  return <MemoChild data="data" onUpdate={handleUpdate} />;
}

// ❌ 问题 3：在渲染时创建新对象
function Parent() {
  const style = { color: 'red' }; // ❌ 每次都创建新对象
  return <Child style={style} />;
}

// ✅ 解决：提取到常量
const CONST_STYLE = { color: 'red' };
```

#### 🚀 代码分割与懒加载

```jsx
// React.lazy + Suspense
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}

// 路由级别代码分割
const Admin = lazy(() => import('./pages/Admin'));
const routeConfig = [
  { path: '/admin', element: <Admin /> }
];
```

#### 🎯 React.memo 最佳实践

```jsx
const ExpensiveList = React.memo(function ExpensiveList({ items, onItemClick }) {
  return items.map(item => (
    <div key={item.id} onClick={() => onItemClick(item.id)}>{item.name}</div>
  ));
});
```

**useMemo / useCallback 合理使用：**

```jsx
// ✅ 需要：计算开销大
const sortedList = useMemo(() => items.sort((a, b) => a.name.localeCompare(b.name)), [items]);

// ✅ 需要：作为依赖传递给 useEffect/React.memo
const handleClick = useCallback((id) => dispatch({ type: 'SELECT', payload: id }), [dispatch]);

// ❌ 不需要：简单计算
const fullName = `${firstName} ${lastName}`;
```

#### 📋 虚拟列表

```jsx
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => <div style={style}>{items[index].name}</div>;

  return (
    <FixedSizeList height={400} itemCount={items.length} itemSize={50} width={300}>
      {Row}
    </FixedSizeList>
  );
}
```

#### 🔄 setState 流程（批量更新机制）

```mermaid
flowchart TD
    A["调用 setState"] --> B["enqueueSetState<br/>将新的 state 放入队列"]
    B --> C["enqueueUpdate"]
    C --> D{"isBatchingUpdates?"}
    D -->|true 批量模式| E["推入 dirtyComponents<br/>等待批量处理"]
    D -->|false| F["立即执行 batchedUpdates"]
    E --> G["合并多个 setState"]
    G --> H["执行 shouldComponentUpdate"]
    H --> I["重新渲染 Virtual DOM"]
    I --> J["Diff + Patch 更新真实 DOM"]
```

**setState 是同步还是异步？**

| 场景 | 是否批量 | 行为 |
|------|---------|------|
| React 生命周期 | ✅ 批量 | 异步合并 |
| 合成事件处理器 | ✅ 批量 | 异步合并 |
| 原生事件 | ❌ 非批量 | 同步更新 |
| setTimeout / Promise | ❌ 非批量（React 18 前） | 同步更新 |

> React 18 中，Promise、setTimeout、原生事件中也能自动批处理。

```jsx
// React 18 中以下代码只触发一次渲染（自动批处理）
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);
```

---

### 2️⃣ React 18 并发特性

#### ⚡ startTransition - 非紧急更新

```jsx
function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setSearchTerm(value); // 紧急更新
    startTransition(() => { // 非紧急更新
      setResults(performExpensiveSearch(value));
    });
  };

  return (
    <>
      <input value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <span>搜索中...</span>}
      <ul>{results.map(user => <li key={user.id}>{user.name}</li>)}</ul>
    </>
  );
}
```

#### 🎯 useDeferredValue - 延迟值

```jsx
function List({ searchTerm }: { searchTerm: string }) {
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredItems = useMemo(() => {
    return items.filter(item => item.name.includes(deferredSearchTerm));
  }, [deferredSearchTerm]);

  return <ul>{filteredItems.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}
```

#### 🎯 并发特性速览

| 特性 | 说明 |
|------|------|
| startTransition | 标记非紧急更新 |
| useDeferredValue | 延迟更新某个值 |
| Automatic Batching | Promise/setTimeout 中也能自动批处理 |
| Suspense SSR | 服务端流式渲染 + 选择性水合 |
| useId | SSR 场景下生成唯一 ID |
| useSyncExternalStore | 订阅外部存储，避免撕裂问题 |

#### 🔄 自动批处理（Automatic Batching）

批处理：多个状态更新 → 合并为一次渲染 → 减少 DOM 开销、提升性能。

##### React 17 及更早

只在 React 合成事件（如 onClick）里自动批处理；在 setTimeout、Promise、原生事件里，每次 setState 都会触发一次渲染。

##### React 18 全场景自动批处理

```jsx
// 1. 同步事件（本来就批）：React 17/18 都只渲染 1 次
const handleClick = () => {
  setCount(c => c + 1);
  setFlag(f => !f);
};

// 2. 异步场景（关键升级）：React 17 渲染 2 次，React 18 自动批，只渲染 1 次
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);

// 3. Promise / fetch：React 18 同样自动批
fetch("/api").then(() => {
  setLoading(false);
  setData({});
});

// 4. 原生事件监听：React 18 也会批处理
window.addEventListener("resize", () => {
  setW(window.innerWidth);
  setH(window.innerHeight);
});
```

##### 强制立即渲染（跳出批处理）

```jsx
import { flushSync } from "react-dom";

setTimeout(() => {
  flushSync(() => setCount(c => c + 1)); // 立即渲染
  setFlag(f => !f);                       // 这次仍会批
}, 1000);
```

##### 原理

React 18 新的并发渲染架构可以跨事件循环跟踪更新。同一"事件批次"内的所有 setState 会被收集，统一计算、一次提交。不阻塞主线程，可中断、可恢复。

##### 迁移要点

- 必须用 `createRoot`：旧的 `ReactDOM.render` 不会开启自动批处理
- 行为更一致：不用再记"哪里会批、哪里不会"
- 性能默认更好：异步代码渲染次数大幅减少
---

### 3️⃣ 图片和资源优化

```jsx
// 响应式图片
function ResponsiveImage() {
  return (
    <img
      srcSet="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
      sizes="(max-width: 600px) 480px, (max-width: 1024px) 800px, 1200px"
      src="large.jpg"
      alt="描述"
    />
  );
}

// 延迟加载（Intersection Observer）
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = src;
          setIsLoaded(true);
          observer.unobserve(img);
        }
      },
      { rootMargin: '50px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src]);

  return <img ref={imgRef} alt={alt} style={{ opacity: isLoaded ? 1 : 0.5 }} />;
}
```

---


### 🤖 React in AI Era：AI 时代 React 的核心优势

> AI 时代并不消灭 React，反而让 React 的声明式 UI 和组件化思维变得更加重要。

#### 为什么 AI 时代 React 更重要？

```
AI 生成代码的核心挑战：
  ├─ 如何保证生成代码的质量？
  ├─ 如何让生成代码可维护？
  └─ 如何让生成代码可预测？

React 的答案：
  ├─ 声明式 UI → 描述"要什么"，LLM 更容易理解和生成
  ├─ 纯函数组件 → 给定输入确定输出，AI 生成结果可测试
  ├─ 组件化 → 小单元生成，组合验证
  └─ TypeScript → AI 类型提示提升生成准确率
```

#### AI 辅助 React 开发的核心场景

| 场景 | 工具/方式 | 效率提升 |
|------|----------|---------|
| **组件生成** | Copilot / Cursor 根据描述生成组件 | 3-5x |
| **测试生成** | AI 自动生成单元测试 + 边界用例 | 5-10x |
| **样式编写** | Tailwind CSS + AI 提示 | 2-3x |
| **代码迁移** | Class → Hooks / Vue → React | 10x+ |
| **Bug 修复** | AI 分析错误栈 + 定位修复 | 3-5x |
| **性能分析** | AI 识别重渲染 + 建议优化 | 2x |
| **文档生成** | 组件 props 自动生成文档 | 5x |

#### React for AI：构建 AI 应用的最佳前端选择

```tsx
// AI Chat Stream 组件（React 天然适合流式 UI）
function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  async function sendMessage(text: string) {
    setIsStreaming(true);
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // 流式读取，React 的声明式更新完美适配
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.role === 'assistant'
          ? [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
          : [...prev, { role: 'assistant', content: chunk }];
      });
    }
    setIsStreaming(false);
  }

  return (
    <div>
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {isStreaming && <TypingIndicator />}
    </div>
  );
}
```

#### React Server Components 在 AI 时代的价值

```tsx
// Server Component：在服务器端调用 AI API，不暴露 API Key
// app/ai-insights/page.tsx
export default async function AIInsightsPage() {
  const insights = await callLLMApi('分析用户行为数据，给出建议');
  // 数据在服务器端渲染完成，直接返回 HTML
  return <InsightsView data={insights} />;
}

// Client Component：交互式 AI 对话
// app/ai-chat/page.tsx
'use client';
export default function AIChat() {
  // 客户端处理流式响应、用户交互
  return <ChatUI />;
}
```

**RSC 在 AI 时代的核心价值：**
1. **API Key 安全**：服务器端调用 AI API，不暴露密钥
2. **减少客户端 JS**：AI 处理结果在服务端渲染，客户端只需展示
3. **流式 SSR**：AI 生成内容可以边生成边推送
4. **资源优化**：大模型推理在服务端，客户端零负担

#### 总结：React in AI Era 的不可替代性

```
React 的核心优势在 AI 时代被放大：
  ├─ 声明式 UI → LLM 更容易理解和生成
  ├─ 组件化 → AI 生成的小单元可组合验证
  ├─ Server Components → 安全的 AI API 调用
  ├─ Streaming SSR → AI 流式输出原生支持
  ├─ 庞大的生态系统 → AI 工具链最完善
  └─ TypeScript 深度集成 → AI 类型感知，准确率提升 30%+
```

---

### 最佳实践总结

#### 🎯 React 开发黄金法则

```
1️⃣ 优先使用函数组件和 Hooks
   → 更简洁、更易测试、更好的代码复用

2️⃣ 合理拆分组件
   → 单一职责、易于维护和测试

3️⃣ 使用 TypeScript
   → 类型安全、IDE 智能提示、减少运行时错误

4️⃣ 为列表提供稳定的 key
   → 避免在 map 中使用索引

5️⃣ 避免在渲染时创建新对象
   → 提取到常量或使用 useMemo

6️⃣ 及时清理副作用
   → 在 useEffect 中返回清理函数

7️⃣ 使用受控组件处理表单
   → 更易验证、变换、条件提交

8️⃣ 分离关注点
   → 逻辑与 UI 分离，使用自定义 Hooks

9️⃣ 使用 React.memo 优化纯展示组件
   → 避免不必要的重渲染

🔟 充分利用 React DevTools
   → 分析性能瓶颈、调试组件状态
```

---

### 🛡️ ErrorBoundary 错误边界详解

> 💡 **要点**：ErrorBoundary 是 React 提供的错误捕获机制，可以防止组件崩溃导致整个页面白屏。

#### 捕获范围

| 能捕获 | 不能捕获 |
|--------|---------|
| 渲染期间子组件抛出的错误 | 事件处理中的错误 |
| 生命周期方法中的错误 | 异步代码中的错误（setTimeout/requestAnimationFrame） |
| 构造函数中的错误 | 服务端渲染错误 |
| 类组件中的错误 | ErrorBoundary 自身抛出的错误 |

#### 完整实现

```jsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 将错误上报到监控系统
    this.props.onError?.(error, errorInfo);
    // 可以在此处记录日志、上报 Sentry 等
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>页面出现异常</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 使用
<ErrorBoundary fallback={<ErrorUI />} onError={(e) => reportError(e)}>
  <MyComponent />
</ErrorBoundary>
```

---

### 🔄 useEffect 生命周期与执行顺序

#### useEffect vs useLayoutEffect

| 特性 | useEffect | useLayoutEffect |
|------|-----------|----------------|
| **执行时机** | 浏览器绘制**之后**（异步） | 浏览器绘制**之前**（同步） |
| **阻塞绘制** | 否 | 是 |
| **触发时机** | commit 后异步调度 | commit 后同步执行 |
| **适用场景** | 数据获取、事件绑定、日志 | DOM 测量、同步更新布局 |
| **SSR 警告** | 无 | 在 SSR 中会警告 |

#### 执行顺序

```mermaid
graph TD
    A["组件渲染"] --> B["React commit"]
    B --> C["useLayoutEffect 同步执行"]
    C --> D["浏览器绘制"]
    D --> E["useEffect 异步执行"]
    B --> F["清理上一轮 effect"]
    F --> C
```

```jsx
function Parent() {
  useEffect(() => {
    console.log('1: Parent useEffect');
    return () => console.log('1-1: Parent cleanup');
  });
  useLayoutEffect(() => {
    console.log('0: Parent useLayoutEffect');
    return () => console.log('0-1: Parent layout cleanup');
  });
  return <Child />;
}

function Child() {
  useEffect(() => {
    console.log('3: Child useEffect');
    return () => console.log('3-1: Child cleanup');
  });
  useLayoutEffect(() => {
    console.log('2: Child useLayoutEffect');
    return () => console.log('2-1: Child layout cleanup');
  });
  return <div>Child</div>;
}

// 首次渲染输出顺序:
// 0: Parent useLayoutEffect → 2: Child useLayoutEffect
// → (浏览器绘制)
// → 1: Parent useEffect → 3: Child useEffect
//
// 卸载时清理顺序:
// 3-1: Child cleanup → 1-1: Parent cleanup
// 0-1: Parent layout cleanup → 2-1: Child layout cleanup
```

---

### 📦 React 不可变数据

> 💡 **要点**：React 通过引用比较判断状态是否变化，直接修改对象/数组不会触发重新渲染。

```jsx
// ❌ 错误：直接修改状态
const [user, setUser] = useState({ name: 'Alice', age: 25 });
user.age = 26;      // 直接修改原对象
setUser(user);      // 引用不变，React 不会重新渲染

// ✅ 正确：创建新对象
setUser({ ...user, age: 26 });

// ✅ 函数式更新（依赖前一次状态时）
setUser(prev => ({ ...prev, age: prev.age + 1 }));
```

#### 数组不可变更新

| 操作 | 变异方法（❌） | 不可变方法（✅） |
|------|-------------|----------------|
| **添加** | `arr.push(item)` | `[...arr, item]` |
| **删除** | `arr.splice(i, 1)` | `arr.filter((_, idx) => idx !== i)` |
| **替换** | `arr[i] = newVal` | `arr.map((v, idx) => idx === i ? newVal : v)` |
| **排序** | `arr.sort()` | `[...arr].sort()` |
| **反转** | `arr.reverse()` | `[...arr].reverse()` |

#### 深层嵌套更新

```jsx
const [state, setState] = useState({
  user: {
    profile: {
      address: { city: 'Beijing', street: 'Main St' }
    }
  }
});

// 更新深层属性
setState(prev => ({
  ...prev,
  user: {
    ...prev.user,
    profile: {
      ...prev.user.profile,
      address: {
        ...prev.user.profile.address,
        city: 'Shanghai'
      }
    }
  }
}));

// 简化方案：使用 Immer
import { produce } from 'immer';

setState(produce(draft => {
  draft.user.profile.address.city = 'Shanghai';
}));
```

#### 不可变数据的好处

1. **简化调试**：状态变更可追踪，每次修改产生新引用
2. **性能优化**：`React.memo` / `useMemo` 通过引用比较快速判断变化
3. **时间旅行**：Redux DevTools 可以回溯到任何历史状态
4. **可预测性**：纯函数保证相同输入 → 相同输出



---


### 🔬 React 面试重难点深度解析

> 以下内容针对技术面试中的高频难点，涵盖底层原理、易错陷阱和高频追问点。

---

### 🧬 虚拟 DOM 原理深度讲解

#### 虚拟 DOM 的本质

虚拟 DOM 本质上就是一个**普通的 JavaScript 对象树**，是真实 DOM 的轻量级抽象表示。

```jsx
// 虚拟 DOM 节点（React Element）的核心数据结构
interface ReactElement {
  $$typeof: Symbol;          // 标记为 React 元素（防 XSS）
  type: string | Function;   // 'div' / 'span' / 组件函数
  key: string | null;        // Diff 优化标识
  ref: Ref | null;           // DOM 引用
  props: {
    children?: ReactElement | ReactElement[];
    [propName: string]: any;
  };
  _owner: Fiber | null;      // 创建该元素的 Fiber 节点
}
```

```jsx
// 一个 JSX 表达式编译后的虚拟 DOM
// <div className="container"><h1>Hello</h1></div>

// JSX 编译后（React 17 及以前）：
React.createElement(
  'div',
  { className: 'container' },
  React.createElement('h1', null, 'Hello')
)

// JSX 编译后（React 17+ 新 JSX 转换，自动导入 jsx）：
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
_jsxs('div', { className: 'container', children: [
  _jsx('h1', { children: 'Hello' })
]})

// 生成的虚拟 DOM 对象：
{
  $$typeof: Symbol.for('react.element'),
  type: 'div',
  key: null,
  ref: null,
  props: {
    className: 'container',
    children: [{
      $$typeof: Symbol.for('react.element'),
      type: 'h1',
      key: null,
      ref: null,
      props: { children: 'Hello' },
    }]
  }
}
```

**与真实 DOM 的关键区别：**

| 维度 | 真实 DOM | 虚拟 DOM |
|------|---------|----------|
| **数据结构** | 浏览器 C++ 对象，属性极多（>200 个） | 普通 JS 对象，仅 5-6 个属性 |
| **创建开销** | 高（需解析 HTML/CSS，构建渲染树） | 极低（new Object） |
| **修改开销** | 触发重排/重绘、样式计算、合成 | 无（纯 JS 对象比较） |
| **读写速度** | 慢（跨引擎边界） | 快（全 JS 堆内存） |
| **内存占用** | 大 | 小（仅保留渲染所需字段） |

---

####  JSX 到虚拟 DOM 的编译链路

JSX 不是模板引擎，而是**语法糖**，编译后直接变成 `React.createElement()` 调用。

```mermaid
graph LR
    A["JSX<br/>&lt;div class='box'&gt;Hi&lt;/div&gt;"] --> B["Babel/TypeScript<br/>编译"]
    B --> C["React.createElement('div',<br/>{className:'box'}, 'Hi')"]
    C --> D["虚拟 DOM 对象<br/>{type:'div', props:{...}}"]
    D --> E["Fiber 节点<br/>{tag, memoizedState, ...}"]
    E --> F["真实 DOM<br/>document.createElement('div')"]
```

**编译产出对比（React 17 vs 19）：**

```jsx
// JSX 源码
function Greeting({ name }: { name: string }) {
  return <div className="greeting">Hello, {name}</div>;
}

// React 17 编译结果（需要 React 在作用域内）
import React from 'react';
function Greeting({ name }) {
  return React.createElement('div', { className: 'greeting' }, 'Hello, ', name);
}

// React 17+ / 19 编译结果（自动导入，无需手动 import React）
import { jsx as _jsx } from 'react/jsx-runtime';
function Greeting({ name }) {
  return _jsx('div', { className: 'greeting', children: ['Hello, ', name] });
}
```

**为什么改用了 `jsx()` 函数？** 新函数做了两点优化：
1. **自动导入**：无需每个文件手动 `import React`，Tree Shaking 友好
2. **简化参数**：`jsx()` 比 `createElement()` 少了 `key`/`ref` 等参数处理，减少编译体积

---

#### 虚拟 DOM 的全生命周期

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant VDOM as 虚拟 DOM
    participant Reconciler as Fiber Reconciler
    participant DOM as 真实 DOM

    Note over Dev,DOM: 初次渲染
    Dev->>VDOM: render() / JSX
    VDOM->>Reconciler: 创建 Fiber 树
    Reconciler->>DOM: 递归挂载到容器
    DOM-->>Dev: 页面展示

    Note over Dev,DOM: 更新渲染
    Dev->>VDOM: setState / dispatch
    VDOM->>Reconciler: 创建新虚拟 DOM 树
    Reconciler->>Reconciler: Diff 新旧 Fiber 树
    Reconciler->>Reconciler: 收集副作用（effect list）
    Reconciler->>DOM: 批量提交 DOM 更新
    DOM-->>Dev: 页面更新

    Note over Dev,DOM: 卸载
    Dev->>Reconciler: 组件 unmount
    Reconciler->>DOM: 移除 DOM 节点
    Reconciler->>Reconciler: 执行清理工作
```

**三个阶段详细说明：**

| 阶段 | 名称 | 做什么 | 是否可中断 | 产生什么 |
|------|------|--------|-----------|---------|
| **Render** | 协调（Reconciliation） | 创建虚拟 DOM，Diff 比较，标记变更 | ✅ 可中断（Fiber 时间切片） | Fiber 树的副作⽤标记 |
| **Commit** | 提交 | 根据副作⽤标记操作真实 DOM | ❌ 不可中断（同步执行） | DOM 变更 |
| **Cleanup** | 清理 | 执⾏ useEffect 清理函数 | ❌ 同步 | 副作⽤清理 |

---

#### 虚拟 DOM 为什么能提升性能

**❌ 常见误解："虚拟 DOM 比真实 DOM 快"**

虚拟 DOM **不一定比直接操作 DOM 快**。它的核⼼价值是：
- 提供**声明式编程模型**（描述 UI 状态，而非操作步骤）
- 在**没有手动优化**的情况下性能不太差（性能保底）
- **批量处理** DOM 变更，减少重排/重绘次数

```jsx
// 场景：连续修改 100 次列表
for (let i = 0; i < 100; i++) {
  list.appendChild(newItem);  // 直接操作 DOM → 100 次重排
}

// React 虚拟 DOM 的做法：
// 1. 100 次 setState 合并为一次更新
// 2. Diff 计算出最小变更集
// 3. 一次批量更新 DOM → 1 次重排
```

**性能对比的真实情况：**

| 场景 | 直接 DOM 操作 | 虚拟 DOM |
|------|-------------|---------|
| 单次简单更新（改文本） | ✅ 最快 | ❌ 有额外比较开销 |
| 复杂树结构差异更新 | ❌ 难优化 | ✅ Diff 自动计算最小变更 |
| 频繁批量更新 | ❌ 多次重排 | ✅ 批量合并，一次重排 |
| 跨平台渲染 | ❌ 仅浏览器 | ✅ 可输出到 Native/Canvas/PDF |

**真实性能瓶颈在哪？** 虚拟 DOM 的**比较（Diff）本身也有开销**。这就是 React Compiler（React Forget）的⽬标——跳过不必要的比较，直接在编译时优化。

---

#### 虚拟 DOM 到 Fiber 的映射

React 16+ 中，虚拟 DOM 并不直接参与 Diff，而是先转换成 **Fiber 节点**，再在 Fiber 树上进行 Diff：

```jsx
// 虚拟 DOM 与 Fiber 节点的映射关系
interface Fiber {
  tag: WorkTag;              // 节点类型（FunctionComponent = 0, HostComponent = 5, ...）
  type: string | Function;   // 与虚拟 DOM 的 type 一致
  key: string | null;        // 与虚拟 DOM 的 key 一致
  pendingProps: any;         // 新的 props（来自虚拟 DOM）
  memoizedProps: any;        // 旧的 props
  memoizedState: any;        // 组件状态（Hook 链表头）

  // Fiber 树结构（单向链表）
  return: Fiber | null;      // 父节点
  child: Fiber | null;       // 第一个子节点
  sibling: Fiber | null;     // 下一个兄弟节点

  // 副作⽤标记
  flags: Flags;              // Placement / Update / Deletion / Passive
  subtreeFlags: Flags;       // 子树副作⽤标记（React 18 优化）
  deletions: Fiber[] | null; // 待删除的子节点

  // 双缓冲
  alternate: Fiber | null;   // current ↔ workInProgress 互指
}
```

**虚拟 DOM → Fiber 的转换流程：**

```mermaid
flowchart LR
    subgraph VDOM["虚拟 DOM 树（React Element）"]
        A1["div<br/>props:{...}"] --> B1["h1<br/>props:{...}"]
        A1 --> B2["p<br/>props:{...}"]
        B2 --> C1["span<br/>props:{...}"]
    end

    subgraph Fiber["Fiber 树"]
        direction LR
        A2["Fiber(div)<br/>child↓"] --> B3["Fiber(h1)<br/>sibling→"]
        B3 --> B4["Fiber(p)<br/>child↓"]
        B4 --> C2["Fiber(span)<br/>↑return"]
    end

    A1 -->|beginWork| A2
    B1 -->|beginWork| B3
    B2 -->|beginWork| B4
    C1 -->|beginWork| C2
```

**为什么需要 Fiber 这一层？** 虚拟 DOM 树是普通树结构（只能用递归遍历），Fiber 将其转为**链表结构**（可用循环遍历），使得遍历过程可中断/恢复——这是并发模式的基础。

---

##### 6. 批量更新机制

React 不会每次 setState 都立即更新，而是批量收集后一次提交：

```mermaid
sequenceDiagram
    participant C as 组件
    participant S as 调度器
    participant Q as 更新队列
    participant R as 渲染器

    C->>S: setState(1)
    C->>S: setState(2)
    C->>S: setState(3)
    S->>Q: 合并更新：3 次 → 1 次
    Q->>R: 执行一次渲染
    R-->>C: 更新完成
```

```jsx
// React 18+ 自动批量更新
function handleClick() {
  setCount(c => c + 1);   // 不会立即渲染
  setFlag(f => !f);       // 不会立即渲染
  setText('hello');       // 不会立即渲染
  // 三次 setState 合并为一次渲染
}

// 如果需要"非批量"（React 18 需要 flushSync）
import { flushSync } from 'react-dom';
function handleClick() {
  flushSync(() => setCount(c => c + 1));  // 立即渲染
  flushSync(() => setFlag(f => !f));      // 第二次渲染
}
```

**批量更新的演进：**

| 版本 | 机制 | 范围 |
|------|------|------|
| **React 15** | 事务机制（Transaction） | 仅合成事件内 |
| **React 16-17** | 批量更新 + unstable_batchedUpdates | 合成事件 + 生命周期 |
| **React 18+** | 自动批量更新（无需手动） | 所有场景（Promise、setTimeout 等） |

---

##### 7. key 的精准含义

key 不是"索引"，而是**稳定标识符**，帮 Diff 算法判断元素是"移动"还是"新建"：

```jsx
// ❌ 用索引作 key（列表顺序会变时）
{items.map((item, index) => <Item key={index} data={item} />)}

// ✅ 用唯一 ID 作 key
{items.map(item => <Item key={item.id} data={item} />)}
```

**key 不同导致的 Diff 行为差异：**

```mermaid
flowchart TD
    subgraph NoKey["无 key / 索引作 key"]
        A["旧: [A, B, C]<br/>新: [C, A, B]"]
        A --> A1["比较索引0: A≠C → 销毁 A 创建 C"]
        A1 --> A2["比较索引1: B≠A → 销毁 B 创建 A"]
        A2 --> A3["比较索引2: C≠B → 销毁 C 创建 B"]
        A3 --> A4["结果: 3 次销毁 + 3 次创建"]
    end

    subgraph WithKey["有 key（正确做法）"]
        B["旧: {a→A, b→B, c→C}<br/>新: {c→C, a→A, b→B}"]
        B --> B1["key=c: C 复用，位置从 3→1"]
        B1 --> B2["key=a: A 复用，位置从 1→2"]
        B2 --> B3["key=b: B 复用，位置从 2→3"]
        B3 --> B4["结果: 0 次销毁/创建，3 次移动"]
    end
```

**没有 key 时的表现：** 新旧列表按索引逐个比较，索引 0 → 索引 0，索引 1 → 索引 1。一旦结构变化（头部插入或排序），所有元素都匹配不上，触发全量重建。

---

##### 8. 虚拟 DOM 的演进与 React 19

| 版本 | 虚拟 DOM 的角色 | 关键技术 |
|------|----------------|---------|
| **React 15** | Stack 递归遍历虚拟 DOM 树，同步、不可中断 | `createElement` + `diff` + `patch` |
| **React 16+** | 虚拟 DOM 作为 Fiber 的"输入"，Diff 在 Fiber 树上执⾏ | Fiber 链表 + 双缓冲 + 时间切片 |
| **React 18** | 并发渲染下虚拟 DOM 可多次创建（丢弃低优先级） | Lane 优先级 + Suspense |
| **React 19** | React Compiler 在编译时跳过虚拟 DOM 的比较 | 编译时优化 + useMemo 自动注入 |

**React Compiler 对虚拟 DOM 的影响：** Compiler 不再是"每次渲染都创建新虚拟 DOM → Diff"，而是**在编译时分析组件依赖**，跳过未变化组件的重新渲染，直接从源头减少虚拟 DOM 创建次数。但虚拟 DOM 作为**核心抽象层**仍然存在（处理跨平台、手写优化等场景）。

---

---

### 📌 Portals（createPortal）深度解析

#### 基本概念

`createPortal` 允许你将组件渲染到**父组件 DOM 树之外**的 DOM 节点中，但组件的**React 树层级关系不变**（事件冒泡、Context 仍按 React 树传递）。

```jsx
import { createPortal } from 'react-dom';

function Modal({ children, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
        <button onClick={onClose}>关闭</button>
      </div>
    </div>,
    document.body  // 挂载到 body 上
  );
}
```

#### 典型使用场景

```jsx
// 场景 1：Modal 弹窗（脱离父容器 overflow:hidden 的限制）
function App() {
  const [show, setShow] = useState(false);
  return (
    <div style={{ overflow: 'hidden' }}>
      <button onClick={() => setShow(true)}>打开弹窗</button>
      {show && (
        <Modal onClose={() => setShow(false)}>
          <p>弹窗内容</p>
        </Modal>
      )}
    </div>
  );
}

// 场景 2：Tooltip / Dropdown（避免被父容器裁剪）
function Tooltip({ children, text }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return (
    <>
      <span
        onMouseEnter={(e) => setPosition({ top: e.clientY + 10, left: e.clientX })}
        onMouseLeave={() => setPosition({ top: 0, left: 0 })}
      >
        {children}
      </span>
      {position.top !== 0 && createPortal(
        <div style={{ position: 'fixed', top: position.top, left: position.left }}>
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

// 场景 3：Loading 覆盖层（全局遮罩）
function LoadingOverlay() {
  return createPortal(
    <div className="loading-mask">
      <Spinner />
    </div>,
    document.getElementById('loading-root')
  );
}
```

#### ⚠️ 事件冒泡穿透问题（面试高频追问）

```jsx
function Parent() {
  const handleClick = () => console.log('Parent clicked');

  return (
    <div onClick={handleClick}>
      <button>按钮</button>
      {createPortal(
        <button onClick={() => console.log('Portal clicked')}>Portal 按钮</button>,
        document.body
      )}
    </div>
  );
}
// 点击 Portal 按钮 → 控制台输出：
// "Portal clicked" ✅
// "Parent clicked" ✅ 事件沿 React 树冒泡到 Parent
```

**关键规则：**

| 行为 | 说明 |
|------|------|
| 事件冒泡 | Portal 内的事件**沿 React 树冒泡**，不是 DOM 树 |
| Context 传递 | Portal 组件**可以访问**父组件的 Context |
| DOM 层级 | Portal 挂载到指定 DOM 节点，脱离父组件 DOM 树 |
| 阻止冒泡 | `e.stopPropagation()` 只阻止 React 树冒泡，不阻止 DOM 树冒泡 |

```jsx
// 阻止冒泡的正确方式
function Modal({ onClose }) {
  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation();  // 阻止 React 树冒泡到父组件
        onClose();
      }}
    >
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        内容
      </div>
    </div>,
    document.body
  );
}
```

#### createPortal vs ReactDOM.render

| 维度 | createPortal | ReactDOM.render（已废弃） |
|------|-------------|------------------------|
| React 树关系 | 保持父子关系 | 创建新的 React 树 |
| 事件冒泡 | 沿 React 树冒泡 | 独立事件系统 |
| Context | 共享父组件 Context | 独立 Context 树 |
| 卸载 | 随父组件卸载 | 需手动卸载 |

---

### 🏗️ Fiber 架构深度解析

#### Lane 优先级模型

React 18 引入 **Lane** 模型替代之前的 `ExpirationTime`，提供更精细的优先级控制。

```jsx
// 简化的 Lane 定义（源码 lanes.js）
type Lane = number;
type Lanes = number;

// 优先级从高到低
const SyncLane           = 0b0000000000000000000000000000001;  // 同步（紧急更新）
const InputContinuousLane = 0b0000000000000000000000000000100; // 连续输入（拖拽）
const DefaultLane        = 0b0000000000000000000000000010000;  // 默认（普通更新）
const TransitionLane1    = 0b0000000000000000000000001000000;  // 过渡（startTransition）
const IdleLane           = 0b0100000000000000000000000000000;  // 空闲
```

**Lane 的位运算优势：**
```jsx
// 1. 快速判断是否包含某个 Lane
const includes = (lanes: Lanes, lane: Lane) => (lanes & lane) !== 0;

// 2. 快速合并 Lane
const mergeLanes = (a: Lanes, b: Lanes) => a | b;

// 3. 快速移除 Lane
const removeLane = (lanes: Lanes, lane: Lane) => lanes & ~lane;
```

**不同更新来源对应的 Lane：**

| 更新来源 | Lane | 优先级 |
|---------|------|--------|
| `flushSync` / `ReactDOM.flushSync` | SyncLane | 最高 |
| 用户输入（click/keydown） | InputContinuousLane | 高 |
| `useState` 普通更新 | DefaultLane | 中 |
| `startTransition` | TransitionLane | 低 |
| `requestIdleCallback` 回调 | IdleLane | 最低 |

#### Scheduler 调度器原理

React 的 Scheduler 是一个**独立于 React 的通用任务调度库**，核心机制是 **MessageChannel + 时间切片**。

```jsx
// Scheduler 核心逻辑（简化）
let scheduledHostCallback = null;
let channel = new MessageChannel();
let port = channel.port2;

channel.port1.onmessage = performWorkUntilDeadline;

function performWorkUntilDeadline() {
  if (scheduledHostCallback) {
    const hasMoreWork = scheduledHostCallback();
    if (hasMoreWork) {
      port.postMessage(null);  // 有更多工作，继续调度
    }
  }
}

// 时间切片：每个切片最多 5ms
function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  port.postMessage(null);  // 在下一个宏任务中执行
}

// shouldYieldToHost：判断是否需要让出主线程
function shouldYieldToHost() {
  const timeElapsed = performance.now() - startTime;
  return timeElapsed > 5;  // 超过 5ms 就让出
}
```

**为什么用 MessageChannel 而不是 requestIdleCallback？**
- `requestIdleCallback` 在高频事件中可能被浏览器节流
- `requestIdleCallback` 的回调时机不可控（浏览器空闲时才调用）
- `MessageChannel` 保证在宏任务中执行，时机更可预测

#### 双缓冲机制（Double Buffering）

```mermaid
flowchart TD
    subgraph 双缓冲树
        A["current 树<br/>(屏幕上显示的 UI)"] -->|Render 阶段| B["workInProgress 树<br/>(内存中构建的新树)"]
        B -->|Commit 阶段| C["替换 current 指针"]
        C --> A
    end

    subgraph Fiber 节点结构
        D["stateNode"] --> E["type / tag"]
        E --> F["child / sibling / return"]
        F --> G["memoizedState / memoizedProps"]
        G --> H["effectTag / lanes"]
        H --> I["alternate (双向关联)"]
    end

    A -.->|alternate| B
```

**双缓冲的作用：**
- `current` 树：当前屏幕显示的 UI，**始终完整可读**
- `workInProgress` 树：在内存中构建，构建过程中可以**安全中断**
- Commit 阶段一次性替换：`current = workInProgress`，用户无感知

#### Fiber 节点关键字段

```jsx
interface Fiber {
  // 身份信息
  tag: WorkTag;           // 函数组件/类组件/HostComponent 等
  key: string | null;     // 用于 diff 的 key
  type: any;              // 函数/类/原生标签名
  stateNode: any;         // 对应的真实 DOM 节点

  // 树结构
  return: Fiber | null;   // 父 Fiber
  child: Fiber | null;    // 第一个子 Fiber
  sibling: Fiber | null;  // 右边兄弟 Fiber

  // 状态
  memoizedProps: any;     // 上次渲染的 props
  memoizedState: any;     // 上次渲染的 state（Hook 链表头）
  pendingProps: any;      // 新 props
  updateQueue: any;       // 更新队列

  // 副作用
  effectTag: EffectTag;   // Placement / Update / Deletion
  firstEffect: Fiber | null;  // 第一个有副作用的子 Fiber
  lastEffect: Fiber | null;   // 最后一个有副作用的子 Fiber

  // 调度
  lanes: Lanes;           // 优先级
  childLanes: Lanes;      // 子树的优先级

  // 双缓冲
  alternate: Fiber | null; // 对应的 current/workInProgress 节点
}
```

> 🔗 **链式思考**：React Fiber 的核心设计是"可中断渲染"，通过链表结构 + 优先级调度实现。这解决了 React 的"运行时不知道什么变了"的固有问题——既然需要全量 Diff，那至少让 Diff 可以被中断。Vue 3 不需要 Fiber，因为 Proxy 精确知道什么变了，Diff 范围极小，通常 1ms 内完成。Angular 22 的 Zoneless + Signals 同样不需要全量检测——Signal 变化只会更新依赖它的视图。三种架构本质是"精确追踪 vs 全量 Diff + 可中断"的不同选择。详见 [框架对比](../框架对比/) 的"响应式原理深度对比"。

#### ⚠️ 面试高频追问

**Q: Fiber 为什么选择链表而不是树？**
> 链表可以随时暂停/恢复遍历（只需保存当前节点指针），而递归树需要栈帧，无法中断。

**Q: SyncLane 和 DefaultLane 的区别？**
> SyncLane 用于 `flushSync` 和事件处理，是同步不可中断的；DefaultLane 用于普通 `setState`，可以被高优先级任务打断。

**Q: 为什么 Scheduler 用 5ms 作为时间切片？**
> 5ms 是经验值，既能让 React 有足够时间处理工作单元，又不会阻塞浏览器的 16ms 帧预算（60fps）。

---
> 🎯 **面试星级**：★★★★★ | 本章深入 React 源码，适合中高级面试

### 🏗️ Fiber 架构源码分析

#### 🔄 Fiber 节点结构

```jsx
// packages/react-reconciler/src/ReactFiber.ts
interface Fiber {
  // 1. 节点类型
  tag: WorkTag;           // 组件类型（FunctionComponent、ClassComponent 等）
  type: any;              // 组件函数/类
  key: string | null;     // key 属性

  // 2. 树结构
  return: Fiber | null;   // 父节点
  child: Fiber | null;    // 第一个子节点
  sibling: Fiber | null;  // 下一个兄弟节点
  index: number;          // 子节点索引

  // 3. 状态
  pendingProps: any;       // 新 props
  memoizedProps: any;      // 上次渲染的 props
  memoizedState: any;      // 上次渲染的 state
  updateQueue: UpdateQueue | null;  // 更新队列

  // 4. 副作用
  flags: Flags;           // 副作用标记（Placement、Update、Deletion）
  subtreeFlags: Flags;    // 子树的副作用标记
  deletions: Fiber[] | null;  // 需要删除的子节点

  // 5. 调度优先级
  lanes: Lanes;           // 优先级 lanes
  childLanes: Lanes;      // 子节点优先级

  // 6. 替换（双缓冲）
  alternate: Fiber | null;  // 替换 fiber（workInProgress ↔ current）
}
```

#### 📍 Fiber 双缓冲机制

```jsx
// packages/react-reconciler/src/ReactFiber.ts
// 双缓冲：同时维护两棵 Fiber 树
// current: 屏幕上显示的树
// workInProgress: 正在内存中构建的树

function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;

  if (workInProgress === null) {
    // 首次渲染，创建新的 fiber
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 复用 alternate
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }

  // 复制状态
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.lanes = current.lanes;

  return workInProgress;
}

// 提交阶段：交换 current 和 workInProgress
function commitRoot(root: FiberRoot) {
  // 1. 执行所有副作用
  commitMutationEffects(root, finishedWork);

  // 2. 切换 current 指针
  root.current = finishedWork;

  // 3. 触发 useEffect
  commitPassiveMountEffects(root);
}
```

#### 📍 Fiber 调度器（Scheduler）

```jsx
// packages/scheduler/src/forks/Scheduler.js
// 基于 MessageChannel 的微任务调度

let scheduleCallback = function(callback) {
  const channel = new MessageChannel();
  const port = channel.port2;

  channel.port1.onmessage = function() {
    callback();
  };

  port.postMessage(null);
};

// 优先级管理
const ImmediatePriority = 1;    // 立即执行
const UserBlockingPriority = 2; // 用户阻塞（如点击）
const NormalPriority = 3;       // 普通（如数据更新）
const LowPriority = 4;          // 低优先级（如分析）
const IdlePriority = 5;         // 空闲时执行

// 调度流程
function scheduleRootUpdate(root, update, lane) {
  // 1. 创建更新对象
  const update = createUpdate(lane);

  // 2. 加入更新队列
  enqueueUpdate(root.current, update);

  // 3. 调度渲染
  scheduleConcurrentWork(root, lane);
}

// 可中断渲染
function performConcurrentWorkOnRoot(root, lanes) {
  // 1. 检查是否有更高优先级的任务
  if (hasHigherPriorityWork(root)) {
    // 中断当前渲染
    return performConcurrentWorkOnRoot.bind(null, root, lanes);
  }

  // 2. 渲染组件
  renderRootSync(root, lanes);

  // 3. 提交更新
  commitRoot(root);
}
```
---

#### 📍 workLoop 核心循环 —— Fiber 如何"边干边让"

Fiber 的核心是一个 `while` 循环，每次检查时间是否用完，用完了就让出主线程：

```jsx
// packages/react-reconciler/src/ReactFiberWorkLoop.ts

// 同步渲染：不可中断
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// 并发渲染：时间切片可中断
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
  // 如果 workInProgress !== null，说明被中断了
  // Scheduler 会在下一个宏任务中恢复
}

// 判断是否让出主线程（每 5ms 检查一次）
function shouldYield(): boolean {
  const timeElapsed = performance.now() - startTime;
  return timeElapsed > 5; // 5ms 时间片
}
```

**中断恢复流程：**

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant W as workLoop
    participant B as beginWork
    participant C as completeWork
    participant D as DOM

    S->>W: scheduleCallback(workLoop)
    W->>W: workInProgress = fiberRoot
    Note over W: 5ms 时间片开始
    W->>B: performUnitOfWork
    B->>B: 处理当前节点<br/>(diff / 创建子Fiber)
    B->>W: 返回 child Fiber
    W->>W: shouldYield? 时间＞5ms?
    Note over W: 时间到！让出主线程
    W->>S: postMessage(恢复)
    Note over S: 等待下一个宏任务
    S->>W: 恢复执行
    W->>B: 从断点继续
    B->>C: 子节点处理完毕 → completeWork
    C->>C: 收集副作用<br/>(effect list / flags)
    C->>W: 返回 sibling / return
    W->>W: shouldYield?
    Note over W: 全部完成
    W->>D: commitRoot(批量提交 DOM)
```

---

#### 📍 beginWork / completeWork —— Fiber 的"递"与"归"

Fiber 遍历是**先序深度优先遍历**，分为两个阶段：

```mermaid
flowchart TB
    subgraph beginWork["beginWork（递）"]
        direction TB
        A["进入 Fiber 节点"] --> B{"检查能否复用<br/>bailout?"}
        B -->|能| C["clone child Fiber<br/>跳过整棵子树"]
        B -->|不能| D["执行函数组件 / 类组件 render"]
        D --> E["reconcileChildren<br/>diff 创建子 Fiber"]
        E --> F["返回 child → 继续深入"]
        C --> F
    end

    subgraph completeWork["completeWork（归）"]
        direction TB
        G["子节点处理完毕或为 null"] --> H["completeUnitOfWork<br/>执行 completeWork"]
        H --> I{"当前节点是<br/>原生 DOM 节点?"}
        I -->|是| J["创建/更新 DOM 实例<br/>设置文本内容<br/>处理 props"]
        I -->|否| K["仅更新 flags 标记"]
        J --> L["收集节点 flags 到父节点"]
        K --> L
        L --> M{"有 sibling?"}
        M -->|是| N["返回 sibling<br/>→ 回到 beginWork"]
        M -->|否| O["返回 return（父节点）<br/>继续 completeWork"]
        O --> P["所有节点完成 → commitRoot"]
    end

    F -->|"递归深入"| G
    N -->|"转向兄弟"| A
```

```jsx
// 核心遍历函数
function performUnitOfWork(unitOfWork: Fiber): void {
  const current = unitOfWork.alternate;
  let next: Fiber | null;

  // ① beginWork（递）：处理当前节点，返回子节点
  next = beginWork(current, unitOfWork, renderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next !== null) {
    // 有子节点 → 继续深入（深度优先）
    workInProgress = next;
  } else {
    // ② completeWork（归）：没有子节点，开始回溯
    completeUnitOfWork(unitOfWork);
  }
}

// 回溯函数
function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;

    // ① 执行 completeWork：创建 DOM / 收集 flags
    next = completeWork(current, completedWork, renderLanes);

    // ② 收集子节点的 flags 到当前节点
    if (returnFiber !== null) {
      // flags 冒泡：子节点的变化向上传递
      returnFiber.flags |= completedWork.flags;
    }

    // ③ 转向兄弟节点
    if (completedWork.sibling !== null) {
      workInProgress = completedWork.sibling;
      return; // 回到 performUnitOfWork 的 beginWork
    }

    // ④ 没有兄弟 → 回到父节点继续 completeWork
    completedWork = returnFiber;
  } while (completedWork !== null); // 全部完成
}
```

**核心洞察：** `beginWork` 是"向下递"，负责创建子 Fiber（调用组件 render、执行 diff）；`completeWork` 是"向上归"，负责创建 DOM 实例、更新 props、将副作用冒泡到父节点。这个"递→归→递→归"的模式让遍历过程可以**在任意节点暂停**（只需记住当前 `workInProgress` 指针）。

---

#### 📍 完整更新链路 —— 从 setState 到 DOM 变更

```mermaid
sequenceDiagram
    participant C as 组件
    participant U as updateQueue
    participant R as 调度器
    participant W as workLoop
    participant F as Fiber 树
    participant D as DOM

    C->>U: setState(n => n + 1)
    U->>U: createUpdate(lane)
    U->>U: enqueueUpdate(fiber, update)
    U->>R: scheduleUpdateOnFiber(fiber, lane)

    R->>R: markRootUpdated(root, lane)
    R->>R: ensureRootIsScheduled(root)

    Note over R: 判断优先级
    alt 同步更新（click 事件内）
        R->>W: performSyncWorkOnRoot
        W->>W: workLoopSync（不可中断）
    else 并发更新（startTransition）
        R->>W: performConcurrentWorkOnRoot
        W->>W: workLoopConcurrent（可中断）
    end

    W->>F: performUnitOfWork
    F->>F: beginWork（递）
    F->>F: reconcileChildren（Diff）
    F->>F: completeWork（归 / 收集 flags）

    W->>W: 全部完成 → finishConcurrentRender

    W->>D: commitRoot
    D->>D: commitBeforeMutationEffects（getSnapshotBeforeUpdate）
    D->>D: commitMutationEffects（DOM 操作：增/删/改）
    D->>D: 切换 current 指针
    D->>D: commitLayoutEffects（useLayoutEffect / componentDidMount/Update）
    D-->>C: 更新完成

    Note over C,D: 浏览器绘制后
    D->>D: flushPassiveEffects（useEffect 回调）
```

```jsx
// 更新入口 → 调度关键路径
function scheduleUpdateOnFiber(fiber: Fiber, lane: Lane): void {
  // 1. 找到 FiberRoot
  const root = markUpdateLaneFromFiberToRoot(fiber, lane);

  // 2. 标记 root 有更新
  markRootUpdated(root, lane);

  // 3. 确保 root 被调度
  ensureRootIsScheduled(root);
}

// 从任意 Fiber 回溯到 FiberRoot
function markUpdateLaneFromFiberToRoot(fiber: Fiber, lane: Lane): FiberRoot {
  let node = fiber;
  let parent = fiber.return;

  // 沿 return 链向上回溯到根
  while (parent !== null) {
    node = parent;
    parent = parent.return;
  }

  // node 现在是 RootFiber（最顶层 Fiber）
  // node.stateNode 就是 FiberRoot
  return node.stateNode;
}
```

---

#### 📍 FiberRoot vs RootFiber —— 两棵"根"的区别

```jsx
// FiberRoot：容器级别（每个 ReactDOM.createRoot 一个）
interface FiberRoot {
  containerInfo: Element;         // 挂载的 DOM 容器（如 document.getElementById('root')）
  current: Fiber;                // 指向当前显示的 RootFiber
  finishedWork: Fiber | null;    // 构建完成的 workInProgress 树
  pendingLanes: Lanes;           // 待处理的优先级
  callbackNode: any;             // Scheduler 回调
  callbackPriority: Lane;        // 回调优先级
  expirationTimes: number[];     // 过期时间
}

// RootFiber：组件树的根 Fiber 节点
interface Fiber {
  tag: WorkTag;                  // HostRoot（值为 3）
  stateNode: FiberRoot;          // 反向指向 FiberRoot
  child: Fiber;                  // 真正的根组件（如 <App/>）
  // ... 其他 Fiber 字段
}
```

```mermaid
graph TB
    subgraph Container["DOM 容器"]
        ROOT_DIV["&lt;div id='root'&gt;"]
    end

    subgraph React["React 内存"]
        FR["FiberRoot<br/>containerInfo → div#root<br/>current → RootFiber"]
        RF["RootFiber (HostRoot)<br/>tag=3, stateNode → FiberRoot<br/>child → App Fiber"]
        APP["App Fiber (FunctionComponent)<br/>tag=0, type=App<br/>child → div Fiber"]
        DIV["div Fiber (HostComponent)<br/>tag=5, type='div'<br/>stateNode → 真实 DOM"]
    end

    ROOT_DIV <-->|"containerInfo"| FR
    FR -->|"current"| RF
    RF -->|"child"| APP
    APP -->|"child"| DIV
    DIV -->|"stateNode"| ROOT_DIV
```

**关键区别：**

| 维度 | FiberRoot | RootFiber |
|------|----------|-----------|
| **数量** | 每个 `createRoot` 一个 | 每个 FiberRoot 一个（`current` 指向） |
| **角色** | 容器状态管理 | 组件树根节点 |
| **DOM 关联** | `containerInfo` 持有真实 DOM 容器 | 通过 `stateNode` 反向持有 FiberRoot |
| **更新** | 持有 `pendingLanes`、`finishedWork` | 作为 fiber 树的遍历起点 |
| **双缓冲** | `current` 指向当前显示的 RootFiber | `alternate` 指向 workInProgress 版本 |

---

#### 📍 bailout 机制 —— 如何跳过未变化子树

React 在 `beginWork` 中会做 bailout 判断——如果能确定子树没有变化，**直接跳过整棵树**，不执行任何 reconciliation：

```jsx
// beginWork 简化逻辑
function beginWork(current: Fiber | null, workInProgress: Fiber, renderLanes: Lanes): Fiber | null {
  // 1. 非首次渲染且 props/state/context 都没变 → 尝试 bailout
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;

    // props 没变 + 自身无更新 + context 没变 + 子树无更新
    if (oldProps === newProps &&
        !hasLegacyContextChanged() &&
        !checkScheduledUpdate(workInProgress, renderLanes)) {

      // 检查子树是否需要更新
      if (includesSomeLane(renderLanes, workInProgress.childLanes)) {
        // 子树有更新 → 不能完全跳过，但可以克隆子树
        cloneChildFibers(current, workInProgress);
        return workInProgress.child;
      }

      // 整棵子树都没更新 → bailout！
      return null;
    }
  }

  // 2. 需要更新 → 执行组件渲染和 reconciliation
  // ...
}
```

**bailout 的四个必要条件（必须全部满足）：**

| 条件 | 含义 | 不满足的典型场景 |
|------|------|----------------|
| `oldProps === newProps` | props 引用没变 | 父组件渲染传了新对象 `{...x}` |
| `!hasLegacyContextChanged()` | Context 没变 | Context.Provider 的值变了 |
| `!checkScheduledUpdate()` | 自身没有待处理更新 | 组件调用了 setState |
| `childLanes 不包含当前 Lane` | 子树没有待处理更新 | 子组件调用了 setState |

**这就是 `React.memo` / `useMemo` 的原理**：通过保持 props 引用稳定，让 `oldProps === newProps` 成立，触发 bailout，跳过子树的 reconciliation。

---

#### 📍 subtreeFlags 优化 —— React 18 的位运算革命

React 18 之前，commit 阶段通过 **effect list**（单向链表）遍历有副作用的节点：

```
React 17 及以前（effect list）：
currentFiber.firstEffect → fiberA → fiberB → fiberC → lastEffect
遍历：从 firstEffect 沿 nextEffect 指针逐个处理
问题：effect list 需要在 completeWork 中构建，无法利用树结构
```

React 18 用 **subtreeFlags 位掩码**替代 effect list：

```
React 18+（subtreeFlags）：
每个 Fiber 节点用 32 位整数的位运算标记子树的副作用类别

const PerformedWork = 0b000000000001;  // 已执行工作
const Placement    = 0b000000000010;  // 新增/移动
const Update       = 0b000000000100;  // 更新
const Deletion     = 0b000000001000;  // 删除
const Snapshot     = 0b000010000000;  // getSnapshotBeforeUpdate
const Passive      = 0b000100000000;  // useEffect

// 合并子树 flags
function bubbleProperties(completedWork: Fiber): void {
  let newSubtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    newSubtreeFlags |= child.subtreeFlags;  // 合并子树的 flags
    newSubtreeFlags |= child.flags;         // 合并节点自身的 flags
    child = child.sibling;
  }
  completedWork.subtreeFlags = newSubtreeFlags;
}

// commit 时快速跳过：整棵子树无副作用则跳过
function commitMutationEffects(root: FiberRoot, renderLanes: Lanes): void {
  commitMutationEffectsOnFiber(root.current, renderLanes);
}

function commitMutationEffectsOnFiber(fiber: Fiber, renderLanes: Lanes): void {
  // ⚡ 位运算检查：子树是否有任何副作用？
  if ((fiber.subtreeFlags & MutationMask) === NoFlags) {
    // 整棵子树都无需操作 → 直接跳过
    return;
  }

  // 有副作⽤ → 遍历子节点
  let child = fiber.child;
  while (child !== null) {
    commitMutationEffectsOnFiber(child, renderLanes);
    child = child.sibling;
  }

  // 处理当前节点的 flags
  if (fiber.flags & Placement) { /* 插入/移动 DOM */ }
  if (fiber.flags & Update) { /* 更新 DOM 属性 */ }
  if (fiber.flags & Deletion) { /* 删除 DOM */ }
}
```

**effect list vs subtreeFlags 对比：**

| 维度 | effect list（React 17） | subtreeFlags（React 18+） |
|------|----------------------|------------------------|
| **数据结构** | 独立链表 | 位掩码（32 位整数） |
| **构建方式** | completeWork 中手动连接 | completeWork 中位运算合并 |
| **子树检查** | 必须遍历链表 | O(1) 位运算判断 `subtreeFlags & mask` |
| **内存占用** | 链表指针（8 字节 × n） | 1 个整数（4 字节） |
| **跳过整棵子树** | 不支持 | ✅ `subtreeFlags === NoFlags` 直接 return |

**性能收益：** 对于一棵有 10 万 Fiber 节点的树，如果只有 100 个节点有副作⽤，subtreeFlags 可以用 O(1) 判断跳过 99.9% 的子树遍历，而 effect list 必须遍历完整的链表（至少要把 100 个节点串起来）。这是 React 18 大规模应用性能提升的关键原因之一。

React 的 diff 算法基于三个大胆假设，将 O(n³) 复杂度降低到 O(n)：

| 假设 | 含义 | 复杂度影响 |
|------|------|-----------|
| **不同类型的元素产生不同的树** | 如果根节点类型不同，直接销毁重建，不比较子树 | 从 O(n³) → O(n²) |
| **通过 key 标识哪些元素在不同渲染中保持稳定** | 相同 key 的元素可以复用 | 从 O(n²) → O(n) |
| **同层比较，不跨层级移动** | 只比较同一层级的节点，不跨层级移动 | O(n) |

#### 单节点 Diff（新子节点只有一个）

```jsx
// 简化逻辑
function reconcileSingleElement(returnFiber, currentFiber, element) {
  const key = element.key;

  // 1. current 存在且 key 相同
  if (currentFiber !== null) {
    if (currentFiber.key === key) {
      // 2. type 相同 → 复用节点，更新 props
      if (currentFiber.type === element.type) {
        const existing = createFiberFromElement(element);
        existing.return = returnFiber;
        return existing;  // 复用
      }
      // 3. type 不同 → 删除旧节点，创建新节点
      deleteRemainingChildren(returnFiber, currentFiber);
      return createFiberFromElement(element);
    }
    // key 不同 → 删除旧节点
    deleteRemainingChildren(returnFiber, currentFiber);
  }

  // 4. 创建新 Fiber
  return createFiberFromElement(element);
}
```

#### 多节点 Diff（新子节点有多个）

多节点 diff 分为三步处理：

```mermaid
flowchart TD
    A["新子节点列表"] --> B{"遍历新节点"}
    B --> C{"新旧 key 相同?"}
    C -->|是| D{"type 相同?"}
    D -->|是| E["更新 props<br/>复用节点"]
    D -->|否| F["标记删除旧节点<br/>创建新节点"]
    C -->|否| G["标记删除"]
    B --> H{"旧节点还有剩余?"}
    H -->|是| I["删除所有剩余旧节点"]
    H -->|否| J["完成"]
```

**具体的多节点 diff 规则：**

```
情况 1: 新节点按顺序遍历
  新: [A, B, C]
  旧: [A, B, C]
  → 逐个比较，全部复用

情况 2: 有新节点插入
  新: [A, B, C, D]
  旧: [A, B, C]
  → 前三个复用，D 标记为 Placement

情况 3: 有旧节点删除
  新: [A, C]
  旧: [A, B, C]
  → A 复用，B 标记为 Deletion，C 复用

情况 4: 节点移动（key 相同但位置不同）
  新: [A, C, B]
  旧: [A, B, C]
  → A 复用，C 移动到 B 前面，B 移动到 C 后面
  → 通过 key 快速定位可复用节点
```

#### effectTag 的作用

```jsx
// effectTag 标记了需要在 Commit 阶段执行的操作
const Placement = 0b000000000010;   // 新增节点
const Update = 0b000000000100;       // 更新节点
const Deletion = 0b000000001000;     // 删除节点
const ChildDeletion = 0b000001000000; // 删除子节点
```

#### ⚠️ key 的正确使用（面试必问）

```jsx
// ❌ 错误：用 index 作为 key
{items.map((item, index) => <Item key={index} {...item} />)}
// 问题：列表重排时 index 变化，导致所有节点重新创建

// ✅ 正确：用唯一 ID 作为 key
{items.map(item => <Item key={item.id} {...item} />)}

// ❌ 错误：用随机数作为 key
{items.map(item => <Item key={Math.random()} {...item} />)}
// 问题：每次渲染 key 都变，所有节点重新创建
```

---
### 🔍 Reconciliation 算法

#### 🔄 Diff 算法实现

```jsx
// packages/react-reconciler/src/ReactChildFiber.ts
function reconcileChildren(current, workInProgress, nextChildren) {
  if (current === null) {
    // 首次渲染：创建新的 fiber
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren
    );
  } else {
    // 更新：reconcile
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    );
  }
}

// 单节点 reconcile
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  const key = element.key;
  let child = currentFirstChild;

  while (child !== null) {
    if (child.key === key) {
      // key 相同，检查 type
      if (child.type === element.type) {
        // type 相同，复用 fiber
        deleteRemainingChildren(returnFiber, child.sibling);
        const existing = useFiber(child, element.props);
        existing.return = returnFiber;
        return existing;
      } else {
        // type 不同，删除所有子节点
        deleteRemainingChildren(returnFiber, child);
        break;
      }
    } else {
      // key 不同，删除当前节点
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }

  // 创建新的 fiber
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}

// 多节点 reconcile（双端比较）
function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
  let resultingFirstChild = null;
  let previousNewFiber = null;
  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0;
  let newIdx = 0;
  let nextOldFiber = null;

  // 1. 遍历新旧节点，从头部开始比较
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }

    // 尝试复用
    const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);

    if (newFiber === null) {
      // key 不同，跳出循环
      if (oldFiber === null) {
        oldFiber = nextOldFiber;
      }
      break;
    }

    // 标记位置
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

    // 连接 fiber 链表
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }

  // 2. 处理剩余节点
  if (oldFiber === null) {
    // 新节点还有剩余，全部插入
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx]);
      if (newFiber === null) continue;

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  } else {
    // 旧节点还有剩余，全部删除
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx]
      );
      if (newFiber !== null) {
        if (newFiber.alternate !== null) {
          // 复用了旧节点，从 map 中删除
          existingChildren.delete(
            newFiber.key === null ? newIdx : newFiber.key
          );
        }
        // 判断是否需要移动
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 删除剩余的旧节点
    existingChildren.forEach(child => deleteChild(returnFiber, child));
  }

  return resultingFirstChild;
}
```

#### 📍 Key 的作用原理

```jsx
// 为什么需要 key？
// 1. 身份识别：帮助 Diff 算法识别哪些节点是同一个
// 2. 状态保持：确保组件状态在列表重排时保持一致
// 3. 性能优化：避免不必要的重新创建

// 使用 index 作为 key 的问题
// 旧列表：[A(0), B(1), C(2)]
// 新列表：[B(0), A(1), C(2)]  // B 和 A 交换了位置

// 使用 index 作为 key 时：
// Diff 结果：
//   index 0: A → B（更新）
//   index 1: B → A（更新）
//   index 2: C → C（不变）
// 结果：3 次更新

// 使用唯一 key 时：
// Diff 结果：
//   key="a": A → A（移动到位置 1）
//   key="b": B → B（移动到位置 0）
//   key="c": C → C（不变）
// 结果：2 次移动，0 次更新
```

---

### ⏳ Suspense 深入原理

#### 工作机制

Suspense 的核心原理是：**子组件在 "等待" 时抛出一个 Promise**，React 捕获这个 Promise 并显示 fallback。

```jsx
// Suspense 的工作流程（简化）
// 1. React 渲染子组件
// 2. 子组件触发异步操作（数据加载/代码分割）
// 3. 组件 throw 一个 Promise（不是 return）
// 4. React 捕获 Promise，暂停渲染
// 5. 显示 Suspense 的 fallback
// 6. Promise resolve 后，React 重新渲染子组件

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />  {/* 代码分割，加载时 throw Promise */}
    </Suspense>
  );
}
```

#### Suspense 的三种使用场景

```jsx
// 场景 1：代码分割（React.lazy）
const LazyDashboard = React.lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyDashboard />
    </Suspense>
  );
}

// 场景 2：数据获取（配合框架如 Next.js / Relay）
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// 在支持 Suspense 的数据获取库中
function UserProfile({ id }) {
  const user = use(fetchUser(id));  // React 19 的 use() Hook
  return <div>{user.name}</div>;
}

// 场景 3：图片加载（配合 lazy loading）
function LazyImage({ src }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0 }}
    />
  );
}
```

#### 多个 Suspense 嵌套

```jsx
function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Header />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <Content />
      </Suspense>
    </Suspense>
  );
}
// 规则：内层 Suspense 优先处理
// 如果 Content 加载慢，只显示 ContentSkeleton
// 如果 Sidebar 也加载慢，显示 SidebarSkeleton
// 如果 Header 加载慢，显示整个 PageSkeleton
```

#### Suspense + ErrorBoundary 配合

```jsx
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
// ErrorBoundary 捕获错误，Suspense 捕获 Promise
// 两者配合处理异步组件的所有状态
```

#### ⚠️ Suspense 的关键规则

| 规则 | 说明 |
|------|------|
| fallback 必须是有效 React 元素 | 不能是 `null`，需要用 `<Loading />` 而不是 `Loading` |
| Suspense 不是数据获取 Hook | 它是 UI 组件，用于声明等待状态的 UI |
| 缓存策略由框架实现 | React 本身不提供数据缓存，需配合 Next.js/Relay 等 |
| SSR 中的行为 | 服务端只渲染已加载的内容，未加载的留空 |

---

### 🌐 SSR 原理深度解析

#### 服务端渲染 vs 客户端渲染

```mermaid
flowchart LR
    subgraph CSR 客户端渲染
        A1["服务器返回空 HTML"] --> A2["浏览器下载 JS"]
        A2 --> A3["JS 执行，渲染 DOM"]
        A3 --> A4["页面可见"]
    end

    subgraph SSR 服务端渲染
        B1["服务器执行 React"] --> B2["生成完整 HTML"]
        B2 --> B3["浏览器直接显示"]
        B3 --> B4["下载 JS，水合"]
        B4 --> B5["页面可交互"]
    end
```

#### React SSR 核心 API

```jsx
// 1. renderToString（同步，React 18 推荐用 renderToPipeableStream）
import { renderToString } from 'react-dom/server';

const html = renderToString(<App />);
// 返回完整的 HTML 字符串

// 2. renderToNodeStream（流式，React 18 已废弃，推荐 renderToPipeableStream）
import { renderToNodeStream } from 'react-dom/server';

const stream = renderToNodeStream(<App />);
stream.pipe(res);  // 流式发送到客户端

// 3. renderToPipeableStream（React 18 新增，推荐）
import { renderToPipeableStream } from 'react-dom/server';

const { pipe, abort } = renderToPipeableStream(<App />, {
  onShellReady() {
    // Shell 准备好，可以开始流式发送
    res.statusCode = 200;
    pipe(res);
  },
  onShellError(error) {
    // Shell 渲染出错
    res.statusCode = 500;
    res.send('<h1>Something went wrong</h1>');
  },
  onError(error) {
    console.error(error);
  }
});

// 4. renderToReadableStream（Web Streams API）
import { renderToReadableStream } from 'react-dom/server';

const stream = await renderToReadableStream(<App />, {
  onError(error) {
    console.error(error);
  }
});
```

#### Hydration（水合）过程

```mermaid
flowchart TD
    A["服务器返回 HTML"] --> B["浏览器显示 HTML<br/>(可读但不可交互)"]
    B --> C["下载并执行 React JS"]
    C --> D["React 在客户端渲染组件树"]
    D --> E{"客户端渲染结果<br/>与服务器 HTML 匹配?"}
    E -->|匹配| F["复用服务器 HTML<br/>(不重新渲染)"]
    E -->|不匹配| G["Hydration Mismatch 警告<br/>重新渲染客户端版本"]
    F --> H["绑定事件监听器"]
    G --> H
    H --> I["页面可交互 ✅"]
```

**Hydration Mismatch 常见原因：**

| 原因 | 示例 | 解决方案 |
|------|------|---------|
| 日期/时间 | `new Date().toLocaleString()` | `useEffect` 中设置，或 `suppressHydrationWarning` |
| 随机数 | `Math.random()` | 用 state 存储随机值 |
| 浏览器 API | `window.innerWidth` | 用 `useEffect` 或条件渲染 |
| localStorage | `localStorage.getItem('key')` | 用 `useEffect` 或 cookies |

```jsx
// 解决日期 mismatch
function CurrentTime() {
  const [time, setTime] = useState('');
  useEffect(() => {
    setTime(new Date().toLocaleString());
  }, []);
  return <span>{time || '...'}</span>;  // 服务器渲染 '...'，客户端渲染实际时间
}

// suppressHydrationWarning（谨慎使用）
<span suppressHydrationWarning>
  {new Date().toLocaleString()}
</span>
```

#### 流式 SSR（Streaming SSR）

```jsx
// React 18 的 Streaming SSR
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    // Shell 先发送（快速显示页面骨架）
    onShellReady() {
      res.statusCode = 200;
      pipe(res);
    },
    // 所有内容加载完成后发送
    onAllReady() {
      // 可选：等所有 Suspense 内容加载完再发送
    },
    onError(error) {
      console.error(error);
    }
  });

  // 超时自动中止
  setTimeout(abort, 10000);
});
```

**Streaming SSR 的优势：**
- 首屏加载更快（Shell 先发送）
- Suspense 边界内的内容可以逐步加载
- 不需要等待所有数据加载完才发送 HTML

#### 选择性 Hydration（Selective Hydration）

```jsx
// React 18 + Suspense 实现选择性水合
// 1. 服务器标记 Suspense 边界
// 2. 客户端优先水合用户交互的区域
// 3. 其他区域可以延迟水合

function App() {
  return (
    <Layout>
      <Header />  {/* 优先水合 */}
      <Suspense fallback={<ContentSkeleton />}>
        <Content />  {/* 可以延迟水合 */}
      </Suspense>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />  {/* 可以延迟水合 */}
      </Suspense>
    </Layout>
  );
}
// 用户点击 Content 时，React 优先水合 Content
```

---

### ⚡ React.memo 深入原理与滥用陷阱

#### 浅比较实现原理

```jsx
// React.memo 内部使用 shallowEqual 进行比较
function shallowEqual(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) return true;

  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) ||
        !Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}
```

#### React.memo 不生效的常见陷阱

```jsx
// ❌ 陷阱 1：内联对象作为 props
function Parent() {
  return (
    <MemoizedChild style={{ color: 'red' }} />
    // 每次渲染都创建新对象 → shallowEqual 返回 false → 重新渲染
  );
}

// ✅ 修复：用 useMemo 缓存对象
function Parent() {
  const style = useMemo(() => ({ color: 'red' }), []);
  return <MemoizedChild style={style} />;
}

// ❌ 陷阱 2：内联函数作为 props
function Parent() {
  const handleClick = () => console.log('clicked');
  // 每次渲染都创建新函数
  return <MemoizedChild onClick={handleClick} />;
}

// ✅ 修复：用 useCallback 缓存函数
function Parent() {
  const handleClick = useCallback(() => console.log('clicked'), []);
  return <MemoizedChild onClick={handleClick} />;
}

// ❌ 陷阱 3：Context 变化穿透
const ThemeContext = createContext('light');

function Parent() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <MemoizedChild />  {/* 即使 memo 了，Context 变化仍会触发重渲染 */}
    </ThemeContext.Provider>
  );
}

// ✅ 修复：拆分 Context，避免不必要的更新
const ThemeUpdateContext = createContext(() => {});

function Parent() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeUpdateContext.Provider value={setTheme}>
      <ThemeContext.Provider value={theme}>
        <MemoizedChild />  {/* 现在只有 theme 变化时才重渲染 */}
      </ThemeContext.Provider>
    </ThemeUpdateContext.Provider>
  );
}
```

#### React.memo vs useMemo vs useCallback

| API | 用途 | 返回值 | 使用场景 |
|-----|------|--------|---------|
| `React.memo` | 缓存**组件** | 包裹后的组件 | 避免父组件更新导致子组件重渲染 |
| `useMemo` | 缓存**计算结果** | 缓存的值 | 昂贵计算、避免每次渲染重新创建对象 |
| `useCallback` | 缓存**函数** | 缓存的函数 | 作为 props 传递的回调函数 |

```jsx
// 三者配合使用的完整示例
const MemoizedList = React.memo(function List({ items, onItemClick }) {
  // React.memo 避免父组件更新时重渲染
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

function Parent() {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('');

  // useMemo 缓存过滤后的列表（避免每次渲染重新计算）
  const filteredItems = useMemo(
    () => items.filter(item => item.name.includes(filter)),
    [items, filter]
  );

  // useCallback 缓存回调函数（避免子组件重渲染）
  const handleItemClick = useCallback((id) => {
    console.log('Clicked:', id);
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <MemoizedList items={filteredItems} onItemClick={handleItemClick} />
    </div>
  );
}
```

#### ⚠️ 什么时候不需要 React.memo

| 场景 | 原因 |
|------|------|
| 子组件很简单 | 重渲染成本低，memo 的比较成本反而更高 |
| props 总是变化 | memo 总是失败，没有缓存效果 |
| 使用了内联对象/函数 | 不修复引用问题，memo 无效 |
| React 19 + Compiler | Compiler 自动处理 memo，无需手动添加 |

---

### 🔗 forwardRef 与 useImperativeHandle

#### forwardRef 基本用法

```jsx
// ❌ 问题：函数组件默认不接收 ref
function TextInput() {
  return <input />;
}

// ✅ 解决：用 forwardRef 包裹
const TextInput = forwardRef(function TextInput(props, ref) {
  return <input ref={ref} />;
});

// 使用
function Parent() {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current.focus();  // 直接操作子组件 DOM
  }, []);
  return <TextInput ref={inputRef} />;
}
```

#### useImperativeHandle 暴露组件方法

```jsx
// 问题：直接暴露整个 DOM 元素太危险
// 解决：用 useImperativeHandle 只暴露需要的方法

const FancyInput = forwardRef(function FancyInput(props, ref) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  // 只暴露特定方法，而不是整个 input DOM
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setValue('');
      inputRef.current?.value = '';
    },
    getValue: () => value,
  }), [value]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
});

// 使用
function Parent() {
  const fancyRef = useRef(null);

  return (
    <>
      <FancyInput ref={fancyRef} />
      <button onClick={() => fancyRef.current?.focus()}>聚焦</button>
      <button onClick={() => fancyRef.current?.clear()}>清空</button>
      <button onClick={() => console.log(fancyRef.current?.getValue())}>获取值</button>
    </>
  );
}
```

#### React 19 的 ref 变化

```jsx
// React 18：需要 forwardRef
const MyInput = forwardRef((props, ref) => {
  return <input ref={ref} />;
});

// React 19：ref 直接作为 prop
function MyInput({ ref, ...props }) {
  return <input ref={ref} />;
}
// 不再需要 forwardRef 包裹！

// React 19 的 ref cleanup
function MyInput({ ref }) {
  useEffect(() => {
    return () => {
      // 组件卸载时的清理逻辑
      console.log('Cleaning up ref');
    };
  }, []);

  return <input ref={ref} />;
}
```

#### 面试高频问题

**Q: 什么时候用 forwardRef？**
> 需要父组件直接访问子组件 DOM 或暴露子组件方法时。React 19 不再需要。

**Q: useImperativeHandle 的第二个参数为什么需要依赖数组？**
> 确保暴露的方法在依赖变化时更新。如果省略，闭包中可能捕获过期的值。

**Q: 能否用 useRef 代替 forwardRef？**
> 不能。ref 不能作为 prop 传递给函数组件（React 18），必须用 forwardRef。React 19 解决了这个问题。

---

### 📦 useSyncExternalStore 原理与使用

#### 解决什么问题（Tearing 问题）

```jsx
// 问题：并发模式下，外部状态可能导致 Tearing（UI 不一致）
// 旧方案：多个组件分别 subscribe 外部状态
// 问题：组件 A 读取的是新值，组件 B 读取的是旧值

// useSyncExternalStore 确保所有组件在同一时间点读取相同值
import { useSyncExternalStore } from 'react';
```

#### 基本用法

```jsx
// 自定义一个外部 store
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (newState) => {
      state = typeof newState === 'function' ? newState(state) : newState;
      listeners.forEach(listener => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// 使用 useSyncExternalStore 订阅
function useStore(store) {
  const state = useSyncExternalStore(
    store.subscribe,     // 订阅函数
    store.getState,      // 获取当前值
    // 可选：服务端渲染时的初始值
    () => store.getState()
  );
  return state;
}

// 使用
const store = createStore({ count: 0 });

function Counter() {
  const { count } = useStore(store);
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => store.setState(s => ({ ...s, count: s.count + 1 }))}>
        +1
      </button>
    </div>
  );
}
```

#### React 19 的 useOptimistic + useActionState

```jsx
// useOptimistic：乐观更新
function TodoList({ todos }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodo) => [...currentTodos, { ...newTodo, sending: true }]
  );

  const handleAdd = async (text) => {
    const newTodo = { id: Date.now(), text };
    addOptimisticTodo(newTodo);  // 立即显示
    await saveTodo(newTodo);      // 等待服务器响应
  };

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <li key={todo.id} style={{ opacity: todo.sending ? 0.5 : 1 }}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

#### 与 Redux/MobX 的关系

```jsx
// Redux 使用 useSyncExternalStore（React 18+）
// redux/src/hooks/useSelector.ts
import { useSyncExternalStore } from 'react';

export function useSelector(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
}

// MobX 使用 useSyncExternalStore 兼容 React 18
// @mobx-react-lite 使用 useSyncExternalStore 包装 observer 组件
```

#### 面试高频问题

**Q: useSyncExternalStore 解决什么问题？**
> 解决并发模式下的 Tearing 问题，确保所有组件在同一时间点读取外部状态的相同值。

**Q: getSnapshot 函数为什么必须返回稳定引用？**
> 如果每次调用返回新对象，会导致无限循环（每次渲染都触发重新渲染）。

**Q: subscribe 函数什么时候调用？**
> 组件挂载时调用，返回的清理函数在组件卸载时调用。

---

### 🔧 React 事件机制深入

#### 事件委托完整链路

```mermaid
flowchart TD
    A["用户点击 button"] --> B["原生 click 事件触发"]
    B --> C["事件冒泡传播"]
    C --> D["到达 root DOM 容器<br/>(React 17+ 从 document 迁移到 root)"]
    D --> E["React 统一事件监听器"]
    E --> F["遍历 Fiber 树查找事件处理函数"]
    F --> G{"找到对应的<br/>事件处理函数?"}
    G -->|是| H["创建 SyntheticEvent"]
    H --> I["调用 onClick 处理函数"]
    I --> J["事件池回收<br/>(React 17+ 已废弃事件池)"]
    G -->|否| K["忽略"]
```

#### React 17+ 事件系统变化

| 变化 | React 16 | React 17+ |
|------|---------|-----------|
| 事件绑定位置 | `document` | 根 DOM 容器 |
| 事件池 | 复用 SyntheticEvent（性能优化） | 废弃事件池（更安全） |
| 与原生事件交互 | 在 document 上拦截 | 在 root 上拦截 |
| 多版本 React 共存 | 困难（共享 document） | 可行（各自 root） |

#### e.stopPropagation() vs 原生 stopPropagation

```jsx
function App() {
  return (
    <div onClick={() => console.log('React: App')}>
      <button
        onClick={(e) => {
          e.stopPropagation();  // 阻止 React 树冒泡
          console.log('React: Button clicked');
        }}
      >
        点击
      </button>
    </div>
  );
}

// 同时绑定原生事件
document.querySelector('button').addEventListener('click', () => {
  console.log('Native: Button clicked');  // ✅ 仍然执行
});

// 点击按钮输出：
// "Native: Button clicked" ✅ 原生事件不受 React stopPropagation 影响
// "React: Button clicked" ✅ React 事件处理函数执行
// React 的 stopPropagation 不会阻止原生事件冒泡！
```

#### 如何正确阻止原生事件

```jsx
// 方案 1：使用原生事件的 stopPropagation
function App() {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    const handleNativeClick = (e) => {
      e.stopPropagation();  // 阻止原生事件冒泡
      console.log('Native: stopped');
    };
    button.addEventListener('click', handleNativeClick);
    return () => button.removeEventListener('click', handleNativeClick);
  }, []);

  return <button ref={buttonRef}>按钮</button>;
}

// 方案 2：使用 e.nativeEvent.stopImmediatePropagation
function App() {
  return (
    <button onClick={(e) => {
      e.nativeEvent.stopImmediatePropagation();  // 阻止所有后续事件
      console.log('Stopped all');
    }}>
      点击
    </button>
  );
}
```

#### 事件执行顺序

```jsx
function App() {
  return (
    <div
      onClickCapture={() => console.log('1. React Capture')}
      onClick={() => console.log('4. React Bubble')}
    >
      <button
        onClickCapture={() => console.log('2. React Capture')}
        onClick={() => console.log('3. React Bubble')}
      >
        点击
      </button>
    </div>
  );
}

// 同时有原生事件：
// div.addEventListener('click', () => console.log('5. Native Bubble'), false);
// div.addEventListener('click', () => console.log('6. Native Capture'), true);

// 点击按钮输出顺序：
// 1. React Capture (外层 div)
// 2. React Capture (button)
// 6. Native Capture (外层 div) ← 原生捕获在 React 捕获之后！
// 3. React Bubble (button)
// 4. React Bubble (外层 div)
// 5. Native Bubble (外层 div) ← 原生冒泡在 React 冒泡之后！
```

#### 面试高频问题

**Q: React 事件和原生事件的执行顺序？**
> 捕获阶段：React Capture → Native Capture；冒泡阶段：React Bubble → Native Bubble。

**Q: 为什么 React 要把事件委托到 root 而不是 document？**
> 为微前端和多版本 React 共存提供更好的隔离性，避免不同版本 React 的事件系统冲突。

**Q: React 17+ 为什么废弃事件池？**
> 事件池是为了性能优化（复用 SyntheticEvent 对象），但带来了异步访问事件属性的复杂性。现代浏览器性能足够，不需要这个优化。

---



## 第五部分：React 19 新特性深度解析

### 1️⃣ React Compiler 深度解析

#### 🔄 工作原理

```jsx
// React Compiler 的核心思想：
// 1. 静态分析组件
// 2. 自动推断依赖
// 3. 自动添加 memo/useMemo/useCallback

// 编译器会做的事情：
// - 自动缓存计算结果
// - 自动优化 re-render
// - 自动跳过不必要的更新

// 示例：
function ProductList({ products, onSelect }) {
  // 编译器自动分析：
  // - products 依赖
  // - onSelect 依赖
  // - 生成 useMemo/useCallback

  const sorted = products.sort((a, b) => a.price - b.price);
  const handleClick = (id) => onSelect(id);

  return (
    <ul>
      {sorted.map(p => (
        <li key={p.id} onClick={() => handleClick(p.id)}>
          {p.name}
        </li>
      ))}
    </ul>
  );
}

// 编译后（简化）：
function ProductList({ products, onSelect }) {
  const sorted = useMemo(() => products.sort((a, b) => a.price - b.price), [products]);
  const handleClick = useCallback((id) => onSelect(id), [onSelect]);

  return (
    <ul>
      {sorted.map(p => (
        <li key={p.id} onClick={() => handleClick(p.id)}>
          {p.name}
        </li>
      ))}
    </ul>
  );
}
```

#### 📍 编译器配置

```json
// .babelrc 或 babel.config.js（推荐使用 flat config 方式）
{
  "presets": [
    ["react-compiler", {
      "sources": (filename) => {
        return filename.endsWith('.tsx') || filename.endsWith('.jsx');
      },
      "compilationMode": "annotation",
      "panicThreshold": "CRITICAL_ERRORS"
    }]
  ]
}
```
----
### 🔍 React Compiler 源码原理

#### 🔄 编译流程

```jsx
// packages/babel-plugin-react-compiler/src/index.ts
// React Compiler 的编译流程

function compileFunctionAST(ast) {
  // 1. 分析组件
  const analysis = analyzeComponent(ast);

  // 2. 确定依赖
  const dependencies = analyzeDependencies(analysis);

  // 3. 生成缓存代码
  const optimized = generateMemoCode(analysis, dependencies);

  return optimized;
}

// 示例：
// 原始代码
function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  const double = count * 2;
  return <div>{double}</div>;
}

// 编译后
function Counter({ initialCount }) {
  const $ = useMemo(() => [initialCount], [initialCount]);
  const [count, setCount] = useState($[0]);
  const double = useMemo(() => count * 2, [count]);
  return <div>{double}</div>;
}
```

#### 📍 依赖分析算法

```jsx
// packages/babel-plugin-react-compiler/src/DependencyAnalysis.ts
function analyzeDependencies(analysis) {
  const dependencies = new Map();

  // 1. 遍历所有 reactive 表达式
  for (const expr of analysis.reactiveExpressions) {
    // 2. 分析表达式依赖
    const deps = analyzeExpression(expr);

    // 3. 确定依赖项
    dependencies.set(expr, deps);
  }

  return dependencies;
}

// 依赖类型
enum DependencyType {
  State = 'state',         // useState
  Ref = 'ref',             // useRef
  Context = 'context',     // useContext
  Props = 'props',         // props
  Memo = 'memo',           // useMemo
  Callback = 'callback'    // useCallback
}

// 依赖分析结果
interface Dependency {
  type: DependencyType;
  source: string;          // 依赖来源
  path: string[];          // 访问路径
  isStable: boolean;       // 是否稳定
}
```

---
### 2️⃣ Actions 机制深度解析

```jsx
// Actions 的核心思想：
// 1. 自动管理 pending 状态
// 2. 自动处理错误
// 3. 自动批量更新

// 使用 useActionState
function Form() {
  const [state, formAction, isPending] = useActionState(
    async (previousState, formData) => {
      // 异步操作
      const result = await submitForm(formData);
      return result;
    },
    { success: false, message: '' }
  );

  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}

// useOptimistic 乐观更新
function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleSubmit(formData) {
    const text = formData.get('text');
    addOptimisticTodo({ id: Date.now(), text, done: false });
    await addTodo(text);
  }

  return (
    <form action={handleSubmit}>
      <input name="text" />
      <button type="submit">添加</button>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text}
          </li>
        ))}
      </ul>
    </form>
  );
}
```

### 3️⃣ use() Hook 深度解析

```jsx
// use() 的核心能力：
// 1. 在渲染时读取 Promise
// 2. 在渲染时读取 Context
// 3. 条件调用（打破 Hooks 规则）

// 读取 Promise
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // 暂挂组件直到 Promise resolve

  return <div>{user.name}</div>;
}

// 读取 Context
function Theme() {
  const theme = use(ThemeContext);  // 类似 useContext
  return <div style={{ color: theme.color }}>Hello</div>;
}

// 条件调用
function ConditionalComponent({ showData }) {
  const [data, setData] = useState(null);

  if (showData) {
    const result = use(fetchData());  // 条件调用
    return <div>{result}</div>;
  }

  return <div>No data</div>;
}

// 与 Suspense 配合
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userPromise={fetchUser()} />
    </Suspense>
  );
}
```


## 第六部分：常见 Bug 与调试技巧

### 1️⃣ 闭包陷阱

#### 📍 问题场景

```jsx
// ❌ 问题：闭包捕获旧值
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count);  // ❌ 始终输出 0
      setCount(count + 1); // ❌ 始终设置为 1
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <div>{count}</div>;
}

// ✅ 解决方案 1：使用函数式更新
setCount(prev => prev + 1);

// ✅ 解决方案 2：使用 useRef
const countRef = useRef(0);
useEffect(() => {
  countRef.current = count;
}, [count]);

useEffect(() => {
  const timer = setInterval(() => {
    console.log(countRef.current);  // ✅ 总是最新值
    setCount(countRef.current + 1);
  }, 1000);

  return () => clearInterval(timer);
}, []);

// ✅ 解决方案 3：使用 useEffect 的依赖
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count);  // ✅ 依赖变化时重新创建
    setCount(count + 1);
  }, 1000);

  return () => clearInterval(timer);
}, [count]);  // 依赖变化时重新执行
```

### 2️⃣ 内存泄漏排查

#### 📍 常见泄漏场景

```jsx
// ❌ 泄漏场景 1：未清理的订阅
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const subscription = api.subscribe(userId, setUser);
    // ❌ 组件卸载后仍在监听
  }, [userId]);

  return <div>{user?.name}</div>;
}

// ✅ 正确：清理订阅
useEffect(() => {
  const subscription = api.subscribe(userId, setUser);
  return () => subscription.unsubscribe();  // ✅ 清理
}, [userId]);

// ❌ 泄漏场景 2：未清理的事件监听
function WindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => setSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
    window.addEventListener('resize', handleResize);
    // ❌ 组件卸载后仍在监听
  }, []);

  return <div>{size.width} x {size.height}</div>;
}

// ✅ 正确：清理事件监听
useEffect(() => {
  const handleResize = () => setSize({
    width: window.innerWidth,
    height: window.innerHeight
  });
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);  // ✅
}, []);
```

#### 📍 内存泄漏检测

```jsx
// 使用 Chrome DevTools Memory 面板
// 1. 堆快照对比：查找 Detached 节点
// 2. 分配时间线：观察内存增长趋势

// 自动检测
export function detectMemoryLeaks() {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize / 1024 / 1024;
    console.log(`内存使用: ${used.toFixed(2)}MB`);

    if (used > 100) {  // 超过 100MB
      console.warn('可能存在内存泄漏');
    }
  }
}
```

### 3️⃣ 调试技巧

```jsx
// 1. React DevTools Profiler
// - 记录渲染性能
// - 分析组件更新原因
// - 查看组件渲染次数

// 2. 自定义 Hook 调试
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    console.log('[useCounter] count:', count);
  }, [count]);

  return { count, increment: () => setCount(c => c + 1) };
}

// 3. 组件渲染追踪
function TrackedComponent({ data }) {
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    console.log(`[TrackedComponent] rendered ${renderCount.current} times`);
  });

  return <div>{data}</div>;

```

---


### Hooks 实现原理

#### 🧬 useState 实现原理

```jsx
// 简化版 useState 内部实现
let stateIndex = 0;
const stateQueue = [];

function useState(initialValue) {
  const currentIndex = stateIndex;

  if (stateQueue[currentIndex] === undefined) {
    stateQueue[currentIndex] = initialValue;
  }

  function setState(newValue) {
    const resolvedValue = typeof newValue === 'function'
      ? newValue(stateQueue[currentIndex])
      : newValue;
    stateQueue[currentIndex] = resolvedValue;
    scheduleUpdate(); // 触发重新渲染
  }

  stateIndex++;
  return [stateQueue[currentIndex], setState];
}
```

**核心要点：**
- 每个组件实例有一个 Fiber 节点，存储 hooks 链表
- 通过 `stateIndex` 按调用顺序匹配状态
- **不能在条件/循环中调用 Hooks**（保证调用顺序一致）
- `setState` 触发更新调度，合并到批量更新队列

#### 🧬 useEffect 实现原理

```jsx
function useEffect(callback, deps) {
  const currentIndex = effectIndex;
  const previousDeps = effectQueue[currentIndex];

  const hasChanged = !previousDeps || deps.some((dep, i) => !Object.is(dep, previousDeps[i]));

  if (hasChanged) {
    if (effectQueue[currentIndex]?.cleanup) {
      effectQueue[currentIndex].cleanup();
    }
    scheduleAfterPaint(() => {
      const cleanup = callback();
      effectQueue[currentIndex] = { deps, cleanup };
    });
  }

  effectIndex++;
}
```

**核心要点：**
- 在 commit 阶段后异步执行（LayoutEffect 则是同步）
- 通过 `Object.is` 比较依赖项
- 返回的 cleanup 函数在下一次 effect 执行前调用

#### 🧬 useRef 实现原理

```jsx
function useRef(initialValue) {
  const currentIndex = refIndex;
  if (refQueue[currentIndex] === undefined) {
    refQueue[currentIndex] = { current: initialValue };
  }
  refIndex++;
  return refQueue[currentIndex];
}
```

**核心要点：**
- 返回一个稳定的对象引用（整个生命周期不变）
- `.current` 变化不会触发重新渲染
- 常用于 DOM 引用、保存可变值

#### 🧬 useContext 实现原理

```jsx
function useContext(Context) {
  const fiber = getCurrentFiber();
  let provider = fiber;

  while (provider) {
    if (provider.type === Context.Provider) {
      return provider.memoizedProps.value;
    }
    provider = provider.return; // 父 Fiber
  }

  return Context._defaultValue;
}
```

**核心要点：**
- 本质是沿着 Fiber 树向上遍历查找最近的 Context.Provider
- Provider 的 value 变化时，所有消费该 Context 的组件会强制更新

---

### 实战场景题

#### 场景 1：实现一个具有分页、搜索、排序的数据表格

```jsx
function DataTable() {
  const [data, setData] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [data, searchTerm]);

  const sorted = useMemo(() => {
    const newData = [...filtered];
    newData.sort((a, b) => sortBy === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(a.date).getTime() - new Date(b.date).getTime());
    return newData;
  }, [filtered, sortBy]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  return (
    <div>
      <input placeholder="搜索..." value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
      <table>
        {paginatedData.map(item => <tr key={item.id}>
          <td>{item.name}</td><td>{item.date}</td>
        </tr>)}
      </table>
      <button onClick={() => setPage(Math.max(1, page - 1))}>上一页</button>
      <span>{page}</span>
      <button onClick={() => setPage(page + 1)}>下一页</button>
    </div>
  );
}
```

#### 场景 2：实现一个具有撤销/重做功能的编辑器

```jsx
function useHistory<T>(initialValue: T) {
  const [state, setState] = useState(initialValue);
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [historyStep, setHistoryStep] = useState(0);

  const updateState = (newState: T) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setState(newState);
  };

  const undo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      setState(history[newStep]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      setState(history[newStep]);
    }
  };

  return { state, updateState, undo, redo, canUndo: historyStep > 0, canRedo: historyStep < history.length - 1 };
}
```


---

### 📚 推荐学习资源

- 🌐 [官方文档](https://react.dev)
- 📖 [React 最佳实践](https://react.dev/learn)
- 🎓 [React 核心概念深入](https://react.dev/reference)
- 💻 [CodeSandbox 在线编辑](https://codesandbox.io)
- 🧪 [React Testing Library](https://testing-library.com)

---

## 🔵 React 19 面试题（56题）

### Q1：说说 React 的渲染流程（Trigger → Render → Commit）

**三阶段模型：**

```mermaid
graph LR
    Trigger["**Trigger (触发更新)**<br/>setState<br/>useState<br/>useReducer"] --> Render
    Render["**Render (渲染阶段)**<br/>构建 VNode<br/>Diff 对比<br/>收集 Effect"] --> Commit
    Commit["**Commit (提交阶段)**<br/>操作 DOM<br/>生命周期<br/>执行 Effect"]

    classDef trigger fill:#e1f5fe,stroke:#333;
    classDef render fill:#fff3e0,stroke:#333,stroke-dasharray: 5 5;
    classDef commit fill:#e8f5e9,stroke:#333;

    class Trigger trigger;
    class Render render;
    class Commit commit;
```

**详细过程：**

```
1️⃣ Trigger（触发阶段）
   ├─ 首次渲染：createRoot → render
   ├─ 状态更新：setState / useReducer / useState dispatch
   └─ 强制更新：forceUpdate / useSyncExternalStore

2️⃣ Render（渲染阶段 — 可中断）
   ├─ 深度优先遍历 Fiber 树
   ├─ 构建 workInProgress 树
   ├─ Diff 对比 → 标记 effectTag（Placement/Update/Deletion）
   ├─ 收集 Hooks 链表
   └─ 时间切片：每 5ms 让出主线程

3️⃣ Commit（提交阶段 — 不可中断）
   ├─ Pre-mutation：getSnapshotBeforeUpdate
   ├─ Mutation：DOM 操作（插入/更新/删除），同步执行
   ├─ Layout：useLayoutEffect 同步执行
   ├─ Passive：useEffect 异步调度执行
   └─ current 指针切换到 workInProgress 树
```

**面试追问：** *Render 阶段为什么可以中断？哪些生命周期在 Render 阶段会被多次调用？*
> Fiber 架构将渲染拆分为最小工作单元（每个 Fiber 节点）。`componentWillMount`、`componentWillReceiveProps`、`componentWillUpdate` 在 Render 阶段执行，可能被多次调用，因此在 React 16+ 被标记为 UNSAFE_。

> **💡 面试追问：React 的 `requestIdleCallback` 和 `MessageChannel` 在调度中分别扮演什么角色？为什么 React 不用 `requestIdleCallback` 做主调度？**
>
> **调度双引擎：**
> ```
> MessageChannel（主调度器）：
>   └─ 每个 Fiber 节点处理完后 postMessage → 下次宏任务继续
>   └─ 优先级高，50ms 内触发，适合短时间切片
> requestIdleCallback（后备/低优任务）：
>   └─ 浏览器空闲时执行，不保证触发时机
>   └─ 用于低优先级任务和数据预取
> ```
> **为什么不用 rIC 做主调度：** rIC 在 Safari 不支持、触发间隔不可控（可能 50ms+，导致卡顿）、Chrome 下最低 50ms 间隔不够激进。MessageChannel 提供更确定性的调度，在主流浏览器中均能达到约 5ms 的切片粒度。

### Q2：useEffect 的完整执行时序是什么？

```typescript
function Lifecycle() {
  useEffect(() => {
    console.log('1. 浏览器绘制后异步执行');
    return () => console.log('3. 清理（下次 effect 前/unmount 时）');
  });

  useLayoutEffect(() => {
    console.log('2. DOM 更新后、浏览器绘制前同步执行');
    return () => console.log('4. 清理');
  });
}
```

**执行顺序：**
```
Render → DOM 更新 → useLayoutEffect（同步）→ 浏览器绘制 → useEffect（异步）
```

### Q3：React 19 Actions 是什么？解决了什么问题？

**核心问题：** 表单提交需要手动管理 loading、error、success 状态，代码冗余：

```typescript
// ❌ React 18 中管理表单状态
const [pending, setPending] = useState(false);
const [error, setError] = useState<Error | null>(null);
const [data, setData] = useState(null);

async function handleSubmit(formData: FormData) {
  setPending(true);
  setError(null);
  try {
    const result = await submitAPI(formData);
    setData(result);
  } catch (e) {
    setError(e as Error);
  } finally {
    setPending(false);
  }
}

// ✅ React 19 Actions：useActionState + useFormStatus
const [state, formAction, pending] = useActionState(async (prev, formData) => {
  const result = await submitAPI(formData);
  return result;
}, null);
```

**Actions 的四大能力：**
1. **自动管理 pending**：`useFormStatus` 读取最近的 `<form>` 的 pending 状态
2. **乐观更新**：`useOptimistic` 假设请求成功提前展示结果
3. **渐进增强**：`<form action={formAction}>` 即使 JS 未加载也能提交
4. **表单重置**：`formAction` 成功后自动调用 `form.reset()`

### Q4：React 中 key 的作用和最佳实践？

```mermaid
flowchart LR
    subgraph 无 key / index 作为 key
        L1["A(0) B(1) C(2)"] -->|"首位插入 X"| L2["X(0) A(1) B(2) C(3)"]
        L2 --> L3["所有子节点全部重渲染！"]
    end

    subgraph 稳定唯一 key
        R1["A:id1 B:id2 C:id3"] -->|"首位插入 X:id4"| R2["X:id4 A:id1 B:id2 C:id3"]
        R2 --> R3["仅插入 X，复用 A/B/C"]
    end
```

**最佳实践：**
```
✅ 使用唯一且稳定的 ID（`item.id` / `crypto.randomUUID()`）
❌ 不要使用数组 index（插入/删除/排序时 bug）
❌ 不要使用随机数（每次渲染都不同，导致不必要重建）
❌ 不要使用 Math.random()（完全破坏缓存）
⚠️ 只有静态列表可用 index（不增删改排）
```

### Q5：React 18 Concurrent Mode 解决了什么问题？

**核心价值：** 紧急更新不被非紧急更新阻塞。

```
用户输入（紧急）     ❌ 被数据加载（非紧急）阻塞 → 界面卡顿
                    ✅ Concurrent: 输入优先，数据加载可中断
```

| 特性            | React 17（同步） | React 18（Concurrent）      |
| --------------- | ---------------- | --------------------------- |
| 渲染            | 一次更新完整执行 | 可中断/恢复                 |
| 优先级          | 无优先级         | 任务分 urgency / transition |
| 用户输入        | 被所有更新阻塞   | **高优更新跳队优先**        |
| Suspense        | 基础支持         | 流式 SSR + 选择性 hydration |
| startTransition | ❌                | ✅ 标记非紧急更新            |

### Q6：React 19 `use()` 与 useEffect 数据获取的区别？

```typescript
// 方式 1：useEffect + useState（React 18 及以前）
function User() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUser);
  }, []);
  if (!user) return <Spinner />;
  return <div>{user.name}</div>;
}

// 方式 2：use() + Suspense（React 19）
function User() {
  const user = use(fetchUserPromise);  // 直接消费 Promise
  return <div>{user.name}</div>;
}

// 父组件提供 Suspense 边界
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <User />
    </Suspense>
  );
}
```

| 维度     | useEffect + useState         | use() + Suspense            |
| -------- | ---------------------------- | --------------------------- |
| 代码量   | 多（loading/error 手动管理） | 少（Suspense 管理 loading） |
| 错误处理 | 手动 catch 设置 error        | ErrorBoundary 统一处理      |
| 竞态条件 | 需手动处理（ignore flag）    | 自动处理                    |
| 灵活性   | 高（完全控制）               | 受限于 Suspense 边界        |

> **💡 面试追问：`use(Promise)` 和 `await` 在 Suspense 中的行为有什么核心差异？**
>
> **核心差异：**
> ```
> use(Promise)：
>   └─ 只能用于 React 组件/Render 阶段
>   └─ 抛出 Promise → Suspense 边界捕获 → 显示 fallback
>   └─ Promise resolve 后从抛出点继续执行
>   └─ 无位置限制（可在条件/循环中使用）
>
> await：
>   └─ 只能在 async 函数中使用
>   └─ 暂停当前函数执行，不会抛出到 Suspense
>   └─ 需要手动处理 loading/error 状态
> ```
> **经验教训：** `use()` 更适合"渲染阶段的数据依赖"（如从 Context 中读取 Promise），`await` 适合"事件处理中的异步操作"（如表单提交）。

### Q7：React 合成事件（SyntheticEvent）是什么？

**为什么需要合成事件？**

```
原生事件问题：
  ├─ 浏览器兼容性差异（e.target / e.preventDefault 命名不同）
  ├─ 内存泄漏风险（事件未卸载）
  └─ 无法在 Fiber 架构中优化

合成事件的优势：
  ├─ 跨浏览器统一接口
  ├─ 事件池（React 16 前）减少 GC
  ├─ 事件委托到 root 节点（React 17 前 document → React 17+ root）
  └─ 与 Fiber 架构深度集成（优先级调度）
```

```typescript
// React 16：事件委托到 document
document.addEventListener('click', ReactEvent.listener);

// React 17+：事件委托到 root 节点
root.addEventListener('click', ReactEvent.listener);

// React 19：基于 createRoot 的事件系统
function handleClick(e: React.MouseEvent) {
  // e 是 SyntheticEvent，但行为与原生事件一致
  e.preventDefault();  // 跨浏览器
  e.stopPropagation();
}
```

### Q8：React Hooks 为什么不能放在条件/循环中？

**根本原因：** Hooks 存储在 Fiber 节点的 **单向链表** 中，依赖**调用顺序**来匹配状态。

```typescript
// Hooks 在 Fiber 中的存储结构
fiber.memoizedState = {
  queue: { pending: null },      // useState 的更新队列
  next: {                        // 指向下一个 Hook
    queue: { pending: null },    // useEffect 的 effect 链表
    next: {
      queue: { pending: null },  // useRef
      next: null
    }
  }
}

// ✅ 正确：每次渲染，Hooks 调用顺序和数量一致
function Good() {
  const [a] = useState(0);       // Hook #1
  const [b] = useState(0);       // Hook #2
  useEffect(() => {}, []);        // Hook #3
}

// ❌ 错误：条件语句导致 Hook 数量不一致
function Bad({ flag }) {
  const [a] = useState(0);       // Hook #1
  if (flag) {
    const [b] = useState(0);     // flag=false 时 Hook #2 不存在
  }
  useEffect(() => {}, []);       // flag=false 时变成了 Hook #2（本应是 #3）
  // → React 无法匹配正确的状态！
}
```

#### 🔥 React 19 例外：`use()` 可在条件中调用

React 19 新增的 `use()` Hook 打破了传统 Hooks 规则——它**可以在条件语句、循环、甚至提前 return 之后调用**：

```typescript
function ConditionalComponent({ showData }: { showData: boolean }) {
  // ❌ 传统 Hooks 不能在条件中
  // if (showData) {
  //   const [data] = useState(null); // 错！
  // }

  // ✅ use() 可以在条件中调用
  if (showData) {
    const data = use(fetchData());
    return <div>{data}</div>;
  }

  return <div>No data</div>;
}
```

**为什么 `use()` 可以例外？**
- `use()` 是**类 Promise 消费者**，不创建新的状态槽位
- 它通过当前 Fiber 的 Suspense 边界实现暂停/恢复，不依赖链表顺序匹配
- 这也是 React 19 对 Hooks 规则的一次"松绑"，但 **useState/useEffect/useCallback 等仍然必须遵守顺序规则**

### Q9：Server Component vs Client Component 的区别？

```tsx
// 🖥️ Server Component（默认）
// app/page.tsx
export default async function Page() {
  const data = await db.query('SELECT * FROM posts');
  // 1. 在服务器端执行（可访问数据库/文件系统/AI API）
  // 2. 不发送 JS bundle 到客户端
  // 3. 不可用 useState/useEffect/事件处理
  return <PostList posts={data} />;
}

// 💻 Client Component（需 'use client'）
// app/counter.tsx
'use client';
export function Counter() {
  // 1. 在客户端执行
  // 2. 可交互（事件/状态/副作用）
  // 3. 发送 JS bundle 到客户端
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

| 维度             | Server Component | Client Component |
| ---------------- | ---------------- | ---------------- |
| 执行位置         | **服务器**       | **浏览器**       |
| 访问 DB/FS       | ✅ 直接           | ❌ 只能通过 API   |
| useState/Effects | ❌ 不可用         | ✅ 可用           |
| JS Bundle        | **0KB**          | 发送到客户端     |
| 数据获取         | 直接 await       | use/useEffect    |
| API Key 安全     | ✅ 安全           | ❌ 暴露风险       |

### Q10：React.memo 和 useMemo 的区别？

| 特性         | React.memo           | useMemo      |
| ------------ | -------------------- | ------------ |
| **作用对象** | 组件                 | 值/计算      |
| **比较方式** | props 浅比较（默认） | 依赖数组比较 |
| **返回值**   | 新的组件             | 缓存的值     |
| **使用场景** | 避免组件重渲染       | 避免重复计算 |

```typescript
// React.memo：缓存整个组件
const ExpensiveComponent = React.memo(function Expensive({ data }) {
  return <div>{/* 复杂渲染 */}</div>;
});

// useMemo：缓存计算值
function Parent({ items }) {
  const sorted = useMemo(
    () => items.sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  return <ExpensiveComponent data={sorted} />;
}

// useCallback：缓存函数（等价于无参数的 useMemo）
const handleClick = useCallback(() => doSomething(id), [id]);
// 等价于：const handleClick = useMemo(() => () => doSomething(id), [id]);

// ⚠️ 安全提醒：useCallback 依赖不全 → 闭包陷阱
// ❌ 错误：const handle = useCallback(() => api.report(count), []);
// ✅ 正确：const handle = useCallback(() => api.report(count), [count]);
```

### Q11：React 19 Compiler 如何实现自动记忆化？

**原理：** Compiler 在编译阶段分析函数的作用域和依赖关系，自动推断哪些值和函数需要缓存。

```typescript
// 编译前（开发者写的代码）
function ProfilePage({ user }) {
  const title = user.name + '\'s Profile';
  const handleClick = () => showProfile(user.id);
  return <div onClick={handleClick}>{title}</div>;
}

// 编译后（React Compiler 自动转换）
function ProfilePage({ user }) {
  const $ = _c(2);                                        // 分配缓存槽
  let title, handleClick;

  if ($[0] !== user) {                                    // 依赖变化？
    title = user.name + '\'s Profile';
    handleClick = _F(() => showProfile(user.id));         // 自动缓存
    $[0] = user;
    $[1] = [title, handleClick];                         // 更新缓存
  } else {
    [title, handleClick] = $[1];                          // 复用缓存
  }

  return <div onClick={handleClick}>{title}</div>;
}
```

**关键机制：**
- `_c(n)`：分配 n 个缓存槽位
- `_F(fn)`：自动缓存函数引用
- 闭包语义感知：分析哪些外部变量被捕获
- 无手动依赖数组：Compiler 自动推导 `$[0] !== user`

> **💡 面试追问：React Compiler 在处理"外部可变引用"（比如 ref.current、全局对象）时有什么限制？**
>
> **三大限制：**
> ```
> 1. ref.current 突变不可感知
>    └─ Compiler 无法追踪 ref.current 的变化
>    └─ 解决方案：使用 useRef 声明式 RefObject，Compiler 忽略 ref.current
>
> 2. 全局/闭包中的可变变量
>    └─ Compiler 只分析函数作用域内的变量
>    └─ 模块级 let/const 对象突变 → Compiler 不缓存
>
> 3. ! 非标准模式
>    └─ Compiler 为了安全会保守跳过某些模式
>    └─ 通过 'use no memo' 指令手动退出
> ```
> **最佳实践：** 将副作用和可变操作封装到自定义 Hook 中，用 `'use memo'` 标记纯计算组件。

### Q12：React Fiber 架构如何实现可中断渲染？

**核心数据结构：Fiber 链表**

```typescript
// 对比：Stack Reconciler vs Fiber Reconciler

// React 15：函数调用栈（不可中断）
function render15(element) {
  if (typeof element.type === 'function') {
    const children = element.type(element.props);
    render15(children);  // 递归，必须执行完
  }
  // 直接操作 DOM
  document.appendChild(element);
}

// React 16+：Fiber 链表（可中断）
function workLoop(fiber: Fiber) {
  while (fiber && shouldYield() === false) {  // 每次检查是否让出
    fiber = performUnitOfWork(fiber);         // 处理一个 Fiber 节点
    if (fiber === null) {                     // 遍历完成
      commitRoot();                           // 提交 DOM 更新
      break;
    }
  }
  if (fiber) {
    requestIdleCallback(() => workLoop(fiber)); // 下次空闲继续
  }
}
```

**调度机制：** React 通过 `requestIdleCallback` 或 `MessageChannel` 实现时间切片，每次处理一个 Fiber 节点后检查是否超时（约 5ms），超时则让出主线程。

### Q13：React 事件机制与原生事件的区别？

| 对比项       | 原生 DOM 事件              | React 合成事件                            |
| ------------ | -------------------------- | ----------------------------------------- |
| **绑定方式** | `element.addEventListener` | `onClick={handler}`                       |
| **事件委托** | 分散绑定                   | **统一委托到 root**（React 17+）          |
| **跨浏览器** | 需兼容性处理               | ✅ 统一接口                                |
| **阻止冒泡** | `e.stopPropagation()`      | ✅ 同样支持                                |
| **性能**     | 多个 listener              | 内存中 1 个 listener                      |
| **异步访问** | 始终可访问                 | React 16 需 `e.persist()`，React 17+ 无需 |

### Q14：React Fiber 与 Vue 3 虚拟 DOM 的区别？

| 维度 | React Fiber | Vue 3 Virtual DOM |
|------|------------|-------------------|
| **数据结构** | 链表（Fiber Tree） | 树（VNode Tree） |
| **调度方式** | 可中断、优先级调度 | 同步更新 |
| **更新机制** | 双缓冲 | 一次性更新 |
| **优化策略** | Time Slicing | Block Tree + PatchFlag |

### Q15：React 19 Actions 与 Vue 3 的区别？

| 维度 | React Actions | Vue 3 |
|------|--------------|-------|
| **异步处理** | 原生支持 | 需要手动管理 |
| **状态管理** | 自动 pending | 需要 ref |
| **错误处理** | 原生支持 | 需要 try/catch |
| **乐观更新** | useOptimistic | 需要手动实现 |

### Q16：React Server Components 与 SSR 的区别？

| 维度 | RSC | SSR |
|------|-----|-----|
| **执行环境** | 服务端 | 服务端 |
| **输出** | 可序列化的组件 | HTML 字符串 |
| **客户端 JS** | 不包含服务端组件 | 包含所有组件 |
| **交互性** | 无（纯数据） | 有（Hydration） |

### Q17：类组件的 shouldComponentUpdate 与 React.memo 的关系？

**本质相同**：都是防止不必要的重渲染，但应用对象不同。

```typescript
// 类组件：shouldComponentUpdate 控制实例是否更新
class List extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.items !== this.props.items; // 浅比较
  }
  render() { /* ... */ }
}

// 函数组件：React.memo 包裹组件实现同样效果
const List = React.memo(function List({ items }) {
  return /* ... */;
});

// 自定义比较函数
const List = React.memo(
  () => { /* ... */ },
  (prevProps, nextProps) => prevProps.items === nextProps.items
);
```

| 维度 | shouldComponentUpdate | React.memo |
|------|----------------------|------------|
| 适用组件 | 类组件 | 函数组件 |
| 比较方式 | 手动实现 | 默认浅比较，可自定义 |
| 返回值 | boolean（是否更新） | boolean（是否跳过） |
| 实现位置 | 组件内部 | 组件外部包裹 |

### Q18：React 中 setState 是同步还是异步？

**结论：看执行上下文。**

```typescript
class Example extends React.Component {
  state = { count: 0 };

  handleClick = () => {
    // ✅ React 合成事件：异步（批量）
    this.setState({ count: this.state.count + 1 });
    console.log(this.state.count); // 0（未更新）
  };

  componentDidMount() {
    // ✅ 生命周期：异步（批量）
    this.setState({ count: 1 });
    console.log(this.state.count); // 0

    // ❌ 原生事件：同步（React 17-）/ 异步（React 18+ 自动批处理）
    document.addEventListener('click', () => {
      this.setState({ count: 2 });
      console.log(this.state.count); // React 17-: 2, React 18+: 0
    });

    // ❌ setTimeout：React 17- 同步，React 18+ 自动批处理
    setTimeout(() => {
      this.setState({ count: 3 });
      console.log(this.state.count); // React 17-: 3, React 18+: 0
    }, 0);
  }
}
```

| 场景 | React 17- | React 18+ |
|------|-----------|-----------|
| 合成事件 | 异步（批量） | 异步（批量） |
| 生命周期 | 异步（批量） | 异步（批量） |
| setTimeout/Promise | **同步** | **异步（自动批处理）** |
| 原生事件 | **同步** | **异步（自动批处理）** |
| flushSync | — | ✅ 强制同步 |

#### 🔥 React 19 函数组件中的更新行为

```typescript
function FunctionComponent() {
  const [count, setCount] = useState(0);

  // ✅ React 18+ 所有场景自动批处理
  const handleClick = () => {
    setCount(c => c + 1); // 不会立即渲染
    setCount(c => c + 1); // 合并为一次渲染
  };

  // ✅ React 19 Actions 中的状态更新自动批处理
  const [state, formAction] = useActionState(async (prev, formData) => {
    setCount(c => c + 1); // 在 Action 中也是异步批量
    await save(formData);
    return { success: true };
  }, null);

  // ⚡ flushSync 强制同步（React 18+，需要时用）
  const handleSync = () => {
    flushSync(() => setCount(1)); // 立即渲染
  };
}
```

**最佳实践总结：**

| 版本 | 行为变化 | 对开发者的影响 |
|------|---------|--------------|
| React 17- | 合成事件内异步批量；setTimeout/Promise 同步 | 需注意异步场景下可能多次渲染 |
| React 18+ | **所有场景自动批处理** | 行为更一致，性能更好 |
| React 19 | Actions 内自动批处理 + 支持 `useOptimistic` 乐观更新 | 表单场景减少手动状态管理 |

### Q19：自定义 Hook 的命名规范和设计原则？

**命名规范：** 必须以 `use` 开头（React 通过命名检测 Hook 规则，相关 ESLint 规则依赖此前缀）。

```typescript
// ✅ 正确命名
function useLocalStorage<T>(key: string, initialValue: T) { /* ... */ }
function useWindowSize() { /* ... */ }
function useDebounce<T>(value: T, delay: number): T { /* ... */ }

// ❌ 错误：不以 use 开头
function localStorage(key, initial) { /* ... */ }
// 后果：ESLint 无法检查 Hook 调用规则，建议不通过
```

**设计原则（S-I-D）：**

```typescript
// 1️⃣ Single Responsibility（单一职责）
// ❌ 一个 Hook 做太多事
function useUserAndTheme() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  return { user, theme };
}

// ✅ 拆分为独立 Hook
function useUser() { /* ... */ }
function useTheme() { /* ... */ }

// 2️⃣ 返回值一致性
function useData<T>(url: string) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });
  // ... 统一返回 { data, loading, error }
  return state;
}

// 3️⃣ 输入输出清晰
function useDebounce<T>(value: T, delay: number): T {
  // 输入明确，输出单一
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

### Q20：React 中受控组件和非受控组件的选择策略？

```typescript
// 受控组件（推荐大多数场景）
function ControlledForm() {
  const [email, setEmail] = useState('');
  const handleSubmit = () => {
    // 提交时可以读取最新 state，无需访问 DOM
    submitAPI(email);
  };
  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button>提交</button>
    </form>
  );
}

// 非受控组件（简单场景/文件上传）
function UncontrolledForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = () => {
    // 需要时才从 DOM 读取
    console.log(inputRef.current?.value);
  };
  // defaultValue 只初始化一次，后续变化不影响
  return <input ref={inputRef} defaultValue="默认值" />;
}
```

**选择策略树：**

```
需要实时校验/格式化？ → ✅ 受控组件
仅提交时读取一次值？ → ✅ 非受控组件
文件上传（<input type="file">）？→ ✅ 非受控（只读）
动态控制表单值（禁用/填充）？→ ✅ 受控组件
第三方 JS 库集成（如富文本）？→ ✅ 非受控 + ref
```

### Q21：forwardRef 的作用和 React 19 的变化？

```typescript
// React 18：必须用 forwardRef
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// React 19：ref 可直接作为 prop
function Input({ ref, ...props }: InputProps & { ref: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
// React 19 不再需要 forwardRef，ref 可以和 props 一样传递

// useImperativeHandle：控制暴露给父组件的方法
const FancyInput = forwardRef(function FancyInput(_, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { inputRef.current!.value = ''; },
    scrollToView: () => inputRef.current?.scrollIntoView(),
  }), []);
  return <input ref={inputRef} />;
});
```

| 版本 | 传递 ref 方式 | 是否需要 forwardRef |
|------|-------------|-------------------|
| React 16-18 | forwardRef 包裹 | ✅ 必须 |
| React 19 | ref 直接作为 prop | ❌ 不需要（但 forwardRef 仍可用） |

### Q22：React Portal 的使用场景和事件冒泡机制？

```typescript
import { createPortal } from 'react-dom';

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body // 挂载到 body，脱离父容器 DOM 层级
  );
}

function App() {
  return (
    <div onClick={() => console.log('App clicked')}>
      <Modal onClose={() => console.log('close')}>
        <p>弹窗内容</p>
      </Modal>
    </div>
  );
}
// 点击弹窗内容 → "close" ✅（父子关系由 React 树决定，不是 DOM 树）
```

**关键规则：**
- **事件冒泡**：沿 React 组件树冒泡，不是 DOM 树
- **Context**：Portal 内可访问父组件的 Context
- **CSS 隔离**：DOM 层级独立，不受父容器 overflow/z-index 限制

### Q23：ErrorBoundary 为什么必须是类组件？函数组件怎么实现错误处理？

```typescript
// ErrorBoundary 必须是类组件的原因：
// 只有类组件有 componentDidCatch 和 getDerivedStateFromError 生命周期
class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Caught:', error, info.componentStack);
    // 上报错误监控
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h2>出错了：{this.state.error?.message}</h2>;
    }
    return this.props.children;
  }
}

// 函数组件方案：封装 ErrorBoundary 为 Hook 或使用第三方库
// react-error-boundary（推荐）
import { ErrorBoundary } from 'react-error-boundary';

function Fallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback} onError={logError}>
      <MyComponent />
    </ErrorBoundary>
  );
}

// React 19 中 use() + ErrorBoundary 处理异步错误
function AsyncComponent() {
  const data = use(fetchData());
  return <div>{data}</div>;
}
// 异步错误被 ErrorBoundary 捕获
```

| 能捕获 | 不能捕获 |
|--------|---------|
| 渲染错误 | 事件处理错误 |
| 生命周期错误 | 异步代码（setTimeout） |
| 构造函数错误 | 服务端渲染错误 |
| 子组件树错误 | ErrorBoundary 自身错误 |

### Q24：React 19 useOptimistic 的实现原理和适用场景？

```typescript
import { useOptimistic, useTransition } from 'react';

interface Todo { id: number; text: string; done: boolean; }

function TodoList({ todos: initialTodos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    initialTodos,
    (state, newTodo: Todo) => [...state, { ...newTodo, pending: true }]
  );

  const [, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    const text = formData.get('text') as string;
    const tempId = Date.now();

    // 1. 乐观更新：立即在 UI 中显示
    addOptimisticTodo({ id: tempId, text, done: false });

    try {
      // 2. 实际提交
      const saved = await saveTodo({ text });
      // useOptimistic 会自动回退到实际数据
    } catch {
      // 3. 失败时自动回滚
      console.error('Failed to save');
    }
  };

  return (
    <form action={handleSubmit}>
      <input name="text" />
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text}
          </li>
        ))}
      </ul>
    </form>
  );
}
```

**适用场景：**
- ✅ 消息发送（即时显示，后台发送）
- ✅ 点赞/收藏（即时 UI 反馈）
- ✅ 删除操作（立即移除，失败恢复）
- ✅ 表单提交（乐观显示结果）

**原理：** useOptimistic 在底层维护一个"乐观状态"，当 `addOptimisticTodo` 调用时，React 立即用更新函数计算新的乐观状态并渲染；当实际数据返回后，React 自动丢弃乐观状态，切换到真实数据。

### Q25：Hooks 闭包陷阱（Stale Closure）的成因和解决方案？

```typescript
function Timer() {
  const [count, setCount] = useState(0);

  // ❌ 问题：闭包捕获了过时的 count
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count);      // 始终是 0
      setCount(count + 1);     // 始终设置为 1
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖数组，count 被冻结在首次渲染的值

  return <div>{count}</div>;
}
```

**成因：** `useEffect` 的回调闭包捕获了创建时的 `count` 值（首次渲染时为 0），后续渲染虽然创建了新的 `count`，但 effect 的闭包中引用的是旧的 `count`。

**四种解决方案：**

```typescript
// ✅ 方案 1：函数式更新（适用于 setState 场景）
useEffect(() => {
  const timer = setInterval(() => {
    setCount(prev => prev + 1); // 不依赖外部 count
  }, 1000);
  return () => clearInterval(timer);
}, []);

// ✅ 方案 2：添加依赖项（适用于非 setState 场景）
useEffect(() => {
  const timer = setInterval(() => {
    setCount(count + 1);
    sendLog(count); // 需要最新 count 的其他操作
  }, 1000);
  return () => clearInterval(timer);
}, [count]); // 依赖变化时重新创建 timer

// ✅ 方案 3：useRef 保存最新值
const countRef = useRef(count);
useEffect(() => { countRef.current = count; }, [count]);

useEffect(() => {
  const timer = setInterval(() => {
    console.log(countRef.current); // ✅ 总是最新
    setCount(countRef.current + 1);
  }, 1000);
  return () => clearInterval(timer);
}, []);

// ✅ 方案 4：useCallback + ref（适用于回调函数）
function useLatestCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;

  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
```

#### 🔗 useCallback 与闭包陷阱的特殊关系

```typescript
// ❌ 典型错误：useCallback 闭包捕获旧值
const [count, setCount] = useState(0);

const handleClick = useCallback(() => {
  // ❌ count 被锁在首次创建时的值（通常是 0）
  api.report(count);
  setCount(count + 1); // 始终是 count + 1 = 1
}, []); // 空依赖 → 闭包冻结

// ✅ 正确：补齐依赖
const handleClick = useCallback(() => {
  api.report(count);
  setCount(count + 1);
}, [count]); // count 变化时重建函数

// ✅ 更优：能用函数式更新就用函数式
const handleClick = useCallback(() => {
  setCount(prev => prev + 1); // 无需依赖 count
}, []); // 无需 count 依赖

// ✅ 如果还要读取最新值做其他操作：useRef
const countRef = useRef(count);
useEffect(() => { countRef.current = count; }, [count]);

const handleClick = useCallback(() => {
  api.report(countRef.current); // 总是最新值
}, []);
```

**核心原则：** useCallback 的闭包陷阱本质与 useEffect 一致——依赖数组决定了函数能"看到"哪些变量。补齐依赖或用 ref 绕过闭包。

### Q26：React HOC、Render Props、Hooks 三种复用方案对比？

```typescript
// 1️⃣ HOC（高阶组件）- 装饰器模式
function withLoading<P>(WrappedComponent: React.ComponentType<P>) {
  return function WithLoading(props: P & { loading: boolean }) {
    const { loading, ...rest } = props as any;
    if (loading) return <Spinner />;
    return <WrappedComponent {...rest} />;
  };
}
const UserListWithLoading = withLoading(UserList);

// 2️⃣ Render Props - 函数作为 children
function DataProvider({ children }: { children: (data: any) => ReactNode }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetchData().then(setData); }, []);
  return children(data);
}
// 使用
<DataProvider>
  {data => data ? <UserList data={data} /> : <Spinner />}
</DataProvider>

// 3️⃣ Hooks - 组合式函数
function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [url]);
  return { data, loading };
}
// 使用
function UserList() {
  const { data, loading } = useData<User[]>('/api/users');
  if (loading) return <Spinner />;
  return <List data={data} />;
}
```

| 维度 | HOC | Render Props | Hooks |
|------|-----|-------------|-------|
| 代码量 | 多 | 多 | 少 |
| 命名冲突 | ⚠️ props 合并可能冲突 | ✅ 不会 | ✅ 不会 |
| 嵌套层级 | 深（多层包裹） | 深（回调嵌套） | 浅（扁平） |
| 静态类型 | ⚠️ 复杂 | ⚠️ 复杂 | ✅ 友好 |
| Tree Shaking | ❌ 困难 | ❌ 困难 | ✅ 容易 |
| 学习曲线 | 中 | 中 | 低 |
| **推荐度** | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |

### Q27：useMemo 和 useCallback 什么时候必须用？

```typescript
// ✅ 必须用 useMemo：计算开销大
function ExpensiveList({ items, filter }: { items: Item[]; filter: string }) {
  const filteredItems = useMemo(
    () => items
      .filter(item => item.name.includes(filter))
      .sort((a, b) => expensiveCompare(a, b)),
    [items, filter]
  );
  return <List data={filteredItems} />;
}

// ✅ 必须用 useCallback：作为 React.memo 子组件的 props
const MemoChild = React.memo(Child);

function Parent() {
  const handleClick = useCallback((id: number) => {
    dispatch({ type: 'SELECT', payload: id });
  }, [dispatch]);

  return <MemoChild onClick={handleClick} />; // 无 useCallback → 每次都新函数 → memo 失效
}

// ✅ 必须用 useCallback：作为 useEffect 的依赖
function Component({ id }: { id: number }) {
  const fetchItem = useCallback(async () => {
    const res = await fetch(`/api/items/${id}`);
    return res.json();
  }, [id]);

  useEffect(() => {
    fetchItem().then(setItem);
  }, [fetchItem]); // fetchItem 引用不变 → 避免无限循环
}

// ❌ 不需要：简单计算
const fullName = firstName + ' ' + lastName; // 不用 useMemo

// ❌ 不需要：作为原生事件处理函数
function Button() {
  const handleClick = () => console.log('clicked'); // 每次渲染新函数，但原生元素无影响
  return <button onClick={handleClick}>Click</button>;
}
```

| 场景 | 是否需要 | 原因 |
|------|---------|------|
| 昂贵计算（排序/过滤/格式化） | ✅ useMemo | 避免每次渲染重复计算 |
| React.memo 子组件的 props | ✅ useCallback | 保持引用稳定 |
| useEffect 的依赖函数 | ✅ useCallback | 防止无限循环 |
| 简单计算 | ❌ 不需要 | 开销小于 Hook 本身 |
| 原生元素事件 | ❌ 不需要 | DOM 元素不检查 props 引用 |

#### ⚠️ useCallback 安全风险补充

| 风险 | 原因 | 解决方案 |
|------|------|---------|
| **闭包陷阱** | 依赖漏写，函数锁住旧值 | 开启 `exhaustive-deps` ESLint 规则，补齐所有依赖 |
| **缓存失效** | 依赖中传入字面量对象/数组，每次渲染都是新引用 | 用 `useMemo` 稳定引用后做依赖 |
| **内存泄漏** | 监听/定时器中使用缓存函数，解绑时用了旧引用 | `useEffect` 返回清理函数，将 handler 加入依赖 |
| **反向性能** | 滥用 useCallback + React.memo，比较开销大于重渲染开销 | 只在传给 memo 子组件 / useEffect 依赖时使用 |
| **异步旧值** | setTimeout/Promise 中读取闭包捕获的旧 state | 用 ref 保存最新值，或用函数式更新 `setState(prev => ...)` |

### Q28：React 中 useEffect 的清理函数什么时机执行？

```typescript
function EffectCleanup() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Effect 执行', count);

    return () => {
      console.log('清理', count); // 捕获创建时的 count
    };
  }, [count]);

  // 执行顺序：
  // 挂载:   Effect 执行 0
  // count=1: 清理 0 → Effect 执行 1
  // count=2: 清理 1 → Effect 执行 2
  // 卸载:   清理 2
}
```

**三个执行时机：**

| 时机 | 说明 |
|------|------|
| **依赖变化** | 重新执行 effect 前，先清理上一次 effect |
| **组件卸载** | 组件从 DOM 移除前，执行最后一次清理 |
| **StrictMode 开发环境** | 组件挂载→卸载→重新挂载，检测清理是否遗漏 |

```typescript
function DataFetcher({ id }: { id: number }) {
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/data/${id}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setData(data));

    // 清理：id 变化或组件卸载时，取消进行中的请求
    return () => controller.abort();
  }, [id]);
}
```

### Q29：React 中 Context 的性能问题如何优化？

```typescript
// ❌ 问题：Context value 每次渲染都创建新对象
function App() {
  const [user, setUser] = useState({ name: 'Alice' });

  // 每次 App 渲染都创建新对象 → 所有消费者都重渲染
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Profile />
      <Settings />
    </UserContext.Provider>
  );
}

// ✅ 方案 1：拆分 Context（高频/低频分开）
const UserContext = createContext<User | null>(null);
const UserDispatchContext = createContext<Dispatch | null>(null);

function App() {
  const [user, dispatch] = useReducer(userReducer, null);

  return (
    <UserDispatchContext.Provider value={dispatch}>
      <UserContext.Provider value={user}>
        <Profile />    {/* 只关心 user */}
        <Settings />   {/* 只关心 dispatch */}
      </UserContext.Provider>
    </UserDispatchContext.Provider>
  );
}

// ✅ 方案 2：useMemo 缓存 value
function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ✅ 方案 3：对于不需要 Context 的组件，使用 React.memo
const MemoizedProfile = React.memo(Profile);
// 或者用 useMemo 包裹 JSX
```

**Context 优化的核心原则：**
1. **拆分细粒度**：读和写分开，高频更新和低频更新分开
2. **缓存 value**：Provider 的 value 用 useMemo 包装
3. **局部状态优先**：能用 props 传递就不要用 Context

### Q30：React 19 中 useActionState 和 useFormStatus 如何配合使用？

```typescript
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

// 服务端 Action 函数
async function submitOrder(_prev: any, formData: FormData) {
  const items = formData.get('items');
  const address = formData.get('address');

  try {
    const order = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, address }),
    });
    return { success: true, orderId: order.id };
  } catch (e) {
    return { success: false, error: '提交失败，请重试' };
  }
}

// 提交按钮子组件（使用 useFormStatus 获取最近的 form 状态）
function SubmitButton() {
  const { pending, data } = useFormStatus();
  // pending: 表单是否正在提交
  // data: 当前 FormData

  return (
    <button type="submit" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Spinner /> 提交中...
        </span>
      ) : (
        '提交订单'
      )}
    </button>
  );
}

// 表单主组件
function OrderForm() {
  const [state, formAction] = useActionState(submitOrder, null);

  return (
    <form action={formAction}>
      <input name="address" required />
      <input type="hidden" name="items" value={JSON.stringify(cartItems)} />

      <SubmitButton />

      {state?.success && (
        <div className="success">下单成功！订单号：{state.orderId}</div>
      )}
      {state?.error && (
        <div className="error">{state.error}</div>
      )}
    </form>
  );
}
```

### Q31：React 事件代理机制中，e.stopPropagation() 为何不能阻止原生事件冒泡？

```typescript
function App() {
  useEffect(() => {
    // 原生事件绑定在 root 上
    document.getElementById('root')?.addEventListener('click', () => {
      console.log('Native: root clicked'); // 仍然会执行！
    });
  }, []);

  return (
    <div onClick={() => console.log('React: div clicked')}>
      <button onClick={(e) => {
        e.stopPropagation();
        console.log('React: button clicked');
      }}>
        点击
      </button>
    </div>
  );
}

// 点击按钮输出：
// "React: button clicked"
// "React: div clicked"  — ❌ 奇怪，不是阻止了吗？
```

**原因：** React 的事件代理机制中，`e.stopPropagation()` 阻止的是 **React 合成事件的冒泡**，但是原生事件已经通过事件代理冒泡到了 root 节点上才被 React 拦截处理。具体来说：

1. 用户点击 `<button>` → 原生事件冒泡到 `root` 节点
2. React 在 root 上的统一监听器捕获到该事件
3. React 创建合成事件，在 **Fiber 树**上模拟事件冒泡
4. `e.stopPropagation()` 阻止的是这个**模拟的冒泡过程**
5. 原生事件本身已经冒泡完成

**正确阻止原生事件冒泡：**

```typescript
// ✅ 使用 addEventListener 在捕获阶段阻止
function Button() {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    const handler = (e: Event) => e.stopPropagation();
    el?.addEventListener('click', handler);
    return () => el?.removeEventListener('click', handler);
  }, []);

  return (
    <button ref={ref} onClick={(e) => {
      e.nativeEvent.stopImmediatePropagation(); // 立即阻止所有监听器
    }}>
      点击
    </button>
  );
}
```

### Q32：React 中如何实现组件间通信？（所有方式总结）

```mermaid
graph TB
    subgraph 组件通信方式
        A["父→子"] -->|props| B["Props 传递"]
        C["子→父"] -->|回调| D["回调函数"]
        E["兄弟"] -->|状态提升| F["共同父组件转发"]
        G["跨层级"] -->|Context| H["Context API"]
        I["任意"] -->|全局状态| J["Redux / Zustand"]
        K["DOM 直接访问"] -->|ref| L["useRef / forwardRef"]
    end
```

```typescript
// 1️⃣ 父→子：Props
function Child({ name }: { name: string }) {
  return <div>{name}</div>;
}
function Parent() {
  return <Child name="Alice" />;
}

// 2️⃣ 子→父：回调函数
function Child({ onAction }: { onAction: (data: string) => void }) {
  return <button onClick={() => onAction('hello')}>触发</button>;
}
function Parent() {
  return <Child onAction={(data) => console.log(data)} />;
}

// 3️⃣ 兄弟：状态提升
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <CounterDisplay count={count} />
      <CounterControls onIncrement={() => setCount(c => c + 1)} />
    </>
  );
}

// 4️⃣ 跨层级：Context
const ThemeCtx = createContext('light');

// 5️⃣ 全局：Zustand
const useStore = create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }));

// 6️⃣ 修改子组件：forwardRef + useImperativeHandle
const Child = forwardRef((_, ref) => {
  useImperativeHandle(ref, () => ({ focus: () => console.log('focus') }));
  return <input />;
});
```

| 方式 | 复杂度 | 适用场景 | 耦合度 |
|------|--------|---------|--------|
| Props | 🟢 低 | 父子直接传递 | 高 |
| 回调函数 | 🟢 低 | 子传父 | 高 |
| 状态提升 | 🟡 中 | 兄弟组件 | 中 |
| Context | 🟡 中 | 跨层级共享 | 低 |
| 全局状态（Zustand/Redux） | 🔴 高 | 任意组件 | 低 |
| ref + forwardRef | 🟡 中 | 命令式操作 | 高 |

### Q33：React 合成事件与原生事件混用需要注意什么？

```typescript
function MixedEvents() {
  const ref = useRef<HTMLDivElement>(null);

  // 原生事件绑定
  useEffect(() => {
    const el = ref.current;
    const nativeHandler = () => console.log('1. Native');
    el?.addEventListener('click', nativeHandler);
    return () => el?.removeEventListener('click', nativeHandler);
  }, []);

  // React 事件
  const reactHandler = () => console.log('2. React');

  return <div ref={ref} onClick={reactHandler}>点击</div>;
}
// 输出：1. Native → 2. React

// 注意：混合使用时的执行顺序
// 原生事件在捕获/冒泡阶段执行
// React 事件在原生事件冒泡到 root 后执行
```

**注意事项总结：**

| 问题 | 说明 |
|------|------|
| 执行顺序 | 原生事件先于 React 事件（因为 React 事件代理在 root） |
| 阻止冒泡 | 原生 `e.stopPropagation()` 阻止 React 事件处理 |
| 内存泄漏 | 原生事件需在 useEffect 清理函数中移除 |
| 优先级 | React 事件可享受并发优先级调度，原生事件不能 |
| **最佳实践** | 优先使用 React 事件，避免混用 |

### Q34：React 中 key 使用数组索引有什么危害？

```typescript
// ❌ 危害：列表重排时状态错乱
function BuggyList() {
  const [items, setItems] = useState([
    { id: 1, name: 'A', input: '' },
    { id: 2, name: 'B', input: '' },
  ]);

  const moveToTop = (index: number) => {
    const [removed] = items.splice(index, 1);
    items.unshift(removed);
    setItems([...items]); // 使用索引作为 key
  };

  return (
    <>
      {items.map((item, index) => (
        <div key={index}> {/* ❌ 索引作为 key */}
          <input
            value={item.input}
            onChange={e => {
              const newItems = [...items];
              newItems[index].input = e.target.value;
              setItems(newItems);
            }}
          />
          <button onClick={() => moveToTop(index)}>置顶</button>
        </div>
      ))}
    </>
  );
}
// 问题：输入框内容在置顶操作后会错乱
// 因为 React 按 key 匹配组件，索引 0 → 'B' 但输入框显示的仍是之前的 value
```

**使用索引作为 key 的三个危害：**

| 危害 | 场景 | 表现 |
|------|------|------|
| 状态错乱 | 有状态组件（input/checkbox）的列表重排 | 状态与元素不匹配 |
| 性能下降 | 列表插入/删除/排序 | 所有子节点重新创建 |
| 动画失效 | 使用 TransitionGroup 或 framer-motion | 元素被错误识别为新增/删除 |

### Q35：React 18 的自动批处理（Automatic Batching）是怎么实现的？

```typescript
// React 17 及以前：仅在合成事件中批处理
function handleClick() {
  // 合成事件内 → 批处理（1 次渲染）
  setCount(c => c + 1);
  setFlag(f => !f);
}

setTimeout(() => {
  // setTimeout 中 → 不批处理（2 次渲染）
  setCount(c => c + 1); // 第 1 次渲染
  setFlag(f => !f);     // 第 2 次渲染
}, 0);

// React 18：所有场景自动批处理
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 1 次渲染 ✅
}

setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 1 次渲染 ✅（React 18 新行为）
}, 0);

fetch('/api/data').then(() => {
  setLoading(false);
  setData(result);
  // 1 次渲染 ✅
});
```

**实现原理：** React 18 引入了一个全局的"更新上下文"（更新批次），所有更新在同一个微任务/宏任务中被收集，当当前执行栈清空时统一提交。这通过 `startTransition` 内部的机制扩展到所有异步场景。

**如果想跳过批处理：**

```typescript
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => setCount(c => c + 1)); // 立即渲染
  flushSync(() => setFlag(f => !f));     // 第二次渲染
}
```

> **💡 面试追问：React 18 的自动批处理（Automatic Batching）在微任务和事件处理器中的行为有什么区别？用 `flushSync` 强制退出批处理时需要注意什么？**
>
> **批处理范围差异：**
> ```
> 事件处理器：✅ 自动批处理（React 17 已支持）
> setTimeout/Promise/microtask：✅ 自动批处理（React 18 新增）
> 原生事件：✅ 自动批处理（React 18 新增）
> ```
> **`flushSync` 注意事项：**
> ```
> 1. 每次 flushSync 触发一次独立的渲染 → 性能代价
> 2. flushSync 之间 DOM 会同步更新 → 可能出现布局抖动
> 3. flushSync 内不能嵌套 flushSync → 会抛异常
> 4. 应在真实的"需要同步 DOM 操作"场景使用（如测量布局）
> ```

### Q36：React 中 props 和 state 的本质区别？

| 维度 | props | state |
|------|-------|-------|
| 来源 | 父组件传入 | 组件内部初始化 |
| 可变性 | **不可变**（只读） | 可通过 setState/useState 修改 |
| 触发渲染 | 父组件重新渲染传入新 props | 调用 setState/useState dispatch |
| 作用范围 | 当前组件及其子组件 | 当前组件 |
| 默认值 | `Component.defaultProps` | `useState(initialValue)` |

```typescript
// props：父组件控制，组件自身不可修改
function Child({ name, onAction }: { name: string; onAction: () => void }) {
  // name 只读，不能修改
  // name = 'new name' ❌
  return <button onClick={onAction}>{name}</button>;
}

// state：组件自有，通过 setState 修改
function Counter() {
  const [count, setCount] = useState(0); // 组件自有状态
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// 核心原则：props 向下流动，state 本地管理
// props → 组件 → state
//    ↓              ↓
//  子组件          setState
```

### Q37：React 中 PureComponent 和 Component 的区别？

```typescript
import React, { PureComponent, Component } from 'react';

// Component：默认每次调用 setState 都重新渲染（shouldComponentUpdate 返回 true）
class RegularList extends Component<{ items: string[] }> {
  render() {
    console.log('RegularList rendered');
    return <ul>{this.props.items.map(i => <li key={i}>{i}</li>)}</ul>;
  }
}

// PureComponent：自动浅比较 props/state（shouldComponentUpdate 自动实现）
class PureList extends PureComponent<{ items: string[] }> {
  render() {
    console.log('PureList rendered');
    return <ul>{this.props.items.map(i => <li key={i}>{i}</li>)}</ul>;
  }
}

function Parent() {
  const [count, setCount] = useState(0);
  const items = ['A', 'B', 'C'];

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* ⚠️ items 每次渲染都创建新数组！PureComponent 浅比较 → 引用不同 → 还是重新渲染 */}
      <PureList items={items} />
      <RegularList items={items} />
    </div>
  );
}
```

**PureComponent 的局限性：**

| 问题 | 示例 | 后果 |
|------|------|------|
| 浅比较 | `{ a: { b: 1 } }` 与 `{ a: { b: 1 } }` | 引用不同 → 重新渲染 |
| 内联对象 | `items={['A']}` | 每次新引用 → 重新渲染 |
| 内联函数 | `onClick={() => {}}` | 每次新引用 → 重新渲染 |
| 深层嵌套 | `data.list.items` | 只比较 data 引用，内部变化检测不到 |

**三者对比：**

| 维度 | Component | PureComponent | React.memo |
|------|-----------|--------------|------------|
| 适用 | 类组件 | 类组件 | 函数组件 |
| 比较策略 | 不比较（总是渲染） | props 浅比较 | props 浅比较（可自定义） |
| 性能 | 可能过度渲染 | 避免部分重渲染 | 避免部分重渲染 |
| 使用建议 | 简单场景 | 纯展示组件 | 纯展示函数组件 |

### Q38：React 中 Fragment（<></>）的作用和原理？

```typescript
// ❌ 问题：JSX 必须有一个根元素
function Table() {
  return (
    <table>
      <tr>
        <td>A</td>
        <td>B</td>
      </tr>
      {/* <td>C</td> <td>D</td> 不能直接放，需要额外包裹 */}
    </table>
  );
}

// ✅ 使用 Fragment：不产生额外 DOM 节点
function Table() {
  return (
    <table>
      <tr>
        <Columns />
      </tr>
    </table>
  );
}

function Columns() {
  return (
    <>
      <td>列1</td>
      <td>列2</td>
    </>
  );
  // 编译为：
  // React.createElement(React.Fragment, null,
  //   React.createElement('td', null, '列1'),
  //   React.createElement('td', null, '列2')
  // );
}
```

| 写法 | 是否产生 DOM 节点 | 是否支持 key |
|------|-----------------|-------------|
| `<></>` | ❌ 无 | ❌ 不支持 |
| `<Fragment></Fragment>` | ❌ 无 | ✅ 支持 |
| `<div></div>` | ✅ 有 | ✅ 支持 |

```typescript
// Fragment 需要 key 的场景：循环列表
function Glossary({ items }: { items: { term: string; desc: string }[] }) {
  return (
    <dl>
      {items.map(item => (
        <Fragment key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.desc}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

**原理：** `React.Fragment` 是一个特殊的组件类型，React 在渲染时不会为其创建 DOM 节点，只渲染其子节点。源码中通过 `REACT_FRAGMENT_TYPE` 标记，在 commit 阶段跳过 DOM 操作。

### Q39：React 中 ref 的几种使用方式及各自适用场景？

```typescript
import { useRef, createRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// 1️⃣ useRef（函数组件，推荐）
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => inputRef.current?.focus();
  return <><input ref={inputRef} /><button onClick={focusInput}>聚焦</button></>;
}

// 2️⃣ createRef（类组件）
class ClassInput extends React.Component {
  inputRef = createRef<HTMLInputElement>();
  componentDidMount() { this.inputRef.current?.focus(); }
  render() { return <input ref={this.inputRef} />; }
}

// 3️⃣ 回调 Refs（更精细的控制）
function CallbackInput() {
  const [height, setHeight] = useState(0);

  const measureRef = useCallback((node: HTMLInputElement | null) => {
    if (node !== null) {
      setHeight(node.getBoundingClientRect().height);
    }
  }, []); // 注意：回调 ref 在组件更新时不会重新调用（除非 deps 变化）

  return <input ref={measureRef} />;
}

// 4️⃣ forwardRef（透传 ref 到子组件 DOM）
const FancyButton = forwardRef<HTMLButtonElement, { children: ReactNode }>(
  (props, ref) => <button ref={ref} className="fancy">{props.children}</button>
);

// 5️⃣ useImperativeHandle（控制暴露的 API）
const CustomInput = forwardRef<{ focus: () => void; clear: () => void }, {}>(
  (_, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => { inputRef.current!.value = ''; },
    }), []);
    return <input ref={inputRef} />;
  }
);
```

**ref 的使用场景总结：**

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 管理焦点/文本选择 | useRef | 最简洁 |
| 媒体播放（video/audio） | useRef | DOM 控制 |
| 动画触发 | useRef + callback ref | 可获取 DOM 测量值 |
| 保存可变值（不触发渲染） | **useRef** | `.current` 修改不触发重渲染 |
| 与第三方库集成（D3/Chart） | callback ref | 可获取 DOM 测量和通知 |
| 暴露子组件方法 | forwardRef + useImperativeHandle | 封装性好 |

### Q40：React 中 StrictMode 的作用和检测机制？

```typescript
import { StrictMode } from 'react';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**StrictMode 在开发环境做的检测：**

| 检测项 | 机制 | 目的 |
|--------|------|------|
| **不安全的生命周期** | 警告 UNSAFE_componentWillMount 等 | 引导迁移到安全生命周期 |
| **副作用双重调用** | 挂载→卸载→重新挂载 | 检测 useEffect 清理是否遗漏 |
| **Ref 回调重复调用** | 创建→清理→创建 | 检测 ref 清理是否正确 |
| **过时 API 检测** | 检测 findDOMNode / context 旧用法 | 引导迁移 |
| **意外的副作用** | 多次调用 reducer/state 初始化函数 | 检测纯函数性 |

```typescript
function TestComponent() {
  useEffect(() => {
    console.log('Effect runs'); // 开发环境会打印两次
    return () => console.log('Cleanup');
  }, []);

  return <div>Test</div>;
}

// 非 StrictMode：挂载 → "Effect runs" → 卸载 → "Cleanup"
// StrictMode 开发环境：挂载 → "Effect runs" → 卸载 → "Cleanup" → 挂载 → "Effect runs"
// 这帮助检测：如果 cleanup 没有正确执行，内存泄漏会暴露
```

**双重调用只发生在开发环境，生产环境不受影响。**

React 实现方式：StrictMode 通过 `React.StrictMode` 组件标记子树，Fiber 节点上设置 `mode` 标志位为 `StrictMode`。在 commit 阶段，如果检测到 `StrictMode` 标志，开发环境的渲染器会执行双重生命周期。

### Q41：React 中如何实现条件渲染？各方式对比？

```typescript
function ConditionalRendering({ user, loading, error }: {
  user: User | null;
  loading: boolean;
  error: Error | null;
}) {
  // 1️⃣ 三元运算符（最常用）
  return (
    <div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <Error message={error.message} />
      ) : user ? (
        <Profile user={user} />
      ) : (
        <LoginPrompt />
      )}
    </div>
  );

  // 2️⃣ && 短路运算（适用于"有则显示"场景）
  // return <div>{show && <Panel />}</div>;

  // 3️⃣ 提前 return（逻辑复杂时）
  // if (loading) return <Spinner />;
  // if (error) return <Error message={error.message} />;
  // if (!user) return <LoginPrompt />;
  // return <Profile user={user} />;

  // 4️⃣ IIFE（立即执行函数，不推荐）
  // return <div>{(() => { if (loading) return <Spinner />; })()}</div>;

  // 5️⃣ 变量存储（逻辑复杂时）
  // let content: ReactNode;
  // if (loading) content = <Spinner />;
  // else if (error) content = <Error />;
  // else content = <Profile />;
  // return <div>{content}</div>;
}
```

| 方式 | 代码量 | 可读性 | 复杂度 | 推荐度 |
|------|--------|--------|--------|--------|
| 三元运算符 | 少 | 高 | 2-3 分支 | ⭐⭐⭐⭐⭐ |
| `&&` 短路 | 最少 | 高 | 布尔判断 | ⭐⭐⭐⭐⭐ |
| 提前 return | 中 | 高 | 多分支 | ⭐⭐⭐⭐ |
| 变量存储 | 中 | 中 | 复杂逻辑 | ⭐⭐⭐ |
| IIFE | 多 | 低 | 极少用 | ⭐ |

**选择原则：** 2-3 个分支用三元；纯布尔判断用 `&&`；4+ 分支或逻辑复杂用提前 return。

#### 🔥 React 19 条件渲染新写法：`use()` + 条件判断

```typescript
import { use, Suspense } from 'react';

function ConditionalData({ id }: { id: string | null }) {
  // ✅ use() 可以在条件中调用（与传统 Hooks 不同）
  if (id === null) {
    return <p>请选择一条数据</p>;
  }

  const data = use(fetchData(id)); // 条件中调用 use()
  return <div>{data.name}</div>;
}
// 传统 Hooks 不能在条件中调用，但 use() 可以！
```

### Q42：React 中 dangerouslySetInnerHTML 的危险性和安全替代方案？

```typescript
function DangerousExample() {
  const html = '<img src=x onerror="alert(\'XSS\')" />';

  // ❌ 危险：直接插入 HTML，可能触发 XSS
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ 安全方案 1：DOMPurify 净化 HTML
import DOMPurify from 'dompurify';

function SafeHTML({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html); // 移除危险标签/属性
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ✅ 安全方案 2：React 默认转义（绝大多数场景）
function SafeExample({ text }: { text: string }) {
  // React 默认转义 HTML 实体，不会执行脚本
  return <div>{text}</div>;
  // 输入 '<script>alert(1)</script>' → 显示为文本，不会执行
}

// ✅ 安全方案 3：使用更安全的渲染方式（富文本）
// 推荐使用 Quill、Slate、TipTap 等成熟的富文本编辑器
```

**为什么 `dangerouslySetInnerHTML` 是危险的？**

```typescript
// React 默认行为：转义所有 HTML
const userInput = '<script>alert("XSS")</script>';
<div>{userInput}</div>
// 渲染为文本：&lt;script&gt;alert("XSS")&lt;/script&gt;

// dangerouslySetInnerHTML 跳过转义
<div dangerouslySetInnerHTML={{ __html: userInput }} />
// 直接插入 HTML，脚本会执行！
```

**安全使用建议：**
1. 绝大多数场景不需要它（直接用 `{text}` 即可）
2. 必须用时，先用 DOMPurify 等库净化
3. 服务端渲染的 HTML 片段可以使用，但确保服务端输出安全
4. 使用 `__html` 属性名是 React 故意设计的警示

### Q43：React 中 useEffect 与 useLayoutEffect 的选择策略？

```typescript
function EffectStrategy() {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // ✅ useEffect：绝大多数场景
  // 执行时机：浏览器绘制后，不阻塞渲染
  useEffect(() => {
    fetchData().then(setData);
    // 数据获取、日志、订阅——不需要用户立刻看到变化
  }, []);

  // ⚡ useLayoutEffect：需要同步读取/修改 DOM 的场景
  // 执行时机：DOM 更新后、浏览器绘制前，阻塞渲染
  useLayoutEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setWidth(rect.width); // 测量 DOM → 同步更新 state → 在绘制前合并
    }
  }, []);

  return <div ref={ref}>Width: {width}px</div>;
}
```

**决策树：**

```
需要读取或修改 DOM？→ YES → 用户能看到变化前的闪烁？→ YES → useLayoutEffect
                    ↓                     ↓
                   NO                    NO
                    ↓                     ↓
               useEffect            useEffect
```

**选择原则：**

| 场景 | 选择 | 原因 |
|------|------|------|
| 数据获取 | `useEffect` | 数据显示晚一点没关系 |
| 事件监听 | `useEffect` | 不阻塞绘制 |
| 日志上报 | `useEffect` | 不需要用户感知 |
| 订阅/定时器 | `useEffect` | 不涉及 DOM |
| 测量 DOM 尺寸 | `useLayoutEffect` | 需要在绘制前获取 |
| DOM 动画/滚动位置 | `useLayoutEffect` | 需要在绘制前设置 |
| 避免闪烁 | `useLayoutEffect` | 同步更新 state 后合并绘制 |

**SSR 警告：** `useLayoutEffect` 在 SSR 中会触发警告，因为它需要在浏览器环境中执行。

### Q44：React 中列表渲染为什么需要 key？Diff 算法如何利用 key？

```typescript
// 场景：列表头部插入新元素
// 旧列表：[{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
// 新列表：[{ id: 3, name: 'C' }, { id: 1, name: 'A' }, { id: 2, name: 'B' }]

// ❌ 无 key / index 作为 key
// React 按索引比较：
//   index 0: A → C（类型相同？都是对象 → type 相同 → 复用，更新 props）
//   index 1: B → A（复用，更新 props）
//   index 2: — → B（新增）
// 结果：没有节点被复用为原来的样子，全部更新了一遍

// ✅ 唯一 key
// React 按 key 匹配：
//   key=3: 没有旧节点 → 新建
//   key=1: 旧有 key=1 → 复用（A），无需更新
//   key=2: 旧有 key=2 → 复用（B），无需更新
// 结果：只新建了 C，A 和 B 完美复用

// Diff 算法对 key 的处理：
function reconcileChildren(currentFirstChild, newChildren) {
  let oldFiber = currentFirstChild;
  let newIdx = 0;

  // 第 1 轮遍历：逐个比较 key
  for (; oldFiber && newIdx < newChildren.length; newIdx++) {
    const newChild = newChildren[newIdx];
    // 如果 key 相同且 type 相同 → 可复用
    if (oldFiber.key === newChild.key && oldFiber.type === newChild.type) {
      // 复用 Fiber，更新 props
      const clone = useFiber(oldFiber, newChild.props);
      // ...
    } else {
      break; // key 不匹配，跳出循环
    }
    oldFiber = oldFiber.sibling;
  }

  // 第 2 轮：处理剩余节点（通过 key map 快速查找可复用的）
  if (oldFiber) {
    const existingChildren = mapRemainingChildren(oldFiber);
    for (; newIdx < newChildren.length; newIdx++) {
      const matched = existingChildren.get(newChildren[newIdx].key);
      if (matched) {
        // 复用，标记移动
      } else {
        // 新建
      }
    }
  }
}
```

**核心机制：** React 通过 key 建立了"旧节点→新节点"的映射，使得 Diff 算法能在 O(1) 时间内找到可复用的节点，避免全量重建。

> **💡 面试追问：React 的 Diff 中，reconcileChildren 的双指针遍历和 React 的仅右移优化分别适用于什么场景？Vue 的双端 Diff 为什么在 React 中不做？**
>
> **场景差异：**
> ```
> React 的右移优化：
>   └─ 适用：尾部插入（最常见场景）→ O(n) 完美
>   └─ 不适用：头部插入 → O(n²) 需要映射表
>
> Vue 的双端 Diff：
>   └─ 适用：头/尾插入 → 四种情况快速匹配
>   └─ 复杂度：始终 O(n) ~ O(n²) 取决于移动次数
> ```
> **为什么 React 不做双端 Diff：** Fiber 架构基于单向链表，无反向索引。Vue 的虚拟 DOM 有 children 数组支持双端遍历。Fiber 的"一次只有一个单向链表"架构不允许反向遍历。这是架构设计选择带来的 Diff 策略差异。

### Q45：React 16+ 为什么废弃三个 will 生命周期？

**三个废弃的生命周期：**
- `componentWillMount`
- `componentWillReceiveProps`
- `componentWillUpdate`

**根本原因：Fiber 架构的引入。**

```mermaid
graph LR
    subgraph React 15 Stack
        A["递归渲染"] --> B["不可中断"]
        B --> C["Will 方法只执行一次 ✅"]
    end

    subgraph React 16+ Fiber
        D["Fiber 链表"] --> E["可中断/恢复"]
        E --> F["Will 方法可能执行多次 ❌"]
    end
```

**具体问题分析：**

| 废弃方法 | Fiber 下的问题 | 风险 |
|---------|---------------|------|
| **componentWillMount** | 可能被中断后重复调用 | 重复请求 API、重复初始化 |
| **componentWillReceiveProps** | 可能被调用多次，且容易在内部调用 setState | 多次 setState 覆盖、状态不一致 |
| **componentWillUpdate** | 可能被中断，此时读取的 DOM 快照不准确 | 滚动位置错误、动画错乱 |

```typescript
// ❌ 废弃用法：componentWillMount 中发起请求
class UserProfile extends React.Component {
  componentWillMount() {
    // Fiber 中可能执行多次！❌
    fetch(`/api/user/${this.props.id}`)
      .then(r => r.json())
      .then(user => this.setState({ user }));
    // 结果：重复请求，浪费带宽，数据可能被覆盖
  }
}

// ✅ 正确做法：componentDidMount 中发起请求
class UserProfile extends React.Component {
  componentDidMount() {
    // 只会执行一次 ✅
    fetch(`/api/user/${this.props.id}`)
      .then(r => r.json())
      .then(user => this.setState({ user }));
  }
}
```

**替代方案对应表：**

| 废弃方法 | 推荐替代 | 说明 |
|---------|---------|------|
| componentWillMount | constructor / componentDidMount | 初始化放 constructor，异步放 componentDidMount |
| componentWillReceiveProps | getDerivedStateFromProps / 完全受控组件 | 静态方法，纯函数，无副作用 |
| componentWillUpdate | getSnapshotBeforeUpdate + componentDidUpdate | DOM 快照在 Pre-commit 阶段只执行一次 |

### Q46：React 类组件中事件绑定 this 的几种方式？

```typescript
// 方式 1：constructor 中 bind（官方推荐）
class Counter1 extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.handleClick = this.handleClick.bind(this); // 只绑定一次
  }
  handleClick() { this.setState(s => ({ count: s.count + 1 })); }
  render() { return <button onClick={this.handleClick}>{this.state.count}</button>; }
}

// 方式 2：public class fields 语法（最简洁，推荐）
class Counter2 extends React.Component {
  state = { count: 0 };
  handleClick = () => { // 箭头函数自动绑定 this
    this.setState(s => ({ count: s.count + 1 }));
  };
  render() { return <button onClick={this.handleClick}>{this.state.count}</button>; }
}

// 方式 3：render 中 bind（不推荐：每次渲染创建新函数）
class Counter3 extends React.Component {
  render() {
    return <button onClick={this.handleClick.bind(this)}>
      {this.state.count}
    </button>;
  }
}

// 方式 4：箭头函数包裹（不推荐：每次渲染创建新函数）
class Counter4 extends React.Component {
  render() {
    return <button onClick={() => this.handleClick()}>
      {this.state.count}
    </button>;
  }
}
```

| 方式 | 性能 | 推荐度 | 说明 |
|------|------|--------|------|
| constructor bind | ✅ 只绑定一次 | ⭐⭐⭐⭐ | 传统的标准做法 |
| class fields (箭头函数) | ✅ 只绑定一次 | ⭐⭐⭐⭐⭐ | 最简洁，无需 bind |
| render bind | ❌ 每次创建新函数 | ⭐⭐ | 可能引发子组件不必要渲染 |
| 箭头函数包裹 | ❌ 每次创建新函数 | ⭐ | 同左，且可读性差 |

### Q47：React 中 setState 的合并策略是什么？

```typescript
// setState 的两种用法

// 1️⃣ 对象形式（浅合并）
class Example extends React.Component {
  state = { count: 0, name: 'Alice' };

  handleClick = () => {
    this.setState({ count: this.state.count + 1 });
    // 只更新 count，name 不受影响
    // 等价于：this.state = { ...this.state, count: 1 }
  };

  // 多次对象形式 setState 会合并：
  handleMultiple = () => {
    this.setState({ count: this.state.count + 1 }); // 无效
    this.setState({ count: this.state.count + 1 }); // 无效
    this.setState({ count: this.state.count + 1 }); // 最终 +1
    // 合并为：Object.assign({}, { count: 0+1 }, { count: 0+1 }, { count: 0+1 })
    // 结果：count = 1（不是 3）
  };

  // 2️⃣ 函数形式（基于前一个状态）
  handleCorrect = () => {
    this.setState(s => ({ count: s.count + 1 })); // ✅
    this.setState(s => ({ count: s.count + 1 })); // ✅
    this.setState(s => ({ count: s.count + 1 })); // ✅
    // 队列执行：0→1→2→3
    // 结果：count = 3
  };
}
```

**合并原则：**

| 形式 | 合并行为 | 适用场景 |
|------|---------|---------|
| `setState({ key: value })` | 浅合并（Object.assign） | 不依赖前一个 state |
| `setState(prev => ({ key: prev.key + 1 }))` | 队列依次执行 | 依赖前一个 state |
| 多次对象形式 | 最后一次覆盖前面（非 count 累加） | 避免：连续累加 |
| 多次函数形式 | 依次执行（count 累加） | ✅ 推荐连续更新 |

### Q48：React 中函数组件每次渲染都有独立闭包是什么意思？

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setTimeout(() => {
      alert(count); // 点击时的 count 值，不是最新的
    }, 3000);
  };

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={handleClick}>3 秒后显示 count</button>
    </div>
  );
}
// 操作：count=0 → 快速点 3 次 +1 → 点"3 秒后显示" → 再点 5 次 +1
// 3 秒后 alert 显示：3（点击 handleClick 时闭包捕获的 count 值）
// 不是 8（当前最新值）
```

**核心概念：** 每次渲染都是独立的快照。

```typescript
// 每次渲染的"快照"：
// 第 1 次渲染：count=0 → handleClick 闭包捕获 count=0
// 第 2 次渲染：count=1 → handleClick 闭包捕获 count=1
// 第 3 次渲染：count=2 → handleClick 闭包捕获 count=2
// ...

function Counter() {
  const [count, setCount] = useState(0);

  // 每次渲染都有独立的：
  const count = 0;           // 独立的 count 值
  const handleClick = () => { // 独立的函数闭包
    alert(0);
  };

  // 返回的 JSX 也是独立的
  return <div>0</div>;
}
```

**与类组件的对比：**

```typescript
// 类组件：this.state.count 始终指向最新值
class ClassCounter extends React.Component {
  state = { count: 0 };
  handleClick = () => {
    setTimeout(() => {
      alert(this.state.count); // 始终是最新值
    }, 3000);
  };
}

// 函数组件：闭包捕获的是渲染时的值
function FunctionCounter() {
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setTimeout(() => {
      alert(count); // 点击时的值
    }, 3000);
  };
}
```

#### 🔥 独立闭包 + useCallback 的相互作用

```typescript
function ClosureWithUseCallback() {
  const [count, setCount] = useState(0);

  // ❌ useCallback + 空依赖 = 闭包永久锁住旧值
  const handleClick = useCallback(() => {
    // count 永远指向首次渲染的值（0）
    console.log(count); // 始终 0
  }, []);

  // ✅ 依赖补齐：count 变化时重建函数
  const handleClickCorrect = useCallback(() => {
    console.log(count); // 当前渲染时的 count
  }, [count]);

  // ✅ useRef 绕过闭包：函数稳定、读取最新值
  const countRef = useRef(count);
  useEffect(() => { countRef.current = count; }, [count]);

  const handleClickRef = useCallback(() => {
    console.log(countRef.current); // 总是最新值
  }, []); // 无需依赖，永远稳定

  return <button onClick={handleClickRef}>Click</button>;
}
```

**理解独立闭包对 useCallback 的关键影响：**
- useCallback 的**依赖数组决定闭包快照的范围**
- 空依赖 `[]` → 函数永远锁定首次渲染的值
- 补齐依赖 → 函数在依赖变化时重建，捕获新快照
- `useRef` 是唯一能在稳定函数中读取最新值的方式

### Q49：React 中 getDerivedStateFromProps 的真实使用场景？

```typescript
// 官方警示：大多数场景不需要 getDerivedStateFromProps
// 只有在 props 变化时需要重置组件内部 state 时才使用

// ❌ 错误用法：直接复制 props 到 state（完全受控组件可以解决）
static getDerivedStateFromProps(props, state) {
  return { email: props.email }; // ❌ 多余，直接用 props.email
}

// ✅ 场景 1：props 变化时重置内部状态
class EmailInput extends React.Component<{ email: string }> {
  state = {
    email: this.props.email,   // 初始化用 props
    prevEmail: this.props.email, // 记住上一次的 props
  };

  static getDerivedStateFromProps(props: { email: string }, state: { prevEmail: string }) {
    // props.email 变化时才重置（不是每次父组件渲染都重置）
    if (props.email !== state.prevEmail) {
      return {
        email: props.email,
        prevEmail: props.email,
      };
    }
    return null; // 不更新
  }

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ email: e.target.value });
  };

  render() {
    return <input value={this.state.email} onChange={this.handleChange} />;
  }
}

// ✅ 场景 2：根据 props 计算派生数据
class List extends React.Component<{ items: Item[]; filter: string }> {
  state = {
    filteredItems: this.computeFilteredItems(this.props),
    prevProps: this.props,
  };

  static getDerivedStateFromProps(props: typeof this.props, state: { prevProps: typeof this.props }) {
    // 只有 props 变化时才重新计算
    if (props.items !== state.prevProps.items || props.filter !== state.prevProps.filter) {
      return {
        filteredItems: props.items.filter(i => i.name.includes(props.filter)),
        prevProps: props,
      };
    }
    return null;
  }

  computeFilteredItems(props: typeof this.props) {
    return props.items.filter(i => i.name.includes(props.filter));
  }
}
```

**两种场景总结：**

| 场景 | 说明 | 更推荐的替代方案 |
|------|------|----------------|
| 缓存计算结果 | props 变化重新计算派生数据 | **useMemo**（函数组件） |
| props 变化重置 state | 如编辑表单中外部数据变化重置 | **key 属性**：`<EmailInput key={user.id} />` 或完全受控组件 |

### Q50：React 中 useState 和 useReducer 如何选择？

```typescript
// ✅ useState：简单独立的状态
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ✅ useReducer：复杂相关状态（多个值需要一起更新）
interface State { count: number; step: number; }
type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_STEP'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + state.step };
    case 'DECREMENT': return { ...state, count: state.count - state.step };
    case 'SET_STEP':  return { ...state, step: action.payload };
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <input type="number" value={state.step}
        onChange={e => dispatch({ type: 'SET_STEP', payload: +e.target.value })} />
    </div>
  );
}

// ✅ useReducer：下一个 state 依赖前一个（dispatch 引用稳定）
function HeavyComponent() {
  const [state, dispatch] = useReducer(reducer, initialState);
  // dispatch 引用稳定，不会导致子组件重渲染
  return <ExpensiveChild onAction={dispatch} />; // 无需 useCallback
}

// 用 useState 的等价写法（需要 useCallback）
function HeavyComponent() {
  const [state, setState] = useState(initialState);
  const dispatch = useCallback((action: Action) => {
    setState(prev => reducer(prev, action));
  }, []);
  return <ExpensiveChild onAction={dispatch} />;
}
```

**选择策略：**

```
状态类型简单（数字/布尔/字符串）？→ ✅ useState
状态类型复杂（对象/数组/多个值）？→ ❌ 感觉 setState 麻烦？→ ✅ useReducer
更新逻辑涉及前一个状态？→ ✅ useReducer（dispatch 引用稳定）
更新逻辑在组件外可复用？→ ✅ useReducer（reducer 是纯函数，可单独测试）
```

| 维度 | useState | useReducer |
|------|----------|------------|
| 状态结构 | 简单值 | 复杂对象/数组 |
| 更新逻辑 | 内联在组件中 | 独立 reducer 函数 |
| 可测试性 | 低（需渲染组件） | 高（纯函数） |
| dispatch 稳定性 | 需 useCallback | ✅ 始终稳定 |
| 适用场景 | 2-3 个独立状态 | 多个相关状态 |

#### 💡 补充：useState 惰性初始化（Lazy Initializer）

```typescript
// ❌ 直接传值：每次渲染都会计算 initialValue
const [state, setState] = useState(expensiveComputation(props.data));
// expensiveComputation 每次渲染都会被调用，只是返回值被忽略

// ✅ 惰性初始化：传函数，只在首次渲染执行一次
const [state, setState] = useState(() => expensiveComputation(props.data));
// 函数只在组件挂载时调用一次，后续渲染跳过
```

**适用场景：** 初始化成本高（大数组排序、复杂对象构建、localStorage 读取）：
```typescript
const [items, setItems] = useState(() => {
  const saved = localStorage.getItem('cache');
  return saved ? JSON.parse(saved) : [];
});
// localStorage 读取只在挂载时执行一次
```

### Q51：React 中 useEffect 的依赖比较机制（Object.is 比较）？

```typescript
useEffect(() => {
  console.log('Effect runs');
}, [dep]);
// React 使用 Object.is 逐个比较依赖项
// Object.is(NaN, NaN) === true
// Object.is(+0, -0) === false
// Object.is({}, {}) === false（对象/函数每次渲染都是新引用）

// ❌ 陷阱：对象/函数作为依赖
function Search({ query }: { query: string }) {
  const options = { page: 1, size: 10 }; // 每次渲染新对象

  useEffect(() => {
    fetchSearch(query, options);
  }, [query, options]); // options 每次都是新引用 → 无限循环！
}

// ✅ 方案 1：将对象拆为原始值
useEffect(() => {
  fetchSearch(query, { page: 1, size: 10 });
}, [query]); // 只用 query

// ✅ 方案 2：useMemo 稳定引用
const options = useMemo(() => ({ page: 1, size: 10 }), []);
useEffect(() => {
  fetchSearch(query, options);
}, [query, options]);

// ✅ 方案 3：ref 保存（真的需要变化时读取最新值）
const optionsRef = useRef({ page: 1, size: 10 });
useEffect(() => {
  fetchSearch(query, optionsRef.current);
}, [query]);
```

**Object.is 与 === 的区别：**
- `Object.is(NaN, NaN)` → `true`（`NaN === NaN` → `false`）
- `Object.is(+0, -0)` → `false`（`+0 === -0` → `true`）
- 其他情况与 `===` 一致

**依赖比较的最佳实践：**
1. 优先使用原始值（string/number/boolean）作为依赖
2. 对象/函数作为 props 传入时，父组件用 useMemo/useCallback 稳定引用
3. 避免将不必要的引用类型放入依赖数组
4. ESLint `react-hooks/exhaustive-deps` 规则帮你检查

### Q52：React 中 ref 回调的执行时机？

```typescript
function RefCallback() {
  const [show, setShow] = useState(true);

  // ref 回调：在 DOM 挂载/卸载时同步执行
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      // DOM 已挂载，可以读取尺寸
      console.log('Mounted:', node.getBoundingClientRect().width);
    } else {
      // DOM 已卸载
      console.log('Unmounted');
    }
  }, []);

  return (
    <div>
      <button onClick={() => setShow(s => !s)}>Toggle</button>
      {show && <div ref={measureRef}>Hello</div>}
    </div>
  );
}

// 执行时序：
// 首次挂载：DOM 创建 → ref 回调(node) → useEffect 回调
// 卸载：ref 回调(null) → useEffect 清理
// 更新：ref 回调(null) → 更新 DOM → ref 回调(node) → useEffect
```

**与 useEffect 的时序对比：**

```typescript
function OrderOfExecution() {
  const ref = useRef<HTMLDivElement>(null);

  // 第 1 个执行：ref 回调（DOM 可用）
  const cbRef = useCallback((node) => {
    if (node) console.log('1. Ref callback: DOM ready');
    else console.log('1. Ref callback: DOM removed');
  }, []);

  // 第 2 个执行：useLayoutEffect（DOM 已更新，浏览器未绘制）
  useLayoutEffect(() => {
    console.log('2. useLayoutEffect');
  });

  // 第 3 个执行：useEffect（浏览器已绘制）
  useEffect(() => {
    console.log('3. useEffect');
  });

  return <div ref={cbRef}>Order</div>;
}
// 输出顺序：
// 1. Ref callback: DOM ready
// 2. useLayoutEffect
// 3. useEffect
```

### Q53：React 中 forceUpdate 的使用场景和替代方案？

```typescript
// 类组件：forceUpdate 强制重新渲染
class ForceUpdateExample extends React.Component {
  data: string[] = []; // 不是 state

  addData = (item: string) => {
    this.data.push(item); // 直接修改实例属性
    this.forceUpdate(); // 强制触发重渲染（跳过 shouldComponentUpdate）
  };

  render() {
    return <ul>{this.data.map((d, i) => <li key={i}>{d}</li>)}</ul>;
  }
}

// ❌ forceUpdate 的问题：
// 1. 破坏了 React 的可预测性
// 2. 跳过 shouldComponentUpdate 优化
// 3. 通常意味着状态没放在正确的位置

// ✅ 替代方案：将数据放入 state
class BetterExample extends React.Component {
  state = { data: [] as string[] };

  addData = (item: string) => {
    this.setState(s => ({ data: [...s.data, item] }));
  };

  render() {
    return <ul>{this.state.data.map((d, i) => <li key={i}>{d}</li>)}</ul>;
  }
}

// ✅ 函数组件无 forceUpdate，用递增 key 或 useState 替代
function FunctionForceUpdate() {
  const [, forceUpdate] = useReducer(x => x + 1, 0); // forceUpdate Hack
  // 或
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  return <button onClick={forceUpdate}>Force Update</button>;
}
```

**forceUpdate 的替代方案：**

| 方案 | 类组件 | 函数组件 | 说明 |
|------|--------|---------|------|
| 放入 state | ✅ | ✅ | 正确的 React 方式 |
| useReducer Hack | ❌ | ✅ | `useReducer(x => x + 1, 0)` |
| 递增 key | ✅ | ✅ | 重新创建整个组件 |
| forceUpdate | ✅ | ❌ | 尽量不用 |

### Q54：React 中 createElement、cloneElement、isValidElement 的用途？

```typescript
import { createElement, cloneElement, isValidElement, ReactNode } from 'react';

// 1️⃣ createElement：创建 React 元素（JSX 的底层实现）
// <div className="box">Hello</div>
// 编译为：
createElement('div', { className: 'box' }, 'Hello');
// 参数：type, props, ...children

// 2️⃣ cloneElement：克隆并扩展元素
function List({ children }: { children: ReactNode }) {
  return (
    <ul>
      {React.Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          // 克隆子元素并注入额外 props
          return cloneElement(child, {
            key: index,          // 自动分配 key
            className: 'list-item',
            'data-index': index,
          });
        }
        return child;
      })}
    </ul>
  );
}
// 使用
<List>
  <li>Item 1</li> {/* 自动变成 <li key={0} className="list-item" data-index={0}> */}
  <li>Item 2</li>
</List>

// 3️⃣ isValidElement：验证是否为 React 元素
function SafeRender({ children }: { children: ReactNode }) {
  if (isValidElement(children)) {
    return cloneElement(children, { className: 'wrapper' });
  }
  return <div className="wrapper">{children}</div>;
}

// 4️⃣ React.Children 工具集
function ChildrenUtils({ children }: { children: ReactNode }) {
  return (
    <div>
      <p>子元素数量：{React.Children.count(children)}</p>
      {React.Children.map(children, child => <div className="child">{child}</div>)}
      {/* React.Children.toArray、forEach、only 等 */}
    </div>
  );
}
```

**使用场景总结：**

| API | 用途 | 典型场景 |
|-----|------|---------|
| `createElement` | 创建新元素 | JSX 编译目标，或动态创建元素 |
| `cloneElement` | 克隆并扩展 | 高阶组件/布局组件中注入 props |
| `isValidElement` | 类型判断 | 安全处理 children |
| `React.Children` | children 操作 | 遍历、计数、转换子元素 |

### Q55：React 中 Profiler 如何使用？如何分析渲染性能？

```typescript
import { Profiler, ProfilerOnRenderCallback } from 'react';

// Profiler：测量组件渲染性能
const onRender: ProfilerOnRenderCallback = (
  id,               // Profiler 的 id
  phase,            // 'mount' | 'update' | 'nested-update'
  actualDuration,   // 本次渲染实际耗时（ms）
  baseDuration,     // 子树最优渲染耗时（缓存情况）
  startTime,        // 开始时间
  commitTime,       // commit 时间
  interactions      // 交互集合（与 scheduler 相关）
) => {
  console.table({ id, phase, actualDuration, baseDuration });

  // 警告：渲染超过 16ms（60fps 一帧）
  if (actualDuration > 16) {
    console.warn(`⚠️ ${id} 渲染超时：${actualDuration.toFixed(2)}ms`);
  }
};

function App() {
  return (
    <Profiler id="App" onRender={onRender}>
      <Profiler id="Sidebar" onRender={onRender}>
        <Sidebar />
      </Profiler>
      <Profiler id="MainContent" onRender={onRender}>
        <MainContent />
      </Profiler>
    </Profiler>
  );
}

// 自定义 Hook：自动追踪渲染原因和耗时
function useRenderTrace(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  renderCount.current++;

  useEffect(() => {
    const duration = performance.now() - startTime.current;
    console.log(`[${componentName}] render #${renderCount.current}: ${duration.toFixed(2)}ms`);

    // React DevTools 中查看渲染原因
    // 勾选 "Highlight updates when components render"
    // 勾选 "Record why each component rendered"
  });
}
```

**Profiler 的最佳实践：**

| 场景 | 操作 | 目标 |
|------|------|------|
| 首屏性能 | Profiler 包裹根组件 | 找出首次渲染慢的子树 |
| 交互性能 | Profiler 包裹交互区域 | 找出更新渲染慢的组件 |
| 列表性能 | Profiler 包裹列表组件 | 检查列表重渲染次数 |
| Context 性能 | Profiler 包裹消费组件 | 检查 Context 变化导致的重渲染 |


### Q56：React Hooks 安全使用综合指南（useCallback / useEffect / useMemo / useRef）

#### useCallback 安全要点

| 风险 | 原因 | 解决方案 |
|------|------|---------|
| **闭包陷阱** | 依赖漏写，函数锁住旧值 | 开启 `exhaustive-deps` ESLint 规则，补齐所有依赖 |
| **缓存失效** | 依赖中传入字面量对象/数组，每次渲染都是新引用 | 用 `useMemo` 稳定引用后做依赖 |
| **内存泄漏** | 监听/定时器中使用缓存函数，解绑时用了旧引用 | `useEffect` 返回清理函数，将 handler 加入依赖 |
| **反向性能** | 滥用 + React.memo，比较开销大于重渲染开销 | 只在传给 memo 子组件 / useEffect 依赖时使用 |
| **异步旧值** | setTimeout/Promise 中读取闭包捕获的旧 state | 用 ref 保存最新值，或用函数式更新 |

#### useEffect 安全要点

| 风险 | 原因 | 解决方案 |
|------|------|---------|
| **无限循环** | 依赖数组遗漏或引用类型每次变化 | 补齐依赖，对象用 useMemo 稳定引用 |
| **竞态条件** | 异步请求返回顺序与发起顺序不一致 | AbortController 取消过期请求，或 flag 变量控制 |
| **内存泄漏** | 事件监听/定时器/订阅未清理 | 返回清理函数，组件卸载时取消 |
| **重复执行** | StrictMode 双重调用导致副作用重复 | 确保清理函数完整，生产环境不受影响 |
| **遗漏清理** | 只关注 mount 逻辑，忘记 unmount 清理 | StrictMode 帮助检测，开发环境双重调用暴露问题 |

#### useMemo 安全要点

| 风险 | 原因 | 解决方案 |
|------|------|---------|
| **内存浪费** | 缓存了简单计算，开销大于 Hook 本身 | 只缓存复杂计算（排序/过滤/格式化） |
| **依赖漏写** | 计算结果使用的变量未进依赖 | 开启 exhaustive-deps 规则 |
| **对象引用不稳定** | useMemo 返回的对象被外部依赖用于 useEffect | 确保依赖数组完整，否则导致无限循环 |
| **过度使用** | 所有值都用 useMemo 包裹 | 简单值直接用，复杂值按需缓存 |

#### useRef 安全要点

| 风险 | 原因 | 解决方案 |
|------|------|---------|
| **过度依赖 ref 读值** | 用 ref 绕过 React 数据流，可能导致 UI 与状态不一致 | 优先用 state，ref 只保存不参与渲染的值 |
| **ref 穿透 DOM** | 直接暴露整个 DOM 给父组件 | useImperativeHandle 限制暴露的方法 |
| **SSR 不兼容** | ref.current 在服务端为 null，未做防御 | 使用前判空 `ref.current?.xxx()` |
| **清理遗漏** | ref 保存的定时器/订阅在卸载时未清理 | useEffect 清理函数中释放 ref 持有的资源 |

#### 综合安全检查清单

```typescript
// ✅ useCallback 安全检查
const handle = useCallback(() => {
  // 检查 1：所有用到的 state/props 是否都在依赖中？
  doSomething(count, id);
}, [count, id]); // 缺一个就是闭包陷阱

// ✅ useEffect 安全检查
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  // 检查 2：有清理函数吗？
  return () => controller.abort();
  // 检查 3：依赖完整吗？
}, [id]);

// ✅ useMemo 安全检查
const sorted = useMemo(() => {
  // 检查 4：计算复杂吗？简单值不需要 useMemo
  return items.sort((a, b) => expensiveCompare(a, b));
  // 检查 5：依赖完整吗？
}, [items]);

// ✅ useRef 安全检查
const timerRef = useRef<NodeJS.Timeout | null>(null);
useEffect(() => {
  timerRef.current = setInterval(tick, 1000);
  // 检查 6：ref 资源在卸载时清理了吗？
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, []);
```

**核心口诀：** 依赖写全、引用稳住、副作用清干净、不滥用缓存。

---


