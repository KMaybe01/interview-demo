import {
  AlertOutlined,
  ApartmentOutlined,
  ApiOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FormOutlined,
  KeyOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import { lazy, type ComponentType } from "react"

export interface RouteConfig {
  path: string
  name: string
  icon: ComponentType
  element: ComponentType
}

export const routes: RouteConfig[] = [
  { path: "/", name: "仪表盘", icon: DashboardOutlined, element: lazy(() => import("../pages/Dashboard.tsx")) },
  {
    path: "/alert-websocket",
    name: "告警 WebSocket",
    icon: AlertOutlined,
    element: lazy(() => import("../pages/AlertWebSocket.tsx")),
  },
  {
    path: "/json-schema-form",
    name: "JSON Schema 动态表单",
    icon: FormOutlined,
    element: lazy(() => import("../pages/JsonSchemaForm.tsx")),
  },
  {
    path: "/lru-route-cache",
    name: "LRU 路由缓存",
    icon: PartitionOutlined,
    element: lazy(() => import("../pages/LruRouteCache.tsx")),
  },
  {
    path: "/web-worker-merge",
    name: "Web Worker 分治合并",
    icon: NodeIndexOutlined,
    element: lazy(() => import("../pages/WebWorkerMerge.tsx")),
  },
  {
    path: "/gis-rendering",
    name: "GIS 十万级点位渲染",
    icon: EnvironmentOutlined,
    element: lazy(() => import("../pages/GisRendering.tsx")),
  },
  {
    path: "/log-stream",
    name: "百万行日志流式解密",
    icon: FileTextOutlined,
    element: lazy(() => import("../pages/LogStream.tsx")),
  },
  {
    path: "/rbac-permission",
    name: "RBAC 位编码权限",
    icon: SafetyOutlined,
    element: lazy(() => import("../pages/RbacPermission.tsx")),
  },
  {
    path: "/token-refresh",
    name: "双 Token 无感刷新",
    icon: KeyOutlined,
    element: lazy(() => import("../pages/TokenRefresh.tsx")),
  },
  {
    path: "/sse-log-stream",
    name: "SSE 日志流",
    icon: ThunderboltOutlined,
    element: lazy(() => import("../pages/SseLogStream.tsx")),
  },
  {
    path: "/request-loading",
    name: "请求加载 Signal",
    icon: ApiOutlined,
    element: lazy(() => import("../pages/RequestLoading.tsx")),
  },
  {
    path: "/tree-data-engine",
    name: "树形数据操作引擎",
    icon: ApartmentOutlined,
    element: lazy(() => import("../pages/TreeDataEngine.tsx")),
  },
  {
    path: "/chunked-upload",
    name: "大文件分片上传",
    icon: UploadOutlined,
    element: lazy(() => import("../pages/ChunkedUpload.tsx")),
  },
]
