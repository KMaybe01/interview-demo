---
title: TypeScript 高频题
---
## 📘 十二、TypeScript 高频面试题

> 🎯 **面试星级**：★★★★★ | 几乎每场前端面试必问
> TypeScript 已成为前端开发标配，以下为最高频的面试考点

### 1️⃣ TypeScript 和 JavaScript 的区别

| 对比维度 | JavaScript | TypeScript |
|---------|-----------|------------|
| 类型系统 | 动态类型，运行时确定 | 静态类型，编译时检查 |
| 编译 | 解释执行（JIT） | 编译为 JS 后执行 |
| 错误发现 | 运行时才能发现类型错误 | 编码阶段即可发现 |
| 面向对象 | ES6 class，较弱 | 完整的 OOP 支持（接口、泛型、抽象类） |
| 工具链 | 基础语法提示 | 更丰富的 IDE 智能提示和重构 |
| 文件后缀 | `.js` / `.mjs` | `.ts` / `.tsx` |
| 学习成本 | 低 | 较高（需学习类型系统） |
| 适用场景 | 小型项目、原型验证 | 中大型项目、团队协作 |

```javascript
// JavaScript：运行时才发现问题
function add(a, b) {
  return a + b;
}
add(1, '2');  // '12'（不是期望的结果）

// TypeScript：编译期报错
function add(a: number, b: number): number {
  return a + b;
}
add(1, '2');  // ❌ 类型错误：string 不能赋值给 number
```

### 2️⃣ interface 和 type 的区别

```mermaid
graph TD
    subgraph interface
        A1["声明合并 ✅<br/>同名自动合并"]
        A2["extends 继承 ✅"]
        A3["class implements ✅"]
        A4["仅描述对象形状"]
        A5["性能更好<br/>(缓存内联)"]
    end

    subgraph type
        B1["声明合并 ❌<br/>同名报错"]
        B2["交叉类型 & ✅"]
        B3["联合类型 | ✅"]
        B4["可声明原始类型<br/>type ID = string"]
        B5["可映射类型<br/>type Keys = 'a' | 'b'"]
        B6["条件类型 ✅"]
    end
```

| 特性 | interface | type |
|------|-----------|------|
| 声明合并 | ✅ 同名自动合并 | ❌ 同名报错 |
| 继承 | `extends` | `&`（交叉类型） |
| 描述对象 | ✅ | ✅ |
| 联合类型 | ❌ | ✅ |
| 映射类型 | ❌ | ✅ |
| 条件类型 | ❌ | ✅ |
| 元组类型 | ❌ | ✅ |
| class implements | ✅ | ✅ |
| 性能 | 更好（结果缓存） | 较慢（每次重新计算） |

```typescript
// 声明合并
interface User { name: string }
interface User { age: number }
// User → { name: string; age: number } ✅

// type 同名报错
type User = { name: string }
type User = { age: number }  // ❌ 重复标识

// type 优势：联合类型
type Status = 'pending' | 'success' | 'error'
type Result<T> = { data: T } | { error: string }

// interface 优势：class implements
interface Animal { eat(): void }
class Dog implements Animal {
  eat() { console.log('eating') }
}
```

**推荐原则：** 优先用 `interface` 描述对象，需要联合/映射/条件类型时用 `type`。

### 3️⃣ any、unknown、never、void 的区别

```mermaid
graph TD
    subgraph "类型层级"
        TOP["unknown （最安全）<br/>需类型收窄后才能使用"]
        ANY["any （最灵活）<br/>关闭类型检查"]
        MID["具体类型<br/>string / number / boolean / ..."]
        NEVER["never （最底层）<br/>永不存在的值"]
        VOID["void<br/>函数无返回值"]
    end
```

| 类型 | 含义 | 可赋值给其他类型 | 可接收其他类型赋值 | 是否可以调用方法 |
|------|------|----------------|-----------------|----------------|
| `any` | 任意类型 | ✅ 任意 | ✅ 任意 | ✅ 任意操作 |
| `unknown` | 未知类型 | ❌（需收窄） | ✅ 任意 | ❌ 需收窄后使用 |
| `never` | 永不存在的值 | ✅ 可赋值给任何类型 | ❌ 不能接收任何赋值 | - |
| `void` | 无返回值 | ❌（除 `any`） | ✅ `undefined` 可赋值 | - |

