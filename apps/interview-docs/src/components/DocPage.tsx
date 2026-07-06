import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { loadContent } from '../data/content'
import { splitMarkdown } from '../utils/split-markdown'
import DocVirtualScroll from './DocVirtualScroll'
import Outline from './Outline'

interface Heading {
  level: number
  text: string
}

export default function DocPage() {
  const location = useLocation()
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const headings = useMemo(() => {
    if (!content) return []
    return splitMarkdown(content)
      .filter((s) => s.heading)
      .map((s) => ({ level: s.level, text: s.heading! }))
  }, [content])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setContent(null)

    loadContent(location.pathname)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setContent(result.content)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (loading) {
    return (
      <div className="doc-page">
        <div className="doc-loading">
          <div className="spinner" />
          <div className="loading-text">加载中...</div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="doc-page">
        <div className="doc-error">
          <h1>404</h1>
          <p>页面未找到</p>
          <Link to="/" className="doc-error-link">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="doc-page">
      <div className="doc-content">
        <DocVirtualScroll content={content!} />
      </div>
      {headings.length > 0 && <Outline headings={headings} />}
    </div>
  )
}
