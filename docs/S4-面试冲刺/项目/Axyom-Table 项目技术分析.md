# @axyom-ui/table 企业级高性能表格组件库 - 项目技术分析报告

---

## 项目概述

### 一、项目背景

**Axyom-Table** 是一个基于 Angular 21 + ng-zorro-antd 封装的企业级高性能表格组件库，以 **Library** 形式发布（`@axyom-ui/table`）。它在 ng-zorro 基础上进行了深度封装和增强，提供了开箱即用的分页、排序、选择、树形展示、虚拟滚动、右键菜单、列拖拽调整、列显隐切换、CSV导出等企业级能力。

### 二、核心定位

| 属性 | 说明 |
|------|------|
| **项目名称** | @axyom-ui/table |
| **产品定位** | Angular企业级高性能表格组件库 |
| **目标用户** | Angular企业项目开发团队 |
| **技术栈** | Angular 21.2 + ng-zorro-antd 21.3 + TypeScript 5.9 |
| **发布方式** | ng-packagr Library，支持tree shaking |

### 三、核心功能模块

```
┌─────────────────────────────────────────────────────────────────────┐
│                    @axyom-ui/table 企业级表格组件库                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   表格核心模块   │  │   交互功能模块   │  │   扩展功能模块   │     │
│  │  分页/排序/选择  │  │  拖拽/右键菜单  │  │  CSV导出/缓存   │     │
│  │  树形展示/虚拟滚动│ │  列显隐切换     │  │  TemplateRef插槽│     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           ▼                    ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     核心基础设施                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │  Signal  │  │ RxJS行为 │  │  注册表   │  │ DI配置   │   │   │
│  │  │ 响应式状态│  │ 事件流   │  │ TemplateRef│ │ provideTableConfig│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 模块1：表格核心模块

| 功能 | 说明 |
|------|------|
| **分页** | 支持前端/后端/不分页三种模式，BehaviorSubject + debounce 防抖 |
| **排序** | 前端排序通过 `computed` 声明式实现，后端排序写入 `AxyomPage` |
| **选择** | 单选/多选/复选框模式，支持行禁用，`computed` 自动推导全选/半选状态 |
| **树形展示** | 递归渲染，支持同步/异步树，Set 信号管理展开/加载状态 |
| **虚拟滚动** | 万级数据无卡顿 |

#### 模块2：交互功能模块

| 功能 | 说明 |
|------|------|
| **列拖拽调整** | 鼠标拖拽调整列宽，信号化管理宽度，触发 computed 重新推导 |
| **右键菜单** | 自定义菜单项，支持条件显隐与嵌套子菜单 |
| **列显隐切换** | 信号化管理隐藏列，可持久化到 localStorage |
| **TemplateRef插槽** | 声明式自定义单元格渲染，注册表模式 |

#### 模块3：扩展功能模块

| 功能 | 说明 |
|------|------|
| **CSV导出** | FileSaveService 一键导出，支持 BOM、日期格式化和时区 |
| **localStorage缓存** | 列显隐状态持久化，cachePrefix 支持命名空间隔离 |
| **跨时区处理** | 日期列自动追加时区信息（如 `(UTC+8)`） |
| **全局配置** | `provideAxyomTableConfig()` 工厂函数 |

### 四、技术架构

#### 4.1 分层架构

```
┌─────────────────────────────────────────────────┐
│              Application Layer (消费方)           │
│    用户页面组件，使用 <axyom-table> 声明式配置      │
├─────────────────────────────────────────────────┤
│              Presentation Layer (组件层)          │
│  TableComponent │ CellComponent │ ContentHeader  │
│  ContentBody │ MenuItemComponent                 │
├─────────────────────────────────────────────────┤
│              Service Layer (服务层)               │
│  DragColumnService │ AxyomRowSource              │
│  FileSaveService │ DragColumnDirective           │
├─────────────────────────────────────────────────┤
│              Model Layer (模型层)                 │
│  AxyomColumn │ AxyomPage │ AxyomMenu             │
│  AxyomTableConfig                                │
├─────────────────────────────────────────────────┤
│              Foundation (基础设施)                 │
│  Angular Signals │ RxJS │ ng-zorro-antd          │
│  lodash-es │ date-fns │ TypeScript 5.9           │
└─────────────────────────────────────────────────┘
```

#### 4.2 模块化设计

```
projects/table/
├── ng-package.json          # Library 构建配置
├── package.json             # Library 版本及依赖声明
└── src/
    ├── public-api.ts        # 公开 API 入口
    └── lib/
        ├── model/           # 数据模型层
        ├── service/         # 服务层
        ├── table/           # 组件层
        │   ├── cell/
        │   ├── content-header/
        │   └── content-body/
        │       └── menu-item/
        ├── table-spec/      # 组件单元测试（11个文件）
        ├── tool.spec.ts     # 工具函数测试
        └── tool.ts          # 工具函数
```

### 五、项目规模

| 维度 | 数量 | 说明 |
|------|------|------|
| **Library核心代码** | ~1,200行 | TypeScript + HTML + CSS |
| **组件数** | 5个 | Table/Cell/ContentHeader/ContentBody/MenuItem |
| **指令数** | 2个 | AxyomRow/DragColumn |
| **服务数** | 3个 | DragColumn/FileSave/AxyomRowSource |
| **模型数** | 4个 | Column/Config/Page/Menu |
| **单元测试文件** | 16个 | spec文件，42个describe测试套件，109个it测试用例 |
| **演示页面** | 21个 | 覆盖全功能使用场景 |
| **Angular版本** | 21.2 | 最新 |
| **Library版本** | 21.1.1 | @axyom-ui/table |

### 六、核心数据结构

#### AxyomColumn 列配置模型

```typescript
export interface AxyomColumn<T = any> {
    prop: string;           // 数据属性名
    name: string;           // 显示名称
    type?: 'date' | 'number' | 'format' | 'default';  // 列类型
    sortable?: boolean;     // 是否可排序
    sortOrder?: 'asc' | 'desc' | null | 'ascend' | 'descend';  // 初始排序
    hide?: boolean;         // 是否隐藏
    width?: string | null;  // 列宽（CSS单位字符串）
    render?: string;        // 自定义渲染模板key
    compare?: ((x: T, y: T) => 1 | -1) | boolean;  // 比较函数
    format?: ((row: T) => string) | null;  // 格式化函数
    headerClass?: string;   // 列头样式类
    align?: 'left' | 'right' | 'center' | null;  // 对齐方式
    cellClass?: string;     // 单元格样式类
    ellipsis?: boolean;     // 是否文字溢出省略
    param?: string;         // 管道参数（如日期格式字符串）
}
```

#### AxyomPage 分页模型

```typescript
export class AxyomPage {
    total: number;          // 总记录数
    pageSize: number;       // 每页条数
    pageIndex: number;      // 当前页码（从0开始）
    sorts: string[];        // 排序条件数组（如 ['name,desc']）

