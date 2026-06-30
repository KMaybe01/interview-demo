# AeMS— 企业级综合网络管理系统 - 项目技术分析报告

---

## 项目概述

### 一、项目背景

在企业级网络管理场景中，运维工程师需要对海量的 **Small Cell（小基站）网元设备** 进行统一监控和管理。传统的手工配置方式效率低下、容易出错，且难以管理大规模的网元设备。本项目旨在构建一个**企业级综合网络管理系统**，通过Web界面实现对数十万台网元设备的统一管理、智能告警、日志分析和安全审计。

### 二、核心定位

| 属性 | 说明 |
|------|------|
| **项目名称** | AeMS (Advanced eNodeB Management System) |
| **产品定位** | 企业级综合网络管理中枢前端 |
| **目标用户** | 网络运维工程师、系统管理员、安全审计人员 |
| **部署环境** | Docker容器化 → K8s集群（内网部署） |
| **访问方式** | 浏览器访问，Hash路由模式 |

### 三、核心功能模块

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AeMS企业级综合网络管理系统                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  设备管理模块   │  │  告警管理模块   │  │  日志管理模块   │     │
│  │  manage         │  │  alarm          │  │  log            │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           ▼                    ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    K8s/OpenShift集群                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ Dashboard │  │ Setting  │  │ Monitor  │  │  Report  │   │   │
│  │  │ 仪表盘   │  │ 系统设置 │  │ 节点监控 │  │  报表    │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 模块1：设备管理模块（manage）

| 功能 | 说明 |
|------|------|
| **网元列表** | 展示Active List，支持24+列数据展示 |
| **设备详情** | 8种设备详情页（通用/升级/诊断/参数等） |
| **批量操作** | 批量配置、批量重启、批量升级 |
| **再平衡管理** | 多策略网元迁移（本地/远程/集群） |
| **右键菜单** | 组合模式的业务编排（12种操作） |

#### 模块2：告警管理模块（alarm）⭐核心模块

| 功能 | 说明 |
|------|------|
| **实时告警** | 活跃告警列表，支持ACK/删除操作 |
| **历史告警** | 告警历史查询，支持自定义导出字段 |
| **告警规则** | 3种规则类型（过滤/自动ACK/转发） |
| **SNMP配置** | SNMP Trap配置和管理 |
| **告警转发** | 告警自动转发到指定系统 |

#### 模块3：日志管理模块（log）

| 功能 | 说明 |
|------|------|
| **系统日志** | 系统运行日志查询 |
| **操作日志** | 用户操作审计日志 |
| **安全日志** | 安全事件日志 |
| **设备日志** | 网元设备日志采集 |
| **CWMP日志** | CWMP协议日志 |

#### 模块4：系统设置模块（setting）

| 功能 | 说明 |
|------|------|
| **用户管理** | 用户账号、权限配置 |
| **LDAP配置** | LDAP认证集成 |
| **文件服务器** | 3种文件服务器配置（自动日志/抓包/设备日志） |
| **容量配置** | 再平衡配置、告警存储配置 |

### 四、技术架构

#### 4.1 技术栈全景

