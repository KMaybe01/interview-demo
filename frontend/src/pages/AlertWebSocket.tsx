import {
  ApiOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons"
import { Alert, Badge, Button, Card, Empty, Segmented, Space, Tag, Tooltip, Typography } from "antd"
import * as echarts from "echarts"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { List } from "react-window"
import {
  type AlertLevel,
  type AlertMessage,
  CATEGORY_COLORS,
  useAlertStore,
} from "../stores/alertStore.ts"
import { type ConnectionStatus, MAX_RETRY, ReconnectingTransport } from "../utils/wsTransport.ts"

const { Text } = Typography

const LEVEL_TAG: Record<AlertLevel, { color: string; text: string }> = {
  critical: { color: "red", text: "CRITICAL" },
  major: { color: "orange", text: "MAJOR" },
  minor: { color: "blue", text: "MINOR" },
  info: { color: "green", text: "INFO" },
}

const PRIORITY: Record<AlertLevel, number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
}

const ALERT_TYPE: Record<AlertLevel, "success" | "info" | "warning" | "error"> = {
  critical: "error",
  major: "warning",
  minor: "info",
  info: "success",
}

const LEVEL_ORDER: AlertLevel[] = ["critical", "major", "minor", "info"]
const DISPLAY_LIMIT = 2000

const AlertRow = ({
  index,
  style,
  data,
}: {
  index: number
  style: React.CSSProperties
  data: AlertMessage[]
}) => {
  const a = data[index]
  const tag = LEVEL_TAG[a.level]
  const catColor = CATEGORY_COLORS[a.category] || "#8c8c8c"
  return (
    <div style={style}>
      <Alert
        type={ALERT_TYPE[a.level]}
        title={
          <Space style={{ flexWrap: "wrap" }}>
            <Tag color={tag.color}>{tag.text}</Tag>
            <Tag color={catColor}>{a.category}</Tag>
            <Tag>{a.topic.toUpperCase()}</Tag>
            <Text>{a.message}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {a.time}
            </Text>
          </Space>
        }
        showIcon
        style={{ marginBottom: 6, padding: "6px 12px" }}
      />
    </div>
  )
}

const CHART_COLORS: Record<AlertLevel, string> = {
  critical: "#f5222d",
  major: "#fa8c16",
  minor: "#1890ff",
  info: "#52c41a",
}

