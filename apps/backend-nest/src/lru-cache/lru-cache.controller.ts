import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('演示')
@UseGuards(JwtAuthGuard)
@ApiSecurity('Bearer')
@Controller('api')
export class LruCacheController {
  @Get('services')
  @ApiOperation({ summary: '服务列表' })
  services() {
    const serviceRegions = ['华北', '华东', '华南', '西南', '西北'];
    const serviceStatuses = ['healthy', 'warning', 'critical'];
    const services = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `service-${String(i + 1).padStart(3, '0')}`,
      status: serviceStatuses[i % 3],
      region: serviceRegions[i % 5],
      qps: Math.floor(Math.random() * 5000) + 500,
      p99: Math.floor(Math.random() * 200) + 10,
    }));
    return { services };
  }

  @Get('config')
  @ApiOperation({ summary: '集群配置' })
  config() {
    const ts = Date.now();
    return {
      config: {
        clusterName: `prod-cluster-${String(ts % 10000).padStart(4, '0')}`,
        replicas: 3 + (ts % 5),
        enableTls: ts % 2 === 0,
        logLevel: ['debug', 'info', 'warn', 'error'][ts % 4],
      },
    };
  }

  @Get('logs')
  @ApiOperation({ summary: '日志列表' })
  logs() {
    const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const logSources = ['api-gateway', 'user-svc', 'order-svc', 'payment-svc', 'cache-svc'];
    const now = new Date();
    const logs = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      level: logLevels[i % 4],
      time: new Date(now.getTime() - i * 60000).toISOString().slice(11, 19),
      source: logSources[i % 5],
      message: `[${logLevels[i % 4]}] request processed in ${Math.floor(Math.random() * 100) + 1}ms — trace-${String(i + 1).padStart(6, '0')}`,
    }));
    return { logs };
  }
}