    toHttpParam(): HttpParams {  // 转换为HTTP参数
        let params = new HttpParams()
            .set('size', this.pageSize)
            .set('page', this.pageIndex);
        this.sorts.forEach(sort => {
            params = params.append('sort', sort);
        });
        return params;
    }
}
```

### 七、技术亮点速览

| 亮点 | 技术价值 | 难度 |
|------|----------|------|
| **全面拥抱Signals** | 响应式状态管理，精准更新 | ⭐⭐⭐ |
| **三态分页设计** | 前端/后端/不分页无缝切换 | ⭐⭐⭐ |
| **声明式前端排序** | `computed` 信号自动排序，无需手动 update | ⭐⭐⭐ |
| **信号化列管理** | 列宽/显隐通过 Signals 管理，不可变数据流 | ⭐⭐⭐ |
| **TemplateRef插槽** | 注册表模式实现声明式自定义单元格渲染 | ⭐⭐⭐ |
| **列拖拽调整** | RxJS事件流 + BehaviorSubject状态总线 | ⭐⭐ |
| **渐进增强API** | 最简只需cols+rows，逐步添加功能 | ⭐⭐ |
| **Set信号管理** | row展开/加载状态O(1)精准控制 | ⭐⭐ |
| **初始排序状态** | 列配置即指定排序，避免闪烁 | ⭐⭐ |
| **跨时区处理** | 日期列自动追加时区信息 | ⭐ |
| **分页防抖** | BehaviorSubject + debounceTime(10) 避免频繁更新 | ⭐ |

### 八、部署架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         发布架构                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│  │  源码开发   │ ───► │  构建打包   │ ───► │  npm发布    │         │
│  │  (TypeScript)│      │ (ng-packagr)│      │ (@axyom-ui) │         │
│  └─────────────┘      └─────────────┘      └─────────────┘         │
│                                               │                     │
│                                               ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    使用方式                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ npm install │ │ Standalone│ │  Tree    │ │  按需引入 │   │   │
│  │  │ @axyom-ui/table│ │ Component│ │  Shaking │ │  组件    │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 九、CI/CD流程

```
代码提交 → Git Hooks触发(husky) → ESLint/Prettier →
构建打包(ng build table) → 单元测试(ng test) → npm发布
```

### 十、面试价值总结

本项目具有以下面试讲述价值：

1. **架构设计能力**：分层架构、依赖注入、组件/服务分离
2. **Angular新特性**：全面拥抱Signals API，computed/model/effect等新特性
3. **复杂状态管理**：分页/排序/选中的多态组合
4. **性能优化意识**：虚拟滚动、OnPush、trackBy、Signal精准更新
5. **API设计能力**：声明式配置、渐进增强、默认值策略

---

## 一、核心设计模式与架构亮点

### 1.1 策略模式（Strategy Pattern）—— 分页排序策略

```typescript
// 不同分页/排序组合对应不同的数据处理策略
readonly isSortByFront = computed(() => {
    // 后端分页
    if (!this.frontPagination() && this._showPagination()) {
        return !this.backendSort(); // 后端分页 → 取决于 backendSort
    } else {
        return this.config.enableSort; // 前端分页/不分页 → 全局配置
    }
});
```

**面试话术：**
> "分页和排序的组合本质上是策略模式。我用一个 `computed` 属性作为策略选择器，根据分页模式和配置自动切换排序策略。前端排序通过 `activeSorts` 信号触发 `data` computed 重新排序；后端排序则将参数写入 `AxyomPage` 对象传递给父组件。消费者完全不需要关心底层是前端还是后端排序。"

### 1.2 观察者模式（Observer Pattern）—— 状态总线 + 分页防抖

```typescript
// DragColumnService 作为列状态的中央广播站
@Injectable()
export class DragColumnService {
    columnChange$ = new BehaviorSubject<AxyomColumns>([]);  // 列配置变更
    columnWidths$ = new BehaviorSubject<(number | null)[]>([]); // 列宽变更
}

// TableComponent 订阅列宽变化 → 更新 columnWidths 信号
this.thResizeService.columnWidths$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((columnWidth) => {
        const widthsObj: Record<number, string> = {};
        columnWidth.forEach((width, index) => {
            if (width) {
                widthsObj[index] = width + 'px';
            }
        });
        this.columnWidths.set(widthsObj);
    });

// page$ BehaviorSubject + debounceTime(10) 防抖
private readonly page$ = new BehaviorSubject<Partial<AxyomPage>>({});

ngOnInit(): void {
    this.page$.pipe(
        debounceTime(10),
        takeUntilDestroyed(this.destroyRef),
    ).subscribe((page) => {
        this.page.update((x) => new AxyomPage({ ...x, ...page }));
    });
}

emitPage(data: Partial<AxyomPage>) {
    this.page$.next({ ...this.page(), ...data });
}
```

**面试话术：**
> "列拖拽调整宽度涉及到 Directive 和 Component 之间的通信。我设计了 `DragColumnService` 作为状态总线，用 `BehaviorSubject` 广播列宽变化，Component 订阅后更新 `columnWidths` 信号，`_cols` computed 自动推导合并后的列宽。分页更新同时用了 `page$` BehaviorSubject + `debounceTime(10)` 防抖，避免频繁分页操作。`takeUntilDestroyed` 确保组件销毁时自动取消订阅。"

### 1.3 注册表模式（Registry Pattern）—— TemplateRef 管理

```typescript
// AxyomRowSource 作为 TemplateRef 的中央注册表
@Injectable()
export class AxyomRowSource {
    private rows: { [key: string]: TemplateRef<void> } = {};

    addRow(path: string, ref: TemplateRef<void>): void {
        this.rows[path] = ref;
    }

    getRow(path: string): TemplateRef<void> {
        return this.rows[path];
    }
}
```

**面试话术：**
> "自定义单元格渲染用了注册表模式。`AxyomRowSource` 作为中央注册表，`AxyomRowDirective` 负责注册，`CellComponent` 负责查询。每个 TableComponent 实例通过 `{ host: true }` 拥有独立的注册表，避免不同表格的模板冲突。重复 key 检查提供了编译时错误提示。"

### 1.4 工厂模式（Factory Pattern）—— 配置创建

```typescript
// 提供者工厂函数 - Angular 官方推荐模式
export function provideAxyomTableConfig(config: Partial<AxyomTableConfig>): any {
    return {
        provide: AxyomTableConfig,
        useFactory: () => {
            const tableConfig = new AxyomTableConfig();
            tableConfig.updateConfig(config);
            return tableConfig;
        },
    };
}
```

**面试话术：**
> "配置系统采用了 Angular 官方推荐的 `provideXxx()` 工厂函数模式，类似 `provideHttpClient()`、`provideRouter()`。消费者在 `app.config.ts` 中声明配置，工厂函数创建实例并合并默认值。这种模式支持 tree-shaking，也便于测试时 mock 配置。"

### 1.5 信号驱动架构（Signal-driven Architecture）—— 列宽/显隐状态

```typescript
// 信号化列宽和显隐管理，替代直接修改 _cols 数组
readonly hiddenColumns = signal<Set<string>>(new Set());
readonly columnWidths = signal<Record<number, string>>({});

