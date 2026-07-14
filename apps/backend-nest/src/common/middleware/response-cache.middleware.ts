import * as crypto from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

interface CachedResponse {
  data: string;
  status: number;
  headers: Record<string, string>;
  expiresAt: Date;
}

@Injectable()
export class ResponseCacheMiddleware implements NestMiddleware {
  private cache = new Map<string, CachedResponse>();
  private keys: string[] = [];
  private readonly maxSize = 200;
  private readonly ttl = 30000;

  use(req: Request, res: Response, next: NextFunction) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      next();
      return;
    }

    if (req.path.startsWith('/api/chat') || req.path.startsWith('/api/agents')) {
      next();
      return;
    }

    const key = this.cacheKey(req);
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiresAt.getTime()) {
      for (const [k, v] of Object.entries(cached.headers)) {
        res.header(k, v);
      }
      res.status(cached.status).json(JSON.parse(cached.data));
      return;
    }

    const originalJson = res.json.bind(res);
    (res as any).json = (body: any) => {
      if (res.statusCode === 200) {
        this.cache.set(key, {
          data: JSON.stringify(body),
          status: res.statusCode,
          headers: {},
          expiresAt: new Date(Date.now() + this.ttl),
        });
        this.keys.push(key);
        if (this.keys.length > this.maxSize) {
          const key = this.keys.shift();
          if (key) this.cache.delete(key);
        }
      }
      return originalJson(body);
    };

    next();
  }

  private cacheKey(req: Request): string {
    const raw = `${req.method}:${req.path}:${JSON.stringify(req.body)}`;
    return crypto.createHash('md5').update(raw).digest('hex');
  }
}
