import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('监控')
@Controller()
export class HealthController {
  @Get('api/health')
  @ApiOperation({ summary: '健康检查' })
  healthCheck() {
    return {
      status: 'ok',
      message: 'AI Agent Demo API is running',
      time: new Date().toISOString(),
    };
  }

  @Get('healthz')
  @ApiOperation({ summary: 'K8s 健康检查' })
  healthz() {
    return { status: 'ok' };
  }
}