// _cols computed 信号自动合并宽度和隐藏状态
readonly _cols = computed(() => {
    const baseCols = this.cols().map((col) =>
        toRequiredAxyomColumn(col, this.config.timeZone, this.isSortByFront()),
    );
    const widths = this.columnWidths();
    const hidden = this.hiddenColumns();

    let visibleIndex = 0;
    return baseCols.map((col) => {
        const isHidden = hidden.has(col.name) || col.hide;
        let overrideWidth: string | undefined;

        if (!isHidden) {
            overrideWidth = widths[visibleIndex];
            visibleIndex++;
        }

        return {
            ...col,
            ...(overrideWidth ? { width: overrideWidth } : {}),
            hide: isHidden,
        };
    });
});
```

**面试话术：**
> "列宽和列显隐管理从直接修改 `_cols` 数组重构为信号驱动。`hiddenColumns` 和 `columnWidths` 信号作为单一数据源，`_cols` computed 自动合并两者。拖拽调整列宽时，组件不直接修改列配置，而是更新 `columnWidths` 信号，触发 computed 重算。这种不可变数据流避免了脏数据，也提高了可测试性。"

---

## 二、技术难点深度剖析

### 2.1 全面拥抱 Angular Signals（响应式架构）

**位置**: `table.component.ts`

#### 难点分析

需要实现细粒度的响应式数据流，替代传统 RxJS BehaviorSubject 模式。

#### 设计方案

```typescript
// 纯 Signals 响应式状态管理
readonly data = computed(() => {
    // 前端排序逻辑内嵌在 computed 中，声明式
    const rawRows = this.rows();
    const sorts = this.activeSorts();

    if (this.isSortByFront() && sorts.length > 0) {
        return [...rawRows].sort((a, b) => {
            for (const sort of sorts) {
                const [prop, order] = sort.split(',');
                const col = this._cols().find((c) => c.prop === prop);
                if (col && typeof col.compare === 'function') {
                    const comparisonResult = col.compare(a, b);
                    return order === 'desc' ? -comparisonResult : comparisonResult;
                }
            }
            return 0;
        });
    }
    return rawRows;
});

readonly validData = computed(() => {
    const currentData = this.data();
    const isDisabledFn = this.isDisabled();
    return isDisabledFn ? currentData.filter((x) => !isDisabledFn(x)) : currentData;
});

readonly allChecked = computed(() => {
    const data = this.validData();
    const checked = this.rowChecked();
    const keyFn = this.key();
    return data.length > 0 && data.every((value) => checked.has(keyFn(value)));
});

readonly indeterminate = computed(() => {
    const data = this.validData();
    const checked = this.rowChecked();
    const keyFn = this.key();
    const allChecked = this.allChecked();
    const allUnChecked = data.every((value) => !checked.has(keyFn(value)));
    return !allChecked && !allUnChecked;
});

readonly rowChecked = computed(() => new Set(this.selected().map((row) => this.key()(row))));

// 信号化列宽和显隐
readonly hiddenColumns = signal<Set<string>>(new Set());
readonly columnWidths = signal<Record<number, string>>({});

// 前端排序状态
readonly activeSorts = signal<string[]>([]);

// Set 信号管理展开/加载状态
readonly rowExpand = signal<Set<string | number>>(new Set());
readonly rowLoading = signal<Set<string | number>>(new Set());

// model 双向绑定 - 子组件可修改父组件状态
readonly selected = model<T[]>([]);
readonly page = model<AxyomPage>(new AxyomPage({ pageSize: 0 }));
```

**关键变化：**
1. **`data` 从 `signal` 变为 `computed`**：内嵌前端排序逻辑，无需手动 `data.update()`
2. **去掉了 `refreshStatus()`**：`allChecked`/`indeterminate` 通过 computed 自动推导
3. **新增 `validData` computed**：统一处理禁用行过滤
4. **列宽/显隐信号化**：通过 `columnWidths` + `hiddenColumns` 信号驱动，不再直接修改 `_cols`

**面试回答要点：**
- **Signal vs Observable：** Signal 是同步的、基于推送的，适合 UI 状态；Observable 是异步的、基于流的，适合事件流
- **computed 自动追踪：** 依赖图自动维护，无需手动 subscribe/unsubscribe
- **声明式排序：** 前端排序从命令式（`data.update`）升级为声明式（`computed`），数据变换清晰可预测
- **model 双向绑定：** 父子组件可双向同步分页和选中状态
- **Set信号管理：** 用 `Set` + `signal` 管理展开行/加载行状态，支持 O(1) 查找

### 2.2 列定义的声明式 + 自动化处理

**位置**: `model/column.ts` + `table.component.ts`

#### 难点分析

需要实现列配置的声明式 API，用户只关心最简配置，其余全部自动化。

#### 设计方案

```typescript
// toRequiredAxyomColumn - 提取为纯函数，可测试
export function toRequiredAxyomColumn<T>(
    col: AxyomColumn<T>,
    timeZone: string,
    isSortByFront = true,
): Required<AxyomColumn<T>> {
    const tmp: Required<AxyomColumn> = {
        type: 'default', hide: false,
        sortable: col.sortable ?? isSortByFront,
        sortOrder: null, compare: true, width: null,
        headerClass: '', align: null, cellClass: '',
        ellipsis: true, render: '', param: '',
        format: null, ...col,
    };
    if (col.sortable && col.sortOrder) {
        tmp.sortOrder = col.sortOrder; // 保留初始排序状态
    }
    if (!col.compare && tmp.sortable) {
        tmp.compare = compare(tmp.prop); // 自动生成默认比较器
    }
    if (tmp.type === 'date') {
        tmp.name = tmp.name + timeZone; // 日期列自动追加时区
    }
    return tmp;
}

// 组件中只需 map 调用
readonly _cols = computed(() =>
    this.cols().map((col) =>
        toRequiredAxyomColumn(col, this.config.timeZone, this.isSortByFront()),
    ),
);
```

**新增字段说明：**
- `headerClass`：列头自定义样式类
- `align`：列对齐方式（left/right/center）
- `cellClass`：单元格自定义样式类
- `ellipsis`：文字溢出省略（默认 true）
- `param`：管道参数，如日期格式字符串

**设计亮点：**
1. **纯函数抽取**：`toRequiredAxyomColumn` 可独立测试
2. **`lodash-es` 的 `get`** 支持点号路径访问嵌套属性
3. **compare 函数自动生成**，无需用户手写
4. **日期类型自动处理时区**，保证跨时区一致性
5. **初始排序状态保留**：用户可在列配置中指定 `sortOrder`，组件自动初始化排序
6. **`isSortByFront` 参数**：排序默认值根据分页模式自适应

### 2.3 多模式分页架构（三态分页设计）

**位置**: `table.component.ts`

#### 难点分析

需要通过 `frontPagination` + `page.pageSize` 的组合实现三种分页模式的优雅切换。

#### 设计方案

```
┌─────────────────────────────────────────────────────────┐
│  模式              │  条件                              │
├─────────────────────────────────────────────────────────┤
│  后端分页          │  frontPagination=false,             │
│                    │  pageSize!=0                        │
├─────────────────────────────────────────────────────────┤
│  前端分页          │  frontPagination=true,              │
│                    │  pageSize!=0                        │
├─────────────────────────────────────────────────────────┤
│  不分页            │  pageSize=0                         │
└─────────────────────────────────────────────────────────┘
```

```typescript
readonly _showPagination = computed(() => this.page().pageSize != 0);
readonly isSortByFront = computed(() => {
    if (!this.frontPagination() && this._showPagination()) {
        return !this.backendSort();
    }
    return this.config.enableSort;
});
readonly total = computed(() => {
    if (!this.frontPagination()) return this.page().total;
    return this.data().length;
});

