import mermaid from 'mermaid'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const svgRef = useRef('')
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`)
  const initialized = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const drag = useRef({ dragging: false, startX: 0, startY: 0, tx: 0, ty: 0 })
  const lightboxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        themeVariables: {
          primaryColor: '#3eaf7c',
          primaryTextColor: '#fff',
          primaryBorderColor: '#2d8f5e',
          lineColor: '#666',
          secondaryColor: '#2196f3',
          tertiaryColor: '#f5f5f5',
        },
      })
    }
    let cancelled = false
    mermaid.render(idRef.current, chart).then(({ svg }) => {
      if (!cancelled && ref.current) {
        ref.current.innerHTML = svg
        svgRef.current = svg
      }
    })
    return () => {
      cancelled = true
    }
  }, [chart])

  // biome-ignore lint/correctness/useExhaustiveDependencies: need open to re-attach wheel listener when lightbox mounts
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

  useEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return
    const svg = el.querySelector('svg')
    if (!svg) return

    const svgW = svg.getBoundingClientRect().width
    const svgH = svg.getBoundingClientRect().height
    if (svgW === 0 || svgH === 0) return

    const vw = window.innerWidth * 0.9
    const vh = window.innerHeight * 0.9
    const fitScale = Math.min(vw / svgW, vh / svgH)
    setScale(Math.max(0.25, Math.min(5, fitScale)))
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
      <div
        className="mermaid-wrapper"
        ref={ref}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        role="button"
        tabIndex={0}
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
            className="lightbox-mermaid"
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
            style={{ cursor: drag.current.dragging ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
          >
            <div
              ref={contentRef}
              className="lightbox-mermaid-content"
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              }}
              dangerouslySetInnerHTML={{ __html: svgRef.current }}
            />
          </div>
        </div>
      )}
    </>
  )
}
