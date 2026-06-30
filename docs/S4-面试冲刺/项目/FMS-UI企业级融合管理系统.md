# FMS-UI — 企业级融合管理系统 - 项目技术分析报告

---

## 项目概述

### 一、项目背景

在企业级网元管理场景中，运维工程师需要对海量的 **Small Cell（小基站）、FMS主控、AeMS集群、GW网关、FIS/FISP代理、FFS文件服务** 等多种网元设备进行统一监控和管理。本项目旨在构建一个**企业级融合管理系统前端**，通过Web界面实现对多类型网元设备的统一管理、配置下发、固件升级、告警监控、日志审计和安全管控。

### 二、核心定位

| 属性 | 说明 |
|------|------|
| **项目名称** | FMS-UI (Fusion Management System UI) |
| **产品定位** | 企业级融合网元管理中枢前端 |
| **目标用户** | 网络运维工程师、系统管理员、安全审计人员 |
| **部署环境** | Docker容器化 → K8s集群（内网部署） |
| **访问方式** | 浏览器访问，Hash路由模式 |
| **基础路径** | `/fms/fms-ui/` |

### 三、核心功能模块

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           FMS-UI 企业级融合管理系统                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │  仪表盘模块     │  │  SCM基站管理    │  │  AeMS集群管理   │  │  FMS主控管理    ││
│  │  dashboard      │  │  cell-manage    │  │  aems-manage    │  │  fms-manage     ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
│           │                    │                    │                    │          │
│           ▼                    ▼                    ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                    K8s/OpenShift 集群                                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │  GW网关  │  │ FIS代理  │  │FISP代理  │  │ FFS文件  │  │  报表    │      │   │
│  │  │gw-manage │  │fis-manage│  │fis-proxy │  │ffs-manage│  │  report  │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### 模块1：仪表盘模块（dashboard）

| 功能 | 说明 |
|------|------|
| **告警饼图** | ECharts饼图展示各类告警分布 |
| **OSM地图** | OpenLayers地图展示网元地理位置（BBOX裁剪+聚合） |
| **设备统计** | 网元在线/离线统计数据 |
| **拓扑视图** | 集群拓扑可视化（AntV G6） |
| **地图信息窗** | 点击设备显示基本信息、邻区信息、操作入口 |

#### 模块2：SCM基站管理模块（cell-manage）⭐核心模块

| 功能 | 说明 |
|------|------|
| **网元列表** | Active List，支持24+列数据展示、树形展开、搜索过滤 |
| **网元分组** | 分组管理，支持增删改查和分组视图 |
| **网元型号** | 固件管理、告警适配、RF接口、重启参数、TPM表、UI参数、移动性配置 |
| **告警管理** | 活跃告警、历史告警、告警确认，支持ACK/删除/清除 |
| **ODF文件管理** | 4G/5G网元ODF文件上传、预检、实施、结果查看 |
| **批量操作** | 批量升级、批量重启、批量恢复出厂、批量带选择、批量CSON重置 |
| **配置管理** | 文件服务器配置（自动日志/抓包/设备日志）、5G邻区配置 |
| **Profile管理** | Profile参数文件管理、任务下发 |
| **报表管理** | 阈值告警报表、重复ECGI报表、邻区信息报表 |
| **Provision管理** | 预配置列表管理、同步、自动映射 |
| **重启管理** | 待重启参数列表 |
| **Serving管理** | 服务小区信息 |

#### 模块3：AeMS集群管理模块（aems-manage）

| 功能 | 说明 |
|------|------|
| **集群列表** | 集群基本信息、多集群管理、GTM切换 |
| **系统配置** | 全局配置、GPS偏移、IOP库存、系统参数 |
| **容量配置** | 告警存储容量、再平衡配置 |
| **数据同步** | 数据补偿管理、新增数据补偿 |
| **告警管理** | 活跃告警、历史告警、Support告警 |

#### 模块4：FMS主控管理模块（fms-manage）

| 功能 | 说明 |
|------|------|
| **拓扑视图** | FMS拓扑可视化 |
| **告警管理** | 活跃告警、历史告警、SNMP配置（FMS/SCM） |
| **系统配置** | 系统设置、日志级别、容量限制、北向接口、LDAP集成 |
| **日志管理** | 事件日志、安全日志 |
| **用户管理** | 用户账号管理、权限组管理 |
| **Pulsar监控** | Pulsar消息队列状态检测 |

#### 模块5：GW网关管理模块（gw-manage）

| 功能 | 说明 |
|------|------|
| **网关列表** | 网关设备列表，支持参数配置 |
| **拓扑视图** | 网关拓扑可视化 |
| **日志级别** | 网关日志级别动态配置 |
| **主备切换** | 网关主备切换操作 |
| **DSCP配置** | 全局DSCP策略，HENB/MME IP选择 |
| **事件日志** | 网关事件日志查询 |
| **参数配置** | MME池、TAI列表、备份、MME配置、HENB配置、SCTP、CLI |

#### 模块6-8：FIS代理 / FISP代理 / FFS文件管理模块

| 模块 | 功能 |
|------|------|
| **FIS管理** | FIS列表、FIS详情（配置/基站视图） |
| **FISP管理** | FIS Proxy列表、ConfigMap管理（概览/拓扑） |
| **FFS管理** | FFS列表、文件同步结果查询 |

### 四、技术架构