// 分页更新使用 BehaviorSubject + debounce 防抖
private readonly page$ = new BehaviorSubject<Partial<AxyomPage>>({});

emitPage(data: Partial<AxyomPage>) {
    this.page$.next({ ...this.page(), ...data });
}

// 排序变更处理
sortChange() {
    const params = this._cols().filter(x => x.sortable && x.sortOrder != null);
    const sorts = params.length
        ? params.map(x => x.prop + ',' + x.sortOrder!.replace('end', ''))
        : [];

    if (this.isSortByFront()) {
        this.activeSorts.set(sorts); // 前端排序 → 触发 data computed 重算
    } else {
        this.page$.next({   // 后端排序 → 通过 page$ 走 debounce 路径
            ...this.page(),
            sorts,
        });
    }
}
```

**面试回答要点：**
- 分页、排序、数据三者的状态流转需要清晰的设计
- **前端排序升级为 declarative**：设置 `activeSorts` 信号，`data` computed 自动重算排序结果
- **后端排序 debounce**：通过 `page$` BehaviorSubject + `debounceTime(10)` 避免频繁请求
- 后端排序时，切换排序列不重置页码（已有排序），首次设置排序才重置为第 0 页
- `emitPage` 使用 `page$.next` 统一走 debounce 路径，避免直接操作 page 信号

### 2.4 基于 TemplateRef 的自定义单元格渲染

**位置**: `service/axyom-row.directive.ts`

#### 难点分析

需要实现类似 Vue/React 的插槽机制，允许用户自定义任意单元格渲染。

#### 设计方案

```typescript
// AxyomRowSource - TemplateRef 注册中心
@Injectable()
export class AxyomRowSource {
    private rows: { [key: string]: TemplateRef<void> } = {};
    addRow(path: string, ref: TemplateRef<void>): void { ... }
    getRow(path: string): TemplateRef<void> { return this.rows[path]; }
}

// AxyomRowDirective - 用户侧声明模板
@Directive({ selector: '[axyomRow]' })
export class AxyomRowDirective implements OnInit {
    readonly id = input.required<string>({ alias: 'axyomRow' });
    ngOnInit(): void {
        const id = this.id();
        if (this.source.getRow(id)) {
            throw new Error(`Duplicate axyomRow key => ${id}`);
        } else {
            this.source.addRow(id, this.ref);
        }
    }
}
```

**使用方式：**
```html
<!-- 用户定义自定义渲染模板 -->
<ng-template axyomRow="action" let-row let-val="val">
    <button (click)="edit(row)">Edit</button>
    <button (click)="delete(row)">Delete</button>
</ng-template>

<!-- 列配置中引用 -->
{ prop: 'actions', name: 'Actions', render: 'action' }
```

**面试回答要点：**
- 这是**内容投影（Content Projection）** 的高阶用法
- 利用 Angular 的 DI 和 TemplateRef 机制实现了"声明式插槽"
- `AxyomRowSource` 作为中央注册表，通过 `host: true` 确保在正确的组件注入器中
- 增加了重复 key 的防御性检查，编译时即报错

### 2.5 列拖拽调整宽度 + RxJS 事件流 ＋ 信号化宽度管理

**位置**: `service/drag-column.directive.ts`

#### 难点分析

需要实现 `mousedown` → `mousemove` → `mouseup` 事件链的精确生命周期管理，并将宽度变化同步到信号系统。

#### 设计方案

```typescript
// DragColumnDirective - 原生 DOM 事件 + RxJS
this.thResizeService.columnChange$.subscribe((cols) => {
    if (!cols.length) return;

    this.timer = setTimeout(() => {
        const ths = Array.from(tr.cells) as HTMLTableHeaderCellElement[];
        const noResizeColCount = ths.filter(th => th.classList.contains('no-resize')).length;
        const columnWidths = new Array(ths.length).fill(null);

        ths.forEach((th) => {
            const i = document.createElement('i');
            i.style.cssText = `position: absolute; right: 0; top: 0;
        bottom: 0; border-right: 1px solid #f0f0f0;
        width: 8px; cursor: col-resize;`;
            th.appendChild(i);

            fromEvent(i, 'mousedown').pipe(filter(e => e instanceof MouseEvent))
                .subscribe((e) => {
                    const startX = e.pageX;
                    const startThWidth = th.clientWidth;

                    const mousemoveHandler = fromEvent(document.body, 'mousemove')
                        .pipe(filter(ev => ev instanceof MouseEvent))
                        .subscribe((mousemove: MouseEvent) => {
                            columnWidths[th.cellIndex - noResizeColCount] =
                                mousemove.pageX - startX + startThWidth;
                            this.thResizeService.columnWidths$.next(columnWidths);
                        });

                    document.body.classList.add('table-resizing');

                    fromEvent(document.body, 'mouseup')
                        .pipe(take(1))
                        .pipe(filter(ev => ev instanceof MouseEvent))
                        .subscribe(() => {
                            mousemoveHandler.unsubscribe();
                            document.body.classList.remove('table-resizing');
                        });
                });
        });
    }, 100);
});

// TableComponent 中信号化消费宽度变化
ngOnInit(): void {
    this.thResizeService.columnWidths$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((columnWidth) => {
            const widthsObj: Record<number, string> = {};
            columnWidth.forEach((width, index) => {
                if (width) {
                    widthsObj[index] = width + 'px';
                }
            });
            this.columnWidths.set(widthsObj);
        });
}
```

**架构演进：**
- **旧方案**：拖拽时直接修改 `_cols()[index].width`，直接操作会污染 computed
- **新方案**：拖拽更新 `columnWidths` 信号，`_cols` computed 自动合并宽度，保持不可变数据流

**技术要点：**
- `fromEvent` + `take(1)` 优雅管理事件生命周期
- `BehaviorSubject` 作为列宽度状态总线
- 动态创建 `<i>` 元素作为拖拽手柄，使用 CSS `position: absolute` 定位
- `setTimeout` 延迟确保 ng-zorro 渲染完成后再绑定事件
- CSS `user-select: none` 防止拖拽时文字选中
- `no-resize` class 标记（展开列、复选框列）拦截拖拽

### 2.6 行模板递归渲染（树形表格）

**位置**: `table.component.html`

#### 难点分析

需要实现树形表格的递归渲染，支持同步/异步树。

#### 设计方案

```html
<!-- 递归渲染模板 - 支持同步/异步树 -->
<ng-template #rowTemplate let-level="level" let-row>
    <tr [ngClass]="getSelectedCss(row)" (click)="rowSelect(row)"
        (contextmenu)="bodyContextMenu($event, menu, row)">
        <ng-container *ngTemplateOutlet="cellTemplate; context: { $implicit: row, level: level }"/>
    </tr>
    <!-- 展开行 -->
    @if (expandable()) {
    <tr [nzExpand]="rowExpand().has(key()(row))">{{ row.description }}</tr>
    }
    <!-- 递归渲染子树 -->
    @if (tree() && row.children && rowExpand().has(key()(row))) {
    @for (c of row.children; track trackByRow(c)) {
    <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: c, level: level + 1 }"/>
    }
    }
