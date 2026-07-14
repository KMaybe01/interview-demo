import { Injectable } from '@nestjs/common';

interface Message {
  role: string;
  content: string;
}

@Injectable()
export class LlmService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  async chat(
    messages: Message[],
    model = 'gpt-3.5-turbo',
  ): Promise<{ content: string; usage: any }> {
    if (!this.apiKey) {
      return {
        content: `[模拟响应] 你发送了一条消息: "${messages[messages.length - 1]?.content?.slice(0, 50)}..." (API Key 未配置)`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    const data = (await response.json()) as any;
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  async chatStream(
    messages: Message[],
    model = 'gpt-3.5-turbo',
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    if (!this.apiKey) {
      onChunk(JSON.stringify({ content: `[模拟响应] API Key 未配置`, done: true }));
      return;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onChunk(JSON.stringify({ content: '', done: true }));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            onChunk(JSON.stringify({ content, done: false }));
          }
        } catch {}
      }
    }

    onChunk(JSON.stringify({ content: '', done: true }));
  }

  async chatWithModel(modelId: string, messages: Message[]) {
    return this.chat(messages, modelId);
  }
}
