import { slugify } from './slugify'

export interface SectionBlock {
  index: number
  heading: string | null
  level: number
  content: string
  anchorId: string
  estimatedHeight: number
}

const LINE_HEIGHT = 24
const CODE_BLOCK_EXTRA = 120
const TABLE_EXTRA = 40
const IMAGE_EXTRA = 300
const MIN_HEIGHT = 60
const MAX_HEIGHT = 3000

function estimateHeight(content: string): number {
  const lines = content.split('\n').length
  let height = lines * LINE_HEIGHT

  const codeMatches = content.match(/```/g)
  if (codeMatches) height += (codeMatches.length / 2) * CODE_BLOCK_EXTRA

  const tableRows = content
    .split('\n')
    .filter((l) => l.includes('|') && l.trim().startsWith('|')).length
  height += tableRows * TABLE_EXTRA

  const imgMatches = content.match(/!\[.*?\]\(.*?\)/g)
  if (imgMatches) height += imgMatches.length * IMAGE_EXTRA

  return Math.max(MIN_HEIGHT, Math.min(height, MAX_HEIGHT))
}

export function splitMarkdown(md: string): SectionBlock[] {
  const lines = md.split('\n')
  const sections: SectionBlock[] = []
  let inCodeBlock = false
  let buffer: string[] = []
  let currentHeading: string | null = null
  let currentLevel = 0

  function flush() {
    if (buffer.length === 0) return
    const content = buffer.join('\n')
    sections.push({
      index: sections.length,
      heading: currentHeading,
      level: currentLevel,
      content,
      anchorId: currentHeading ? slugify(currentHeading) : '',
      estimatedHeight: estimateHeight(content),
    })
    buffer = []
  }

  for (const line of lines) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      buffer.push(line)
      continue
    }

    if (!inCodeBlock) {
      const match = trimmed.match(/^(#{1,3})\s+(.+)/)
      if (match) {
        flush()
        currentHeading = match[2].trim()
        currentLevel = match[1].length
        buffer.push(line)
        continue
      }
    }

    buffer.push(line)
  }

  flush()
  return sections
}
