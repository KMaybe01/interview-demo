import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { type SectionBlock, splitMarkdown } from '../utils/split-markdown';
import MarkdownRenderer from './MarkdownRenderer';

const OVERSCAN = 3;
const ROOT_MARGIN = '600px 0px';
const PLACEHOLDER_MIN_HEIGHT = 60;

export default function DocVirtualScroll({ content }: { content: string }) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const heightCache = useRef<Map<number, number>>(new Map());
  const activeRef = useRef<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [, forceUpdate] = useState(0);

  const sections = useMemo(() => splitMarkdown(content), [content]);

  const rerender = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  const isActive = useCallback((idx: number) => activeRef.current.has(idx), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const pending = new Set(activeRef.current);

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;

        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.sectionIdx);

          if (entry.isIntersecting) {
            if (!pending.has(idx)) {
              pending.add(idx);
              changed = true;
            }
            for (let i = idx - OVERSCAN; i <= idx + OVERSCAN; i++) {
              if (i >= 0 && i < sections.length && !pending.has(i)) {
                pending.add(i);
                changed = true;
              }
            }
          } else if (pending.has(idx)) {
            const nearestDist = Math.min(...Array.from(pending).map((s) => Math.abs(s - idx)));
            if (nearestDist > OVERSCAN * 2) {
              pending.delete(idx);
              changed = true;
            }
          }
        }

        if (changed) {
          activeRef.current = pending;
          rerender();
        }
      },
      { root: container, rootMargin: ROOT_MARGIN },
    );

    for (const [, el] of sentinelRefs.current.entries()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections.length, rerender]);

  const resolveHash = useCallback((locationHash: string): string => {
    const rawHash = locationHash || window.location.hash;
    if (!rawHash) return '';

    const stripped = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
    const targetHash = stripped.includes('#') ? (stripped.split('#').pop() ?? '') : stripped;
    const normalized = targetHash.replace(/^\/+/, '');
    try {
      return decodeURIComponent(normalized);
    } catch {
      return normalized;
    }
  }, []);

  const scrollToResolvedHash = useCallback(
    (hash: string) => {
      const targetHash = resolveHash(hash);
      if (!targetHash || sections.length === 0) return;

      const targetIdx = sections.findIndex((s) => s.anchorId === targetHash);
      if (targetIdx < 0) return;

      const next = new Set(activeRef.current);
      for (
        let i = Math.max(0, targetIdx - 1);
        i <= Math.min(sections.length - 1, targetIdx + 1);
        i++
      ) {
        next.add(i);
      }
      activeRef.current = next;
      rerender();

      const scrollToHash = (tries = 6) => {
        const el = document.getElementById(targetHash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        if (tries > 0) {
          window.setTimeout(() => scrollToHash(tries - 1), 50);
        }
      };

      window.setTimeout(() => {
        requestAnimationFrame(() => scrollToHash());
      }, 0);
    },
    [resolveHash, rerender, sections],
  );

  useEffect(() => {
    scrollToResolvedHash(window.location.hash || location.hash);
  }, [location.hash, scrollToResolvedHash]);

  useEffect(() => {
    const handleHashChange = () => scrollToResolvedHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [scrollToResolvedHash]);

  const setSentinelRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      if (el) sentinelRefs.current.set(idx, el);
      else sentinelRefs.current.delete(idx);
    },
    [],
  );

  const handleSectionMount = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      if (el && !heightCache.current.has(idx)) {
        heightCache.current.set(idx, el.offsetHeight);
      }
    },
    [],
  );

  const hasFragmentHash = Boolean(location.hash);

  if (sections.length <= 1 || hasFragmentHash) {
    return (
      <div className="doc-virtual-scroll" ref={containerRef}>
        <MarkdownRenderer content={content} basePath={location.pathname} />
      </div>
    );
  }

  return (
    <div className="doc-virtual-scroll" ref={containerRef}>
      {sections.map((section) => {
        const active = isActive(section.index);
        return (
          <div
            key={section.index}
            className={`doc-section ${active ? 'doc-section--active' : 'doc-section--placeholder'}`}
            ref={handleSectionMount(section.index)}
          >
            {active ? (
              <MarkdownRenderer content={section.content} basePath={location.pathname} />
            ) : (
              <SectionPlaceholder section={section} />
            )}
            <div
              ref={setSentinelRef(section.index)}
              data-section-idx={section.index}
              className="doc-section-sentinel"
            />
          </div>
        );
      })}
    </div>
  );
}

function SectionPlaceholder({ section }: { section: SectionBlock }) {
  return (
    <div className="doc-section-placeholder" style={{ minHeight: PLACEHOLDER_MIN_HEIGHT }}>
      {section.level === 1 ? (
        <h1 id={section.anchorId}>{section.heading}</h1>
      ) : section.level === 2 ? (
        <h2 id={section.anchorId}>{section.heading}</h2>
      ) : (
        <h3 id={section.anchorId}>{section.heading}</h3>
      )}
    </div>
  );
}
