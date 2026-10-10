import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { loadContent } from '../data/content';
import { getAdjacentDocs } from '../data/docSequence';
import { slugify } from '../utils/slugify';
import { splitMarkdown } from '../utils/split-markdown';
import DocPageNav from './DocPageNav';
import DocVirtualScroll from './DocVirtualScroll';
import Outline from './Outline';

interface Heading {
  level: number;
  text: string;
}

export default function DocPage() {
  const location = useLocation();
  const [content, setContent] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const headings = useMemo(() => {
    if (!content) return [];
    return splitMarkdown(content)
      .filter((s) => s.heading)
      .map((s) => ({ level: s.level, text: s.heading! }));
  }, [content]);
  const [notFound, setNotFound] = useState(false);
  const { prev, next } = useMemo(() => getAdjacentDocs(docUrl), [docUrl]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const headingIdsRef = useRef<Map<Element, string>>(new Map());
  // 点击目录后进入短暂锁定：平滑滚动 + 虚拟滚动回填期间不让滚动观察器覆盖高亮
  const scrollLockRef = useRef(false);
  const lockTimersRef = useRef<number[]>([]);

  const clearLockTimers = useCallback(() => {
    for (const t of lockTimersRef.current) {
      window.clearTimeout(t);
    }
    lockTimersRef.current = [];
  }, []);

  const getHeadingId = useCallback((el: Element): string => {
    return el.id || slugify(el.textContent || '');
  }, []);

  const handleOutlineSelect = useCallback(
    (id: string) => {
      clearLockTimers();
      scrollLockRef.current = true;
      setActiveHeadingId(id);

      // 虚拟滚动下目标节点可能先以占位节点存在，真实内容回填后位置会变化，需要多次校正
      const scrollToTarget = (tries = 6) => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (tries > 0) {
          lockTimersRef.current.push(window.setTimeout(() => scrollToTarget(tries - 1), 60));
        }
      };
      scrollToTarget();

      lockTimersRef.current.push(
        window.setTimeout(() => {
          scrollLockRef.current = false;
        }, 800),
      );
    },
    [clearLockTimers],
  );

  useEffect(() => clearLockTimers, [clearLockTimers]);

  useEffect(() => {
    let cancelled = false;
    clearLockTimers();
    scrollLockRef.current = false;
    setLoading(true);
    setNotFound(false);
    setContent(null);
    setDocUrl('');
    setActiveHeadingId('');

    loadContent(location.pathname)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setContent(result.content);
        setDocUrl(result.url);
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
  }, [location.pathname, clearLockTimers]);

  useEffect(() => {
    if (!content || loading) return;

    const headingSelector = '.doc-content h1[id], .doc-content h2[id], .doc-content h3[id]';
    const headingIds = new Map<Element, string>();
    headingIdsRef.current = headingIds;

    const callback: IntersectionObserverCallback = (entries) => {
      if (scrollLockRef.current) return;

      // 同一批回调里可能有多个标题命中，取最靠上的那个，避免下方标题抢走高亮
      let topEntry: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
          topEntry = entry;
        }
      }
      if (topEntry) {
        const id = headingIds.get(topEntry.target) || getHeadingId(topEntry.target);
        setActiveHeadingId(id);
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

    // 虚拟滚动会把占位节点替换成真实内容，已观察的节点随之脱离文档，需要重新挂载观察
    let mutationTimer = 0;
    const contentRoot = document.querySelector('.doc-content');
    const mutationObserver = contentRoot
      ? new MutationObserver(() => {
          window.clearTimeout(mutationTimer);
          mutationTimer = window.setTimeout(setupObserver, 150);
        })
      : null;
    mutationObserver?.observe(contentRoot!, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      window.clearTimeout(mutationTimer);
      mutationObserver?.disconnect();
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
        <DocPageNav prev={prev} next={next} />
      </div>
      {headings.length > 0 && (
        <Outline headings={headings} activeId={activeHeadingId} onSelect={handleOutlineSelect} />
      )}
    </motion.div>
  );
}
