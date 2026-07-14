import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private readonly tokenStore = new Map<string, number>();
  private readonly sessions = new Map<string, string>();
  private readonly tokenStoreLimit = 10000;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'interview-demo-secret-key-2026';
    this.adminUsername = process.env.AUTH_USERNAME || 'admin';
    this.adminPassword = process.env.AUTH_PASSWORD || 'admin123';
    this.startTokenCleanup();
  }

  private startTokenCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.tokenStore) {
        if (now - v > 3600000) {
          this.tokenStore.delete(k);
        }
      }
    }, 1800000);
  }

  private createToken(sub: string, durationMs: number, nonce?: string): string {
    const payload: jwt.JwtPayload = {
      sub,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + durationMs) / 1000),
      role: 'admin',
    };
    if (nonce) payload.nonce = nonce;
    return jwt.sign(payload, this.jwtSecret);
  }

  private parseAndValidateToken(tokenStr: string): jwt.JwtPayload {
    try {
      return jwt.verify(tokenStr, this.jwtSecret) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }

  login(username: string, password: string) {
    if (username !== this.adminUsername || password !== this.adminPassword) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const nonce = `${Date.now()}`;
    this.sessions.set('user_001', nonce);

    const accessToken = this.createToken('user_001', 900000, nonce);
    const refreshToken = this.createToken('user_001', 3600000, nonce);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
    };
  }

  refreshToken(refreshTokenStr: string) {
    if (this.tokenStore.has(refreshTokenStr)) {
      throw new ConflictException({
        error: 'Refresh Token 已被使用（Replay Attack 检测）',
        code: 'TOKEN_REUSED',
        message: '此 Refresh Token 已被轮换过，请重新登录',
      });
    }

    const claims = this.parseAndValidateToken(refreshTokenStr);
    const sub = claims.sub as string;
    const nonceFromToken = claims.nonce as string;

    const storedNonce = this.sessions.get(sub);
    if (storedNonce && nonceFromToken !== storedNonce) {
      throw new UnauthorizedException({
        error: '此账号已在其他设备登录',
        code: 'SESSION_REPLACED',
        message: '您的账号已在其他设备登录，请重新登录',
      });
    }

    const newAccessToken = this.createToken(sub, 900000, nonceFromToken);
    const newRefreshToken = this.createToken(sub, 3600000, nonceFromToken);

    this.tokenStore.set(refreshTokenStr, Date.now());
    if (this.tokenStore.size > this.tokenStoreLimit) {
      const keys = [...this.tokenStore.keys()];
      for (let i = 0; i < keys.length && this.tokenStore.size > this.tokenStoreLimit / 2; i++) {
        const k = keys[i];
        if (k && Date.now() - (this.tokenStore.get(k) || 0) > 600000) {
          this.tokenStore.delete(k);
        }
      }
    }

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 900,
      rotation: true,
    };
  }

  checkToken(authHeader: string) {
    if (!authHeader || authHeader.length < 7) {
      return { valid: false, error: '未提供 Token' };
    }

    const tokenStr = authHeader.slice(7);
    try {
      const claims = this.parseAndValidateToken(tokenStr);
      const exp = claims.exp as number;
      const remaining = Math.max(0, exp - Math.floor(Date.now() / 1000));
      return {
        valid: true,
        sub: claims.sub,
        remaining,
      };
    } catch {
      return { valid: false, error: 'Token 无效或已过期' };
    }
  }

  usedTokenCount() {
    return { count: this.tokenStore.size };
  }

  validateAuth(authHeader: string): string {
    if (!authHeader || authHeader.length < 7) {
      throw new UnauthorizedException('未提供 Token');
    }

    const tokenStr = authHeader.slice(7);
    const claims = this.parseAndValidateToken(tokenStr);
    const sub = claims.sub as string;
    return sub;
  }
}
