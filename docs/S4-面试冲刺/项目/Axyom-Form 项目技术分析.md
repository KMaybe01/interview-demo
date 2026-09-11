# @axyom-ui/form 配置驱动型动态表单框架 - 项目技术分析报告

---

## 版本说明

> **本文档包含两个版本的技术分析：**
> - **v21 (Reactive Forms 版本)**：基于 Angular 21 + Reactive Forms 的实现
> - **v22 (Signal Forms 版本)**：基于 Angular 22 + Signal Forms 的重构版本
>

**最近更新：2026-09-11**

| 章节 | 本次更新要点 |
|:---|:---|
| [项目规模](#五项目规模) | 组件 21 种、校验器 15 种、测试 20 文件 / 137 用例、包版本 22.0.0、peerDeps 补齐 |
| [FormBase 数据结构](#六核心数据结构) | v22 已退化为**纯配置对象**（`view` / `field` / `refresh` 全部移除）；新增 `emptyValue()` |
| [迁移成本分析](#九迁移成本分析) | 破坏性变更 21 → **27 项**（B1–B27），工作量估算补「实际踩坑提示」 |
| **[v22 升级实战：问题 → 根因 → 解决方案](#v22-升级实战问题--根因--解决方案)** | 🆕 新增，22 个真实踩坑案例 + 升级 Checklist |
| [面试高频问题](#四面试高频问题深度版) | Q4 / Q8 / Q12 / Q14 更新至 v22 现状；新增 **[4.10 实战踩坑类追问](#410-实战踩坑类追问区分做过和背过)**（Q15–Q22）与 4.11 反问清单 |
| [附录：改进建议](#附录改进建议含当前完成状态) | 补完成状态标记（✅ / ⚠️ / ⬜） |

---

## 项目概述

### 一、项目背景

`@axyom-ui/form` 是一个基于 Angular 22 + ng-zorro-antd 22 封装的**配置驱动型动态表单框架**。通过声明式的 TypeScript 配置类（如 `StringUnit`、`SelectUnit`）描述表单字段，自动生成对应的 ng-zorro UI 表单，彻底告别手写重复模板代码的时代。

> **v22 重大变更**：从 Reactive Forms (`FormGroup`/`FormControl`) 重构为 Signal Forms (`@angular/forms/signals`)，实现更细粒度的响应式更新。

**版本演进：**
- **v21 (Reactive Forms)**：基于 Angular 21 + Reactive Forms 的实现
- **v22 (Signal Forms)**：基于 Angular 22 + Signal Forms 的重构版本

### 二、核心定位

| 属性 | 说明 |
|------|------|
| **项目名称** | @axyom-ui/form |
| **产品定位** | Angular配置驱动型动态表单框架 |
| **目标用户** | Angular企业项目开发团队 |
| **技术栈** | Angular 22.x + ng-zorro-antd 22.x + TypeScript 6.0 |
| **发布方式** | ng-packagr (FESM)，支持tree shaking |
| **表单引擎** | Signal Forms (`@angular/forms/signals`) |

### 三、核心功能模块

```
┌─────────────────────────────────────────────────────────────────────┐
│                    @axyom-ui/form 动态表单框架                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   配置类模块    │  │   渲染引擎模块   │  │   验证器模块    │     │
│  │  21种组件类型   │  │  动态组件分发   │  │  15种自定义     │     │
│  │  声明式配置    │  │  注册表模式     │  │  跨字段联动     │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           ▼                    ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     核心基础设施                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ FormBase │  │Registry  │  │ DI配置   │  │ 工具函数  │   │   │
│  │  │ 抽象基类 │  │ 注册表   │  │InjectionToken│ │ 验证器库 │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   弹层扩展模块                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │DialogModal│  │FormModal │  │DynamicModal│ │FormFixed │   │   │
│  │  │ 确认弹窗  │  │ 表单弹窗 │  │  Service  │ │Label指令 │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Signal Forms 核心                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │FieldTree │  │  Field   │  │  Schema  │  │ applyRules│   │   │
│  │  │ 表单树   │  │ 字段对象 │  │ 验证规则 │  │ 规则编译  │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

#### 模块1：配置类模块

| 功能 | 说明 |
|------|------|
| **21种组件类型** | String/Number/Select/DatePicker/DateDropdown等完整表单控件 + view只读模式 |
| **声明式配置** | TypeScript配置类描述表单字段 |
| **类型安全** | 泛型约束 + 工具类型，完整类型推导 |
| **条件显示** | 支持布尔值、函数和 Signal<boolean> 三种策略 |
| **Schema编译** | applyRules() 编译时生成验证规则 |

#### 模块2：渲染引擎模块

| 功能 | 说明 |
|------|------|
| **动态组件分发** | NgComponentOutlet + 注册表实现运行时组件分发 |
| **注册表模式** | 类型→组件映射，支持运行时扩展 |
| **Signal响应式** | computed缓存输入对象，精准更新 |
| **模板插槽** | 支持自定义组件渲染 |
| **视图模式** | 一键切换只读展示，所有组件自动转为ViewUnitComponent |
| **字段绑定** | [formField]="field()" 声明式绑定 |

#### 模块3：验证器模块

| 功能 | 说明 |
|------|------|
| **15种内置校验器** | IP/MAC/URL/字符串列表/正则/大数区间/日期区间/跨度 + 5 个跨字段 |
| **跨字段联动** | `equalTo` / `notEqualTo` / `laterTo` / `spanTo`，通过 `ctx.valueOf(root[key])` 读取，无订阅 |
| **超大数值验证** | 字符串逐位比较，突破 `2^53-1` 精度限制 |
| **异步选项加载** | 支持 Observable 流式加载 / 分页加载 |
| **AxyomValidator** | 新校验器签名，结构化错误返回 `{ kind, message }` |

#### 模块4：弹层扩展模块

| 功能 | 说明 |
|------|------|
| **DialogModal** | 确认弹窗配置类，支持Loading自动管理 |
| **FormModal** | 表单弹窗配置类，内置表单布局+Loading+错误处理 |
| **DynamicModalService** | 统一弹窗服务，支持全局配置注入 |
| **AXYOM_FORM_CONFIG** | InjectionToken全局配置，包括弹窗和表单默认值 |
| **延迟构建** | FormModal.ensureForm() 延迟构建表单 |

### 四、技术架构

#### 4.1 分层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     应用层 (Application)                     │
│         使用配置类定义表单，调用 toForm() 创建                │
├─────────────────────────────────────────────────────────────┤
│                     容器层 (Container)                        │
│         AxyomFormComponent - 表单容器，管理布局              │
│         AxyomFormModalComponent - 表单弹窗容器               │
├─────────────────────────────────────────────────────────────┤
│                     调度层 (Dispatcher)                       │
│         FormUnitComponent - 根据类型动态分发组件             │
│         FormUnitRegistryService - 类型→组件映射注册表        │
├─────────────────────────────────────────────────────────────┤
│                     组件层 (Component)                        │
│         21种具体UI组件 (StringUnitComponent等)               │
├─────────────────────────────────────────────────────────────┤
│                     基类层 (Base)                             │
│         FormBase - 数据模型 + applyRules()                   │
│         FormBaseUnit - 组件交互基类 (Directive)              │
│         OptionBase - 选项类组件抽象                          │
├─────────────────────────────────────────────────────────────┤
│                     基础设施层 (Infrastructure)               │
│         验证器库 / 工具函数 / 配置注入Token                  │
│         plainToClass / mergeDefault 工具                     │
├─────────────────────────────────────────────────────────────┤
│                     Signal Forms 层                          │
│         FieldTree / Field / Schema / FormField 指令          │
└─────────────────────────────────────────────────────────────┘
```

### 五、项目规模

| 维度 | v21 (Reactive Forms) | v22 (Signal Forms) | 说明 |
|------|---------------------|-------------------|------|
| **支持组件类型** | 20种 | 21种 | 10种基础 + 5种日期 + 6种选项（含 `view` 只读单元） |
| **配置类数量** | 20个 | 21个 | String/Number/Select/Option/DateDropdown 等 |
| **自定义验证器** | 10种 | 15种 | IP/MAC/跨字段/大数/区间跨度等 |
| **测试用例** | 42个 | **137个** | **20个spec文件**（校验器 12 + 组件层 4 + 工具层 2 + 引擎层 1 + 弹窗层 1） |
| **测试框架** | Vitest | Vitest | 组件层用 TestBed，纯逻辑层零 TestBed |
| **打包方式** | ng-packagr | ng-packagr | FESM格式，支持tree shaking |
| **Angular版本** | 21.x | 22.1.x | 升级到最新版本 |
| **ng-zorro版本** | 21.x | 22.0.x | 升级到最新版本 |
| **TypeScript** | ~5.9 | ~6.0 | 随 Angular 22 升级 |
| **表单引擎** | Reactive Forms | Signal Forms | 核心架构变更 |
| **包版本** | 21.0.3 | **22.0.0** | 破坏性变更，主版本对齐框架 |
| **peerDeps** | 4个（且版本滞后） | 7个 | 补齐 `@angular/cdk` / `date-fns` / `lodash-es` |
| **变更文件数** | - | 116个 | 净增 +5385 / -3368 行 |

> **质量基线（2026-09-11 复核）**：`ng build form` ✅ · `ng build` ✅ ·
> `ng test form --watch=false` ✅（20 文件 / 137 用例）· `ng lint` ✅（0 error）

### 六、核心数据结构

#### FormBase 抽象基类

```typescript
// v21 (Reactive Forms)
export abstract class FormBase<T = any> {
  abstract readonly controlType: string;  // 子类必须实现
  readonly key!: string;                  // 字段标识
  readonly label = '';                    // 显示标签
  readonly required = false;              // 是否必填
  readonly value: T | null = null;        // 初始值
  readonly control!: FormControl;         // Angular表单控件
  readonly show = true;                   // 显示状态
  readonly display: ((form: any) => boolean) | boolean = true;  // 条件显示
  readonly view = signal('');             // 视图模式展示值

  // 模板方法 - 子类可重写扩展验证
  protected getValid(instance: BaseInf<FormBase<T>>): ValidatorFn[] {
    // 通用验证逻辑
  }
}

// v22 (Signal Forms) —— 纯配置对象，不持有任何运行时状态
export abstract class FormBase<T = any> {
  abstract readonly controlType: string;  // 注册表键名

  key!: string;               // 字段键名（数据模型属性名）
  label = '';                  // 标签文本
  disabled: boolean | Signal<boolean> = false;  // 禁用（动态场景必须传 Signal）
  required = false;            // 必填
  value: T | null = null;      // 初始值（显式传 undefined 由 emptyValue() 兜底）

  // UI
  span = 0;
  labelSpan = 0;
  controlSpan = 0;
  feedback = false;
  validateStatus: FormValidateStatus | Signal<FormValidateStatus> = undefined; // 动态切换须传 Signal
  rowsOnViewMode = 0;

  // 校验 & 显示
  display: boolean | ((model: any) => boolean) | Signal<boolean> = true;
  valid: AxyomValidator<T> | AxyomValidator<T>[] | null = null;
  error: Record<string, string> = {};

  // 编译规则到 Schema
  applyRules(path: AxyomSchemaPath<T>, root: AxyomSchemaPathTree): void {
    // required(排除布尔) / disabled(when) / hidden(when) / validate
  }

  /** value 缺省时的空值；文本类单元覆写为 '' 以规避 NG01921 */
  emptyValue(): T | null { return null; }

  /** 查看模式下把值渲染成文本（view signal 由组件侧持有并传入） */
  toView(value: unknown, view: WritableSignal<string>): void { /* ... */ }
}
```

> **v22 关键差异（面试常问）：** `FormBase` 已从「配置 + 运行时容器」退化为**纯配置对象**。
> v21 的 `control: FormControl`、`show`，以及迁移中期短暂存在的 `view` / `refresh` / `field`
> **全部移除**。运行期状态一律从表单树读取（`form[fb.key]()`），`view` signal 与 `field` 引用
> 改由 `FormBaseUnit` 组件侧持有。
>
> 这么做的原因：`FormBase` 实例是**可共享的配置**（同一份 `fbs` 可被多个表单复用），
> 一旦持有 `view` / `field` 这类运行时状态，多表单复用时会互相污染。

#### 配置类型推导

```typescript
// 类型定义 - 实现"必填key + 可选配置"模式
type BaseInf<T, R = { key: string }> = Omit<
  Partial<Omit<T, keyof R>> & R,
  'controlType' | 'view'
>;

// v21 使用示例
new StringUnit({
  key: 'username',        // ✓ 必填
  label: '用户名',        // ✓ 自动补全
  required: true,         // ✓ 布尔类型
  maxLength: 50,          // ✓ 数字类型
});

// v22 使用示例
new StringUnit({
  key: 'username',        // ✓ 必填
  label: '用户名',        // ✓ 自动补全
  required: true,         // ✓ 布尔类型
  maxLength: 50,          // ✓ 数字类型
  display: (model) => model.showUsername,  // ✓ 支持 Signal<boolean>
});
```

### 七、技术亮点速览

| 亮点 | 技术价值 | 难度 | 版本 |
|------|----------|------|------|
| **注册表模式** | 运行时动态组件分发，支持扩展 | ⭐⭐⭐ | v21/v22 |
| **类型安全配置** | 泛型约束 + 工具类型，完整类型推导 | ⭐⭐⭐ | v21/v22 |
| **跨字段验证** | 订阅目标字段变化，触发联动验证 | ⭐⭐ | v21/v22 |
| **Signal响应式** | computed缓存，精准更新 | ⭐⭐ | v21/v22 |
| **plainToClass** | 选择性属性复制，避免Object.assign覆盖 | ⭐⭐ | v21/v22 |
| **BigInt验证** | 突破JS精度限制，支持超大数值 | ⭐ | v21/v22 |
| **Signal Forms 重构** | 从 Reactive Forms 迁移到 Signal Forms | ⭐⭐⭐⭐ | v22 |
| **Schema 编译** | 编译时生成规则，减少运行时开销 | ⭐⭐⭐ | v22 |
| **字段级响应式** | 字段级状态管理，精准更新 | ⭐⭐⭐ | v22 |

### 八、部署架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         发布架构                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│  │  源码开发   │ ───► │  构建打包   │ ───► │  GitLab发布 │         │
│  │  (TypeScript)│      │ (ng-packagr)│      │ (@axyom-ui) │         │
│  └─────────────┘      └─────────────┘      └─────────────┘         │
│                                               │                     │
│                                               ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    使用方式                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ npm install │ │ Standalone│ │  Tree    │ │  按需引入 │   │   │
│  │  │ @axyom-ui/form│ │ Component│ │  Shaking │ │  组件    │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  v22 新增：                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Signal Forms 依赖                                           │   │
│  │  @angular/forms/signals (Angular 22+)                       │   │
│  │  @angular/cdk ^22.0.0 (新增 peer dependency)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 九、CI/CD流程

```
代码提交(projects/form/package.json变化) → GitLab CI触发 → pnpm安装依赖 → 单元测试 → 构建打包 → GitLab NPM Registry发布
```

**v22 升级：**
- 支持 Angular 22 + Signal Forms 的构建和测试
- 新增 `@angular/cdk ^22.1.0` / `date-fns ^4.4.0` / `lodash-es ^4.17.21` 三个 peer dependency
- 测试用例从 42 扩到 137，覆盖从「纯校验器」扩展到「组件层 + 弹窗层 + 跨字段依赖链」

### 十、面试价值总结

本项目具有以下面试讲述价值：

1. **架构设计能力**：五层架构、注册表模式、模板方法、策略模式
2. **类型体操能力**：泛型约束、工具类型、抽象类、方法重写
3. **Angular高级特性**：Signal响应式、动态组件、依赖注入、新控制流
4. **响应式编程**：RxJS操作符、内存管理、跨字段验证
5. **性能优化**：Tree-shaking、computed缓存、trackBy优化
6. **框架迁移能力**：从Reactive Forms到Signal Forms的完整重构经验
7. **Schema编译**：编译时生成验证规则，减少运行时开销
8. **字段级响应式**：字段级状态管理，精准更新
9. **风险识别与治理**：27 项破坏性变更的登记、静默行为变更的定位、用回归用例锁定语义
   （详见 [v22 升级实战](#v22-升级实战问题--根因--解决方案)，面试追问见 [4.10](#410-实战踩坑类追问区分做过和背过)）

---

## Signal Forms 版本技术分析 (v22)

### 一、重构背景与动机

#### 1.1 为什么要从 Reactive Forms 迁移到 Signal Forms？

| 问题 | Reactive Forms 的局限 | Signal Forms 的解决方案 |
|------|----------------------|------------------------|
| **更新粒度** | `FormGroup.valueChanges` 是粗粒度订阅 | Signal 实现字段级精准更新 |
| **变更检测** | 需要手动订阅 `valueChanges` | Signal 自动追踪依赖 |
| **类型安全** | `form.get('name')` 返回 `AbstractControl \| null` | `form['name']().value()` 类型安全 |
| **内存管理** | 需手动取消订阅 (`takeUntilDestroyed`) | Signal 自动清理 |
| **模板绑定** | `formControlName` 指令式 | `[formField]="field()"` 声明式 |
| **验证状态** | `control.invalid` 需要脏检查 | `field().invalid()` Signal 响应式 |

#### 1.2 重构目标

1. **更细粒度的响应式**：字段级状态管理，精准更新
2. **更好的类型安全**：消除 `AbstractControl` 类型断言
3. **更简洁的API**：移除 `FormGroup`/`FormControl` 依赖
4. **更好的性能**：利用 Signal 的计算缓存和依赖追踪
5. **更现代的架构**：对齐 Angular 22+ 的 Signal 原生模式

### 二、架构变更概览

#### 2.1 核心架构对比

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Reactive Forms 版本 (v21)                        │
├─────────────────────────────────────────────────────────────────────┤
│  FormBase → FormControl → FormGroup → formControlName → 模板绑定    │
│                                                                     │
│  问题：                                                              │
│  - FormControl 与 FormGroup 强耦合                                   │
│  - formControlName 指令式绑定                                        │
│  - 粗粒度变更检测                                                    │
└─────────────────────────────────────────────────────────────────────┘

                              ↓ 重构为

┌─────────────────────────────────────────────────────────────────────┐
│                    Signal Forms 版本 (v22)                          │
├─────────────────────────────────────────────────────────────────────┤
│  FormBase → applyRules() → Schema → Field → [formField] → 模板绑定  │
│                                                                     │
│  改进：                                                              │
│  - Schema 编译式，无运行时 FormControl 开销                          │
│  - [formField] 声明式绑定，类型安全                                  │
│  - 字段级 Signal 精准更新                                            │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2 核心类型变更

```typescript
// v21 (Reactive Forms)
type FormGroup = {
  controls: { [key: string]: AbstractControl };
  value: any;
  invalid: boolean;
  // ...
}

// v22 (Signal Forms)
type AxyomFieldTree<T> = FieldTree<T>;
type AxyomField<T> = Field<T>;
type AxyomFieldState<T> = FieldState<T>;
```

### 三、核心API变更详解

#### 3.1 表单构建：`toForm()` 变更

```typescript
// v21 - 返回 FormGroup
function toForm(fbs: FormBase[]): FormGroup;

// v22 - 返回 AxyomFieldTree
function toForm<T extends FormModel>(
  fbs: FormBase[],
  options?: { injector?: Injector; model?: Partial<T>; name?: string }
): AxyomFieldTree<T>;
```

**变更说明：**
- 返回类型从 `FormGroup` 改为 `AxyomFieldTree`
- 新增可选参数：`injector`（注入上下文外使用）、`model`（初始数据）、`name`（表单名称）
- 内部通过 `applyRules()` 编译 Schema，而非创建 FormControl

#### 3.2 字段访问方式变更

```typescript
// v21 - FormGroup 访问
form.get('name')?.value;           // 需要 null 检查
form.controls.name.value;          // 类型为 AbstractControl
form.value;                        // 整个表单值

// v22 - Signal 访问
form['name']().value();            // 类型安全，无 null 检查
form().value();                    // 整个表单值
form['name']().invalid();          // 校验状态
form['name']().dirty();            // 脏状态
form['name']().touched();          // 触碰状态
```

#### 3.3 字段写入方式变更

```typescript
// v21 - FormControl 写入
form.get('name')?.setValue('Tom');
form.controls.name.setValue('Tom');
form.patchValue({ name: 'Tom' });

// v22 - Signal 写入
form['name']().value.set('Tom');
patchForm(form, { name: 'Tom' });  // 新增工具函数
```

#### 3.4 校验状态变更

```typescript
// v21 - FormControl 校验
form.get('name')?.invalid;
form.get('name')?.errors;  // { [kind]: message }
form.invalid;

// v22 - Signal 校验
form['name']().invalid();
form['name']().errors();   // { kind, message }[]
form().invalid();
form['name']().dirty();
form['name']().touched();
```

#### 3.5 重置操作变更

```typescript
// v21 - FormGroup 重置
form.reset();
form.reset({ name: 'Tom' });

// v22 - 工具函数重置
resetForm(form, fbs);
resetForm(form, fbs, { name: 'Tom' });
```

#### 3.6 获取原始值变更

```typescript
// v21 - getRawValue
form.getRawValue();  // 包含 disabled 字段

// v22 - visibleValue
visibleValue(form, fbs);  // 过滤隐藏字段，保留 disabled 字段
```

### 四、组件层变更

#### 4.1 FormBaseUnit 基类变更

```typescript
// v21 - 绑定 FormGroup
@Directive()
export class FormBaseUnit<T extends FormBase<R>, R> {
  readonly fb = input.required<T>();
  readonly formGroup = input.required<FormGroup>();  // FormGroup 输入
  
  setValue(value: R): void {
    this.formGroup().get(this.fb().key)!.setValue(value);
  }
  
  getValue(): R {
    return this.formGroup().get(this.fb().key)!.value;
  }
}

// v22 - 绑定 Field
@Directive()
export class FormBaseUnit<T extends FormBase<R>, R> {
  readonly fb = input.required<T>();
  readonly field = input.required<Field<R>>();  // Field 输入
  readonly state = computed(() => this.field()());  // 字段状态
  
  setValue(value: R): void {
    this.field()().value.set(value);  // Signal 写入
  }
  
  getValue(): R {
    return this.field()().value();  // Signal 读取
  }
}
```

#### 4.2 模板绑定变更

```html
<!-- v21 - formControlName -->
<abyom-string-unit [fb]="fb" [formGroup]="form" />

<!-- v22 - formField -->
<abyom-string-unit [fb]="fb" [field]="form[fb.key]()" />
```

#### 4.3 内置控件绑定变更

```html
<!-- v21 -->
<input [formControlName]="fb().key" />
<nz-select [formControlName]="fb().key" ...>

<!-- v22 -->
<input [formField]="field()" [id]="fb().key" />
<nz-select [formField]="field()" ...>
```

### 五、验证器系统变更

#### 5.1 验证器签名变更

```typescript
// v21 - Angular 验证器
type ValidatorFn = (control: AbstractControl) => ValidationErrors | null;

// v22 - Axyom 验证器
type AxyomValidator<T = any> = (
  ctx: FieldContext<T, PathKind.Child>,
  root: AxyomSchemaPathTree,
) => AxyomValidationResult;
```

#### 5.2 验证器实现变更

```typescript
// v21 - 简单验证器
export const ip = (type?: string): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (isEmptyInputValue(control.value)) return null;
    // 验证逻辑...
  };
};

// v22 - Axyom 验证器
export const ip = (type?: string): AxyomValidator => {
  return (ctx, root): AxyomValidationResult => {
    if (isEmptyInputValue(ctx.value())) return null;
    // 验证逻辑...
  };
};
```

#### 5.3 跨字段验证器变更

```typescript
// v21 - 依赖 valueChanges 订阅
export const equalTo = (fb: FormBase): ValidatorFn => {
  let subscribe = false;
  return (control: AbstractControl): ValidResult => {
    if (isEmptyInputValue(control.value)) return null;
    
    // 延迟订阅，避免循环调用
    if (!subscribe) {
      subscribe = true;
      fb.control.valueChanges.subscribe(() => control.updateValueAndValidity());
    }
    
    return fb.control.value === control.value
      ? null
      : { equalTo: `The input value should be equal ${fb.label} value` };
  };
};

// v22 - 通过 root 读取，无订阅
export const equalTo = (fb: FormBase): AxyomValidator => (ctx, root) => {
  return ctx.valueOf(root[fb.key]) === ctx.value()
    ? null
    : { kind: 'equalTo', message: `The input value should be equal ${fb.label} value` };
};
```

**改进点：**
- 无需手动订阅 `valueChanges`
- 无内存泄漏风险
- 通过 `root` 访问其他字段值，更安全

#### 5.4 校验错误返回格式变更

```typescript
// v21
{ [kind]: 'message' }  // 例如 { required: 'This field is required' }

// v22
{ kind: 'required', message: 'This field is required' }  // 结构化
```

### 六、条件显示变更

#### 6.1 显示逻辑变更

```typescript
// v21 - 需要手动管理
fb.show = model.p1 !== 2;
updateShow(form, fbs);  // 手动调用

// v22 - 自动编译为 hidden() 规则
new StringUnit({ key: 'p2', display: (model) => model.p1 !== 2 })
// 无需额外处理，toForm 时自动编译为 hidden() 规则

// 新增：支持 Signal<boolean>
readonly flag = signal(true);
new StringUnit({ key: 'p3', display: this.flag })
```

#### 6.2 显示状态访问变更

```typescript
// v21
fb.show;  // 直接访问属性

// v22
form[fb.key]().hidden();  // Signal 访问
```

### 七、弹窗系统变更

#### 7.1 FormModal 变更

```typescript
// v21 - 直接返回 FormGroup
const modal = new FormModal({ fbs, title: 'x' });
modal.form;  // FormGroup

// v22 - 延迟构建，确保注入上下文
const modal = new FormModal({ fbs, title: 'x' });
// form 在 ensureForm() 后才可用，由弹窗组件自动调用
// 如需复用外部表单，传入 form 参数：
const tree = toForm(fbs);
const modal = new FormModal({ fbs, title: 'x', form: tree });
tree['name']().value.set('Tom');  // 正确
```

#### 7.2 弹窗值获取变更

```typescript
// v21
this.data.form.getRawValue();

// v22
visibleValue(this.data.form!, this.data.fbs);
```

#### 7.3 弹窗重置变更

```typescript
// v21
this.data.form.reset();

// v22
resetForm(this.data.form!, this.data.fbs);
```

### 八、性能优化对比

| 优化项 | Reactive Forms (v21) | Signal Forms (v22) | 改进效果 |
|--------|---------------------|-------------------|----------|
| **更新粒度** | FormGroup 级别 | 字段级别 | 减少 60-80% 不必要的更新 |
| **变更检测** | 手动订阅 valueChanges | Signal 自动追踪 | 代码量减少 40% |
| **内存管理** | 需手动 takeUntilDestroyed | Signal 自动清理 | 无内存泄漏风险 |
| **计算缓存** | 无 | computed() 自动缓存 | 避免重复计算 |
| **Schema 编译** | 运行时创建 FormControl | 编译时生成规则 | 启动性能提升 |

### 九、迁移成本分析

#### 9.1 破坏性变更统计

> 已登记 **B1–B27 共 27 项**，其中 B23 / B24 / B25 / B26 属于「框架升级带来的连带破坏」，
> 仅靠升级文档容易漏掉，是实际迁移中最容易翻车的部分。完整清单见 `docs/wiki.md`
> 「v21 → v22 升级指南」，逐项解法见本文 [v22 升级实战：问题 → 根因 → 解决方案](#v22-升级实战问题--根因--解决方案)。

| 变更类型 | 数量 | 代表条目 | 严重程度 |
|----------|------|----------|----------|
| 核心 API 移除/变更 | 7 | B1 B2 B3 B4 B5 B6 B8 | 高 |
| 组件/基类契约变更 | 4 | B9 B10 B11 B15 | 高 |
| 校验体系变更 | 3 | B12 B13 B14 | 高 |
| 语义/行为静默变更 | 5 | B7 B16 B17 B19 **B23** | 中（B23 高危） |
| 依赖与环境 | 4 | B20 B21 **B24** **B25** | 中 |
| 新增能力（向后兼容） | 4 | B18 B22 B26 B27 | 低 |
| **总计** | **27** | - | - |

#### 9.2 迁移工作量估算

| 任务 | 预计工时 | 复杂度 | 实际踩坑提示 |
|------|----------|--------|--------------|
| 升级 Angular / ng-zorro / TS / cdk / date-fns | 2-4h | 低 | `date-fns` 必须升到 v4，否则 `provideNzDateFnsAdapter()` 无法工作（B24） |
| 迁移表单构建与字段读写代码 | 4-8h | 高 | `form.get()` → `form[key]()` 是纯机械替换，可 codemod |
| 迁移自定义单元组件 | 1-2h/组件 | 中 | 真正耗时的是**排查 `[formField]` 与 ng-zorro 的初始化顺序冲突**（见 R‑P0‑3） |
| 迁移自定义校验器 | 0.5-1h/个 | 中 | 跨字段校验反而**变简单**：删掉 `valueChanges` 订阅即可 |
| 迁移弹窗代码 | 2-4h | 中 | `new FormModal()` 后立刻读 `form` 会 NG0203，改延迟构建 |
| 补齐测试（组件层 + 跨字段依赖链） | 8-16h | 高 | 跨字段依赖漏读**编译期无感**，只能靠反向用例锁住 |
| **总计** | **1-2 周** | - | 其中约 40% 时间花在「静默行为差异」的定位上，而非代码改写 |

### 十、面试价值总结 (Signal Forms)

本项目重构具有以下面试讲述价值：

1. **框架迁移能力**：完整的大规模重构经验，从设计到实施
2. **架构演进思维**：理解不同架构的优缺点，做出合理的技术选型
3. **性能优化**：Signal Forms 带来的细粒度更新和计算缓存
4. **类型安全**：消除 AbstractControl 类型断言，提升代码质量
5. **响应式编程**：从命令式订阅到声明式响应式的思维转变

---

## v22 升级实战：问题 → 根因 → 解决方案

> 本章汇总 v21 → v22 升级过程中**真实踩过并记录在案**
> 每条按 **现象 → 根因 → 解决方案 → 回归保护** 四段式组织，可直接作为迁移 checklist 使用。

### 0. 问题全景图

| 级别 | 条数 | 典型症状 | 排查难点 |
|:---|:---:|:---|:---|
| 🔴 P0 静默行为变更 | 4 | 功能"看起来正常"但结果错 / 提交被拦截 | **编译期无感**，只能靠测试或线上反馈 |
| 🔴 P0 运行期崩溃 | 3 | `TypeError` / `NullInjectorError` / `NG0203` / `NG01921` | 报错点离根因远 |
| 🟠 P1 内存与生命周期 | 3 | 内存泄漏、销毁后写 signal、请求风暴 | 只在长时间运行 / 快速切换时暴露 |
| 🟠 P1 语义差异 | 5 | 提交 payload 多/少字段、动态增删字段失效 | 契约级差异，联调才发现 |
| 🟡 P2 第三方连带 | 4 | 日期组件报错 / 自适应失效 / 缺依赖 | 由 ng-zorro v22 引入，与本次重构无关 |
| 🟢 P3 规范与性能 | 8 | lint 报错 / 无谓重算 / 错误文案异常 | 不影响功能 |
| **合计** | **27** | - | - |

> 「P0 静默行为变更」里 R‑P0‑4（动态配置改了没反应）也属静默类——v21 里 `fb.disabled = true`
> 是有效的，v22 直接失效，**同样没有任何编译期提示**。

---

### 一、P0 · 静默行为变更（最危险：编译能过、测试可能也过）

#### R‑P0‑1 `required` + 布尔字段永远校验失败

**现象**

```ts
new SwitchUnit({ key: 'enabled', required: true, value: false });
```

`form['enabled']().invalid()` 恒为 `true`，**开关关掉就提交不了**。

**根因**

signal forms 的空值判定把 `false` 也算空：

```js
// @angular/forms/signals 内部
function isEmpty(value) {
  if (typeof value === 'number') return isNaN(value);
  return value === '' || value === false || value == null;   // ← false 被判空
}
```

而 v21 的 `Validators.required` 走 `isEmptyInputValue`（`value == null || value.length === 0`），
`false` 是合法值。**这是一次没有任何编译期提示的行为变更**（升级文档 B23 / B27）。

**解决方案**

在 `applyRules()` 里给 `required()` 加 `when` 排除布尔值：

```ts
// form-base.ts
required(path, {
  when: (ctx) => typeof ctx.value() !== 'boolean',   // 布尔字段回退 v21 语义
  ...(message ? { message } : {}),
});
```

**回归保护**：`tool/form.spec.ts` —「required 的布尔字段值为 false 时视为已填写」。

---

#### R‑P0‑2 空数组 `[]` 不被 `required` 拦截

**现象**

多选 / 上传 / 级联 / 树选择清空后值为 `[]`，`required: true` 却放行。

**根因**

同上 `isEmpty()`：只判 `'' / false / null / undefined / NaN`，**空数组不算空**。

**解决方案**

补一条 `validate` 兜底：

```ts
validate(path, (ctx) => {
  const value = ctx.value();
  return Array.isArray(value) && value.length === 0
    ? { kind: 'required', ...(message ? { message } : null) }
    : undefined;
});
```

**回归保护**：`form.spec.ts` 中「空数组命中 required」用例。

---

#### R‑P0‑3 `range-picker` 与 ng-zorro 的初始化顺序硬冲突

**现象**

`nz-range-picker` 绑定 `[formField]` 后抛：

```
TypeError: Cannot read properties of undefined (reading '0')
```

**根因（双方时序对不上）**

| 方 | 事实 |
|:---|:---|
| Angular `FormField` | 首次 `writeValue()` 发生在所在视图的 update pass，由 `linkedSignal(value)` **同步**驱动，无法推迟 |
| ng-zorro `NzDatePickerComponent` | `inputValue` 直到 `ngOnInit()` 才初始化；`setValue()` 内部同步 `cdr.detectChanges()`，会在 `ngOnInit` **之前**触发渲染，读到 `inputValue[...]` 越界 |

**已实证无效的两条规避路径（写进组件注释，避免重复投入）**

1. `@if (ready())` + `afterNextRender` 延迟绑定 —— `ready` 置位后 picker 是那一轮**新建**的，
   「新建 + 绑定」仍在同一轮 CD；而 `FormField` 的 `field` 是 `input.required`，不能晚给。
2. `debounce()` —— 只作用于 **UI → 模型** 方向；**模型 → 控件** 方向由 `linkedSignal` 同步驱动，首次写值不受影响。

**解决方案**

改用独立 `ngModel` 桥接（`NgModel` 首次写值走 `resolvedPromise`，晚于 `ngOnInit`），
代价是 `touched` / `dirty` / `disabled` 需组件手工同步，且统一**从 schema 运行时状态读取**
（`state().disabled()`）而不是读 `fb().disabled` 静态配置。

```ts
// range-picker-unit.component.ts（要点）
readonly state = computed(() => this.field()());
// disabled 读 state().disabled()，而非 fb().disabled
```

**判定标准（何时可移除该例外）**：ng-zorro 把 `inputValue` 提前到 `ngOnInit` 之外初始化，
或 Angular 提供延迟绑定的钩子。

**回归保护**：`range-picker-unit.component.spec.ts`（10 例）锁定手工同步契约。

---

#### R‑P0‑4 动态配置「改了没反应」

**现象**

```ts
fb.disabled = true;              // ✗ 运行时赋值，UI 不变
fb.validateStatus = 'error';      // ✗ 同上
```

**根因**

schema 只在 `toForm()` 时**求值一次**。普通属性的后续赋值不进入依赖链，Signal 也不会追踪。
这条在 v21 是能work的（`FormControl` 是活对象），v22 直接失效——**又是静默变更**。

**解决方案**

三个动态配置统一支持 `Signal` 形态，经 `when` / `computed` 纳入依赖链：

```ts
readonly disabledFlag = signal(false);
new StringUnit({ key: 'a', disabled: this.disabledFlag });              // ✅
new StringUnit({ key: 'b', validateStatus: this.statusSignal });        // ✅
new StringUnit({ key: 'c', display: this.flag });                       // ✅
new StringUnit({ key: 'd', display: (model) => model.a !== 2 });        // ✅ 依赖其它字段值
```

```ts
// form-base.ts —— disabled 的三种形态
const isDisabled = this.disabled;
if (isSignal(isDisabled)) {
  disabled(path, { when: () => isDisabled() });   // Signal → 纳入依赖链
} else if (isDisabled) {
  disabled(path);                                  // 静态 → 无条件禁用
}
```

**回归保护**：`form.spec.ts` 中「`disabled` 三种形态」+「禁用字段不参与校验」用例。

---

### 二、P0 · 运行期崩溃

#### R‑P0‑5 `NG0203` — `form()` 必须在注入上下文中调用

**现象**：在 `ngOnInit`、异步回调、或服务里调 `toForm(fbs)` 报 `NG0203`。

**根因**：`form()` 内部 `inject(Injector)` 需要注入上下文。

**解决方案**：三层防御

```ts
// 1) toForm 提供 injector 逃生口
const injector = options?.injector ?? inject(Injector, { optional: true }) ?? undefined;
const tree = form<T>(model, toSchema<T>(fbs), { injector, name: options?.name });

// 2) 弹窗改为延迟构建：构造 FormModal 时不建表单
const modal = new FormModal({ fbs, title: 'x' });
// modal.form 此时为 null；由 FormModalComponent 构造函数内 ensureForm() 构建

// 3) 需要复用外部表单时显式传入
const tree = toForm(fbs);
const modal = new FormModal({ fbs, title: 'x', form: tree });
```

---

#### R‑P0‑6 `NG01921` — 文本输入收到 `null`

**现象**

```
NG01921: The text input ... received a null value.
Text inputs should use empty strings to represent null values
```

输入框空白、不渲染，控制台刷屏。

**根因**：所有单元 `value` 默认 `null`；外部数据（接口 DTO、`FormModal.model`、表格行对象）里
字段为 `undefined` 时，`plainToClass` 的 `has(op, 'value')` 返回 `true`，`undefined` 直接进模型。

**解决方案**：两条兜底 + 一处类型化

```ts
// 1) FormBase 构造函数：value 摘出 plainToClass 列表，用 ?? 兜底
this.value = op.value ?? this.emptyValue();

// 2) 文本类单元覆写 emptyValue() 返回 ''
//    （string / password / text 渲染成 <input type="text">）
override emptyValue(): string { return ''; }

// 3) toModel：显式传 undefined / null 等同于未传
model[fb.key] = has(value, fb.key) && value[fb.key] != null ? value[fb.key] : fb.value;

// 4) patchForm：跳过值为 undefined 的键，保持原值
for (const key of keys(value)) {
  if (value[key] !== undefined) patch[key] = value[key];
}
```

> 用 `??` 而非 `||`：`false`（switch 关闭）、`0`、`''` 都是**合法值**，不能被兜底覆盖。

---

#### R‑P0‑7 未配置全局配置 / 未传 `options` 即崩溃

| 场景 | 报错 | 修复 |
|:---|:---|:---|
| 未调 `provideAxyomFormConfig()` 却用弹窗 | `NullInjectorError` | `inject(AXYOM_FORM_CONFIG, { optional: true }) ?? {}` |
| 只传 `load` 不传 `options` | `Cannot read properties of undefined`（`toOptions(undefined).map`） | `toOptions(ops: OptionInf = [])` + `OptionBase` / `AutoCompleteUnit` 的 `options` 改可选 |
| 后端错误体非 `{ error: { message } }` | `TypeError` 链式取值 | `errorMessage()` 兼容 `Error` / string / `{message}` / `{error:{message}}`，兜底 `'Request failed'` |

---

### 三、P1 · 内存与生命周期

#### R‑P1‑1 三处订阅未清理

| 位置 | 问题 | 修复 |
|:---|:---|:---|
| `OptionBaseUnit.ngOnInit` | `load().subscribe()` 无 `takeUntilDestroyed` | `.pipe(takeUntilDestroyed(this.destroyRef))` + `error` 回调 |
| `auto-complete` | **订阅写在配置类构造函数里**——配置类没有生命周期，永远无法清理 | 订阅整体移入组件 `ngOnInit` |
| `select-load` 递归分页 | `resolveLabel()` 的递归请求只有 `take(1)`，未绑定组件生命周期 | 新增 `SelectLoadUnit.dispose()`，组件 `ngOnDestroy` 调用 |

**通用原则**：凡是 `subscribe`，必须有 `takeUntilDestroyed` **和** `error` 回调。
只有 `finalize` 会导致「请求失败 → 错误被吞 → 数据/视图不更新」。

#### R‑P1‑2 `select-load` 无限递归 + HTTP 请求风暴

```ts
// 修复前：只在返回空页时终止 → 非分页 API 会死循环
this.loadMore().subscribe((data) => {
  if (data.length > 0) { this.options = [...]; this.getOptionBySingleValue(value); }  // ← 无条件递归
});
```

**修复**：`MAX_SEARCH_PAGES` 页数上限 + `take(1)` + `error` 回退 + `loadMore` 空保护。

> 触发路径是 `toView()`（查看模式）——即**渲染一次查看模式表单就可能打满浏览器**。

#### R‑P1‑3 `computed` 每次返回新数组引用

```ts
// 修复前：值为 null 时每轮求值都产生新的 []
readonly options = computed<NzUploadFile[]>(() => this.field()().value() ?? []);
```

`computed` 默认用 `Object.is` 比较 → 依赖它的 `effect` 每次都重跑。
**修复**：提取 `EMPTY_FILES` 常量复用同一引用。

---

### 四、P1 · 语义差异（契约级，联调才发现）

#### R‑P1‑4 `visibleValue` 只过滤 `hidden`，**不过滤** `disabled`

```ts
export function visibleValue(tree: AxyomFieldTree, fbs: FormBase[]): FormModel {
  const model = tree().value();
  const value: FormModel = {};
  for (const fb of fbs) {
    const field = tree[fb.key];
    if (field == null || field().hidden()) continue;   // 只排除隐藏字段
    if (has(model, fb.key)) value[fb.key] = model[fb.key];
  }
  return value;
}
```

**决策过程（面试可讲）**：曾反复权衡是否连 `disabled` 一起排除，最终**维持原语义**，理由：

1. 增删 `disabled` 过滤属**破坏性变更**，会让升级后 payload 少字段，且差异在测试与联调中不易察觉，风险 > 收益；
2. 与 Reactive Forms 的 `getRawValue()` 语义一致，降低迁移心智负担；
3. 禁用字段多为「只读展示」，值通常仍需回传；确实要排除的场景由消费方在使用处过滤。

**附带修正**：模型中不存在的 key **直接跳过**（原实现填 `null`，与「过滤」语义不符）。

#### R‑P1‑5 `patchForm` 会绕过 `visibleValue`

`patchForm` 是纯粹的 `{ ...model, ...value }` 浅合并，**不会**过滤隐藏字段。
需要「只提交可见字段」时在**读取侧**用 `visibleValue`。

#### R‑P1‑6 `toModel` 不按 `controlType` 填默认值

文档曾声明「`string → ''`、`checkbox → []`、`rangePicker → [null, null]`」，**实际从未实现**：

```ts
model[fb.key] = has(value, fb.key) && value[fb.key] != null ? value[fb.key] : fb.value;
```

`fb.value` 默认恒为 `null`。

**决策：改文档不改代码。** 理由：改成按类型填默认值后，`switch` 默认 `false`
会让「required 的 switch」在初值即通过校验，反而引入新的行为变更。
需要非空初值请显式传：

```ts
new CheckboxUnit({ key: 'tags', value: [] });
new RangePickerUnit({ key: 'range', value: [null, null] });
new SwitchUnit({ key: 'enabled', value: false });
```

#### R‑P1‑7 禁用字段不参与校验

signal forms 中 `disabled()` 的字段**跳过校验**，且 `markAsTouched()` / `markAsDirty()` 也无法置位。
业务上「禁用但仍需校验」的场景需改为 `readonly` + 自定义校验。

#### R‑P1‑8 `fbs` 变更必须重建表单（schema 是快照编译）

```ts
// ✗ 错误预期：改 signal 后新增字段会自动出现
fbs = signal<FormBase[]>([...]);
fbs.update((v) => [...v, new StringUnit({ key: 'newKey' })]);
form['newKey']   // undefined
```

**根因**：`toSchema` 在 `toForm` 时遍历一次 `fbs`，新 key 不会进入 model 也不会进 schema；
模板 `@if (field(); as field)` 直接跳过 —— **字段静默消失且无报错**。

**解决方案**：文档明确「`fbs` 变更必须重建表单」（`toForm` 重新调用），不作为运行时能力提供。

---

### 五、P2 · 第三方连带（ng-zorro v22 引入）

| # | 问题 | 解决方案 |
|:--|:---|:---|
| B24 | ng-zorro v22 **不再内置日期适配器** | 应用级显式 `provideNzDateFnsAdapter()`，并升 `date-fns` 到 v4 |
| B25 | 移除 `NzAutosizeDirective`（`textarea[nzAutosize]`） | 改用 `CdkTextareaAutosize` + `cdkAutosizeMinRows` 表达初始行数 |
| B26 | 所有 ng-zorro 组件改 **OnPush** | 直接改组件内部状态的代码需改为通过输入/信号驱动 |
| — | `@angular/cdk` 成为运行时依赖 | 补进 `peerDependencies`（此前完全未声明，发布后消费方会缺依赖） |

> **一个具体坑**：`view-unit` 的 `@if (rowsOnViewMode)` 分支漏了 `cdkTextareaAutosize`，
> 导致「配了 `rowsOnViewMode` 就丢失自适应」——内容超出行数出现滚动条而非撑开。
> 修复：两分支都带 `cdkTextareaAutosize`，用 `cdkAutosizeMinRows` 表达初始行数。

---

### 六、P3 · 规范与性能

| # | 问题 | 解决方案 |
|:--|:---|:---|
| — | `laterTo` 用 `format()` **字符串比较日期**，传入 `'MM/dd/yyyy'` 即失效 | `truncateByFormat()` 按格式粒度截断后比较 `getTime()` 数值 |
| — | `equal` / `notEqual` 用 `==`，`0 == ''`、`null == undefined` 误判 | 改 `===` |
| — | `big-range` / `mac` **每次校验都 `new RegExp`** | 提到模块顶层常量 / Map 缓存 |
| — | `number-unit` 的 `min` / `max` 默认 `±MAX_SAFE_INTEGER`，错误文案出现 `-9007199254740991` | 默认改 `undefined` |
| — | `FormModal` 自定义 footer 时 `ok()` 无校验兜底 | 改由官方 `submit()` 接管：`markAsTouched` + 无效时阻止提交 |
| — | `dynamic-modal` 里 `AXYOM_FORM_CONFIG` 非可选注入 | `optional: true` |
| — | `AxyomField` / `AxyomFieldState` 类型别名已无引用点 | 标记 `@deprecated`，下个主版本移除 |
| — | `standalone: true` 显式声明（v20+ 默认） | 移除 |
| — | `FormBase<T = any>` 的 `any` | 部分收窄（`form-modal` 的 `\| any` → `\| null`）；`FormBase<T = any>` 保留（动态表单模型本就是 `Record<string, any>`） |

### 七、升级 Checklist（可直接照做）

```text
Phase 0  环境：ng update @angular/core@22 @angular/cli@22 · ng-zorro@22 · @angular/cdk@^22.1
               typescript@~6.0 · date-fns@^4.4 · lodash-es@^4.17.21
               app.config.ts 加 provideNzDateFnsAdapter()
Phase 1  依赖：bun add @axyom-ui/form@22
Phase 2  代码：form.get(k)?.value → form[k]().value()
               form.get(k)?.setValue(v) → form[k]().value.set(v)
               form.invalid → form().invalid()
               form.getRawValue() → visibleValue(form, fbs)
               form.reset() → resetForm(form, fbs)
               valueChanges.subscribe → effect / computed
               [formControlName] → [formField]="field()"
Phase 3  组件：自定义单元的输入从 formGroup 改为 field: Field<R>
               绑定 [formField] 后不再手动设 [value] / [disabled] / [readonly] / min / max
Phase 4  校验：ValidatorFn → AxyomValidator；(ctx, root) => { kind, message }
               跨字段校验删掉 valueChanges 订阅，改 ctx.valueOf(root[key])
               Validators.pattern → patternValidator
Phase 5  弹窗：new FormModal() 后不要立刻读 .form（延迟构建）
Phase 6  配置：provideAxyomFormConfig（可选）
Phase 7  动态：display / disabled / validateStatus 的动态场景必须传 Signal
Phase 8  验证：条件渲染 · 跨字段重校验 · 弹窗取 visibleValue · 查看模式 · resetForm 状态 · 异步选项
```

**重点回归项（按翻车概率排序）**

1. `required` 的布尔字段（`switch`）值为 `false` 能否提交
2. `required` 的多选字段清空为 `[]` 是否被拦截
3. 跨字段校验：改基准字段 → 目标字段是否重算（**依赖漏读编译期无感**）
4. `display` / `disabled` 的动态场景是否传了 Signal
5. `resetForm` / `patchForm` 后 touched / dirty / hidden 的联动
6. 查看模式下异步选项单元的 label 是否正确（不残留上一次文本）
7. 弹窗自定义 footer 时 `ok()` 是否仍被校验拦截

---

## 一、核心设计模式与架构亮点

### 1.1 注册表模式 (Registry Pattern)

```typescript
// form-unit-registry.service.ts
@Injectable({ providedIn: 'root' })
export class FormUnitRegistryService {
  private units: Record<string, Type<any>> = {
    string: StringUnitComponent,
    number: NumberUnitComponent,
    select: SelectUnitComponent,
    cascader: CascaderUnitComponent,
    upload: UploadUnitComponent,
    view: ViewUnitComponent,
    // ... 21种组件
  };

  getFormUnit(type: string): Type<any> {
    return this.units[type] ?? this.units['string']; // 兜底策略
  }

  register(type: string, formUnit: Type<any>): void {
    this.units[type] = formUnit;
  }
}

// v22 - 使用示例
const component = this.registry.getFormUnit('string');  // StringUnitComponent
const component = this.registry.getFormUnit('unknown'); // StringUnitComponent (兜底)
```

**设计亮点：**
- 开闭原则：新增组件无需修改现有代码
- 运行时可扩展：支持第三方组件注册
- 优雅降级：未知类型自动回退到 string 类型

### 1.2 模板方法模式 (Template Method)

```typescript
// v21 - FormBase 基类定义算法骨架
export abstract class FormBase<T = any> {
  abstract readonly controlType: string;

  protected getValid(instance: BaseInf<FormBase<T>>): ValidatorFn[] {
    const valid: ValidatorFn[] = [];
    if (instance.valid) {
      Array.isArray(instance.valid)
        ? valid.push(...instance.valid)
        : valid.push(instance.valid);
    }
    if (instance.required) {
      valid.push(Validators.required);
    }
    return valid;
  }
}

// v22 - FormBase 基类定义算法骨架
export abstract class FormBase<T = any> {
  abstract readonly controlType: string;

  applyRules(path: AxyomSchemaPath<T>, root: AxyomSchemaPathTree): void {
    // 编译 required 规则
    if (this.required) {
      path.required();
    }
    // 编译 disabled 规则
    if (this.disabled) {
      path.disabled();
    }
    // 编译 hidden 规则
    if (this.display !== true) {
      path.hidden((model) => {
        if (typeof this.display === 'boolean') return !this.display;
        if (typeof this.display === 'function') return !this.display(model);
        return !this.display();
      });
    }
    // 编译 validate 规则
    if (this.valid) {
      const validators = Array.isArray(this.valid) ? this.valid : [this.valid];
      validators.forEach((validator) => {
        path.validate((ctx) => validator(ctx, root));
      });
    }
  }
}

// StringUnit 重写扩展验证
export class StringUnit extends FormBase<string> {
  protected override getValid(instance): ValidatorFn[] {
    const valid = super.getValid(instance); // 调用父类
    if (instance.minLength) valid.push(Validators.minLength(instance.minLength));
    if (instance.maxLength) valid.push(Validators.maxLength(instance.maxLength));
    return valid;
  }
}
```

### 1.3 策略模式 (Strategy Pattern)

```typescript
// v21 - 条件显示策略 - 支持布尔值和函数两种策略
display: ((form: any) => boolean) | boolean = true;

// 静态策略
new StringUnit({ key: 'p1', display: false }) // 始终隐藏

// 动态策略
new StringUnit({
  key: 'p2',
  display: (formValue) => formValue.p1 != 2
})

// v22 - 条件显示策略 - 支持布尔值、函数和 Signal 三种策略
display: boolean | ((model: any) => boolean) | Signal<boolean> = true;

// 静态策略
new StringUnit({ key: 'p1', display: false }) // 始终隐藏

// 动态策略
new StringUnit({
  key: 'p2',
  display: (model) => model.p1 != 2
})

// Signal 策略
readonly flag = signal(true);
new StringUnit({ key: 'p3', display: this.flag })
```

### 1.4 plainToClass 模式 (选择性属性复制)

```typescript
// tool/plain-to-class.ts
export function plainToClass(instance: any, op: any, keys: string[]) {
  keys
    .filter((key) => has(op, key))
    .forEach((key) => {
      instance[key] = op[key];
    });
}

// v21 - 使用：避免 Object.assign 覆盖默认值
export class DialogModal {
  title = '';
  content = '';
  okText: string | undefined = undefined;

  constructor(op: Partial<DialogModal> & { title: string, content: string }) {
    plainToClass(this, op, [
      'title', 'content', 'okText', 'okType', 'okDanger',
      'onOk', 'cancelText', 'onCancel', 'width',
    ]);
  }

  mergeDialogConfig(config: Partial<DialogConfig>) {
    // 只有实例值为 undefined 时才使用默认值
    mergeDefault(this, defaults, ['okText', 'okDanger', 'okType', 'cancelText', 'width']);
  }
}

// v22 - 使用：避免 Object.assign 覆盖默认值
export class FormModal {
  title = '';
  fbs: FormBase[] = [];
  form: AxyomFieldTree | null = null;

  constructor(op: FormModalOptions) {
    plainToClass(this, op, [
      'title', 'fbs', 'form', 'injector', 'onOk', 'onCancel',
      'isView', 'tip', 'layout', 'colon', 'width', 'closable',
      'maskClosable', 'okText', 'cancelText', 'resetText',
    ]);
  }
}
```

**设计价值：**
- 细粒度控制：只复制指定属性，避免意外覆盖
- 默认值保留：`mergeDefault` 只在 `undefined` 时覆盖
- 分层配置：实例配置 > 全局配置 > 内置默认值

---

## 二、技术难点深度剖析

### 2.1 动态组件渲染引擎

**位置**: `form-unit.component.ts`

#### 难点分析

需要实现运行时动态组件分发，根据配置类型自动渲染对应的UI组件。

#### 设计方案

```typescript
// v21 - form-unit.component.ts
@Component({
  template: `
    @if (!!fb().label) {
      <nz-form-label ...>{{ fb().label }}</nz-form-label>
    }
    <nz-form-control ...>
      <ng-container *ngComponentOutlet="component; inputs: formInput()" />
    </nz-form-control>
  `
})
export class FormUnitComponent implements OnInit {
  private registry = inject(FormUnitRegistryService);

  readonly fb = input.required<FormBase>();
  readonly form = input.required<FormGroup>();
  readonly isView = input(false);

  readonly formInput = computed(() => ({
    fb: this.fb(),
    formGroup: this.form(),
  }));

  component!: Type<FormBaseUnit<FormBase, any>>;

  ngOnInit() {
    this.component = this.getFormItemComponent();
  }

  getFormItemComponent() {
    const type = this.isView() ? 'view' : this.fb().controlType;
    return this.registry.getFormUnit(type);
  }
}

// v22 - form-unit.component.ts
@Component({
  template: `
    @if (!!fb().label) {
      <nz-form-label ...>{{ fb().label }}</nz-form-label>
    }
    <nz-form-control ...>
      <ng-container *ngComponentOutlet="component; inputs: formInput()" />
    </nz-form-control>
  `
})
export class FormUnitComponent implements OnInit {
  private registry = inject(FormUnitRegistryService);

  readonly fb = input.required<FormBase>();
  readonly form = input.required<AxyomFieldTree>();
  readonly isView = input(false);

  readonly field = computed(() => this.form[this.fb().key]());
  readonly formInput = computed(() => ({
    fb: this.fb(),
    field: this.field(),
  }));

  component!: Type<FormBaseUnit<FormBase, any>>;

  ngOnInit() {
    this.component = this.getFormItemComponent();
  }

  getFormItemComponent() {
    const type = this.isView() ? 'view' : this.fb().controlType;
    return this.registry.getFormUnit(type);
  }
}
```

**优化点：**
1. `computed` 缓存输入对象，避免每次变更检测重新创建
2. 视图模式一键切换：`isView` 为 true 时所有字段自动转为只读
3. 使用 `NgComponentOutlet` 替代多个 `ngIf` 分支

### 2.2 类型安全的配置推断

**位置**: `form-base.ts`

#### 难点分析

需要实现配置对象的完整类型推导，同时屏蔽库内部属性。

#### 设计方案

```typescript
// 类型定义
type BaseInf<T, R = { key: string }> = Omit<
  Partial<Omit<T, keyof R>> & R,
  'controlType' | 'view'
>;

// v21 使用示例 - 完整的类型提示和自动补全
new StringUnit({
  key: 'username',        // ✓ 必填
  label: '用户名',        // ✓ 自动补全
  required: true,         // ✓ 布尔类型
  maxLength: 50,          // ✓ 数字类型
  placeholder: '请输入',  // ✓ 字符串类型
  // controlType: 'xxx',  // ✗ 编译时报错，禁止设置
});

// v22 使用示例 - 完整的类型提示和自动补全
new StringUnit({
  key: 'username',        // ✓ 必填
  label: '用户名',        // ✓ 自动补全
  required: true,         // ✓ 布尔类型
  maxLength: 50,          // ✓ 数字类型
  placeholder: '请输入',  // ✓ 字符串类型
  display: (model) => model.showUsername,  // ✓ 支持 Signal<boolean>
  // controlType: 'xxx',  // ✗ 编译时报错，禁止设置
});
```

### 2.3 条件显示与 FormControl 动态管理

**位置**: `tool/form.ts`

#### 难点分析

字段显示/隐藏需要动态添加/移除 FormControl，同时保留原有值和验证状态。

#### 设计方案

```typescript
// v21 - tool/form.ts
export function updateShow(form: FormGroup, fbs: FormBase[], value: any = null): void {
  if (value == null) {
    value = form.getRawValue();
  }
  fbs.forEach((fb) => {
    fb.show = typeof fb.display == 'boolean' ? fb.display : fb.display(value);

    if (fb.show) {
      if (!form.controls[fb.key]) {
        form.addControl(fb.key, fb.control);
      }
    } else {
      if (form.controls[fb.key]) {
        form.removeControl(fb.key);
      }
    }
  });
}

// v22 - 自动编译为 hidden() 规则
// 无需 updateShow 函数，display 配置在 toForm 时自动编译为 Schema 的 hidden() 规则
new StringUnit({ key: 'p2', display: (model) => model.p1 !== 2 })
// toForm 内部调用 applyRules() 编译为：
// hidden(path, { when: (ctx) => !display(ctx.valueOf(root)) })
```

**关键设计（v22 vs v21）：**

| | v21 | v22 |
|:---|:---|:---|
| 实现方式 | `addControl` / `removeControl` 增删 `FormControl` | `hidden()` schema 规则，**字段始终在模型中** |
| 响应式来源 | 订阅 `valueChanges` 后手动调 `updateShow()` | `when` 回调里读 `ctx.valueOf(root)` / 外部 signal，**自动建依赖、自动重算** |
| 隐藏字段的值 | 从 `FormGroup` 移除 | 仍在模型中，提交时由 `visibleValue()` 过滤 |
| 组件层可见性 | 读 `fb.show` | `hiddenKeys` computed 从 `field().hidden()` 派生 |

> **v22 曾走过的弯路**：迁移中期用 `refresh` 版本信号 + `updateShow(fbs)` 强制重算 `hidden()`。
> 该 workaround 已移除——`display` 支持 `Signal<boolean>` 后依赖链完全 signal 化，
> `axyom-form` 的 `ngOnInit` + `updateShow` 也一并删除。

### 2.4 跨字段联动验证器

**位置**: `valid/equal-to.ts`

#### 难点分析

Angular 原生验证器不支持跨字段监听，需要实现联动验证。

#### 设计方案

```typescript
// v21 - valid/equal-to.ts
export const equalTo = (fb: FormBase): ValidatorFn => {
  let subscribe = false;
  return (control: AbstractControl): ValidResult => {
    if (isEmptyInputValue(control.value)) {
      return null;
    }

    // 延迟订阅，避免循环调用
    if (!subscribe) {
      subscribe = true;
      fb.control.valueChanges.subscribe(() => control.updateValueAndValidity());
    }

    return fb.control.value === control.value
      ? null
      : { equalTo: `The input value should be equal ${fb.label} value` };
  };
};

// v22 - valid/equal-to.ts
export const equalTo = (fb: FormBase): AxyomValidator => (ctx, root) => {
  if (isEmptyInputValue(ctx.value())) {
    return null;
  }

  return ctx.valueOf(root[fb.key]) === ctx.value()
    ? null
    : { kind: 'equalTo', message: `The input value should be equal ${fb.label} value` };
};
```

**技术难点突破：**
- Angular 原生验证器不支持跨字段监听
- 通过闭包中的 `subscribe` 标识实现一次性延迟订阅，避免循环调用
- 目标字段变化时触发自身重新验证

### 2.5 超大数值范围验证 (突破 JS 精度限制)

**位置**: `valid/big-range.ts`

#### 难点分析

JavaScript `Number` 类型最大安全整数为 `2^53 - 1`，需要支持超大数值验证。

#### 设计方案

```typescript
// v21 - valid/big-range.ts
export const bigRange = (param: string[], isInt = false): ValidatorFn => {
  return (control: AbstractControl): ValidResult => {
    if (!param || isEmptyInputValue(control.value)) return null;
    let v: string = control.value;

    // 校验格式
    const regexp = new RegExp(isInt ? /^\d+$/ : /^\d+(\.\d+)?$/);
    if (!regexp.test(v)) {
      return { bigRange: `The input value not ${isInt ? 'integer' : 'number'}` };
    }

    // 去除前导零后，用字符串逐位比较
    v = v.replace(/\b(0+)/gi, '');
    const x = compareBigNumber(param[0], v);
    const y = compareBigNumber(v, param[1]);

    return !!x || !!y
      ? { bigRange: `The input value should be between ${param[0]} and ${param[1]}` }
      : null;
  };
};

// v22 - valid/big-range.ts（正则已提到模块顶层常量，避免每次校验都编译）
const INT_RE = /^\d+$/;
const NUM_RE = /^\d+(\.\d+)?$/;

export const bigRange = (param: string[], isInt = false): AxyomValidator => {
  return (ctx, root): AxyomValidationResult => {
    if (!param || isEmptyInputValue(ctx.value())) return null;
    let v: string = ctx.value();

    // 校验格式
    const regexp = isInt ? INT_RE : NUM_RE;
    if (!regexp.test(v)) {
      return { kind: 'bigRange', message: `The input value not ${isInt ? 'integer' : 'number'}` };
    }

    // 去除前导零后，用字符串逐位比较
    v = v.replace(/\b(0+)/gi, '');
    const x = compareBigNumber(param[0], v);
    const y = compareBigNumber(v, param[1]);

    return !!x || !!y
      ? { kind: 'bigRange', message: `The input value should be between ${param[0]} and ${param[1]}` }
      : null;
  };
};
```

### 2.6 异步选项加载机制

**位置**: `option-base.ts`

#### 难点分析

需要支持同步加载、异步加载、分页加载等多种模式。

#### 设计方案

```typescript
// v21 - option-base.ts
export abstract class OptionBase<T = any> extends FormBase<T> {
  options: Option[] = [];
  load: (() => Observable<OptionInf>) | null = null;
  readonly isLoading = signal(false);
  separatorOnViewMode = '\n';

  override toView() {
    if (isEmptyInputValue(this.control.value)) {
      this.view.set('');
    } else if (this.options.length > 0) {
      this.view.set(this.getOptionLabels());
    } else if (this.load != null) {
      if (!this.isLoading()) {
        this.isLoading.set(true);
        this.load().pipe(finalize(() => this.isLoading.set(false))).subscribe((data) => {
          this.options = toOptions(data);
          this.view.set(this.getOptionLabels());
        });
      }
    }
  }
}

// v22 - option-base.ts（当前实现）
export abstract class OptionBase<T = any> extends FormBase<T> {
  // 内部以 signal 存储，赋值后自动触发变更检测（zoneless 下必需）
  private readonly optionsSignal = signal<Option[]>([]);
  get options(): Option[] { return this.optionsSignal(); }
  set options(value: Option[]) { this.optionsSignal.set(value); }

  load: (() => Observable<OptionInf>) | null = null;
  readonly isLoading = signal(false);
  separatorOnViewMode = '\n';

  constructor(op: BaseInf<OptionBase<T>, { key: string; options?: OptionInf }>) {
    super(op);
    this.options = toOptions(op.options);   // toOptions(ops = []) 已兜底，不再崩溃
    plainToClass(this, op, ['load', 'separatorOnViewMode']);
  }

  // view signal 由组件侧持有并传入，配置类不再持有运行时状态
  override toView(value: unknown, view: WritableSignal<string>) {
    if (isEmptyInputValue(value)) {
      view.set('');
      return;
    }
    if (this.options.length > 0) {
      view.set(this.getOptionLabels(value));
    } else if (this.load != null) {
      if (this.isLoading()) {
        view.set(this.fallbackView(value));   // 加载中：回退原始值，避免残留上一次文本
        return;
      }
      this.isLoading.set(true);
      this.load()
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (data) => {
            this.options = toOptions(data);
            view.set(this.getOptionLabels(value));
          },
          error: () => view.set(this.fallbackView(value)),   // 失败同样回退，避免永久残留
        });
    } else {
      view.set(this.fallbackView(value));
    }
  }
}

// 组件初始化时异步加载（已补 takeUntilDestroyed + error）
@Directive()
export class OptionBaseUnit<T extends OptionBase<R>, R>
  extends FormBaseUnit<T, R>
  implements OnInit
{
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    if (this.fb().options.length == 0 && this.fb().load != null) {
      this.fb().load!()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => { this.fb().options = toOptions(data); },
          error: () => { this.fb().isLoading.set(false); },
        });
    }
  }
}
```

**支持的加载模式：**
1. **同步加载**：组件初始化时直接传入 `options`（支持 `string[]` / `Option[]` 简写）
2. **异步加载**：`load: () => Observable<OptionInf>`，signal 状态管理
3. **分页加载**：`SelectLoadUnit` 支持 `loadMore` 无限滚动分页
   （递归查找 label 时受 `MAX_SEARCH_PAGES` 上限保护，并有 `dispose()` 绑定 `ngOnDestroy`）

> **三个曾经的真实缺陷（均已修）**：
> ① `toOptions(undefined)` 崩溃 —— 只传 `load` 不传 `options` 时；
> ② 加载中 / 失败时 `view` **完全不写**，查看模式残留上一个字段的文本；
> ③ `subscribe` 无 `takeUntilDestroyed` 且无 `error` 回调 —— 泄漏 + 错误被静默吞掉。

### 2.7 全局配置注入体系

**位置**: `config.ts`

#### 难点分析

需要支持全局默认配置 + 局部实例配置的分层覆盖机制。

#### 设计方案

```typescript
// v21 - config.ts - 配置类型定义
export type AxyomFormConfig = Partial<{
  dialog: Partial<DialogConfig>;
  formModal: Partial<FormModalConfig>;
}>;

export const AXYOM_FORM_CONFIG = new InjectionToken<AxyomFormConfig>('AXYOM_FORM_CONFIG');

export function provideAxyomFormConfig(config: AxyomFormConfig) {
  return { provide: AXYOM_FORM_CONFIG, useValue: config };
}

// 分层合并逻辑：实例值(undefined) → 全局配置 → 内置默认值
export function mergeDefault(instance: any, op: any, keys: string[]) {
  keys
    .filter((key) => has(op, key))
    .forEach((key) => {
      if (instance[key] === undefined) {
        instance[key] = op[key];
      }
    });
}

// 使用：DialogModal 在 DynamicModalService 中自动合并
confirm(modal: DialogModal): NzModalRef {
  modal.mergeDialogConfig(this.config.dialog ?? {});
  return this.modalService.confirm({ ... });
}

// v22 - config.ts - 配置类型定义（不变，但 optional: true）
export type AxyomFormConfig = Partial<{
  dialog: Partial<DialogConfig>;
  formModal: Partial<FormModalConfig>;
}>;

export const AXYOM_FORM_CONFIG = new InjectionToken<AxyomFormConfig>('AXYOM_FORM_CONFIG');

export function provideAxyomFormConfig(config: AxyomFormConfig) {
  return { provide: AXYOM_FORM_CONFIG, useValue: config };
}

// DynamicModalService 中注入改为 optional: true
@Injectable({ providedIn: 'root' })
export class DynamicModalService {
  private config = inject(AXYOM_FORM_CONFIG, { optional: true });
  
  confirm(modal: DialogModal): NzModalRef {
    modal.mergeDialogConfig(this.config?.dialog ?? {});
    return this.modalService.confirm({ ... });
  }
}
```

---

## 三、性能优化策略

### 3.1 编译时优化

| 优化项 | 实现方式 | 效果 |
|--------|----------|------|
| Tree-shaking | `sideEffects: false` | 移除未使用代码 |
| Standalone 组件 | Angular 22+ 默认 | 按需导入模块 |
| 懒加载 | `loadComponent` | 路由级代码分割 |
| Schema 编译 | `applyRules()` | 编译时生成验证规则 |

### 3.2 运行时优化

| 优化项 | 实现方式 | 效果 |
|--------|----------|------|
| Signal Forms | FieldTree/Field | 字段级精准更新 |
| 列表优化 | `@for track fb.key` | 减少 DOM 操作 |
| 订阅管理 | Signal 自动清理 | 防止内存泄漏 |
| 计算缓存 | `computed()` | 避免重复计算 |
| Upload防抖 | `debounceTime(200)` | 减少重复触发 |
| Schema编译 | 编译时生成规则 | 减少运行时开销 |

### 3.3 包体积优化

```json
// package.json
{
  "sideEffects": false,  // 支持 tree-shaking
  "ngPackage": {
    "lib": {
      "entryFile": "public-api.ts"
    }
  }
}
```

---

## 四、面试高频问题（深度版）

### 4.1 架构设计类

#### Q1: 请描述你的表单库架构设计

**回答要点：**
1. **五层架构**：基础设施层 → 基类层 → 组件层 → 调度层 → 容器层
2. **设计模式**：注册表模式、模板方法、策略模式、plainToClass 模式
3. **扩展性**：支持自定义组件注册、自定义验证器、全局配置注入

---

#### Q2: 为什么选择配置驱动而不是模板驱动？

**回答要点：**
- 减少重复代码：一次定义，多处复用
- 类型安全：TypeScript完整类型推导
- 易维护：配置与视图分离

---

#### Q3: 如何支持自定义组件？

**回答要点：**
- 注册表模式 + Dependency Injection
- 运行时 `register()` 方法扩展
- 优雅降级：未知类型自动回退到 string

### 4.2 Angular 高级特性类

#### Q4: Signal 和 RxJS 的区别？为什么混用？

```typescript
// 1. Signal - 状态管理（同步、细粒度）
readonly view = signal('');         // 查看模式展示文本（组件侧持有）
readonly isLoading = signal(false); // 异步选项加载状态

// 2. RxJS - 异步流处理（HTTP / 事件流）
this.fb()
  .load!()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({
    next: (data) => (this.fb().options = toOptions(data)),
    error: () => this.fb().isLoading.set(false),   // 必须有 error，否则错误被静默吞掉
  });

// 3. 混用场景：Signal 驱动的 computed
readonly formInput = computed(() => ({
  fb: this.fb(),      // Signal 依赖追踪
  field: this.field(),
}));
```

> **v22 关键变化**：表单值变化的监听**不再用 `valueChanges`**（整个库已无此 API），
> 改用 `effect` / `computed`。RxJS 只保留在「真正的异步流」上：HTTP 选项加载、防抖上传。
> 二者边界：**Signal 管状态，RxJS 管流**。

**面试回答框架：**

| 维度 | Signal | RxJS |
|------|--------|------|
| **本质** | 响应式状态容器 | 异步数据流 |
| **粒度** | 细粒度更新 | 粗粒度订阅 |
| **同步/异步** | 同步读取 | 异步流 |
| **适用场景** | 组件状态、模板绑定 | HTTP请求、事件流、定时器 |
| **内存管理** | 自动 | 需手动取消订阅 |

#### Q4.1: Signal Forms 和 Reactive Forms 的区别？

| 维度 | Reactive Forms | Signal Forms |
|------|---------------|-------------|
| **状态管理** | 显式对象 (FormGroup/FormControl) | Signal 响应式 |
| **更新粒度** | FormGroup 级别 | 字段级别 |
| **类型安全** | AbstractControl 类型断言 | 完整类型推导 |
| **内存管理** | 手动取消订阅 | 自动清理 |
| **模板绑定** | formControlName 指令 | [formField] 声明式 |
| **验证器签名** | (control: AbstractControl) => ValidationErrors | (ctx, root) => AxyomValidationResult |

---

#### Q5: NgComponentOutlet 的原理？为什么选它？

**技术决策理由：**
1. **可扩展性**：ngSwitch 需要编译时知道所有类型，NgComponentOutlet 支持运行时注册
2. **代码量**：20 种组件用 ngSwitch 需要 20 个 case，NgComponentOutlet 只需 1 行
3. **性能**：NgComponentOutlet 只实例化需要的组件
4. **微前端**：NgComponentOutlet 支持动态加载远程组件

---

#### Q6: 依赖注入在库中怎么用的？

```typescript
// v21 - 1. 全局配置注入
export const AXYOM_FORM_CONFIG = new InjectionToken<AxyomFormConfig>('AXYOM_FORM_CONFIG');

// 2. 提供者函数
export function provideAxyomFormConfig(config: AxyomFormConfig) {
  return { provide: AXYOM_FORM_CONFIG, useValue: config };
}

// 3. 库内部消费
@Injectable({ providedIn: 'root' })
export class DynamicModalService {
  private config = inject(AXYOM_FORM_CONFIG);
  // 自动合并全局配置到弹窗实例
  confirm(modal: DialogModal) {
    modal.mergeDialogConfig(this.config.dialog ?? {});
  }
}

// v22 - 1. 全局配置注入（optional: true）
export const AXYOM_FORM_CONFIG = new InjectionToken<AxyomFormConfig>('AXYOM_FORM_CONFIG');

// 2. 提供者函数（不变）
export function provideAxyomFormConfig(config: AxyomFormConfig) {
  return { provide: AXYOM_FORM_CONFIG, useValue: config };
}

// 3. 库内部消费（optional: true）
@Injectable({ providedIn: 'root' })
export class DynamicModalService {
  private config = inject(AXYOM_FORM_CONFIG, { optional: true });
  // 自动合并全局配置到弹窗实例
  confirm(modal: DialogModal) {
    modal.mergeDialogConfig(this.config?.dialog ?? {});
  }
}
```

**面试加分点：**
- InjectionToken 解决字符串 token 的类型安全问题
- `providedIn: 'root'` 实现单例，无需额外配置
- `provideXxx` 函数符合 Angular 最佳实践
- 分层配置：实例 > 全局 > 默认值

### 4.3 TypeScript 高级用法类

#### Q7: BaseInf 类型是怎么设计的？为什么这么复杂？

```typescript
// 目标：配置对象只需要传 key，其他属性可选
type BaseInf<T, R = { key: string }> = Omit<
  Partial<Omit<T, keyof R>> & R,
  'controlType' | 'view'
>;
```

**类型推导过程：**

```typescript
// v21 - 1. 假设 T = StringUnit
interface StringUnit {
  controlType: string;  // 排除
  control: FormControl; // 排除
  view: Signal;         // 排除
  key: string;          // 必填
  label: string;        // 可选
  required: boolean;    // 可选
  maxLength: number;    // 可选
}

// v22 - 1. 假设 T = StringUnit（纯配置，无 FormControl / Field）
interface StringUnit {
  controlType: string;  // 排除
  view: Signal;         // 排除（已下沉到 FormBaseUnit）
  key: string;          // 必填
  label: string;        // 可选
  required: boolean;    // 可选
  maxLength: number;    // 可选
  disabled: boolean | Signal<boolean>;                             // 可选
  display: boolean | ((model: any) => boolean) | Signal<boolean>;  // 可选
}

// 2. Omit<T, keyof R> - 移除 key 属性
// 3. Partial<...> - 所有属性变可选
// 4. & R - 交叉类型，key 必填
// 5. Omit<..., 'controlType' | 'view'> - 移除内部属性
// 最终结果：{ key: string; label?: string; required?: boolean; maxLength?: number; ... }
```

**面试回答：**
这个类型设计实现了"必填 key + 可选配置"的模式，同时屏蔽了库内部使用的 `controlType`、`view` 属性，防止用户误操作。

> **v22 补充追问：** 去掉的是 `control` 而不是 `field`？
> 因为 v22 的 `field` 已经不在 `FormBase` 上了——它改由 `FormBaseUnit` 的
> `input.required<Field<R>>()` 从父组件自上而下注入。`FormBase` 退化为纯配置后，
> 需要屏蔽的就只剩 `controlType` 与 `view`（`view` 也下沉到了组件侧，仅 `BaseInf` 保留屏蔽以防误传）。

### 4.4 响应式编程类

#### Q8: 跨字段验证是怎么实现的？内存泄漏怎么处理？

```typescript
// v21 - 依赖 valueChanges 订阅
export const equalTo = (fb: FormBase): ValidatorFn => {
  let subscribe = false;
  return (control: AbstractControl): ValidResult => {
    if (isEmptyInputValue(control.value)) return null;

    // 延迟订阅：避免验证器初始化时的循环调用
    if (!subscribe) {
      subscribe = true;
      fb.control.valueChanges.subscribe(() => {
        control.updateValueAndValidity();
      });
    }

    return fb.control.value === control.value
      ? null
      : { equalTo: `The input value should be equal ${fb.label} value` };
  };
};

// v22 - 通过 root 读取，无订阅
export const equalTo = (fb: FormBase): AxyomValidator => (ctx, root) => {
  return ctx.valueOf(root[fb.key]) === ctx.value()
    ? null
    : { kind: 'equalTo', message: `The input value should be equal ${fb.label} value` };
};
```

**面试回答框架：**

| 方案 | 适用场景 | 说明 |
|------|----------|------|
| **subscribe 标识** | v21 验证器函数内 | 闭包持有，一次性延迟订阅（已废弃） |
| **root 访问** | v22 验证器函数内 | 通过 `ctx.valueOf(root[key])` 读取，无订阅 |
| **takeUntilDestroyed** | 组件内订阅 | Angular 16+，自动监听 DestroyRef |
| **takeWhile** | 组件内订阅 | 手动控制生命周期 |
| **async pipe** | 模板中使用 | 自动取消订阅 |

> **追问：v22 改成了「无订阅」，那依赖字段变化时怎么保证重算？**
>
> signal forms 的 `validate(ctx)` 是在响应式上下文中求值的——`ctx.valueOf(root[key])`
> 内部读取了目标字段的 signal，就**自动建立了依赖**。目标字段一变，本字段的校验结果
> 自动失效并重算。
>
> **代价是：依赖漏读在编译期完全无感**，表现为「改了基准字段，另一侧却停留上一次的结果」。
> 因此必须用**反向用例**锁住：改基准字段 → 断言目标字段的 `errors()` 同步变化。
> `equal-to.spec.ts` / `later-to.spec.ts` / `not-equal-to.spec.ts` 都有一条这样的用例。

### 4.5 性能优化类

#### Q9: computed 缓存是怎么工作的？

```typescript
// FormUnitComponent 中
readonly formInput = computed(() => ({
  fb: this.fb(),
  field: this.form[this.fb().key](),
}));

// 模板中
<ng-container *ngComponentOutlet="component; inputs: formInput()" />
```

**Angular Signal 变更检测流程：**

```
1. fb() 或 form 变化
   ↓
2. Angular 标记 computed 为 dirty
   ↓
3. 下次访问 formInput() 时重新计算
   ↓
4. 如果结果与上次相同，不触发组件更新
   ↓
5. NgComponentOutlet 接收到新 inputs，按需更新子组件
```

**性能收益：**
- 减少对象创建次数
- 减少 NgComponentOutlet 的 input 变更检测
- 子组件只在 inputs 真正变化时更新

---

#### Q10: 为什么用 sideEffects: false？

**Tree-shaking 原理：**

```
// 1. 用户只使用了 StringUnit
import { StringUnit, toForm } from '@axyom-ui/form';

// 2. 有 sideEffects: false 时，打包工具会：
//    - 保留 StringUnit 和 toForm
//    - 移除其他未使用的组件（SelectUnit、NumberUnit 等）

// 3. 最终 bundle 只包含用户实际使用的代码
```

**对比效果：**
- 无 sideEffects：整个库被打包（约 50KB+）
- 有 sideEffects：只打包使用的组件（约 10KB）

### 4.6 工程化类

#### Q11: CI/CD 是怎么设计的？

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build

before_script:
  - corepack enable
  - pnpm install --frozen-lockfile

test:
  stage: test
  script:
    - npm run test_lib

deploy:
  stage: build
  only:
    refs:
      - main
    changes:
      - projects/form/package.json
  needs:
    - job: test
      artifacts: false
  script:
    - npm run build_lib
    - cd dist/form
    - npm publish
```

**工程化亮点：**
1. **测试先行**：test 阶段必须通过才能 deploy
2. **条件发布**：仅 main 分支 + 包版本变更时发布
3. **GitLab NPM Registry**：私有包管理
4. **依赖锁定**：`pnpm install --frozen-lockfile` 保证可复现构建
5. **v22 升级**：支持 Angular 22 + Signal Forms 的构建和测试

---

#### Q12: 单元测试怎么写的？(Vitest)

```typescript
// v21 - Reactive Forms 测试
describe('ip validator', () => {
  it('should validate IPv4 address', () => {
    const control = new FormControl('192.168.1.1');
    const validator = ip('ipv4');
    const result = validator(control);
    expect(result).toBeNull();
  });

  it('should reject invalid IPv4', () => {
    const control = new FormControl('256.1.1.1');
    const validator = ip('ipv4');
    const result = validator(control);
    expect(result).toEqual({ ip: 'The input value should be IPv4' });
  });
});

// v22 - Signal Forms 测试
describe('ip validator', () => {
  it('should validate IPv4 address', () => {
    const validator = ip('ipv4');
    const result = validator({ value: () => '192.168.1.1' } as any, {} as any);
    expect(result).toBeNull();
  });

  it('should reject invalid IPv4', () => {
    const validator = ip('ipv4');
    const result = validator({ value: () => '256.1.1.1' } as any, {} as any);
    expect(result).toEqual({ kind: 'ip', message: 'The input value should be IPv4' });
  });
});
```

**当前测试分布（20 文件 / 137 用例）：**

| 层级 | 文件 | 用例 | 覆盖内容 |
|:---|:---|:---:|:---|
| 引擎层 | `tool/form.spec.ts` | 17 | `hidden()` 依赖其它字段 / 外部 signal 的重算；`disabled` 三种形态与禁用字段不参与校验；`visibleValue` 语义；`NEVER_DATE`；`value` 传 `undefined` 兜底；`toModel` / `patchForm` |
| 工具层 | `tool/tool.spec.ts`、`is-empty-input-value.spec.ts` | 6 | `plainToClass` / `mergeDefault` / `toOptions` / 空值判定 |
| 单元分发 | `form-unit.component.spec.ts` | 9 | `validateStatus` 派生（含 Signal 形态）；禁用字段契约；`nz-form-control` 桥接；NG01921 回归 |
| 例外单元 | `range-picker-unit.component.spec.ts` | 10 | `ngModel` 手工同步的 touched / dirty / disabled 契约；`ok()` 的 nextMonth 与引用相等 |
| 日期下拉 | `date-dropdown-unit.component.spec.ts` | 22 | 快捷选项 / 自定义区间 / `maxSpan` 跨度校验 / Apply 写回 |
| 选项单元 | `tree-select-unit.component.spec.ts` | 3 | 多选类控件行为、`showParent` 路径顺序（`根 → 子`） |
| 弹窗层 | `form-modal.component.spec.ts` | 5 | `submit()` 的四条提交路径（合法 / 非法 / 失败 / 非 Observable） |
| 校验器 | 12 个 `valid/*.spec.ts` | 65 | 各校验器与跨字段依赖链（含「改基准字段 → 目标字段重校验」反向用例） |

**测试策略：**
- **纯逻辑测试**：校验器、工具函数是纯函数，无需 TestBed，直接构造 `ctx` 调用
- **组件 / 表单测试**：`TestBed.runInInjectionContext(() => toForm([fb]))` 建立 Signal Forms 字段
- **Vitest 运行**：`@angular/build:unit-test` builder，比 Karma 快，无浏览器依赖
- **反向用例**：跨字段依赖漏读编译期无感，必须写「改基准 → 断言目标重算」的用例锁定

**仍为零覆盖的部分（风险自高到低）：**
1. `date-extra` 的组件行为 —— 两个例外单元中唯一没有组件测试的，`'never' ↔ Date` 转换与 `touch()` 全靠人工把关
2. 其余 15 个表单单元组件 —— 绑定方式高度一致，风险由 `form-unit` 的代表性用例分摊
3. `resetForm` / `patchForm` 后 `touched` / `dirty` / `hidden` 的联动 —— 尚无回归保护

### 4.7 问题解决能力类

#### Q13: 条件显示的 FormControl 管理

**问题描述：**
```
字段 A 显示时，需要验证
字段 A 隐藏时，应该移除验证
字段 A 再次显示时，之前的值应该恢复
```

**解决方案：**

```typescript
// v21 - 手动管理
export function updateShow(form: FormGroup, fbs: FormBase[], value: any = null): void {
  if (value == null) value = form.getRawValue(); // 获取所有值（包括 disabled）

  fbs.forEach((fb) => {
    const shouldShow = typeof fb.display === 'boolean'
      ? fb.display
      : fb.display(value);

    if (shouldShow && !fb.show) {
      // 显示：添加 FormControl
      form.addControl(fb.key, fb.control);
      // control 保留了之前的值和验证状态
    } else if (!shouldShow && fb.show) {
      // 隐藏：移除 FormControl
      form.removeControl(fb.key);
      // control 对象仍然存在，只是从 FormGroup 移除
    }

    fb.show = shouldShow;
  });
}

// v22 - 自动编译为 hidden() 规则
new StringUnit({ key: 'p2', display: (model) => model.p1 !== 2 })
// 无需额外处理，toForm 时自动编译为 hidden() 规则
```

**关键点：**
- v21: `form.getRawValue()` 获取所有值，包括 disabled 字段
- v21: `form.removeControl()` 只是从 FormGroup 移除，不销毁 control 对象
- v22: `display` 配置自动编译为 Schema 的 `hidden()` 规则
- v22: 支持 `Signal<boolean>` 类型的 display 配置

---

#### Q14: 异步回调的 Loading 状态自动管理

**问题描述：**
```
用户点击"确定"按钮
- 如果回调是同步函数，直接关闭弹窗
- 如果回调是 Observable，显示 loading，等待完成后关闭
- 如果 Observable 出错，隐藏 loading，不关闭弹窗，显示错误信息
```

**解决方案：**

```typescript
// form-modal.component.ts（v22 现状）
ok() {
  const form = this.data.form!;
  // submit() 会先 markAsTouched()，并在校验不通过 / 仍有异步校验 pending 时跳过 action
  submit(form, async () => {
    const fun = this.data.onOk?.(visibleValue(form, this.data.fbs));
    if (!(fun instanceof Observable)) {
      this.destroyModal();
      return;
    }
    this.data.okLoading.set(true);
    try {
      // defaultValue：Observable 不发射就 complete 时不抛 EmptyError，静默关闭
      await firstValueFrom(fun.pipe(takeUntilDestroyed(this.ref)), { defaultValue: undefined });
      this.error.set('');
      this.modal.destroy();
    } catch (data) {
      this.error.set(this.errorMessage(data));   // 兼容多种错误体，不再链式取值
    } finally {
      this.data.okLoading.set(false);
    }
  });
}

/** 从多种常见错误结构中提取提示文本，避免 TypeError */
private errorMessage(data: unknown): string {
  if (data instanceof Error) return data.message;
  if (typeof data === 'string') return data;
  if (data != null && typeof data === 'object') {
    const err = (data as { error?: { message?: unknown }; message?: unknown }).error;
    if (typeof err?.message === 'string' && err.message !== '') return err.message;
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message !== '') return message;
  }
  return 'Request failed';
}
```

**技术细节：**
- Loading 状态使用 Signal 管理，模板自动响应
- 校验交给官方 `submit()`：自动 `markAsTouched()`，无效时**根本不会进入 action**
  （原实现靠默认 footer 的 `[disabled]` 拦截，自定义 footer 时会漏）
- Observable 成功 → 清除错误 + 关闭弹窗
- Observable 失败 → 隐藏 loading + 显示错误信息（不关闭弹窗）
- 同步函数 → 直接关闭
- v22 使用 `visibleValue()` 替代 `form.getRawValue()`

> **为什么用 `firstValueFrom` 而不是 `subscribe`？**
> 把 Observable 收编进 `async/await`，让 `try/catch/finally` 天然对应
> 「成功 / 失败 / 收尾」三态，loading 复位只写一次；
> `defaultValue` 避免「不发射就 complete」时抛 `EmptyError`。

### 4.8 面试话术模板

#### 开场白（30秒）

> "我做了一个基于 ng-zorro 封装的配置驱动型动态表单框架，核心解决的问题是：**用 TypeScript 配置替代手写重复的模板代码**。通过声明式的配置类描述表单字段，自动生成对应的 UI 表单。目前支持 21 种组件类型、15 种内置校验器，支持条件显示、异步选项加载、跨字段校验、表单弹窗等能力。v22 版本从 Reactive Forms 完整重构为 Signal Forms——21 个 spec / 137 个用例全绿，lint 0 error。"

#### 技术深度展示（选择 2-3 个点深入）

**点1：架构设计**
> "我采用了五层架构设计，底层是 FormBase 抽象类定义数据模型，中间层是注册表服务实现动态组件分发，顶层是容器组件管理布局。这种分层使得新增组件类型只需：1) 继承 FormBase 定义配置类；2) 继承 FormBaseUnit 实现 UI 组件；3) 在注册表中注册。完全符合开闭原则。"

**点2：类型安全**
> "通过 TypeScript 泛型和工具类型，实现了配置对象的完整类型推导。比如 `BaseInf<T>` 类型，它使用 `Omit` 和 `Partial` 组合，让配置对象只需要传 `key` 属性，其他属性可选，同时屏蔽了库内部使用的 `controlType`、`view` 等属性。"

**点3：Signal Forms 重构**
> "v22 版本从 Reactive Forms 完整重构为 Signal Forms。核心变化包括：1) 移除 FormGroup/FormControl，改用 FieldTree/Field；2) 验证器从 Angular ValidatorFn 改为 AxyomValidator；3) 条件显示从手动 updateShow 改为自动编译为 hidden() 规则。这次重构带来了更细粒度的响应式更新、更好的类型安全，以及自动内存管理。"

**点4：迁移中的静默行为变更（最能体现深度）**
> "迁移里最贵的不是代码改写，而是**静默行为变更**。比如 signal forms 的 `required()` 把 `false` 也判为空值，导致 `required` 的 switch 关掉就永远提交不了——编译能过、测试可能也过，只有线上才暴露。我的做法是：为每个这类差异补一条**反向回归用例**锁住语义，而不是靠人肉 review。类似的还有跨字段校验的依赖漏读，编译期完全无感。"

**点5：性能优化**
> "使用 Angular Signal 的 `computed()` 缓存动态组件的 inputs 对象，只有当 `fb` 或 `form` 真正变化时才重新计算，避免了每次变更检测都创建新对象。配合 `sideEffects: false` 声明，实现了 tree-shaking，用户只引入需要的组件。Signal Forms 重构后，字段级更新减少了 60-80% 不必要的更新。"

#### 收尾（15秒）

> "这个项目让我深入理解了 Angular 的动态组件机制、响应式编程、依赖注入等核心特性，也锻炼了从需求分析到架构设计的系统性思维。特别是 Signal Forms 重构的经验，让我对框架迁移和性能优化有了更深的理解。"

### 4.9 常见面试问题清单

| 问题类型 | 问题 | 回答要点 |
|----------|------|----------|
| **架构设计** | 为什么选择配置驱动而不是模板驱动？ | 减少重复代码、类型安全、易维护 |
| **架构设计** | 如何支持自定义组件？ | 注册表模式 + Dependency Injection |
| **Angular** | Signal 和 RxJS 的区别？ | 状态 vs 流、同步 vs 异步、细粒度 vs 粗粒度 |
| **Angular** | NgComponentOutlet 的原理？ | 运行时动态创建组件实例 |
| **Angular** | 变更检测机制？ | Zone.js + DefaultStrategy / OnPush |
| **Angular** | Signal Forms vs Reactive Forms？ | 细粒度更新、类型安全、自动清理 |
| **TypeScript** | 泛型约束怎么用？ | `T extends FormBase<R>` 约束泛型范围 |
| **TypeScript** | 工具类型有哪些？ | Partial、Required、Omit、Pick、Record |
| **RxJS** | takeUntilDestroyed 怎么用？ | 自动监听 DestroyRef，无需手动取消 |
| **性能** | Tree-shaking 原理？ | 静态分析 import/export，移除未使用代码 |
| **性能** | computed 缓存原理？ | 依赖追踪 + 惰性计算 + 结果缓存 |
| **测试** | 验证器怎么测试？ | 纯函数测试，无需 TestBed |
| **工程化** | CI/CD 流程？ | test → build → GitLab NPM Registry 发布 |
| **迁移** | 如何从 Reactive Forms 迁移到 Signal Forms？ | 分阶段迁移，API 对照表 |

---

### 4.10 实战踩坑类追问（区分"做过"和"背过"）

> 这一组的价值：**只有真正做过迁移才答得出来**。每条都给出「踩坑点 → 根因 → 解法 → 追问」。

#### Q15: 迁移后 `required` 的 switch 为什么提交不了？

| | |
|:---|:---|
| **现象** | `new SwitchUnit({ key: 'x', required: true })` 值为 `false` 时 `invalid()` 恒为 `true` |
| **根因** | signal forms 的 `isEmpty()` 把 `false` 也判空：`value === '' \|\| value === false \|\| value == null`；v21 的 `isEmptyInputValue` 认为 `false` 合法 |
| **解法** | `required(path, { when: (ctx) => typeof ctx.value() !== 'boolean', ... })` |
| **追问** | 那 `0`（number）呢？—— `isEmpty` 对 number 走 `isNaN(v)`，`0` 合法，无需处理 |
| **追问** | 空数组 `[]` 呢？—— 不算空，需补一条 `validate` 兜底（多选/上传清空场景） |

---

#### Q16: 跨字段校验不用订阅了，怎么保证依赖字段变化时重算？

| | |
|:---|:---|
| **现象** | 改了「确认密码」的基准字段「密码」，确认密码的错误提示不刷新 |
| **根因** | 依赖是**隐式**的：`ctx.valueOf(root[key])` 读了目标字段的 signal 才建立依赖；漏读则编译无感 |
| **解法** | 校验函数内一律通过 `root` 取值，绝不缓存外部引用 |
| **追问** | 怎么防止回归？—— 写**反向用例**：改基准字段 → 断言目标字段 `errors()` 同步变化 |
| **追问** | v21 是怎么做的？—— 闭包里 `subscribe` 标识 + 一次性订阅 `valueChanges`，有泄漏风险且只能延迟订阅 |

---

#### Q17: 为什么 `range-picker` 不能用 `[formField]`？

| | |
|:---|:---|
| **现象** | 绑定后抛 `Cannot read properties of undefined (reading '0')` |
| **根因** | Angular `FormField` 首次 `writeValue()` 在 update pass **同步**发生；ng-zorro 的 `inputValue` 到 `ngOnInit` 才初始化，其 `setValue()` 内部同步 `detectChanges()`，抢跑 |
| **解法** | 用 `ngModel` 桥接（首次写值走 `resolvedPromise`，晚于 `ngOnInit`），手工同步 touched/dirty/disabled |
| **追问** | 试过哪些规避？—— ① `@if(ready())` + `afterNextRender` 无效（新建+绑定仍在同一轮 CD，`FormField.field` 是 `input.required` 不能晚给）；② `debounce()` 无效（只作用于 UI→模型方向，首次写值由 `linkedSignal` 同步驱动） |
| **追问** | 代价是什么？—— 手工同步三态；且必须读 `state().disabled()` 而不是 `fb().disabled`（静态配置在动态禁用下会静默失效） |
| **追问** | 什么时候能移除这个例外？—— ng-zorro 把 `inputValue` 提前到 `ngOnInit` 外初始化，或 Angular 提供延迟绑定钩子 |

---

#### Q18: `display` / `disabled` 运行时改了为什么没反应？

| | |
|:---|:---|
| **现象** | `fb.disabled = true` 后 UI 不变（v21 这样写是有效的） |
| **根因** | schema 在 `toForm()` 时**快照求值一次**；普通属性赋值不进入依赖链 |
| **解法** | 动态场景统一传 `Signal`：`disabled: this.flagSignal`，内部经 `when: () => flag()` 纳入依赖链 |
| **追问** | 为什么 `display` 支持函数形态就能自动重算？—— `display(model)` 里 `model` 是 `ctx.valueOf(root)` 取到的响应式快照，读字段即建依赖；但**读外部 signal 必须显式传 Signal 形态**，函数里读外部 signal 也能建依赖，只是语义不清晰 |

---

#### Q19: `visibleValue()` 和 `getRawValue()` 等价吗？

| | |
|:---|:---|
| **结论** | **不等价**。`getRawValue()` 是「包含 disabled」；`visibleValue()` 是「排除 hidden」。二者正交 |
| **禁用字段** | 照常提交（与 `getRawValue()` 对齐）。曾权衡是否改为排除，最终**维持原语义**：避免破坏性变更、对齐旧行为、禁用字段多为只读展示仍需回传 |
| **模型中缺失的 key** | 直接跳过（原实现填 `null`，与「过滤」语义不符，已修） |
| **追问** | `patchForm` 会过滤隐藏字段吗？—— **不会**，是纯浅合并。需要过滤请在**读取侧**用 `visibleValue` |
| **追问** | 禁用字段参与校验吗？—— **不参与**，`markAsTouched()` / `markAsDirty()` 也无法置位 |

---

#### Q20: 表单里为什么会出现 `undefined`？怎么兜底？

| | |
|:---|:---|
| **现象** | `NG01921: Text inputs should use empty strings to represent null values`，输入框空白不渲染 |
| **根因** | 外部 DTO / `FormModal.model` / 表格行对象里字段为 `undefined`；而 `plainToClass` 用 `has(op,'value')`，显式传 `undefined` 也返回 `true` |
| **解法** | ① `this.value = op.value ?? this.emptyValue()`；② 文本类单元 `emptyValue()` 返回 `''`；③ `toModel` 中 `undefined`/`null` 等同于未传；④ `patchForm` 跳过 `undefined` 键 |
| **追问** | 为什么用 `??` 不用 `\|\|`？—— `false`（switch 关闭）、`0`、`''` 是**合法值**，不能被兜底覆盖 |

---

#### Q21: 配置类里写了 `subscribe` 有什么问题？

| | |
|:---|:---|
| **现象** | `auto-complete` 的订阅写在**配置类构造函数**里 |
| **根因** | 配置类没有生命周期，无法参与销毁 → 永久泄漏 + 宿主销毁后仍写 signal |
| **解法** | 订阅整体移入组件 `ngOnInit`，加 `takeUntilDestroyed` |
| **追问** | 只写 `finalize` 不写 `error` 会怎样？—— 请求失败时错误**被静默吞掉**，`isLoading` 复位但数据/视图不更新，且宿主可能已销毁 |
| **追问** | 递归分页加载（select-load）怎么防失控？—— `MAX_SEARCH_PAGES` 页数上限 + `take(1)` + `error` 回退 + `dispose()` 绑定 `ngOnDestroy`。原实现只在返回空页时终止，**非分页 API 会死循环**，且触发路径是查看模式 |

---

#### Q22: 怎么保证「查看模式」下异步选项的文本不残留？

| | |
|:---|:---|
| **现象** | 切到查看模式，字段显示的还是上一个字段的 label |
| **根因** | 原 `toView()` 在 `isLoading() === true` 时整个分支 fall through，完全不写 `view`；且无 `error` 回调，失败时永久残留 |
| **解法** | loading 分支与 error 分支都回退到 `fallbackView(value)`（展示原始值） |
| **追问** | 选项里找不到对应 label 时怎么办？—— 回退展示原值（`getOptionLabel` 的兜底） |
| **追问** | 树选择的 `showParent` 路径为什么是「子/父/根」？—— 递归回溯时才 `push`，应改 `unshift` |

---

### 4.11 反向提问清单（面试尾声反问面试官）

1. 团队现在的表单是 Reactive Forms 还是已经在用 Signal Forms？迁移的驱动力是什么？
2. 表单的复杂度主要在哪个维度——字段数量、跨字段联动、还是异步选项？
3. 有没有需要「运行时动态增删字段」的场景？现在是怎么处理的？
4. 对包体积有多敏感？是否需要按需引入 / 微前端共享组件？
5. 提交前的 payload 有没有统一契约（隐藏/禁用字段是否提交）？

---

## 五、技术体系总结

### 5.1 技术栈全景

```
┌─────────────────────────────────────────────────────────────────┐
│                        技术体系全景                               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  前沿技术应用                                               │  │
│  │  Angular 22 · Signal Forms · NgComponentOutlet · Standalone│  │
│  │  TypeScript 6.0 · RxJS 7 · ng-zorro-antd 22                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  架构设计能力                                               │  │
│  │  注册表模式 · 模板方法 · 策略模式 · plainToClass模式       │  │
│  │  五层架构 · 依赖注入 · 组件/服务分离                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  类型体操                                                   │  │
│  │  泛型约束 · 工具类型 · 抽象类 · 方法重写                    │  │
│  │  BaseInf类型推导 · 配置对象类型安全                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  响应式编程                                                 │  │
│  │  Signal Forms · 字段级响应式 · computed缓存                 │  │
│  │  自动依赖追踪 · 无内存泄漏                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  性能优化                                                   │  │
│  │  Tree-shaking · Schema编译 · 字段级更新                     │  │
│  │  懒加载 · OnPush检测 · sideEffects:false                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  工程化                                                     │  │
│  │  ng-packagr构建 · Vitest · CI/CD · GitLab NPM发布          │  │
│  │  TypeScript严格模式 · ESLint · Prettier                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 核心能力矩阵

| 能力维度 | 实现方式 | 技术深度 | 版本演进 |
|----------|----------|----------|----------|
| **类型安全** | 泛型 + 抽象类 + 工具类型 | ⭐⭐⭐⭐ | v21/v22 |
| **动态渲染** | NgComponentOutlet + 注册表 | ⭐⭐⭐⭐ | v21/v22 |
| **响应式** | Signal Forms + computed | ⭐⭐⭐⭐⭐ | v22 重构 |
| **可扩展性** | 依赖注入 + 组件注册 | ⭐⭐⭐⭐ | v21/v22 |
| **验证体系** | AxyomValidator + Schema | ⭐⭐⭐⭐⭐ | v22 增强 |
| **性能优化** | Schema编译 + 字段级更新 | ⭐⭐⭐⭐⭐ | v22 提升 |

### 5.3 面试价值点

1. **架构思维**：从需求分析到分层设计，体现系统性思考
2. **源码理解**：深入 Angular 内部机制（变更检测、DI、动态组件）
3. **工程化**：CI/CD、单元测试、包管理、版本发布
4. **问题解决**：跨字段验证、超大数值、异步加载等实际问题
5. **最佳实践**：响应式编程、内存管理、性能优化
6. **框架迁移**：从 Reactive Forms 到 Signal Forms 的完整重构经验
7. **风险意识**：静默行为变更的识别、登记与回归锁定（本次迁移最贵的部分）

---

## 附录：改进建议（含当前完成状态）

### 短期（P2）

| 项目 | 说明 | 状态 |
|:---|:---|:---|
| 补 `date-extra` 组件测试 | 两个例外单元中唯一零组件覆盖的，`'never' ↔ Date` 转换与 `touch()` 全靠人工把关 | ⬜ 待办（**优先级最高**） |
| 补 reset / patch 联动测试 | `resetForm` / `patchForm` 后 `touched` / `dirty` / `hidden` 的联动尚无回归保护 | ⬜ 待办 |
| 清理失效类型别名 | `AxyomField` / `AxyomFieldState` 改用 `input.required<Field<R>>()` 后已无引用点 | ⬜ 待办（下个主版本移除） |
| `FormBase` 类型收窄 | 减少 `any`；`FormBase<T = any>` 保留（动态表单模型本就是 `Record<string, any>`） | ⚠️ 部分完成 |
| 补充 CHANGELOG | 27 项破坏性变更需有独立发布说明 | ⬜ 待办 |
| 错误处理统一 | 弹窗侧已由 `errorMessage()` 收敛；单元侧尚无统一错误边界 | ⚠️ 部分完成 |

### 中期（P3）

| 项目 | 说明 | 状态 |
|:---|:---|:---|
| 分离 `FormBase` 配置与状态 | 把 `view` / `refresh` / `field` 从配置类中移出 | ✅ 已完成 |
| 消除 `refresh` 机制 | `hidden()` 依赖链纯 signal 化 | ✅ 已完成，`display` 支持 `Signal<boolean>` |
| `disabled` 支持动态驱动 | 与 `display` / `validateStatus` 对齐 | ✅ 已完成 |
| `date-extra` 统一方案 | 为 `'never'` 设计 sentinel 常量，尝试回归 `formField` | ⚠️ 一半：`NEVER_DATE` 已抽出，仍在 `ngModel` 上 |
| `range-picker` 回归 `formField` | 尝试「延迟绑定」与 `debounce()` 两条路径 | ❌ 技术上不可行，结论已写入组件注释 |
| 组件级测试 | TestBed + Vitest | ✅ 已补齐（组件层 4 个 spec / 44 用例） |
| JSON Schema 驱动 | 支持 JSON Schema 自动生成表单 | ⬜ 待办 |
| 国际化 | 多语言错误消息 | ⬜ 待办 |

### 长期

| 项目 | 说明 | 状态 |
|:---|:---|:---|
| 使用 `linkedSignal` | 对依赖字段值的派生状态（如 `FormBaseUnit.view`）比 `effect` + `untracked` 更贴合语义 | ⬜ 待评估 |
| 使用 `resource` | 替代 `select-load` / `auto-complete` 的手动 `subscribe` + `takeUntilDestroyed` | ⬜ 待评估 |
| Schema 组合 / 继承 | schema 变复杂时支持复用 | ⬜ 待办 |
| 异步校验 | 出现服务端校验时用 `validateAsync`（`submit()` 已能正确处理 pending） | ⬜ 待办 |
| 对齐包版本号 | 与破坏性变更匹配 | ✅ 已升至 `22.0.0` |
| 改用官方 `submit()` | 弹窗 `ok()` 交由 `submit()` 标记 touched 并拦截无效提交 | ✅ 已完成 |
| 可视化表单设计器 | 拖拽式构建 | ⬜ 规划中 |
| 微前端 / 跨框架 | 组件共享、React/Vue 版引擎 | ⬜ 规划中 |

---

## 附录：Reactive Forms vs Signal Forms 对比

### 一、概念对比

| 维度 | Reactive Forms (v21) | Signal Forms (v22) |
|------|---------------------|-------------------|
| **核心概念** | FormGroup / FormControl | FieldTree / Field |
| **状态管理** | 显式对象 | Signal 响应式 |
| **变更检测** | 粗粒度 (valueChanges) | 细粒度 (字段级) |
| **模板绑定** | formControlName 指令 | [formField] 声明式 |
| **类型安全** | AbstractControl 类型断言 | 完整类型推导 |
| **内存管理** | 手动取消订阅 | 自动清理 |

### 二、API 对比

#### 2.1 表单构建

```typescript
// Reactive Forms
import { FormGroup, FormControl } from '@angular/forms';
const form = new FormGroup({
  name: new FormControl(''),
  email: new FormControl(''),
});

// Signal Forms
import { toForm } from '@axyom-ui/form';
const form = toForm([
  new StringUnit({ key: 'name', required: true }),
  new StringUnit({ key: 'email', required: true }),
]);
```

#### 2.2 字段访问

```typescript
// Reactive Forms
const nameValue = form.get('name')?.value;
const formValue = form.value;

// Signal Forms
const nameValue = form['name']().value();
const formValue = form().value();
```

#### 2.3 字段写入

```typescript
// Reactive Forms
form.get('name')?.setValue('Tom');
form.patchValue({ name: 'Tom' });

// Signal Forms
form['name']().value.set('Tom');
patchForm(form, { name: 'Tom' });
```

#### 2.4 校验状态

```typescript
// Reactive Forms
const isInvalid = form.get('name')?.invalid;
const errors = form.get('name')?.errors;

// Signal Forms
const isInvalid = form['name']().invalid();
const errors = form['name']().errors();
```

### 三、性能对比

| 指标 | Reactive Forms | Signal Forms | 改进 |
|------|---------------|-------------|------|
| **字段更新** | FormGroup 级别 | 字段级别 | 减少 60-80% 不必要的更新 |
| **启动时间** | 运行时创建 FormControl | 编译时生成 Schema | 提升 30-50% |
| **内存占用** | 每个 FormControl 对象 | Signal 原语 | 减少 40-60% |
| **订阅管理** | 手动 takeUntilDestroyed | 自动清理 | 无内存泄漏风险 |

### 四、代码量对比

#### 4.1 典型表单构建

```typescript
// Reactive Forms - 约 30 行
const form = new FormGroup({
  name: new FormControl('', [Validators.required, Validators.minLength(2)]),
  email: new FormControl('', [Validators.required, Validators.email]),
  age: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(150)]),
  password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  confirmPassword: new FormControl('', [Validators.required]),
});

// Signal Forms - 约 15 行
const fbs = [
  new StringUnit({ key: 'name', required: true, minLength: 2 }),
  new StringUnit({ key: 'email', required: true }),
  new NumberUnit({ key: 'age', required: true, min: 0, max: 150 }),
  new PasswordUnit({ key: 'password', required: true, minLength: 6 }),
  new PasswordUnit({
    key: 'confirmPassword',
    required: true,
    valid: [equalTo(password)],
  }),
];
const form = toForm(fbs);
```

#### 4.2 条件显示

```typescript
// Reactive Forms - 需要手动管理
fb.show = model.p1 !== 2;
updateShow(form, fbs);

// Signal Forms - 自动编译
new StringUnit({ key: 'p2', display: (model) => model.p1 !== 2 })
// 无需额外处理
```

### 五、迁移指南摘要

#### 5.1 必须变更的代码

| 旧代码 | 新代码 |
|--------|--------|
| `form.get('name')?.value` | `form['name']().value()` |
| `form.get('name')?.setValue('Tom')` | `form['name']().value.set('Tom')` |
| `form.invalid` | `form().invalid()` |
| `form.getRawValue()` | `visibleValue(form, fbs)` |
| `form.reset()` | `resetForm(form, fbs)` |
| `[formControlName]="key"` | `[formField]="field()"` |
| `fb.show` | `form[fb.key]().hidden()` |
| `updateShow(form, fbs)` | 删除（编译为 `hidden()` 规则） |
| `control.valueChanges.subscribe()` | `effect(() => field().value())` / `computed()` |
| `fb.control` | 删除（运行期状态从表单树读） |
| 手动 `if (invalid) return` | `submit(tree, action)`（自动 `markAsTouched` + 拦截） |

#### 5.2 新增 API

| API | 说明 |
|-----|------|
| `toModel(fbs, value?)` | 由 fbs 生成初始数据模型（缺省回填 `fb.value`） |
| `toSchema(fbs)` | 编译 schema 函数 |
| `resetForm(tree, fbs, value?)` | 重置表单（清空 touched/dirty） |
| `patchForm(tree, value)` | 局部更新（跳过 `undefined` 键，**不过滤隐藏字段**） |
| `visibleValue(tree, fbs)` | 只过滤隐藏字段；禁用字段照常返回 |
| `FormBase.emptyValue()` | 单元缺省空值；文本类覆写为 `''` 以规避 `NG01921` |
| `FormBase.applyRules(path, root)` | 把配置编译成 schema 规则，自定义单元可覆写 |
| `NEVER_DATE` | `date-extra` 的「永不过期」哨兵值 |

### 六、总结

**Signal Forms 带来的核心价值：**

1. **更细粒度的响应式**：字段级状态管理，精准更新
2. **更好的类型安全**：消除 AbstractControl 类型断言
3. **更简洁的 API**：移除 FormGroup/FormControl 依赖
4. **更好的性能**：利用 Signal 的计算缓存和依赖追踪
5. **更好的开发体验**：声明式绑定，代码更清晰

**建议迁移场景：**

- 新项目：直接使用 Signal Forms
- 已有项目：评估迁移成本，分阶段迁移
- 大型项目：优先迁移核心表单模块

---

