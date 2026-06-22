import { ReloadOutlined, SaveOutlined } from "@ant-design/icons"
import { Button, Checkbox, Input, InputNumber, notification, Select, Spin, Typography } from "antd"
import { useCallback, useEffect, useRef } from "react"
import { useLruCacheStore } from "../stores/lruRouteStore.ts"
import { http } from "../utils/fetchClient.ts"

const { Text } = Typography

export default function ConfigPage({ pageKey, isActive }: { pageKey: string; isActive: boolean }) {
  const { pages, staleKeys, updateData, setLoading, updateFormValue, invalidateAll, clearStale } =
    useLruCacheStore()
  const page = pages[pageKey]
  const abortRef = useRef<AbortController | null>(null)
  const isStale = staleKeys.includes(pageKey)

  const formValues = page.formValues

  const fillFormFromConfig = useCallback(
    (cfg: {
      config: { clusterName: string; replicas: number; enableTls: boolean; logLevel: string }
    }) => {
      updateFormValue(pageKey, "clusterName", cfg.config.clusterName)
      updateFormValue(pageKey, "replicas", cfg.config.replicas)
      updateFormValue(pageKey, "enableTls", cfg.config.enableTls)
      updateFormValue(pageKey, "logLevel", cfg.config.logLevel)
      updateFormValue(pageKey, "alertEmail", "ops@company.com")
    },
    [pageKey, updateFormValue],
  )

  const fetchConfig = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(pageKey, true)
    clearStale(pageKey)
    try {
      const res = await http.get<Record<string, unknown>>("/api/config", {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const data = res.data
      updateData(pageKey, data)
      fillFormFromConfig(
        data as {
          config: { clusterName: string; replicas: number; enableTls: boolean; logLevel: string }
        },
      )
    } catch {
      // axios interceptor handles 401 (refresh + redirect)
    }
  }, [pageKey, setLoading, updateData, fillFormFromConfig, clearStale])

  // Combined effect: handles both initial load and stale/TTL refresh
  useEffect(() => {
    if (!isActive) return
    const isTtlExpired = page.loadedAt != null && Date.now() - page.loadedAt > 30000
    if (!page.data || isStale || isTtlExpired) {
      if (isTtlExpired) clearStale(pageKey)
      void fetchConfig()
    }
  }, [isActive, isStale, pageKey, page.data, page.loadedAt, fetchConfig, clearStale])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const setField = useCallback(
    (path: string, value: unknown) => {
      updateFormValue(pageKey, path, value)
    },
    [pageKey, updateFormValue],
  )

  const handleRefresh = useCallback(() => {
    void fetchConfig()
  }, [fetchConfig])

  const handleSave = useCallback(() => {
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, gap: 8 }}>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新
        </Button>
      </div>
      <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>集群名称</div>
          <Input
            value={(formValues.clusterName ?? "") as string}
            onChange={(e) => {
              setField("clusterName", e.target.value)
            }}
            placeholder="集群名称"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>副本数</div>
          <InputNumber
            value={formValues.replicas as number}
            onChange={(v) => {
              if (v != null) setField("replicas", v)
            }}
            min={1}
            max={20}
            style={{ width: 200 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Checkbox
            checked={!!formValues.enableTls}
            onChange={(e) => {
              setField("enableTls", e.target.checked)
            }}
          >
            启用 TLS
          </Checkbox>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>日志级别</div>
          <Select
            value={(formValues.logLevel ?? "info") as string}
            onChange={(v) => {
              setField("logLevel", v)
            }}
            style={{ width: 200 }}
            options={[
              { label: "DEBUG", value: "debug" },
              { label: "INFO", value: "info" },
              { label: "WARN", value: "warn" },
              { label: "ERROR", value: "error" },
            ]}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>告警邮箱</div>
          <Input
            value={(formValues.alertEmail ?? "") as string}
            onChange={(e) => {
              setField("alertEmail", e.target.value)
            }}
            placeholder="ops@company.com"
          />
        </div>
        <div>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存配置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} style={{ marginLeft: 8 }}>
            刷新
          </Button>
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            保存后将失效其他页面的缓存数据，返回时自动刷新
          </Text>
        </div>
      </div>
    </Spin>
  )
}