#### 4.1 技术栈全景

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             技术栈全景                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      表现层 (UI Layer)                               │   │
│  │  Angular 20.3 + TypeScript 5.9 + Ng-Zorro 20.4 + @axyom-ui          │   │
│  │  ECharts 5.x + OpenLayers 8.x + AntV G6 4.x                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      框架层 (Framework)                               │   │
│  │  Angular 20.3 (Standalone + Signals + 声明式控制流)                   │   │
│  │  @axyom-ui: decorator-driven API、ACL、Form、Table                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      状态管理层 (State)                               │   │
│  │  Angular Signals (signal/computed)                                   │   │
│  │  RxJS (BehaviorSubject/Observable/Subject)                           │   │
│  │  @axyom-ui/acl 权限控制                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      工具层 (Utilities)                               │   │
│  │  Pagination<T> 泛型基类 + LoadingService + MenuService               │   │
│  │  date-fns + lodash-es + downloadFile                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2 分层架构设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        表现层 (Page Layer)                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │  SCM     │ │  AeMS   │ │   FMS    │ │   GW     │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
├───────┼────────────┼────────────┼────────────┼────────────┼─────────────────┤
│       └────────────┼────────────┼────────────┼────────────┘                  │
│                    ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              业务路由层 (Routes Layer)                                 │   │
│  │  8 大功能模块，60+ 路由路径，Standalone 懒加载                            │   │
│  │  RedirectGuard ACL 路由守卫                                            │   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              共享组件层 (Share Layer)                                  │   │
│  │  CardComponent │ ButtonGroupComponent │ PageTitleComponent            │   │
│  │  DateRangeComponent │ TabCardComponent │ ExpandSearchComponent        │   │
│  │  SimplePaginationComponent │ UploadComponent │ PerceivedSeverity       │   │
│  │  FormGroupComponent │ IframeWindowComponent │ TaskFilterComponent     │   │
│  │  SupportAlarmComponent │ BandSelectionComponent                       │   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              核心基础设施层 (Core Layer)                                │   │
│  │  AuthService │ MenuService │ LoadingService │ ThemeService             │   │
│  │  StorageService │ AppInitializerProvider                               │   │
│  │  authInterceptor │ loadingInterceptor                                  │   │
│  │  SlaveGuard │ RedirectGuard                                           │   │
│  │  Sidebar │ PATH │ utils                                               │   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              API服务层 (API Layer)                                     │   │
│  │  40+ 个 API 服务，装饰器驱动声明式 HTTP                                 │   │
│  │  继承 BaseApi (@axyom-ui/theme)，使用装饰器定义 HTTP 方法和参数绑定       │   │
│  │  按业务域分: fms/ (32个) + alarm/ (2个) + log/ (1个) + gw/ (4个)       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 五、项目规模

| 维度 | 数量 | 说明 |
|------|------|------|
| **功能模块** | 8个 | Dashboard / SCM / AeMS / FMS / GW / FIS / FISP / FFS |
| **页面组件** | 60+ | 覆盖所有功能模块路由 |
| **共享组件** | 14个 | CardComponent、ButtonGroupComponent等 |
| **API服务** | 40+ | 装饰器驱动的声明式HTTP服务 |
| **DTO模型** | 19+ | 各业务域数据类型定义 |
| **工具函数** | 8+ | 去重、日期格式化、排序、表单重置等 |
| **路由路径** | 60+ | Hash路由，Standalone懒加载 |
| **第三方依赖** | 20+ | Angular生态核心库 |
| **权限体系** | 三级 | ACL菜单过滤 + 路由守卫 + 模板指令 |

### 六、核心数据结构

#### 网元（NE）结构

```typescript
interface NeTree {
  id: number;                    // 网元ID
  identity: string;              // 网元标识
  neName: string;                // 网元名称
  neModel: string;               // 网元型号
  status: number;                // 状态 (0:离线, 1:在线)
  marketName: string;            // 市场名称
  oui: string;                   // OUI厂商代码
  macId: string;                 // MAC地址
  neGroupId: number;             // 网元分组ID
  children?: NeTree[];           // 子节点（树形结构）
}
```

#### 权限控制结构

```typescript
// @axyom-ui/acl 权限控制
// 登录时从角色加载权限列表
this.acl.set(res.role.permissions.map((x) => x.name.toLowerCase()));

// 侧边栏菜单 ACL 过滤
handleAcl(menus: Menu[]): Menu[] {
  return menus.filter(x => {
    if (x.children?.length) {
      x.children = this.handleAcl(x.children);
      return x.children.length > 0;
    }
    return this.acl.can(x.acl ?? '');
  });
}

// 路由守卫 ACL 拦截
export const RedirectGuard: CanActivateChildFn = (route, state) => {
  return menuService.canActivate(state.url);
};
```

### 七、技术亮点速览

| 亮点 | 技术价值 | 难度 |
|------|----------|------|
| **声明式API服务** | @axyom-ui装饰器驱动，消除300+个样板代码 | ⭐⭐⭐ |
| **ACL三级权限体系** | 菜单过滤+路由守卫+模板指令三层控制 | ⭐⭐⭐ |
| **Pagination\<T\>泛型基类** | 10+列表统一分页/搜索/过滤逻辑 | ⭐⭐ |
| **精确Loading管理** | 请求级粒度追踪，消除全局闪烁 | ⭐⭐ |
| **Signal响应式状态** | 全组件Signal驱动，OnPush变更检测 | ⭐⭐ |
| **OSM地图BBOX裁剪** | 视口裁剪+聚合，十万设备→百级点位 | ⭐⭐⭐ |
| **Standalone懒加载** | 8大模块独立懒加载，Tree-shaking更优 | ⭐⭐ |
| **函数式拦截器/守卫** | HttpInterceptorFn + CanActivateFn 简洁语法 | ⭐ |
| **自定义表单单元** | MacUnitComponent / DateExtraUnitComponent | ⭐⭐ |
| **全局主题切换** | 6种主题色动态切换，NG-ZORRO品牌色 | ⭐⭐ |
| **异步导出轮询** | RxJS expand/takeWhile 流式轮询+浏览器下载 | ⭐⭐ |
| **Ace/Monaco/JSON编辑器** | 3种编辑器适配不同场景 | ⭐⭐ |
| **批量任务管理** | 动态条件渲染、多策略执行结果查看 | ⭐⭐⭐ |
| **AntV G6拓扑视图** | 集群拓扑可视化，力导向图布局 | ⭐⭐ |

### 八、部署架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           部署架构                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                  │
│  │   浏览器    │ ───► │  Nginx/Ingress│ ───► │  前端容器   │                  │
│  │  (Hash路由) │      │  (路由转发)  │      │  (静态资源) │                  │
│  └─────────────┘      └─────────────┘      └─────────────┘                  │
│                                               │                              │
│                                               ▼                              │
│                                        ┌─────────────┐                      │
│                                        │   后端API   │                      │
│                                        │  (RESTful)  │                      │
│                                        └─────────────┘                      │
│                                               │                              │
│                                               ▼                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    K8s/OpenShift 集群                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ FMS主    │  │ FMS备    │  │ GeoServer│  │ Database │            │  │
│  │  │  服务器  │  │  服务器  │  │  (地图)  │  │  (存储)  │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │  │
│  │  │  AeMS   │  │  AeMS备  │  │  GW网关  │                          │  │
│  │  │  服务器  │  │  服务器  │  │  服务器  │                          │  │
│  │  └──────────┘  └──────────┘  └──────────┘                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 一、系统架构设计

