import {
  CheckCircleOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from "antd"
import { useCallback, useState } from "react"

const { Text } = Typography

function generateData(size: number): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 100000))
}

function mergeSorted(a: number[], b: number[]): number[] {
  const result: number[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) result.push(a[i++])
    else result.push(b[j++])
  }
  return [...result, ...a.slice(i), ...b.slice(j)]
}

function mergeAll(sortedChunks: number[][]): number[] {
  while (sortedChunks.length > 1) {
    const next: number[][] = []
    for (let i = 0; i < sortedChunks.length; i += 2) {
      if (i + 1 < sortedChunks.length) {
        next.push(mergeSorted(sortedChunks[i], sortedChunks[i + 1]))
      } else {
        next.push(sortedChunks[i])
      }
    }
    sortedChunks = next
  }
  return sortedChunks[0] ?? []
}

interface WorkerMessage {
  data: number[]
  seq: number
}

interface ChunkInfo {
  seq: number
  size: number
  status: "pending" | "processing" | "done"
}

interface ResultEntry {
  seq: number
  data: number[]
}

const DATA_SIZES = [
  { label: "1万", value: 10000 },
  { label: "5万", value: 50000 },
  { label: "10万", value: 100000 },
  { label: "50万", value: 500000 },
  { label: "100万", value: 1000000 },
]

const POOL_SIZE = navigator.hardwareConcurrency || 4
const MIN_FIRST_CHUNK = 2000

