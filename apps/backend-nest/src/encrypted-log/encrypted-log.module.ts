import { Module } from '@nestjs/common';
import { EncryptedLogController } from './encrypted-log.controller';

@Module({
  controllers: [EncryptedLogController],
})
export class EncryptedLogModule {}
