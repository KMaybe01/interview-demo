import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  docCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class KnowledgeService {
  private knowledgeBases = new Map<string, KnowledgeBase>();
  private documents = new Map<string, Document>();
  private chunks = new Map<string, DocumentChunk[]>();

  createKnowledgeBase(name: string, description: string) {
    const now = new Date().toISOString();
    const kb: KnowledgeBase = {
      id: uuidv4(),
      name,
      description: description || '',
      docCount: 0,
      chunkCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.knowledgeBases.set(kb.id, kb);
    return kb;
  }

  listKnowledgeBases() {
    return [...this.knowledgeBases.values()];
  }

  knowledgeBaseDetail(id: string) {
    return this.knowledgeBases.get(id) || null;
  }

  deleteKnowledgeBase(id: string) {
    this.documents.forEach((doc, docId) => {
      if (doc.source === id) {
        this.documents.delete(docId);
        this.chunks.delete(docId);
      }
    });
    return this.knowledgeBases.delete(id);
  }

  addDocument(
    kbId: string,
    title: string,
    content: string,
    options?: {
      source?: string;
      category?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) throw new Error('Knowledge base not found');

    const now = new Date().toISOString();
    const doc: Document = {
      id: uuidv4(),
      title,
      content,
      source: options?.source || '',
      category: options?.category || '',
      tags: options?.tags || [],
      metadata: options?.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(doc.id, doc);

    const docChunks = this.chunkDocument(doc);
    this.chunks.set(doc.id, docChunks);

    kb.docCount++;
    kb.chunkCount += docChunks.length;
    kb.updatedAt = now;

    return { document: doc, chunks: docChunks };
  }

  batchAddDocuments(
    kbId: string,
    docs: { title: string; content: string; source?: string; category?: string; tags?: string[] }[],
  ) {
    const results = docs.map((d) => this.addDocument(kbId, d.title, d.content, d));
    return {
      documents: results.map((r) => r.document),
      totalChunks: results.reduce((s, r) => s + r.chunks.length, 0),
    };
  }

  knowledgeBaseDocuments(kbId: string) {
    return [...this.documents.values()].filter((d) => d.source === kbId);
  }

  deleteDocument(kbId: string, docId: string) {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    const kb = this.knowledgeBases.get(kbId);
    if (kb) {
      const docChunks = this.chunks.get(docId);
      kb.docCount = Math.max(0, kb.docCount - 1);
      kb.chunkCount = Math.max(0, kb.chunkCount - (docChunks?.length || 0));
    }

    this.documents.delete(docId);
    this.chunks.delete(docId);
    return true;
  }

  search(kbId: string, query: string, topK = 5, minScore = 0) {
    const queryEmbedding = this.simpleEmbed(query);
    const results: { chunk: DocumentChunk; score: number; docTitle: string; docSource: string }[] =
      [];

    for (const [docId, docChunks] of this.chunks) {
      const doc = this.documents.get(docId);
      if (!doc || (kbId && doc.source !== kbId)) continue;

      for (const chunk of docChunks) {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding || []);
        if (score >= minScore) {
          results.push({ chunk, score, docTitle: doc.title, docSource: doc.source });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return { results: results.slice(0, topK) };
  }

  private chunkDocument(doc: Document, chunkSize = 500, overlap = 50): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < doc.content.length) {
      const end = Math.min(start + chunkSize, doc.content.length);
      const chunkText = doc.content.slice(start, end);

      chunks.push({
        id: uuidv4(),
        documentId: doc.id,
        content: chunkText,
        embedding: this.simpleEmbed(chunkText),
        chunkIndex: index++,
        metadata: {},
      });

      start = end - overlap;
      if (start >= doc.content.length) break;
    }

    return chunks;
  }

  private simpleEmbed(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const dims = 128;
    const embedding: number[] = [];
    for (let i = 0; i < dims; i++) {
      embedding.push((hash[i % hash.length] / 255) * 2 - 1);
    }
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  loadDocsFromDir(docsDir: string) {
    return {
      message: 'Doc loading requires filesystem access. Use POST /knowledge-base to add documents.',
      knowledgeBases: [],
      totalKBs: 0,
      totalDocs: 0,
      totalChunks: 0,
    };
  }
}
