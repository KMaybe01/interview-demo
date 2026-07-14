import {Body, Controller, Delete, Get, Param, Post, Req, Res} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import type {Request, Response} from 'express';
import {AgentService} from './agent.service';

@ApiTags('智能体')
@Controller('api')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('agents')
  @ApiOperation({ summary: '智能体列表' })
  listAgents() {
    return this.agentService.listAgents();
  }

  @Post('agents')
  @ApiOperation({ summary: '创建智能体' })
  createAgent(@Body() body: any) {
    return this.agentService.createAgent(body);
  }

  @Post('agents/:id/execute')
  @ApiOperation({ summary: '执行智能体' })
  executeAgent(@Param('id') id: string, @Body() body: { input: string }) {
    return this.agentService.executeAgent(id, body.input);
  }

  @Post('agents/:id/stream')
  @ApiOperation({ summary: '流式执行智能体' })
  async executeAgentStream(
    @Param('id') id: string,
    @Body() body: { input: string },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.flushHeaders();

    await this.agentService.executeAgentStream(id, body.input, (chunk: string) => {
      res.write(`data: ${chunk}\n\n`);
    });

    res.end();
  }

  @Delete('agents/:id')
  @ApiOperation({ summary: '删除智能体' })
  deleteAgent(@Param('id') id: string) {
    this.agentService.deleteAgent(id);
    return { ok: true };
  }

  @Get('mcp/tools')
  @ApiOperation({ summary: 'MCP 工具列表' })
  listMCPTools() {
    return this.agentService.listMCPTools();
  }
}