```typescript
// any：放弃类型检查
let value: any = 1
value = 'string'
value.toFixed()       // 运行时可能报错，但编译不报错

// unknown：安全的 any
let value2: unknown = 'hello'
value2.toUpperCase()  // ❌ 类型不明确，不能调用方法

// 需类型收窄才能使用
if (typeof value2 === 'string') {
  value2.toUpperCase()  // ✅
}

// never：永不存在的值
function throwError(msg: string): never {
  throw new Error(msg)  // 永远不返回
}

function infiniteLoop(): never {
  while (true) {}      // 永远不结束
}

// never 在条件类型中的妙用
type IsString<T> = T extends string ? 'yes' : 'no'
type Result = IsString<number>  // 'no'

// void：没有返回值（返回 undefined）
function log(msg: string): void {
  console.log(msg)
  // 没有 return 或者 return undefined
}
```

### 4️⃣ 泛型（Generics）的理解与应用

**泛型：** 在定义函数、接口、类时，不预先指定具体类型，而是在使用时再确定的类型变量。

```typescript
// 基础泛型函数
function identity<T>(arg: T): T {
  return arg
}
identity<string>('hello')  // 显式指定
identity(42)               // 类型推断 → number

// 泛型约束（extends）
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length
}
getLength('hello')     // ✅ 5
getLength([1, 2, 3])   // ✅ 3
getLength(123)         // ❌ number 没有 length

// 泛型接口
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
type UserResponse = ApiResponse<{ id: number; name: string }>

// 泛型类
class Stack<T> {
  private items: T[] = []
  push(item: T) { this.items.push(item) }
  pop(): T | undefined { return this.items.pop() }
}
const numStack = new Stack<number>()
numStack.push(1)
numStack.push('2')  // ❌ 类型错误

// 多泛型参数
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value]
}
pair('id', 1)  // [string, number]

// 泛型默认值
function createArray<T = string>(length: number, value: T): T[] {
  return Array(length).fill(value)
}
```

### 5️⃣ keyof、typeof、索引访问类型的用法

```mermaid
graph TD
    subgraph "keyof 操作符"
        A["interface User { name: string; age: number }"] --> B["keyof User → 'name' | 'age'"]
    end

    subgraph "typeof 操作符（类型上下文）"
        C["const obj = { a: 1, b: 'hello' }"] --> D["typeof obj → { a: number; b: string }"]
    end

    subgraph "索引访问类型"
        E["interface User { profile: { name: string } }"] --> F["User['profile'] → { name: string }"]
    end
```

```typescript
// keyof：获取对象类型的键的联合类型
interface Person {
  name: string
  age: number
  email: string
}
type PersonKeys = keyof Person  // 'name' | 'age' | 'email'

// 应用场景：安全访问对象属性
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
const p: Person = { name: 'Tom', age: 20, email: 'tom@test.com' }
getProperty(p, 'name')  // ✅ string
getProperty(p, 'phone') // ❌ 'phone' 不在 keyof Person 中

// typeof：在类型上下文中获取值的类型
const config = {
  url: 'https://api.example.com',
  timeout: 5000,
  retry: true
}
type Config = typeof config
// { url: string; timeout: number; retry: boolean }

// 索引访问类型：获取属性的类型
type NameType = Person['name']  // string
type ValueType = Person['name' | 'age']  // string | number

// 实战：深层索引访问
interface APIResponse {
  data: {
    user: {
      id: number
      profile: { avatar: string; bio: string }
    }
  }
}
type AvatarType = APIResponse['data']['user']['profile']['avatar']  // string
```

### 6️⃣ 类型守卫（Type Guards）和类型收窄

```typescript
// typeof 类型守卫
function format(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase()   // 此处 value 收窄为 string
  }
  return value.toFixed(2)        // 此处 value 收窄为 number
}

// instanceof 类型守卫
class Dog { bark() {} }
class Cat { meow() {} }
function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark()  // ✅ Dog
  } else {
    animal.meow()  // ✅ Cat
  }
}

// in 类型守卫
interface Admin { role: 'admin'; permissions: string[] }
interface User { role: 'user'; email: string }
function handleUser(user: Admin | User) {
  if ('permissions' in user) {
    console.log(user.permissions)  // ✅ Admin
  } else {
    console.log(user.email)        // ✅ User
  }
}

// 自定义类型守卫（is）
interface Fish { swim(): void }
interface Bird { fly(): void }
function isFish(animal: Fish | Bird): animal is Fish {
  return (animal as Fish).swim !== undefined
}
function move(animal: Fish | Bird) {
  if (isFish(animal)) {
    animal.swim()  // ✅ 收窄为 Fish
  } else {
    animal.fly()   // ✅ 收窄为 Bird
  }
}

// 可辨识联合（Discriminated Union）
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2    // ✅ radius 可用
    case 'square':
      return shape.side ** 2                 // ✅ side 可用
    case 'triangle':
      return (shape.base * shape.height) / 2 // ✅ base/height 可用
  }
}
```

