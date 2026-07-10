import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import HeroCanvas from './HeroCanvas';

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
];

function FeatureCard({ f, i }: { f: (typeof features)[number]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-48px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
    >
      <Link to={f.link} className="feature-card">
        <span className="feature-icon">{f.icon}</span>
        <div className="feature-body">
          <strong className="feature-title">{f.title}</strong>
          <p className="feature-details">{f.details}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function MottoCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-32px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <motion.div
      className="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <section className="hero">
        <HeroCanvas />
        <div className="hero-bg" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="hero-title">前端知识体系</h1>
          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
          >
            <Link to="/S1-基础夯实/" className="hero-btn hero-btn-primary">
              开始学习
            </Link>
            <a
              href="https://gitlab.com/KMaybe-01/interview-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-btn hero-btn-secondary"
            >
              在 GitHub 查看
            </a>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="features"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-48px' }}
        transition={{ duration: 0.3 }}
      >
        <div className="features-grid">
          {features.map((f, i) => (
            <FeatureCard key={i} f={f} i={i} />
          ))}
        </div>
      </motion.section>

      <section className="home-motto">
        <motion.blockquote
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-48px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <strong>最佳跳槽时机 = 你不需要跳槽的时候</strong>
        </motion.blockquote>
        <div className="motto-cards">
          <MottoCard delay={0.1}>
            <div className="motto-card">
              <span className="motto-icon">🔋</span>
              <div className="motto-body">
                <strong>保持可被雇佣</strong>
                <p>每季度更新一次简历，让市场随时为你定价</p>
              </div>
            </div>
          </MottoCard>
          <MottoCard delay={0.2}>
            <div className="motto-card">
              <span className="motto-icon">🎯</span>
              <div className="motto-body">
                <strong>离职者心态打工</strong>
                <p>今天做的事，能写进下一份简历吗？</p>
              </div>
            </div>
          </MottoCard>
          <MottoCard delay={0.3}>
            <div className="motto-card">
              <span className="motto-icon">🛤️</span>
              <div className="motto-body">
                <strong>入职第一天就布局未来</strong>
                <p>积累「资本」而非「年谈资」，别让自己无处可去</p>
              </div>
            </div>
          </MottoCard>
        </div>
      </section>
    </motion.div>
  );
}
