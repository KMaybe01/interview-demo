import { ReloadOutlined, SearchOutlined } from "@ant-design/icons"
import { Button, Input, Select, Spin, Tag, Typography } from "antd"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useLruCacheStore } from "../stores/lruRouteStore.ts"

const { Text } = Typography

interface LogEntry {
  id: number
  level: string
  time: string
  source: string
  message: string
}

const levelColor: Record<string, string> = {
  INFO: "#52c41a",
  WARN: "#faad14",
  ERROR: "#f5222d",
  DEBUG: "#1677ff",
}

export default function LogsPage({ pageKey, isActive }: { pageKey: string; isActive: boolean }) {
  const { pages, staleKeys, updateData, setLoading, setScrollTop, updateFormValue, clearStale } =
    useLruCacheStore()
  const page = pages[pageKey]
  const containerRef = useRef<HTMLDivElement>(null)
  const dataLoadedRef = useRef(false)
  const isStale = staleKeys.includes(pageKey)

  const searchQuery: string = (page.formValues.query as string | undefined) ?? ""
  const logLevelFilter: string = (page.formValues.logLevel as string | undefined) ?? "all"

  const updateForm = useCallback(
    (path: string, value: unknown) => {
      updateFormValue(pageKey, path, value)
    },
    [pageKey, updateFormValue],
  )

  const fetchLogs = useCallback(() => {
    setLoading(pageKey, true)
    clearStale(pageKey)
    void fetch("/api/logs")
      .then((res) => res.json())
      .then((json) => {
        updateData(pageKey, json as Record<string, unknown>)
      })
  }, [pageKey, setLoading, updateData, clearStale])

  useEffect(() => {
    if (dataLoadedRef.current && page.data) return
    dataLoadedRef.current = true
    fetchLogs()
  }, [pageKey, page.data, fetchLogs])

  useEffect(() => {
    if (!isActive) return

    const isTtlExpired = page.loadedAt != null && Date.now() - page.loadedAt > 30000
    if (isStale || isTtlExpired) {
      if (isTtlExpired) clearStale(pageKey)
      fetchLogs()
    }
  }, [isActive, isStale, pageKey, page.loadedAt, fetchLogs, clearStale])

  const logs = (page.data?.logs ?? []) as LogEntry[]

  const filtered = useMemo(() => {
    let list = logs
    if (searchQuery !== "") {
      list = list.filter((l) => l.message.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (logLevelFilter !== "all") {
      list = list.filter((l) => l.level === logLevelFilter)
    }
    return list
  }, [logs, searchQuery, logLevelFilter])

  const handleRefresh = useCallback(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (el) {
      setScrollTop(pageKey, el.scrollTop)
    }
  }, [pageKey, setScrollTop])

  useEffect(() => {
    if (containerRef.current && page.scrollTop) {
      containerRef.current.scrollTop = page.scrollTop
    }
  }, [page.scrollTop])

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 12,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Input
          placeholder="搜索日志关键词..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => {
            updateForm("query", e.target.value)
          }}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          value={logLevelFilter}
          onChange={(v) => {
            updateForm("logLevel", v)
          }}
          style={{ width: 110 }}
          options={[
            { label: "全部级别", value: "all" },
            { label: "INFO", value: "INFO" },
            { label: "WARN", value: "WARN" },
            { label: "ERROR", value: "ERROR" },
            { label: "DEBUG", value: "DEBUG" },
          ]}
        />
        <Text type="secondary">共 {String(filtered.length)} 条</Text>
        <div style={{ marginLeft: "auto" }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </div>
      </div>
      {page.loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin description="加载日志..." />
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            maxHeight: 360,
            overflow: "auto",
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: 8,
            borderRadius: 6,
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          {filtered.length === 0 && <Text style={{ color: "#888" }}>无匹配日志</Text>}
          {filtered.map((l) => (
            <div key={l.id} style={{ padding: "2px 0", display: "flex", gap: 8 }}>
              <Tag color={levelColor[l.level]} style={{ margin: 0, fontSize: 10 }}>
                {l.level}
              </Tag>
              <span style={{ color: "#888", minWidth: 80 }}>{l.time}</span>
              <span style={{ color: "#569cd6", minWidth: 100 }}>{l.source}</span>
              <span>{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