export default function AlertWebSocket() {
  const { alerts, metrics, addAlerts, logInterruption, clearAlerts, resetMetrics } = useAlertStore()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [heartbeatAlive, setHeartbeatAlive] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isInterrupted, setIsInterrupted] = useState(false)
  const [reconnectCountdown, setReconnectCountdown] = useState(0)
  const [levelFilter, setLevelFilter] = useState<"all" | AlertLevel>("all")
  const [recovered, setRecovered] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transportType, setTransportType] = useState("WebSocket")

  const transportRef = useRef<import("../utils/wsTransport.ts").ReconnectingTransport | null>(null)
  const aliveRef = useRef(true)
  const chartActiveRef = useRef(true)
  const startChartLoopRef = useRef<() => void>(() => {
    /* empty */
  })
  const stopChartLoopRef = useRef<() => void>(() => {
    /* empty */
  })
  const seenRef = useRef<Set<string>>(new Set())
  const bufferRef = useRef<AlertMessage[]>([])
  const rafRef = useRef(0)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const trendBufferRef = useRef<{ time: number; level: AlertLevel }[]>([])
  const chartRafRef = useRef(0)
  const rateRef = useRef(1000)
  const workersRef = useRef(4)
  const pausedRef = useRef(false)
  const disconnectTimeRef = useRef(0)
  const [editRate, setEditRate] = useState(1000)
  const [editWorkers, setEditWorkers] = useState(4)

  const addToBuffer = useCallback((msg: AlertMessage) => {
    bufferRef.current.push(msg)
  }, [])

  const rafFlush = useCallback(() => {
    if (!aliveRef.current) return
    if (bufferRef.current.length > 0) {
      const batch = bufferRef.current.splice(0)
      const unique: AlertMessage[] = []
      for (const msg of batch) {
        if (!seenRef.current.has(msg.id)) {
          seenRef.current.add(msg.id)
          unique.push(msg)
        }
      }
      if (seenRef.current.size > 5000) seenRef.current = new Set()
      if (unique.length > 0) {
        unique.sort((a, b) => PRIORITY[a.level] - PRIORITY[b.level])
        const now = Date.now()
        for (const msg of unique) trendBufferRef.current.push({ time: now, level: msg.level })
        addAlerts(unique)
      }
    }
    rafRef.current = requestAnimationFrame(rafFlush)
  }, [addAlerts])

  const initTransport = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const baseUrl = `${protocol}//localhost:8080/ws/alerts?rate=${String(rateRef.current)}&workers=${String(workersRef.current)}`

    const transport = new ReconnectingTransport(baseUrl)
    transport.setCallbacks({
      onMessage: (msg) => {
        addToBuffer(msg)
      },
      onStatus: (status) => {
        setConnectionStatus(status)
        if (status === "connected") {
          setIsInterrupted(false)
          setRetryCount(0)
          disconnectTimeRef.current = 0
          startChartLoopRef.current()
        } else if (status === "reconnecting") {
          setIsInterrupted(true)
          stopChartLoopRef.current()
          if (disconnectTimeRef.current === 0) {
            disconnectTimeRef.current = Date.now()
          }
        } else if (status === "disconnected") {
          stopChartLoopRef.current()
        }
      },
      onRetry: (attempt, _delay) => {
        setRetryCount(attempt)
        setReconnectCountdown(Math.ceil(_delay / 1000))
      },
      onHeartbeat: (alive) => {
        setHeartbeatAlive(alive)
        if (alive && disconnectTimeRef.current > 0) {
          setRecovered(true)
          setTimeout(() => {
            setRecovered(false)
          }, 3000)
          disconnectTimeRef.current = 0
        }
      },
      onSyncRequest: (_lastSeq) => {
        // server-side sync would go here
      },
    })

    transport.onFallbackChange((type) => {
      setTransportType(type)
    })

    transport.onInterruptionLogged((downtimeMs) => {
      logInterruption(downtimeMs)
    })

    transportRef.current = transport
    return transport
  }, [addToBuffer, logInterruption])

  const connect = useCallback(
    (delayMs = 0) => {
      pausedRef.current = false
      setIsPaused(false)
      if (delayMs > 0) {
        setTimeout(() => {
          const t = transportRef.current ?? initTransport()
          t.connect()
        }, delayMs)
      } else {
        const t = transportRef.current ?? initTransport()
        t.connect()
      }
    },
    [initTransport],
  )

  const disconnect = useCallback(() => {
    transportRef.current?.disconnect()
    transportRef.current = null
    setConnectionStatus("disconnected")
    setHeartbeatAlive(false)
    setIsInterrupted(false)
    stopChartLoopRef.current()
  }, [])

  const pauseConnection = useCallback(() => {
    pausedRef.current = true
    setIsPaused(true)
    transportRef.current?.disconnect()
    setConnectionStatus("disconnected")
    setHeartbeatAlive(false)
    stopChartLoopRef.current()
  }, [])

  const resumeConnection = useCallback(() => {
    pausedRef.current = false
    setIsPaused(false)
    startChartLoopRef.current()
    const t = transportRef.current ?? initTransport()
    t.connect()
  }, [initTransport])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const r = parseInt(p.get("rate") ?? "1000", 10)
    const w = parseInt(p.get("workers") ?? "4", 10)
    if (!Number.isNaN(r) && r >= 100) {
      rateRef.current = r
      setEditRate(r)
    }
    if (!Number.isNaN(w) && w >= 1) {
      workersRef.current = w
      setEditWorkers(w)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      disconnect()
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(chartRafRef.current)
      chartInstanceRef.current?.dispose()
    }
  }, [disconnect])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(rafFlush)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [rafFlush])

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" })
    chartInstanceRef.current = chart

    chart.setOption({
      tooltip: { trigger: "axis" },
      legend: {
        data: ["Critical", "Major", "Minor", "Info"],
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 40, right: 16, top: 8, bottom: 32 },
      xAxis: { type: "category", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        min: 0,
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { type: "dashed", opacity: 0.3 } },
      },
      series: LEVEL_ORDER.map((level) => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        type: "line",
        smooth: true,
        stack: "total",
        areaStyle: { opacity: 0.25 },
        symbol: "none",
        animation: false,
        lineStyle: { width: 1.5 },
        itemStyle: { color: CHART_COLORS[level] },
      })),
    })

    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      chart.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  const updateChart = useCallback(() => {
    if (!aliveRef.current) return
    const chart = chartInstanceRef.current
    if (!chart) {
      chartRafRef.current = requestAnimationFrame(updateChart)
      return
    }
    const trend = trendBufferRef.current
    const now = Date.now()
    const windowMs = 60000
    const bucketSize = 5000
    const bucketCount = Math.ceil(windowMs / bucketSize)
    const windowStart = now - windowMs

    const labels: string[] = []
    const buckets: Record<AlertLevel, number[]> = {
      critical: [],
      major: [],
      minor: [],
      info: [],
    }
    for (let i = 0; i < bucketCount; i++) {
      const t = new Date(windowStart + (i + 1) * bucketSize)
      labels.push(
        t.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      )
      for (const level of LEVEL_ORDER) buckets[level].push(0)
    }
    for (const t of trend) {
      if (t.time < windowStart) continue
      const idx = Math.floor((t.time - windowStart) / bucketSize)
      if (idx >= 0 && idx < bucketCount) buckets[t.level][idx]++
    }
    chart.setOption({
      xAxis: { data: labels },
      series: LEVEL_ORDER.map((level) => ({ data: buckets[level] })),
    })
    if (chartActiveRef.current) {
      chartRafRef.current = requestAnimationFrame(updateChart)
    }
  }, [])

  useEffect(() => {
    startChartLoopRef.current = () => {
      chartActiveRef.current = true
      cancelAnimationFrame(chartRafRef.current)
      chartRafRef.current = requestAnimationFrame(updateChart)
    }
    stopChartLoopRef.current = () => {
      chartActiveRef.current = false
      cancelAnimationFrame(chartRafRef.current)
    }
    chartRafRef.current = requestAnimationFrame(updateChart)
    return () => {
      cancelAnimationFrame(chartRafRef.current)
    }
  }, [updateChart])

  const fallbackLabel =
    transportType === "SSE" ? "SSE 降级" : transportType === "Polling" ? "轮询降级" : null

  const statusBadge: "success" | "warning" | "error" = recovered
    ? "success"
    : isInterrupted
      ? "error"
      : connectionStatus === "connected" && heartbeatAlive
        ? "success"
        : connectionStatus === "connected"
          ? "warning"
          : "error"

  const statusText = isPaused
    ? "已暂停"
    : recovered
      ? "已恢复"
      : isInterrupted && connectionStatus === "reconnecting"
        ? `已中断 · ${String(reconnectCountdown)}s 后重连`
        : isInterrupted
          ? "已中断"
          : connectionStatus === "connected" && heartbeatAlive
            ? `已连接 (${transportType})`
            : connectionStatus === "connected"
              ? "心跳异常"
              : connectionStatus === "connecting"
                ? "连接中..."
                : "未连接"

  const statusTooltip = recovered
    ? "连接已恢复"
    : isInterrupted
      ? `连接异常中断 · 第 ${String(retryCount)}/${String(MAX_RETRY)} 次重连 · 已中断 ${String(Math.floor((Date.now() - disconnectTimeRef.current) / 1000))}s`
      : connectionStatus === "connected" && heartbeatAlive
        ? `${transportType} 已连接，心跳正常`
        : connectionStatus === "connected"
          ? `${transportType} 已连接，未收到心跳响应`
          : connectionStatus === "connecting"
            ? "正在建立连接..."
            : `${transportType} 未连接`

  const displayAlerts = useMemo(() => {
    const sorted =
      levelFilter === "all"
        ? [...alerts].sort((a, b) => PRIORITY[a.level] - PRIORITY[b.level])
        : alerts
            .filter((a) => a.level === levelFilter)
            .sort((a, b) => PRIORITY[a.level] - PRIORITY[b.level])
    return sorted.slice(0, DISPLAY_LIMIT)
  }, [alerts, levelFilter])

  const qps = useMemo(() => {
    const ts = metrics.timestamps
    if (ts.length < 2) return 0
    const cutoff = Date.now() - 1000
    return ts.filter((t) => t >= cutoff).length
  }, [metrics.timestamps])

  const levelDots = useMemo(() => {
    const total = metrics.totalReceived || 1
    return LEVEL_ORDER.map((l) => ({
      level: l,
      pct: (metrics.countByLevel[l] / total) * 100,
    }))
  }, [metrics])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* Connection + QPS bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space>
          <Tooltip title={statusTooltip}>
            <Badge status={statusBadge} />
          </Tooltip>
          <Text strong style={{ color: isInterrupted ? "#f5222d" : undefined }}>
            {statusText}
          </Text>
          {isInterrupted && <Text type="secondary">中断: {metrics.interruptionCount}</Text>}
          <Text type="secondary">重连: {retryCount}</Text>
          <Text type="secondary">|</Text>
          <Text type="secondary">接收: {metrics.totalReceived}</Text>
          <Tag color="purple" style={{ fontWeight: 600 }}>
            QPS: {qps.toLocaleString()}
          </Tag>
          {metrics.gapsDetected > 0 && <Tag color="warning">丢段: {metrics.gapsDetected}</Tag>}
        </Space>
        <Segmented
          size="small"
          value={transportType}
          onChange={(v) => {
            const index = v === "WebSocket" ? 0 : v === "SSE" ? 1 : 2
            let t = transportRef.current
            if (!t) {
              t = initTransport()
              transportRef.current = t
            }
            t.forceTransport(index)
          }}
          options={[
            { label: "WebSocket", value: "WebSocket" },
            { label: "SSE", value: "SSE" },
            { label: "Polling", value: "Polling" },
          ]}
        />
        <Space>
          <Tooltip title="目标速率 (msg/s)，修改后点重连生效">
            <span>速率:</span>
          </Tooltip>
          <input
            type="number"
            min={100}
            max={200000}
            step={1000}
            value={editRate}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10)
              if (!Number.isNaN(v) && v >= 100) {
                rateRef.current = v
                setEditRate(v)
              }
            }}
            style={{ width: 80, fontSize: 12 }}
          />
          <Tooltip title="并发推送 Goroutine 数量，修改后点重连生效">
            <span>并发:</span>
          </Tooltip>
          <input
            type="number"
            min={1}
            max={128}
            step={1}
            value={editWorkers}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10)
              if (!Number.isNaN(v) && v > 0) {
                workersRef.current = v
                setEditWorkers(v)
              }
            }}
            style={{ width: 60, fontSize: 12 }}
          />
          {fallbackLabel && (
            <Tag color="orange" icon={<ApiOutlined />}>
              {fallbackLabel}
            </Tag>
          )}
          {connectionStatus === "connected" ? (
            <>
              <Button size="small" icon={<PauseCircleOutlined />} onClick={pauseConnection}>
                暂停
              </Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={disconnect}>
                断开连接
              </Button>
            </>
          ) : isPaused ? (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={resumeConnection}
            >
              恢复
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                connect(100)
              }}
            >
              重连
            </Button>
          )}
          <Button
            size="small"
            icon={<WarningOutlined />}
            onClick={() => {
              clearAlerts()
              resetMetrics()
            }}
          >
            清空
          </Button>
        </Space>
      </div>

      {/* Level distribution bar */}
      <div style={{ display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden" }}>
        {levelDots.map(({ level, pct }) => (
          <div
            key={level}
            style={{
              width: `${String(pct)}%`,
              backgroundColor: CHART_COLORS[level],
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>

      {/* ECharts trend */}
      <Card size="small" title={<Text strong>告警趋势 (最近 60s)</Text>}>
        <div ref={chartRef} style={{ width: "100%", height: 200 }} />
      </Card>

      {/* Alert list */}
      <Card
        size="small"
        styles={{ body: { padding: 0, overflow: "hidden" } }}
        style={{ flex: 1, minHeight: 0 }}
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text strong>{`实时告警 (${String(displayAlerts.length)})`}</Text>
            <Segmented
              size="small"
              value={levelFilter}
              onChange={(v) => {
                setLevelFilter(v as "all" | AlertLevel)
              }}
              options={[
                { label: `全部 (${String(alerts.length)})`, value: "all" },
                ...LEVEL_ORDER.map((l) => ({
                  label: `${LEVEL_TAG[l].text} (${String(metrics.countByLevel[l])})`,
                  value: l,
                })),
              ]}
            />
          </div>
        }
      >
        {displayAlerts.length === 0 ? (
          <Empty description="暂无告警" />
        ) : (
          <List<{ data: AlertMessage[] }>
            rowCount={displayAlerts.length}
            rowHeight={48}
            rowComponent={AlertRow}
            rowProps={{ data: displayAlerts }}
            style={{ height: 350 }}
          />
        )}
      </Card>
    </div>
  )
}
