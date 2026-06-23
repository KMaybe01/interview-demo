import { Badge, Button, Card, Col, Progress, Row, Space, Statistic, Typography } from "antd"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const { Text } = Typography

type Status = "idle" | "connecting" | "key-exchange" | "decrypting" | "done" | "interrupted"

const statisticContentStyle = { content: { fontSize: 18 } }
const encryptedLineStyle: React.CSSProperties = {
  color: "#e06c75",
  opacity: 0.7,
  whiteSpace: "nowrap" as const,
}
const seqStyle: React.CSSProperties = { color: "#d19a66" }
const sharedLogStyle: React.CSSProperties = {
  height: 480,
  overflow: "auto",
  background: "#1e1e1e",
  color: "#d4d4d4",
  fontFamily: "monospace",
  fontSize: 12,
  padding: 12,
  lineHeight: 1.6,
}

const logLineStyles: Record<string, React.CSSProperties> = {
  error: { color: "#f48771" },
  warn: { color: "#cca700" },
  debug: { color: "#6a9955" },
  default: { color: "#d4d4d4" },
}

function getLogLineStyle(line: string): React.CSSProperties {
  if (line.startsWith("[ERROR]")) return logLineStyles.error
  if (line.startsWith("[WARN]")) return logLineStyles.warn
  if (line.startsWith("[DEBUG]")) return logLineStyles.debug
  return logLineStyles.default
}

interface DecodeStats {
  totalChunks: number
  decryptedChunks: number
  totalLines: number
  elapsed: number
  linesPerSec: number
  totalTime: number
}

interface SSEMessage {
  type?: string
  key?: string
  encryptedKey?: string
  seq?: number
  data?: string
  progress?: number
}

interface EncryptedEntry {
  seq: number
  preview: string
}

