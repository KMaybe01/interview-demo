import {
  CheckCircleFilled,
  ClearOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  InboxOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  InputNumber,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { List } from 'react-window';
import { useUploadStore } from '../stores';
import type { ChunkInfo, UploadFileItem, UploadResult } from '../stores/uploadStore';
import { http } from '../utils/fetchClient.ts';

const { Text } = Typography;
const { Dragger } = Upload;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${String(Math.round(bytesPerSec))} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${String(m)}m ${String(s)}s`;
}

const ChunkRow = ({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: ChunkInfo[];
}) => {
  const c = data[index];
  const statusTag = (() => {
    if (c.status === 'pending') return <Tag style={{ margin: 0, fontSize: 11 }}>等待</Tag>;
    if (c.status === 'hashing')
      return (
        <Tag style={{ margin: 0, fontSize: 11 }} icon={<LoadingOutlined />} color="blue">
          哈希中
        </Tag>
      );
    if (c.status === 'uploading')
      return (
        <Tag style={{ margin: 0, fontSize: 11 }} icon={<LoadingOutlined />} color="processing">
          上传中
        </Tag>
      );
    if (c.status === 'done')
      return (
        <Tag style={{ margin: 0, fontSize: 11 }} icon={<CheckCircleFilled />} color="success">
          完成
        </Tag>
      );
    return (
      <Tag style={{ margin: 0, fontSize: 11 }} icon={<CloseCircleFilled />} color="error">
        失败
      </Tag>
    );
  })();
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        borderBottom: '1px solid #fafafa',
      }}
    >
      <span style={{ width: 80, flexShrink: 0, fontFamily: "'Courier New', monospace" }}>
        #{String(c.index).padStart(3, '0')}
      </span>
      <span style={{ width: 90, flexShrink: 0 }}>{formatBytes(c.size)}</span>
      <span style={{ width: 120, flexShrink: 0 }}>{statusTag}</span>
      <span style={{ width: 100, flexShrink: 0 }}>{c.speed > 0 ? formatSpeed(c.speed) : '-'}</span>
      <span style={{ width: 60, flexShrink: 0 }}>
        {c.retries > 0 ? <Badge count={c.retries} size="small" /> : '-'}
      </span>
    </div>
  );
};

async function computeHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function computeFileHash(file: File, chunkSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../utils/hash.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<{ type: string; hash?: string; error?: string }>) => {
      if (e.data.type === 'result' && e.data.hash) {
        worker.terminate();
        resolve(e.data.hash);
      } else if (e.data.type === 'error') {
        worker.terminate();
        reject(new Error(e.data.error ?? 'Unknown worker error'));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Worker error'));
    };
    void (async () => {
      try {
        const totalChunks = Math.ceil(file.size / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
          const offset = i * chunkSize;
          const size = Math.min(chunkSize, file.size - offset);
          const buffer = await file.slice(offset, offset + size).arrayBuffer();
          worker.postMessage({ type: 'file', buffer }, [buffer]);
        }
        worker.postMessage({ type: 'finalize' });
      } catch (err) {
        worker.terminate();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });
}

const defaultChunkSize = 5 * 1024 * 1024;

const DraggerCard = React.memo(function DraggerCard({
  isResume,
  onDrop,
}: {
  isResume: boolean;
  onDrop: (f: File) => void;
}) {
  const beforeUpload = useCallback(
    (f: File | (Blob & { uid: string })) => {
      onDrop(f as File);
      return false;
    },
    [onDrop],
  );
  return (
    <Card size="small" title="选择文件">
      <Dragger accept="*" showUploadList={false} beforeUpload={beforeUpload}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此处</p>
        <p className="ant-upload-hint">支持断点续传 — 上传中断后刷新页面重新拖入相同文件即可续传</p>
      </Dragger>
      {isResume && (
        <Tag color="orange" style={{ marginTop: 8 }}>
          检测到未完成的上传，点击&quot;续传&quot;继续
        </Tag>
      )}
    </Card>
  );
});

const ToolbarActions = React.memo(function ToolbarActions({
  hasFiles,
  onClearToolbar,
  onResetAll,
}: {
  hasFiles: boolean;
  onClearToolbar: () => void;
  onResetAll: () => void;
}) {
  if (!hasFiles) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <Button size="small" icon={<ClearOutlined />} onClick={onClearToolbar}>
        清除已完成
      </Button>
      <Button size="small" danger icon={<DeleteOutlined />} onClick={onResetAll}>
        重置全部
      </Button>
    </div>
  );
});

export default function ChunkedUpload() {
  const { files, removeFile, updateFile, updateChunk, resetAll } = useUploadStore();
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [chunkSize] = useState(defaultChunkSize);
  const [concurrency, setConcurrency] = useState(4);
  const [chunkOpen, setChunkOpen] = useState(false);
  const [isResume, setIsResume] = useState(false);

  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const resolvePauseRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const uploadingRef = useRef(false);
  const uploadGenRef = useRef(0);
  const checkAbort = (): boolean => abortRef.current;

  useEffect(() => {
    return () => {
      abortRef.current = true;
      pausedRef.current = false;
      resolvePauseRef.current?.();
      resolvePauseRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const { files: currentFiles, updateFile: upd, removeFile: rem } = useUploadStore.getState();
    if (currentFiles.length === 0) return;
    const f = currentFiles[0];
    if (f.status !== 'uploading' && f.status !== 'paused') return;
    const serverId = f.uploadId || f.id;
    if (!serverId) return;
    http
      .get(`/api/upload/status/${serverId}`, { signal: ac.signal })
      .then((res) => {
        const data = res.data as { received: number[] };
        const done = new Set(data.received);
        upd(f.id, {
          chunks: f.chunks.map((c) => ({
            ...c,
            status: done.has(c.index) ? 'done' : 'pending',
          })),
        });
      })
      .catch(() => {
        rem(f.id);
      });
    return () => {
      ac.abort();
    };
  }, []);

  const handleDrop = useCallback(
    (raw: File) => {
      const { files: currentFiles, addFile: storeAddFile } = useUploadStore.getState();

      const existing = currentFiles.find((f) => f.filename === raw.name && f.fileSize === raw.size);
      if (existing) {
        updateFile(existing.id, {
          status: 'pending',
          progress: 0,
          uploadedBytes: 0,
          speed: 0,
          elapsed: 0,
          result: null,
          chunks: existing.chunks.map((c) => ({ ...c, status: 'pending' })),
        });
        setFileObj(raw);
        setIsResume(existing.status !== 'done');
        return;
      }

      const totalChunks = Math.ceil(raw.size / chunkSize);
      const chunks: ChunkInfo[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const sz = Math.min(chunkSize, raw.size - i * chunkSize);
        chunks.push({
          index: i,
          status: 'pending',
          hash: '',
          size: sz,
          retries: 0,
          speed: 0,
          startTime: 0,
        });
      }
      const id = `local_${String(Date.now())}_${Math.random().toString(36).slice(2, 8)}`;
      storeAddFile({
        id,
        uploadId: '',
        filename: raw.name,
        fileSize: raw.size,
        chunkSize,
        totalChunks,
        fileHash: '',
        status: 'pending',
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        elapsed: 0,
        chunks,
        result: null,
        createdAt: Date.now(),
      });
      setFileObj(raw);
      setIsResume(false);
    },
    [chunkSize, updateFile],
  );

  const startUpload = useCallback(async () => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    const gen = ++uploadGenRef.current;
    const { files: currentFiles } = useUploadStore.getState();
    if (!fileObj || currentFiles.length === 0) {
      uploadingRef.current = false;
      return;
    }
    const item = currentFiles[0];
    if (item.status !== 'pending') {
      uploadingRef.current = false;
      return;
    }
    try {
      updateFile(item.id, { status: 'uploading' });
      abortRef.current = false;
      pausedRef.current = false;
      const startTime = performance.now();

      timerRef.current = setInterval(() => {
        const { files: f } = useUploadStore.getState();
        if (f[0]) updateFile(f[0].id, { elapsed: performance.now() - startTime });
      }, 200);

      let completedCount = 0;
      let currentInitId = item.uploadId;

      let fileHash = item.fileHash;
      if (!fileHash) {
        fileHash = await computeFileHash(fileObj, chunkSize);
        if (checkAbort()) return;
        updateFile(item.id, { fileHash });
      }

      if (!currentInitId) {
        const initRes = await http.post('/api/upload/init', {
          filename: item.filename,
          fileSize: item.fileSize,
          chunkSize,
          totalChunks: item.totalChunks,
          fileHash,
        });
        const initData = initRes.data as { uploadId: string };
        currentInitId = initData.uploadId;
        if (checkAbort()) return;
        updateFile(item.id, { uploadId: currentInitId });
      }

      completedCount = item.chunks.filter((c) => c.status === 'done').length;

      const uploadOne = async (chunkIdx: number): Promise<void> => {
        if (checkAbort()) return;
        if (item.chunks[chunkIdx]?.status === 'done') return;

        const offset = chunkIdx * chunkSize;
        const size = Math.min(chunkSize, fileObj.size - offset);
        const blob = fileObj.slice(offset, offset + size);

        updateChunk(item.id, chunkIdx, { status: 'hashing' });
        const hash = await computeHash(blob);
        if (checkAbort()) return;

        for (let attempt = 0; attempt <= 3; attempt++) {
          if (checkAbort()) return;
          while (pausedRef.current && !checkAbort()) {
            await new Promise<void>((r) => {
              resolvePauseRef.current = r;
            });
          }
          if (checkAbort()) return;

          const blob2 = fileObj.slice(offset, offset + size);
          const chunkStart = performance.now();
          updateChunk(item.id, chunkIdx, { status: 'uploading', startTime: chunkStart });

          try {
            const formData = new FormData();
            formData.append('uploadId', currentInitId);
            formData.append('chunkIndex', String(chunkIdx));
            formData.append('hash', hash);
            formData.append('chunk', blob2, `chunk_${String(chunkIdx)}`);
            await http.post('/api/upload/chunk', formData);

            const chunkSpeed = size / ((performance.now() - chunkStart) / 1000);
            updateChunk(item.id, chunkIdx, {
              status: 'done',
              hash,
              retries: attempt,
              speed: chunkSpeed,
            });
            completedCount++;
            updateFile(item.id, {
              progress: Math.round((completedCount / item.totalChunks) * 100),
              uploadedBytes: completedCount * chunkSize,
            });
            return;
          } catch {
            if (checkAbort()) return;
            updateChunk(item.id, chunkIdx, { status: 'failed', retries: attempt + 1 });
            if (attempt < 3)
              await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 30000)));
          }
        }
      };

      const inflight = new Set<Promise<void>>();
      for (let i = 0; i < item.totalChunks; i++) {
        if (checkAbort()) break;
        while (inflight.size >= concurrency) await Promise.race(inflight);
        const p = uploadOne(i).finally(() => inflight.delete(p));
        inflight.add(p);
      }
      await Promise.all(inflight);
      if (checkAbort()) return;

      const completeRes = await http.post('/api/upload/complete', { uploadId: currentInitId });
      updateFile(item.id, {
        result: completeRes.data as UploadResult,
        status: 'done',
        progress: 100,
      });
    } catch {
      updateFile(item.id, { status: 'failed' });
    } finally {
      if (gen === uploadGenRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        uploadingRef.current = false;
      }
    }
  }, [fileObj, chunkSize, concurrency, updateFile, updateChunk, checkAbort]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    const { files: f } = useUploadStore.getState();
    if (f[0]) updateFile(f[0].id, { status: 'paused' });
  }, [updateFile]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    resolvePauseRef.current?.();
    resolvePauseRef.current = null;
    const { files: f } = useUploadStore.getState();
    if (f[0]) updateFile(f[0].id, { status: 'uploading' });
  }, [updateFile]);

  const abort = useCallback(() => {
    abortRef.current = true;
    uploadingRef.current = false;
    uploadGenRef.current++;
    pausedRef.current = false;
    resolvePauseRef.current?.();
    resolvePauseRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    const { files: f } = useUploadStore.getState();
    if (f[0]) updateFile(f[0].id, { status: 'failed' });
  }, [updateFile]);

  const handleConcurrencyChange = useCallback((v: number | null) => {
    if (v != null) setConcurrency(v);
  }, []);

  const handleStartClick = useCallback(() => {
    void startUpload();
  }, [startUpload]);

  const item = files[0] as UploadFileItem | undefined;
  const doneChunks = item?.chunks.filter((c) => c.status === 'done').length ?? 0;

  const handleRetryClick = useCallback(() => {
    if (!item) return;
    updateFile(item.id, {
      status: 'pending',
      progress: 0,
      chunks: item.chunks.map((c) => ({
        ...c,
        status: 'pending',
      })),
    });
    setIsResume(true);
  }, [item, updateFile]);

  const handleRemoveClick = useCallback(() => {
    if (!item) return;
    removeFile(item.id);
    setFileObj(null);
    setIsResume(false);
  }, [item, removeFile]);

  const handleClearToolbar = useCallback(() => {
    const { clearCompleted: storeClear } = useUploadStore.getState();
    storeClear();
    if (item != null && item.status !== 'uploading' && item.status !== 'paused') {
      setFileObj(null);
      setIsResume(false);
    }
  }, [item]);

  const handleResetToolbar = useCallback(() => {
    resetAll();
    setFileObj(null);
    setIsResume(false);
  }, [resetAll]);

  return (
    <div>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <DraggerCard isResume={isResume} onDrop={handleDrop} />

        <ToolbarActions
          hasFiles={files.length > 0}
          onClearToolbar={handleClearToolbar}
          onResetAll={handleResetToolbar}
        />

        {item && (
          <Card
            size="small"
            title={
              <Space>
                <Text strong>{item.filename}</Text>
                <Tag>{formatBytes(item.fileSize)}</Tag>
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  分片:
                </Text>
                <InputNumber
                  size="small"
                  min={1}
                  max={50}
                  value={chunkSize / 1024 / 1024}
                  onChange={(_v) => undefined}
                  disabled
                  style={{ width: 56 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  MB 并发:
                </Text>
                <InputNumber
                  size="small"
                  min={1}
                  max={10}
                  value={concurrency}
                  onChange={handleConcurrencyChange}
                  disabled={item.status === 'uploading'}
                  style={{ width: 56 }}
                />
                {item.status === 'pending' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartClick}
                  >
                    {isResume ? '续传' : '上传'}
                  </Button>
                )}
                {item.status === 'uploading' && (
                  <Button size="small" icon={<PauseCircleOutlined />} onClick={pause}>
                    暂停
                  </Button>
                )}
                {item.status === 'paused' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={resume}
                  >
                    恢复
                  </Button>
                )}
                {(item.status === 'uploading' || item.status === 'paused') && (
                  <Button size="small" danger icon={<StopOutlined />} onClick={abort}>
                    停止
                  </Button>
                )}
                {item.status === 'failed' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={handleRetryClick}
                  >
                    重试
                  </Button>
                )}
                {item.status === 'done' && (
                  <Button size="small" icon={<StopOutlined />} onClick={handleRemoveClick}>
                    清除
                  </Button>
                )}
                {item.status === 'failed' && (
                  <Button size="small" icon={<StopOutlined />} onClick={handleRemoveClick}>
                    清除
                  </Button>
                )}
              </Space>
            }
          >
            {(item.status === 'uploading' || item.status === 'paused' || item.progress > 0) && (
              <div style={{ marginBottom: 12 }}>
                <Progress
                  percent={item.progress}
                  size="small"
                  format={() =>
                    `${String(item.progress)}% (${String(doneChunks)}/${String(item.totalChunks)} 分片)`
                  }
                />
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={6}>
                    <Statistic
                      title="速度"
                      value={formatSpeed(item.speed)}
                      styles={{ content: { fontSize: 14 } }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已上传"
                      value={formatBytes(item.uploadedBytes)}
                      suffix={`/ ${formatBytes(item.fileSize)}`}
                      styles={{ content: { fontSize: 14 } }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已用时间"
                      value={formatDuration(item.elapsed)}
                      styles={{ content: { fontSize: 14 } }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="预估剩余"
                      value={
                        item.speed > 0
                          ? formatDuration(
                              (((item.totalChunks - doneChunks) * item.chunkSize) / item.speed) *
                                1000,
                            )
                          : '-'
                      }
                      styles={{ content: { fontSize: 14 } }}
                    />
                  </Col>
                </Row>
              </div>
            )}

            <div>
              <Button
                type="link"
                size="small"
                icon={<DownOutlined />}
                onClick={() => {
                  setChunkOpen((v) => !v);
                }}
                style={{ padding: 0, marginBottom: chunkOpen ? 8 : 0 }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  分片详情 ({String(item.totalChunks)} 片，已完成 {String(doneChunks)} 片)
                </Text>
              </Button>
              {chunkOpen && item.chunks.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '4px 0',
                      fontWeight: 600,
                      fontSize: 12,
                      color: '#888',
                      borderBottom: '1px solid #f0f0f0',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ width: 80, flexShrink: 0 }}>分片 #</span>
                    <span style={{ width: 90, flexShrink: 0 }}>大小</span>
                    <span style={{ width: 120, flexShrink: 0 }}>状态</span>
                    <span style={{ width: 100, flexShrink: 0 }}>速度</span>
                    <span style={{ width: 60, flexShrink: 0 }}>重试</span>
                  </div>
                  <List<{ data: ChunkInfo[] }>
                    rowCount={item.chunks.length}
                    rowHeight={32}
                    rowComponent={ChunkRow}
                    rowProps={{ data: item.chunks }}
                    style={{ height: Math.min(240, item.chunks.length * 32) }}
                  />
                </div>
              )}
            </div>

            {item.result && (
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Text>
                    SHA-256: <Text code>{item.result.fileHash.slice(0, 16)}...</Text>
                  </Text>
                  <Tag color={item.result.integrityOK ? 'success' : 'error'}>
                    {item.result.integrityOK ? '完整性验证通过' : '完整性验证失败'}
                  </Tag>
                  <Button
                    size="small"
                    type="primary"
                    icon={<DownloadOutlined />}
                    href={`/api/upload/download/${item.uploadId}`}
                    target="_blank"
                  >
                    下载文件
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        )}
      </Space>
    </div>
  );
}
