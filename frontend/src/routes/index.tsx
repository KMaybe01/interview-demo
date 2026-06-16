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
import type { ComponentType } from "react"
import AlertWebSocket from "../pages/AlertWebSocket.tsx"
import ChunkedUpload from "../pages/ChunkedUpload.tsx"
import Dashboard from "../pages/Dashboard.tsx"
import GisRendering from "../pages/GisRendering.tsx"
import JsonSchemaForm from "../pages/JsonSchemaForm.tsx"
import LogStream from "../pages/LogStream.tsx"
import LruRouteCache from "../pages/LruRouteCache.tsx"
import RbacPermission from "../pages/RbacPermission.tsx"
import RequestLoading from "../pages/RequestLoading.tsx"
import SseLogStream from "../pages/SseLogStream.tsx"
import TokenRefresh from "../pages/TokenRefresh.tsx"
import TreeDataEngine from "../pages/TreeDataEngine.tsx"
import WebWorkerMerge from "../pages/WebWorkerMerge.tsx"

export interface RouteConfig {
  path: string
  name: string
  icon: ComponentType
  element: ComponentType
}

export const routes: RouteConfig[] = [
  { path: "/", name: "仪表盘", icon: DashboardOutlined, element: Dashboard },
  {
    path: "/alert-websocket",
    name: "告警 WebSocket",
    icon: AlertOutlined,
    element: AlertWebSocket,
  },
  {
    path: "/json-schema-form",
    name: "JSON Schema 动态表单",
    icon: FormOutlined,
    element: JsonSchemaForm,
  },
  {
    path: "/lru-route-cache",
    name: "LRU 路由缓存",
    icon: PartitionOutlined,
    element: LruRouteCache,
  },
  {
    path: "/web-worker-merge",
    name: "Web Worker 分治合并",
    icon: NodeIndexOutlined,
    element: WebWorkerMerge,
  },
  {
    path: "/gis-rendering",
    name: "GIS 十万级点位渲染",
    icon: EnvironmentOutlined,
    element: GisRendering,
  },
  { path: "/log-stream", name: "百万行日志流式解密", icon: FileTextOutlined, element: LogStream },
  {
    path: "/rbac-permission",
    name: "RBAC 位编码权限",
    icon: SafetyOutlined,
    element: RbacPermission,
  },
  { path: "/token-refresh", name: "双 Token 无感刷新", icon: KeyOutlined, element: TokenRefresh },
  { path: "/sse-log-stream", name: "SSE 日志流", icon: ThunderboltOutlined, element: SseLogStream },
  {
    path: "/request-loading",
    name: "请求加载 Signal",
    icon: ApiOutlined,
    element: RequestLoading,
  },
  {
    path: "/tree-data-engine",
    name: "树形数据操作引擎",
    icon: ApartmentOutlined,
    element: TreeDataEngine,
  },
  {
    path: "/chunked-upload",
    name: "大文件分片上传",
    icon: UploadOutlined,
    element: ChunkedUpload,
  },
]
