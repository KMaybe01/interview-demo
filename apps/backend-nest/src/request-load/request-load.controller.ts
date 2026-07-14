import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('演示')
@UseGuards(JwtAuthGuard)
@ApiSecurity('Bearer')
@Controller('api/request-loading')
export class RequestLoadController {
  @Get('demo')
  @ApiOperation({ summary: '请求加载状态演示' })
  async demoRequest(
    @Query('delay') delayStr: string,
    @Query('fail') failStr: string,
    @Query('type') requestType: string,
  ) {
    const delay = Math.min(Math.max(parseInt(delayStr, 10) || 1000, 0), 10000);
    const failRate = Math.min(Math.max(parseFloat(failStr) || 0, 0), 1);
    const type = requestType || 'default';

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (Math.random() < failRate) {
      throw new Error('simulated server error');
    }

    let data: any;
    switch (type) {
      case 'users':
        data = {
          type: 'users',
          count: 5,
          items: [
            { id: 1, name: 'Alice', role: 'admin' },
            { id: 2, name: 'Bob', role: 'editor' },
            { id: 3, name: 'Charlie', role: 'viewer' },
            { id: 4, name: 'Diana', role: 'editor' },
            { id: 5, name: 'Eve', role: 'viewer' },
          ],
        };
        break;
      case 'reports':
        data = {
          type: 'reports',
          summary: 'Q4 performance report',
          metrics: { qps: 12500, p99: 45, error: 0.02 },
        };
        break;
      case 'export':
        data = {
          type: 'export',
          status: 'complete',
          fileUrl: '/downloads/report-q4.csv',
          rows: 150000,
        };
        break;
      default:
        data = { type: 'demo', message: 'OK', timestamp: Date.now() };
    }

    return { success: true, data, delay };
  }
}
