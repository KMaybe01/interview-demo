import { describe, expect, it } from 'vitest';
import { getAdjacentDocs, sortedDocUrls } from '../docSequence';
import { getAllDocUrls } from '../docUrls';
import { type NavItem, navConfig } from '../navigation';

function collectLinks(items: NavItem[], acc: Set<string> = new Set()): Set<string> {
  for (const item of items) {
    if (item.link) acc.add(item.link.replace(/\/+$/, ''));
    if (item.items) collectLinks(item.items, acc);
  }
  return acc;
}

describe('docSequence', () => {
  it('builds a non-empty ordered doc list', () => {
    expect(sortedDocUrls.length).toBeGreaterThan(0);
    expect(new Set(sortedDocUrls).size).toBe(sortedDocUrls.length);
  });

  it('uses natural numeric ordering for stage files', () => {
    const s6first = sortedDocUrls.find((u) => u.startsWith('/S6-Go/1-04'));
    const s6later = sortedDocUrls.find((u) => u.startsWith('/S6-Go/3-10'));
    if (s6first && s6later) {
      expect(sortedDocUrls.indexOf(s6first)).toBeLessThan(sortedDocUrls.indexOf(s6later));
    }
  });

  it('returns null prev for the first doc and null next for the last doc', () => {
    expect(getAdjacentDocs(sortedDocUrls[0]).prev).toBeNull();
    expect(getAdjacentDocs(sortedDocUrls[sortedDocUrls.length - 1]).next).toBeNull();
  });

  it('returns adjacent docs for a middle doc', () => {
    const midIdx = Math.floor(sortedDocUrls.length / 2);
    const { prev, next } = getAdjacentDocs(sortedDocUrls[midIdx]);

    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
    expect(prev?.url).toBe(sortedDocUrls[midIdx - 1]);
    expect(next?.url).toBe(sortedDocUrls[midIdx + 1]);
    expect(prev?.title.length).toBeGreaterThan(0);
    expect(next?.title.length).toBeGreaterThan(0);
  });

  it('returns both null for an unknown url', () => {
    expect(getAdjacentDocs('/not-a-real-doc')).toEqual({ prev: null, next: null });
  });

  it('resolves title from nav config when available', () => {
    const { next } = getAdjacentDocs('/S6-Go');
    expect(next).not.toBeNull();
    expect(next?.title).toBe('学习路径与知识地图');
  });

  it('covers every S6-Go document in the sidebar nav', () => {
    const links = collectLinks(navConfig);
    const s6Docs = getAllDocUrls().filter((u) => u.startsWith('/S6-Go'));
    const missing = s6Docs.filter((u) => !links.has(u.replace(/\/+$/, '')));

    expect(missing).toEqual([]);
    expect(s6Docs.length).toBeGreaterThanOrEqual(32);
  });

  it('has no dead S6-Go links in the sidebar nav', () => {
    const docs = new Set(getAllDocUrls().map((u) => u.replace(/\/+$/, '')));
    const dead = [...collectLinks(navConfig)].filter((l) => l.startsWith('/S6-Go') && !docs.has(l));

    expect(dead).toEqual([]);
  });
});
