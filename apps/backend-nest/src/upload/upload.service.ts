import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

interface UploadSession {
  id: string;
  filename: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  received: Set<number>;
  fileHash: string;
  createdAt: string;
}

@Injectable()
export class UploadService {
  private uploadSessions = new Map<string, UploadSession>();
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly sessionsFile = path.join(process.cwd(), 'uploads', 'sessions.json');

  constructor() {
    this.ensureUploadInit();
  }

  private ensureUploadInit() {
    fs.mkdirSync(this.uploadDir, { recursive: true });
    this.loadSessions();
  }

  private sanitizeFilename(name: string): string {
    const cleaned = path.basename(name);
    return cleaned === '.' || cleaned === '/' ? 'unnamed_file' : cleaned;
  }

  private loadSessions() {
    try {
      const raw = fs.readFileSync(this.sessionsFile, 'utf-8');
      const data = JSON.parse(raw);
      for (const [k, v] of Object.entries(data)) {
        const s = v as any;
        this.uploadSessions.set(k, {
          ...s,
          received: new Set(s.received || []),
        });
      }
    } catch {}
  }

  private saveSessions() {
    try {
      const data: Record<string, any> = {};
      for (const [k, v] of this.uploadSessions) {
        data[k] = { ...v, received: [...v.received] };
      }
      fs.writeFileSync(this.sessionsFile, JSON.stringify(data), 'utf-8');
    } catch {}
  }

  initUpload(req: {
    filename: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number;
    fileHash?: string;
  }) {
    const id = `upload_${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const session: UploadSession = {
      id,
      filename: req.filename,
      fileSize: req.fileSize,
      chunkSize: req.chunkSize,
      totalChunks: req.totalChunks,
      received: new Set(),
      fileHash: req.fileHash || '',
      createdAt: new Date().toISOString(),
    };

    const chunkDir = path.join(this.uploadDir, id);
    fs.mkdirSync(chunkDir, { recursive: true });

    this.uploadSessions.set(id, session);
    this.saveSessions();

    return { uploadId: id };
  }

  uploadStatus(uploadId: string) {
    const session = this.uploadSessions.get(uploadId);
    if (!session) throw new NotFoundException('upload session not found');

    const received = [...session.received].sort((a, b) => a - b);
    return {
      uploadId: session.id,
      filename: session.filename,
      fileSize: session.fileSize,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      received,
      receivedCount: received.length,
      fileHash: session.fileHash,
      createdAt: session.createdAt,
    };
  }

  downloadUpload(uploadId: string) {
    const session = this.uploadSessions.get(uploadId);
    if (!session) throw new NotFoundException('upload session not found');

    const safeName = this.sanitizeFilename(session.filename);
    const filePath = path.join(this.uploadDir, `${uploadId}_${safeName}`);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('file not found');
    }

    return { filePath, filename: safeName };
  }

  listUploadSessions() {
    return [...this.uploadSessions.values()].map((s) => ({
      uploadId: s.id,
      filename: s.filename,
      fileSize: s.fileSize,
      totalChunks: s.totalChunks,
      receivedCount: s.received.size,
      createdAt: s.createdAt,
    }));
  }

  uploadChunk(uploadId: string, chunkIndex: number, hash: string, file: Express.Multer.File) {
    const session = this.uploadSessions.get(uploadId);
    if (!session) throw new NotFoundException('upload session not found');

    if (!hash) {
      throw new BadRequestException('missing hash');
    }

    const chunkData = file.buffer;
    const serverHash = crypto.createHash('sha256').update(chunkData).digest('hex');

    if (serverHash !== hash) {
      throw new BadRequestException({
        error: 'hash mismatch',
        expected: hash,
        computed: serverHash,
        chunkIndex,
      });
    }

    const chunkPath = path.join(this.uploadDir, uploadId, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, chunkData);

    session.received.add(chunkIndex);
    this.saveSessions();

    return {
      success: true,
      chunkIndex,
      received: session.received.size,
      total: session.totalChunks,
    };
  }

  completeUpload(req: { uploadId: string }) {
    const session = this.uploadSessions.get(req.uploadId);
    if (!session) throw new NotFoundException('upload session not found');

    const receivedCount = session.received.size;
    if (receivedCount !== session.totalChunks) {
      const missing: number[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.received.has(i)) missing.push(i);
      }
      throw new BadRequestException({ error: 'not all chunks received', missing });
    }

    const chunkDir = path.join(this.uploadDir, req.uploadId);
    const outputName = `${req.uploadId}_${session.filename}`;
    const outputPath = path.join(this.uploadDir, outputName);

    const hasher = crypto.createHash('sha256');
    const outStream = fs.createWriteStream(outputPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      const chunkData = fs.readFileSync(chunkPath);
      outStream.write(chunkData);
      hasher.update(chunkData);
    }

    outStream.end();
    fs.rmSync(chunkDir, { recursive: true, force: true });
    this.saveSessions();

    const fileHash = hasher.digest('hex');
    const integrityOK = !session.fileHash || session.fileHash === fileHash;

    return {
      success: true,
      fileHash,
      expected: session.fileHash,
      integrityOK,
      fileSize: session.fileSize,
      filename: session.filename,
    };
  }
}
