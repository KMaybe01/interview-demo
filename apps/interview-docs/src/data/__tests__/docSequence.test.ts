import { describe, expect, it } from 'vitest';
import { getAdjacentDocs, sortedDocUrls } from '../docSequence';

describe('docSequence', () => {
  it('builds a non-empty ordered doc list', () => {
    expect(sortedDocUrls.length).toBeGreaterThan(0);
    expect(new Set(sortedDocUrls).size).toBe(sortedDocUrls.length);
  });

  it('uses natural numeric ordering for stage files', () => {
    const stage02 = sortedDocUrls.find((u) => u.startsWith('/S6-Go/阶段02'));
    const stage10 = sortedDocUrls.find((u) => u.startsWith('/S6-Go/阶段10'));
    if (stage02 && stage10) {
      expect(sortedDocUrls.indexOf(stage02)).toBeLessThan(sortedDocUrls.indexOf(stage10));
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
    expect(next?.title).toBe('Go学习路径');
  });
});
