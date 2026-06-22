import {
  CheckCircleOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons"
import { Button, Card, Space, Table, Tag, Tooltip, Typography } from "antd"
import {
  Component,
  type ComponentType,
  type ReactNode,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { RequestRecord, RequestStatus } from "../stores/requestLoadingStore.ts"
import { useRequestLoadingStore } from "../stores/requestLoadingStore.ts"
import { createRequestResource, type RequestResource } from "../utils/requestResource.ts"

const { Text } = Typography

interface RequestItem {
  method: string
  path: string
  key: string
}

const REQUEST_LIST: RequestItem[] = [
  { method: "GET", path: "/api/users", key: "GET /api/users" },
  { method: "POST", path: "/api/users", key: "POST /api/users" },
  { method: "DELETE", path: "/api/users/1", key: "DELETE /api/users/1" },
  { method: "PUT", path: "/api/users/1", key: "PUT /api/users/1" },
  { method: "GET", path: "/api/reports", key: "GET /api/reports" },
  { method: "POST", path: "/api/export", key: "POST /api/export" },
]

const METHOD_COLOR: Record<string, string> = {
  GET: "green",
  POST: "blue",
  PUT: "orange",
  DELETE: "red",
}

const STATUS_CONFIG: Record<RequestStatus, { color: string; icon: ReactNode; label: string }> = {
  pending: { color: "processing", icon: <span />, label: "请求中" },
  resolved: { color: "success", icon: <CheckCircleOutlined />, label: "完成" },
  rejected: { color: "error", icon: <CloseCircleOutlined />, label: "失败" },
  cancelled: { color: "default", icon: <MinusCircleOutlined />, label: "已取消" },
}

const RESOURCE_DELAYS: Record<string, { delay: number; failRate: number }> = {
  "GET /api/users": { delay: 1500, failRate: 0 },
  "POST /api/users": { delay: 2000, failRate: 0.3 },
  "DELETE /api/users/1": { delay: 1000, failRate: 0 },
  "PUT /api/users/1": { delay: 2500, failRate: 0.1 },
  "GET /api/reports": { delay: 3000, failRate: 0 },
  "POST /api/export": { delay: 4000, failRate: 0.2 },
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function RequestResult({ resource }: { resource: RequestResource }) {
  const raw = use(resource.promise) as { success: boolean; data: unknown }
  return (
    <Card
      size="small"
      title={
        <Space>
          <Tag color={METHOD_COLOR[resource.method] ?? "default"} style={{ margin: 0 }}>
            {resource.method}
          </Tag>
          <Text code style={{ fontSize: 12 }}>
            {resource.path}
          </Text>
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
            完成
          </Tag>
        </Space>
      }
    >
      <pre
        style={{
          margin: 0,
          fontSize: 12,
          fontFamily: "'Courier New', monospace",
          maxHeight: 200,
          overflow: "auto",
          background: "#f6f8fa",
          padding: "8px 12px",
          borderRadius: 6,
        }}
      >
        {JSON.stringify(raw.data, null, 2)}
      </pre>
    </Card>
  )
}

function RequestError({ error }: { error: Error }) {
  return (
    <Card size="small" style={{ borderColor: "#ff4d4f" }}>
      <Space>
        <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
        <Text type="danger">{error.message}</Text>
      </Space>
    </Card>
  )
}

function LoadingFallback({ resource }: { resource: RequestResource }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(performance.now() - resource.startTime)
    }, 100)
    return () => {
      clearInterval(id)
    }
  }, [resource.startTime])

  return (
    <Space orientation="vertical" style={{ width: "100%", padding: "8px 0" }}>
      <Space>
        <Tag color={METHOD_COLOR[resource.method] ?? "default"}>{resource.method}</Tag>
        <Text code style={{ fontSize: 12 }}>
          {resource.path}
        </Text>
        <Tag color="processing" style={{ fontSize: 11 }}>
          请求中
        </Tag>
      </Space>
      <Space style={{ fontSize: 13 }}>
        <Text type="secondary">已耗时: {formatDuration(elapsed)}</Text>
        <Text type="secondary">/</Text>
        <Text type="secondary">目标: {formatDuration(resource.delay)}</Text>
      </Space>
    </Space>
  )
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ComponentType<{ error: Error }> },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback: ComponentType<{ error: Error }> }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback
      return <Fallback error={this.state.error} />
    }
    return this.props.children
  }
}

function RequestCard({ resource }: { resource: RequestResource }) {
  return (
    <ErrorBoundary fallback={RequestError}>
      <Suspense fallback={<LoadingFallback resource={resource} />}>
        <RequestResult resource={resource} />
      </Suspense>
    </ErrorBoundary>
  )
}

