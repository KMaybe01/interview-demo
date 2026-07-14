import { Module } from '@nestjs/common';
import { LruCacheController } from './lru-cache.controller';

@Module({
  controllers: [LruCacheController],
})
export class LruCacheModule {}