export default function LogStream() {
  const [status, setStatus] = useState<Status>("idle")
  const [progress, setProgress] = useState(0)
  const [lines, setLines] = useState<string[]>([])
  const [encryptedLines, setEncryptedLines] = useState<EncryptedEntry[]>([])
  const [stats, setStats] = useState<DecodeStats>({
    totalChunks: 0,
    decryptedChunks: 0,
    totalLines: 0,
    elapsed: 0,
    linesPerSec: 0,
    totalTime: 0,
  })

  const abortRef = useRef<AbortController | null>(null)
  const workersRef = useRef<Worker[]>([])
  const availableRef = useRef<number[]>([])
  const pendingRef = useRef<{ data: string; seq: number }[]>([])
  const mergeRef = useRef<Map<number, string[]>>(new Map())
  const expectedSeqRef = useRef(0)
  const displayRef = useRef<string[]>([])
  const encryptedBufRef = useRef<EncryptedEntry[]>([])
  const rafRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const encContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  const statsRef = useRef({ totalChunks: 0, decryptedChunks: 0, totalLines: 0 })
  const startTimeRef = useRef(0)
  const doneTimeRef = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)
  const statusRef = useRef<Status>("idle")

  const workerCount = useMemo(() => navigator.hardwareConcurrency || 4, [])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      if (displayRef.current.length > 0) {
        setLines((prev) => [...prev, ...displayRef.current].slice(-2000))
        displayRef.current = []
      }
      if (encryptedBufRef.current.length > 0) {
        const buf = encryptedBufRef.current
        encryptedBufRef.current = []
        setEncryptedLines((prev) => [...prev, ...buf].slice(-500))
      }
      const s = statsRef.current
      const now = doneTimeRef.current || performance.now()
      const elapsed = (now - startTimeRef.current) / 1000
      setStats({
        totalChunks: s.totalChunks,
        decryptedChunks: s.decryptedChunks,
        totalLines: s.totalLines,
        elapsed,
        linesPerSec: elapsed > 0 ? Math.round(s.totalLines / elapsed) : 0,
        totalTime: doneTimeRef.current ? (doneTimeRef.current - startTimeRef.current) / 1000 : 0,
      })
    })
  }, [])

  const lastProgressRef = useRef(0)

  const handleDecryptResult = useCallback(
    (seq: number, decryptedLines: string[]) => {
      const s = statsRef.current
      s.decryptedChunks++
      s.totalLines += decryptedLines.length

      setEncryptedLines((prev) => {
        const filtered = prev.filter((e) => e.seq !== seq)
        return filtered.length > 500 ? filtered.slice(-500) : filtered
      })

      mergeRef.current.set(seq, decryptedLines)
      while (mergeRef.current.has(expectedSeqRef.current)) {
        const entry = mergeRef.current.get(expectedSeqRef.current)
        if (entry == null) break
        mergeRef.current.delete(expectedSeqRef.current)
        displayRef.current.push(...entry)
        expectedSeqRef.current++
      }
      scheduleFlush()

      if (pendingRef.current.length > 0) {
        const next = pendingRef.current.shift()
        if (next == null) return
        const idx = availableRef.current.shift()
        if (idx != null) {
          workersRef.current[idx]?.postMessage({ type: "decrypt", data: next.data, seq: next.seq })
        }
      }
    },
    [scheduleFlush],
  )

  const dispatchJob = useCallback((data: string, seq: number) => {
    const idx = availableRef.current.shift()
    if (idx != null) {
      workersRef.current[idx]?.postMessage({ type: "decrypt", data, seq })
    } else {
      pendingRef.current.push({ data, seq })
    }
  }, [])

  const initWorkersFromAes = useCallback(
    (aesKey: ArrayBuffer) => {
      for (const w of workersRef.current) {
        w.terminate()
      }
      workersRef.current = []
      availableRef.current = []

      for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(new URL("../utils/decrypt.worker.ts", import.meta.url), {
          type: "module",
        })
        worker.postMessage({ type: "init", key: aesKey })
        const idx = i
        worker.onmessage = (e) => {
          const d = e.data as { lines: string[]; seq: number }
          availableRef.current.push(idx)
          handleDecryptResult(d.seq, d.lines)
        }
        workersRef.current.push(worker)
        availableRef.current.push(i)
      }
    },
    [workerCount, handleDecryptResult],
  )

  const disconnect = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    for (const w of workersRef.current) {
      w.terminate()
    }
    workersRef.current = []
    availableRef.current = []
    pendingRef.current = []
    mergeRef.current.clear()
    displayRef.current = []
    encryptedBufRef.current = []
    expectedSeqRef.current = 0
    setStatus("idle")
    setProgress(0)
    setLines([])
    setEncryptedLines([])
    statsRef.current = { totalChunks: 0, decryptedChunks: 0, totalLines: 0 }
  }, [])

  const interrupt = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    for (const w of workersRef.current) {
      w.terminate()
    }
    workersRef.current = []
    availableRef.current = []
    pendingRef.current = []
    mergeRef.current.clear()
    encryptedBufRef.current = []
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    setStatus("interrupted")
  }, [])

  const performKeyExchange = useCallback(
    (
      signal: AbortSignal,
    ): Promise<{
      aesKey: ArrayBuffer
      reader: ReadableStreamDefaultReader<Uint8Array>
      remainder: string
    }> => {
      return new Promise((resolve, reject) => {
        const keyWorker = new Worker(new URL("../utils/decrypt.worker.ts", import.meta.url), {
          type: "module",
        })

        keyWorker.onmessage = async (e) => {
          const msg = e.data as { type: string; publicKey?: string; message?: string }
          if (msg.type === "error") {
            keyWorker.terminate()
            reject(new Error(msg.message ?? "Key exchange failed"))
            return
          }
          if (msg.type === "key-generated" && msg.publicKey) {
            try {
              setStatus("key-exchange")
              const resp = await fetch(
                `/api/sse/encrypted-logs?clientKey=${encodeURIComponent(msg.publicKey)}`,
                { signal },
              )
              if (!resp.ok) {
                reject(new Error("SSE connection failed"))
                return
              }
              const reader = resp.body?.getReader()
              if (!reader) {
                reject(new Error("No reader"))
                return
              }
              const decoder = new TextDecoder("utf-8")
              let buf = ""

              while (!signal.aborted) {
                const { done, value } = await reader.read()
                if (done) break
                buf += decoder.decode(value, { stream: true })
                const lines = buf.split("\n")
                buf = lines.pop() ?? ""

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i]
                  if (!line.startsWith("data: ")) continue
                  const evt = JSON.parse(line.slice(6)) as SSEMessage
                  if (evt.type === "key-exchange" && evt.encryptedKey) {
                    const encKeyRaw = Uint8Array.from(atob(evt.encryptedKey), (c) =>
                      c.charCodeAt(0),
                    )
                    keyWorker.postMessage({ type: "init", key: encKeyRaw.buffer }, [
                      encKeyRaw.buffer,
                    ])
                    const remaining = lines.slice(i + 1).join("\n")
                    const remainderBuf = buf ? remaining + "\n" + buf : remaining
                    keyWorker.onmessage = (e2) => {
                      const rawKey = e2.data as {
                        type?: string
                        key?: ArrayBuffer
                        message?: string
                      }
                      if (rawKey.type === "error") {
                        reader.cancel().catch(() => undefined)
                        keyWorker.terminate()
                        reject(new Error(rawKey.message ?? "RSA decrypt failed"))
                        return
                      }
                      keyWorker.terminate()
                      if (!rawKey.key) {
                        reject(new Error("No AES key returned from worker"))
                        return
                      }
                      resolve({
                        aesKey: rawKey.key,
                        reader,
                        remainder: remainderBuf,
                      })
                    }
                    return
                  }
                }
              }
            } catch (err) {
              keyWorker.terminate()
              reject(err instanceof Error ? err : new Error(String(err)))
            }
          }
        }

        signal.addEventListener(
          "abort",
          () => {
            keyWorker.terminate()
            reject(new DOMException("Aborted", "AbortError"))
          },
          { once: true },
        )

        keyWorker.postMessage({ type: "generate-key" })
      })
    },
    [],
  )

  const start = useCallback(() => {
    disconnect()
    setStatus("connecting")
    setProgress(0)
    setLines([])
    setEncryptedLines([])
    statsRef.current = { totalChunks: 0, decryptedChunks: 0, totalLines: 0 }
    startTimeRef.current = performance.now()
    doneTimeRef.current = 0

    const abort = new AbortController()
    abortRef.current = abort

    const run = async (): Promise<void> => {
      try {
        const {
          aesKey,
          reader,
          remainder: initialRemainder,
        } = await performKeyExchange(abort.signal)
        initWorkersFromAes(aesKey)
        setStatus("decrypting")

        const decoder = new TextDecoder("utf-8")
        let remainder = initialRemainder

        while (!abort.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break
          remainder += decoder.decode(value, { stream: true })
          const msgLines = remainder.split("\n")
          remainder = msgLines.pop() ?? ""

          for (const msgLine of msgLines) {
            if (!msgLine.startsWith("data: ")) continue
            const evt = JSON.parse(msgLine.slice(6)) as SSEMessage

            if (evt.type !== "done" && (evt.seq == null || evt.data == null)) {
              continue
            }

            if (evt.type === "done") {
              doneTimeRef.current = performance.now()
              setStatus("done")
              scheduleFlush()
              continue
            }

            const c = evt as { seq: number; data: string; progress: number }
            statsRef.current.totalChunks++
            const now = performance.now()
            if (now - lastProgressRef.current > 200) {
              lastProgressRef.current = now
              setProgress(Math.round(c.progress))
            }

            const preview = c.data.length > 48 ? `${c.data.slice(0, 48)}...` : c.data
            encryptedBufRef.current.push({ seq: c.seq, preview })
            scheduleFlush()

            dispatchJob(c.data, c.seq)
          }
        }
      } catch (err: unknown) {
        if (abortRef.current !== abort) return
        if (err instanceof DOMException && err.name === "AbortError") return
        if (err instanceof TypeError) return
        setStatus("idle")
      }
    }

    void run()

    timerRef.current = setInterval(() => {
      scheduleFlush()
    }, 500)
  }, [disconnect, initWorkersFromAes, dispatchJob, scheduleFlush, performKeyExchange])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    return () => {
      disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [disconnect])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 50
  }, [])

  useEffect(() => {
    if (userScrolledRef.current) return
    const el = containerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [lines.length])

  const statusBadge: "success" | "default" | "processing" | "warning" =
    status === "done"
      ? "success"
      : status === "interrupted"
        ? "warning"
        : status === "decrypting" || status === "connecting" || status === "key-exchange"
          ? "processing"
          : "default"

  const statusText = useMemo(
    () =>
      status === "idle"
        ? "就绪"
        : status === "connecting"
          ? "连接中..."
          : status === "key-exchange"
            ? "密钥交换中..."
            : status === "decrypting"
              ? "解密中"
              : status === "interrupted"
                ? "已中断"
                : "解密完成",
    [status],
  )

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap style={{ marginBottom: 8 }}>
            <Badge status={statusBadge} />
            <Text>{statusText}</Text>
            {status === "idle" && (
              <Button type="primary" onClick={start}>
                开始解密
              </Button>
            )}
            {(status === "connecting" || status === "key-exchange" || status === "decrypting") && (
              <Button type="primary" danger onClick={interrupt}>
                中断
              </Button>
            )}
            {(status === "interrupted" || status === "done") && (
              <Button type="primary" onClick={start}>
                重新开始
              </Button>
            )}
          </Space>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic title="Worker 数" value={workerCount} styles={statisticContentStyle} />
            </Col>
            <Col span={4}>
              <Statistic
                title="已解密 Chunks"
                value={stats.decryptedChunks}
                styles={statisticContentStyle}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="已解密行数"
                value={stats.totalLines}
                styles={statisticContentStyle}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="解密速度"
                value={stats.linesPerSec}
                suffix="行/秒"
                styles={statisticContentStyle}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="解密耗时"
                value={
                  status === "done" || status === "interrupted"
                    ? stats.totalTime.toFixed(2)
                    : stats.elapsed.toFixed(1)
                }
                suffix="秒"
                styles={statisticContentStyle}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="估计数据量"
                value={`${((stats.totalLines * 100) / 1000000).toFixed(1)}MB`}
                styles={statisticContentStyle}
              />
            </Col>
          </Row>
          {stats.totalChunks > 0 && (
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={6}>
                <Text type="secondary">
                  总 Chunks: {String(stats.totalChunks)} | 已解密: {String(stats.decryptedChunks)} |
                  合并缓冲区: {String(mergeRef.current.size)}
                </Text>
              </Col>
              <Col span={6}>
                <Text type="secondary">
                  期望 Seq: {String(expectedSeqRef.current)} | 待处理:{" "}
                  {String(pendingRef.current.length)} | 空闲 Worker:{" "}
                  {String(availableRef.current.length)}
                </Text>
              </Col>
            </Row>
          )}
        </Card>

        {status !== "idle" && status !== "interrupted" && (
          <Progress
            percent={status === "done" ? 100 : progress}
            size="small"
            format={() =>
              status === "done"
                ? "100% (完成)"
                : `${progress.toFixed(1)}% (${String(stats.decryptedChunks)}/${String(stats.totalChunks)} chunks)`
            }
          />
        )}

        <Row gutter={8}>
          <Col span={12}>
            <Card
              size="small"
              title={
                <Text style={{ color: "#e06c75", fontSize: 13 }}>🔒 加密数据 (AES-256-GCM)</Text>
              }
              styles={{ body: { padding: 0 } }}
            >
              <div ref={encContainerRef} style={sharedLogStyle}>
                {encryptedLines.length === 0 && status === "decrypting" && (
                  <Text type="secondary">等待加密数据到达...</Text>
                )}
                {encryptedLines.length === 0 &&
                  status !== "decrypting" &&
                  status !== "done" &&
                  status !== "interrupted" && <Text type="secondary">加密数据将在此显示</Text>}
                {encryptedLines.map((entry) => (
                  <div key={entry.seq} style={encryptedLineStyle}>
                    <span style={seqStyle}>[#{String(entry.seq).padStart(4, "0")}]</span>{" "}
                    {entry.preview}
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              size="small"
              title={<Text style={{ color: "#98c379", fontSize: 13 }}>🔓 解密数据</Text>}
              styles={{ body: { padding: 0 } }}
            >
              <div ref={containerRef} onScroll={handleScroll} style={sharedLogStyle}>
                {lines.length === 0 && status === "idle" && (
                  <Text type="secondary">点击「开始解密」启动十万行日志流解密</Text>
                )}
                {lines.length === 0 && status === "connecting" && (
                  <Text type="secondary">正在建立 SSE 连接...</Text>
                )}
                {lines.length === 0 && status === "key-exchange" && (
                  <Text type="secondary">正在进行 RSA-2048 密钥交换...</Text>
                )}
                {lines.length === 0 && status === "decrypting" && (
                  <Text type="secondary">正在解密首段数据，首屏渲染中...</Text>
                )}
                {lines.length === 0 && status === "done" && (
                  <Text type="secondary">所有日志解密完成</Text>
                )}
                {lines.length === 0 && status === "interrupted" && (
                  <Text type="secondary">解密被中断，无已解密数据</Text>
                )}
                {lines.map((line, i) => {
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static log output, no stable id
                    <div key={i} style={getLogLineStyle(line)}>
                      {line}
                    </div>
                  )
                })}
              </div>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}
