import hljs from 'highlight.js'
import {
  type ReactNode,
  Suspense,
  isValidElement,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { useNavigate } from 'react-router'
import remarkGfm from 'remark-gfm'
import { slugify } from '../utils/slugify'

const MermaidDiagram = lazy(() => import('./MermaidDiagram'))
const LANG_RE = /language-(\w+)/

function resolveInternalUrl(href: string, basePath: string): string {
  const stripped = href.replace(/\.md$/i, '')
  if (stripped.startsWith('/')) return stripped
  const dir = basePath.endsWith('/') ? basePath : basePath.replace(/\/[^/]*$/, '/')
  const resolved = new URL(stripped, window.location.origin + dir)
  return resolved.pathname
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])

  return (
    <button className="code-copy-btn" onClick={handleCopy} type="button" aria-label="复制代码">
      {copied ? '✓' : '复制'}
    </button>
  )
}

function LightboxImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const drag = useRef({ dragging: false, startX: 0, startY: 0, tx: 0, ty: 0 })
  const lightboxRef = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: need open to re-attach when element mounts
  useEffect(() => {
    const el = lightboxRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setScale((s) => Math.max(0.25, Math.min(5, s - e.deltaY * 0.002)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      drag.current = {
        dragging: true,
        startX: e.clientX - translate.x,
        startY: e.clientY - translate.y,
        tx: translate.x,
        ty: translate.y,
      }
      e.preventDefault()
    },
    [translate],
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.current.dragging) return
    setTranslate({
      x: e.clientX - drag.current.startX,
      y: e.clientY - drag.current.startY,
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    drag.current.dragging = false
  }, [])

  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="lightbox-trigger"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        style={{ cursor: 'pointer' }}
      />
      {open && (
        <div
          className="lightbox-overlay"
          onClick={handleClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClose()
          }}
        >
          <button className="lightbox-close" onClick={handleClose} type="button" aria-label="关闭">
            ×
          </button>
          <div
            ref={lightboxRef}
            className="lightbox-image-wrapper"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={() => {
              setScale(1)
              setTranslate({ x: 0, y: 0 })
            }}
          >
            <img
              src={src}
              alt={alt}
              className="lightbox-image"
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                cursor: scale > 1 ? 'grab' : 'default',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default function MarkdownRenderer({
  content,
  basePath,
}: {
  content: string
  basePath: string
}) {
  const navigate = useNavigate()

  const components = useMemo<Partial<Components>>(
    () => ({
      code({ className, children, ...props }) {
        const match = LANG_RE.exec(className || '')
        const lang = match?.[1]
        const code = String(children).replace(/\n$/, '')

        if (lang === 'mermaid') {
          return (
            <Suspense fallback={<div className="mermaid-loading">Loading diagram…</div>}>
              <MermaidDiagram chart={code} />
            </Suspense>
          )
        }

        if (lang && hljs.getLanguage(lang)) {
          const { value } = hljs.highlight(code, { language: lang })
          return (
            <pre className={className}>
              <CopyButton text={code} />
              <code dangerouslySetInnerHTML={{ __html: value }} />
            </pre>
          )
        }

        if (lang) {
          const { value } = hljs.highlightAuto(code)
          return (
            <pre className={className}>
              <CopyButton text={code} />
              <code dangerouslySetInnerHTML={{ __html: value }} />
            </pre>
          )
        }

        return <code {...props}>{children}</code>
      },

      a({ href, children, ...props }) {
        if (!href) return <span {...props}>{children}</span>

        const isExternal = href.startsWith('http') || href.startsWith('//')
        const isAnchor = href.startsWith('#')

        if (isExternal) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          )
        }

        if (isAnchor) {
          return (
            <a
              href={href}
              {...props}
              onClick={(e) => {
                e.preventDefault()
                const id = href.slice(1)
                const el = document.getElementById(id)
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              {children}
            </a>
          )
        }

        const resolved = resolveInternalUrl(href, basePath)

        return (
          <a
            href={resolved}
            {...props}
            onClick={(e) => {
              e.preventDefault()
              navigate(resolved)
            }}
          >
            {children}
          </a>
        )
      },

      img({ src, alt, ...props }) {
        if (!src) return null
        return <LightboxImage src={src} alt={alt || ''} />
      },

      h1({ children, ...props }) {
        const text = extractText(children)
        return (
          <h1 id={slugify(text)} {...props}>
            {children}
          </h1>
        )
      },
      h2({ children, ...props }) {
        const text = extractText(children)
        return (
          <h2 id={slugify(text)} {...props}>
            {children}
          </h2>
        )
      },
      h3({ children, ...props }) {
        const text = extractText(children)
        return (
          <h3 id={slugify(text)} {...props}>
            {children}
          </h3>
        )
      },
    }),
    [navigate, basePath],
  )

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children)
  }
  return ''
}