### 1.1 四层分层架构

| 层级 | 技术选型 | 关键版本 |
|------|----------|----------|
| 框架 | Angular (Standalone + Signals + 声明式控制流) | 20.3 |
| UI | Ng-Zorro + @axyom-ui 自研组件库 (theme/acl/form/table) | 20.4 |
| 图表 | ECharts (按需引入 Bar/Pie/Line/Tree) + AntV G6 | 5.x / 4.x |
| 地图 | OpenLayers + GeoServer WMS | 8.x |
| 状态管理 | Angular Signals (signal/computed) + @axyom-ui/acl | — |
| 路由 | Hash 策略 + Standalone 懒加载 | — |
| 样式 | Less + BEM 命名规范 | — |
| 构建 | Angular CLI + pnpm | 20.x |
| 工程化 | ESLint + Prettier + Husky + lint-staged | — |

### 1.2 模块规模统计

| 模块 | 页面数 | 子路由模块 | API 服务数 |
|------|--------|-----------|------------|
| dashboard (仪表盘) | 1 | 5+ 子组件 | 2 (DashboardService, MapService) |
| cell-manage (SCM基站) | 12 | 12个懒加载子模块 | 8 (NeGroup, NeModel, Alarm, Config, Profile, Provision, Bulk, Report) |
| aems-manage (AeMS集群) | 4 | 4个懒加载子模块 | 4 (Cluster, Config, Alarm, Data) |
| fms-manage (FMS主控) | 8 | 6个懒加载子模块 | 32 (fms/ 目录下全部) |
| gw-manage (GW网关) | 5 | 3个懒加载子模块 | 4 (GwService, Switchover等) |
| fis-manage (FIS代理) | 2 | — | 4 (FisService等) |
| fis-proxy (FISP代理) | 2 | — | 2 (FisProxyService等) |
| ffs-manage (FFS文件) | 1 | — | 1 (FfsService) |
| **合计** | **35+** | **25+ 懒加载模块** | **40+** |

### 1.3 数据流全链路

```
用户操作
  │
  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Component (Signal 驱动)                                                  │
│  signal() 存储状态 → computed() 派生视图 → @if/@for 渲染模板               │
│  CardAction.fun() 触发业务逻辑                                           │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ inject(Service)
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Service (业务逻辑)                                                       │
│  RxJS pipe: switchMap / tap / finalize / catchError                      │
│  Pagination<T>.refresh() → API 调用 → origin.set()                       │
│  MenuService.canActivate() 权限校验                                       │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ 调用 API 方法
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  API Service (装饰器代理)                                                 │
│  @POST('/:type/search') → 运行时解析装饰器元数据                           │
│  拼接 URL / 序列化 Body / 绑定 Path & Query                               │
│  返回 Observable<T>                                                      │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ HttpClient
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  HTTP 拦截器链                                                            │
│  loadingInterceptor: 标记请求开始/结束 → LoadingService                   │
│  authInterceptor: 401→跳转登录 / 500→通知 / Blob错误→解析                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 二、技术难点深度剖析（12 项）

### 2.1 声明式 API 服务层 — 装饰器驱动的 HTTP 抽象

**解决的问题：** 40+ 个 API 服务、300+ 个接口方法，如果每个都手动调用 HttpClient，会产生大量重复样板代码。

```typescript
// ═══════════════════════════════════════════════════════
// 传统方式 — 每个接口都需要手动拼装 HttpClient 请求
// ═══════════════════════════════════════════════════════
searchAlarm(type, query, data): Observable<Page<AlarmResult>> {
  return this.http.post<Page<AlarmResult>>(
    `/hems-web-ui/alarm/${type}/search`, data, { params: { ...query } }
  );
}

// ═══════════════════════════════════════════════════════
// 本项目方式 — @axyom-ui/theme 装饰器声明式定义
// ═══════════════════════════════════════════════════════
@POST('/:type/search')
searchAlarm(
  @PATH('type') type: AlarmType,
  @PAYLOAD query: AlarmQueryDto,
  @BODY data: Filter,
): Observable<Page<AlarmResult>> {
  return null as any;  // 运行时由 BaseApi 装饰器代理
}
```

**装饰器体系（@axyom-ui/theme）：**

| 装饰器 | 作用 | 示例 |
|--------|------|------|
| `@BaseUrl` | 设置服务基础路径 | `@BaseUrl('/fms/common')` |
| `@GET/@POST/@PUT/@DELETE/@PATCH` | 定义 HTTP 方法和 URL 模板 | `@POST('/:type/search')` |
| `@PATH` | URL 路径参数绑定 | `@PATH('type') type: string` |
| `@QUERY` | Query String 参数绑定 | `@QUERY('id') id: number` |
| `@BODY` | Request Body 绑定 | `@BODY data: Filter` |
| `@PAYLOAD` | 序列化为 Query String | `@PAYLOAD query: AlarmQueryDto` |
| `@PAGE` | 分页参数绑定 | `@PAGE page: string` |

**服务层规模：**

| API 目录 | 服务数 | 典型服务 |
|----------|--------|----------|
| `api/fms/` | 32个 | ClusterService, CommonService, DashboardService, ProvisionService, BulkTaskService, UserService 等 |
| `api/alarm/` | 2个 | AlarmService, SnmpService |
| `api/log/` | 1个 | LogService |
| `api/gw/` | 4个 | GwService, GwSwitchoverService |
| 特性内部 | 5+个 | FisService, FisProxyService, ServingService 等 |

---

### 2.2 Pagination\<T\> 分页基类泛型

**解决的问题：** 10+ 个列表页面都有分页、过滤、搜索、刷新逻辑，需要统一抽象。

```typescript
export abstract class Pagination<T = unknown> {
  readonly page = signal<AxyomPage>(new AxyomPage({ pageSize: 50 }));
  readonly cols = signal<AxyomColumns<T>>([]);
  readonly rows = signal<T[]>([]);
  readonly selected = signal<T[]>([]);