```
┌─────────────────────────────────────────────────────────────────────┐
│                           技术栈全景                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      表现层 (UI Layer)                       │   │
│  │  Angular 21.3 + TypeScript + Ng-Zorro + @axyom-ui          │   │
│  │  ECharts 5.x + OpenLayers 10.x                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      框架层 (Framework)                       │   │
│  │  Angular 21.3 (Standalone + Signals + 声明式控制流)          │   │
│  │  内置: 装饰器驱动API、LRU路由缓存、位编码权限                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      状态管理层 (State)                       │   │
│  │  Angular Signals (signal/computed/effect)                    │   │
│  │  RxJS (BehaviorSubject/Observable)                           │   │
│  │  SessionStorage装饰器 (零侵入持久化)                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      工具层 (Utilities)                       │   │
│  │  STOMP WebSocket + RxJS操作符 + 基类抽象 Pagination<T>       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.2 分层架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        表现层 (Page Layer)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │Dashboard │ │ Manage   │ │  Alarm   │ │   Log    │               │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │
├───────┼────────────┼────────────┼────────────┼─────────────────────┤
│       └────────────┼────────────┼────────────┘                     │
│                    ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              业务路由层 (Routes Layer)                        │  │
│  │  12 个功能模块，支持 LRU 路由缓存                             │  │
│  └────────────────────────┬────────────────────────────────────┘  │
├───────────────────────────┼────────────────────────────────────────┤
│                           ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              共享组件层 (Share Layer)                         │  │
│  │  CardComponent │ ButtonGroupComponent │ CardFilterComponent  │  │
│  │  PageTitleComponent │ TabCardComponent │ TimeRangeComponent  │  │
│  └────────────────────────┬────────────────────────────────────┘  │
├───────────────────────────┼────────────────────────────────────────┤
│                           ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              核心基础设施层 (Core Layer)                       │  │
│  │  AuthService │ MenuService │ LoadingService │ StatusService  │  │
│  │  StompService │ authInterceptor │ loadingInterceptor         │  │
│  │  userGuard │ RedirectGuard │ CustomReuseStrategy             │  │
│  │  Pagination<T> │ ROLE │ STORAGE │ utils                     │  │
│  └────────────────────────┬────────────────────────────────────┘  │
├───────────────────────────┼────────────────────────────────────────┤
│                           ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              API服务层 (API Layer)                            │  │
│  │  30+ 个 API 服务，装饰器驱动声明式 HTTP                       │  │
│  │  继承 BaseApi, 使用 @GET/@POST/@PATH/@BODY/@QUERY 装饰器     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 五、项目规模

| 维度 | 数量 | 说明 |
|------|------|------|
| **页面组件** | 35+ | 覆盖12个功能模块 |
| **共享组件** | 14个 | CardComponent、ButtonGroupComponent等 |
| **API服务** | 30+ | 装饰器驱动的声明式HTTP服务 |
| **权限点** | 100+ | 位编码权限体系，三层控制 |
| **最大表格** | 24+列 | Active List的海量数据展示 |
| **路由缓存** | 6个 | LRU策略，最多缓存6个页面 |
| **工具函数** | 20+ | RxJS操作符、基类抽象等 |
| **第三方依赖** | 15+ | Angular生态核心库 |

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

#### 权限码结构

```typescript
interface RoleConfig {
  M: string;                     // 模块编号
  [key: string]: {
    M: string;                   // 子模块编号
    [key: string]: {
      M: string;                 // 操作编号
    }
  }
}
// 示例: 311 = cell > active > EXPORT
// 示例: 411 = alarm > history > DELETE
```

### 七、技术亮点速览

| 亮点 | 技术价值 | 难度 |
|------|----------|------|
| **声明式API服务** | 装饰器驱动，消除200+个样板代码 | ⭐⭐⭐ |
| **LRU路由缓存** | 页面级视图复用，滚动位置恢复 | ⭐⭐⭐ |
| **位编码权限体系** | 100+权限点的RBAC三层控制 | ⭐⭐⭐ |
| **十万级设备地图** | BBOX裁剪+聚合，10万设备→百级点位 | ⭐⭐⭐ |
| **精确Loading管理** | 请求级粒度追踪，消除全局闪烁 | ⭐⭐ |
| **SessionStorage装饰器** | 零侵入状态持久化 | ⭐⭐ |
| **STOMP WebSocket** | 实时推送、强制登出 | ⭐⭐ |
| **异步导出轮询** | RxJS流式轮询+流式下载 | ⭐⭐ |
| **GeoHA双活架构** | 无状态网元归属判断 | ⭐⭐ |
| **分页基类泛型** | Pagination\<T\>复用，子类只写refresh() | ⭐ |
| **声明式表单配置** | FormBase体系，30+表单统一管理 | ⭐ |
| **全局搜索防抖** | 200ms防抖+自动补全 | ⭐ |

### 八、部署架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         部署架构                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│  │   浏览器    │ ───► │  Nginx/Ingress│ ───► │  前端容器   │         │
│  │  (Hash路由) │      │  (路由转发)  │      │  (静态资源) │         │
│  └─────────────┘      └─────────────┘      └─────────────┘         │
│                                               │                     │
│                                               ▼                     │
│                                        ┌─────────────┐              │
│                                        │   后端API   │              │
│                                        │  (适配层)   │              │
│                                        └─────────────┘              │
│                                               │                     │
│                                               ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    K8s/OpenShift集群                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ AeMS主   │  │ AeMS备   │  │ GeoServer│  │ Database │   │   │
│  │  │  服务器  │  │  服务器  │  │  (地图)  │  │  (存储)  │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 九、面试价值总结

本项目具有以下面试讲述价值：

1. **架构设计能力**：声明式API服务、LRU路由缓存、分层架构设计
2. **性能优化能力**：十万级设备地图、精确Loading管理、BBOX裁剪+聚合
3. **设计模式应用**：组合模式（右键菜单）、模板方法（基类抽象）、策略模式（菜单服务）
4. **工程化能力**：装饰器驱动、位编码权限、GeoHA双活架构
5. **问题解决能力**：SessionStorage装饰器、STOMP WebSocket、异步导出轮询

---

## 一、系统架构设计

### 1.1 四层分层架构

| 层级 | 技术选型 | 关键版本 |
|------|----------|----------|
| 框架 | Angular (Standalone + Signals + 声明式控制流) | 21.3 |
| UI | Ng-Zorro + @axyom-ui 自研组件库 (table/form/acl/theme) | 20.4 |
| 图表 | ECharts (按需引入 Bar/Pie/Line/Tree) | 5.x |
| 地图 | OpenLayers + GeoServer WMS | 10.x |
| 实时通信 | STOMP over SockJS | 7.x |
| 状态管理 | Angular Signals (signal/computed/effect) | — |
| 路由 | Hash 策略 + 自定义 LRU RouteReuseStrategy | — |
| 样式 | Less + BEM 命名规范 | — |
| 构建 | Angular CLI + pnpm | 10.x |
| 工程化 | ESLint + Prettier + Husky + lint-staged | — |

---

## 二、系统架构设计

### 2.1 四层分层架构

```
┌─────────────────────────────────────────────────────────────┐
│  Page Layer (页面壳)                                         │
│  LayoutComponent ← HeaderComponent + SidebarComponent       │
│  LoginComponent                                              │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer (业务路由) — 12 个功能模块                       │
│  dashboard │ manage │ alarm │ log │ setting │ report │      │
│  monitor │ event │ firmware │ cell │ ...                     │
├─────────────────────────────────────────────────────────────┤
│  Share Layer (共享组件) — 14 个可复用业务组件                   │
│  CardComponent │ ButtonGroupComponent │ CardFilterComponent  │
│  PageTitleComponent │ TabCardComponent │ TimeRangeComponent  │
│  SelectNeModelComponent │ InputPopComponent │ ...            │
├─────────────────────────────────────────────────────────────┤
│  Core Layer (核心基础设施)                                    │
│  AuthService │ MenuService │ LoadingService │ StatusService  │
│  StompService │ authInterceptor │ loadingInterceptor         │
│  userGuard │ RedirectGuard │ CustomReuseStrategy             │
│  Pagination<T> │ ROLE │ STORAGE │ utils                     │
├─────────────────────────────────────────────────────────────┤
│  API Layer (声明式 HTTP 服务) — 装饰器驱动                     │
│  AlarmService │ NeService │ CommonService │ MonitorService   │
│  DeviceLogService │ ParameterService │ ConfigService │ ...   │
│  继承 BaseApi, 使用 @GET/@POST/@PATH/@BODY/@QUERY 装饰器     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块规模统计

| 模块 | 页面数 | 组件数 | API 服务数 |
|------|--------|--------|------------|
| manage (网元管理) | 12 | 40+ | 8 (ne-list/ne-group/ne-model/profile/provision/bulk/reboot/rebalance) |
| alarm (告警管理) | 6 | 15+ | 4 (alarm/rule/snmp/param) |
| log (日志管理) | 4 | 4 | 5 (system/operation/security/event/param) |
| setting (系统设置) | 4 | 30+ | 6 (config/user/permission/sftp/ldap/capacity) |
| monitor (节点监控) | 2 | 4 | 2 (monitor/count) |
| dashboard (仪表盘) | 1 | 3 | 2 (common/alarm) |
| report (报表) | 1 | 1 | 1 (threshold) |
| event (事件) | 1 | 1 | — |
| firmware (固件) | 1 | 1 | — |
| **合计** | **35+** | **100+** | **30+** |

### 2.3 数据流全链路

```
用户操作
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Component (Signal 驱动)                                         │
│  signal() 存储状态 → computed() 派生视图 → @if/@for 渲染模板       │
│  CardAction.fun() 触发业务逻辑                                   │
└──────────────┬───────────────────────────────────────────────────┘
               │ inject(Service)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Service (业务逻辑)                                               │
│  RxJS pipe: switchMap / tap / finalize / catchError              │
│  DynamicModalService 弹窗交互                                     │
│  ACLService 权限校验                                              │
└──────────────┬───────────────────────────────────────────────────┘
               │ 调用 API 方法
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  API Service (装饰器代理)                                         │
│  @POST('/:type/search') → 运行时解析装饰器元数据                   │
│  拼接 URL / 序列化 Body / 绑定 Path & Query                       │
│  返回 Observable<T>                                              │
└──────────────┬───────────────────────────────────────────────────┘
               │ HttpClient
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  HTTP 拦截器链                                                    │
│  loadingInterceptor: 标记请求开始/结束 → LoadingService.signal     │
│  authInterceptor: 401→跳转登录 / 500→通知 / Blob错误→解析          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 二、技术难点深度剖析（12 项）

### 2.1 声明式 API 服务层 — 装饰器驱动的 HTTP 抽象

**解决的问题：** 30+ 个 API 服务、200+ 个接口方法，如果每个都手动调用 HttpClient，会产生大量重复样板代码。

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
// 本项目方式 — 装饰器声明式定义，零样板代码
// ═══════════════════════════════════════════════════════
@POST('/:alarmType/search')
searchAlarm(
  @PATH('alarmType') type: AlarmType,
  @PAYLOAD query: AlarmQueryDto,
  @BODY data: Filter,
): Observable<Page<AlarmResult>> {
  return undefined as unknown as Observable<Page<AlarmResult>>;  // 运行时由 BaseApi 装饰器代理
}
```

**装饰器体系：**

