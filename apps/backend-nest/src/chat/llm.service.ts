import { Injectable, Logger } from '@nestjs/common';

interface Message {
  role: string;
  content: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openaiApiKey: string;
  private geminiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
  }

  private getApiConfig(model: string): { apiKey: string; baseUrl: string } | null {
    const isGemini = model.toLowerCase().includes('gemini');
    if (isGemini && this.geminiApiKey) {
      return {
        apiKey: this.geminiApiKey,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      };
    }
    if (this.openaiApiKey) {
      return {
        apiKey: this.openaiApiKey,
        baseUrl: 'https://api.openai.com/v1/chat/completions',
      };
    }
    return null;
  }

  async chat(
    messages: Message[],
    model = 'gpt-3.5-turbo',
  ): Promise<{ content: string; usage: any }> {
    const config = this.getApiConfig(model);
    if (!config) {
      return {
        content: `[模拟响应] 你发送了一条消息: "${messages[messages.length - 1]?.content?.slice(0, 50)}..." (API Key 未配置)`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    const data = (await response.json()) as any;
    if (data.error) {
      this.logger.error(`API error for model ${model}: ${JSON.stringify(data.error)}`);
      return {
        content: `[错误] API 调用失败: ${data.error?.message || '未知错误'}`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
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
    const config = this.getApiConfig(model);
    if (!config) {
      // fallback to mock stream
      const mockResponses = [
        '你好！我是 AI 助手。',
        `我已经收到你的消息: ${messages[messages.length - 1]?.content?.slice(0, 50) || ''}`,
        '\n\n这是一个模拟的流式响应。由于没有配置 API Key，系统使用本地模拟模式生成回复。',
      ];
      for (const text of mockResponses) {
        for (const char of text) {
          onChunk(JSON.stringify({ content: char, done: false }));
          await new Promise((r) => setTimeout(r, 30));
        }
      }
      onChunk(JSON.stringify({ content: '', done: true }));
      return;
    }

    this.logger.log(`chatStream: model=${model}, baseUrl=${config.baseUrl}`);

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as any;
      this.logger.error(`API error: ${response.status} ${JSON.stringify(errData)}`);
      onChunk(
        JSON.stringify({
          content: `[错误] API 返回 ${response.status}: ${errData?.error?.message || '请求失败'}`,
          done: true,
        }),
      );
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onChunk(JSON.stringify({ content: '', done: true }));
      return;
    }

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