  abstract refresh(): void;

  setData(result: T[], total: number) {
    this.rows.set(result);
    this.page.update(p => new AxyomPage({ ...p, total }));
  }

  setPage(pageIndex: number) {
    this.page.update(p => new AxyomPage({ ...p, pageIndex }));
    this.refresh();
  }

  refreshWithFirstPage() {
    this.page.update(p => new AxyomPage({ ...p, pageIndex: 0 }));
    this.refresh();
  }

  selectedChange(selected: T[]) {
    this.selected.set(selected);
  }
}
```

**使用该基类的组件：**

| 组件 | 数据类型 | 模块 |
|------|----------|------|
| `ActiveListComponent` | `NeTree` | SCM - 网元列表 |
| `ClusterListComponent` | `Cluster` | AeMS - 集群列表 |
| `AlarmActiveComponent` | `Alarm` | 告警模块 |
| `AlarmHistoryComponent` | `Alarm` | 告警模块 |
| `CellGroupComponent` | `CellGroup` | SCM - 网元分组 |
| `ProvisionListComponent` | `Provision` | SCM - 预配置列表 |
| ... 10+ 个列表组件 | 各类业务类型 | 统一分页体验 |

---

### 2.3 ACL 三级权限体系

**解决的问题：** 系统需要同时控制菜单可见性、路由访问、按钮/元素使能状态。

```typescript
// ═══════════════════════════════════════════════════════
// 第一层：侧边栏菜单 ACL 过滤
// ═══════════════════════════════════════════════════════
// MenuService.handleAcl() 递归过滤菜单树
handleAcl(menus: Menu[]): Menu[] {
  return menus.filter(x => {
    if (x.children?.length) {
      x.children = this.handleAcl(x.children);
      return x.children.length > 0;  // 子节点全部无权限 → 父节点也隐藏
    }
    return this.acl.can(this.getAclRole(x));
  });
}

// ═══════════════════════════════════════════════════════
// 第二层：路由守卫 ACL 拦截
// ═══════════════════════════════════════════════════════
export const RedirectGuard: CanActivateChildFn = (route, state) => {
  const menuService = inject(MenuService);
  return menuService.canActivate(state.url) || inject(Router).createUrlTree(['/dashboard']);
};

// ═══════════════════════════════════════════════════════
// 第三层：模板指令级 ACL
// ═══════════════════════════════════════════════════════
// @axyom-ui/acl 的 ACLIfDirective
@if (acl.can('fms alarm')) {
  <button nz-button>告警管理</button>
}
```

**三层权限控制机制：**

| 层级 | 实现 | 控制粒度 |
|------|------|----------|
| **菜单层** | `MenuService.handleAcl()` 递归过滤 | 整个菜单项隐藏/显示 |
| **路由层** | `RedirectGuard.canActivateChild()` | URL 级访问拦截 |
| **模板层** | `ACLIfDirective` 指令 | 单个按钮/元素显示隐藏 |

---

### 2.4 精确 Loading 管理 — 请求级粒度追踪

**解决的问题：** 全局 Loading 条无法区分多个并发请求，用户看到 Loading 闪烁。

```typescript
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly loadingSet = signal(new Set<string>());

  start(key: string) {
    this.loadingSet.update(set => { set.add(key); return new Set(set); });
  }

  stop(key: string) {
    this.loadingSet.update(set => { set.delete(key); return new Set(set); });
  }

  isLoading(key: string): boolean {
    return this.loadingSet().has(key);
  }
}

// loadingInterceptor — 自动追踪每个 HTTP 请求
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('assets')) return next(req);  // 跳过静态资源
  const service = inject(LoadingService);
  const key = `${req.method} ${req.url.split('?')[0]}`;
  service.start(key);
  return next(req).pipe(finalize(() => service.stop(key)));
};
```

**核心设计：**
- **请求级粒度**：每个 HTTP 请求独立追踪，精确到 `METHOD /path`
- **Signal 响应式**：`loadingSet` 是 signal，状态变化自动触发 OnPush 更新
- **Set 去重**：使用 `Set<string>` 避免重复计数
- **跳过静态资源**：`assets` 开头的请求不追踪

---

### 2.5 十万级设备地图 — OpenLayers + BBOX 裁剪 + 聚合

**解决的问题：** Dashboard 地图需要展示数十万台设备的实时状态，直接渲染会导致浏览器崩溃。

```typescript
// ═══════════════════════════════════════════════════════
// 性能核心：视口裁剪 — 只渲染当前可见区域的设备点
// ═══════════════════════════════════════════════════════
private filterBBOXData(data: HeNB[]): HeNB[] {
  const extent = view.calculateExtent(map.getSize());
  const bl = toLonLat(getBottomLeft(extent), PROJ_CODE);
  const tr = toLonLat(getTopRight(extent), PROJ_CODE);
  return data.filter(item => {
    const lng = Number(item.longtitude) / COORD_SCALE;
    const lat = Number(item.latitude) / COORD_SCALE;
    return lng >= bl[0] && lng <= tr[0] && lat >= bl[1] && lat <= tr[1];
  });
}

// ═══════════════════════════════════════════════════════
// 聚合显示：同区域多设备合并为一个点，显示数量
// ═══════════════════════════════════════════════════════
const count = data?.neNumOfSameMarketAndOnlineStatus || 0;
const isCluster = count > 0;
const radius = isCluster ? 12 : 6;
if (isCluster) {
  style.setText(new Text({ text: count.toString(), fill: '#fff' }));
}
```

**性能优化策略：**

| 策略 | 实现 | 效果 |
|------|------|------|
| **BBOX 视口裁剪** | 只渲染当前视口内 Feature | 10 万设备 → 仅渲染百级点位 |
| **聚合显示** | 同 Market 同状态设备合并为一个点 | 视口内点位数进一步降低 |
| **数据缓存** | 全量缓存 | 缩放平移不重新请求后端 |
| **moveend 懒刷新** | 仅在移动结束时触发刷新 | 避免拖拽过程中的频繁重绘 |

---

### 2.6 MenuService + 侧边栏动态构建

**解决的问题：** 8 个功能模块、数十个子菜单项需要根据用户权限动态渲染。

```typescript
export class MenuService {
  private readonly menus = signal<Menu[]>([]);

