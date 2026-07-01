import { describe, expect, it } from 'vitest';
import { LRUCache } from '../lru.ts';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>(3);
    cache.put('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('returns undefined for missing key', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('evicts least recently used item when over capacity', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('promotes accessed item to most recent', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.get('a');
    cache.put('c', 3);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('updates existing key without changing order beyond delete+add', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('a', 10);
    cache.put('c', 3);
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBeUndefined();
  });

  it('reports correct size', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.size).toBe(0);
    cache.put('a', 1);
    expect(cache.size).toBe(1);
    cache.put('b', 2);
    expect(cache.size).toBe(2);
  });

  it('checks key existence with has()', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.has('a')).toBe(false);
    cache.put('a', 1);
    expect(cache.has('a')).toBe(true);
  });

  it('returns all keys', () => {
    const cache = new LRUCache<string, number>(3);
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.keys()).toEqual(['a', 'b']);
  });

  it('clears all entries', () => {
    const cache = new LRUCache<string, number>(3);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});
