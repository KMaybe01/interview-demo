export interface NavItem {
  text: string;
  icon?: string;
  link?: string;
  items?: NavItem[];
}

export const navConfig: NavItem[] = [
  { text: '首页', icon: '🏠', link: '/' },
  {
    text: '基础夯实',
    icon: '📚',
    items: [
      { text: 'HTML', icon: '🌐', link: '/S1-基础夯实/01-HTML' },
      { text: 'CSS', icon: '🎨', link: '/S1-基础夯实/02-CSS' },
      { text: '数据类型与 ES6', icon: '💻', link: '/S1-基础夯实/JavaScript核心/01-数据类型与ES6' },
      {
        text: 'JavaScript 基础',
        icon: '✨',
        link: '/S1-基础夯实/JavaScript核心/02-JavaScript基础',
      },
      {
        text: '原型、作用域与 this',
        icon: '🔍',
        link: '/S1-基础夯实/JavaScript核心/03-原型作用域与this',
      },
      { text: '异步编程', icon: '⏳', link: '/S1-基础夯实/JavaScript核心/04-异步编程' },
      {
        text: '垃圾回收/事件循环/新特性',
        icon: '♻️',
        link: '/S1-基础夯实/JavaScript核心/05-垃圾回收事件循环与新特性',
      },
      {
        text: 'TypeScript 高频题',
        icon: '📘',
        link: '/S1-基础夯实/JavaScript核心/06-TypeScript高频题',
      },
      { text: '浏览器 Web API', icon: '🖥️', link: '/S1-基础夯实/JavaScript代码篇/01-浏览器WebAPI' },
      { text: '手写代码实现', icon: '✍️', link: '/S1-基础夯实/JavaScript代码篇/02-手写实现' },
      { text: '代码输出题', icon: '🧪', link: '/S1-基础夯实/JavaScript代码篇/03-代码输出题' },
    ],
  },
  {
    text: '框架深入',
    icon: '⚛️',
    items: [
      { text: '阶段概览', icon: '📖', link: '/S2-框架深入/' },
      { text: '框架对比（含设计思想）', icon: '⚖️', link: '/S2-框架深入/04-框架对比' },
      { text: 'Angular22', icon: '🅰️', link: '/S2-框架深入/03-Angular22' },
      { text: 'React19', icon: '⚛️', link: '/S2-框架深入/02-React19' },
      { text: 'React深入浅出解析', icon: '🔍', link: '/S2-框架深入/06-React深入浅出解析' },
      { text: 'Vue3', icon: '💚', link: '/S2-框架深入/01-Vue3' },
      { text: 'Vue3源码解析', icon: '🔧', link: '/S2-框架深入/05-Vue3.0源码深度解析' },
    ],
  },
  {
    text: '进阶提升',
    icon: '🚀',
    items: [
      { text: '阶段概览', icon: '📖', link: '/S3-进阶提升/' },
      { text: '算法题解', icon: '💡', link: '/S3-进阶提升/04-算法题解' },
      { text: '前端工程化', icon: '🏗️', link: '/S3-进阶提升/03-前端工程化' },
      { text: '计算机网络', icon: '🌐', link: '/S3-进阶提升/05-计算机网络' },
      { text: '性能优化', icon: '🚀', link: '/S3-进阶提升/02-性能优化' },
      { text: '前端监控与埋点', icon: '📊', link: '/S3-进阶提升/06-前端监控与埋点' },
      { text: '浏览器原理', icon: '🌍', link: '/S3-进阶提升/01-浏览器原理' },
      { text: 'Node.js与服务端', icon: '📦', link: '/S3-进阶提升/07-Node.js与服务端' },
    ],
  },
  {
    text: '面试冲刺',
    icon: '🎯',
    items: [
      {
        text: '项目深度复盘',
        icon: '📁',
        items: [
          {
            text: '5G核心网测试管理系统',
            icon: '📶',
            link: '/S4-面试冲刺/项目/5G核心网测试用例管理系统',
          },
          {
            text: 'AeMS 综合网络管理系统',
            icon: '🏢',
            link: '/S4-面试冲刺/项目/AeMS企业级综合网络管理系统',
          },
          {
            text: 'GNB-UI企业级5G网元管理系统',
            icon: '🏢',
            link: '/S4-面试冲刺/项目/GNB-UI企业级5G网元管理系统',
          },
          {
            text: 'FMS-UI 融合管理系统',
            icon: '🏗️',
            link: '/S4-面试冲刺/项目/FMS-UI企业级融合管理系统',
          },
          {
            text: 'LI-OAM 网元运维系统',
            icon: '⚙️',
            link: '/S4-面试冲刺/项目/LI-OAM 网元运维与数据管理系统',
          },
          {
            text: 'Axyom ACL 权限库',
            icon: '🔒',
            link: '/S4-面试冲刺/项目/Axyom ACL & HTTP Decorator Library',
          },
          {
            text: 'Axyom-Form 表单引擎',
            icon: '📋',
            link: '/S4-面试冲刺/项目/Axyom-Form 项目技术分析',
          },
          {
            text: 'Axyom-Table 高性能表格',
            icon: '📊',
            link: '/S4-面试冲刺/项目/Axyom-Table 项目技术分析',
          },
          { text: 'Prometheus+Grafana', icon: '📈', link: '/S4-面试冲刺/项目/Prometheus+Grafana' },
        ],
      },
      { text: '阶段概览', icon: '📖', link: '/S4-面试冲刺/' },
      { text: '简历', icon: '📝', link: '/S4-面试冲刺/01-简历' },
      { text: '简历问题', icon: '⚛️', link: '/S4-面试冲刺/02-简历问题' },
      { text: '反向面试', icon: '📌', link: '/S4-面试冲刺/05-反向面试' },
      { text: '面试官视角复盘', icon: '👁️', link: '/S4-面试冲刺/06-面试官视角-22场技术面复盘' },
      {
        text: 'React 中高级面试通关指南',
        icon: '⚛️',
        link: '/S4-面试冲刺/React-中高级前端面试通关指南',
      },
      {
        text: 'Angular 中高级面试通关指南',
        icon: '🅰️',
        link: '/S4-面试冲刺/Angular-中高级前端面试通关指南',
      },
      { text: '面试技术亮点汇总', icon: '📈', link: '/S4-面试冲刺/00-面试技术亮点汇总' },
      { text: 'ToC 转型面试策略', icon: '🔄', link: '/S4-面试冲刺/03-ToC转型面试策略' },
      { text: 'ToB 前端可视化面试', icon: '🖼️', link: '/S4-面试冲刺/04-ToB前端可视化面试通关指南' },
    ],
  },
  {
    text: 'AI 前沿',
    icon: '🤖',
    items: [
      { text: '阶段概览 · 总纲', icon: '📖', link: '/S5-AI/' },
      {
        text: '导学 · 学什么 / 怎么选',
        icon: '🎯',
        items: [
          {
            text: '前端转型 AI 能力地图',
            icon: '🗺️',
            link: '/S5-AI/00-导学/01-前端转型AI能力地图',
          },
          { text: 'AI 应用市场与生态', icon: '🌐', link: '/S5-AI/00-导学/02-AI应用市场与生态' },
          { text: '技术选型速查', icon: '⚖️', link: '/S5-AI/00-导学/03-技术选型速查' },
        ],
      },
      {
        text: '① 流式对话',
        icon: '💬',
        items: [
          { text: '关卡概览', icon: '📖', link: '/S5-AI/01-第一关-流式对话/' },
          {
            text: '30 分钟从 0 到 1',
            icon: '⚡',
            link: '/S5-AI/01-第一关-流式对话/01-30分钟从0到1',
          },
          {
            text: 'LLM 调用与 Token 成本',
            icon: '💰',
            link: '/S5-AI/01-第一关-流式对话/02-LLM调用与Token成本',
          },
          {
            text: '流式协议与前端渲染',
            icon: '🌊',
            link: '/S5-AI/01-第一关-流式对话/03-流式协议与前端渲染',
          },
          {
            text: 'AI SDK 7 核心 API',
            icon: '🔗',
            link: '/S5-AI/01-第一关-流式对话/04-AI-SDK-7核心API',
          },
          {
            text: '附：AI 聊天室完整实现',
            icon: '📄',
            link: '/S5-AI/01-第一关-流式对话/附-AI聊天室完整实现',
          },
        ],
      },
      {
        text: '② 知识增强 RAG',
        icon: '📚',
        items: [
          { text: '关卡概览', icon: '📖', link: '/S5-AI/02-第二关-知识增强RAG/' },
          { text: 'RAG 全链路', icon: '🔍', link: '/S5-AI/02-第二关-知识增强RAG/01-RAG全链路' },
          {
            text: '分块与 Embedding 策略',
            icon: '🧱',
            link: '/S5-AI/02-第二关-知识增强RAG/02-分块与Embedding策略',
          },
          {
            text: '混合检索与 Rerank',
            icon: '🎯',
            link: '/S5-AI/02-第二关-知识增强RAG/03-混合检索与Rerank',
          },
          {
            text: 'RAG 评测闭环',
            icon: '📏',
            link: '/S5-AI/02-第二关-知识增强RAG/04-RAG评测闭环',
          },
          {
            text: '附：RAG 全栈技术实战',
            icon: '📄',
            link: '/S5-AI/02-第二关-知识增强RAG/附-RAG全栈技术实战',
          },
        ],
      },
      {
        text: '③ Agent 与工具',
        icon: '🤖',
        items: [
          { text: '关卡概览', icon: '📖', link: '/S5-AI/03-第三关-Agent与工具/' },
          {
            text: 'Agent 设计模式',
            icon: '🧠',
            link: '/S5-AI/03-第三关-Agent与工具/01-Agent设计模式',
          },
          {
            text: '工具设计契约',
            icon: '🛠️',
            link: '/S5-AI/03-第三关-Agent与工具/02-工具设计契约',
          },
          {
            text: '停止条件与死循环防护',
            icon: '⏹️',
            link: '/S5-AI/03-第三关-Agent与工具/03-停止条件与死循环防护',
          },
          {
            text: 'HITL 人工审批',
            icon: '👤',
            link: '/S5-AI/03-第三关-Agent与工具/04-HITL人工审批',
          },
          {
            text: '附：AI 编程智能体实战',
            icon: '📄',
            link: '/S5-AI/03-第三关-Agent与工具/附-AI编程智能体实战',
          },
        ],
      },
      {
        text: '④ 企业级工程化 ★',
        icon: '🏭',
        items: [
          { text: '关卡概览', icon: '📖', link: '/S5-AI/04-第四关-企业级工程化/' },
          {
            text: '多 Provider 网关与熔断降级',
            icon: '🔀',
            link: '/S5-AI/04-第四关-企业级工程化/01-多Provider网关与熔断降级',
          },
          {
            text: '安全护栏',
            icon: '🛡️',
            link: '/S5-AI/04-第四关-企业级工程化/02-安全护栏',
          },
          {
            text: '上下文工程与 Skills',
            icon: '🧩',
            link: '/S5-AI/04-第四关-企业级工程化/03-上下文工程与Skills',
          },
          {
            text: '可观测性 Trace 与审计',
            icon: '📊',
            link: '/S5-AI/04-第四关-企业级工程化/04-可观测性Trace与审计',
          },
          {
            text: '评测体系与 CI 回归门禁',
            icon: '✅',
            link: '/S5-AI/04-第四关-企业级工程化/05-评测体系与CI回归门禁',
          },
          {
            text: '成本预算与配额治理',
            icon: '💰',
            link: '/S5-AI/04-第四关-企业级工程化/06-成本预算与配额治理',
          },
          {
            text: '部署灰度与容灾',
            icon: '🚦',
            link: '/S5-AI/04-第四关-企业级工程化/07-部署灰度与容灾',
          },
          {
            text: '附：生产化与工程化手册',
            icon: '📄',
            link: '/S5-AI/04-第四关-企业级工程化/附-生产化与工程化手册',
          },
        ],
      },
      {
        text: '⑤ 协议与多 Agent',
        icon: '🔌',
        items: [
          { text: '关卡概览', icon: '📖', link: '/S5-AI/05-第五关-协议与多Agent/' },
          {
            text: 'MCP 2026-07-28 详解',
            icon: '🔌',
            link: '/S5-AI/05-第五关-协议与多Agent/01-MCP-2026-07-28详解',
          },
          {
            text: '暴露业务系统为 MCP 工具',
            icon: '🧰',
            link: '/S5-AI/05-第五关-协议与多Agent/02-暴露业务系统为MCP工具',
          },
          {
            text: 'A2A 多 Agent 协作',
            icon: '🤝',
            link: '/S5-AI/05-第五关-协议与多Agent/03-A2A多Agent协作',
          },
          {
            text: '前沿技术与生态（MCP / A2A）',
            icon: '🔮',
            link: '/S5-AI/05-第五关-协议与多Agent/附-前沿技术与生态',
          },
          {
            text: '附：MCP+A2A 全栈实战',
            icon: '📄',
            link: '/S5-AI/05-第五关-协议与多Agent/附-MCP+A2A全栈实战',
          },
        ],
      },
      {
        text: '⑥ 前端 AI 交互层',
        icon: '🎨',
        items: [
          { text: '关卡概览', icon: '📖', link: '/S5-AI/06-第六关-前端AI交互层/' },
          {
            text: '生成式 UI 与组件生态',
            icon: '🧱',
            link: '/S5-AI/06-第六关-前端AI交互层/01-生成式UI与组件生态',
          },
          {
            text: 'Ant Design X 实战',
            icon: '🧩',
            link: '/S5-AI/06-第六关-前端AI交互层/02-Ant-Design-X实战',
          },
          { text: '端侧推理', icon: '🧠', link: '/S5-AI/06-第六关-前端AI交互层/03-端侧推理' },
          {
            text: '附：Agent 全栈开发实战',
            icon: '📄',
            link: '/S5-AI/06-第六关-前端AI交互层/附-Agent全栈开发实战',
          },
        ],
      },
      {
        text: '⑦ Go 后端参考实现（副线）',
        icon: '🐹',
        items: [
          { text: '支线总览', icon: '📖', link: '/S5-AI/07-Go后端参考实现/' },
          {
            text: '阶段1 基础聊天机器人',
            icon: '💬',
            link: '/S5-AI/07-Go后端参考实现/阶段1-架构设计与基础聊天机器人开发',
          },
          {
            text: '阶段2 商业级聊天机器人',
            icon: '💼',
            link: '/S5-AI/07-Go后端参考实现/阶段2-商业级聊天机器人开发',
          },
          {
            text: '阶段3 LLMOps 平台',
            icon: '📊',
            link: '/S5-AI/07-Go后端参考实现/阶段3-LLMOps应用平台可视化',
          },
          {
            text: '阶段4-8 扩展部署与实战',
            icon: '🚀',
            link: '/S5-AI/07-Go后端参考实现/阶段4-8-扩展部署与实战',
          },
        ],
      },
      {
        text: '⑧ 资料库（归档）',
        icon: '🗄️',
        items: [
          { text: '资料库总览', icon: '📖', link: '/S5-AI/08-资料库/' },
          { text: '技术选型完整版', icon: '⚖️', link: '/S5-AI/08-资料库/01-技术选型完整版' },
          {
            text: '开发实战与架构指南',
            icon: '🏗️',
            link: '/S5-AI/08-资料库/02-开发实战与架构指南',
          },
          { text: '大模型训练', icon: '🧪', link: '/S5-AI/08-资料库/03-大模型训练' },
          { text: 'Ollama 学习文档', icon: '🦙', link: '/S5-AI/08-资料库/04-Ollama学习文档' },
          {
            text: 'AI Agent 全流程解决方案',
            icon: '🔄',
            link: '/S5-AI/08-资料库/05-AI-Agent全流程解决方案',
          },
          { text: 'AI 推荐学习', icon: '📖', link: '/S5-AI/08-资料库/06-AI推荐学习' },
        ],
      },
      {
        text: '⑨ 面试篇',
        icon: '🎤',
        items: [
          {
            text: '面试技巧与回答模板',
            icon: '💡',
            link: '/S5-AI/09-面试篇/00-面试技巧与回答模板',
          },
          { text: 'LLM 基础', icon: '🧠', link: '/S5-AI/09-面试篇/01-LLM基础篇' },
          { text: 'RAG 与知识库', icon: '📚', link: '/S5-AI/09-面试篇/02-RAG与知识库篇' },
          { text: 'Agent 设计', icon: '🤖', link: '/S5-AI/09-面试篇/03-Agent设计篇' },
          { text: '工具与协议', icon: '🧰', link: '/S5-AI/09-面试篇/04-工具与协议篇' },
          { text: '框架与工程', icon: '🔧', link: '/S5-AI/09-面试篇/05-框架与工程篇' },
          { text: '前沿趋势', icon: '🔮', link: '/S5-AI/09-面试篇/06-前沿趋势篇' },
          { text: '项目表述模板', icon: '📋', link: '/S5-AI/09-面试篇/07-项目表述模板' },
        ],
      },
      {
        text: '⑩ 编码 Agent 专题',
        icon: '⌨️',
        items: [
          { text: '专题概览', icon: '📖', link: '/S5-AI/10-编码Agent专题/' },
          {
            text: 'Agent Loop 与对话循环',
            icon: '🔄',
            link: '/S5-AI/10-编码Agent专题/01-Agent-Loop与对话循环',
          },
          {
            text: '工具系统与权限管线',
            icon: '🛡️',
            link: '/S5-AI/10-编码Agent专题/02-工具系统与权限管线',
          },
          {
            text: '上下文压缩与长会话',
            icon: '🗜️',
            link: '/S5-AI/10-编码Agent专题/03-上下文压缩与长会话',
          },
          {
            text: '子 Agent 与多 Agent 编排',
            icon: '🕸️',
            link: '/S5-AI/10-编码Agent专题/04-子Agent与多Agent编排',
          },
          {
            text: 'Hooks、Skills 与 Memory',
            icon: '🧩',
            link: '/S5-AI/10-编码Agent专题/05-钩子Hooks与Skills与Memory',
          },
          {
            text: '国产模型适配与供应商切换',
            icon: '🔀',
            link: '/S5-AI/10-编码Agent专题/06-国产模型适配与供应商切换',
          },
          {
            text: 'hello-agents 精读',
            icon: '📑',
            link: '/S5-AI/10-编码Agent专题/附-hello-agents精读',
          },
        ],
      },
      { text: '写作约定', icon: '✍️', link: '/S5-AI/99-写作约定' },
    ],
  },
  {
    text: 'Go 语言',
    icon: '🐹',
    items: [
      { text: '阶段概览', icon: '📖', link: '/S6-Go/' },
      { text: '学习路径与知识地图', icon: '🗺️', link: '/S6-Go/00-总纲-学习路径与知识地图' },
      {
        text: '篇一 · 语言内功',
        icon: '🧱',
        items: [
          {
            text: '01 Go 基础语法与类型系统',
            icon: '📐',
            link: '/S6-Go/1-01-Go基础语法与类型系统',
          },
          { text: '02 函数、接口与错误处理', icon: '🔗', link: '/S6-Go/1-02-函数接口与错误处理' },
          { text: '03 并发编程', icon: '⚡', link: '/S6-Go/1-03-并发编程' },
          { text: '04 标准库与工程化基础', icon: '📦', link: '/S6-Go/1-04-标准库与工程化基础' },
        ],
      },
      {
        text: '篇二 · 底层原理',
        icon: '⚙️',
        items: [
          { text: '05 GMP 调度模型', icon: '🧭', link: '/S6-Go/2-05-GMP调度模型' },
          { text: '06 内存管理与 GC', icon: '🗑️', link: '/S6-Go/2-06-内存管理与GC' },
          { text: '07 核心数据结构底层', icon: '🔬', link: '/S6-Go/2-07-核心数据结构底层' },
          { text: '08 手写代码与算法实战', icon: '✍️', link: '/S6-Go/2-08-手写代码与算法实战' },
        ],
      },
      {
        text: '篇三 · 服务端工程',
        icon: '🚀',
        items: [
          { text: '09 Web 框架与 API 设计', icon: '🌐', link: '/S6-Go/3-09-Web框架与API设计' },
          { text: '10 MySQL 与数据访问', icon: '🗄️', link: '/S6-Go/3-10-MySQL与数据访问' },
          { text: '11 Redis 缓存与数据结构', icon: '📕', link: '/S6-Go/3-11-Redis' },
          { text: '12 缓存架构设计', icon: '🧊', link: '/S6-Go/3-12-缓存架构设计' },
          { text: '13 消息队列（Kafka/RabbitMQ）', icon: '📨', link: '/S6-Go/3-13-消息队列' },
          { text: '14 微服务架构', icon: '🧩', link: '/S6-Go/3-14-微服务架构' },
          { text: '15 容器技术与云原生', icon: '🐳', link: '/S6-Go/3-15-容器与云原生' },
        ],
      },
      {
        text: '篇四 · 系统与分布式',
        icon: '🌍',
        items: [
          { text: '16 网络与操作系统原理', icon: '🔌', link: '/S6-Go/4-16-网络与操作系统' },
          { text: '17 Linux 与运维', icon: '🐧', link: '/S6-Go/4-17-Linux与运维' },
          { text: '18 分布式系统原理', icon: '🕸️', link: '/S6-Go/4-18-分布式系统原理' },
          { text: '19 高可用架构设计', icon: '🛡️', link: '/S6-Go/4-19-高可用架构设计' },
        ],
      },
      {
        text: '篇五 · 工程效能',
        icon: '🔧',
        items: [
          { text: '20 性能优化实战', icon: '🚄', link: '/S6-Go/5-20-性能优化实战' },
          { text: '21 日志监控与可观测性', icon: '📊', link: '/S6-Go/5-21-日志监控与可观测性' },
          { text: '22 安全与加密', icon: '🔒', link: '/S6-Go/5-22-安全与加密' },
          { text: '23 CI/CD 与 DevOps', icon: '🔄', link: '/S6-Go/5-23-CICD与DevOps' },
          { text: '24 高级调试与工具链', icon: '🐞', link: '/S6-Go/5-24-调试与工具链' },
          { text: '25 项目规范与代码审查', icon: '📏', link: '/S6-Go/5-25-项目规范与代码审查' },
          { text: '26 Go 版本演进与新特性', icon: '🆕', link: '/S6-Go/5-26-Go版本演进与新特性' },
          { text: '27 Go 生态与开源', icon: '🌱', link: '/S6-Go/5-27-Go生态与开源' },
        ],
      },
      {
        text: '篇六 · 面试实战',
        icon: '🎯',
        items: [
          { text: '28 跨语言对比与技术选型', icon: '⚖️', link: '/S6-Go/6-28-跨语言对比与技术选型' },
          {
            text: '29 Go 与前端交互及 AI 工程化',
            icon: '🤝',
            link: '/S6-Go/6-29-Go与前端交互及AI工程化',
          },
          { text: '30 面试真题与系统设计', icon: '🏗️', link: '/S6-Go/6-30-面试真题与系统设计' },
          { text: '31 面试技巧与职业规划', icon: '🧭', link: '/S6-Go/6-31-面试技巧与职业规划' },
        ],
      },
    ],
  },
];