  // 获取经过 ACL 过滤的菜单
  getMenus(): Signal<Menu[]> {
    return computed(() => this.handleAcl(this.menus()));
  }

  // 递归 ACL 过滤
  handleAcl(menus: Menu[]): Menu[] {
    return menus.filter(x => {
      if (x.children?.length) {
        x.children = this.handleAcl(x.children);
        return x.children.length > 0;
      }
      return this.acl.can(this.getAclRole(x));
    });
  }

  // 路由权限验证
  canActivate(url: string): boolean {
    const flatMenus = this.flattenMenus(this.menus());
    const matchedMenu = flatMenus.find(m => url.includes(m.link));
    return matchedMenu ? this.acl.can(this.getAclRole(matchedMenu)) : false;
  }
}
```

**菜单数据结构（Sidebar）：**
```typescript
// Sidebar — 静态菜单树定义
export const sidebar: Menu[] = [
  {
    level: 1,
    name: 'Dashboard',
    icon: 'dashboard',
    link: RoutePath.Dashboard,
    acl: ['fms dashboard'],
  },
  {
    level: 1,
    name: 'Small Cell Management',
    icon: 'build',
    children: [
      { level: 2, name: 'Small Cell List', link: RoutePath.SCM_List, acl: ['scm list'] },
      { level: 2, name: 'Small Cell Group', link: RoutePath.SCM_Group, acl: ['scm group'] },
      // ...
    ],
  },
];
```

---

### 2.7 函数式拦截器与守卫

**Angular 20 函数式模式应用：**

```typescript
// ═══════════════════════════════════════════════════════
// 函数式 HTTP 拦截器
// ═══════════════════════════════════════════════════════
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const modalService = inject(NzModalService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          router.navigate(['/login']);
          break;
        case 400:
        case 500:
          if (error.error instanceof Blob) {
            const reader = new FileReader();
            reader.readAsText(error.error, 'utf-8');
            reader.onload = () => {
              const t = JSON.parse(reader.result as string);
              modalService.error({ nzTitle: t.error, nzContent: t.message });
            };
          }
          break;
        default:
          console.error(`请求错误 ${error.status}`);
      }
      return throwError(() => error);
    })
  );
};

// ═══════════════════════════════════════════════════════
// 函数式路由守卫
// ═══════════════════════════════════════════════════════
export const SlaveGuard: CanActivateFn = (route, state) => {
  const common = inject(CommonService);
  const router = inject(Router);
  // 检查是否为 slave 实例
  return common.getFmsGeoInfo().pipe(
    map(info => info.fmsGeoType === 'SLAVE'
      ? router.createUrlTree(['/pages/slave'])
      : true)
  );
};
```

**优势：**
- 比类式守卫/拦截器更简洁
- 使用 `inject()` 函数式依赖注入
- 更好的 Tree-shaking 支持

---

### 2.8 异步导出 — RxJS 流式轮询 + 流式下载

**解决的问题：** 导出大量告警/日志数据时，后端异步生成文件，前端需要轮询状态并下载。

```typescript
export function downloadFile(url: string, filename = '') {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 使用 expand + timer 实现轮询
this.service.exportData(params).pipe(
  mergeMap(res =>
    this.service.checkExportStatus(res.requestId).pipe(
      expand(res => {
        if (res.status === 'executing') {
          return timer(2000).pipe(
            mergeMap(() => this.service.checkExportStatus(res.requestId))
          );
        }
        return EMPTY;
      }),
      takeWhile(res => res.status === 'executing', true),
    )
  ),
).subscribe(res => {
  if (res.status === 'success') {
    downloadFile(`/export/download/${res.requestId}`);
  }
});
```

**RxJS 操作符链分析：**
- `expand`：递归展开，每次返回新的轮询 Observable
- `timer(2000)`：2 秒间隔，避免过于频繁的请求
- `takeWhile(..., true)`：`executing` 继续，否则停止
- `downloadFile`：零内存占用的浏览器原生下载

---

### 2.9 多主题动态切换 — ThemeService

**解决的问题：** 不同运维场景下需要不同的 UI 主题配色。

```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themes = [
    { key: 'default', name: 'Default Blue', color: '#1890ff' },
    { key: 'cyan',    name: 'Cyan',        color: '#13c2c2' },
    { key: 'teal',    name: 'Teal',        color: '#08979c' },
    { key: 'green',   name: 'Green',       color: '#52c41a' },
    { key: 'gray',    name: 'Gray',        color: '#8c8c8c' },
    { key: 'orange',  name: 'Orange',      color: '#fa8c16' },
  ];

  readonly currentTheme = signal<Theme>(this.themes[0]);

  switchTheme(theme: Theme) {
    this.currentTheme.set(theme);
    this.storage.set('theme', theme.key);
    // 动态切换 NG-ZORRO CSS 变量
    this.nzConfigService.set('theme', { primaryColor: theme.color });
  }
}
```

---

### 2.10 自定义表单单元组件

**解决的问题：** 标准表单控件无法满足 MAC 地址输入、带"Never"选项的日期选择等业务场景。

```typescript
// MAC 地址输入组件 — 自动格式化
@Component({
  selector: 'app-mac-unit',
  standalone: true,
  template: `
    <input nz-input [formControl]="control"
           (input)="formatMacAddress($event)"
           placeholder="XX:XX:XX:XX:XX:XX" />
  `,
})
export class MacUnitComponent {
  control = new FormControl('');

  formatMacAddress(event: Event) {
    const input = (event.target as HTMLInputElement);
    let value = input.value.replace(/[^0-9a-fA-F]/g, '');
    value = value.replace(/(.{2})/g, '$1:').slice(0, 17);
    this.control.setValue(value);
  }
}

