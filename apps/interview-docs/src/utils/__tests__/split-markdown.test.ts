import { describe, expect, it } from 'vitest'
import { splitMarkdown } from '../split-markdown'

describe('splitMarkdown', () => {
  it('splits markdown into sections by headings', () => {
    const md = [
      '# Title',
      '',
      'Some content here.',
      '',
      '## Section 1',
      '',
      'Content for section 1.',
      '',
      '### Sub section',
      '',
      'Sub content.',
      '',
      '## Section 2',
      '',
      'Content for section 2.',
    ].join('\n')

    const sections = splitMarkdown(md)
    expect(sections).toHaveLength(4)
    expect(sections[0].heading).toBe('Title')
    expect(sections[0].level).toBe(1)
    expect(sections[1].heading).toBe('Section 1')
    expect(sections[1].level).toBe(2)
    expect(sections[2].heading).toBe('Sub section')
    expect(sections[2].level).toBe(3)
    expect(sections[3].heading).toBe('Section 2')
    expect(sections[3].level).toBe(2)
  })

  it('handles markdown without headings', () => {
    const md = 'Just a paragraph.\n\nAnother paragraph.'
    const sections = splitMarkdown(md)
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBeNull()
    expect(sections[0].content).toBe(md)
  })

  it('ignores headings inside code blocks', () => {
    const md = [
      '## Real Heading',
      '',
      '```',
      '# Fake Heading',
      '## Another Fake',
      '```',
      '',
      '## After Code',
    ].join('\n')

    const sections = splitMarkdown(md)
    expect(sections).toHaveLength(2)
    expect(sections[0].heading).toBe('Real Heading')
    expect(sections[1].heading).toBe('After Code')
  })

  it('assigns index, anchorId, and estimatedHeight to each section', () => {
    const md = '# Hello\n\ncontent\n\n## World\n\nmore content'
    const sections = splitMarkdown(md)

    expect(sections).toHaveLength(2)
    expect(sections[0].index).toBe(0)
    expect(sections[0].anchorId).toBe('hello')
    expect(sections[0].estimatedHeight).toBeGreaterThan(0)
    expect(sections[1].index).toBe(1)
    expect(sections[1].anchorId).toBe('world')
  })

  it('handles empty input', () => {
    const sections = splitMarkdown('')
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBeNull()
  })

  it('handles heading with extra whitespace', () => {
    const md = '##   Spaced   Heading   '
    const sections = splitMarkdown(md)
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('Spaced   Heading')
  })
})
