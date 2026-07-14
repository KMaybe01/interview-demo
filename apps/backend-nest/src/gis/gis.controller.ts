import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('演示')
@UseGuards(JwtAuthGuard)
@ApiSecurity('Bearer')
@Controller('api/gis')
export class GisController {
  @Get('points')
  @ApiOperation({ summary: 'GIS 地理坐标数据' })
  gisPoints(@Query('count') countStr: string) {
    let count = parseInt(countStr, 10) || 100000;
    count = Math.max(1, Math.min(count, 500000));

    const centerX = 116.397128;
    const centerY = 39.916527;
    const points = Array.from({ length: count }, (_, i) => {
      const angle = (i * 2 * Math.PI) / count;
      const radius = 0.01 + i * 0.00001;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        value: i / count,
      };
    });

    return { count: points.length, points };
  }
}
