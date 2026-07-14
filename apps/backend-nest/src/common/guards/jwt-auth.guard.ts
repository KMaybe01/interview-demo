import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private getSecret(): string {
    return process.env.JWT_SECRET || 'interview-demo-secret-key-2026';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || (authHeader as string).length < 7) {
      throw new UnauthorizedException('未提供 Token');
    }

    const tokenStr = (authHeader as string).slice(7);

    try {
      const decoded = jwt.verify(tokenStr, this.getSecret()) as jwt.JwtPayload;
      (request as any).user = { sub: decoded.sub, role: decoded.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }
}
