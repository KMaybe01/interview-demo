# Interview Demo — Frontend

React 19 + TypeScript 6 + Vite 8 前端 SPA，为 **16 个技术场景**（含仪表盘首页 + 15 个核心演示）提供交互界面。

## 技术栈

| 组件 | 用途 |
|------|------|
| React 19 | UI 框架（Compiler 启用） |
| TypeScript 6 | 类型系统（strict 模式） |
| Vite 8 + Rolldown | 构建工具（Rust bundler） |
| Ant Design 6 | UI 组件库 |
| Zustand 5 | 状态管理（persist 中间件） |
| React Router 7 | 路由（懒加载） |
| ECharts 6 | 图表可视化 |
| OpenLayers 10 | GIS 地图渲染 |
| AJV 8 | JSON Schema 校验 |
| Axios 1 | HTTP 客户端 |
| react-window | 虚拟滚动 |
| web-vitals 5 | 页面性能指标采集 |
| Biome 2.5 | Lint + Format |

## 项目结构

```
src/
├── main.tsx                    # React 入口 (StrictMode + BrowserRouter + StyleProvider)
├── App.tsx                     # 根组件 (ConfigProvider + Routes + AuthGuard)
├── assets/                     # 静态资源
├── components/
│   ├── AuthGuard.tsx           # 路由守卫（未认证重定向 /login）
│   ├── PageTracker.tsx         # 页面渲染性能追踪
│   └── dynamic-form/           # 自定义递归表单引擎
│       ├── DynamicForm.tsx      # 容器组件
│       ├── Renderer.tsx         # 递归 AST 渲染器
│       ├── registry.tsx         # 策略模式字段注册表
│       ├── types.ts            # Schema 类型 + AJV 校验
│       └── fields/             # 7 个字段组件
│           ├── ArrayField.tsx
│           ├── DateTimeField.tsx
│           ├── JsonField.tsx
│           ├── NumberField.tsx
│           ├── SelectField.tsx
│           ├── StringField.tsx
│           └── SwitchField.tsx
├── layouts/
│   └── MainLayout.tsx          # 应用外壳 (Sider + Header + Content + 主题切换)
├── pages/
│   ├── Dashboard.tsx           # / 仪表盘首页
│   ├── Login.tsx               # /login CSS Module + 涟漪动画
│   ├── AlertWebSocket.tsx      # /alert-websocket 多协议告警
│   ├── JsonSchemaForm.tsx      # /json-schema-form 动态表单
│   ├── ChunkedUpload.tsx       # /chunked-upload 大文件断点续传
│   ├── GisRendering.tsx        # /gis-rendering GIS 点位渲染
│   ├── LogStream.tsx           # /log-stream 加密日志流解密
│   ├── LruRouteCache.tsx       # /lru-route-cache LRU 路由缓存
│   ├── LruRouteCacheConfig.tsx # LRU 缓存配置面板
│   ├── LruRouteCacheLogs.tsx   # LRU 缓存日志
│   ├── LruRouteCacheMonitor.tsx# LRU 缓存监控
│   ├── RbacPermission.tsx      # /rbac-permission RBAC 位编码权限
│   ├── RequestLoading.tsx      # /request-loading 请求加载 Signal
│   ├── SseLogStream.tsx        # /sse-log-stream SSE 日志流
│   ├── TokenRefresh.tsx        # /token-refresh 双 Token 无感刷新
│   ├── TreeDataEngine.tsx      # /tree-data-engine 树形数据引擎
│   ├── WebWorkerMerge.tsx      # /web-worker-merge Worker 分治合并
│   ├── UniPay.tsx              # /unipay 统一支付中台
│   └── AIDemo/
│       ├── AIDemo.tsx          # /ai-demo AI Demo (6 选项卡)
│       ├── components/         # Chat / Agents / KnowledgeBase / Models / Plugins / Dashboard
│       ├── services/api.ts     # AI 相关 API 调用
│       ├── stores/chatStore.ts # 聊天状态
│       └── types/index.ts      # AI Demo 类型定义
├── routes/
│   └── index.tsx               # 15 条路由配置（懒加载）
├── stores/                     # Zustand 状态管理
│   ├── authStore.ts            # 认证状态（hydrate + Token 过期自检）
│   ├── alertStore.ts           # WebSocket 告警（MAX_ALERTS=5000）
│   ├── lruRouteStore.ts        # LRU 路由缓存状态
│   ├── requestLoadingStore.ts  # 请求加载追踪
│   ├── themeStore.ts           # 主题切换 (light/dark)
│   └── uploadStore.ts          # 分片上传状态（persist localStorage）
├── utils/
│   ├── fetchClient.ts          # 统一 HTTP 客户端（自动注入 Bearer Token + 401 无感刷新）
│   ├── token.ts                # JWT Token 管理（localStorage）
│   ├── lru.ts                  # 泛型 LRUCache 类
│   ├── rbac.ts                 # RBAC 位运算工具函数
│   ├── wsTransport.ts          # WebSocket 传输层（多协议降级、心跳、背压）
│   ├── vitalsReporter.ts       # Web Vitals 上报
│   ├── vitalsSnapshot.ts       # Vitals 快照采集
│   ├── requestResource.ts      # 请求资源追踪
│   ├── hash.worker.ts          # SHA-256 分片哈希 Web Worker
│   ├── merge.worker.ts         # 归并排序 Web Worker
│   └── decrypt.worker.ts       # RSA 密钥生成 + AES-256-GCM 解密 Web Worker
```

