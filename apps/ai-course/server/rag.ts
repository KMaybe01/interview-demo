/**
 * 第二关：RAG 的检索层（教学版）。
 *
 * 刻意先用「关键词检索（BM25 思路）」把链路跑通——零依赖、可验证：
 *   文档 → 分块 → 建索引 → 检索 → 拼上下文
 * 换成向量/混合检索时，**只需要替换 search()**，其余环节不动。
 */

export interface Chunk {
  id: string;
  docId: string;
  index: number;
  text: string;
}

export interface ScoredChunk extends Chunk {
  score: number;
}

export interface Document {
  id: string;
  title: string;
  chunkCount: number;
}

interface StoredDocument {
  id: string;
  title: string;
  chunks: Chunk[];
}

const documents = new Map<string, StoredDocument>();
let docSequence = 0;

/** 分块：按段落聚合到目标长度，块间保留重叠。 */
export function chunkDocument(text: string, size = 500, overlap = 60): string[] {
  const paragraphs = text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > size) {
      chunks.push(current);
      current = overlap > 0 ? current.slice(-overlap) : '';
    }
    current = current ? `${current}\n${paragraph}` : paragraph;

    // 超长段落（没有换行的整块文本）按 size 再切一刀
    while (current.length > size * 2) {
      chunks.push(current.slice(0, size));
      current = current.slice(size - overlap);
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

/** 极简分词：拉丁词按词分，中文按字分（教学用，不追求分词质量）。 */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fa5]/g) ?? [];
}

export function addDocument(title: string, text: string): Document {
  docSequence += 1;
  const id = `doc_${docSequence}`;
  const chunks = chunkDocument(text).map((chunkText, index) => ({
    id: `${id}#${index}`,
    docId: id,
    index,
    text: chunkText,
  }));
  documents.set(id, { id, title, chunks });
  return { id, title, chunkCount: chunks.length };
}

export function listDocuments(): Document[] {
  return [...documents.values()].map((doc) => ({
    id: doc.id,
    title: doc.title,
    chunkCount: doc.chunks.length,
  }));
}

function allChunks(): Chunk[] {
  return [...documents.values()].flatMap((doc) => doc.chunks);
}

/**
 * BM25 思路的打分：Σ tf(归一化) × idf。
 * idf = log(1 + N / (1 + df))，df 为包含该词的块数。
 */
export function search(query: string, topK = 3): ScoredChunk[] {
  const chunks = allChunks();
  if (chunks.length === 0) return [];

  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0) return [];

  const df = new Map<string, number>();
  for (const chunk of chunks) {
    for (const term of new Set(tokenize(chunk.text))) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const total = chunks.length;

  const scored = chunks.map((chunk) => {
    const tokens = tokenize(chunk.text);
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const tf = (counts.get(term) ?? 0) / Math.max(1, tokens.length);
      if (tf === 0) continue;
      const idf = Math.log(1 + total / (1 + (df.get(term) ?? 0)));
      score += tf * idf;
    }
    return { ...chunk, score: Number(score.toFixed(4)) };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** 拼装上下文：带序号与分数，便于模型引用 `[n]`，也便于前端展示溯源。 */
export function buildContext(chunks: ScoredChunk[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map((chunk, index) => `[${index + 1}] (score=${chunk.score})\n${chunk.text}`)
    .join('\n\n');
}
