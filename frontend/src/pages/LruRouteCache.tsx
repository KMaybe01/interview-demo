import { CloseOutlined, ReloadOutlined, SaveOutlined, SearchOutlined } from "@ant-design/icons"
import type { TableColumnsType } from "antd"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  InputNumber,
  notification,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd"
import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useLruCacheStore } from "../stores/lruRouteStore.ts"

const { Text } = Typography

const PAGE_CONFIGS = [
  { key: "monitor", label: "业务监控", color: "blue" },
  { key: "config", label: "配置管理", color: "green" },
  { key: "logs", label: "日志查询", color: "purple" },
]

const COLORS = ["#1677ff", "#52c41a", "#722ed1"]

interface ServiceRow {
  id: number
  name: string
  status: string
  region: string
  qps: number
  p99: number
}

function MonitorPage({ pageKey, isActive }: { pageKey: string; isActive: boolean }) {
  const { pages, staleKeys, updateData, setLoading, setScrollTop, updateFormValue, clearStale } =
    useLruCacheStore()
  const page = pages[pageKey]
  const containerRef = useRef<HTMLDivElement>(null)
  const dataLoadedRef = useRef(false)
  const activeRef = useRef(false)
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

  const allData = useMemo(() => {
    const regions = ["华北", "华东", "华南", "西南", "西北"]
    const statuses = ["healthy", "warning", "critical"]
    return Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `service-${String(i + 1).padStart(3, "0")}`,
      status: statuses[i % 3],
      region: regions[i % 5],
      qps: Math.round(Math.random() * 5000 + 500),
      p99: Math.round(Math.random() * 200 + 10),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  useEffect(() => {
    if (dataLoadedRef.current && page.data) return
    dataLoadedRef.current = true
    setLoading(pageKey, true)
    const timer = setTimeout(() => {
      updateData(pageKey, { services: allData })
      clearStale(pageKey)
    }, 800)
    return () => {
      clearTimeout(timer)
    }
  }, [pageKey, setLoading, updateData, allData, page.data, clearStale])

  useEffect(() => {
    if ((activeRef.current || isStale) && isActive) {
      setLoading(pageKey, true)
      const timer = setTimeout(() => {
        updateData(pageKey, { services: allData })
        clearStale(pageKey)
      }, 600)
      return () => {
        clearTimeout(timer)
      }
    }
    activeRef.current = isActive
  }, [isActive, isStale, pageKey, setLoading, updateData, allData, clearStale])

  const filtered = useMemo(() => {
    let list = allData
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
  }, [allData, searchText, statusFilter, regionFilter])

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
      <Space style={{ marginBottom: 12 }} wrap>
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
      </Space>
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

function ConfigPage({ pageKey, isActive }: { pageKey: string; isActive: boolean }) {
  const { pages, staleKeys, updateData, setLoading, updateFormValue, invalidateAll } =
    useLruCacheStore()
  const page = pages[pageKey]
  const dataLoadedRef = useRef(false)
  const activeRef = useRef(false)
  const savedRef = useRef(false)
  const isStale = staleKeys.includes(pageKey)

  const formValues = page.formValues

  const mockConfig = useCallback(() => {
    const ts = Date.now()
    return {
      config: {
        clusterName: `prod-cluster-${String(ts).slice(-4)}`,
        replicas: 3 + (ts % 5),
        enableTls: ts % 2 === 0,
        logLevel: ["debug", "info", "warn", "error"][ts % 4],
      },
    }
  }, [])

  useEffect(() => {
    if (dataLoadedRef.current && page.data) return
    dataLoadedRef.current = true
    setLoading(pageKey, true)
    const timer = setTimeout(() => {
      const cfg = mockConfig()
      updateData(pageKey, cfg)
      updateFormValue(pageKey, "clusterName", cfg.config.clusterName)
      updateFormValue(pageKey, "replicas", cfg.config.replicas)
      updateFormValue(pageKey, "enableTls", cfg.config.enableTls)
      updateFormValue(pageKey, "logLevel", cfg.config.logLevel)
      updateFormValue(pageKey, "alertEmail", "ops@company.com")
    }, 600)
    return () => {
      clearTimeout(timer)
    }
  }, [pageKey, setLoading, updateData, updateFormValue, page.data, mockConfig])

  useEffect(() => {
    savedRef.current = false
    if (dataLoadedRef.current && dataLoadedRef.current && isActive) {
      setLoading(pageKey, true)
      const timer = setTimeout(() => {
        const cfg = mockConfig()
        updateData(pageKey, cfg)
        updateFormValue(pageKey, "clusterName", cfg.config.clusterName)
        updateFormValue(pageKey, "replicas", cfg.config.replicas)
        updateFormValue(pageKey, "enableTls", cfg.config.enableTls)
        updateFormValue(pageKey, "logLevel", cfg.config.logLevel)
      }, 500)
      return () => {
        clearTimeout(timer)
      }
    }
    activeRef.current = isActive
  }, [isActive, isStale, pageKey, setLoading, updateData, updateFormValue, mockConfig])

  const setField = useCallback(
    (path: string, value: unknown) => {
      updateFormValue(pageKey, path, value)
    },
    [pageKey, updateFormValue],
  )

  const handleSave = useCallback(() => {
    savedRef.current = true
    const config = {
      clusterName: formValues.clusterName,
      replicas: formValues.replicas,
      enableTls: formValues.enableTls,
      logLevel: formValues.logLevel,
    }
    updateData(pageKey, { config })
    invalidateAll(pageKey)
    notification.success({
      message: "配置已保存",
      description: "相关页面缓存数据已标记为过期，切换时将自动刷新",
      placement: "topRight",
      duration: 3,
    })
  }, [pageKey, formValues, updateData, invalidateAll])

  return (
    <Spin spinning={page.loading} description="加载配置...">
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>集群名称</Text>
            <Input
              value={(formValues.clusterName ?? "") as string}
              onChange={(e) => {
                setField("clusterName", e.target.value)
              }}
              placeholder="集群名称"
              style={{ marginTop: 4 }}
            />
          </Col>
          <Col span={12}>
            <Text strong>副本数</Text>
            <InputNumber
              value={formValues.replicas as number}
              onChange={(v) => {
                if (v != null) setField("replicas", v)
              }}
              min={1}
              max={20}
              style={{ width: "100%", marginTop: 4 }}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Checkbox
              checked={!!formValues.enableTls}
              onChange={(e) => {
                setField("enableTls", e.target.checked)
              }}
            >
              启用 TLS
            </Checkbox>
          </Col>
          <Col span={12}>
            <Text strong>日志级别</Text>
            <Select
              value={(formValues.logLevel ?? "info") as string}
              onChange={(v) => {
                setField("logLevel", v)
              }}
              style={{ width: "100%", marginTop: 4 }}
              options={[
                { label: "DEBUG", value: "debug" },
                { label: "INFO", value: "info" },
                { label: "WARN", value: "warn" },
                { label: "ERROR", value: "error" },
              ]}
            />
          </Col>
        </Row>
        <div>
          <Text strong>告警邮箱</Text>
          <Input
            value={(formValues.alertEmail ?? "") as string}
            onChange={(e) => {
              setField("alertEmail", e.target.value)
            }}
            placeholder="ops@company.com"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存配置
          </Button>
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            保存后将失效其他页面的缓存数据，返回时自动刷新
          </Text>
        </div>
      </Space>
    </Spin>
  )
}

function LogsPage({ pageKey, isActive }: { pageKey: string; isActive: boolean }) {
  const { pages, staleKeys, updateData, setLoading, setScrollTop, updateFormValue, clearStale } =
    useLruCacheStore()
  const page = pages[pageKey]
  const containerRef = useRef<HTMLDivElement>(null)
  const dataLoadedRef = useRef(false)
  const activeRef = useRef(false)
  const isStale = staleKeys.includes(pageKey)

  const searchQuery: string = (page.formValues.query as string | undefined) ?? ""
  const logLevelFilter: string = (page.formValues.logLevel as string | undefined) ?? "all"

  const updateForm = useCallback(
    (path: string, value: unknown) => {
      updateFormValue(pageKey, path, value)
    },
    [pageKey, updateFormValue],
  )

  const allLogs = useMemo(() => {
    const levels = ["INFO", "WARN", "ERROR", "DEBUG"]
    const sources = ["api-gateway", "user-svc", "order-svc", "payment-svc", "cache-svc"]
    return Array.from({ length: 200 }, (_, i) => {
      const lvl = levels[i % 4]
      return {
        id: i + 1,
        level: lvl,
        time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
        source: sources[i % 5],
        message: `[${lvl}] request processed in ${String(Math.round(Math.random() * 100))}ms — trace-${String(i + 1).padStart(6, "0")}`,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  useEffect(() => {
    if (dataLoadedRef.current && page.data) return
    dataLoadedRef.current = true
    setLoading(pageKey, true)
    const timer = setTimeout(() => {
      updateData(pageKey, { logs: allLogs })
      clearStale(pageKey)
    }, 1000)
    return () => {
      clearTimeout(timer)
    }
  }, [pageKey, setLoading, updateData, allLogs, page.data, clearStale])

  useEffect(() => {
    if ((activeRef.current || isStale) && isActive) {
      setLoading(pageKey, true)
      const timer = setTimeout(() => {
        updateData(pageKey, { logs: allLogs })
        clearStale(pageKey)
      }, 800)
      return () => {
        clearTimeout(timer)
      }
    }
    activeRef.current = isActive
  }, [isActive, isStale, pageKey, setLoading, updateData, allLogs, clearStale])

  const filtered = useMemo(() => {
    let list = allLogs
    if (searchQuery !== "") {
      list = list.filter((l) => l.message.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (logLevelFilter !== "all") {
      list = list.filter((l) => l.level === logLevelFilter)
    }
    return list
  }, [allLogs, searchQuery, logLevelFilter])

  const levelColor: Record<string, string> = {
    INFO: "#52c41a",
    WARN: "#faad14",
    ERROR: "#f5222d",
    DEBUG: "#1677ff",
  }

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
      <Space style={{ marginBottom: 12 }} wrap>
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
      </Space>
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

const PAGE_COMPONENTS: Record<
  string,
  (props: { pageKey: string; isActive: boolean }) => ReactElement
> = {
  monitor: MonitorPage,
  config: ConfigPage,
  logs: LogsPage,
}

export default function LruRouteCache() {
  const {
    pages,
    order,
    activePage,
    maxPages,
    staleKeys,
    evictedPage,
    setActive,
    initPage,
    closePage,
    clearEvicted,
  } = useLruCacheStore()

  const handleTabClick = useCallback(
    (key: string) => {
      if (!(key in pages)) {
        initPage(key)
      }
      setActive(key)
    },
    [pages, initPage, setActive],
  )

  const handleReset = useCallback(() => {
    for (const key of order) {
      closePage(key)
    }
  }, [order, closePage])

  useEffect(() => {
    if (evictedPage) {
      notification.warning({
        message: `页面已淘汰`,
        description: `"${PAGE_CONFIGS.find((p) => p.key === evictedPage)?.label ?? evictedPage}" 已被 LRU 淘汰，打开后将重新加载数据`,
        placement: "topRight",
        duration: 3,
      })
      clearEvicted()
    }
  }, [evictedPage, clearEvicted])

  const openPageKeys = Object.keys(pages)

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Text strong>LRU 路由缓存</Text>
          <Tag color="blue">容量: {String(maxPages)}</Tag>
          <Tag>
            {String(openPageKeys.length)} / {String(maxPages)} 已打开
          </Tag>
        </Space>
        <Space>
          {PAGE_CONFIGS.map((cfg, i) => (
            <Badge
              key={cfg.key}
              count={staleKeys.includes(cfg.key) ? "!" : 0}
              size="small"
              offset={[-2, 2]}
            >
              <Button
                size="small"
                type={activePage === cfg.key ? "primary" : "default"}
                style={
                  activePage !== cfg.key ? { borderColor: COLORS[i], color: COLORS[i] } : undefined
                }
                onClick={() => {
                  handleTabClick(cfg.key)
                }}
              >
                {cfg.label}
              </Button>
            </Badge>
          ))}
          {openPageKeys.length > 0 && (
            <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          )}
        </Space>
      </div>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space orientation="vertical" style={{ width: "100%" }} size="small">
          <Text strong>缓存状态</Text>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StatBox
              label="页面数量"
              value={`${String(openPageKeys.length)} / ${String(maxPages)}`}
            />
            <StatBox
              label="缓存顺序 (LRU)"
              value={order
                .map((k) => PAGE_CONFIGS.find((p) => p.key === k)?.label ?? k)
                .join(" → ")}
            />
            <StatBox
              label="当前页面"
              value={PAGE_CONFIGS.find((p) => p.key === activePage)?.label ?? "-"}
            />
            <StatBox
              label="过期数据"
              value={
                staleKeys.length === 0
                  ? "无"
                  : staleKeys
                      .map((k) => PAGE_CONFIGS.find((p) => p.key === k)?.label ?? k)
                      .join(", ")
              }
              valueColor={staleKeys.length > 0 ? "#faad14" : undefined}
            />
          </div>
          {openPageKeys.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前打开页面在 LRU
                顺序末尾（最新使用）。超过容量时，最久未使用的页面（最左侧）将被淘汰，其 DOM
                和状态将被销毁。
              </Text>
            </div>
          )}
          {staleKeys.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <Text type="warning" style={{ fontSize: 12, color: "#faad14" }}>
                以下页面缓存数据已过期，切换到对应页面时将自动刷新：
                {staleKeys.map((k) => PAGE_CONFIGS.find((p) => p.key === k)?.label ?? k).join("、")}
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {PAGE_CONFIGS.map((cfg) => {
        if (!(cfg.key in pages)) return null
        const isActive = activePage === cfg.key
        const PageComponent = PAGE_COMPONENTS[cfg.key]
        return (
          <div key={cfg.key} style={{ display: isActive ? "block" : "none" }}>
            <Card
              size="small"
              title={
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Space>
                    <Badge status={isActive ? "processing" : "default"} />
                    <Text strong>{cfg.label}</Text>
                    {staleKeys.includes(cfg.key) && (
                      <Tag color="orange" style={{ fontSize: 10 }}>
                        数据已过期
                      </Tag>
                    )}
                    {pages[cfg.key].loading && pages[cfg.key].data && (
                      <Tag color="orange" style={{ fontSize: 10 }}>
                        刷新中...
                      </Tag>
                    )}
                    {pages[cfg.key].loading && !pages[cfg.key].data && <Spin size="small" />}
                    {pages[cfg.key].data &&
                      !pages[cfg.key].loading &&
                      !staleKeys.includes(cfg.key) && (
                        <Tag color="green" style={{ fontSize: 10 }}>
                          已缓存
                        </Tag>
                      )}
                    {!pages[cfg.key].data && !pages[cfg.key].loading && (
                      <Tag style={{ fontSize: 10 }}>未加载</Tag>
                    )}
                  </Space>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      closePage(cfg.key)
                    }}
                  />
                </div>
              }
              styles={{ body: { padding: 16, maxHeight: 480, overflow: "auto" } }}
            >
              <PageComponent pageKey={cfg.key} isActive={isActive} />
            </Card>
          </div>
        )
      })}
    </div>
  )
}

function StatBox({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div style={{ background: "#fafafa", borderRadius: 6, padding: "8px 14px", minWidth: 180 }}>
      <Text type="secondary" style={{ fontSize: 11 }}>
        {label}
      </Text>
      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2, color: valueColor }}>{value}</div>
    </div>
  )
}