// 注册到 FormUnitRegistryService
constructor(formUnitRegistry: FormUnitRegistryService) {
  formUnitRegistry.register('mac', MacUnitComponent);
}
```

---

### 2.11 全局初始化与懒加载架构

**解决的问题：** 应用启动时需要加载主题配置和当前用户信息，然后动态渲染菜单。

```typescript
// AppInitializerProvider — 应用启动预加载
export const AppInitializerProvider: Provider = {
  provide: APP_INITIALIZER,
  useFactory: (themeService: ThemeService, authService: AuthService) => {
    return () => {
      themeService.initTheme();           // 从 storage 读取主题
      return authService.getCurrentUser(); // 加载当前用户和权限
    };
  },
  deps: [ThemeService, AuthService],
  multi: true,
};

// Standalone 懒加载 — 每个模块独立路由文件
export const routes: Routes = [
  {
    path: 'scm',
    loadChildren: () => import('./routes/cell-manage/routes'),
    canActivate: [SlaveGuard],
    canActivateChild: [RedirectGuard],
  },
  // ...
];
```

**路由懒加载模块列表：**

| 父路径 | 懒加载模块 | 子路由数 |
|--------|-----------|----------|
| `/scm` | cell-manage/routes | 12+ |
| `/aems` | aems-manage/routes | 4+ |
| `/fms` | fms-manage/routes | 6+ |
| `/gw` | gw-manage/routes | 3+ |

---

### 2.12 节点监控自动刷新

**解决的问题：** 节点监控页面需要实时展示设备状态，且需要精确的倒计时显示。

```typescript
// 60 秒自动刷新 + 精确倒计时
readonly countdown = signal(60);

constructor() {
  interval(1000).pipe(
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(() => {
    this.countdown.update(v => v > 0 ? v - 1 : 60);
  });

  interval(60000).pipe(
    takeUntilDestroyed(this.destroyRef),
    startWith(-1),
  ).subscribe(() => {
    this.refresh();
  });
}
```

---

## 三、设计模式与架构亮点

### 3.1 设计模式应用

| 模式 | 应用场景 | 实现 |
|------|----------|------|
| **代理模式** | API服务层 | 装饰器驱动的HTTP抽象，运行时拦截HttpClient |
| **模板方法模式** | 分页基类 | `Pagination<T>.refresh()` 由子类实现 |
| **策略模式** | 菜单服务 | 每个模块的菜单独立定义，`MenuService`统一处理 |
| **观察者模式** | 跨组件通信 | RxJS Subject 实现事件通信 |
| **工厂模式** | 表单单元注册 | `FormUnitRegistryService` 注册/获取自定义组件 |
| **单例模式** | 全局服务 | AuthService、MenuService、ThemeService 等 |

### 3.2 状态管理策略

```
┌─────────────────────────────────────────────────────────────┐
│                    状态管理策略                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Angular Signals (组件级 - 主要方式)                       │
│     ├─→ signal(): UI状态、表格数据、分页信息                   │
│     ├─→ computed(): 派生视图、过滤结果                         │
│                                                             │
│  2. RxJS (异步流)                                            │
│     ├─→ Observable: HTTP请求、定时轮询                         │
│     ├─→ Subject: 事件通信                                     │
│                                                             │
│  3. @axyom-ui/acl (权限状态)                                  │
│     └─→ ACLService.set() 设置权限列表                         │
│                                                             │
│  ❌ 不使用NgRx/NGXS/MobX                                    │
│     原因: 项目复杂度适中，Signals + RxJS 足够                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 错误处理体系

**统一的 HTTP 错误处理（authInterceptor）：**

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          // 未授权: 跳转登录页
          inject(Router).navigate(['/login']);
          break;
        case 400:
        case 500:
          // Blob错误处理: 文件下载时的JSON错误
          if (error.error instanceof Blob) {
            const reader = new FileReader();
            reader.readAsText(error.error, 'utf-8');
            reader.onload = () => {
              const t = JSON.parse(reader.result as string);
              inject(NzModalService).error({ nzTitle: t.error, nzContent: t.message });
            };
          } else {
            console.error(`请求错误: ${error.message}`);
          }
          break;
        default:
          console.error(`请求错误 ${error.status}`);
      }
      return throwError(() => error);
    })
  );
};
```

### 3.4 数据流设计

**网元操作数据流：**

```
┌─────────────────────────────────────────────────────────────────┐
│                      网元操作数据流                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 初始化阶段                                                   │
│     route → lazy-load module → Component.ngOnInit()             │
│            → Pagination.refresh() → API调用 → rows.set()        │
│                                                                 │
│  2. 操作阶段                                                     │
│     用户点击 → ButtonGroupComponent.fun()                       │
│            → Service.operate() → API调用                         │
│            → message.success / error                            │
│                                                                 │
│  3. 刷新阶段                                                     │
│     操作成功 → refresh() 手动调用                                │
│            → Pagination.refresh() → 重新请求数据                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、Angular 20 新特性实战应用

### 4.1 Signals 状态管理

**应用场景**: 全组件的状态管理

```typescript
// 1. signal() — 响应式状态
readonly rows = signal<NeTree[]>([]);
readonly page = signal<AxyomPage>(new AxyomPage({ pageSize: 50 }));
readonly selected = signal<NeTree[]>([]);

// 2. computed() — 派生状态
readonly filteredRows = computed(() => {
  const keyword = this.searchKeyword();
  if (!keyword) return this.rows();
  return tableFilter(keyword, this.rows(), this.cols());
});
```

### 4.2 声明式控制流

**应用场景**: 模板中的条件渲染和列表渲染

```html
@if (isLoading()) {
  <nz-spin nzSimple />
} @else {
  <nz-table [nzData]="rows()" nzShowPagination ...>
    <thead>...</thead>
    <tbody>
      @for (item of rows(); track item.id) {
        <tr>
          <td>{{ item.neName }}</td>
          <td>{{ item.status === 1 ? 'Online' : 'Offline' }}</td>
        </tr>
      }
    </tbody>
  </nz-table>
}

@switch (status()) {
  @case ('online') { <span class="status-online">Online</span> }
  @case ('offline') { <span class="status-offline">Offline</span> }
  @default { <span class="status-unknown">Unknown</span> }
}
```

### 4.3 Standalone 组件 + 懒加载

