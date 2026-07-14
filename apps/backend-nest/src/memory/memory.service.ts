import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface Memory {
  id: string;
  conversationId: string;
  content: string;
  role: string;
  summary?: string;
  importance: number;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

@Injectable()
export class MemoryService {
  private memories = new Map<string, Memory[]>();

  addMemory(conversationId: string, role: string, content: string, importance = 0.5) {
    const now = new Date();
    const memory: Memory = {
      id: uuidv4(),
      conversationId,
      content,
      role,
      importance,
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
    };

    if (!this.memories.has(conversationId)) {
      this.memories.set(conversationId, []);
    }
    this.memories.get(conversationId)?.push(memory);

    return memory;
  }

  getConversationMemories(conversationId: string) {
    return this.memories.get(conversationId) || [];
  }

  searchMemories(query: string, conversationId?: string, topK = 5, minImportance = 0) {
    let allMemories: Memory[] = [];

    if (conversationId) {
      allMemories = this.memories.get(conversationId) || [];
    } else {
      for (const mems of this.memories.values()) {
        allMemories = allMemories.concat(mems);
      }
    }

    const q = query.toLowerCase();
    const scored = allMemories
      .filter((m) => m.importance >= minImportance)
      .map((m) => {
        let score = m.importance * 0.5;
        if (m.content.toLowerCase().includes(q)) score += 0.3;
        if (m.summary?.toLowerCase().includes(q)) score += 0.2;
        return { memory: m, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((s) => {
      s.memory.accessCount++;
      s.memory.accessedAt = new Date();
      return s.memory;
    });
  }

  clearConversation(conversationId: string) {
    this.memories.delete(conversationId);
  }
}
