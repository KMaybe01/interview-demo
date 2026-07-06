import { Link } from 'react-router'
import HeroCanvas from './HeroCanvas'

const features = [
  {
    icon: '📚',
    title: 'S1 基础夯实',
    details: 'HTML5 · CSS3 · JavaScript 核心 · Web API · 20+ 手写实现',
    link: '/S1-基础夯实/',
  },
  {
    icon: '⚛️',
    title: 'S2 框架深入',
    details: 'Vue3 · React19 · Angular21 · 框架对比与选型',
    link: '/S2-框架深入/',
  },
  {
    icon: '🚀',
    title: 'S3 进阶提升',
    details: '浏览器原理 · 性能优化 · 工程化 · 监控埋点 · Node.js',
    link: '/S3-进阶提升/',
  },
  {
    icon: '🎯',
    title: 'S4 面试冲刺',
    details: '简历优化 · 项目复盘 · 反向面试 · 真实项目深度分析',
    link: '/S4-面试冲刺/',
  },
  {
    icon: '🤖',
    title: 'S5 AI 前沿',
    details: 'AI Agent · RAG · 端侧推理 · MCP/A2A 协议 · 大模型基础',
    link: '/S5-AI/',
  },
  {
    icon: '🐹',
    title: 'S6 Go 语言',
    details: 'Go 基础 · 并发编程 · Web 开发 · 微服务架构',
    link: '/S6-Go/',
  },
]

export default function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <HeroCanvas />
        <div className="hero-bg" />
        <div className="hero-content">
          <h1 className="hero-title">前端知识体系</h1>
          <div className="hero-actions">
            <Link to="/S1-基础夯实/" className="hero-btn hero-btn-primary">
              开始学习
            </Link>
            <a
              href="https://github.com/KMaybe01/common"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-btn hero-btn-secondary"
            >
              在 GitHub 查看
            </a>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-grid">
          {features.map((f, i) => (
            <Link key={i} to={f.link} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-body">
                <strong className="feature-title">{f.title}</strong>
                <p className="feature-details">{f.details}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-motto">
        <blockquote>
          <strong>最佳跳槽时机 = 你不需要跳槽的时候</strong>
        </blockquote>
        <div className="motto-cards">
          <div className="motto-card">
            <span className="motto-icon">🔋</span>
            <div className="motto-body">
              <strong>保持可被雇佣</strong>
              <p>每季度更新一次简历，让市场随时为你定价</p>
            </div>
          </div>
          <div className="motto-card">
            <span className="motto-icon">🎯</span>
            <div className="motto-body">
              <strong>离职者心态打工</strong>
              <p>今天做的事，能写进下一份简历吗？</p>
            </div>
          </div>
          <div className="motto-card">
            <span className="motto-icon">🛤️</span>
            <div className="motto-body">
              <strong>入职第一天就布局未来</strong>
              <p>积累「资本」而非「年谈资」，别让自己无处可去</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
