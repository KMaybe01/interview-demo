import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AlertService } from './alert.service';

@ApiTags('演示')
@Controller()
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get('ws/alerts')
  @Get('api/alerts')
  @ApiOperation({ summary: '告警推送 (WebSocket/SSE/Polling)' })
  alertDispatcher(
    @Query('transport') transport: string,
    @Query('rate') rateStr: string,
    @Query('workers') workersStr: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const t = transport || 'ws';
    const rate = Math.min(Math.max(parseInt(rateStr, 10) || 1000, 1), 200000);

    switch (t) {
      case 'sse':
        return this.serveAlertSSE(res, req, rate);
      case 'poll':
        return this.serveAlertPoll(res, rate);
      default:
        return this.serveAlertWS(res, req, rate, parseInt(workersStr, 10) || 4);
    }
  }

  private serveAlertSSE(res: Response, req: Request, rate: number) {
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.flushHeaders();

    const interval = 100;
    const msgsPerTick = Math.max(Math.floor((rate * interval) / 1000), 1);

    const timer = setInterval(() => {
      const alerts = this.alertService.generateAlertBatch(msgsPerTick);
      for (const alert of alerts) {
        res.write(`data: ${JSON.stringify(alert)}\n\n`);
      }
    }, interval);

    req.on('close', () => clearInterval(timer));
  }

  private serveAlertPoll(res: Response, rate: number) {
    const count = Math.min(Math.max(Math.floor(rate / 10), 10), 200);
    const alerts = this.alertService.generateAlertBatch(count);
    res.json(alerts);
  }

  private serveAlertWS(res: Response, req: Request, rate: number, workers: number) {
    res
      .status(400)
      .json({ error: 'WebSocket 需要 WebSocket 升级。请使用 ws:// 连接或添加 transport=sse 参数' });
  }
}