export default function WebWorkerMerge() {
  const [dataSize, setDataSize] = useState(500_000)
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle")
  const [workerTime, setWorkerTime] = useState(0)
  const [mainTime, setMainTime] = useState(0)
  const [verified, setVerified] = useState(false)
  const [chunks, setChunks] = useState<ChunkInfo[]>([])
  const [results, setResults] = useState<ResultEntry[]>([])
  const [totalProgress, setTotalProgress] = useState(0)

  const run = useCallback(() => {
    setStatus("running")
    setVerified(false)
    setResults([])
    setTotalProgress(0)

    const data = generateData(dataSize)
    const numChunks = Math.min(POOL_SIZE, data.length)

    const firstSize = Math.min(MIN_FIRST_CHUNK, data.length)
    const remaining = data.length - firstSize
    const restChunks = Math.max(0, numChunks - 1)
    const perRestChunk = restChunks > 0 ? Math.ceil(remaining / restChunks) : 0

    const partitions: number[][] = []
    let offset = 0

    partitions.push(data.slice(offset, offset + firstSize))
    offset += firstSize

    for (let i = 1; i < numChunks; i++) {
      if (offset >= data.length) {
        partitions.push([])
        continue
      }
      const end = Math.min(offset + perRestChunk, data.length)
      partitions.push(data.slice(offset, end))
      offset = end
    }

    const initialChunks: ChunkInfo[] = partitions.map((chunk, i) => ({
      seq: i,
      size: chunk.length,
      status: i === 0 ? ("processing" as const) : ("pending" as const),
    }))
    setChunks(initialChunks)

    const sortedChunks: (number[] | null)[] = partitions.map(() => null)
    let completedCount = 0
    let nextOutputSeq = 0
    const outputBuffer = new Map<number, number[]>()
    const workerStart = performance.now()

    const availableWorkers: Worker[] = []
    const pendingJobs: number[] = []

    for (let i = 0; i < Math.min(POOL_SIZE, partitions.length); i++) {
      const worker = new Worker(new URL("../utils/merge.worker.ts", import.meta.url), {
        type: "module",
      })
      availableWorkers.push(worker)
    }

    function assignJob(worker: Worker, seq: number): void {
      setChunks((prev) =>
        prev.map((c) => (c.seq === seq ? { ...c, status: "processing" as const } : c)),
      )
      const msg: WorkerMessage = { data: partitions[seq], seq }
      worker.postMessage(msg)
    }

    function onWorkerMessage(worker: Worker, e: MessageEvent<WorkerMessage>): void {
      const { data: sortedData, seq } = e.data

      sortedChunks[seq] = sortedData
      completedCount++
      setTotalProgress(Math.round((completedCount / partitions.length) * 100))

      setChunks((prev) => prev.map((c) => (c.seq === seq ? { ...c, status: "done" as const } : c)))

      outputBuffer.set(seq, sortedData)
      const newResults: ResultEntry[] = []
      while (outputBuffer.has(nextOutputSeq)) {
        const d = outputBuffer.get(nextOutputSeq)
        if (!d) break
        outputBuffer.delete(nextOutputSeq)
        newResults.push({ seq: nextOutputSeq, data: d })
        nextOutputSeq++
      }
      if (newResults.length > 0) {
        setResults((prev) => [...prev, ...newResults])
      }

      if (pendingJobs.length > 0) {
        const nextSeq = pendingJobs.shift()
        if (nextSeq !== undefined) {
          assignJob(worker, nextSeq)
        }
      } else {
        worker.terminate()
      }

      if (completedCount === partitions.length) {
        const allSorted = sortedChunks as number[][]
        const result = mergeAll(allSorted)
        const workerEnd = performance.now()
        setWorkerTime(workerEnd - workerStart)

        const mainStart = performance.now()
        const mainResult = data.slice().sort((a, b) => a - b)
        const mainEnd = performance.now()
        setMainTime(mainEnd - mainStart)

        let same = true
        for (let i = 0; i < Math.min(result.length, mainResult.length); i++) {
          if (result[i] !== mainResult[i]) {
            same = false
            break
          }
        }
        setVerified(same && result.length === mainResult.length)
        setStatus("done")
      }
    }

    for (let seq = 0; seq < partitions.length; seq++) {
      if (seq < availableWorkers.length) {
        const w = availableWorkers[seq]
        w.onmessage = (e: MessageEvent<WorkerMessage>) => {
          onWorkerMessage(w, e)
        }
        assignJob(w, seq)
      } else {
        pendingJobs.push(seq)
      }
    }
  }, [dataSize])

  const reset = useCallback(() => {
    setStatus("idle")
    setWorkerTime(0)
    setMainTime(0)
    setVerified(false)
    setChunks([])
    setResults([])
    setTotalProgress(0)
  }, [])

  const running = status === "running"
  const done = status === "done"

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap>
            <Text>数据量:</Text>
            <Select
              size="small"
              value={dataSize}
              onChange={(v: number) => {
                setDataSize(v)
              }}
              style={{ width: 100 }}
              options={DATA_SIZES.map((d) => ({ label: d.label, value: d.value }))}
              disabled={running}
            />
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={run}
              loading={running}
              disabled={running}
            >
              运行
            </Button>
            <Button icon={<ClearOutlined />} onClick={reset} disabled={running}>
              重置
            </Button>
            <Tag icon={<SyncOutlined />}>Worker Pool: {POOL_SIZE}</Tag>
          </Space>
        </Card>

        {status !== "idle" && (
          <Card size="small" title="处理进度">
            <Progress percent={totalProgress} status={done ? "success" : "active"} />
          </Card>
        )}

        {chunks.length > 0 && (
          <Card size="small" title="分片状态">
            <Row gutter={[8, 8]}>
              {chunks.map((chunk) => (
                <Col key={chunk.seq}>
                  <Tooltip title={`分片 #${String(chunk.seq)}: ${chunk.size.toLocaleString()} 条`}>
                    <Tag
                      icon={
                        chunk.status === "done" ? (
                          <CheckCircleOutlined />
                        ) : chunk.status === "processing" ? (
                          <SyncOutlined spin />
                        ) : (
                          <ClockCircleOutlined />
                        )
                      }
                      color={
                        chunk.status === "done"
                          ? "success"
                          : chunk.status === "processing"
                            ? "processing"
                            : undefined
                      }
                    >
                      #{chunk.seq} ({chunk.size.toLocaleString()})
                    </Tag>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {(workerTime > 0 || mainTime > 0) && (
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Worker 分治合并"
                  value={workerTime.toFixed(2)}
                  suffix="ms"
                  styles={{ content: { color: "#1677ff" } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="主线程 Array.sort"
                  value={mainTime.toFixed(2)}
                  suffix="ms"
                  styles={{ content: { color: "#52c41a" } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="加速比"
                  value={mainTime > 0 ? (mainTime / workerTime).toFixed(2) : "-"}
                  suffix="x"
                  styles={{ content: { color: mainTime > workerTime ? "#1677ff" : "#ff4d4f" } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="结果验证"
                  value={verified ? "通过" : "失败"}
                  styles={{ content: { color: verified ? "#52c41a" : "#ff4d4f" } }}
                  prefix={verified ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>
        )}

        {results.length > 0 && (
          <Card
            size="small"
            title={`分片输出 (${String(results.length)} / ${String(chunks.length)} 个分片)`}
            styles={{ body: { padding: 0 } }}
          >
            <div
              style={{
                height: 300,
                overflow: "auto",
                background: "#1e1e1e",
                color: "#d4d4d4",
                fontFamily: "monospace",
                fontSize: 12,
                padding: 12,
                lineHeight: 1.6,
              }}
            >
              {results.map((r) => (
                <div key={r.seq} style={{ marginBottom: 8 }}>
                  <Text style={{ color: "#6a9955" }}>[分片 #{r.seq}]</Text>{" "}
                  <Text style={{ color: "#d4d4d4" }}>
                    [{r.data.slice(0, 5).join(", ")}
                    {r.data.length > 5 ? ", ..." : ""}]
                  </Text>{" "}
                  <Text style={{ color: "#569cd6" }}>({r.data.length.toLocaleString()} 条)</Text>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Space>
    </div>
  )
}
