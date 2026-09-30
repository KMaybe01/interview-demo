import { Link } from 'react-router';
import type { DocRef } from '../data/docSequence';

interface DocPageNavProps {
  prev: DocRef | null;
  next: DocRef | null;
}

export default function DocPageNav({ prev, next }: DocPageNavProps) {
  if (!prev && !next) return null;

  return (
    <nav className="doc-nav" aria-label="章节导航">
      {prev ? (
        <Link to={prev.url} className="doc-nav-link doc-nav-link--prev">
          <span className="doc-nav-label">← 上一章节</span>
          <span className="doc-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <span
          className="doc-nav-link doc-nav-link--prev doc-nav-link--disabled"
          aria-disabled="true"
        >
          <span className="doc-nav-label">← 上一章节</span>
          <span className="doc-nav-title">已是第一章</span>
        </span>
      )}
      {next ? (
        <Link to={next.url} className="doc-nav-link doc-nav-link--next">
          <span className="doc-nav-label">下一章节 →</span>
          <span className="doc-nav-title">{next.title}</span>
        </Link>
      ) : (
        <span
          className="doc-nav-link doc-nav-link--next doc-nav-link--disabled"
          aria-disabled="true"
        >
          <span className="doc-nav-label">下一章节 →</span>
          <span className="doc-nav-title">已是最后一章</span>
        </span>
      )}
    </nav>
  );
}
