import type { AlertLevel, AlertMessage } from "../stores/alertStore.ts"

// ─── Protocol ────────────────────────────────────────────────────────────

export const LEVEL_ALIAS: Record<string, AlertLevel> = {
  success: "info",
  warning: "major",
  error: "critical",
  critical: "critical",
  major: "major",
  minor: "minor",
  info: "info",
}

export function parseMessage(data: string | ArrayBuffer): AlertMessage | null {
  const raw =
    typeof data === "string" ? (JSON.parse(data) as Record<string, unknown>) : decodeBinary(data)

  if (!raw || typeof raw !== "object") return null
  if (raw.type === "pong") return null // heartbeat, skip

  const id = typeof raw.id === "string" ? raw.id : crypto.randomUUID()
  const seq = typeof raw.seq === "number" ? raw.seq : 0
  const topic = (
    typeof raw.topic === "string" && ["alert", "status", "log"].includes(raw.topic)
      ? raw.topic
      : "alert"
  ) as AlertMessage["topic"]
  const category = typeof raw.category === "string" ? raw.category : "system"
  const level = typeof raw.level === "string" ? (LEVEL_ALIAS[raw.level] ?? "info") : "info"
  const message = typeof raw.message === "string" ? raw.message : JSON.stringify(raw)
  const time = typeof raw.time === "string" ? raw.time : new Date().toLocaleTimeString()

  return { id, seq, topic, category, level, message, time }
}

function decodeBinary(buf: ArrayBuffer): Record<string, unknown> | null {
  try {
    const bytes = new Uint8Array(buf)
    if (bytes.length < 1) return null
    const type = bytes[0]
    if (type === 0x01) {
      // pong
      return { type: "pong" }
    }
    if (type === 0x03 || type === 0x05) {
      // alert data / sync data
      const jsonBytes = bytes.slice(1)
      return JSON.parse(new TextDecoder().decode(jsonBytes)) as Record<string, unknown>
    }
    if (type === 0x04) {
      // sync acknowledgement
      return null
    }
    return null
  } catch {
    return null
  }
}

// ─── Backpressure (outgoing) ──────────────────────────────────────────────

export class BackpressureController {
  private draining = false
  private queue: { data: string; resolve: () => void }[] = []
  private readonly highWater = 1024 * 1024 // 1MB
  private readonly lowWater = 256 * 1024 // 256KB

  send(ws: WebSocket, data: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.draining || ws.bufferedAmount > this.highWater) {
        this.queue.push({ data, resolve })
        if (!this.draining) {
          this.draining = true
          this.drain(ws)
        }
      } else {
        ws.send(data)
        resolve()
      }
    })
  }

  private drain(ws: WebSocket): void {
    const next = () => {
      if (this.queue.length === 0) {
        this.draining = false
        return
      }
      if (ws.readyState !== WebSocket.OPEN) {
        this.queue = []
        this.draining = false
        return
      }
      if (ws.bufferedAmount > this.lowWater) {
        requestAnimationFrame(() => {
          next()
        })
        return
      }
      const item = this.queue.shift()
      if (!item) {
        this.draining = false
        return
      }
      ws.send(item.data)
      item.resolve()
      requestAnimationFrame(() => {
        next()
      })
    }
    next()
  }

  get pending(): number {
    return this.queue.length
  }

  reset(): void {
    const q = this.queue
    this.queue = []
    this.draining = false
    for (const item of q) item.resolve()
  }
}

// ─── Message Batcher (outgoing) ───────────────────────────────────────────

export class MessageBatcher {
  private buffer: string[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly maxDelay = 16
  private readonly maxSize = 1024 * 64
  private flushHandler: ((batch: string[]) => void) | null = null

  onFlush(handler: (batch: string[]) => void): void {
    this.flushHandler = handler
  }

  add(data: string): void {
    this.buffer.push(data)
    if (this.buffer.length === 1) {
      this.timer = setTimeout(() => {
        this.flush()
      }, this.maxDelay)
    }
    const size = this.buffer.reduce((s, d) => s + d.length, 0)
    if (size >= this.maxSize) {
      if (this.timer) clearTimeout(this.timer)
      this.flush()
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return
    const batch = this.buffer.splice(0)
    this.timer = null
    this.flushHandler?.(batch)
  }

  reset(): void {
    if (this.timer) clearTimeout(this.timer)
    this.buffer = []
    this.timer = null
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────

export class HeartbeatController {
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private pongTimer: ReturnType<typeof setTimeout> | null = null
  private readonly pingInterval = 30000
  private readonly pongTimeout = 10000
  private onAlive: ((alive: boolean) => void) | null = null
  private onDead: (() => void) | null = null
  private backpressure: BackpressureController | null = null

  onHeartbeat(alive: (alive: boolean) => void, dead: () => void): void {
    this.onAlive = alive
    this.onDead = dead
  }

  setBackpressure(bp: BackpressureController): void {
    this.backpressure = bp
  }

  start(ws: WebSocket): void {
    this.stop()
    const sendPing = () => {
      if (ws.readyState !== WebSocket.OPEN) return
      this.onAlive?.(false)
      const data = JSON.stringify({ type: "ping" })
      if (this.backpressure) {
        this.backpressure.send(ws, data).catch(() => undefined)
      } else {
        ws.send(data)
      }
      this.pongTimer = setTimeout(() => {
        this.onAlive?.(false)
        this.onDead?.()
        ws.close()
      }, this.pongTimeout)
    }
    sendPing()
    this.pingTimer = setInterval(sendPing, this.pingInterval)
  }

  pongReceived(): void {
    this.onAlive?.(true)
    if (this.pongTimer) {
      clearTimeout(this.pongTimer)
      this.pongTimer = null
    }
  }

  stop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer)
      this.pongTimer = null
    }
  }
}

// ─── Retry (exponential backoff + jitter) ─────────────────────────────────

export function computeDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30000)
  return Math.round(base * (0.8 + Math.random() * 0.4))
}