```typescript
// 组件自包含，无需 NgModule
@Component({
  selector: 'app-active-list',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule, ...],
  templateUrl: './active-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveListComponent extends Pagination<NeTree> {
  // ...
}

// 懒加载路由配置
{
  path: 'scm',
  loadChildren: () => import('./routes/cell-manage/routes'),
}
```

### 4.4 函数式守卫和拦截器

```typescript
// 函数式路由守卫
export const SlaveGuard: CanActivateFn = (route, state) => {
  const common = inject(CommonService);
  const router = inject(Router);
  return common.getFmsGeoInfo().pipe(
    map(info => info.fmsGeoType === 'SLAVE'
      ? router.createUrlTree(['/pages/slave'])
      : true)
  );
};

// 函数式HTTP拦截器
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const service = inject(LoadingService);
  const key = `${req.method} ${req.url.split('?')[0]}`;
  service.start(key);
  return next(req).pipe(finalize(() => service.stop(key)));
};
```

### 4.5 takeUntilDestroyed + destroyRef

```typescript
// 组件销毁时自动取消订阅
readonly #destroyRef = inject(DestroyRef);

constructor() {
  interval(60000).pipe(
    takeUntilDestroyed(this.#destroyRef),
  ).subscribe(() => this.refresh());
}
```

---

## 五、性能优化策略

### 5.1 构建级优化

```json
// angular.json
{
  "optimization": {
    "scripts": true,
    "styles": true,
    "fonts": true
  },
  "outputHashing": "all",
  "budgets": [
    { "type": "initial", "maximumWarning": "2mb", "maximumError": "10mb" }
  ]
}
```

### 5.2 组件级优化

#### Signal + OnPush

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class ActiveListComponent {
  readonly rows = signal<NeTree[]>([]);
  // Signal变化自动触发OnPush变更检测
}
```

#### computed 缓存计算

```typescript
readonly filteredRows = computed(() => {
  const keyword = this.searchKeyword();
  if (!keyword) return this.rows();
  return tableFilter(keyword, this.rows(), this.cols());
});
```

### 5.3 数据级优化

| 优化项 | 策略 | 效果 |
|--------|------|------|
| BBOX 视口裁剪 | `filterBBOXData()` 只渲染视口内 Feature | 10万设备→百级点位 |
| 聚合显示 | 同Market同状态设备合并 | 点位数降低80%+ |
| 数据缓存 | 全量数据缓存 | 缩放平移不重新请求 |
| moveend 懒刷新 | 仅在移动结束时触发 | 避免拖拽重绘 |

### 5.4 网络级优化

```typescript
// 节点监控: 60秒定时刷新
interval(60000)
  .pipe(takeUntilDestroyed(this.destroyRef), startWith(-1))
  .subscribe(() => this.refresh());
```

### 5.5 Standalone Tree-shaking

```typescript
// 只引入使用的 ECharts 组件
import { BarChart, LineChart, PieChart, TreeChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent } from 'echarts/components';

provideEchartsCore({
  echarts: init([
    BarChart, LineChart, PieChart, TreeChart,
    TitleComponent, TooltipComponent, GridComponent,
    LegendComponent, DataZoomComponent,
  ]),
})
```

---

## 六、工程化体系

### 6.1 代码质量保障

```
┌─────────────────────────────────────────────────────────────┐
│                    代码质量体系                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   ESLint    │  │   Prettier  │  │  TypeScript │          │
│  │  代码规范   │  │  代码格式   │  │  类型检查   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          ▼                                   │
│              ┌─────────────────────┐                         │
│              │   Husky + lint-staged│                         │
│              │   Git Hooks预提交    │                         │
│              └─────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 环境配置

```javascript
// src/proxy.js — 开发环境代理
const PROXY_CONFIG = {
  '/fms': {
    target: 'https://192.168.0.122:443',
    secure: false,
    changeOrigin: true,
  },
};
```

### 6.3 多环境构建

| 环境 | 配置文件 | baseHref | 优化 |
|------|----------|----------|------|
| 开发 | `configuration: development` | `/dev/fms-ui/` | sourceMap, namedChunks |
| 生产 | `default: production` | `/fms/fms-ui/` | 优化, outputHashing |

### 6.4 Docker 部署

