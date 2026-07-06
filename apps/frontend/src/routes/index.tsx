import {
  AlertOutlined,
  ApartmentOutlined,
  ApiOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FormOutlined,
  KeyOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
  RobotOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { type ComponentType, lazy } from 'react';

export interface RouteConfig {
  path: string;
  name: string;
  icon: ComponentType;
  element: ComponentType;
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    name: 'Dashboard',
    icon: DashboardOutlined,
    element: lazy(() => import('../pages/Dashboard.tsx')),
  },
  {
    path: '/alert-websocket',
    name: '告警 WebSocket',
    icon: AlertOutlined,
    element: lazy(() => import('../pages/AlertWebSocket.tsx')),
  },
  {
    path: '/json-schema-form',
    name: '动态表单',
    icon: FormOutlined,
    element: lazy(() => import('../pages/JsonSchemaForm.tsx')),
  },
  {
    path: '/lru-route-cache',
    name: 'LRU 路由缓存',
    icon: PartitionOutlined,
    element: lazy(() => import('../pages/LruRouteCache.tsx')),
  },
  {
    path: '/rbac-permission',
    name: 'RBAC 位编码权限',
    icon: SafetyOutlined,
    element: lazy(() => import('../pages/RbacPermission.tsx')),
  },
  {
    path: '/token-refresh',
    name: '双 Token 无感刷新',
    icon: KeyOutlined,
    element: lazy(() => import('../pages/TokenRefresh.tsx')),
  },
  {
    path: '/sse-log-stream',
    name: 'SSE 日志流',
    icon: ThunderboltOutlined,
    element: lazy(() => import('../pages/SseLogStream.tsx')),
  },
  {
    path: '/request-loading',
    name: '请求加载 Signal',
    icon: ApiOutlined,
    element: lazy(() => import('../pages/RequestLoading.tsx')),
  },
  {
    path: '/tree-data-engine',
    name: '树形数据操作引擎',
    icon: ApartmentOutlined,
    element: lazy(() => import('../pages/TreeDataEngine.tsx')),
  },
  {
    path: '/gis-rendering',
    name: 'GIS 十万级点位渲染',
    icon: EnvironmentOutlined,
    element: lazy(() => import('../pages/GisRendering.tsx')),
  },
  {
    path: '/web-worker-merge',
    name: 'Web Worker 分治合并',
    icon: NodeIndexOutlined,
    element: lazy(() => import('../pages/WebWorkerMerge.tsx')),
  },
  {
    path: '/log-stream',
    name: '十万行日志流解密',
    icon: FileTextOutlined,
    element: lazy(() => import('../pages/LogStream.tsx')),
  },
  {
    path: '/chunked-upload',
    name: '大文件分片上传',
    icon: UploadOutlined,
    element: lazy(() => import('../pages/ChunkedUpload.tsx')),
  },

  {
    path: '/unipay',
    name: 'UniPay 统一支付中台',
    icon: CreditCardOutlined,
    element: lazy(() => import('../pages/UniPay.tsx')),
  },
  {
    path: '/ai-demo',
    name: 'AI Demo',
    icon: RobotOutlined,
    element: lazy(() => import('../pages/AIDemo/AIDemo.tsx')),
  },
];