| 装饰器 | 作用 | 示例 |
|--------|------|------|
| `@BaseUrl` | 设置服务基础路径 | `@BaseUrl('/hems-web-ui/alarm')` |
| `@GET/@POST/@DELETE` | 定义 HTTP 方法和 URL 模板 | `@POST('/:type/search')` |
| `@PATH` | URL 路径参数绑定 | `@PATH('type') type: AlarmType` |
| `@QUERY` | Query String 参数绑定 | `@QUERY('id') id: number` |
| `@BODY` | Request Body 绑定 | `@BODY data: Filter` |
| `@PAYLOAD` | 序列化为 Query String | `@PAYLOAD query: AlarmQueryDto` |

**深度分析：**
- **编译期类型安全**：泛型返回值 `Observable<Page<T>>` + 参数装饰器，TypeScript 编译器可捕获接口签名不匹配
- **URL 模板引擎**：`:param` 占位符在运行时自动替换为 `@PATH` 参数值
- **零运行时开销**：方法体返回 `null as never`，实际 HTTP 调用由 `BaseApi` 的 Proxy/Reflect 拦截器透明代理
- **API 与后端 1:1 映射**：每个装饰器方法对应一个 REST 端点，便于维护和文档生成

**面试展开点：** "装饰器元数据在运行时如何被读取？BaseApi 如何实现方法拦截？如何处理嵌套 PATH 参数？"

---

### 2.2 LRU 路由缓存策略 — 页面级视图复用

**解决的问题：** 用户在 Active List → 设备详情 → 告警历史 → 返回列表 时，列表页需要重新加载数据并丢失滚动位置。

```typescript
export class CustomReuseStrategy implements RouteReuseStrategy {
  private static MAX_CACHE_SIZE = 6;
  static handlers: { [key: string]: CacheItem } = {};

  // ① 判断是否需要缓存（由路由 data.keepAlive 控制）
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data?.['keepAlive'];
  }

  // ② 存储缓存（含组件引用 + 滚动位置 + 模块名）
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null) {
    const scrollContainer = document.querySelector('.ant-table-body');
    CustomReuseStrategy.handlers[key] = {
      handle,
      moduleName: route.data?.['moduleName'],
      scrollPosition: scrollContainer?.scrollTop ?? 0,
    };
  }

  // ③ 恢复缓存（LRU 刷新：删除后重新插入，移到末尾）
  retrieve(route: ActivatedRouteSnapshot) {
    const item = CustomReuseStrategy.handlers[key];
    if (item) {
      delete CustomReuseStrategy.handlers[key];       // 先删
      CustomReuseStrategy.handlers[key] = item;        // 后插入 → 移到末尾
      setTimeout(() => {                               // 异步恢复滚动
        document.querySelector('.ant-table-body')!.scrollTop = item.scrollPosition;
      }, 0);
      return item.handle;
    }
    return null;
  }

  // ④ 缓存上限保护：超出 6 个时销毁最早的
  private ensureCacheLimit() {
    if (Object.keys(handlers).length >= MAX_CACHE_SIZE) {
      const oldKey = Object.keys(handlers)[0];
      destroyHandle(handlers[oldKey].handle);
      delete handlers[oldKey];
    }
  }

  // ⑤ 跨模块清理：切换大模块时清理其他模块缓存
  static deleteOtherModuleCache(targetModuleName: string) {
    Object.keys(handlers).forEach(key => {
      if (handlers[key].moduleName !== targetModuleName) {
        destroyHandle(handlers[key].handle);
        delete handlers[key];
      }
    });
  }
}
```

**设计亮点：**
- **LRU 淘汰**：最多 6 个页面，超出自动销毁最久未访问的
- **滚动位置恢复**：表格 `.ant-table-body` 的 `scrollTop` 跨导航保持
- **模块级隔离**：切换到 Setting 模块时自动清理 Manage 模块缓存
- **手动销毁**：`componentRef.destroy()` 确保 Detached 组件的 `ngOnDestroy` 被调用
- **声明式控制**：路由 `data: { keepAlive: true, moduleName: 'manage' }` 声明缓存策略

---

### 2.3 位编码权限体系 — 100+ 权限点的 RBAC

**解决的问题：** 系统有 100+ 个操作权限点，需要同时控制菜单可见性、路由访问、按钮启用状态。

```typescript
// ═══════════════════════════════════════════════════════
// 权限常量树 — 树形结构定义所有权限
// ═══════════════════════════════════════════════════════
export const ROLE = {
  cell: {
    M: '3',                          // 模块编号
    active: {
      M: '1',
      EXPORT: { M: '1' },           // 权限码 = "311"
      maintenance: {
        general: {
          GRACEFUL: { M: '1' },     // 权限码 = "31311"
          FORCEFUL: { M: '2' },     // 权限码 = "31312"
        }
      }
    }
  },
  alarm: { M: '4', history: { M: '1', DELETE: { M: '1' } } },  // "411"
  log: { M: '7', operation: { M: '2', EXPORT: { M: '1' } } }, // "721"
};

// ═══════════════════════════════════════════════════════
// 自动生成权限码 → 路径描述映射（递归遍历）
// ═══════════════════════════════════════════════════════
function getLeafNodesWithPath(): Map<string, string> {
  // "311" → "Small Cell Management > Small Cell List > EXPORT"
  // "412" → "Alarm Management > Active Alarms > ACK"
  // 369 个旧权限码 + 新权限码全部映射
}
```

**三层权限控制机制：**

| 层级 | 实现 | 控制粒度 |
|------|------|----------|
| **菜单层** | `MenuService.handleAcl()` 递归过滤 | 整个菜单项隐藏/显示 |
| **路由层** | `RedirectGuard.canActivateChild()` | URL 级访问拦截 |
| **按钮层** | `ButtonGroupComponent` + `ACLService.can()` | 单个按钮禁用/启用 |

```typescript
// 菜单动态裁剪 — 无权限子树整体隐藏
handleAcl(menus: SidebarMenu[]): SidebarMenu[] {
  return menus.filter(x => {
    if (x.children?.length) {
      x.children = this.handleAcl(x.children);
      return x.children.length > 0;  // 子节点全部无权限 → 父节点也隐藏
    }
    return this.acl.can(this.getAclRole(x));
  });
}

// 按钮级 ACL — 每个按钮独立控制
<ButtonGroup [action]="[
  { label: 'Add', acl: ['Alarm Management_Configuration_Alarm Rules_W'], fun: add() },
  { label: 'Delete', acl: ['Alarm Management_Configuration_Alarm Rules_W'], fun: delete() },
]" />
```

**向后兼容设计：**
- `old_role.ts` 包含 369 个旧权限码映射
- `ROLE_LIST` 自动合并新旧映射，后端通过 `public/operation_log.json` 同步

---

### 2.4 十万级设备地图 — OpenLayers + BBOX 裁剪 + 聚合

**解决的问题：** Dashboard 地图需要展示数十万台设备的实时状态，直接渲染会导致浏览器崩溃。

