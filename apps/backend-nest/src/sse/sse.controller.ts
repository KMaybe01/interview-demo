import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

@ApiTags('演示')
@Controller('api/sse')
export class SseController {
  @Get('logs')
  @ApiOperation({ summary: 'SSE 日志流' })
  sseLogStream(
    @Query('level') level: string,
    @Query('interval') intervalStr: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const logLevel = level || 'all';
    const interval = parseInt(intervalStr, 10) || 200;

    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');

    const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const logMessages = [
      'Request processed successfully',
      'Database query completed',
      'Cache miss for key',
      'User authentication succeeded',
      'Rate limit approaching threshold',
      'Background job completed',
      'Memory usage at 75%',
      'Connection pool status: healthy',
      'API response time: 45ms',
      'Session expired for user',
    ];

    let id = 0;
    const timer = setInterval(() => {
      id++;
      const lvl = logLevels[Math.floor(Math.random() * logLevels.length)];
      if (logLevel !== 'all' && lvl.toLowerCase() !== logLevel.toLowerCase()) return;

      const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
      const line = `[${lvl}] [${new Date().toISOString()}] [req-${id}] ${msg}`;
      res.write(`data: ${line}\n\n`);

      if (req.destroyed) {
        clearInterval(timer);
      }
    }, interval);

    req.on('close', () => clearInterval(timer));
  }
}