export default function RequestLoading() {
  const { requests, addRequest, recordCancelled, removeRequest, clearCompleted } =
    useRequestLoadingStore()
  const [, setNow] = useState(Date.now())
  const resourcesRef = useRef<Map<string, RequestResource>>(new Map())

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, 200)
    return () => {
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const allPending = new Set(requests.filter((r) => r.status === "pending").map((r) => r.key))
    for (const [key] of resourcesRef.current) {
      if (!allPending.has(key)) resourcesRef.current.delete(key)
    }
  }, [requests])

  const handleStart = useCallback(
    (item: RequestItem) => {
      const existing = resourcesRef.current.get(item.key)
      if (existing) existing.abort()

      const resource = createRequestResource(item.key, item.method, item.path)
      resourcesRef.current.set(item.key, resource)

      addRequest({
        key: item.key,
        method: item.method,
        path: item.path,
        delay: resource.delay,
        startTime: resource.startTime,
        duration: null,
        status: "pending",
        error: null,
      })

      const { recordResolved: rr, recordRejected: rj } = useRequestLoadingStore.getState()
      resource.promise.then(
        () => {
          rr(item.key)
        },
        (err: unknown) => {
          const e = err as Error
          if (e.name === "CanceledError" || e.name === "AbortError") return
          rj(item.key, e.message)
        },
      )
    },
    [addRequest],
  )

  const handleBatch = useCallback(() => {
    for (const item of REQUEST_LIST) handleStart(item)
  }, [handleStart])

  const handleCancel = useCallback(
    (key: string) => {
      const r = resourcesRef.current.get(key)
      if (r) {
        r.abort()
        resourcesRef.current.delete(key)
      }
      recordCancelled(key)
    },
    [recordCancelled],
  )

  const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests])
  const completed = useMemo(() => requests.filter((r) => r.status !== "pending"), [requests])

  const historyColumns = useMemo(
    () => [
      {
        title: "方法",
        dataIndex: "method",
        key: "method",
        width: 80,
        render: (method: string) => (
          <Tag color={METHOD_COLOR[method] ?? "default"} style={{ margin: 0 }}>
            {method}
          </Tag>
        ),
      },
      {
        title: "路径",
        dataIndex: "path",
        key: "path",
        width: 200,
        render: (path: string) => <Text code>{path}</Text>,
      },
      {
        title: "耗时",
        dataIndex: "duration",
        key: "duration",
        width: 100,
        render: (d: number | null) =>
          d != null ? (
            <Tag color={d < 2000 ? "green" : d < 4000 ? "orange" : "red"}>
              {formatDuration(d)}
            </Tag>
          ) : (
            "-"
          ),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 80,
        render: (status: RequestStatus) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <Tag color={cfg.color} icon={status !== "pending" ? cfg.icon : undefined}>
              {cfg.label}
            </Tag>
          )
        },
      },
      {
        title: "错误信息",
        dataIndex: "error",
        key: "error",
        render: (error: string | null) =>
          error ? (
            <Text type="danger" style={{ fontSize: 12 }}>
              {error}
            </Text>
          ) : (
            "-"
          ),
      },
      {
        title: "操作",
        key: "action",
        width: 80,
        render: (_: unknown, rec: RequestRecord) => (
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={() => {
              removeRequest(rec.key)
            }}
          >
            清除
          </Button>
        ),
      },
    ],
    [removeRequest],
  )

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card
          title={
            <Space>
              <span>Signal 驱动请求管理</span>
              <Tag>{String(requests.length)} 条</Tag>
              <Tag color="processing">{String(pending.length)} 活跃</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button size="small" icon={<ClearOutlined />} onClick={clearCompleted}>
                清除已完成
              </Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleBatch}>
                全部请求
              </Button>
            </Space>
          }
        >
          <Space wrap>
            {REQUEST_LIST.map((item) => {
              const meta = RESOURCE_DELAYS[item.key]
              return (
                <Tooltip
                  key={item.key}
                  title={`延迟 ${formatDuration(meta.delay)} · 失败率 ${(meta.failRate * 100).toFixed(0)}%`}
                >
                  <Button
                    type="primary"
                    loading={pending.some((r) => r.key === item.key)}
                    onClick={() => {
                      handleStart(item)
                    }}
                  >
                    {item.method} {item.path}
                  </Button>
                </Tooltip>
              )
            })}
          </Space>
        </Card>

        {pending.length > 0 && (
          <Card
            size="small"
            title={
              <Space>
                <Text strong>活跃请求 (Suspense + use())</Text>
                <Tag color="processing">{String(pending.length)}</Tag>
              </Space>
            }
          >
            <Space orientation="vertical" style={{ width: "100%", padding: 0 }}>
              {pending.map((rec) => {
                const resource = resourcesRef.current.get(rec.key)
                if (!resource) return null
                return (
                  <Card
                    key={rec.key}
                    size="small"
                    style={{ borderColor: "#1677ff" }}
                    extra={
                      <Button
                        size="small"
                        danger
                        icon={<StopOutlined />}
                        onClick={() => {
                          handleCancel(rec.key)
                        }}
                      >
                        取消
                      </Button>
                    }
                  >
                    <RequestCard resource={resource} />
                  </Card>
                )
              })}
            </Space>
          </Card>
        )}

        {completed.length > 0 && (
          <Card
            size="small"
            title={
              <Space>
                <Text strong>请求历史</Text>
                <Tag>{String(completed.length)}</Tag>
              </Space>
            }
          >
            <Table
              dataSource={completed}
              columns={historyColumns}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>
        )}

        {requests.length === 0 && (
          <Card>
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              暂无请求 — 点击上方按钮发起真实网络请求
            </div>
          </Card>
        )}
      </Space>
    </div>
  )
}
