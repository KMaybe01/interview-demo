export interface ChunkResult {
  chunks: string[];
  strategy: string;
  chunkCount: number;
  avgChunkSize: number;
}

export function splitByFixedSize(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
): ChunkResult {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    if (chunk.trim()) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return {
    chunks,
    strategy: 'fixed',
    chunkCount: chunks.length,
    avgChunkSize:
      chunks.length > 0 ? Math.round(chunks.reduce((a, c) => a + c.length, 0) / chunks.length) : 0,
  };
}

const SEPARATORS = ['\n## ', '\n\n', '\n', '.', '!', '?', ';', ',', ' '];

export function splitByRecursive(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
): ChunkResult {
  const chunks: string[] = [];

  function recursiveSplit(input: string, separatorIndex: number): string[] {
    if (input.length <= chunkSize || separatorIndex >= SEPARATORS.length) {
      return input.trim() ? [input] : [];
    }

    const sep = SEPARATORS[separatorIndex];
    const parts: string[] = [];
    let remaining = input;

    while (remaining.length > chunkSize) {
      let splitPos = remaining.lastIndexOf(sep, chunkSize);
      if (splitPos <= 0 || splitPos < chunkSize * 0.3) {
        splitPos = remaining.indexOf(sep, Math.floor(chunkSize * 0.7));
        if (splitPos < 0 || splitPos > chunkSize * 1.3) {
          splitPos = chunkSize;
        }
      }

      const part = remaining.slice(0, splitPos + (sep.length > 1 ? sep.length : 0)).trim();
      if (part) parts.push(part);

      remaining = remaining.slice(Math.max(0, splitPos - overlap));
    }

    if (remaining.trim()) parts.push(remaining.trim());
    return parts;
  }

  const result = recursiveSplit(text, 0);
  chunks.push(...result.filter((c) => c.length > 0));

  return {
    chunks,
    strategy: 'recursive',
    chunkCount: chunks.length,
    avgChunkSize:
      chunks.length > 0 ? Math.round(chunks.reduce((a, c) => a + c.length, 0) / chunks.length) : 0,
  };
}

const _SENTENCE_END = /[。！？.!?\n]/;

export function splitBySemantic(text: string, maxChunkSize: number = 500): ChunkResult {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (`${currentChunk}\n${para}`.length > maxChunkSize && currentChunk) {
      const sentences = currentChunk.match(/[^。！？.!?\n]+[。！？.!?\n]?/g);
      if (sentences) {
        let sentenceGroup = '';
        for (const sentence of sentences) {
          if ((sentenceGroup + sentence).length > maxChunkSize && sentenceGroup) {
            chunks.push(sentenceGroup.trim());
            sentenceGroup = sentence;
          } else {
            sentenceGroup += sentence;
          }
        }
        if (sentenceGroup.trim()) chunks.push(sentenceGroup.trim());
      } else {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${para}` : para;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return {
    chunks,
    strategy: 'semantic',
    chunkCount: chunks.length,
    avgChunkSize:
      chunks.length > 0 ? Math.round(chunks.reduce((a, c) => a + c.length, 0) / chunks.length) : 0,
  };
}

export type SplitStrategy = 'fixed' | 'recursive' | 'semantic';

export function splitText(
  text: string,
  strategy: SplitStrategy = 'recursive',
  chunkSize?: number,
  overlap?: number,
): ChunkResult {
  switch (strategy) {
    case 'fixed':
      return splitByFixedSize(text, chunkSize, overlap);
    case 'recursive':
      return splitByRecursive(text, chunkSize, overlap);
    case 'semantic':
      return splitBySemantic(text, chunkSize);
  }
}
