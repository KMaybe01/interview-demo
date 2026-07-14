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
      { text: '框架对比', icon: '⚖️', link: '/S2-框架深入/04-框架对比/' },
      { text: 'Angular22', icon: '🅰️', link: '/S2-框架深入/03-Angular22' },
      { text: 'React19', icon: '⚛️', link: '/S2-框架深入/02-React19/' },
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
      { text: '阶段概览', icon: '📖', link: '/S4-面试冲刺/' },
      { text: '简历', icon: '📝', link: '/S4-面试冲刺/01-简历' },
      { text: '简历问题', icon: '⚛️', link: '/S4-面试冲刺/02-简历问题' },
      { text: '反向面试', icon: '📌', link: '/S4-面试冲刺/05-反向面试' },
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
    ],
  },
  {
    text: 'AI 前沿',
    icon: '🤖',
    items: [
      { text: '阶段概览', icon: '📖', link: '/S5-AI/' },
      {
        text: '实战篇',
        icon: '⚡',
        items: [
          { text: 'AI推荐学习', icon: '🎯', link: '/S5-AI/实战篇/00-AI推荐学习' },
          { text: '入门期-AI聊天室', icon: '💬', link: '/S5-AI/实战篇/01-入门期-AI聊天室' },
          { text: '进阶期-RAG应用', icon: '🔗', link: '/S5-AI/实战篇/02-进阶期-RAG应用' },
          { text: '深耕期-端侧推理', icon: '📱', link: '/S5-AI/实战篇/03-深耕期-端侧推理' },
          { text: '专家期-Agent设计', icon: '🤖', link: '/S5-AI/实战篇/04-专家期-Agent设计' },
          { text: '生产化与工程化', icon: '🏭', link: '/S5-AI/实战篇/05-生产化与工程化' },
          { text: '前沿技术与生态', icon: '🔬', link: '/S5-AI/实战篇/06-前沿技术与生态' },
          { text: '技术选型对比合集', icon: '⚖️', link: '/S5-AI/实战篇/07-技术选型对比合集' },
          { text: '开发实战与架构指南', icon: '🛠️', link: '/S5-AI/实战篇/08-开发实战与架构指南' },
        ],
      },
      {
        text: '面试篇',
        icon: '📝',
        items: [
          { text: '基础篇', icon: '📐', link: '/S5-AI/面试篇/01-基础篇' },
          { text: '工具协议篇', icon: '🧰', link: '/S5-AI/面试篇/02-工具协议篇' },
          { text: '大模型基础篇', icon: '🧠', link: '/S5-AI/面试篇/03-大模型基础篇' },
          { text: '框架工具链篇', icon: '🔧', link: '/S5-AI/面试篇/04-框架工具链篇' },
          { text: '实战项目篇', icon: '🚀', link: '/S5-AI/面试篇/05-实战项目篇' },
          { text: '前沿趋势篇', icon: '🔮', link: '/S5-AI/面试篇/06-前沿趋势篇' },
        ],
      },
      {
        text: '课程实战',
        icon: '📚',
        items: [
          { text: '课程总览', icon: '📖', link: '/S5-AI/课程实战/' },
          { text: 'RAG全栈技术实战', icon: '📖', link: '/S5-AI/课程实战/01-RAG全栈技术实战' },
          {
            text: 'MCP+A2A多Agent全栈实战',
            icon: '🤝',
            link: '/S5-AI/课程实战/02-MCP+A2A多Agent全栈实战',
          },
          { text: 'AI编程智能体实战', icon: '🤖', link: '/S5-AI/课程实战/03-AI编程智能体实战' },
          {
            text: 'AI Agent全流程解决方案实战',
            icon: '🔄',
            link: '/S5-AI/课程实战/04-AI Agent全流程解决方案实战',
          },
          { text: '大模型训练', icon: '🧠', link: '/S5-AI/课程实战/05-大模型训练' },
          { text: 'Ollama学习文档', icon: '🦙', link: '/S5-AI/课程实战/06-Ollama学习文档' },
          { text: 'Agent全栈开发实战', icon: '🚀', link: '/S5-AI/课程实战/07-Agent全栈开发实战' },
        ],
      },
    ],
  },
  {
    text: 'Go 语言',
    icon: '🐹',
    items: [
      { text: '阶段概览', icon: '📖', link: '/S6-Go/' },
      { text: 'Go学习路径', icon: '🗺️', link: '/S6-Go/00-Go学习路径' },
      { text: '基础篇 (1-4)', icon: '🧱', link: '/S6-Go/阶段01-基础筑基' },
      { text: '进阶篇 (5-12)', icon: '🚀', link: '/S6-Go/阶段05-云原生架构进阶' },
      { text: '高级篇 (13-18)', icon: '🏆', link: '/S6-Go/阶段13-Go生态与开源' },
      { text: '面试与规划 (19-23)', icon: '🎯', link: '/S6-Go/阶段19-面试技巧与职业规划' },
      { text: '微服务与容器 (24-25)', icon: '🐳', link: '/S6-Go/阶段24-微服务架构深度' },
      { text: '中间件深度 (26-32)', icon: '⚙️', link: '/S6-Go/阶段26-Redis' },
    ],
  },
];
