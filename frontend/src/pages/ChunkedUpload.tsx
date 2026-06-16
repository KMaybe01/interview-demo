import {
  CheckCircleFilled,
  CloseCircleFilled,
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
import { useCallback, useRef, useState } from "react"

const { Text } = Typography
const { Dragger } = Upload

type ChunkStatus = "pending" | "hashing" | "uploading" | "done" | "failed"

interface ChunkInfo {
  index: number
  status: ChunkStatus
  hash: string
  size: number
  retries: number
  speed: number
  startTime: number
}

interface UploadResult {
  success: boolean
  fileHash: string
  expected: string
  integrityOK: boolean
  fileSize: number
}

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
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return hex
}

export default function ChunkedUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [chunkSize, setChunkSize] = useState(5 * 1024 * 1024)
  const [concurrency, setConcurrency] = useState(4)
  const [uploading, setUploading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [chunks, setChunks] = useState<ChunkInfo[]>([])
  const [result, setResult] = useState<UploadResult | null>(null)
  const [speed, setSpeed] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [uploadedBytes, setUploadedBytes] = useState(0)

  const abortRef = useRef(0)
  const pausedRef = useRef(0)
  const resolvePauseRef = useRef<(() => void) | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const totalChunks = file ? Math.ceil(file.size / chunkSize) : 0

  const updateStats = useCallback(() => {
    if (startTimeRef.current === 0) return
    const e = performance.now() - startTimeRef.current
    setElapsed(e)
    const s = uploadedBytes > 0 && e > 0 ? uploadedBytes / (e / 1000) : 0
    setSpeed(s)
  }, [uploadedBytes])

  const startUpload = useCallback(async () => {
    if (!file) return

    abortRef.current = 0
    pausedRef.current = 0
    setUploading(true)
    setPaused(false)
    setResult(null)
    setProgress(0)
    setUploadedBytes(0)
    setElapsed(0)
    setSpeed(0)

    const chunkList: ChunkInfo[] = []
    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize
      const size = Math.min(chunkSize, file.size - offset)
      chunkList.push({
        index: i,
        status: "pending",
        hash: "",
        size,
        retries: 0,
        speed: 0,
        startTime: 0,
      })
    }
    setChunks(chunkList)
    startTimeRef.current = performance.now()

    timerRef.current = setInterval(updateStats, 200)

    try {
      // 1. Compute full file hash (for integrity verification)
      const allBuffers: ArrayBuffer[] = []
      for (let i = 0; i < totalChunks; i++) {
        const offset = i * chunkSize
        const size = Math.min(chunkSize, file.size - offset)
        allBuffers.push(await file.slice(offset, offset + size).arrayBuffer())
      }
      const combinedSize = allBuffers.reduce((acc, b) => acc + b.byteLength, 0)
      const combined = new Uint8Array(combinedSize)
      let pos = 0
      for (const buf of allBuffers) {
        combined.set(new Uint8Array(buf), pos)
        pos += buf.byteLength
      }
      const fileHashResult = await crypto.subtle.digest("SHA-256", combined)
      const fileHash = Array.from(new Uint8Array(fileHashResult))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      allBuffers.length = 0

      // 2. Init upload session
      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          chunkSize,
          totalChunks,
          fileHash,
        }),
      })
      const initData = (await initRes.json()) as { uploadId: string }
      const uploadId = initData.uploadId

      // 3. Upload chunks with concurrency control
      const chunkHashes: string[] = new Array<string>(totalChunks)
      let completedCount = 0

      const uploadOne = async (chunkIdx: number): Promise<void> => {
        if (abortRef.current) return

        const offset = chunkIdx * chunkSize
        const size = Math.min(chunkSize, file.size - offset)
        const blob = file.slice(offset, offset + size)

        // Compute hash
        setChunks((prev) =>
          prev.map((c) => (c.index === chunkIdx ? { ...c, status: "hashing" } : c)),
        )
        const hash = await computeHash(blob)
        chunkHashes[chunkIdx] = hash

        // Upload with retries
        const maxRetries = 3
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (abortRef.current) return

          while (pausedRef.current && !abortRef.current) {
            await new Promise<void>((resolve) => {
              resolvePauseRef.current = resolve
            })
          }
          if (abortRef.current) return

          const cs = chunkIdx * chunkSize
          const blob2 = file.slice(cs, cs + size)
          const chunkStart = performance.now()

          setChunks((prev) =>
            prev.map((c) =>
              c.index === chunkIdx ? { ...c, status: "uploading", startTime: chunkStart } : c,
            ),
          )

          try {
            const formData = new FormData()
            formData.append("uploadId", uploadId)
            formData.append("chunkIndex", String(chunkIdx))
            formData.append("hash", hash)
            formData.append("chunk", blob2, `chunk_${String(chunkIdx)}`)

            const res = await fetch("/api/upload/chunk", {
              method: "POST",
              body: formData,
            })

            if (!res.ok) {
              const errData = (await res.json()) as { error: string }
              throw new Error(errData.error)
            }

            const chunkEnd = performance.now()
            const chunkSpeed = size / ((chunkEnd - chunkStart) / 1000)

            setChunks((prev) =>
              prev.map((c) =>
                c.index === chunkIdx
                  ? { ...c, status: "done", hash, retries: attempt, speed: chunkSpeed }
                  : c,
              ),
            )
            completedCount++
            setUploadedBytes((prev) => prev + size)
            setProgress(Math.round((completedCount / totalChunks) * 100))
            return
          } catch {
            setChunks((prev) =>
              prev.map((c) =>
                c.index === chunkIdx ? { ...c, status: "failed", retries: attempt + 1 } : c,
              ),
            )

            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
            }
          }
        }
      }

      // Process with concurrency control
      const inFlight = new Set<Promise<void>>()
      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) break

        while (inFlight.size >= concurrency) {
          await Promise.race(inFlight)
        }

        const p = uploadOne(i).finally(() => {
          inFlight.delete(p)
        })
        inFlight.add(p)
      }
      await Promise.all(inFlight)

      if (abortRef.current) return

      // 4. Complete upload
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      })
      const completeData = (await completeRes.json()) as UploadResult
      setResult(completeData)
      setProgress(100)
    } catch {
      // abort
    } finally {
      setUploading(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [file, chunkSize, totalChunks, concurrency, updateStats])

  const handlePause = useCallback(() => {
    pausedRef.current = true
    setPaused(true)
  }, [])

  const handleResume = useCallback(() => {
    pausedRef.current = false
    setPaused(false)
    if (resolvePauseRef.current) {
      resolvePauseRef.current()
      resolvePauseRef.current = null
    }
  }, [])

  const handleAbort = useCallback(() => {
    abortRef.current = true
    pausedRef.current = false
    setUploading(false)
    setPaused(false)
    if (resolvePauseRef.current) {
      resolvePauseRef.current()
      resolvePauseRef.current = null
    }
  }, [])

  const columns = [
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
  ]

  const remaining = totalChunks - chunks.filter((c) => c.status === "done").length
  const remainingBytes = remaining > 0 ? remaining * chunkSize : 0

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card size="small">
          <Dragger
            accept="*"
            multiple={false}
            showUploadList={false}
            disabled={uploading}
            beforeUpload={(f) => {
              setFile(f)
              return false
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处</p>
            <p className="ant-upload-hint">支持任意文件类型，用于演示大文件分片上传</p>
          </Dragger>
          {file && (
            <div style={{ marginTop: 8 }}>
              <Text>
                已选择: <Text strong>{file.name}</Text> ({formatBytes(file.size)})
                {totalChunks > 0 && (
                  <Text type="secondary"> — 共 {String(totalChunks)} 个分片</Text>
                )}
              </Text>
            </div>
          )}
        </Card>

        <Card size="small" title="上传配置">
          <Row gutter={24} align="middle">
            <Col span={8}>
              <Space>
                <Text>分片大小:</Text>
                <InputNumber
                  size="small"
                  min={1}
                  max={50}
                  value={chunkSize / 1024 / 1024}
                  onChange={(v) => {
                    if (v != null) setChunkSize(v * 1024 * 1024)
                  }}
                  disabled={uploading}
                  style={{ width: 80 }}
                />
                <Text type="secondary">MB</Text>
              </Space>
            </Col>
            <Col span={8}>
              <Space>
                <Text>并发数:</Text>
                <InputNumber
                  size="small"
                  min={1}
                  max={10}
                  value={concurrency}
                  onChange={(v) => {
                    if (v != null) setConcurrency(v)
                  }}
                  disabled={uploading}
                  style={{ width: 60 }}
                />
              </Space>
            </Col>
            <Col span={8}>
              <Space>
                {!uploading && (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => {
                      void startUpload()
                    }}
                    disabled={!file}
                  >
                    开始上传
                  </Button>
                )}
                {uploading && !paused && (
                  <Button icon={<PauseCircleOutlined />} onClick={handlePause}>
                    暂停
                  </Button>
                )}
                {uploading && paused && (
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleResume}>
                    恢复
                  </Button>
                )}
                {uploading && (
                  <Button danger icon={<StopOutlined />} onClick={handleAbort}>
                    停止
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {(uploading || progress > 0) && (
          <Card size="small">
            <Progress
              percent={progress}
              size="small"
              format={() =>
                `${String(progress)}% (${String(chunks.filter((c) => c.status === "done").length)}/${String(totalChunks)} 分片)`
              }
            />
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={6}>
                <Statistic
                  title="上传速度"
                  value={formatSpeed(speed)}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已上传"
                  value={formatBytes(uploadedBytes)}
                  suffix={`/ ${formatBytes(file?.size ?? 0)}`}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已用时间"
                  value={formatDuration(elapsed)}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="预估剩余"
                  value={speed > 0 ? formatDuration((remainingBytes / speed) * 1000) : "-"}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {(chunks.length > 0 || result) && (
          <Card
            size="small"
            title="分片详情"
            extra={
              result && (
                <Space>
                  <Text>
                    SHA-256: <Text code>{result.fileHash.slice(0, 16)}...</Text>
                  </Text>
                  <Tag color={result.integrityOK ? "success" : "error"}>
                    {result.integrityOK ? "完整性验证通过" : "完整性验证失败"}
                  </Tag>
                </Space>
              )
            }
          >
            {chunks.length > 0 && (
              <Table
                dataSource={chunks}
                columns={columns}
                rowKey="index"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
              />
            )}
          </Card>
        )}
      </Space>
    </div>
  )
}