### 7️⃣ 工具类型（Utility Types）详解

```mermaid
graph LR
    subgraph "映射类型"
        A["Partial<T>"] --> A1["所有属性可选"]
        B["Required<T>"] --> B1["所有属性必填"]
        C["Readonly<T>"] --> C1["所有属性只读"]
        D["Pick<T, K>"] --> D1["选取部分属性"]
        E["Omit<T, K>"] --> E1["排除部分属性"]
    end

    subgraph "联合类型"
        F["Exclude<T, U>"] --> F1["从 T 排除 U"]
        G["Extract<T, U>"] --> G1["从 T 提取 U"]
        H["NonNullable<T>"] --> H1["排除 null/undefined"]
    end

    subgraph "函数类型"
        I["Parameters<T>"] --> I1["获取参数类型"]
        J["ReturnType<T>"] --> J1["获取返回值类型"]
    end
```

```typescript
interface User {
  id: number
  name: string
  email: string
  age?: number
}

// Partial - 所有属性变为可选
type PartialUser = Partial<User>
// { id?: number; name?: string; email?: string; age?: number }

// Required - 所有属性变为必填
type RequiredUser = Required<User>
// { id: number; name: string; email: string; age: number }

// Readonly - 所有属性变为只读
type ReadonlyUser = Readonly<User>
// { readonly id: number; readonly name: string; ... }

// Pick - 选取指定属性
type UserBasic = Pick<User, 'id' | 'name'>
// { id: number; name: string }

// Omit - 排除指定属性
type UserWithoutEmail = Omit<User, 'email'>
// { id: number; name: string; age?: number }

// Exclude - 从联合类型中排除
type T0 = Exclude<'a' | 'b' | 'c', 'a'>     // 'b' | 'c'

// Extract - 从联合类型中提取
type T1 = Extract<'a' | 'b' | 'c', 'a' | 'f'>  // 'a'

// ReturnType - 获取函数返回值类型
function fetchUser() { return { id: 1, name: 'Tom' } }
type FetchResult = ReturnType<typeof fetchUser>
// { id: number; name: string }

// Parameters - 获取函数参数类型
function greet(name: string, age: number) {}
type GreetParams = Parameters<typeof greet>
// [string, number]

// Record - 构造对象类型
type PageInfo = Record<'home' | 'about' | 'contact', string>
// { home: string; about: string; contact: string }

// 手动实现 Partial（理解原理）
type MyPartial<T> = {
  [K in keyof T]?: T[K]
}
```

### 8️⃣ 条件类型（Conditional Types）

```typescript
// 基础条件类型
type IsString<T> = T extends string ? 'yes' : 'no'
type A = IsString<string>  // 'yes'
type B = IsString<number>  // 'no'

// 分布式条件类型（联合类型自动分发）
type ToArray<T> = T extends unknown ? T[] : never
type Result = ToArray<string | number>
// string[] | number[]（不是 (string | number)[]）

// 实战：提取 Promise 中的值类型
type Unwrap<T> = T extends Promise<infer U> ? U : T
type T1 = Unwrap<Promise<string>>  // string
type T2 = Unwrap<number>           // number

// infer 关键字：在条件类型中推断类型
type Return<T> = T extends (...args: any[]) => infer R ? R : never
type Fn = Return<() => number>  // number

// 实战：深度提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never
type Arr = ElementOf<string[]>  // string

// 实战：函数第一个参数类型
type FirstArg<T> = T extends (first: infer F, ...args: any[]) => any ? F : never
type First = FirstArg<(name: string, age: number) => void>  // string
```

### 9️⃣ 映射类型（Mapped Types）

```typescript
// 基础映射类型：将对象的所有属性转为 boolean
type Booleanify<T> = {
  [K in keyof T]: boolean
}
type Feature = { darkMode: string; autoSave: string }
type FeatureFlags = Booleanify<Feature>
// { darkMode: boolean; autoSave: boolean }

// 修饰符：+/- 添加/移除 readonly
type CreateMutable<T> = {
  -readonly [K in keyof T]: T[K]  // 移除 readonly
}

type CreateImmutable<T> = {
  +readonly [K in keyof T]: T[K]  // 添加 readonly
}

// 键名重映射（as 子句）
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
interface Person { name: string; age: number }
type PersonGetters = Getters<Person>
// { getName: () => string; getAge: () => number }

// 过滤属性
type FilterString<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
}
interface Mixed { a: string; b: number; c: boolean }
type OnlyString = FilterString<Mixed>
// { a: string }

// 实战：所有属性变为可选且值为函数
type Methods<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]?: (value: T[K]) => void
}
type UserMethods = Methods<{ name: string; age: number }>
// { setName?: (value: string) => void; setAge?: (value: number) => void }
```