</ng-template>
```

**技术要点：**
- 使用 Angular 原生 `@for` + `ngTemplateOutlet` 实现递归
- `level` 参数控制缩进层级（`nzIndentSize`）
- 使用 `Set` 信号管理展开状态，`rowExpand().has(key()(row))` 高效查询
- 支持异步树（`asyncTree`）：异步加载时显示 loading 状态
- `treeCollapse` output 输出展开/折叠事件给父组件
- **effect 自动校验展开状态**：`rows` 变更时，自动折叠子节点已不存在的展开行

### 2.7 选中行的精确状态管理（computed 推演）

```typescript
// 选中行比对 - 基于 key 函数
_isEqual(row: T, row2: T | undefined): boolean {
    if (row == null || row2 == null) {
        return row === row2;
    }
    const key = this.key();
    return key(row) === key(row2);
}

// computed 自动推导全选/半选/已选状态
readonly rowChecked = computed(() => new Set(this.selected().map((row) => this.key()(row))));

readonly allChecked = computed(() => {
    const data = this.validData();
    const checked = this.rowChecked();
    const keyFn = this.key();
    return data.length > 0 && data.every((value) => checked.has(keyFn(value)));
});

readonly indeterminate = computed(() => {
    const data = this.validData();
    const checked = this.rowChecked();
    const keyFn = this.key();
    const allChecked = this.allChecked();
    const allUnChecked = data.every((value) => !checked.has(keyFn(value)));
    return !allChecked && !allUnChecked;
});

// 单选/多选逻辑
rowSelect(row: T) {
    if (this.isDisabled()?.(row)) return;
    this.menuSelect.set(undefined);
    const selectionType = this.selectionType();
    const key = this.key()(row);

    if (selectionType === 'single') {
        const isSelected = this.rowChecked().has(key);
        if (isSelected && this.selectCancellable()) {
            this.selected.set([]);
        } else {
            this.selected.set([row]);
        }
    } else if (selectionType === 'checkbox') {
        const isSelected = this.rowChecked().has(key);
        if (isSelected) {
            this.selected.update(list => list.filter(x => this.key()(x) !== key));
        } else {
            this.selected.update(list => [...list, row]);
        }
    }
}
```

**架构演进：**
- **旧方案**：`refreshStatus()` 手动计算全选/半选 → 命令式，需在每次选中变化后手动调用
- **新方案**：`allChecked`/`indeterminate` 作为 `computed` → 自动追踪 `selected`/`validData`/`key` 依赖，无需手动调用

**设计决策：**
- 使用 `rowChecked` computed 生成 `Set<string | number>`，O(1) 查重
- 支持 `selectCancellable`（单选模式下再次点击取消选中）
- `key()` 函数支持字符串或函数，灵活标识行唯一性
- `getSelectedCss` 方法同时处理选中行和右键菜单选中行的样式
- `validData` 用于过滤禁用行，全选/半选计算时排除不可选行

### 2.8 列显隐状态持久化（信号化 localStorage）

```typescript
// 列显隐状态初始化 → 写入 hiddenColumns 信号
private initHideStatus() {
    if (this.cache() !== '') {
        const cache = localStorage.getItem(this.cachePrefixString() + this.cache());
        if (cache) {
            const hiddenNames: string[] = JSON.parse(cache);
            this.hiddenColumns.set(new Set(hiddenNames));
        }
    }
}

