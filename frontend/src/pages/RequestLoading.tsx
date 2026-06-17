import { LoadingOutlined } from "@ant-design/icons"
import { Button, Card, Space, Table, Tag, Typography } from "antd"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRequestLoadingStore } from "../stores"

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

function randomDelay(): number {
  return 500 + Math.random() * 2500
}

export default function RequestLoading() {
  const { activeRequests, startRequest, endRequest } = useRequestLoadingStore()
  const startTimesRef = useRef<Map<string, number>>(new Map())
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, 100)
    return () => {
      clearInterval(id)
    }
  }, [])

  const handleRequest = useCallback(
    (item: RequestItem) => {
      startRequest(item.key)
      startTimesRef.current.set(item.key, Date.now())
      setTimeout(() => {
        endRequest(item.key)
      }, randomDelay())
    },
    [startRequest, endRequest],
  )

  const handleBatch = useCallback(() => {
    for (const item of REQUEST_LIST) {
      handleRequest(item)
    }
  }, [handleRequest])

  const activeEntries = REQUEST_LIST.filter((item) => activeRequests[item.key]).map((item) => ({
    key: item.key,
    method: item.method,
    path: item.path,
    elapsed: startTimesRef.current.has(item.key)
      ? ((now - (startTimesRef.current.get(item.key) ?? now)) / 1000).toFixed(1)
      : "0.0",
  }))

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card title="Signal 驱动请求加载管理">
          <Space wrap>
            {REQUEST_LIST.map((item) => (
              <Button
                key={item.key}
                type="primary"
                loading={activeRequests[item.key]}
                onClick={() => {
                  handleRequest(item)
                }}
              >
                {item.method} {item.path}
              </Button>
            ))}
            <Button onClick={handleBatch}>批量请求</Button>
          </Space>
        </Card>

        <Card title={`活跃请求 (${String(activeEntries.length)})`}>
          {activeEntries.length === 0 ? (
            <Text type="secondary">暂无活跃请求</Text>
          ) : (
            <Table
              dataSource={activeEntries}
              pagination={false}
              size="small"
              columns={[
                {
                  title: "方法",
                  dataIndex: "method",
                  key: "method",
                  render: (method: string) => (
                    <Tag color={METHOD_COLOR[method] ?? "default"}>{method}</Tag>
                  ),
                },
                {
                  title: "路径",
                  dataIndex: "path",
                  key: "path",
                },
                {
                  title: "已耗时",
                  dataIndex: "elapsed",
                  key: "elapsed",
                  render: (elapsed: string) => `${elapsed}s`,
                },
                {
                  title: "状态",
                  key: "status",
                  render: () => <LoadingOutlined />,
                },
              ]}
            />
          )}
        </Card>
      </Space>
    </div>
  )
}