### 1️⃣0️⃣ `satisfies` 操作符

`satisfies`（TS 4.9+）用于**验证类型兼容性**，同时保留**最窄的类型推断**。

```typescript
// 不使用 satisfies：类型被放宽
const palette1: Record<'red' | 'green' | 'blue', string | string[]> = {
  red: [255, 0, 0],     // 类型推断为 string | string[]
  green: '#00ff00',     // 类型推断为 string | string[]
  blue: [0, 0, 255],    // 类型推断为 string | string[]
}
palette1.red.map(Number)  // ❌ map 不存在于 string | string[]

// 使用 satisfies：保留精确类型
const palette2 = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} satisfies Record<'red' | 'green' | 'blue', string | string[]>

palette2.red.map(Number)  // ✅ TS 知道 red 是 number[]
palette2.green.toUpperCase()  // ✅ TS 知道 green 是 string

// 另一个场景：对象属性校验
type Color = 'primary' | 'secondary'
type ButtonConfig = Record<Color, string>

const config1 = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500',
  tertiary: 'bg-red-500',  // ❌ 多余属性会报错
} satisfies ButtonConfig

const config2 = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500',
} satisfies ButtonConfig  // ✅ 正确
```

### 1️⃣1️⃣ `as const` 的作用

`as const` 将值推断为**字面量类型**，使对象的属性变为 `readonly`。

```typescript
// 没有 as const：类型被放宽
const colors = {
  primary: 'blue',
  secondary: 'gray'
}
// typeof colors → { primary: string; secondary: string }

// 有 as const：保持字面量类型
const colorsConst = {
  primary: 'blue',
  secondary: 'gray'
} as const
// typeof colorsConst → { readonly primary: 'blue'; readonly secondary: 'gray' }

// 应用场景1：联合类型来源于配置
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
} as const
type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]
// 'GET' | 'POST' | 'PUT' | 'DELETE'

// 应用场景2：枚举替代方案
export const ERROR_CODES = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  SERVER_ERROR: 500,
} as const
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
// 404 | 401 | 500

// 应用场景3：数组字面量
const roles = ['admin', 'user', 'guest'] as const
type Role = typeof roles[number]  // 'admin' | 'user' | 'guest'
```

### 1️⃣2️⃣ 装饰器（Decorators）— Legacy vs 标准装饰器

> **面试高频**：TypeScript 5.x 引入的 Stage 3 标准装饰器与 legacy experimentalDecorators 的本质区别。

#### Legacy 装饰器（`experimentalDecorators: true`，旧版）

```typescript
// tsconfig.json 需开启 "experimentalDecorators": true

// 类装饰器
function logClass(constructor: Function) {
  console.log(`Class ${constructor.name} 被创建`)
}

@logClass
class MyService {}

// 方法装饰器 — 通过修改 descriptor 实现
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value
  descriptor.value = function(...args: any[]) {
    console.log(`调用 ${propertyKey}，参数:`, args)
    return original.apply(this, args)
  }
  return descriptor
}

class Calculator {
  @Log
  add(a: number, b: number): number {
    return a + b
  }
}

// 属性装饰器
function Readonly(target: any, propertyKey: string) {
  Object.defineProperty(target, propertyKey, { writable: false })
}

class Config {
  @Readonly
  static apiUrl: string
}

// ⚠️ Legacy 装饰器参数随装饰目标变化，类型安全性差
```

#### Stage 3 标准装饰器（TypeScript 5.x+，无需 experimentalDecorators）