```typescript
// ═══════════════════════════════════════════════════════
// 性能核心：视口裁剪 — 只渲染当前可见区域的设备点
// ═══════════════════════════════════════════════════════
private filterBBOXData(data: HeNB[]): HeNB[] {
  const extent = view.calculateExtent(map.getSize());  // 当前视口
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
const radius = isCluster ? 12 : 6;  // 聚合点更大
if (isCluster) {
  style.setText(new Text({ text: count.toString(), fill: '#fff' }));
}

  // ═══════════════════════════════════════════════════════
  // 自定义投影 — 注册 EPSG:3857（900913 已废弃）并建立双向转换
  // ═══════════════════════════════════════════════════════
private registerCustomProjection() {
  const proj = new Projection({ code: 'EPSG:3857', units: 'm' });
  addProjection(proj);
  addCoordinateTransforms(EPSG4326, proj,
    getTransform(EPSG4326, EPSG3857),
    getTransform(EPSG3857, EPSG4326)
  );
}
```

**性能优化四板斧：**

| 策略 | 实现 | 效果 |
|------|------|------|
| **BBOX 视口裁剪** | `filterBBOXData()` 只渲染视口内 Feature | 10 万设备 → 仅渲染百级点位 |
| **聚合显示** | 同 Market 同状态设备合并为一个点 | 视口内点位数进一步降低 |
| **数据缓存** | `dataCache: Map<string, HeNB>` 全量缓存 | 缩放平移不重新请求后端 |
| **moveend 懒刷新** | `refreshVisibleFeatures()` 仅在移动结束时触发 | 避免拖拽过程中的频繁重绘 |

**地图状态持久化：**
```typescript
// SessionStorage 保存/恢复地图视图
sessionStorage.setItem('osm-map-view-state', JSON.stringify({
  market: currentMarket, zoom: view.getZoom(), center: toLonLat(view.getCenter())
}));

// Market 切换防抖 — 切换时暂停持久化，避免保存旧状态
this.mapStatePersistenceEnabled = false;
sessionStorage.removeItem(MAP_STATE_STORAGE_KEY);
```

---

### 2.5 精确 Loading 管理 — 请求级粒度追踪

**解决的问题：** 全局 Loading 条无法区分多个并发请求，用户看到 Loading 闪烁。

```typescript
// ═══════════════════════════════════════════════════════
// LoadingService — Signal 驱动的请求计数器
// ═══════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly cache = signal<string[]>([]);

  start(key: string) { this.cache.set([...this.cache(), key]); }
  stop(key: string)  { this.cache.set(this.cache().filter(x => x !== key)); }

  getLoading(key: string): boolean {
    const regex = this.buildRegexp(key);  // 智能构建正则
    return this.cache().find(x => regex.test(x)) != null;
  }

  // 支持 "POST /path" 和 "/path" 两种格式
  private buildRegexp(url: string): RegExp {
    // "POST /config/nes/advanceSearch"
    // → /^POST /hems-web-ui(/\w+)*?\/config\/nes\/advanceSearch$/
  }
}

// ═══════════════════════════════════════════════════════
// 拦截器：每个 HTTP 请求自动追踪
// ═══════════════════════════════════════════════════════
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('assets')) return next(req);  // 跳过静态资源
  const key = `${req.method} ${req.url.split('?')[0]}`;
  service.start(key);
  return next(req).pipe(finalize(() => service.stop(key)));
};

// ═══════════════════════════════════════════════════════
// 按钮组件自动关联 Loading 状态
// ═══════════════════════════════════════════════════════
readonly action = signal<CardAction[]>([
  {
    label: 'Refresh',
    key: 'POST /config/nes/advanceSearch',  // ← 与拦截器的 key 精确匹配
    fun: () => this.refresh(),
  },
]);
// ButtonGroupComponent 内部：
// processed.isLoading = () => this.loading.getLoading(processed.key!);
```

**核心设计：**
- **请求级粒度**：每个 HTTP 请求独立追踪，精确到 `METHOD /path`
- **正则智能匹配**：`buildRegexp()` 自动处理 API 前缀，支持模糊匹配
- **Signal 响应式**：`cache` 是 signal，状态变化自动触发 OnPush 更新
- **与按钮组件联动**：`CardAction.key` 直接关联请求 URL，零配置自动显示 Loading

---

### 2.6 SessionStorage 装饰器 — 零侵入状态持久化

```typescript
// 装饰器定义 — 利用 Object.defineProperty 重写 getter/setter
export function SessionStorage(key?: string, parse = true) {
  return function (target: unknown, propertyKey: string) {
    const storageKey = key || propertyKey;
    Object.defineProperty(target, propertyKey, {
      get: () => {
        const value = sessionStorage.getItem(storageKey);
        return value ? (parse ? JSON.parse(value) : value) : null;
      },
      set: (newVal: unknown) => {
        sessionStorage.setItem(storageKey, JSON.stringify(newVal));
      },
    });
  };
}

// 使用 — 一行代码实现静态属性的 sessionStorage 持久化
export class STORAGE {
  @SessionStorage()                          // key='username', parse=true
  static username = '';

  @SessionStorage('userId', false)           // key='userId', parse=false
  static userId = '-1';

  @SessionStorage('ine')                     // key='ine', parse=true
  static is_near_expired = false;
}

// 业务代码中直接读写，完全不感知 sessionStorage
STORAGE.username = 'admin';                  // 自动 sessionStorage.setItem('username', '"admin")'
console.log(STORAGE.username);               // 自动 sessionStorage.getItem → JSON.parse
```

**技术深度：**
- **TypeScript 装饰器**：Stage 3 提案前的 experimental 装饰器，作用于静态属性
- **透明代理**：`Object.defineProperty` 重写 getter/setter，调用方无感知
- **JSON 自动序列化**：`parse` 参数控制是否自动 `JSON.parse/stringify`
- **页面刷新保持**：用户登录后 `STORAGE.username = res.user.username`，F5 刷新后仍可读取

---

### 2.7 STOMP WebSocket 实时通信

```typescript
// StompService — 封装 STOMP over SockJS
export class StompService {
  stompClient = new RxStomp();
  constructor(destination: string, topic = '') {
    const socket = new SockJS(`/hems-web-ui/${destination}`);
    this.stompClient.configure({
      reconnectDelay: 5000,        // 断线后 5 秒自动重连
      heartbeatIncoming: 4000,     // 4 秒心跳检测
      heartbeatOutgoing: 4000,
      webSocketFactory: () => socket,
    });
    this.stompClient.activate();
  }
  watch() { return this.stompClient.watch('/topic/' + this.topic); }
}

// ═══════════════════════════════════════════════════════
// 场景 1：强制登出推送
// ═══════════════════════════════════════════════════════
// LayoutComponent.ngOnInit()
this.stomp = new StompService('forcedLogout');
this.stomp.watch().subscribe(data => {
  if (data.body == STORAGE.userId) {
    this.auth.logout();  // 管理员踢出当前用户
  }
});

// ═══════════════════════════════════════════════════════
// 场景 2：参数树实时刷新状态
// ═══════════════════════════════════════════════════════
// ParameterTreeComponent.ngOnInit()
this.stomp = new StompService('parameterMonitor', 'parameterMonitor/' + identity);
this.stomp.watch().subscribe(msg => {
  if (msg.body === 'refreshing') {
    this.flag = { text: 'Refreshing', color: '#eb7836' };
  } else {
    this.flag = { text: `Refresh Time: ${new Date(parseInt(msg.body)).toISOString()}`, color: '#49b77a' };
  }
});
```

**三个 WebSocket 使用场景：**

