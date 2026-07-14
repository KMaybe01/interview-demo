import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('演示')
@UseGuards(JwtAuthGuard)
@ApiSecurity('Bearer')
@Controller('api/rbac')
export class RbacController {
  @Post('check')
  @ApiOperation({ summary: 'RBAC 权限检查' })
  checkPermissions(
    @Body() body: { roleCode: number; nodes: { key: string; requiredPerms: number[] }[] },
  ) {
    const results = body.nodes.map((node) => {
      const accessible = node.requiredPerms.every((p) => (body.roleCode & p) === p);
      return { key: node.key, accessible };
    });

    return { roleCode: body.roleCode, results };
  }
}
