import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { AlertModule } from './alert/alert.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { ResponseCacheMiddleware } from './common/middleware/response-cache.middleware';
import { EncryptedLogModule } from './encrypted-log/encrypted-log.module';
import { GisModule } from './gis/gis.module';
import { HealthModule } from './health/health.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { LruCacheModule } from './lru-cache/lru-cache.module';
import { PaymentModule } from './payment/payment.module';
import { RbacModule } from './rbac/rbac.module';
import { RequestLoadModule } from './request-load/request-load.module';
import { SchemaModule } from './schema/schema.module';
import { SseModule } from './sse/sse.module';
import { UploadModule } from './upload/upload.module';
import { VitalsModule } from './vitals/vitals.module';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    VitalsModule,
    PaymentModule,
    UploadModule,
    SseModule,
    EncryptedLogModule,
    AlertModule,
    GisModule,
    RbacModule,
    RequestLoadModule,
    LruCacheModule,
    SchemaModule,
    ChatModule,
    AgentModule,
    KnowledgeModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddleware)
      .forRoutes('*')
      .apply(ResponseCacheMiddleware)
      .forRoutes('api/health', 'api/vitals', 'api/models', 'api/telemetry');
  }
}