| 场景 | Destination | 用途 |
|------|-------------|------|
| 强制登出 | `forcedLogout` | 管理员踢出在线用户 |
| 参数监控 | `parameterMonitor/{identity}` | 参数树刷新状态实时推送 |
| 通用推送 | 按需创建 | 扩展到告警推送等场景 |

---

### 2.8 异步导出 — RxJS 流式轮询 + 流式下载

**解决的问题：** 导出 10 万条告警数据，后端异步生成文件，前端需要轮询状态并下载。

```typescript
export() {
  this.neService.exportNeList(data).pipe(
    mergeMap(exportRes =>
      this.common.downloadNeList(exportRes.requestId).pipe(
        expand(res => {
          if (res.status === 'executing') {
            return timer(2000).pipe(           // 2 秒间隔轮询
              mergeMap(() => this.common.downloadNeList(exportRes.requestId))
            );
          }
          return throwError(() => new Error(res.status));
        }),
        takeWhile(res => res.status === 'executing', true),  // 执行中继续，完成/失败停止
      )
    ),
  ).subscribe(res => {
    if (res.status === 'success') {
      downloadFileByRequestId(res.requestId);  // 浏览器直接下载，不经内存
    }
  });
}

// downloadFile — 通过 <a> 标签触发浏览器下载，不加载到内存
export function downloadFile(url: string, filename = '') {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

**RxJS 操作符链分析：**
- `mergeMap`：将导出请求的结果展平为下载状态轮询流
- `expand`：递归展开，每次返回新的轮询 Observable
- `timer(2000)`：2 秒间隔，避免过于频繁的请求
- `takeWhile(..., true)`：`executing` 继续轮询，`success/failed` 停止
- `downloadFile`：零内存占用的浏览器原生下载

---

### 2.9 GeoHA 双活架构 — 无状态网元归属判断

**解决的问题：** 两台 AeMS 服务器双活部署，网元分散在两台服务器上，操作前需判断归属。

```typescript
@Injectable({ providedIn: 'root' })
export class StatusService {
  // 启动时预加载系统配置
  constructor() {
    this.common.roleAndLocation().subscribe(data => {
      this.location.set(data.location);
      this.role.set(data.role);
      this.dbIdOffset = parseInt(data.dbIdOffset);
      this.dbIdIncrement = parseInt(data.dbIdIncrement);
      this.geoHaEnable = data.geoHaEnable === 'true';
    });
  }

  // 基于 ID 哈希的无状态归属判断
  isRemoteNe(id: number) {
    return this.geoHaEnable &&
      this.dbIdOffset % this.dbIdIncrement !== id % this.dbIdIncrement;
  }

  isLocalNe(id: number) {
    if (this.isRemoteNe(id)) {
      this.modal.warning({
        nzContent: 'This NE is in remote AeMS. Please go to remote AeMS for operation.'
      });
      return false;
    }
    return true;
  }
}

// 使用 — 所有网元操作前必须检查
reboot(effectiveStrategy: number) {
  if (this.neData.status == 0) {
    this.message.warning("can't reboot offline Small Cell.");
    return;
  }
  // ...
}

// BaseMenuService.gotoByGeo() — 封装地理检查
gotoByGeo(row: NeTree, url: string) {
  if (this.status.isLocalNe(row.id)) {
    this.router.navigateByUrl(url);
  }
}
```

**分布式设计要点：**
- **无状态判断**：`id % dbIdIncrement` 公式无需查询数据库，O(1) 复杂度
- **前置拦截**：`isLocalNe()` 在所有操作前调用，远程网元弹出警告
- **降级策略**：`geoHaEnable = false` 时所有网元都认为是本地网元

---

### 2.10 分页基类抽象 — Pagination\<T\> 泛型复用

**解决的问题：** 10+ 个列表页面都有分页、过滤、搜索、刷新逻辑，需要统一抽象。

```typescript
@Directive()
export class Pagination<T = unknown> implements OnInit {
  readonly page = signal<AxyomPage>(new AxyomPage({ pageSize: 100 }));
  readonly cols = signal<AxyomColumns<T>>([]);
  readonly origin = signal<T[]>([]);
  readonly selected = signal<T[]>([]);
  readonly searchKeyword = signal('');

  // computed 派生：搜索关键词变化自动过滤，不触发 HTTP 请求
  readonly rows = computed(() => {
    const keyword = this.searchKeyword();
    if (!keyword) return this.origin();
    return tableFilter(keyword, this.origin(), this.cols(), this.tableConfig);
  });

  // computed 派生：分页查询参数自动生成
  readonly getQueryStr = computed(() => {
    const p = this.page();
    return `{"pageNum":${p.pageIndex + 1},"pageSize":${p.pageSize}}`;
  });

  refresh(): void { /* 子类实现 */ }
  filter(value: string): void { this.searchKeyword.set(value?.trim() || ''); }
}

// 子类只需实现 refresh()
export class ActiveListComponent extends Pagination<NeTree> {
  override refresh() {
    this.neService.getNeList(this.data.filter, this.getQueryStr()).subscribe(res => {
      this.origin.set(res.result);
      this.page.update(p => new AxyomPage({ ...p, total: res.total }));
    });
  }
}
```

**继承体系：**

| 子类 | 数据类型 | 功能 |
|------|----------|------|
| `ActiveListComponent` | `NeTree` | 网元列表 (24+ 列、树形展开) |
| `RebalanceTaskComponent` | `RebalanceTask` | 再平衡任务列表 |
| `NodeComponent` | `Status` | 节点监控列表 (自动 60 秒刷新) |
| `RuleComponent` | `AlarmRule` | 告警规则列表 |
| 10+ 个其他列表 | 各类型 | 统一分页/过滤/搜索体验 |

---

### 2.11 声明式表单配置 — @axyom-ui/form 体系

**解决的问题：** 30+ 个表单页面（搜索、编辑、配置），表单定义需要统一规范。

```typescript
// ═══════════════════════════════════════════════════════
// Active List 搜索表单 — 33 个字段的声明式定义
// ═══════════════════════════════════════════════════════
export function getForm(): FormBase[] {
  return [
    new StringUnit({ key: 'comments', label: 'Comments / Memo' }),
    new SelectUnit({ key: 'oui', label: 'OUI', options: [] }),
    new StringUnit({ key: 'macId', label: 'MAC ID' }),
    new SelectUnit({ key: 'status', label: 'Femto Status', options: [
      { label: 'online', value: '1' },
      { label: 'offline', value: '0' },
    ]}),
    // ... 33 个字段
  ];
}

// 动态更新下拉选项
export function updateOption(fbs: FormBase[], option: NeOption) {
  fbs.forEach(x => {
    if (x instanceof SelectUnit) {
      switch (x.key) {
        case 'oui': x.options = toOptions(option.oui); break;
        case 'marketName': x.options = toOptions(option.marketName); break;
        // ...
      }
    }
  });
}

// ═══════════════════════════════════════════════════════
// 弹窗表单 — DialogModal.builder() 链式调用
// ═══════════════════════════════════════════════════════
this.modal.confirm(
  DialogModal.builder()
    .setTitle('Reboot Small Cell')
    .setContent('Do you want to reboot this Small Cell?')
    .setOkDanger(false)
    .setOk(() => this.neOperationService.reboot({ id, effectiveStrategy, M }).pipe(
      tap({ next: () => this.message.success('success!') })
    ))
);