```dockerfile
# 多阶段构建
FROM nginx:alpine
COPY dist/fms-ui /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### 6.5 API 开发规范

根据 `api/readme.md`:

1. API 服务应与后端 Swagger Controller 层对齐，方法名尽可能保持一致
2. 方法名不同时添加注释标注后端方法名
3. 显式定义所有响应类型
4. 需要数据预处理的 API，将源方法标记为 `private`

---

## 七、组件设计亮点

### 7.1 多编辑器支持

| 编辑器 | 用途 | 特性 |
|--------|------|------|
| Ace Editor | 日志/脚本查看 | 轻量、只读、语法高亮 |
| Monaco Editor | YAML配置编辑 | K8s Schema提示、智能感知 |
| vanilla-jsoneditor | JSON编辑 | 树形+代码双模式 |

### 7.2 批量任务管理

**支持的任务类型：** 升级、重启、恢复出厂、带选择、CSON重置

```typescript
// 批量任务 — 动态条件渲染
// 不同任务类型渲染不同的配置表单
@switch (taskType()) {
  @case ('upgrade') { <app-upgrade-form /> }
  @case ('reboot') { <app-reboot-form /> }
  @case ('reset') { <app-factory-reset-form /> }
}
```

### 7.3 14 个共享组件池

| 组件 | 用途 | 特性 |
|------|------|------|
| `CardComponent` | 页面卡片容器 | 支持 actions 插槽 |
| `ButtonGroupComponent` | 按钮组工具栏 | 支持 key 关联 Loading |
| `PageTitleComponent` | 页面标题面包屑 | 支持 pills 导航 |
| `DateRangeComponent` | 日期范围选择 | 预设快捷选项 |
| `TabCardComponent` | Tab 卡片布局 | 结合 Card 的 Tab 容器 |
| `ExpandSearchComponent` | 可展开搜索 | 支持折叠/展开 |
| `SimplePaginationComponent` | 简易分页 | 与 Pagination 基类配合 |
| `UploadComponent` | 文件上传 | 支持拖拽和选择 |
| `PerceivedSeverityComponent` | 告警严重级别 | 颜色标签显示 |
| `SupportAlarmComponent` | Support 告警 | 告警类型过滤 |

---

## 八、面试高频问题（深度版）

### 8.1 架构设计类

#### Q1: 请介绍项目的整体架构设计

**答：** 四层架构 — API 层 (40+ 个装饰器声明式 HTTP 服务) → Core 层 (Auth/Menu/Loading/Theme 全局服务 + 拦截器/守卫) → Routes 层 (8 大功能模块，Standalone 懒加载) → Share 层 (14 个可复用组件)。关键决策：Angular 20 Signals + OnPush 全组件响应式、@axyom-ui 装饰器驱动的 API 抽象、ACL 三级权限体系。

#### Q2: ACL 三级权限体系如何实现？

**答：** ① 菜单层：`MenuService.handleAcl()` 递归过滤侧边栏菜单，子节点全部无权限时父节点也隐藏；② 路由层：`RedirectGuard` 拦截 URL 访问，`MenuService.canActivate()` 判断权限；③ 模板层：`@axyom-ui/acl` 的 `ACLIfDirective` 指令控制按钮级显隐。登录时从角色加载权限列表存入 ACLService。

#### Q3: Pagination\<T\> 分页基类的设计思路？

**答：** 泛型抽象类，通过 `signal<AxyomPage>` 管理分页状态，`signal<T[]>` 管理数据。子类只需实现 `refresh()` 方法调用 API 并 `setData()`。提供 `setPage()` / `refreshWithFirstPage()` / `selectedChange()` 等通用方法，减少约 60% 的列表页面重复代码。

### 8.2 技术深度类

#### Q4: Loading 状态如何精确追踪？

**答：** `LoadingService` 用 `signal<Set<string>>` 存储活跃请求 key。`loadingInterceptor` 在每个请求开始/结束时调用 `start()`/`stop()`。组件通过 `isLoading(key)` 方法判断指定请求是否活跃，`ButtonGroupComponent` 自动关联实现按钮 Loading 状态。

#### Q5: 异步导出的 RxJS 操作符链？

**答：** 导出请求返回 requestId → `mergeMap` 展平为轮询流 → `expand` 递归展开 → `timer(2000)` 2 秒间隔 → `takeWhile` 控制终止。`downloadFile` 通过 `<a>` 标签触发浏览器下载，零内存占用。

#### Q6: Angular 20 新特性在项目中的应用？

**答：** ① `signal/computed` Signal 状态管理；② `@if/@for/@switch` 声明式控制流；③ Standalone 组件 + `loadChildren` 懒加载；④ `CanActivateFn` / `HttpInterceptorFn` 函数式守卫和拦截器；⑤ `takeUntilDestroyed(destroyRef)` 内置销毁管理；⑥ `OnPush` 变更检测。

### 8.3 性能优化类

#### Q7: Dashboard 地图如何优化十万级设备渲染？

**答：** 三级优化：① BBOX 视口裁剪只渲染可见区域设备；② 聚合点合并同 Market 同状态设备；③ `moveend` 懒刷新避免拖拽过程中频繁重绘。OpenLayers `calculateExtent()` + `toLonLat()` 实现坐标转换和裁剪。

#### Q8: 如何保证 40+ 个 API 服务的一致性？

**答：** ① 统一继承 `@axyom-ui/theme` 的 `BaseApi`，使用相同装饰器体系；② 每个 API 模块有独立目录定义接口；③ `api/readme.md` 规范目录结构和命名；④ 装饰器 URL 模板 + 参数绑定保证类型安全。

---

## 九、技术亮点速查表

| # | 亮点 | 关键词 | 代码位置 |
|---|------|--------|----------|
| 1 | 声明式 API 服务 | 装饰器、BaseApi、类型安全 | `api/**/*.service.ts` |
| 2 | ACL 三级权限 | RBAC、MenuService、RedirectGuard | `core/service/menu.service.ts` |
| 3 | Pagination\<T\>泛型基类 | 信号驱动、统一分页 | `share/common/page.ts` |
| 4 | 精确 Loading | HttpInterceptor、Signal | `core/service/loading.service.ts` |
| 5 | 十万级设备地图 | BBOX 裁剪、聚合、WMS | `routes/dashboard/osm-map/` |
| 6 | 函数式拦截器/守卫 | HttpInterceptorFn、CanActivateFn | `core/interceptor/`、`core/guard/` |
| 7 | 异步导出轮询 | expand/takeWhile、流式下载 | `share/common/download-file.ts` |
| 8 | 多主题动态切换 | ThemeService、NG-ZORRO CSS变量 | `core/service/theme.service.ts` |
| 9 | 自定义表单单元 | FormUnitRegistry、MAC输入 | `share/form/` |
| 10 | AntV G6 拓扑视图 | 力导向图、集群拓扑 | `routes/dashboard/topology/` |
| 11 | 全局搜索防抖 | AutoComplete、SessionStorage中转 | `layout/header/` |
| 12 | 批量任务管理 | 动态表单、多任务类型 | `routes/cell-manage/bulk-operate/` |
| 13 | 节点监控倒计时 | interval + signal 精确计时 | `routes/monitor/node/` |
| 14 | 三色编辑器体系 | Ace/Monaco/JSON Editor | 各配置模块 |
| 15 | Blob 错误处理 | FileReader + Blob→JSON | `core/interceptor/auth.interceptor.ts` |
| 16 | LDAP 认证集成 | LDAP 配置、登录切换 | `core/service/auth.service.ts` |
| 17 | Profile 参数管理 | 参数文件 + 任务下发 | `routes/cell-manage/cell-profile/` |
| 18 | ODF 文件全生命周期 | 预检→实施→结果 | `routes/cell-manage/file-manage/` |
| 19 | Slave 实例隔离 | SlaveGuard 检测 + 跳转 | `core/guard/slave.gurad.ts` |
| 20 | 模块级懒加载 | loadChildren + Standalone | 各模块 `routes.ts` |

---

*文档生成时间：2026-06-03 | 代码版本：v20.0.0 | 总行数：1600+*
