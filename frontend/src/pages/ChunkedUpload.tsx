import {
  CheckCircleFilled,
  ClearOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  DownOutlined,
  InboxOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from "@ant-design/icons"
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
  Table,
  Tag,
  Typography,
  Upload,
} from "antd"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ChunkInfo, ChunkStatus, UploadResult } from "../stores/uploadStore.ts"
import { useUploadStore } from "../stores"

const { Text } = Typography
const { Dragger } = Upload

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${String(Math.round(bytesPerSec))} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return `${String(m)}m ${String(s)}s`
}

async function computeHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function computeFileHash(file: File, chunkSize: number): Promise<string> {
  const totalChunks = Math.ceil(file.size / chunkSize)
  let combined: Uint8Array
  {
    const chunks: Uint8Array[] = []
    let totalSize = 0
    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize
      const size = Math.min(chunkSize, file.size - offset)
      const buf = await file.slice(offset, offset + size).arrayBuffer()
      chunks.push(new Uint8Array(buf))
      totalSize += buf.byteLength
    }
    combined = new Uint8Array(totalSize)
    let pos = 0
    for (const c of chunks) {
      combined.set(c, pos)
      pos += c.byteLength
    }
  }
  const hash = await crypto.subtle.digest("SHA-256", combined.buffer as ArrayBuffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const defaultChunkSize = 5 * 1024 * 1024

export default function ChunkedUpload() {
  const {
    files,
    addFile,
    removeFile,
    updateFile,
    updateChunk,
    loadFromStorage,
    clearCompleted,
    resetAll,
  } = useUploadStore()
  const [fileObj, setFileObj] = useState<File | null>(null)
  const [chunkSize] = useState(defaultChunkSize)
  const [concurrency, setConcurrency] = useState(4)
  const [chunkOpen, setChunkOpen] = useState(true)
  const [isResume, setIsResume] = useState(false)

  const abortRef = useRef(false)
  const pausedRef = useRef(false)
  const resolvePauseRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (files.length === 0) return
    const f = files[0]
    if (f.status !== "uploading" && f.status !== "paused") return
    const serverId = f.uploadId || f.id
    if (!serverId) return
    void (async () => {
      try {
        const res = await fetch(`/api/upload/status/${serverId}`)
        if (!res.ok) {
          removeFile(f.id)
          return
        }
        const data = (await res.json()) as { received: number[] }
        const done = new Set(data.received)
        updateFile(f.id, {
          chunks: f.chunks.map((c) => ({
            ...c,
            status: done.has(c.index) ? ("done" as ChunkStatus) : ("pending" as ChunkStatus),
          })),
        })
      } catch {
        removeFile(f.id)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDrop = useCallback(
    (raw: File) => {
      const existing = files.find(
        (f) => f.filename === raw.name && f.fileSize === raw.size && f.status !== "done",
      )
      if (existing) {
        if (existing.status === "failed") {
          updateFile(existing.id, {
            status: "pending",
            chunks: existing.chunks.map((c) => ({ ...c, status: "pending" as ChunkStatus })),
          })
        }
        setFileObj(raw)
        setIsResume(true)
        return
      }

      const totalChunks = Math.ceil(raw.size / chunkSize)
      const chunks: ChunkInfo[] = []
      for (let i = 0; i < totalChunks; i++) {
        const sz = Math.min(chunkSize, raw.size - i * chunkSize)
        chunks.push({
          index: i,
          status: "pending",
          hash: "",
          size: sz,
          retries: 0,
          speed: 0,
          startTime: 0,
        })
      }
      const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      addFile({
        id,
        uploadId: "",
        filename: raw.name,
        fileSize: raw.size,
        chunkSize,
        totalChunks,
        fileHash: "",
        status: "pending",
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        elapsed: 0,
        chunks,
        result: null,
        createdAt: Date.now(),
      })
      setFileObj(raw)
      setIsResume(false)
    },
    [files, chunkSize, addFile],
  )

  const startUpload = useCallback(async () => {
    if (!fileObj || files.length === 0) return
    const item = files[0]
    if (item.status !== "pending") return

    updateFile(item.id, { status: "uploading" })
    abortRef.current = false
    pausedRef.current = false
    const startTime = performance.now()

    timerRef.current = setInterval(() => {
      const f = files[0]
      if (f) updateFile(f.id, { elapsed: performance.now() - startTime })
    }, 200)

    let completedCount = 0
    let currentInitId = item.uploadId

    try {
      let fileHash = item.fileHash
      if (!fileHash) {
        fileHash = await computeFileHash(fileObj, chunkSize)
        if (abortRef.current) return
        updateFile(item.id, { fileHash })
      }

      if (!currentInitId) {
        const initRes = await fetch("/api/upload/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.filename,
            fileSize: item.fileSize,
            chunkSize,
            totalChunks: item.totalChunks,
            fileHash,
          }),
        })
        if (!initRes.ok) {
          throw new Error(((await initRes.json()) as { error: string }).error ?? "Init failed")
        }
        const initData = (await initRes.json()) as { uploadId: string }
        currentInitId = initData.uploadId
        if (abortRef.current) return
        updateFile(item.id, { uploadId: currentInitId })
      }

      completedCount = item.chunks.filter((c) => c.status === "done").length

      const uploadOne = async (chunkIdx: number): Promise<void> => {
        if (abortRef.current || !fileObj) return
        if (item.chunks[chunkIdx]?.status === "done") return

        const offset = chunkIdx * chunkSize
        const size = Math.min(chunkSize, fileObj.size - offset)
        const blob = fileObj.slice(offset, offset + size)

        updateChunk(item.id, chunkIdx, { status: "hashing" })
        const hash = await computeHash(blob)
        if (abortRef.current) return

        for (let attempt = 0; attempt <= 3; attempt++) {
          if (abortRef.current) return
          while (pausedRef.current && !abortRef.current) {
            await new Promise<void>((r) => {
              resolvePauseRef.current = r
            })
          }
          if (abortRef.current) return

          const blob2 = fileObj.slice(offset, offset + size)
          const chunkStart = performance.now()
          updateChunk(item.id, chunkIdx, { status: "uploading", startTime: chunkStart })

          try {
            const formData = new FormData()
            formData.append("uploadId", currentInitId)
            formData.append("chunkIndex", String(chunkIdx))
            formData.append("hash", hash)
            formData.append("chunk", blob2, `chunk_${String(chunkIdx)}`)
            const res = await fetch("/api/upload/chunk", { method: "POST", body: formData })
            if (!res.ok) throw new Error(((await res.json()) as { error: string }).error)

            const chunkSpeed = size / ((performance.now() - chunkStart) / 1000)
            updateChunk(item.id, chunkIdx, {
              status: "done",
              hash,
              retries: attempt,
              speed: chunkSpeed,
            })
            completedCount++
            updateFile(item.id, {
              progress: Math.round((completedCount / item.totalChunks) * 100),
              uploadedBytes: completedCount * chunkSize,
            })
            return
          } catch {
            updateChunk(item.id, chunkIdx, { status: "failed", retries: attempt + 1 })
            if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          }
        }
      }

      const inflight = new Set<Promise<void>>()
      for (let i = 0; i < item.totalChunks; i++) {
        if (abortRef.current || abortRef.current) break
        while (inflight.size >= concurrency) await Promise.race(inflight)
        const p = uploadOne(i).finally(() => inflight.delete(p))
        inflight.add(p)
      }
      await Promise.all(inflight)
      if (abortRef.current) return

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: currentInitId }),
      })
      if (!completeRes.ok) {
        throw new Error(
          ((await completeRes.json()) as { error: string }).error ?? "Complete failed",
        )
      }
      updateFile(item.id, {
        result: (await completeRes.json()) as UploadResult,
        status: "done",
        progress: 100,
      })
    } catch {
      updateFile(item.id, { status: "failed" })
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fileObj, files, chunkSize, concurrency, updateFile, updateChunk])

  const pause = useCallback(() => {
    pausedRef.current = true
    if (files[0]) updateFile(files[0].id, { status: "paused" })
  }, [files, updateFile])

  const resume = useCallback(() => {
    pausedRef.current = false
    resolvePauseRef.current?.()
    resolvePauseRef.current = null
    if (files[0]) updateFile(files[0].id, { status: "uploading" })
  }, [files, updateFile])

  const abort = useCallback(() => {
    abortRef.current = true
    pausedRef.current = false
    resolvePauseRef.current?.()
    resolvePauseRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    if (files[0]) updateFile(files[0].id, { status: "failed" })
  }, [files, updateFile])

  const item = files[0] ?? null
  const doneChunks = item?.chunks.filter((c) => c.status === "done").length ?? 0

  return (
    <div>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Card size="small" title="选择文件">
          <Dragger
            accept="*"
            showUploadList={false}
            beforeUpload={(f) => {
              handleDrop(f as File)
              return false
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处</p>
            <p className="ant-upload-hint">
              支持断点续传 — 上传中断后刷新页面重新拖入相同文件即可续传
            </p>
          </Dragger>
          {isResume && (
            <Tag color="orange" style={{ marginTop: 8 }}>
              检测到未完成的上传，点击"续传"继续
            </Tag>
          )}
        </Card>

        {files.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={() => {
                clearCompleted()
                if (item && item.status !== "uploading" && item.status !== "paused") {
                  setFileObj(null)
                  setIsResume(false)
                }
              }}
            >
              清除已完成
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                resetAll()
                setFileObj(null)
                setIsResume(false)
              }}
            >
              重置全部
            </Button>
          </div>
        )}

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
                  onChange={(_v) => {} /* keep default */}
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
                  onChange={(v) => {
                    if (v != null) setConcurrency(v)
                  }}
                  disabled={item.status === "uploading"}
                  style={{ width: 56 }}
                />
                {item.status === "pending" && (
                  <Button
                    type="primary"
                    size="small"
                    icon={isResume ? <PlayCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => {
                      void startUpload()
                    }}
                  >
                    {isResume ? "续传" : "上传"}
                  </Button>
                )}
                {item.status === "uploading" && (
                  <Button size="small" icon={<PauseCircleOutlined />} onClick={pause}>
                    暂停
                  </Button>
                )}
                {item.status === "paused" && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={resume}
                  >
                    恢复
                  </Button>
                )}
                {(item.status === "uploading" || item.status === "paused") && (
                  <Button size="small" danger icon={<StopOutlined />} onClick={abort}>
                    停止
                  </Button>
                )}
                {item.status === "failed" && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => {
                      updateFile(item.id, {
                        status: "pending",
                        progress: 0,
                        chunks: item.chunks.map((c) => ({
                          ...c,
                          status: "pending" as ChunkStatus,
                        })),
                      })
                      setIsResume(true)
                    }}
                  >
                    重试
                  </Button>
                )}
                {item.status === "done" && (
                  <Button
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => {
                      removeFile(item.id)
                      setFileObj(null)
                      setIsResume(false)
                    }}
                  >
                    清除
                  </Button>
                )}
                {item.status === "failed" && (
                  <Button
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => {
                      removeFile(item.id)
                      setFileObj(null)
                      setIsResume(false)
                    }}
                  >
                    清除
                  </Button>
                )}
              </Space>
            }
          >
            {(item.status === "uploading" || item.status === "paused" || item.progress > 0) && (
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
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已上传"
                      value={formatBytes(item.uploadedBytes)}
                      suffix={`/ ${formatBytes(item.fileSize)}`}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已用时间"
                      value={formatDuration(item.elapsed)}
                      valueStyle={{ fontSize: 14 }}
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
                          : "-"
                      }
                      valueStyle={{ fontSize: 14 }}
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
                onClick={() => setChunkOpen((v) => !v)}
                style={{ padding: 0, marginBottom: chunkOpen ? 8 : 0 }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  分片详情 ({String(item.totalChunks)} 片，已完成 {String(doneChunks)} 片)
                </Text>
              </Button>
              {chunkOpen && (
                <Table
                  dataSource={item.chunks}
                  columns={[
                    {
                      title: "分片 #",
                      dataIndex: "index",
                      key: "index",
                      width: 80,
                      render: (v: number) => <Text code>#{String(v).padStart(3, "0")}</Text>,
                    },
                    {
                      title: "大小",
                      dataIndex: "size",
                      key: "size",
                      width: 100,
                      render: (v: number) => formatBytes(v),
                    },
                    {
                      title: "状态",
                      dataIndex: "status",
                      key: "status",
                      width: 120,
                      render: (v: ChunkStatus) => {
                        if (v === "pending") return <Tag>等待</Tag>
                        if (v === "hashing")
                          return (
                            <Tag icon={<LoadingOutlined />} color="blue">
                              哈希中
                            </Tag>
                          )
                        if (v === "uploading")
                          return (
                            <Tag icon={<LoadingOutlined />} color="processing">
                              上传中
                            </Tag>
                          )
                        if (v === "done")
                          return (
                            <Tag icon={<CheckCircleFilled />} color="success">
                              完成
                            </Tag>
                          )
                        return (
                          <Tag icon={<CloseCircleFilled />} color="error">
                            失败
                          </Tag>
                        )
                      },
                    },
                    {
                      title: "速度",
                      dataIndex: "speed",
                      key: "speed",
                      width: 100,
                      render: (v: number) => (v > 0 ? formatSpeed(v) : "-"),
                    },
                    {
                      title: "重试",
                      dataIndex: "retries",
                      key: "retries",
                      width: 60,
                      render: (v: number) => (v > 0 ? <Badge count={v} size="small" /> : "-"),
                    },
                  ]}
                  rowKey="index"
                  size="small"
                  pagination={false}
                  scroll={{ y: 200 }}
                />
              )}
            </div>

            {item.result && (
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Text>
                    SHA-256: <Text code>{item.result.fileHash.slice(0, 16)}...</Text>
                  </Text>
                  <Tag color={item.result.integrityOK ? "success" : "error"}>
                    {item.result.integrityOK ? "完整性验证通过" : "完整性验证失败"}
                  </Tag>
                </Space>
              </div>
            )}
          </Card>
        )}
      </Space>
    </div>
  )
}