// FormModal — 带表单的弹窗
this.modal.openModal(
  new FormModal({
    title: 'PCI Selection',
    fbs: [new SwitchUnit({ key: 'mode', label: 'SELECTION', value: x.mode == '1' })],
    resetText: '',
    onOk: (val) => this.neOperationService.setPciSelection(identity, val.mode ? 1 : 0),
  })
);
```

**表单元类型：**

| 类型 | 用途 | 特性 |
|------|------|------|
| `StringUnit` | 文本输入 | 支持 placeholder、disabled |
| `SelectUnit` | 下拉选择 | options 动态更新 |
| `SwitchUnit` | 开关 | 布尔值绑定 |
| `NumberUnit` | 数字输入 | precision 精度控制 |
| `PasswordUnit` | 密码输入 | 自动掩码 |
| `DatePickerUnit` | 日期选择 | disabledDate/disabledTime |

---

### 2.12 全局搜索 — 防抖 + 自动补全

```typescript
export class SearchComponent implements OnInit {
  readonly searchType = signal('mac');
  readonly searchValue = signal('');
  readonly listOfOption = signal<string[]>([]);
  private searchChange$ = new BehaviorSubject('');

  ngOnInit() {
    this.searchChange$.pipe(debounceTime(200)).subscribe(identity => {
      if (identity) {
        this.alarmService.getIdentityList(identity, getPageStr(0, 100))
          .subscribe(page => this.listOfOption.set(page.result));
      }
    });
  }

  // 搜索 → 跳转到 Active List 并携带过滤条件
  onSearch() {
    const data: NeCache = { filter: { [this.searchType()]: this.searchValue() }, size: 100, index: 0 };
    sessionStorage.setItem('neData', JSON.stringify(data));
    this.router.navigate(['/manage/active'], { queryParams: { back: Date.now() } });
  }
}
```

**设计要点：**
- **200ms 防抖**：避免输入过快时频繁请求
- **搜索类型切换**：支持 MAC / 序列号 / CorrelationHandle / Identity 四种搜索维度
- **SessionStorage 中转**：搜索条件写入 sessionStorage，Active List 读取后执行过滤
- **路由跳转 + QueryParams**：`back: timestamp` 触发 Active List 的 `queryParamMap` 订阅，执行数据刷新

---

## 三、设计模式与架构亮点

### 3.1 设计模式应用

| 模式 | 应用场景 | 实现 |
|------|----------|------|
| **组合模式 (Composite)** | 右键菜单体系 | `AxyomMenu<T>` 树形结构，支持任意层级嵌套 |
| **观察者模式** | 菜单操作刷新 | `refresh$` Subject 实现菜单操作后自动刷新列表 |
| **策略模式** | 菜单服务封装 | 每个菜单服务独立封装业务逻辑，主菜单只负责聚合 |
| **模板方法模式** | 设备详情页基类 | `CellBase.init()` / `LogBase.init()` 定义子类扩展点 |
| **代理模式** | API服务层 | 装饰器驱动的HTTP抽象，运行时Proxy/Reflect拦截 |
| **单例模式** | 全局服务 | AuthService、StatusService、StompService等 |

### 3.2 状态管理策略

**轻量级、本地优先**的架构设计：

```
┌─────────────────────────────────────────────────────────┐
│                    状态管理策略                           │
├─────────────────────────────────────────────────────────┤
│  1. Angular Signals (组件级 - 主要方式)                   │
│     ├─→ signal(): UI状态、表单数据                       │
│     ├─→ computed(): 派生视图、过滤结果                   │
│     └─→ effect(): 副作用、日志记录                       │
│                                                         │
│  2. RxJS (异步流)                                       │
│     ├─→ BehaviorSubject: 全局状态                       │
│     ├─→ Subject: 事件通信 (refresh$)                    │
│     └─→ Observable: HTTP请求、WebSocket                  │
│                                                         │
│  3. SessionStorage (持久化)                              │
│     └─→ @SessionStorage() 装饰器，零侵入持久化          │
│                                                         │
│  4. 路由缓存 (页面级)                                    │
│     └─→ CustomReuseStrategy LRU策略，最多缓存6个页面     │
│                                                         │
│  ❌ 不使用NgRx/NGXS/MobX                                │
│     原因: 项目复杂度适中，Signals + RxJS足够             │
└─────────────────────────────────────────────────────────┘
```

### 3.3 错误处理体系

**统一的五级错误处理**:

```typescript
// authInterceptor — 统一错误处理
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          // 未授权: 跳转登录页
          router.navigate(['/login']);
          break;
        case 400:
        case 500:
          // Blob错误处理: 文件下载时的JSON错误
          // TODO: Extract Blob error parsing to a shared utility function
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
          message.error(`请求错误 ${error.status}`);
      }
      return throwError(() => error);
    })
  );
};
```

### 3.4 数据流设计

**网元操作的数据流**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      网元操作数据流                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 初始化阶段                                                   │
│     route.paramMap → neId → getNeInfoByNeId() → neData          │
│                                                                 │
│  2. 操作阶段                                                     │
│     用户右键 → ActiveListMenu.getMenus()                        │
│            → MenuService.gotoByGeo() (GeoHA检查)                │
│            → NeOperationService.reboot/lock/upgrade()           │
│                                                                 │
│  3. 刷新阶段                                                     │
│     操作成功 → refresh$.next({event, action: true})             │
│            → ActiveListComponent.refresh() → 重新请求数据        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、Angular 21新特性实战应用

### 4.1 Signals状态管理

**应用场景**: 全组件的状态管理

```typescript
// 1. signal() — 响应式状态
readonly searchType = signal('mac');
readonly searchValue = signal('');
readonly listOfOption = signal<string[]>([]);

// 2. computed() — 派生状态
readonly rows = computed(() => {
  const keyword = this.searchKeyword();
  if (!keyword) return this.origin();
  return tableFilter(keyword, this.origin(), this.cols(), this.tableConfig);
});

// 3. effect() — 副作用
effect(() => {
  console.log('Search type changed:', this.searchType());
});
```

**原理**: 
- `signal()`创建可变的响应式状态
- `computed()`自动追踪依赖，缓存计算结果
- `effect()`在状态变化时执行副作用

### 4.2 声明式控制流

**应用场景**: 模板中的条件渲染和列表渲染

```typescript
// 1. @if 条件渲染
@if (isLoading()) {
  <nz-spin />
} @else {
  <nz-table [data]="rows()" />
}

// 2. @for 列表渲染
@for (item of menus(); track item.label) {
  <nz-menu-item>{{ item.label }}</nz-menu-item>
}

// 3. @switch 多分支渲染
@switch (status()) {
  @case ('online') { <span class="online">Online</span> }
  @case ('offline') { <span class="offline">Offline</span> }
  @default { <span class="unknown">Unknown</span> }
}
```

**原理**:
- 编译期优化，比`*ngIf`/`*ngFor`性能更好
- 可读性更强，不需要记忆指令名称

### 4.3 Standalone组件

**应用场景**: 组件定义，无需NgModule

```typescript
@Component({
  selector: 'app-active-list',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule],
  template: `...`
})
export class ActiveListComponent extends Pagination<NeTree> {
  // ...
}
```

**原理**:
- 组件自包含，无需 NgModule 包裹
- Tree-shaking 更优，只打包使用的依赖
- 懒加载更简单，直接导入组件即可

### 4.4 函数式守卫和拦截器

**应用场景**: 路由守卫和HTTP拦截器

```typescript
// 1. 函数式路由守卫
export const userGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

