import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { loadContent } from '../data/content';
import { slugify } from '../utils/slugify';
import { splitMarkdown } from '../utils/split-markdown';
import DocVirtualScroll from './DocVirtualScroll';
import Outline from './Outline';

interface Heading {
  level: number;
  text: string;
}

export default function DocPage() {
  const location = useLocation();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const headings = useMemo(() => {
    if (!content) return [];
    return splitMarkdown(content)
      .filter((s) => s.heading)
      .map((s) => ({ level: s.level, text: s.heading! }));
  }, [content]);
  const [notFound, setNotFound] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const headingIdsRef = useRef<Map<Element, string>>(new Map());

  const getHeadingId = useCallback((el: Element): string => {
    return el.id || slugify(el.textContent || '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setContent(null);

    loadContent(location.pathname)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setContent(result.content);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!content || loading) return;

    const headingSelector = '.doc-content h1[id], .doc-content h2[id], .doc-content h3[id]';
    const headingIds = new Map<Element, string>();
    headingIdsRef.current = headingIds;

    const callback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = headingIds.get(entry.target) || getHeadingId(entry.target);
          setActiveHeadingId(id);
        }
      }
    };

    const setupObserver = () => {
      observerRef.current?.disconnect();

      const elements = document.querySelectorAll(headingSelector);
      if (elements.length === 0) return;

      for (const el of elements) {
        headingIds.set(el, getHeadingId(el));
      }

      observerRef.current = new IntersectionObserver(callback, {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      });

      for (const el of elements) {
        observerRef.current!.observe(el);
      }
    };

    const timer = setTimeout(setupObserver, 100);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
      headingIds.clear();
    };
  }, [content, loading, getHeadingId]);

  if (loading) {
    return (
      <div className="doc-page">
        <motion.div
          className="doc-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="spinner" />
          <div className="loading-text">加载中...</div>
        </motion.div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="doc-page">
        <motion.div
          className="doc-error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1>404</h1>
          <p>页面未找到</p>
          <Link to="/" className="doc-error-link">
            返回首页
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="doc-page"
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="doc-content">
        <DocVirtualScroll content={content!} />
      </div>
      {headings.length > 0 && <Outline headings={headings} activeId={activeHeadingId} />}
    </motion.div>
  );
}