export const MAX_RETRY = 10

// ─── Fallback transport chain: WebSocket → SSE → Polling ──────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting"

export interface TransportCallbacks {
  onMessage: (msg: AlertMessage) => void
  onStatus: (status: ConnectionStatus) => void
  onRetry: (attempt: number, delay: number) => void
  onHeartbeat: (alive: boolean) => void
  onSyncRequest: (lastSeq: number) => void
}

export interface Transport {
  connect: () => void
  disconnect: () => void
  getType: () => string
  isConnected: () => boolean
  setCallbacks: (cbs: TransportCallbacks) => void
}

// ─── WebSocket Transport ──────────────────────────────────────────────────

export class WebSocketTransport implements Transport {
  private ws: WebSocket | null = null
  private url: string
  private callbacks: TransportCallbacks | null = null
  private heartbeat = new HeartbeatController()
  private backpressure = new BackpressureController()
  private connected = false

  constructor(url: string) {
    this.url = url
  }

  setCallbacks(cbs: TransportCallbacks): void {
    this.callbacks = cbs
    this.heartbeat.onHeartbeat(
      (alive) => {
        cbs.onHeartbeat(alive)
      },
      () => this.ws?.close(),
    )
    this.heartbeat.setBackpressure(this.backpressure)
  }

  getType(): string {
    return "WebSocket"
  }

  isConnected(): boolean {
    return this.connected
  }

  connect(): void {
    this.ws?.close()
    this.backpressure.reset()

    const ws = new WebSocket(this.url)
    ws.binaryType = "arraybuffer"

    ws.onopen = () => {
      this.connected = true
      this.callbacks?.onStatus("connected")
      this.callbacks?.onRetry(0, 0)
      this.heartbeat.start(ws)
    }

    ws.onmessage = (e: MessageEvent<string | ArrayBuffer>) => {
      try {
        const msg = parseMessage(e.data)
        if (!msg) {
          if (typeof e.data === "string") {
            try {
              const parsed = JSON.parse(e.data) as Record<string, unknown>
              if (parsed.type === "pong") {
                this.heartbeat.pongReceived()
              }
            } catch {
              /* ignore */
            }
          }
          return
        }
        this.callbacks?.onMessage(msg)
      } catch {
        /* ignore parse errors */
      }
    }

    ws.onclose = () => {
      this.connected = false
      this.heartbeat.stop()
      this.callbacks?.onStatus("disconnected")
    }

    ws.onerror = () => {
      ws.close()
    }

    this.ws = ws
  }

  disconnect(): void {
    this.connected = false
    this.heartbeat.stop()
    this.backpressure.reset()
    this.ws?.close(1000)
    this.ws = null
  }
}

// ─── SSE Transport (fallback 1) ────────────────────────────────────────────

export class SSETransport implements Transport {
  private es: EventSource | null = null
  private url: string
  private callbacks: TransportCallbacks | null = null
  private connected = false

  constructor(url: string) {
    this.url = url
  }

  setCallbacks(cbs: TransportCallbacks): void {
    this.callbacks = cbs
  }

  getType(): string {
    return "SSE"
  }

  isConnected(): boolean {
    return this.connected
  }

  connect(): void {
    this.es?.close()

    const es = new EventSource(this.url)
    es.onopen = () => {
      this.connected = true
      this.callbacks?.onStatus("connected")
      this.callbacks?.onRetry(0, 0)
      this.callbacks?.onHeartbeat(true)
    }

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const msg = parseMessage(e.data)
        if (msg) this.callbacks?.onMessage(msg)
      } catch {
        /* ignore */
      }
    }

    es.onerror = () => {
      this.connected = false
      this.callbacks?.onStatus("disconnected")
    }

    this.es = es
  }

  disconnect(): void {
    this.connected = false
    this.es?.close()
    this.es = null
  }
}

// ─── Polling Transport (fallback 2) ────────────────────────────────────────

export class PollingTransport implements Transport {
  private url: string
  private callbacks: TransportCallbacks | null = null
  private abortController: AbortController | null = null
  private connected = false
  private polling = false
  private lastSeq = 0

  constructor(url: string) {
    this.url = url
  }

  setCallbacks(cbs: TransportCallbacks): void {
    this.callbacks = cbs
  }