```typescript
// tsconfig.json 无需 experimentalDecorators，使用 2023 年 ES 标准

// 标准装饰器签名： (value, context) => replacement
// - value: 被装饰的值（类 / 方法 / getter / setter / 字段 / 访问器）
// - context: 上下文对象 { kind, name, access, private, static, addInitializer }

// 类装饰器
function logClass(value: Function, context: ClassDecoratorContext) {
  console.log(`Class: ${context.name}`)
  return value // 可返回新类替换原类
}

@logClass
class MyService {}

// 方法装饰器 — 返回新函数实现拦截，类型安全
function logMethod<T extends (...args: any[]) => any>(
  value: T,
  context: ClassMethodDecoratorContext
): T {
  const methodName = String(context.name)

  function replacement(this: any, ...args: any[]) {
    console.log(`调用 ${methodName}，参数:`, args)
    const result = value.call(this, ...args)
    console.log(`返回:`, result)
    return result
  }
  return replacement as T
}

class Calculator {
  @logMethod
  add(a: number, b: number): number {
    return a + b
  }
}

// 字段装饰器 — 通过初始化器拦截
function reactive<T>(value: T, context: ClassFieldDecoratorContext) {
  return function(initialValue: T) {
    console.log(`初始化字段 ${String(context.name)} =`, initialValue)
    return initialValue
  }
}

class State {
  @reactive
  count: number = 0
}

// 访问器装饰器（getter/setter）
function tracked<T>(value: T, context: ClassGetterDecoratorContext) {
  return function(this: any) {
    console.log(`访问 ${String(context.name)}`)
    return value.call(this)
  }
}

class User {
  private _name = ''

  @tracked
  get name() { return this._name }
  set name(v: string) { this._name = v }
}
```

#### Legacy vs 标准装饰器核心对比

| 对比维度 | Legacy 装饰器 | 标准装饰器（Stage 3） |
|---------|-------------|---------------------|
| **配置要求** | `experimentalDecorators: true` | 无需额外配置 |
| **签名** | 随目标变化（target/propertyKey/descriptor） | 统一 `(value, context)` |
| **类型安全** | ❌ 弱（参数为 `any`/`PropertyDescriptor`） | ✅ 强（context 参数有 `kind` 细分类型） |
| **拦截方式** | 修改 `descriptor.value` | 返回新的包装函数 |
| **类装饰器返回值** | 修改原型，不替换类 | 返回新类替换原类 |
| **元数据** | 需 `emitDecoratorMetadata` + `reflect-metadata` | `context.metadata` 内置支持 |
| **私有成员** | 无法装饰私有字段 | ✅ `context.private` 标记，可安全访问 |
| **TS 版本** | 1.5+ | 5.0+ |
| **ES 状态** | Babel 遗留规范 | Stage 3，已进入 ES2024 候选 |
| **未来** | TypeScript 6.x 可能移除 | 长期发展方向 |

**推荐：新项目使用标准装饰器，无需开启 `experimentalDecorators`。**

### 1️⃣3️⃣ TypeScript 中的 class 增强

```typescript
// 访问修饰符
class Animal {
  public name: string        // 公开（默认）
  private age: number        // 私有，仅在类内访问
  protected type: string     // 保护，类及子类可访问
  readonly id: number        // 只读

  constructor(name: string, age: number, type: string, id: number) {
    this.name = name
    this.age = age
    this.type = type
    this.id = id
  }

  // 参数属性简写（等价于上面）
  constructor(
    public name: string,
    private age: number,
    protected type: string,
    readonly id: number
  ) {}
}

// 抽象类
abstract class Shape {
  abstract getArea(): number  // 抽象方法，子类必须实现

  // 可以有具体实现
  getDescription(): string {
    return `面积: ${this.getArea()}`
  }
}

class Circle extends Shape {
  constructor(private radius: number) {
    super()
  }
  getArea(): number {
    return Math.PI * this.radius ** 2
  }
}

// implements：类实现接口
interface Flyable {
  fly(): void
}
interface Swimmable {
  swim(): void
}
class Duck implements Flyable, Swimmable {
  fly() { console.log('飞') }
  swim() { console.log('游') }
}

// 静态成员
class Utils {
  static readonly PI = 3.14159
  static createRandomId(): string {
    return Math.random().toString(36).slice(2)
  }
}
Utils.PI               // ✅ 3.14159
Utils.createRandomId() // ✅ 'x7f8a...'
```

### 1️⃣4️⃣ 模块声明与类型声明

```typescript
// .d.ts 声明文件
// global.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 为无类型的三方库声明
declare module 'some-untyped-lib' {
  export function doSomething(): void
  export const version: string
}

// 全局类型声明
declare global {
  interface Window {
    __INITIAL_STATE__: Record<string, any>
  }
}

// 命名空间（旧写法）
declare namespace MyLib {
  function greet(name: string): string
  interface Config { path: string }
}

// 类型声明 vs 变量声明
// 类型：编译后完全移除
type UserID = string
interface Data { id: UserID }

// 变量：编译后会保留
const API_URL = '/api'
```

### 1️⃣5️⃣ tsconfig.json 核心配置

