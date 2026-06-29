import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLruCacheStore } from '../stores/lruRouteStore.ts';
import { http } from '../utils/fetchClient.ts';

const { Text } = Typography;

interface LogEntry {
  id: number;
  level: string;
  time: string;
  source: string;
  message: string;
}

const levelColor: Record<string, string> = {
  INFO: '#52c41a',
  WARN: '#faad14',
  ERROR: '#f5222d',
  DEBUG: '#1677ff',
};

export default function LogsPage({ pageKey, isActive }: { pageKey: string; isActive: boolean }) {
  const { pages, staleKeys, updateData, setLoading, setScrollTop, updateFormValue, clearStale } =
    useLruCacheStore();
  const page = pages[pageKey];
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isStale = staleKeys.includes(pageKey);

  const searchQuery: string = (page.formValues.query as string | undefined) ?? '';
  const logLevelFilter: string = (page.formValues.logLevel as string | undefined) ?? 'all';

  const updateForm = useCallback(
    (path: string, value: unknown) => {
      updateFormValue(pageKey, path, value);
    },
    [pageKey, updateFormValue],
  );

  const fetchLogs = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(pageKey, true);
    clearStale(pageKey);
    try {
      const res = await http.get<Record<string, unknown>>('/api/logs', {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      updateData(pageKey, res.data);
    } catch {
      // axios interceptor handles 401 (refresh + redirect)
    }
  }, [pageKey, setLoading, updateData, clearStale]);

  // Combined effect: handles both initial load and stale/TTL refresh
  useEffect(() => {
    if (!isActive) return;
    const isTtlExpired = page.loadedAt != null && Date.now() - page.loadedAt > 30000;
    if (!page.data || isStale || isTtlExpired) {
      if (isTtlExpired) clearStale(pageKey);
      void fetchLogs();
    }
  }, [isActive, isStale, pageKey, page.data, page.loadedAt, fetchLogs, clearStale]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const filtered = useMemo(() => {
    let list = (page.data?.logs ?? []) as LogEntry[];
    if (searchQuery !== '') {
      list = list.filter((l) => l.message.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (logLevelFilter !== 'all') {
      list = list.filter((l) => l.level === logLevelFilter);
    }
    return list;
  }, [page.data?.logs, searchQuery, logLevelFilter]);

  const handleRefresh = useCallback(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setScrollTop(pageKey, el.scrollTop);
    }
  }, [pageKey, setScrollTop]);

  useEffect(() => {
    if (containerRef.current && page.scrollTop) {
      containerRef.current.scrollTop = page.scrollTop;
    }
  }, [page.scrollTop]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 12,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Input
          placeholder="搜索日志关键词..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => {
            updateForm('query', e.target.value);
          }}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          value={logLevelFilter}
          onChange={(v) => {
            updateForm('logLevel', v);
          }}
          style={{ width: 110 }}
          options={[
            { label: '全部级别', value: 'all' },
            { label: 'INFO', value: 'INFO' },
            { label: 'WARN', value: 'WARN' },
            { label: 'ERROR', value: 'ERROR' },
            { label: 'DEBUG', value: 'DEBUG' },
          ]}
        />
        <Text type="secondary">共 {String(filtered.length)} 条</Text>
        <div style={{ marginLeft: 'auto' }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </div>
      </div>
      {page.loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin description="加载日志..." />
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            maxHeight: 360,
            overflow: 'auto',
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          {filtered.length === 0 && <Text style={{ color: '#888' }}>无匹配日志</Text>}
          {filtered.map((l) => (
            <div key={l.id} style={{ padding: '2px 0', display: 'flex', gap: 8 }}>
              <Tag color={levelColor[l.level]} style={{ margin: 0, fontSize: 10 }}>
                {l.level}
              </Tag>
              <span style={{ color: '#888', minWidth: 80 }}>{l.time}</span>
              <span style={{ color: '#569cd6', minWidth: 100 }}>{l.source}</span>
              <span>{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
