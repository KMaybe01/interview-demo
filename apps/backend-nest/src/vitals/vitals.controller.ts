import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VitalsService } from './vitals.service';

@ApiTags('演示')
@Controller('api')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post('vitals/report')
  @ApiOperation({ summary: '上报 Web Vitals' })
  reportVitals(@Body() body: any) {
    return this.vitalsService.reportVitals(body);
  }

  @Get('vitals/summary')
  @ApiOperation({ summary: 'Web Vitals 汇总' })
  vitalsSummary() {
    return this.vitalsService.vitalsSummaryReport();
  }

  @Get('vitals/history')
  @ApiOperation({ summary: 'Web Vitals 历史' })
  vitalsHistory() {
    return this.vitalsService.vitalsHistory();
  }

  @Post('vitals/page-report')
  @ApiOperation({ summary: '上报页面渲染数据' })
  reportPage(@Body() body: any) {
    return this.vitalsService.reportPage(body);
  }

  @Get('vitals/pages')
  @ApiOperation({ summary: '页面性能汇总' })
  pageSummary() {
    return this.vitalsService.pageSummaryReport();
  }

  @Get('vitals/page-history')
  @ApiOperation({ summary: '页面性能历史' })
  pageHistory() {
    return this.vitalsService.pageHistory();
  }

  @Post('telemetry/report')
  @ApiOperation({ summary: '上报遥测数据' })
  reportTelemetry(@Body() body: any) {
    return this.vitalsService.reportTelemetry(body);
  }

  @Get('telemetry/history')
  @ApiOperation({ summary: '获取遥测历史' })
  telemetryHistory() {
    return this.vitalsService.getTelemetryHistory();
  }

  @Get('telemetry/summary')
  @ApiOperation({ summary: '获取遥测汇总' })
  telemetrySummary() {
    return this.vitalsService.getTelemetrySummary();
  }
}