```json
{
  "compilerOptions": {
    // 模块配置
    "module": "ESNext",              // 模块系统
    "moduleResolution": "bundler",   // 模块解析策略
    "target": "ES2020",              // 目标 ECMAScript 版本
    "lib": ["ES2020", "DOM"],        // 引入的类型定义

    // 严格模式（推荐全开）
    "strict": true,                   // 启用所有严格检查
    "noImplicitAny": true,            // 禁止隐式 any
    "strictNullChecks": true,         // 严格的 null 检查
    "noUnusedLocals": true,           // 禁止未使用的局部变量
    "noUnusedParameters": true,       // 禁止未使用的参数

    // 输出配置
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,               // 生成 sourceMap
    "declaration": true,             // 生成 .d.ts 文件

    // 其他
    "esModuleInterop": true,         // 兼容 CommonJS 和 ES Module
    "skipLibCheck": true,            // 跳过库文件的类型检查
    "forceConsistentCasingInFileNames": true,  // 强制文件名大小写一致性
    "resolveJsonModule": true,       // 允许导入 JSON
    "isolatedModules": true          // 每个文件独立编译
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**高频面试问题：**

```typescript
// Q: strictNullChecks 的作用？
// A: 启用后，null/undefined 不能赋值给其他类型，需显式处理

// 关闭 strictNullChecks：
const name: string = null  // ✅ 允许

// 开启 strictNullChecks：
const name: string = null  // ❌ Type 'null' is not assignable to type 'string'
const name: string | null = null  // ✅ 需联合类型
```

### 1️⃣6️⃣ 枚举（Enum）的使用与问题

```typescript
// 数字枚举
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right    // 3
}

// 字符串枚举
enum Color {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE'
}

// 反向映射（仅数字枚举支持）
console.log(Direction[0])     // 'Up'
console.log(Direction.Up)     // 0

// 异构枚举（混合类型，不推荐）
enum Mixed {
  Yes = 'YES',
  No = 0
}

// 常量枚举（编译时内联，性能更好）
const enum HttpStatus {
  OK = 200,
  NotFound = 404,
  Error = 500
}
// 编译后直接内联为数字，不会生成枚举对象

// 枚举的问题与替代方案
// 问题1：枚举是运行时存在的对象，会增加打包体积
// 问题2：数字枚举可能有安全风险
enum Foo { A }
function f(value: Foo) {}
f(100)  // ✅ 不会报错！数字枚举运行时检查不严格

// 替代方案：as const + 联合类型（推荐）
const Status = {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const
type Status = typeof Status[keyof typeof Status]
// 'active' | 'inactive' | 'pending'
```

### 1️⃣7️⃣ 类型断言 vs 类型声明

```typescript
// 类型断言（告诉 TS 你比它更了解类型）
const value: any = 'hello'
const length1 = (value as string).length  // as 语法
const length2 = (<string>value).length    // 尖括号语法（JSX 中不能用）

// 非空断言（告诉 TS 一定不是 null/undefined）
function logX(x?: number | null) {
  console.log(x!.toFixed(2))  // x! 表示 x 一定存在
}

// 双重断言（极少使用，通常是设计问题）
const str = 'hello' as unknown as number  // 先转 unknown 再转其他

// 类型声明（比类型断言更严格）
interface Admin { name: string; permissions: string[] }
interface User { name: string; email: string }

const user1 = { name: 'Tom', email: 'tom@test.com' } as Admin
// 编译通过 ✅（但运行时可能有问题）

const user2: Admin = { name: 'Tom', email: 'tom@test.com' }
// ❌ 类型错误：缺少 permissions，email 不在 Admin 中

// 关键区别：类型声明要求完全符合接口，类型断言会放宽检查
```

### 1️⃣8️⃣ `this` 参数类型

```typescript
// TypeScript 可以显式声明 this 参数类型（此参数为假参数，编译后移除）
interface Clickable {
  click(): void
}

function handleClick(this: Clickable) {
  console.log('点击:', this.click())
}

const button: Clickable = {
  click() { console.log('clicked') }
}
handleClick.call(button)  // ✅ '点击: clicked'

// 禁止错误的调用方式
handleClick()  // ❌ this 类型不匹配

// this 参数在回调中的类型保护
const handlers = {
  onClick(this: HTMLButtonElement, e: Event) {
    this.disabled = true  // ✅ this 被收窄为 HTMLButtonElement
  }
}
```

### 1️⃣9️⃣ 模板字面量类型

```typescript
// 基础模板字面量类型
type EventName = `on${Capitalize<string>}`
type ClickEvent = EventName  // 'on' + Capitalize<string>（过于宽泛）

// 更实用的用法：结合联合类型
type Direction = 'left' | 'right' | 'top' | 'bottom'
type CSSProperty = `margin-${Direction}`
// 'margin-left' | 'margin-right' | 'margin-top' | 'margin-bottom'

type Size = 'sm' | 'md' | 'lg'
type Color = 'primary' | 'secondary'
type ButtonVariant = `${Color}-${Size}`
// 'primary-sm' | 'primary-md' | 'primary-lg' | 'secondary-sm' | ...

// 内置字符串操作类型
type Greeting = 'hello, world'
type UpperGreeting = Uppercase<Greeting>    // 'HELLO, WORLD'
type LowerGreeting = Lowercase<Greeting>    // 'hello, world'
type Capitalized = Capitalize<Greeting>     // 'Hello, world'
type UnCapitalized = Uncapitalize<Greeting> // 'hello, world'

// 实战：类型安全的 CSS 类名生成
type Spacing = '0' | '1' | '2' | '4' | '8'
type SpacingType = 'm' | 'p'  // margin / padding
type SpacingSide = '' | 't' | 'b' | 'l' | 'r'
type SpacingClass = `${SpacingType}${SpacingSide}-${Spacing}`
// 'm-0' | 'm-1' | ... | 'pt-2' | 'pb-4' | 'pr-8' | ...
```

### 2️⃣0️⃣ TypeScript 常见面试手写题

```typescript
// 1. 实现 Pick
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P]
}

