---
title: React 19 完整学习指南
---

# 🚀 [React 19](https://react.dev) 完整学习指南

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

---


## 目录

- [01 - 核心基础](./01-核心基础)
- [02 - 高级特性](./02-高级特性)
- [03 - 工程实践](./03-工程实践)
- [04 - 性能优化](./04-性能优化)
- [05 - 深入原理](./05-深入原理)
- [06 - React 19 新特性](./06-React19新特性)
- [07 - 调试与场景](./07-调试与场景)
- [08 - React深入浅出解析](./08-React深入浅出解析)