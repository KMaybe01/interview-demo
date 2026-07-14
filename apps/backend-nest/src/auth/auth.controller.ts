import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthService } from './auth.service';

@ApiTags('认证')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '用户登录' })
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 Token' })
  refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @Get('check')
  @ApiOperation({ summary: '验证 Token' })
  checkToken(@Headers('authorization') auth: string) {
    return this.authService.checkToken(auth || '');
  }

  @Get('used-tokens')
  @ApiOperation({ summary: '已用 Token 计数' })
  usedTokenCount() {
    return this.authService.usedTokenCount();
  }
}
