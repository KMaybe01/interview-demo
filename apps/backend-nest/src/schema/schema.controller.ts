import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { SchemaService } from './schema.service';

@ApiTags('演示')
@Controller('api/schema')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiOperation({ summary: '获取动态表单 Schema' })
  schemaConfig() {
    return this.schemaService.getSchemaConfig();
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiOperation({ summary: 'Schema 数据校验' })
  validateSchema(@Body() body: { schema: Record<string, unknown>; data: Record<string, unknown> }) {
    return this.schemaService.validateSchema(body.schema, body.data);
  }
}
