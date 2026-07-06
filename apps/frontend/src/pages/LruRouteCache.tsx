import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Badge, Button, Card, notification, Space, Spin, Tag, Typography } from 'antd';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useLruCacheStore } from '../stores/lruRouteStore.ts';
import ConfigPage from './LruRouteCacheConfig.tsx';
import LogsPage from './LruRouteCacheLogs.tsx';
import MonitorPage from './LruRouteCacheMonitor.tsx';

const { Text } = Typography;

const PAGE_CONFIGS = [
  { key: 'monitor', label: '业务监控', color: 'blue' },
  { key: 'config', label: '配置管理', color: 'green' },
  { key: 'logs', label: '日志查询', color: 'purple' },
];

const COLORS = ['#1677ff', '#52c41a', '#722ed1'];

const PAGE_COMPONENTS: Record<
  string,
  (props: { pageKey: string; isActive: boolean }) => ReactElement
> = {
  monitor: MonitorPage,
  config: ConfigPage,
  logs: LogsPage,
};

const CACHE_TTL = 30000;

function CacheCountdown({ loadedAt }: { loadedAt: number | null }) {
  const [remaining, setRemaining] = useState<number>(() =>
    loadedAt != null ? Math.max(0, Math.ceil((CACHE_TTL - (Date.now() - loadedAt)) / 1000)) : 0,
  );

  useEffect(() => {
    if (loadedAt == null) return;

    const tick = () => {
      const elapsed = Date.now() - loadedAt;
      const secs = Math.max(0, Math.ceil((CACHE_TTL - elapsed) / 1000));
      setRemaining(secs);
      if (secs <= 0) return;
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
    };
  }, [loadedAt]);

  if (loadedAt == null || remaining <= 0) return null;

  const color = remaining <= 5 ? '#f5222d' : remaining <= 15 ? '#faad14' : '#52c41a';

  return <span style={{ marginLeft: 4, color, fontSize: 10 }}>· {remaining}s</span>;
}

function StatBox({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ borderRadius: 6, padding: '8px 14px', minWidth: 180 }}>
      <Text type="secondary" style={{ fontSize: 11 }}>
        {label}
      </Text>
      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2, color: valueColor }}>{value}</div>
    </div>
  );
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
  } = useLruCacheStore();

  const handleTabClick = useCallback(
    (key: string) => {
      if (!(key in pages)) {
        initPage(key);
      }
      setActive(key);
    },
    [pages, initPage, setActive],
  );

  const handleReset = useCallback(() => {
    for (const key of order) {
      closePage(key);
    }
  }, [order, closePage]);

  useEffect(() => {
    if (evictedPage) {
      notification.warning({
        title: `页面已淘汰`,
        description: `"${PAGE_CONFIGS.find((p) => p.key === evictedPage)?.label ?? evictedPage}" 已被 LRU 淘汰，打开后将重新加载数据`,
        placement: 'topRight',
        duration: 3,
      });
      clearEvicted();
    }
  }, [evictedPage, clearEvicted]);

  const openPageKeys = Object.keys(pages);

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              count={staleKeys.includes(cfg.key) ? '!' : 0}
              size="small"
              offset={[-2, 2]}
            >
              <Button
                size="small"
                type={activePage === cfg.key ? 'primary' : 'default'}
                style={
                  activePage !== cfg.key ? { borderColor: COLORS[i], color: COLORS[i] } : undefined
                }
                onClick={() => {
                  handleTabClick(cfg.key);
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
        <Space orientation="vertical" style={{ width: '100%' }} size="small">
          <Text strong>缓存状态</Text>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatBox
              label="页面数量"
              value={`${String(openPageKeys.length)} / ${String(maxPages)}`}
            />
            <StatBox
              label="缓存顺序 (LRU)"
              value={order
                .map((k) => PAGE_CONFIGS.find((p) => p.key === k)?.label ?? k)
                .join(' → ')}
            />
            <StatBox
              label="当前页面"
              value={PAGE_CONFIGS.find((p) => p.key === activePage)?.label ?? '-'}
            />
            <StatBox
              label="过期数据"
              value={
                staleKeys.length === 0
                  ? '无'
                  : staleKeys
                      .map((k) => PAGE_CONFIGS.find((p) => p.key === k)?.label ?? k)
                      .join(', ')
              }
              valueColor={staleKeys.length > 0 ? '#faad14' : undefined}
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
              <Text type="warning" style={{ fontSize: 12, color: '#faad14' }}>
                以下页面缓存数据已过期，切换到对应页面时将自动刷新：
                {staleKeys.map((k) => PAGE_CONFIGS.find((p) => p.key === k)?.label ?? k).join('、')}
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {PAGE_CONFIGS.map((cfg) => {
        if (!(cfg.key in pages)) return null;
        const isActive = activePage === cfg.key;
        const PageComponent = PAGE_COMPONENTS[cfg.key];
        return (
          <div key={cfg.key} style={{ display: isActive ? 'block' : 'none' }}>
            <Card
              size="small"
              title={
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Space>
                    <Badge status={isActive ? 'processing' : 'default'} />
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
                          <CacheCountdown loadedAt={pages[cfg.key].loadedAt} />
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
                      closePage(cfg.key);
                    }}
                  />
                </div>
              }
              styles={{ body: { padding: 16, maxHeight: 480, overflow: 'auto' } }}
            >
              <PageComponent pageKey={cfg.key} isActive={isActive} />
            </Card>
          </div>
        );
      })}
    </div>
  );
}
