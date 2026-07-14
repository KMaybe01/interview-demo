import * as crypto from 'node:crypto';
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

@ApiTags('演示')
@Controller('api/sse')
export class EncryptedLogController {
  @Get('encrypted-logs')
  @ApiOperation({ summary: '加密日志流 (SSE)' })
  encryptedLogStream(
    @Query('clientKey') clientKeyB64: string,
    @Query('limit') limitStr: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');

    const aesKey = crypto.randomBytes(32);
    const useClientKey = !!clientKeyB64;

    if (useClientKey) {
      try {
        const clientKeyDER = Buffer.from(clientKeyB64, 'base64');
        const clientPubKey = crypto.createPublicKey({
          key: clientKeyDER,
          format: 'der',
          type: 'spki',
        });
        const encryptedAESKey = crypto.publicEncrypt(clientPubKey, aesKey);
        res.write(
          `data: ${JSON.stringify({ type: 'key-exchange', encryptedKey: encryptedAESKey.toString('base64') })}\n\n`,
        );
      } catch {
        return;
      }
    } else {
      const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pubKeyDER = publicKey.export({ type: 'spki', format: 'der' });
      res.write(
        `data: ${JSON.stringify({ type: 'rsa-public-key', key: pubKeyDER.toString('base64') })}\n\n`,
      );
      const encryptedAESKey = crypto.publicEncrypt(publicKey, aesKey);
      res.write(
        `data: ${JSON.stringify({ type: 'key-exchange', encryptedKey: encryptedAESKey.toString('base64') })}\n\n`,
      );
    }

    let totalLines = 250000;
    if (limitStr) totalLines = Math.min(parseInt(limitStr, 10) || totalLines, totalLines);

    const chunkSize = 100;
    const totalChunks = Math.ceil(totalLines / chunkSize);
    const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const actions = [
      'GET /api/users',
      'POST /api/data',
      'PUT /api/config',
      'DELETE /api/session',
      'PATCH /api/profile',
    ];

    let chunkIdx = 0;
    let firstChunkSmall = true;

    const writeNextChunk = () => {
      if (chunkIdx >= totalChunks) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
        return;
      }

      if (req.destroyed) return;

      const linesThisChunk = firstChunkSmall ? 10 : chunkSize;
      firstChunkSmall = false;

      let plaintext = '';
      for (let lineIdx = 0; lineIdx < linesThisChunk; lineIdx++) {
        const lineNum = chunkIdx * chunkSize + lineIdx + 1;
        if (lineNum > totalLines) break;
        const level = logLevels[lineNum % logLevels.length];
        const action = actions[lineNum % actions.length];
        plaintext += `[${level}] [${new Date().toISOString()}] [req-${String(lineNum).padStart(5, '0')}] ${action} - 200 ${(lineNum % 100) + 10}ms\n`;
      }

      const currentProgress = ((chunkIdx + 1) / totalChunks) * 100;

      if (plaintext) {
        const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, crypto.randomBytes(12));
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
        const nonce = cipher.getAuthTag();
        const chunkData = Buffer.concat([nonce, encrypted]);

        res.write(
          `data: ${JSON.stringify({ seq: chunkIdx, data: chunkData.toString('base64'), progress: currentProgress, total: totalChunks })}\n\n`,
        );
      }

      chunkIdx++;
      const delay = currentProgress <= 10 ? 5 : 1;
      setTimeout(writeNextChunk, delay);
    };

    writeNextChunk();

    req.on('close', () => {});
  }
}