// 2. 函数式HTTP拦截器
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const service = inject(LoadingService);
  const key = `${req.method} ${req.url.split('?')[0]}`;
  service.start(key);
  return next(req).pipe(finalize(() => service.stop(key)));
};
```

**原理**:
- 更简洁的语法，不需要定义类
- 依赖注入通过`inject()`函数实现
- 更好的Tree-shaking

### 4.5 takeUntilDestroyed()

**应用场景**: 组件销毁时自动取消订阅

```typescript
// 旧方式: 需要手动管理subscription
ngOnInit() {
  this.data$.subscribe(data => this.data.set(data));
}
ngOnDestroy() {
  this.subscription.unsubscribe();
}

// 新方式: 使用显式 Subscription 管理
private subscription = new Subscription();

constructor() {
  // 注意: takeUntilDestroyed() 在 effect 内无法正确获取销毁上下文
  // 改用显式 Subscription 管理
  this.subscription.add(
    this.data$.subscribe(data => this.data.set(data))
  );
}

ngOnDestroy() {
  this.subscription.unsubscribe();
}
```

**原理**:
- `takeUntilDestroyed()`在组件销毁时自动完成Observable
- 无需手动管理subscription，避免内存泄漏

---

## 五、性能优化策略

### 5.1 框架升级收益

| 维度 | Angular 17→21 升级收益 |
|------|----------------------|
| **状态管理** | BehaviorSubject → Signal，API 更简洁、自动依赖跟踪 |
| **组件定义** | NgModule → Standalone，Tree-shaking 更优 |
| **模板语法** | `*ngIf` → `@if`，编译期优化、可读性提升 |
| **输入绑定** | `@Input()` → `input()`，Signal 原生支持 |
| **生命周期** | `ngOnDestroy` → `takeUntilDestroyed()`，内存安全 |

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

#### computed缓存计算

```typescript
// 缓存搜索过滤结果，避免重复计算
readonly filteredRows = computed(() => {
  const keyword = this.searchKeyword();
  if (!keyword) return this.origin();
  return tableFilter(keyword, this.origin(), this.cols());
});
```

### 5.3 数据级优化

#### BBOX视口裁剪

```typescript
// 只渲染视口内的设备点，10万设备→百级点位
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
```

#### 聚合显示

```typescript
// 同区域多设备合并为一个点
const count = data?.neNumOfSameMarketAndOnlineStatus || 0;
const isCluster = count > 0;
const radius = isCluster ? 12 : 6;
if (isCluster) {
  style.setText(new Text({ text: count.toString(), fill: '#fff' }));
}
```

### 5.4 网络级优化

#### 轮询控制

```typescript
// 节点监控: 60秒自动刷新
interval(60000)
  .pipe(takeUntilDestroyed(this.destroyRef), startWith(-1))
  .subscribe(() => this.refresh());
```

### 5.5 构建级优化

```typescript
// angular.json 优化配置
{
  "optimization": {
    "scripts": true,
    "styles": true,
    "fonts": true
  },
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "500kb",
      "maximumError": "1mb"
    }
  ]
}
```

---

## 六、工程化体系

### 6.1 代码质量保障

```
┌─────────────────────────────────────────────────────────┐
│                    代码质量体系                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   ESLint    │  │   Prettier  │  │  TypeScript │    │
│  │  代码规范   │  │  代码格式   │  │  类型检查   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          ▼                             │
│              ┌─────────────────────┐                   │
│              │   Husky + lint-staged│                   │
│              │   Git Hooks预提交    │                   │
│              └─────────────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.2 多环境配置

```typescript
// 环境配置
export const environment = {
  production: true,
  apiPrefix: '/hems-web-ui',
  wsPrefix: 'wss://',
};
```

### 6.3 装饰器体系

**API装饰器驱动的HTTP抽象**:

| 装饰器 | 作用 | 示例 |
|--------|------|------|
| `@BaseUrl` | 设置服务基础路径 | `@BaseUrl('/hems-web-ui/alarm')` |
| `@GET/@POST/@DELETE` | 定义 HTTP 方法和 URL 模板 | `@POST('/:type/search')` |
| `@PATH` | URL 路径参数绑定 | `@PATH('type') type: AlarmType` |
| `@QUERY` | Query String 参数绑定 | `@QUERY('id') id: number` |
| `@BODY` | Request Body 绑定 | `@BODY data: Filter` |
| `@PAYLOAD` | 序列化为 Query String | `@PAYLOAD query: AlarmQueryDto` |

### 6.4 权限码管理

**位编码常量树**:

```typescript
export const ROLE = {
  cell: {
    M: '3',
    active: {
      M: '1',
      EXPORT: { M: '1' },           // 权限码 = "311"
      maintenance: {
        general: {
          GRACEFUL: { M: '1' },     // 权限码 = "31311"
          FORCEFUL: { M: '2' },     // 权限码 = "31312"
        }
      }
    }
  },
  alarm: { M: '4', history: { M: '1', DELETE: { M: '1' } } },  // "411"
};
```

---

## 七、组件设计亮点

### 7.1 多编辑器统一管理

| 编辑器 | 用途 | 特性 |
|--------|------|------|
| Ace Editor | 日志/脚本查看 | 轻量、只读、语法高亮 |
| Monaco Editor | YAML编辑 | K8s Schema提示、智能感知 |
| vanilla-jsoneditor | JSON编辑 | 树形+代码双模式 |

### 7.2 动态NF配置面板

**7种5G网元支持**: AMF、UDM、PCF、CHF、NRF、UPF、SGW

```typescript
// 根据global.simNF动态生成Tab
const nfTabs = [
  { key: 'amf', label: 'AMF' },
  { key: 'udm', label: 'UDM' },
  { key: 'pcf', label: 'PCF' },
  { key: 'chf', label: 'CHF' },
  { key: 'nrf', label: 'NRF' },
  { key: 'upf', label: 'UPF' },
  { key: 'sgw', label: 'SGW' },
];
```

### 7.3 搜索导航系统

**AutoComplete + DOM操作**实现表单搜索导航：

