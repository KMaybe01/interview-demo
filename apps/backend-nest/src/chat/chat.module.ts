import { Module } from '@nestjs/common';
import { MemoryModule } from '../memory/memory.module';
import { ChatController, ModelController } from './chat.controller';
import { LlmService } from './llm.service';
import { ModelManager } from './model-manager.service';

@Module({
  imports: [MemoryModule],
  controllers: [ChatController, ModelController],
  providers: [LlmService, ModelManager],
  exports: [LlmService, ModelManager],
})
export class ChatModule {}
