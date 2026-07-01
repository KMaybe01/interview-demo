# S4 面试冲刺 🔴

> **学习目标**：简历打磨、项目复盘、反向面试、真实项目深度技术分析

## 内容章节

- [⚛️ React 中高级面试通关指南](./React-中高级前端面试通关指南.md) — 面试策略、STAR 剖析、追问链、手写题
- [🅰️ Angular 中高级面试通关指南](./Angular-中高级前端面试通关指南.md) — 同上，Angular 20+ / RxJS / NgRx 技术栈
- [📌 反向面试](./05-反向面试.md) — 候选人反问面试官的问题清单
- [🗺️ 面试技术亮点汇总](./00-面试技术亮点汇总.md) — 12 大技术亮点速览与架构图
- [📝 简历](./01-简历.md) — 前端简历示例与编写指南
- [❓ 简历问题](./02-简历问题.md) — 简历常见追问与深度问题（React）
- [🔄 ToC 转型面试策略](./03-ToC转型面试策略.md) — ToC 转型面试策略
- [🖼️ ToB 前端可视化面试通关指南](./04-ToB前端可视化面试通关指南.md) — ToB 前端可视化面试通关指南

### 项目深度复盘

- [📶 5G核心网测试用例管理系统](./项目/5G核心网测试用例管理系统.md) — React 19 动态表单、SSE 实时日志
- [🏢 AeMS 企业级综合网络管理系统](./项目/AeMS企业级综合网络管理系统.md) — Angular GIS 渲染、WebSocket 告警
- [⚙️ LI-OAM 网元运维与数据管理系统](./项目/LI-OAM%20网元运维与数据管理系统.md) — Web Worker 解密、审计追踪
- [🔒 Axyom ACL & HTTP Decorator](./项目/Axyom%20ACL%20%26%20HTTP%20Decorator%20Library.md) — Angular 装饰器、ACL 权限
- [📋 Axyom Form](./项目/Axyom-Form%20项目技术分析.md) — 动态表单引擎技术分析
- [📊 Axyom Table](./项目/Axyom-Table%20项目技术分析.md) — 高性能表格组件技术分析
- [📈 Prometheus+Grafana](./项目/Prometheus+Grafana.md) — 监控体系与可视化
- [🏗️ FMS-UI 企业级融合管理系统](./项目/FMS-UI企业级融合管理系统.md) — 企业级融合管理系统前端深度技术分析

## 项目独立运行

每个项目分析都按 **Vite 8 + React 19 + TypeScript 6** 标准搭建，支持独立启动：

```bash
cd S4-面试冲刺/项目
pnpm install
pnpm run <项目名>
```

## 学习路线

```mermaid
graph LR
    S3["S3 进阶提升"] --> Resume["简历优化"]
    Resume --> Projects["项目复盘"]
    Projects --> Reverse["反向面试"]
    Reverse --> S5["➡️ S5 AI 前沿"]
```