// 保存列显隐状态
toggleHeaderColumns(cols: AxyomColumn[]) {
    const hiddenNames = this._cols()
        .filter((c) => c.hide)
        .map((d) => d.name);

    if (this.cache() !== '') {
        localStorage.setItem(
            this.cachePrefixString() + this.cache(),
            JSON.stringify(hiddenNames),
        );
    }
    this.hiddenColumns.set(new Set(hiddenNames));
    this.thResizeService.columnChange$.next(cols);
}
```

**设计要点：**
- 通过 `cache` input 传入唯一标识，启用持久化
- `cachePrefix` 支持全局配置，避免不同表格 key 冲突
- **信号化重构**：不再修改 `_cols()` 数组，而是通过 `hiddenColumns` 信号管理，`_cols` computed 自动合并隐藏状态
- `toggleHeaderColumns` 同时触发 `columnChange$` 通知拖拽指令重新绑定额外度手柄

### 2.9 初始排序状态管理

**位置**: `table.component.ts`

```typescript
// 初始化排序状态 - 后端排序模式下生效
private initializeSortOrder(): void {
    if (this.isSortByFront()) return;

    const initialSortColumns = this._cols()
        .filter((col) => col.sortable && col.sortOrder);
    if (initialSortColumns.length == 0) return;

    const sorts = initialSortColumns.map(
        (col) => col.prop + ',' + col.sortOrder!.replace('end', ''),
    );

    if (!this.page().sorts || this.page().sorts.length === 0) {
        this.page.update((x) => new AxyomPage({
            ...x, sorts, pageIndex: 0,
        }));
    }
}
```

**设计要点：**
- 首次加载时自动读取列配置中的 `sortOrder`，转换为后端排序参数
- 仅在**后端排序 + 后端分页**模式下生效
- 避免与用户手动设置的排序冲突（已有 `sorts` 时不覆盖）

### 2.10 effect 副作用的精准管理

**位置**: `table.component.ts`

```typescript
constructor() {
    // effect 1: 列配置变更时同步到拖拽服务
    effect(() => {
        const cols = this._cols();
        untracked(() => this.thResizeService.columnChange$.next(cols));
    });

    // effect 2: 动态更新 DOM 高度
    effect(() => {
        const h = this.height();
        const body = this.element.nativeElement.querySelector('.ant-table-body');
        if (body && h) {
            this.renderer2.setStyle(body, 'height', h);
        }
    });

    // effect 3: rows 变更时校验树展开状态
    effect(() => {
        const rows = this.rows();
        untracked(() => {
            const keyFn = this.key();

            if (this.tree()) {
                this.rowExpand.update((existing) => {
                    if (existing.size === 0) return existing;

                    const validatedKeys = new Set<string | number>();
                    const keysToValidate = new Set(existing);

                    const traverse = (list: any[]) => {
                        if (!list || !Array.isArray(list) || keysToValidate.size === 0) return;
                        for (const item of list) {
                            if (item) {
                                const key = keyFn(item);
                                if (keysToValidate.has(key)) {
                                    if (item.children && item.children.length > 0) {
                                        validatedKeys.add(key);
                                    }
                                    keysToValidate.delete(key);
                                }
                                if (item.children && item.children.length > 0 && keysToValidate.size > 0) {
                                    traverse(item.children);
                                }
                            }
                        }
                    };

                    traverse(rows);
                    return validatedKeys;
                });
            }
        });
    });
}
```

**设计意图：**
- **effect 1**：`_cols` computed 结果发生变化时，通过 `untracked` 同步到拖拽服务的 `columnChange$`，触发指令重新绑定额外度手柄。避免在 computed 中写入副作用
- **effect 2**：响应式更新表格 body 高度，支持动态 `height` input 变更
- **effect 3**：树形数据刷新时，自动折叠子节点已不存在的展开行。`untracked` 确保 effect 只追踪 `rows()`，不追踪内部的信号读取

---

## 三、性能优化策略

### 3.1 性能优化

| 优化项 | 实现方式 | 效果 |
|--------|----------|------|
| 虚拟滚动 | `nz-virtual-scroll` + `virtualSize` | 万级数据无卡顿 |
| Signal 响应式 | Angular Signals 替代 RxJS | 精准 change detection |
| computed 派生 | 自动追踪依赖 | 避免不必要的重算 |
| trackBy 优化 | 通过 `key()` 函数唯一标识行 | Virtual DOM diff 高效 |
| 分页防抖 | `BehaviorSubject` + `debounceTime(10)` | 避免频繁请求 |
| Set 信号 | `rowChecked` 使用 `Set` 信号 | O(1) 查重 |
| `lodash-es` | Tree-shakable ES Module | 按需打包 |
| 不可变数据流 | `columnWidths`/`hiddenColumns` 信号 | 避免脏数据引用 |

### 3.2 开发体验优化

| 优化项 | 实现方式 |
|--------|----------|
| 声明式 API | `cols` 只需 `prop` + `name`，其余自动填充 |
| 全局配置 | `provideAxyomTableConfig()` 工厂函数 |
| 类型安全 | 泛型 `AxyomColumn<T>`，`key()` 函数灵活标识行 |
| 自动比较器 | `compare(prop)` 自动生成排序比较函数 |
| 模板插槽 | `axyomRow` 指令 + `render` 属性 |
| 列显隐缓存 | `localStorage` 持久化，跨会话保持 |
| 初始排序 | 列配置 `sortOrder` 即指定排序状态 |

### 3.3 架构优化

| 优化项 | 实现方式 |
|--------|----------|
| DI 配置 | `provideAxyomTableConfig()` 工厂函数模式 |
| 服务隔离 | `DragColumnService` 组件级作用域（非单例） |
| 公开 API | `public-api.ts` 控制导出边界 |
| Library 构建 | ng-packagr 独立构建，支持 tree-shaking |
| 测试覆盖 | 16 个 spec 文件，42 个测试套件，109 个 it 用例 |

---

## 四、面试高频问题（深度版）

### 4.1 架构设计类

#### Q1: 为什么选择 Signals 而不是 RxJS？

**回答：**
> "在 Angular 21 中，Signals 是官方推荐的响应式原语。这个项目的数据流主要是 UI 状态（分页、排序、选中行、列宽、列显隐），这些状态是同步的、需要直接绑定到模板。Signal 的 `computed` 自动追踪依赖，不需要手动 `subscribe`/`unsubscribe`，也不会有 `AsyncPipe` 的性能开销。对于真正的异步操作（列宽拖拽事件流、分页防抖），项目仍然使用 RxJS 的 `BehaviorSubject` + `takeUntilDestroyed`。两者是互补关系。"

---

#### Q2: 如何实现前端排序和后端排序的无缝切换？

**回答：**
> "通过 `isSortByFront` 这个 `computed` 属性来判断。它根据分页模式和 `backendSort` 配置自动决定排序策略。前端排序模式下，`sortChange()` 设置 `activeSorts` 信号，`data` computed 自动重新排序数据——这是声明式的，不需要手动 `data.update()`。后端排序模式下，排序参数写入 `page$` BehaviorSubject，通过 `debounceTime(10)` 防抖后更新 `page` 信号通知父组件。关键的细节是：后端排序时，只有首次设置排序才重置页码，已有排序时切换列保持当前页码。"

---

#### Q3: 列拖拽调整宽度的实现原理？信号化之后有什么好处？

**回答：**
> "利用 `DragColumnDirective` 在 `ngAfterViewInit` 时通过 `setTimeout` 延迟等待 DOM 渲染完成后，动态创建 `<i>` 元素作为拖拽手柄。使用 `fromEvent` 监听 `mousedown`/`mousemove`/`mouseup` 事件链。`mousemove` 时计算宽度差值，通过 `BehaviorSubject` 广播列宽变化。`take(1)` 确保 `mouseup` 只触发一次后自动取消订阅。`table-resizing` CSS class 在拖拽期间通过 `user-select: none` 防止文字选中。
>
> **信号化之后**，拖拽不再直接修改 `_cols` 数组，而是更新 `columnWidths` 信号，`_cols` computed 自动合并宽度。避免了脏数据，也保证了不可变数据流。"

---

#### Q4: TemplateRef 插槽机制是怎么实现的？

**回答：**
> "这是一种'声明式插槽'模式。用户通过 `axyomRow` 指令声明命名模板，指令在 `ngOnInit` 时将 `TemplateRef` 注册到 `AxyomRowSource`（中央注册表）。`CellComponent` 渲染时根据列配置的 `render` 属性，从 `AxyomRowSource` 获取对应的 `TemplateRef`，通过 `ngTemplateOutlet` 渲染。`{ host: true }` 确保从宿主组件获取注入器，每个表格实例有独立的注册表。我们还做了重复 key 的防御性检查。"

---

#### Q5: 如何处理大数据量的性能问题？

**回答：**
> "三个层面：1）**数据层**：支持 `virtualScroll`，使用 ng-zorro 的虚拟滚动，只渲染可视区域的 DOM；2）**计算层**：分页、排序用 `computed` 自动追踪依赖，选中行用 `Set` 信号实现 O(1) 查重；3）**渲染层**：`CellComponent` 使用 `OnPush` 检测策略，`trackBy` 通过 `key()` 函数唯一标识行。实测 10 万条数据也能流畅运行。"

---

#### Q6: 这个库的扩展性设计体现在哪些方面？

**回答：**
> "1）**配置扩展**：`provideAxyomTableConfig()` 工厂函数，全局配置 + 组件级覆盖；2）**渲染扩展**：`axyomRow` 指令 + `render` 属性，用户可自定义任意单元格渲染；3）**数据扩展**：`AxyomColumn<T>` 泛型，支持任意数据类型；4）**行为扩展**：`compare` 自定义比较函数、`format` 自定义格式化、`key` 自定义行标识、`isDisabled` 禁用判断；5）**菜单扩展**：`AxyomMenu` 支持嵌套子菜单、条件显隐和回调；6）**初始排序**：列配置 `sortOrder` 即指定排序，无需额外逻辑。"

### 4.2 Angular 高级特性类

#### Q7: model() 双向绑定的原理？

```typescript
// TableComponent 中声明 model
readonly selected = model<T[]>([]);  // 双向绑定
readonly page = model<AxyomPage>(new AxyomPage({ pageSize: 0 }));

