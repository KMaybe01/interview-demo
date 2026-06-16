import { ClearOutlined, PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons"
import { Badge, Button, Card, InputNumber, Select, Space, Tag, Typography } from "antd"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const { Text } = Typography

type LogLevel = "all" | "info" | "warn" | "error" | "debug"

interface LogLine {
  text: string
  level: string
  isError: boolean
  isWarn: boolean
}

function parseLine(text: string): LogLine {
  return {
    text,
    level: text.startsWith("[") ? text.slice(1, text.indexOf("]")) : "",
    isError: text.includes("[ERROR]"),
    isWarn: text.includes("[WARN]"),
  }
}

export default function SseLogStream() {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [level, setLevel] = useState<LogLevel>("all")
  const [intervalMs, setIntervalMs] = useState(200)
  const bufferRef = useRef<LogLine[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const userScrolledRef = useRef(false)
  const lastFlushRef = useRef(0)
  const intervalRef = useRef(intervalMs)

  const flush = useCallback(() => {
    const batch = bufferRef.current
    if (batch.length > 0) {
      setLogs((prev) => [...prev, ...batch].slice(-500))
      bufferRef.current = []
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const now = performance.now()
      if (lastFlushRef.current === 0 || now - lastFlushRef.current >= 100) {
        lastFlushRef.current = now
        flush()
      }
    })
  }, [flush])

  const disconnect = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setConnected(false)
  }, [])

  const connect = useCallback(() => {
    disconnect()
    const abort = new AbortController()
    abortRef.current = abort
    setConnected(false)

    const ms = intervalRef.current
    const url = `/api/sse/logs?level=all&interval=${String(ms)}`

    const startStream = async (): Promise<void> => {
      const currentAbort = abort
      try {
        const response = await fetch(url, { signal: currentAbort.signal })
        if (!response.ok) {
          setConnected(false)
          return
        }
        const reader = response.body?.getReader()
        if (!reader) {
          setConnected(false)
          return
        }
        const decoder = new TextDecoder("utf-8")
        if (!currentAbort.signal.aborted) {
          setConnected(true)
        }
        let remainder = ""

        while (!currentAbort.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break
          remainder += decoder.decode(value, { stream: true })
          const lines = remainder.split("\n")
          remainder = lines.pop() ?? ""
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              bufferRef.current.push(parseLine(line.slice(6)))
              scheduleFlush()
            }
          }
        }
      } catch (err: unknown) {
        if (abortRef.current !== currentAbort) return
        const isAbort = err instanceof DOMException && err.name === "AbortError"
        const isTypeError = err instanceof TypeError
        if (isAbort || isTypeError) return
        setConnected(false)
        setTimeout(connect, 3000)
      }
    }

    void startStream()
  }, [disconnect, scheduleFlush])

  useEffect(() => {
    intervalRef.current = intervalMs
  }, [intervalMs])

  useEffect(() => {
    if (!paused) {
      connect()
    } else {
      disconnect()
    }
    return () => {
      disconnect()
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [paused, intervalMs, connect, disconnect])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 50
  }, [])

  useEffect(() => {
    if (paused || userScrolledRef.current) return
    const el = containerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs, paused])

  const filteredLogs = useMemo(() => {
    if (level === "all") return logs
    return logs.filter((l) => l.level.toUpperCase() === level.toUpperCase())
  }, [logs, level])

  const lineCount = logs.length + bufferRef.current.length

  const statusBadge = paused
    ? ("warning" as const)
    : connected
      ? ("success" as const)
      : ("error" as const)
  const statusText = paused ? "已暂停" : connected ? "已连接 SSE" : "未连接"

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap>
            <Badge status={statusBadge} />
            <Text>{statusText}</Text>
            {!paused && (
              <Button size="small" onClick={connect} disabled={connected}>
                重连
              </Button>
            )}
            <Button
              size="small"
              type={paused ? "primary" : "default"}
              icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={() => {
                setPaused((prev) => !prev)
              }}
            >
              {paused ? "恢复" : "暂停"}
            </Button>
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={() => {
                setLogs([])
                bufferRef.current = []
              }}
            >
              清空
            </Button>
            <Select
              size="small"
              value={level}
              onChange={(v: LogLevel) => {
                setLevel(v)
              }}
              style={{ width: 100 }}
              options={[
                { label: "全部", value: "all" },
                { label: "INFO", value: "info" },
                { label: "WARN", value: "warn" },
                { label: "ERROR", value: "error" },
                { label: "DEBUG", value: "debug" },
              ]}
            />
            <Space size={4}>
              <Text type="secondary">间隔:</Text>
              <InputNumber
                size="small"
                min={50}
                max={2000}
                step={50}
                value={intervalMs}
                onChange={(v) => {
                  if (v != null) setIntervalMs(v)
                }}
                style={{ width: 80 }}
              />
              <Text type="secondary">ms</Text>
            </Space>
            <Tag>{lineCount} 条</Tag>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{
              height: 520,
              overflow: "auto",
              background: "#1e1e1e",
              color: "#d4d4d4",
              fontFamily: "monospace",
              fontSize: 12,
              padding: 12,
              lineHeight: 1.6,
            }}
          >
            {filteredLogs.length === 0 && !connected && !paused && (
              <Text type="secondary">正在连接 SSE 服务...</Text>
            )}
            {paused && filteredLogs.length === 0 && (
              <Text type="secondary">{'SSE 已暂停，点击"恢复"重新连接'}</Text>
            )}
            {filteredLogs.map((line, i) => {
              let color = "#d4d4d4"
              if (line.isError) color = "#f48771"
              else if (line.isWarn) color = "#cca700"
              return (
                <div key={i} style={{ color }}>
                  {line.text}
                </div>
              )
            })}
          </div>
        </Card>
      </Space>
    </div>
  )
}