```typescript
// 1. 扁平化所有表单字段路径
const pathMapToData = traverseNFConfig(formConfig);

// 2. AutoComplete搜索
<AutoComplete
  options={pathMapToData.map(p => ({ label: p.path, value: p.path }))}
  onSelect={(value) => scrollToPath(value)}
/>

// 3. DOM操作滚动到指定字段
const scrollToPath = (path: string) => {
  setActiveTab(path.split('.')[0]);
  setTimeout(() => {
    const element = document.querySelector(`[data-path="${path}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
};
```

---

## 八、面试高频问题（深度版）

### 8.1 架构设计类

#### Q1: 请介绍项目的整体架构设计

**答：** 四层架构 — API 层 (装饰器声明式 HTTP) → Core 层 (全局服务/拦截器/守卫) → Routes 层 (业务组件) → Share 层 (14 个可复用组件)。关键决策：Angular 21 Signals 状态管理、Standalone 组件按需加载、装饰器驱动的 API 服务、LRU 路由缓存。

#### Q2: LRU 路由缓存如何实现？

**答：** 实现 RouteReuseStrategy 四个方法：shouldDetach 判断是否缓存、store 存储组件引用+滚动位置、retrieve 恢复并 LRU 刷新（先删后插）、ensureCacheLimit 超 6 个销毁最老。deleteOtherModuleCache 跨模块清理。

#### Q4: 权限体系的位编码设计原理？

**答：** 树形常量树，每层节点 M 值拼接为权限码（如 311=cell>active>EXPORT）。getLeafNodesWithPath() 递归生成 Map<码, 路径>。三层控制：MenuService 菜单过滤、RedirectGuard 路由拦截、ButtonGroupComponent 按钮 ACL。

#### Q5: 声明式 API 服务的实现原理？

**答：** @axyom-ui/theme 的 BaseApi + 装饰器。@GET/@POST 定义 HTTP 方法和 URL 模板，@PATH/@QUERY/@BODY/@PAYLOAD 标记参数绑定。方法体返回 null as never，运行时 Proxy/Reflect 拦截器代理实际 HttpClient 调用。

### 8.2 技术深度类

#### Q6: Loading 状态如何精确追踪？

**答：** LoadingService 用 signal<string[]> 存储活跃请求 key。loadingInterceptor 每个请求 start/stop。getLoading(key) 用正则匹配。ButtonGroupComponent 的 CardAction.key 与请求 URL 关联，isLoading 回调自动判断。

#### Q7: 异步导出的 RxJS 操作符链？

**答：** exportNeList 返回 requestId → mergeMap 展平为轮询流 → expand 递归展开 → timer(2000) 2 秒间隔 → takeWhile 控制终止。downloadFile 通过 `<a>` 标签触发浏览器下载，零内存占用。

#### Q8: GeoHA 双活如何判断网元归属？

**答：** id % dbIdIncrement !== dbIdOffset % dbIdIncrement 则为远程网元。O(1) 无状态判断，无需查询数据库。isLocalNe() 前置拦截所有操作，远程网元弹出警告。

#### Q9: SessionStorage 装饰器的实现原理？

**答：** TypeScript 装饰器 + Object.defineProperty 重写 getter/setter。getter 从 sessionStorage 读取并 JSON.parse，setter 写入时 JSON.stringify。业务代码直接读写静态属性，完全不感知存储层。

#### Q10: 项目中 Angular 21 的新特性应用？

**答：** ① Signals (signal/computed/effect) 状态管理；② input()/input.required() Signal Inputs；③ viewChild.required()；④ @if/@for 声明式控制流；⑤ Standalone 组件无 NgModule；⑥ 函数式守卫 CanActivateFn；⑦ 函数式拦截器 HttpInterceptorFn；⑧ takeUntilDestroyed() 内置销毁管理。

### 8.3 性能优化类

#### Q11: 十万台设备的地图性能如何优化？

**答：** 四级优化：① BBOX 视口裁剪只渲染可见区域；② 聚合点合并同 Market 设备；③ dataCache 全量缓存避免重复请求；④ moveend 懒刷新避免拖拽重绘。自定义 EPSG:3857 投影 + GeoServer WMS 底图分层渲染。

#### Q12: 参数树的懒加载和搜索定位如何实现？

**答：** 懒加载：展开节点时才调用 `getParameterTree(neId, fullName)` 请求子节点，`_expand/_loading` 标志控制 UI 状态。搜索定位：`searchAndExpand()` 先折叠所有节点，然后 `expandHierarchy()` 递归逐层展开到目标路径，`setInterval` 轮询等待每层加载完成，最后 `scrollIntoView()` 平滑滚动。

#### Q13: CellBase 模板方法模式的好处？

**答：** 8 个设备详情页（General/Upgrade/Diagnostics/Parameter 等）共享路由参数解析、设备信息加载、面包屑设置逻辑。子类只需重写 `init()` 方法实现具体业务。减少约 60% 的重复代码，统一维护入口。

#### Q14: 文件下载时 Blob 错误如何处理？

**答：** authInterceptor 检测 `err.error instanceof Blob`，用 `FileReader.readAsText()` 将 Blob 转为 JSON 解析错误信息。这是处理文件下载 API 返回 JSON 错误的特殊场景（Content-Type 与实际内容不匹配）。

#### Q15: 如何保证 30+ 个 API 服务的一致性？

**答：** ① 统一继承 `BaseApi`，使用相同装饰器体系；② 每个 API 模块有独立的 `type/` 目录定义接口类型；③ `index.ts` 统一导出；④ `api/readme.md` 规范目录结构和命名；⑤ 权限码通过 `ROLE` 常量统一管理，装饰器 URL 中直接引用 `ROLE.xxx.M`。

---

## 九、技术亮点速查表

| # | 亮点 | 关键词 | 代码位置 |
|---|------|--------|----------|
| 1 | 声明式 API 服务 | 装饰器、BaseApi、类型安全 | `api/**/*.service.ts` |
| 2 | LRU 路由缓存 | RouteReuseStrategy、滚动恢复 | `customReuseStrategy.ts` |
| 3 | 位编码权限 | RBAC、ACL、三层控制 | `core/model/role.ts` |
| 4 | 十万级设备地图 | BBOX 裁剪、聚合、WMS | `routes/dashboard/osm-map/` |
| 5 | 精确 Loading | HttpInterceptor、Signal | `core/interceptor/loading.interceptor.ts` |
| 6 | SessionStorage 装饰器 | Object.defineProperty | `core/decorator/session-storage.ts` |
| 7 | STOMP WebSocket | 实时推送、强制登出 | `core/stomp.service.ts` |
| 8 | 异步导出轮询 | expand/takeWhile、流式下载 | `core/utils/download-file.ts` |
| 9 | GeoHA 双活 | ID 哈希分片、无状态判断 | `core/service/status.service.ts` |
| 10 | 分页基类泛型 | Pagination\<T\>、computed 过滤 | `core/model/page.ts` |
| 11 | 声明式表单 | FormBase、DynamicModal | `share/component/` |
| 12 | 全局搜索防抖 | BehaviorSubject、debounceTime | `page/layout/header/search/` |
| 13 | 右键菜单组合 | Composite 模式、refresh$ 通信 | `manage/active-list/*-menu.ts` |
| 14 | CellBase 模板方法 | 路由参数解析、设备信息加载 | `manage/active-list/component/cell.base.ts` |
| 15 | 参数树懒加载 | 懒加载树、WebSocket 刷新、搜索定位 | `manage/active-list/parameter/tree/` |
| 16 | 节点监控倒计时 | interval + signal 精确计时 | `routes/monitor/node/` |
| 17 | 批量任务动态表单 | 动态渲染条件字段 | `manage/bulk/` |
| 18 | 再平衡状态机 | 6 种任务状态、多策略迁移 | `manage/rebalance/` |
| 19 | Blob 错误处理 | FileReader + Blob→JSON | `core/interceptor/auth.interceptor.ts` |
| 20 | FileServerBase 配置 | 基类 + 子类动态渲染 | `routes/setting/config/file-server/` |

---

*文档生成时间：2026-05-30 | 代码版本：v20.0.0 | 总行数：1200+*