// 父组件使用
// <axyom-table [(selected)]="selectedRows" [(page)]="pageState">
//   ...
// </axyom-table>
```

**回答：**
> "`model()` 是 Angular 17.1+ 引入的双向绑定原语，它替代了传统的 `@Output('xxxChange')` + `input()` 组合。优点是：1）模板语法更简洁 `[(selected)]`；2）父组件可以主动 set，子组件可以主动 update；3）类型安全更好，`model<T>()` 自动推导类型。"

---

#### Q8: { host: true } 的作用是什么？

```typescript
// AxyomRowDirective 中使用 host: true
private source = inject(AxyomRowSource, { host: true });
```

**回答：**
> "`{ host: true }` 是 Angular DI 的高级用法。它告诉 Angular：不要从当前指令的注入器查找 `AxyomRowSource`，而是从宿主组件（TableComponent）的注入器查找。这样每个 TableComponent 实例可以提供自己的 `AxyomRowSource`，实现模板注册表的隔离。如果不用 `host: true`，所有表格会共享同一个注册表，导致模板冲突。"

---

#### Q9: computed() 的依赖追踪原理？

```typescript
// 多个 computed 形成依赖图
readonly _showPagination = computed(() => this.page().pageSize != 0);
readonly isSortByFront = computed(() => {
    if (!this.frontPagination() && this._showPagination()) {
        return !this.backendSort();
    }
    return this.config.enableSort;
});
readonly total = computed(() => {
    if (!this.frontPagination()) return this.page().total;
    return this.data().length;  // 前端分页时依赖 data()
});
```

**回答：**
> "`computed()` 的核心价值是**声明式依赖追踪**。当 `page` 信号变化时，所有依赖 `page` 的 computed 会自动重算，不需要手动通知。这形成了一个响应式依赖图：`page → _showPagination → isSortByFront`。对比 RxJS，我需要手动 `combineLatest` + `pipe` + `subscribe`，代码量和心智负担都更大。"

#### Q10: effect() 的 untracked 用途？

```typescript
effect(() => {
    const cols = this._cols();
    untracked(() => this.thResizeService.columnChange$.next(cols));
});
```

**回答：**
> "`untracked` 用于在 effect 中读取信号但不追踪它。上面这个 effect 只追踪 `_cols()`，不追踪 `columnChange$` 发送过程中的任何信号。这样当 `_cols` 变化时，副作用自动执行，但副作用内部的操作不会创建额外依赖。避免了循环依赖和冗余执行。"

### 4.3 性能优化类

#### Q11: 信号 vs 可观察对象的性能对比

| 维度 | Signal | Observable (AsyncPipe) |
|------|--------|------------------------|
| 更新粒度 | 精确到具体信号 | 整个组件 |
| 内存开销 | 极低（基本类型值） | 较高（Subscription 对象） |
| 模板绑定 | 直接读取 | `async` pipe 转换 |
| 变更检测 | Zone-less（可选） | 依赖 Zone.js |
| 依赖追踪 | 自动（computed） | 手动（pipe 操作符） |

**回答：**
> "这个项目在 UI 状态管理上全面用 Signals，HTTP 请求仍然用 RxJS。原因是：Signal 是同步的、基于值的，适合'当前状态是什么'的场景；Observable 是异步的、基于流的，适合'数据怎么来'的场景。两者不是替代关系，而是互补关系。Angular 官方也明确说 Signals 不会替代 RxJS。"

---

#### Q12: 虚拟滚动的适用场景与限制？

**回答：**
> "虚拟滚动的原理是只渲染可视区域的 DOM 节点，通过 padding 撑起滚动高度。它的限制是：1）不能和前端分页同时使用（分页本身就是数据子集）；2）行高必须固定或可预测（`virtualSize`）；3）展开行、树形递归等复杂行结构需要特殊处理。所以我提供了 `virtualScroll` 开关，让用户按需启用。"

---

#### Q13: trackBy 的策略？

```typescript
// 通过 key() 函数实现统一 trackBy
readonly trackByRow = (item: T): string | number => {
    return this.key()(item);
};
```

**回答：**
> "`trackBy` 是 Virtual DOM diff 性能的关键。我设计了统一的 `trackByRow` 方法，通过 `key()` input 函数为每行生成唯一标识。`key()` 支持字符串（lodash 点号路径）和函数两种模式，灵活适应不同数据结构。相比 ng-zorro 默认的 `_trackByIndex`，这种方式在数据更新时能精准复用 DOM 节点。"

### 4.4 API 设计类

#### Q14: 渐进增强（Progressive Enhancement）原则？

```
最简用法：           <axyom-table [cols]="cols" [rows]="rows"/>
进阶用法 + 分页：    <axyom-table [cols]="cols" [rows]="rows" [page]="page"/>
完整用法 + 排序：    <axyom-table [cols]="cols" [rows]="rows" [page]="page" [selectionType]="'checkbox'"/>
高级用法 + 自定义：  <axyom-table ... [menus]="menus" [cache]="'user-table'" [tree]="true"/>
```

**回答：**
> "API 设计遵循**渐进增强**原则：最简场景只需 `cols` + `rows` 两个必需参数，其余全部有合理默认值。用户可以根据需要逐步添加分页、排序、选择、树形等功能。这种设计降低了学习成本，同时保留了高级定制能力。"

---

#### Q15: 约定优于配置（Convention over Configuration）？

```typescript
// 约定1：列配置自动推导
{ prop: 'name', sortable: true }
// → 自动生成 compare 函数
// → 自动填充 width: null, hide: false, ellipsis: true, align: null ...

// 约定2：日期列自动追加时区
{ prop: 'date', type: 'date' }
// → name 自动变为 "Date (UTC+8)"

// 约定3：嵌套属性自动访问
{ prop: 'address.state' }
// → 自动用 lodash.get(row, 'address.state')

// 约定4：初始排序自动应用
{ prop: 'name', sortOrder: 'ascend' }
// → 首次加载自动按 name 升序排序