## 页面与路由

| 路由 | 页面 | 核心实现 |
|------|------|----------|
| `/` | Dashboard | 仪表盘首页 |
| `/login` | Login | CSS Module + 涟漪动画 |
| `/alert-websocket` | AlertWebSocket | WebSocket + SSE + Polling 三协议，二进制协议，心跳，背压，虚拟滚动 |
| `/json-schema-form` | JsonSchemaForm | 递归 AST 渲染引擎，7 字段类型，条件显隐，实时 JSON 编辑，4 层校验 |
| `/lru-route-cache` | LruRouteCache | 3 页 Tab + display:none 保活 + LRU 淘汰 + staleKeys 写失效 |
| `/rbac-permission` | RbacPermission | 6 权限位编码、5 预设角色、三层可视化联动、后端双重校验 |
| `/token-refresh` | TokenRefresh | Promise gate + 并发队列 + Rotation + Replay 检测 + 生命周期图 |
| `/sse-log-stream` | SseLogStream | ReadableStream + AbortController + RAF 节流 + 暂停/恢复 |
| `/request-loading` | RequestLoading | Signal 级别请求追踪 + 方法-路径匹配树 |
| `/tree-data-engine` | TreeDataEngine | 递归 CRUD + 拖拽排序 + 节点校验 + 批量操作 |
| `/gis-rendering` | GisRendering | OpenLayers Cluster + BBOX 裁剪 + ~50k 点 |
| `/web-worker-merge` | WebWorkerMerge | Worker Pool + 自适应分区 + 有序合并缓冲区 |
| `/log-stream` | LogStream | RSA 密钥对 + AES-256-GCM Worker 并行解密 + 虚拟滚动（10 万行） |
| `/chunked-upload` | ChunkedUpload | SHA-256 分片哈希 + 并发滑动窗口 + 暂停/恢复/停止 + 代际锁 |
| `/unipay` | UniPay | 支付状态机 (7×6) + Idempotency-Key + 指数退避 + T+1 对账 |
| `/ai-demo` | AIDemo | LLM 聊天流式、RAG 知识库、智能体、模型管理（6 子选项卡） |

## 快速启动

```bash
cd frontend
bun install
bun dev
```

## 构建

```bash
bun run build       # tsc -b + vite build (Rolldown)
bun run lint        # Biome check
bun run format      # Biome format
```

## 测试

```bash
bun test            # 单次运行（CI 环境）
bun run test:watch  # 监听模式（开发环境）
```

测试文件与源码保持同层 `__tests__/` 目录：

```
src/
├── test/
│   └── setup.ts             # 全局初始化（jest-dom 匹配器 + matchMedia mock）
├── utils/__tests__/         # 纯函数单元测试（token / lru / rbac / fetchClient）
├── stores/__tests__/        # Zustand store 测试（auth / theme / alert / requestLoading / lruRoute）
├── components/__tests__/    # 组件渲染测试（AuthGuard）
└── pages/__tests__/         # 页面集成测试（Login / Dashboard）
```

- 框架: **Vitest 4** + **@testing-library/react 16**
- 环境: jsdom + CSS 模块非作用域模式
- 用户事件: **@testing-library/user-event 14**（代替 fireEvent）
- 匹配器: **@testing-library/jest-dom**（toBeInTheDocument 等）

## 状态管理

6 个 Zustand store:

- **authStore** — 认证状态，hydrate + Token 过期自检
- **alertStore** — WebSocket 告警，`MAX_ALERTS=5000` 防止 OOM
- **lruRouteStore** — LRU 路由缓存
- **requestLoadingStore** — 请求加载追踪
- **themeStore** — 亮色/暗色主题
- **uploadStore** — 分片上传（persist + partialize）

## Web Workers

3 个 Web Worker 处理 CPU 密集型任务：

- `hash.worker.ts` — SHA-256 增量文件哈希
- `merge.worker.ts` — 归并排序（Worker Pool + 自适应分区）
- `decrypt.worker.ts` — RSA 密钥生成 + AES-256-GCM 并行解密

## 代码质量

- **React Compiler** Babel 插件启用
- **Biome 2.5** lint + format
- **Husky** pre-commit hook（lint-staged）
- **commitlint** conventional commits
- **conventional-changelog** CHANGELOG 自动生成（`bun run changelog`）