// 2. 实现 Readonly
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P]
}

// 3. 实现 ReturnType
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any

// 4. 实现 Omit
type MyOmit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P]
}

// 5. 实现 Partial
type MyPartial<T> = {
  [P in keyof T]?: T[P]
}

// 6. 实现 DeepPartial（递归）
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// 7. 实现 Required
type MyRequired<T> = {
  [P in keyof T]-?: T[P]
}

// 8. 实现 Record
type MyRecord<K extends keyof any, V> = {
  [P in K]: V
}

// 9. 获取数组元素类型
type ArrayItem<T extends any[]> = T extends (infer U)[] ? U : never
type Item = ArrayItem<string[]>  // string

// 10. 去除 readonly（映射类型 - 修饰符）
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
```

### 2️⃣1️⃣ TypeScript 6.0 vs 7.0 核心变化

> TypeScript 6.0（2026.03）是**最后一个 JS 编写的编译器版本**，TypeScript 7.0（2026.07）是**Go 重写的原生编译器**，速度提升 8-12x。

#### 架构变革

| 对比维度 | TypeScript 6.0 | TypeScript 7.0 |
|---------|---------------|---------------|
| **编译器语言** | JavaScript | Go（项目名 Corsa） |
| **构建速度** | 基线 | 8-12x 更快（全量构建） |
| **内存** | 基线 | 减少 6-26% |
| **并行化** | 单线程 | 多线程类型检查（`--checkers`，默认 4） |
| **多项目构建** | 串行 | 并行（`--builders` 标志） |
| **Watch 模式** | 轮询 | Parcel watcher（Go 移植版） |
| **API** | 完整编译器 API | **暂无公开 API**（7.1 恢复） |
| **编辑器** | tsserver | LSP 原生 + 多线程，故障减少 80%+ |
| **嵌入式语言** | Vue/Svelte/Astro/Angular 可用 | 暂不支持（需 7.1+） |

#### 性能对比（来自官方数据）

| 项目 | TS 6.0 | TS 7.0 | 加速比 |
|------|--------|--------|--------|
| vscode | 125.7s | 10.6s | **11.9x** |
| sentry | 139.8s | 15.7s | **8.9x** |
| bluesky | 24.3s | 2.8s | **8.7x** |
| playwright | 12.8s | 1.47s | **8.7x** |
| tldraw | 11.2s | 0.46s | **7.7x** |

#### TS 6.0 新特性

```typescript
// 1. Temporal API 支持（Stage 4）
let yesterday = Temporal.Now.instant().subtract({ hours: 24 })

// 2. Map.getOrInsert / getOrInsertComputed
const map = new Map<string, number>()
const value = map.getOrInsert('key', 42)  // 不存在则设置默认值
map.getOrInsertComputed('key', () => computeExpensive())

// 3. RegExp.escape
const escaped = RegExp.escape('user@example.com')  // 转义正则特殊字符

// 4. es2025 target
// tsconfig: "target": "es2025"  — 自动支持 ES2025 内置类型