  getType(): string {
    return "Polling"
  }

  isConnected(): boolean {
    return this.connected
  }

  connect(): void {
    this.disconnect()
    this.connected = true
    this.polling = true
    this.callbacks?.onStatus("connected")
    this.callbacks?.onHeartbeat(true)
    void this.poll()
  }

  private async poll(): Promise<void> {
    while (this.polling) {
      this.abortController = new AbortController()
      try {
        const res = await fetch(`${this.url}&seq=${String(this.lastSeq)}`, {
          signal: this.abortController.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        const data = (await res.json()) as Record<string, unknown>[]
        for (const raw of data) {
          const msg = parseMessage(JSON.stringify(raw))
          if (msg) {
            this.lastSeq = msg.seq
            this.callbacks?.onMessage(msg)
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") break
        this.callbacks?.onStatus("reconnecting")
        await new Promise((r) => setTimeout(r, 3000))
        this.callbacks?.onStatus("connected")
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  disconnect(): void {
    this.polling = false
    this.connected = false
    this.abortController?.abort()
    this.abortController = null
  }
}

// ─── Reconnecting Transport (fallback chain) ──────────────────────────────

export class ReconnectingTransport {
  private transports: Transport[] = []
  private activeIndex = 0
  private preferredIndex = 0
  private active: Transport | null = null
  private callbacks: TransportCallbacks | null = null
  private retryCount = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private manualStop = false
  private disconnectTime = 0
  private onFallback: ((type: string) => void) | null = null
  private logInterruption: ((downtimeMs: number) => void) | null = null

  constructor(baseUrl: string) {
    const httpUrl = baseUrl
      .replace(/^ws(s?):\/\//, "http$1://")
      .replace("/ws/alerts", "/api/alerts")
    this.transports = [
      new WebSocketTransport(baseUrl),
      new SSETransport(`${httpUrl}&transport=sse`),
      new PollingTransport(`${httpUrl}&transport=poll`),
    ]
  }

  setCallbacks(cbs: TransportCallbacks): void {
    this.callbacks = cbs
    for (const t of this.transports) t.setCallbacks(cbs)
  }

  onFallbackChange(cb: (type: string) => void): void {
    this.onFallback = cb
  }

  onInterruptionLogged(cb: (downtimeMs: number) => void): void {
    this.logInterruption = cb
  }

  connect(): void {
    this.manualStop = false
    this.retryCount = 0
    this.activeIndex = this.preferredIndex
    this.tryActive()
  }

  disconnect(): void {
    this.manualStop = true
    this.clearTimers()
    this.active?.disconnect()
    this.active = null
  }

  getActiveType(): string {
    return this.active?.getType() ?? "none"
  }

  isConnected(): boolean {
    return this.active?.isConnected() ?? false
  }

  forceTransport(index: number): void {
    if (index < 0 || index >= this.transports.length) return
    this.preferredIndex = index
    const old = this.active
    if (old && this.callbacks) {
      old.setCallbacks(this.callbacks)
    }
    old?.disconnect()
    this.clearTimers()
    this.retryCount = 0
    this.disconnectTime = 0
    this.manualStop = false
    this.activeIndex = index
    this.callbacks?.onStatus("connecting")
    this.tryActive()
  }

  getTransportCount(): number {
    return this.transports.length
  }

  private tryActive(): void {
    this.clearTimers()

    if (this.activeIndex >= this.transports.length) {
      this.active = null
      this.callbacks?.onStatus("disconnected")
      return
    }

    const transport = this.transports[this.activeIndex]
    this.active = transport
    this.onFallback?.(transport.getType())

    const cbs = this.callbacks
    if (!cbs) return
    transport.setCallbacks({
      ...cbs,
      onStatus: (status) => {
        if (status === "connected") {
          this.retryCount = 0
          this.disconnectTime = 0
          this.callbacks?.onStatus("connected")
        } else if (status === "disconnected") {
          if (this.manualStop) {
            this.callbacks?.onStatus("disconnected")
            return
          }
          if (this.activeIndex === 0) {
            // WebSocket: retry with backoff
            if (this.retryCount < MAX_RETRY) {
              const delay = computeDelay(this.retryCount)
              this.retryCount++
              if (this.disconnectTime === 0) this.disconnectTime = Date.now()
              this.callbacks?.onStatus("reconnecting")
              this.callbacks?.onRetry(this.retryCount, delay)
              this.retryTimer = setTimeout(() => {
                this.tryActive()
              }, delay)
            } else {
              this.retryCount = 0
              this.logInterruption?.(this.disconnectTime > 0 ? Date.now() - this.disconnectTime : 0)
              this.activeIndex++ // fallback to SSE
              this.retryTimer = setTimeout(() => {
                this.tryActive()
              }, 100)
            }
          } else {
            // SSE/Polling: fallback to next transport
            this.activeIndex++
            this.retryTimer = setTimeout(() => {
              this.tryActive()
            }, 100)
          }
        } else {
          this.callbacks?.onStatus(status)
        }
      },
    })

    transport.connect()
  }

  private clearTimers(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }
}
