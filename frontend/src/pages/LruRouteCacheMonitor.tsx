import { ReloadOutlined, SearchOutlined } from "@ant-design/icons"
import type { TableColumnsType } from "antd"
import { Badge, Button, Input, Select, Spin, Table, Tag, Typography } from "antd"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useLruCacheStore } from "../stores/lruRouteStore.ts"

const { Text } = Typography

interface ServiceRow {
  id: number
  name: string
  status: string
  region: string
  qps: number
  p99: number
}

export default function MonitorPage({
  pageKey,
  isActive,
}: {
  pageKey: string
  isActive: boolean
}) {
  const { pages, staleKeys, updateData, setLoading, setScrollTop, updateFormValue, clearStale } =
    useLruCacheStore()
  const page = pages[pageKey]
  const containerRef = useRef<HTMLDivElement>(null)
  const dataLoadedRef = useRef(false)
  const isStale = staleKeys.includes(pageKey)

  const searchText = (page.formValues.search as string | undefined) ?? ""
  const statusFilter = (page.formValues.status as string | undefined) ?? "all"
  const regionFilter = (page.formValues.region as string | undefined) ?? "all"

  const updateForm = useCallback(
    (path: string, value: unknown) => {
      updateFormValue(pageKey, path, value)
    },
    [pageKey, updateFormValue],
  )

  const fetchServices = useCallback(() => {
    setLoading(pageKey, true)
    clearStale(pageKey)
    fetch("/api/services")
      .then((res) => res.json())
      .then((json) => {
        updateData(pageKey, json)
      })
  }, [pageKey, setLoading, updateData, clearStale])

  useEffect(() => {
    if (dataLoadedRef.current && page.data) return
    dataLoadedRef.current = true
    fetchServices()
  }, [pageKey, page.data, fetchServices])

  useEffect(() => {
    if (!isActive) return

    const isTtlExpired = page.loadedAt != null && Date.now() - page.loadedAt > 30000
    if (isStale || isTtlExpired) {
      if (isTtlExpired) clearStale(pageKey)
      fetchServices()
    }
  }, [isActive, isStale, pageKey, page.loadedAt, fetchServices, clearStale])

  const services = (page.data?.services as ServiceRow[]) ?? []

  const filtered = useMemo(() => {
    let list = services
    if (searchText) {
      list = list.filter((s) => s.name.includes(searchText))
    }
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter)
    }
    if (regionFilter !== "all") {
      list = list.filter((s) => s.region === regionFilter)
    }
    return list
  }, [services, searchText, statusFilter, regionFilter])

  const columns: TableColumnsType<ServiceRow> = [
    { title: "服务名", dataIndex: "name", key: "name", width: 140 },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => {
        const m: Record<string, { color: string; text: string }> = {
          healthy: { color: "green", text: "健康" },
          warning: { color: "orange", text: "告警" },
          critical: { color: "red", text: "故障" },
        }
        return <Tag color={m[v].color}>{m[v].text}</Tag>
      },
    },
    { title: "区域", dataIndex: "region", key: "region", width: 80 },
    { title: "QPS", dataIndex: "qps", key: "qps", width: 80, sorter: (a, b) => a.qps - b.qps },
    { title: "P99 (ms)", dataIndex: "p99", key: "p99", width: 90, sorter: (a, b) => a.p99 - b.p99 },
  ]

  const handleRefresh = useCallback(() => {
    fetchServices()
  }, [fetchServices])

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
          placeholder="搜索服务名..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => {
            updateForm("search", e.target.value)
          }}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={(v) => {
            updateForm("status", v)
          }}
          style={{ width: 110 }}
          options={[
            { label: "全部状态", value: "all" },
            { label: "健康", value: "healthy" },
            { label: "告警", value: "warning" },
            { label: "故障", value: "critical" },
          ]}
        />
        <Select
          value={regionFilter}
          onChange={(v) => {
            updateForm("region", v)
          }}
          style={{ width: 110 }}
          options={[
            { label: "全部区域", value: "all" },
            { label: "华北", value: "华北" },
            { label: "华东", value: "华东" },
            { label: "华南", value: "华南" },
            { label: "西南", value: "西南" },
            { label: "西北", value: "西北" },
          ]}
        />
        <Badge count={filtered.length} size="small" offset={[4, -4]}>
          <Text type="secondary">共 {String(filtered.length)} 条</Text>
        </Badge>
        <div style={{ marginLeft: "auto" }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </div>
      </div>
      {page.loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin description="加载服务列表..." />
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{ maxHeight: 360, overflow: "auto" }}
        >
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 500 }}
          />
        </div>
      )}
    </div>
  )
}