// 5. less this-less functions 上下文敏感度
// 未使用 this 的函数不再被视为上下文敏感函数，类型推断更准确

// 6. 子路径导入 #/
// tsconfig: "imports": { "#/*": "./dist/*" }
import { utils } from '#/utils.js'

// 7. 稳定类型排序标志
// tsconfig: "stableTypeOrdering": true  — 使排序行为与 TS 7.0 一致
```

#### TS 6.0 配置默认值变更

| 选项 | TS 5.x 默认值 | TS 6.0 默认值 |
|------|-------------|-------------|
| `strict` | `false` | **`true`** |
| `module` | `commonjs` | **`esnext`** |
| `target` | `es3` | **`es2025`** |
| `esModuleInterop` | `false` | **`true`**（不能关闭） |
| `types` | 自动扫描所有 | **`[]`**（需显式声明） |
| `rootDir` | 自动推断 | **`.`**（tsconfig 目录） |
| `noUncheckedSideEffectImports` | `false` | **`true`** |
| `libReplacement` | `true` | **`false`** |

#### TS 6.0 废弃/移除项（TS 7.0 中变为硬错误）

```json
{
  "compilerOptions": {
    "target": "es5",                    // ❌ 废弃，最低 es2015
    "downlevelIteration": true,         // ❌ 废弃（仅 es5 相关）
    "moduleResolution": "node",         // ❌ 改用 nodenext 或 bundler
    "module": "amd",                    // ❌ 废弃
    "module": "umd",                    // ❌ 废弃
    "module": "systemjs",              // ❌ 废弃
    "module": "none",                  // ❌ 废弃
    "baseUrl": "./src",                // ❌ 改用 paths
    "outFile": "./bundle.js",          // ❌ 移除，用外部打包工具
    "esModuleInterop": false,          // ❌ 不能设为 false
    "allowSyntheticDefaultImports": false, // ❌ 不能设为 false
    "alwaysStrict": false              // ❌ 始终为 true
  }
}
```

#### TS 6.0 语法废弃

```typescript
// ❌ 废弃：module 做命名空间
module Foo {
  export const bar = 10
}

// ✅ 正确：用 namespace
namespace Foo {
  export const bar = 10
}

// ❌ 废弃：import assertions
import data from './data.json' asserts { type: 'json' }

// ✅ 正确：用 import attributes
import data from './data.json' with { type: 'json' }

// ❌ 废弃：tsc foo.ts 但目录有 tsconfig.json
// 会报错 TS5112，需加 --ignoreConfig
tsc --ignoreConfig foo.ts
```

#### TS 7.0 核心新特性

```typescript
// 1. 模板字面量类型保留 Unicode 码点
type HeadTail<S> = S extends `${infer Head}${infer Tail}` ? [Head, Tail] : never
type Result = HeadTail<'😀abc'>
// TS 6: ["\ud83d", "\ude00abc"]  — UTF-16 代理对分割
// TS 7: ["😀", "abc"]            — Unicode 码点分割 ✅

// 2. 并行类型检查器
// tsconfig: "checkers": 4  (默认)
// tsconfig: "builders": 2  (并行构建项目引用)

// 3. 单线程模式
// tsc --singleThreaded

// 4. JS 分析重写
// - @enum 不再被识别 → 用 @typedef
// - Closure 风格函数类型不再支持
// - ? 不能单独做类型 → 用 any
// - @class 不能让函数变构造函数 → 用 class 声明
// - Postfix ! 不支持 → 用 T
// - @typedef 必须标签内定义类型别名

// 5. Side-by-side 兼容
// npm install -D typescript@npm:@typescript/typescript6
// 同时安装 TS 7 和 TS 6，tsc 指向 7，tsc6 指向 6
```

#### 迁移建议

| 场景 | 建议 |
|------|------|
| 新项目 | 直接使用 TS 7.0 + `strict: true`，走 `esnext` + `bundler` |
| 现有项目 | 先升级到 TS 6.0，处理所有 deprecation 警告，再升 7.0 |
| 使用 Vue/Svelte/Astro | 暂留 TS 6.0，等待生态工具适配 7.0 API |
| 使用 Angular | CLI 用 TS 7 编译，编辑器可降级到 TS 6 |
| 工具/库作者 | 使用 `@typescript/typescript6` 兼容包，期待 7.1 API |
| 大 monorepo | TS 7 CI 提速 8-10x，editor 体验极大改善 |

**一句话总结：TS 7 = Go 重写 + 10x 更快 + 所有 TS 6 废弃项变硬错误。先升 6，再升 7。**
```
