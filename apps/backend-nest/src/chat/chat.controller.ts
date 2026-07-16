import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MemoryService } from '../memory/memory.service';
import { LlmService } from './llm.service';
import { ModelManager } from './model-manager.service';

@ApiTags('聊天')
@Controller('api/chat')
export class ChatController {
  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
    readonly _modelManager: ModelManager,
  ) {}

  @Post()
  @ApiOperation({ summary: '发送聊天消息' })
  async chat(
    @Body() body: {
      messages: { role: string; content: string }[];
      model?: string;
      conversationId?: string;
    },
  ) {
    const { content, usage } = await this.llmService.chat(
      body.messages,
      body.model || 'gpt-3.5-turbo',
    );

    if (body.conversationId) {
      for (const msg of body.messages) {
        this.memoryService.addMemory(body.conversationId, msg.role, msg.content);
      }
      this.memoryService.addMemory(body.conversationId, 'assistant', content);
    }

    return {
      message: { role: 'assistant', content },
      usage,
    };
  }

  @Post('stream')
  @ApiOperation({ summary: '流式聊天' })
  async chatStream(
    @Body() body: {
      content?: string;
      messages?: { role: string; content: string }[];
      model?: string;
      conversationId?: string;
    },
    @Res() res: Response,
  ) {
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.flushHeaders();

    const messages: { role: string; content: string }[] = body.messages || [
      { role: 'user', content: body.content || '' },
    ];
    const model = body.model || 'gpt-3.5-turbo';

    let fullContent = '';

    await this.llmService.chatStream(messages, model, (chunk: string) => {
      res.write(`data: ${chunk}\n\n`);
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.content) fullContent += parsed.content;
      } catch {}
    });

    if (body.conversationId) {
      for (const msg of messages) {
        this.memoryService.addMemory(body.conversationId, msg.role, msg.content);
      }
      this.memoryService.addMemory(body.conversationId, 'assistant', fullContent);
    }

    res.end();
  }

  @Get('history/:conversationId')
  @ApiOperation({ summary: '获取对话历史' })
  history(@Param('conversationId') conversationId: string) {
    return this.memoryService.getConversationMemories(conversationId);
  }

  @Delete('history/:conversationId')
  @ApiOperation({ summary: '清除对话历史' })
  clearHistory(@Param('conversationId') conversationId: string) {
    this.memoryService.clearConversation(conversationId);
    return { ok: true };
  }
}

@ApiTags('模型')
@Controller('api/models')
export class ModelController {
  constructor(
    private readonly modelManager: ModelManager,
    private readonly llmService: LlmService,
  ) {}

  @Get()
  @ApiOperation({ summary: '模型列表' })
  listModels() {
    const rawModels = this.modelManager.listModels();
    const models = rawModels.map((m) => ({
      id: m.id,
      model_name: m.name,
      provider: m.provider,
      context_window: m.contextWindow,
      max_tokens: m.maxTokens,
      supports_tools: m.capabilities.includes('tool_use'),
      supports_vision: m.capabilities.includes('vision'),
    }));
    return { models, count: models.length };
  }

  @Get(':id')
  @ApiOperation({ summary: '模型详情' })
  modelDetail(@Param('id') id: string) {
    const model = this.modelManager.modelDetail(id);
    if (!model) return { error: 'Model not found' };
    return model;
  }

  @Post(':id/chat')
  @ApiOperation({ summary: '使用模型聊天' })
  async chatWithModel(
    @Param('id') id: string,
    @Body() body: { messages: { role: string; content: string }[] },
  ) {
    const { content, usage } = await this.llmService.chatWithModel(id, body.messages);
    return { message: { role: 'assistant', content }, usage };
  }
}