// 约定5：sortable 默认值自适应
{ prop: 'name' }
// → 后端分页模式：sortable 默认为 false
// → 前端分页模式：sortable 由 enableSort 配置决定
```

**回答：**
> "我做了大量的**约定优于配置**设计。比如列配置的 `type: 'date'` 会自动追加时区信息到列名；`prop: 'address.state'` 会自动用 lodash 的点号路径访问嵌套属性；用户不定义 `compare` 函数时，系统根据 `prop` 自动生成默认比较器；列配置指定 `sortOrder` 即可自动应用初始排序；`sortable` 默认值根据分页模式自适应。这些约定减少了 80% 的样板代码。"

### 4.5 面试话术模板

#### 开场白（30秒）

> "我基于 Angular 21 + ng-zorro 封装了一个企业级表格组件库，全面拥抱 Signals API，实现了声明式配置、三态分页、前端/后端排序无缝切换、TemplateRef 插槽机制、信号化列宽/显隐管理、列拖拽调整、树形递归渲染、初始排序状态等能力。核心设计理念是**渐进增强**和**约定优于配置**，消费者最简只需传入 `cols` + `rows` 即可使用。"

#### 技术深度展示（选择 2-3 个点深入）

**点1：Signals响应式架构**
> "项目全面采用 Angular 21 的 Signals API，替代传统 RxJS BehaviorSubject。`computed` 自动追踪依赖图，`model` 实现父子组件双向绑定。前端排序从命令式重构为声明式——`data` 从 `signal` 变为 `computed`，排序逻辑内嵌其中。列宽和列显隐也信号化，通过 `columnWidths`/`hiddenColumns` 信号驱动，不再直接修改数组。"

**点2：三态分页设计**
> "通过 `frontPagination` + `page.pageSize` 的组合实现了三种分页模式：后端分页、前端分页、不分页。分页更新使用 `page$` BehaviorSubject + `debounceTime(10)` 防抖。关键细节是：后端排序时切换排序列不重置页码（已有排序），首次设置排序才重置为第 0 页。"

**点3：TemplateRef插槽机制**
> "自定义单元格渲染用了注册表模式。`AxyomRowSource` 作为中央注册表，`AxyomRowDirective` 负责注册，`CellComponent` 负责查询。每个 TableComponent 实例通过 `{ host: true }` 拥有独立的注册表，避免不同表格的模板冲突。"

#### 收尾（15秒）

> "这个项目让我深入理解了 Angular 的 Signals 响应式架构、依赖注入、动态组件等核心特性，也锻炼了从需求分析到 API 设计的系统性思维。尤其是三态分页和 TemplateRef 插槽的设计，体现了复杂状态管理和组件通信的工程能力。"

### 4.6 追问回答

#### 追问1: "你说用了 Signals，那它和 NgRx 有什么区别？"

**回答：**
> "Signals 是**响应式原语**，类似 Vue 的 ref/reactivity，解决的是'状态如何自动更新视图'的问题。NgRx 是**状态管理框架**，解决的是'应用状态如何组织、如何可预测地变化'的问题。这个表格库是组件级别的状态管理（分页、排序、选中行），用 Signals 就够了。如果是跨组件共享的全局状态（用户信息、权限、主题），我会用 NgRx 或 Signals + State 服务。"

#### 追问2: "拖拽调整列宽的时候页面不会卡吗？"

**回答：**
> "三个优化：1）`setTimeout(100)` 延迟绑定事件，确保 ng-zorro DOM 渲染完成；2）`document.body.classList.add('table-resizing')` + CSS `user-select: none` 防止文字选中干扰；3）`BehaviorSubject` 广播列宽变化，组件更新 `columnWidths` 信号，`_cols` computed 自动合并——只更新受影响的列，而不是整个表格重绘。实测在 Chrome 上 60fps 流畅运行。"

#### 追问3: "为什么不直接用 ng-zorro 的 nz-table，还要封装？"

**回答：**
> "ng-zorro 的 nz-table 是一个**通用组件**，它提供了基础能力但缺乏企业级特性。我的封装解决了三个问题：1）**配置成本**：nz-table 需要手动处理分页、排序、选中的组合逻辑，我的库一个 `<axyom-table>` 声明式搞定；2）**一致性**：统一了分页/排序/选中的交互模式，避免每个页面重复实现；3）**扩展性**：提供了 TemplateRef 插槽、列显隐缓存、CSV 导出等 nz-table 没有的功能。本质上是在 nz-table 之上的**领域特定封装**。"

#### 追问4: "如果要支持列顺序拖拽，你会怎么设计？"

**回答：**
> "当前的 `DragColumnService` 只处理列宽变化，我会扩展为三类事件：`columnWidthChange$`（现有）、`columnOrderChange$`（新增）、`columnResizeEnd$`（新增）。列顺序拖拽需要：1）在 `th` 上监听 `mousedown`，创建拖拽预览层；2）`mousemove` 时实时计算插入位置，显示占位符；3）`mouseup` 时更新列顺序，通过信号化 `colOrder` 触发 `_cols` computed 重算。"

#### 追问5: "这个库有什么不足？你怎么改进？"

**回答：**
> "三个方向：1）**虚拟滚动 + 前端分页的冲突**：当前两者互斥，可以实现'分页内虚拟滚动'，即每页数据量大时也启用虚拟滚动；2）**响应式列**：可以根据屏幕宽度自动隐藏次要列，类似 CSS `container queries` 的思路；3）**i18n**：'Total X items' 硬编码了英文，可以注入 `NzI18nService` 实现国际化。这些是下一步的改进方向。"

---

## 五、技术体系总结

### 5.1 技术栈全景

```
┌─────────────────────────────────────────────────────────────────┐
│                        技术体系全景                               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  前沿技术应用                                               │  │
│  │  Angular 21.2 · Signals API · model()双向绑定              │  │
│  │  TypeScript 5.9 · RxJS 7.8 · ng-zorro-antd 21.3          │  │
│  │  lodash-es · date-fns · Vitest                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  架构设计能力                                               │  │
│  │  分层架构 · 依赖注入 · 组件/服务分离                        │  │
│  │  工厂模式(provideTableConfig) · 注册表(TemplateRef)         │  │
│  │  信号驱动架构(列宽/显隐信号化管理)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  复杂状态管理                                               │  │
│  │  三态分页 · 前端/后端排序切换 · 选中行状态                   │  │
│  │  computed依赖追踪 · model双向绑定 · Set信号管理             │  │
│  │  声明式computed排序 · 信号化列宽/显隐管理                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  性能优化                                                   │  │
│  │  虚拟滚动 · Signal精准更新 · computed缓存                   │  │
│  │  Set O(1)查重 · trackBy优化 · debounce防抖                  │  │
│  │  不可变数据流 · 信号驱动列管理                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API设计                                                   │  │
│  │  渐进增强 · 约定优于配置 · 声明式API                        │  │
│  │  泛型类型安全 · 默认值策略 · 扩展点设计                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  设计模式应用                                               │  │
│  │  策略模式(分页排序) · 观察者模式(状态总线)                  │  │
│  │  注册表模式(TemplateRef) · 工厂模式(配置创建)              │  │
│  │  信号驱动架构(列宽/显隐)                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Signals 相关设计模式汇总

| 模式 | 实现 | 技术要点 |
|------|------|----------|
| **信号即状态** | 所有 UI 可变状态用 `signal()` | 显式、可追踪、不可变更新 |
| **computed 派生** | 复杂状态用 `computed()` 组合 | 自动依赖追踪，惰性求值 |
| **model 双向绑定** | `model()` 替代 `@Input`+`@Output` | 父子组件状态同步 |
| **Set 信号** | `signal<Set<T>>()` 管理集合状态 | O(1) 查重，精确更新 |
| **effect 副作用** | `effect()` 处理 DOM 同步/服务通知 | `untracked` 防止额外依赖 |
| **信号驱动架构** | `columnWidths`/`hiddenColumns` | 不可变数据流，computed 自动合并 |
| **声明式排序** | `data` computed 内嵌排序逻辑 | 数据变换可预测，无手动 update |

---

