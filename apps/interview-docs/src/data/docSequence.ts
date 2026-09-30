import { getAllDocUrls } from './docUrls';
import { type NavItem, navConfig } from './navigation';

export interface DocRef {
  url: string;
  title: string;
}

const NUMBER_PREFIX_RE =
  /^(?:\d+|阶段\d+(?:-\d+)?|第[一二三四五六七八九十百千\d]+[章讲部节])[-—、.\s]*/;

const collator = new Intl.Collator('zh', { numeric: true, sensitivity: 'base' });

/** 侧边栏导航中 link → text 的标题映射（link 去尾部斜杠，首页 `/` 排除） */
const navTitles = new Map<string, string>();

function collectNavTitles(items: NavItem[]): void {
  for (const item of items) {
    if (item.link && item.link !== '/') {
      const key = item.link.replace(/\/+$/, '');
      if (!navTitles.has(key)) {
        navTitles.set(key, item.text);
      }
    }
    if (item.items) {
      collectNavTitles(item.items);
    }
  }
}

collectNavTitles(navConfig);

/**
 * 按 URL 路径段做数字感知的中文自然排序（`阶段02` < `阶段10`，`01-HTML` < `02-CSS`），
 * 前缀相同时路径更短者（阶段 index 概览页）在前。
 */
function compareDocUrls(a: string, b: string): number {
  const pa = a.split('/').filter(Boolean);
  const pb = b.split('/').filter(Boolean);
  const len = Math.min(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const result = collator.compare(pa[i], pb[i]);
    if (result !== 0) return result;
  }
  return pa.length - pb.length;
}

/** 全部文档的有序阅读序列 */
export const sortedDocUrls: string[] = getAllDocUrls().sort(compareDocUrls);

function titleFromSegment(segment: string): string {
  const stripped = segment.replace(NUMBER_PREFIX_RE, '').trim();
  return stripped || segment;
}

function toDocRef(url: string): DocRef {
  const lastSegment = url.split('/').filter(Boolean).pop() ?? url;
  return { url, title: navTitles.get(url) ?? titleFromSegment(lastSegment) };
}

export function getAdjacentDocs(url: string): { prev: DocRef | null; next: DocRef | null } {
  const idx = sortedDocUrls.indexOf(url);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? toDocRef(sortedDocUrls[idx - 1]) : null,
    next: idx < sortedDocUrls.length - 1 ? toDocRef(sortedDocUrls[idx + 1]) : null,
  };
}
