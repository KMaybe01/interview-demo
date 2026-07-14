import { Module } from '@nestjs/common';
import { RequestLoadController } from './request-load.controller';

@Module({
  controllers: [RequestLoadController],
})
export class RequestLoadModule {}
