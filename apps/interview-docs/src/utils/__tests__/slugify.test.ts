import { describe, expect, it } from 'vitest'
import { slugify } from '../slugify'

describe('slugify', () => {
  it('converts simple text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Hello & World!')).toBe('hello--world')
  })

  it('handles Chinese characters', () => {
    const result = slugify('前端基础')
    expect(result).toContain('前端基础')
    expect(result).not.toMatch(/^-|-$/)
  })

  it('handles Japanese characters', () => {
    const result = slugify('こんにちは')
    expect(result).toContain('こんにちは')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello-world--')).toBe('hello-world')
  })

  it('collapses multiple spaces into single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('returns empty string for only special chars', () => {
    expect(slugify('!@#$%^&*()')).toBe('')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})
