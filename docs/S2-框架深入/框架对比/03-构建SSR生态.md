---
title: 构建、SSR与生态
---
## 六、构建工具链

| 对比项 | Vue 生态 | React 生态 | Angular 生态 |
|--------|---------|-----------|-------------|
| **官方构建** | Vite | Create React App (已不推荐) / Vite | Angular CLI (esbuild) |
| **推荐方案** | Vite + @vitejs/plugin-vue | Vite / Next.js | Angular CLI (已迁移 esbuild) |
| **HMR** | < 50ms | < 50ms | < 200ms |
| **测试** | Vitest | Vitest / Jest | Jasmine / Karma (已弃用 Jest 可选) |
| **E2E** | Playwright / Cypress | Playwright / Cypress | Playwright / Cypress |
| **Lint** | ESLint + Prettier | ESLint + Prettier | ESLint + Prettier (Angular ESLint) |
| **Monorepo** | Turborepo / Nx | Turborepo / Nx | Nx (官方推荐) |
| **微前端** | Module Federation / qiankun | Module Federation / qiankun | Module Federation / single-spa |

### 6.1 构建配置对比

```typescript
// vite.config.ts — Vue 生态（配置最少）
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2022',
    rollupOptions: { /* 按需 */ }
  }
})

// vite.config.ts — React 生态（同样简洁）
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' }
})

// angular.json — Angular 生态（JSON 配置，CLI 管理）
{
  "projects": {
    "my-app": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],   // Angular 21 默认 Zoneless 不再需要
            "tsConfig": "tsconfig.app.json",
            "assets": ["src/favicon.ico"],
            "styles": ["src/styles.css"]
          },
          "configurations": {
            "production": {
              "budgets": [
                { "type": "initial", "maximumWarning": "500kb" }
              ],
              "outputHashing": "all"
            }
          }
        }
      }
    }
  }
}
```

### 6.2 构建产物对比

```
Vue 3 + Vite 构建产物：
  dist/
    ├─ index.html          ~2KB
    ├─ assets/index-xxx.js ~33KB (gzip)   ← 核心 Vue 运行时
    └─ assets/vendor-xxx.js                ← 第三方依赖

React 19 + Vite 构建产物：
  dist/
    ├─ index.html          ~2KB
    ├─ assets/index-xxx.js ~44KB (gzip)   ← React + ReactDOM
    └─ assets/vendor-xxx.js                ← 第三方依赖

Angular 21 + esbuild 构建产物：
  dist/
    ├─ index.html          ~3KB
    ├─ main-xxx.js         ~130-150KB (gzip)  ← Angular 完整框架（Zoneless + 增量编译）
    ├─ polyfills-xxx.js    ~0KB (Zoneless) ← Angular 21 默认无 Zone.js
    ├─ styles-xxx.css      ~5KB
    └─ chunk-xxx.js                       ← 懒加载模块
```

### 6.3 编译引擎性能对比（2026）

| 引擎 | 框架使用 | 语言 | 冷构建 (1000组件) | HMR | 优势 |
|------|---------|------|------------------|-----|------|
| **Vite (Rollup)** | Vue 3 / React | JS/Rust (esbuild) | ~2s | <50ms | 开发体验最好 |
| **Turbopack** | Next.js (React) | Rust | ~1.5s | <50ms | SWC 编译快 |
| **esbuild** | Angular CLI | Go | ~3s | <200ms | 原生编译快 |
| **Rspack** | 全框架可选 | Rust | ~1s | <30ms | Webpack 兼容 |
| **Rolldown** | Vite 8 (2026) | Rust | ~0.8s | <30ms | 默认构建引擎 |

```
冷构建性能（1000 组件工程）：
  Vite 8 / Rolldown:  ~0.8s  🥇
  Turbopack:          ~1.5s  🥈
  Angular CLI/esbuild: ~3s   🥉
  Webpack 5:          ~8s    ❌

HMR 性能（单文件修改）：
  Vite 8 / Rolldown:  ~25ms  🥇
  Turbopack:          ~40ms  🥈
  Angular CLI/esbuild: ~150ms 🥉
  Webpack 5:          ~500ms ❌
```

### 6.4 Monorepo 方案对比

| 对比项 | Turborepo | Nx | Lerna (传统) |
|--------|----------|----|-------------|
| **框架支持** | 通用（最适 React） | Angular 官方 + 通用 | 通用 |
| **缓存** | 远程缓存（Vercel） | Nx Cloud | 本地缓存 |
| **任务编排** | 管道（pipeline） | 依赖图（graph） | 顺序/并行 |
| **生成器** | ❌ 无 | ✅ 丰富（Angular CLI 集成） | ❌ |
| **迁移成本** | 低 | 中 | 低 |
| **推荐场景** | React 项目 | Angular 项目 | 遗留项目 |

### 6.5 CI/CD 与 DevOps 对比

| 对比项 | Vue 3 | React 19 | Angular 21 |
|--------|-------|----------|------------|
| **静态分析** | ESLint + vue-tsc | ESLint + TypeScript | Angular ESLint + ngc |
| **代码格式化** | Prettier | Prettier | Prettier / clang-format |
| **Pre-commit** | husky + lint-staged | husky + lint-staged | husky + lint-staged |
| **单元测试 CI** | Vitest (30s) | Vitest (30s) | Jest / Jasmine (60s) |
| **E2E CI** | Playwright (2min) | Playwright (2min) | Playwright (2min) |
| **构建 CI** | vite build (10s) | vite build (10s) | ng build (30s) |
| **Docker 镜像** | Nginx (~20MB) | Nginx / Node (~50MB) | Nginx (~30MB) |
| **CD 策略** | Vercel / Docker | Vercel / Docker | Docker / K8s |
| **性能监控** | Lighthouse CI / Sentry | Vercel Analytics / Sentry | Angular DevTools / Sentry |

**典型 CI 配置对比：**

```yaml
# Vue / React — GitHub Actions（极简）
name: CI
on: [push]
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm test

# Angular — GitHub Actions（需更多步骤）
name: CI
on: [push]
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx ng test --watch=false --browsers=ChromeHeadless
      - run: npx ng build --configuration production
```

---

## 七、SSR/SSG 方案

| 对比项 | Nuxt 5 (Vue) | Next.js 16 (React) | Analog (Angular) |
|--------|-------------|-------------------|-------------------|
| **模式** | SSR / SSG / ISR / SPA | SSR / SSG / ISR / SPA | SSR / SSG / SPA |
| **文件路由** | app/ (Rust 编译) | app/ (App Router) | pages/ |
| **数据获取** | useAsyncData / $fetch | fetch / server functions | Resolver / HttpClient |
| **流式渲染** | ✅ | ✅ (Node.js Edge) | ✅ (SSR 流) |
| **边缘部署** | ✅ (Nitro) | ✅ (Edge Runtime) | 有限 |
| **Server Components** | ❌ 无直接支持 | ✅ RSC（React 19 核心） | ❌ |
| **Server Actions** | ✅ server 函数 | ✅ Server Functions | ❌ |
| **ISR** | ✅ (Nuxt 5) | ✅ (Next.js 16) | ❌ |
| **Partial Prerender** | ❌ | ✅ PPR (Next 16) | ❌ |
| **成熟度** | 高 | 极高 | 中（快速迭代） |
| **社区生态** | 大 | 极大 | 小 |

### 7.1 数据获取对比

```typescript
// Nuxt 5 — useAsyncData
const { data, pending, error } = await useAsyncData('users', () =>
  $fetch('/api/users')
)
// 自动 loading/error 状态，SSR 自动序列化

// Next.js 16 — Server Component 数据获取
async function getUsers() {
  return await fetch('https://api.example.com/users').then(r => r.json())
}
// 服务端组件中直接 async/await 获取数据，自动支持 Suspense

// Analog — Resolver
@Injectable({ providedIn: 'root' })
export class UsersResolver implements Resolve<User[]> {
  resolve(route: ActivatedRouteSnapshot) {
    return this.http.get<User[]>('/api/users')
  }
}
// 路由激活前预取，组件内通过 ActivatedRoute.data 获取
```

### 7.2 部署平台适配

| 平台 | Nuxt 5 | Next.js 16 | Analog |
|------|--------|-----------|--------|
| **Vercel** | ✅（Nitro 适配） | ✅ 原生（最佳支持） | ⚠️ 实验性 |
| **Netlify** | ✅ | ✅ | ❌ |
| **Cloudflare Workers** | ✅（Nitro） | ✅（Edge Runtime） | ❌ |
| **AWS Lambda** | ✅（Nitro） | ✅ | ✅（Node.js） |
| **自建 Docker** | ✅（Nitro） | ✅ | ✅（Node.js） |
| **Deno Deploy** | ✅（Nitro） | ❌ | ❌ |

**趋势：** Nuxt 5 的 Nitro 引擎在 Serverless 兼容性上最广，
Next.js 16 在 Vercel 生态中体验最好，
Analog 部署选择有限但正在追赶。

---

## 八、生态全维度对比

### 8.1 UI 组件库生态

| 对比项 | Vue 生态 | React 生态 | Angular 生态 |
|--------|---------|-----------|------------|
| **企业级 UI** | Element Plus / Ant Design Vue / Naive UI | Ant Design / Arco Design / Semi Design | Angular Material / PrimeNG / DevExtreme |
| **移动端** | Vant / NutUI / Varlet | Ant Design Mobile / NutUI React | Ionic (基于 Web Components) |
| **轻量级** | PrimeVue / Radix Vue | shadcn/ui / Radix UI | CDK (组件开发套件) |
| **UI 灵活度** | 中等（Element 约定较多） | 高（shadcn/ui 源码可定制） | 中等（Material Design 规范强） |
| **CSS 方案** | Scoped CSS / UnoCSS / Tailwind | CSS-in-JS / Tailwind / CSS Modules | View Encapsulation / Tailwind |
| **设计规范** | 弱（多样性） | 中等（Ant Design / Radix） | 强（Material Design 官方规范） |
| **无障碍** | 基础支持 | Radix / Ariakit 原生支持 | Angular Material 官方 A11y |
| **社区热度** | ⭐⭐⭐⭐⭐（中文生态最强） | ⭐⭐⭐⭐⭐（国际化生态最强） | ⭐⭐⭐（企业级生态稳定） |

```typescript
// Vue + Element Plus — 开箱即用
<el-table :data="tableData" @row-click="handleRow">
  <el-table-column prop="name" label="姓名" />
</el-table>

// React + shadcn/ui — 源码定制
<Table>
  <TableHeader>
    <TableRow onClick={handleRow}>
      <TableHead>姓名</TableHead>
    </TableRow>
  </TableHeader>
</Table>

// Angular + Material — 官方规范
<mat-table [dataSource]="dataSource">
  <ng-container matColumnDef="name">
    <mat-header-cell *matHeaderCellDef> 姓名 </mat-header-cell>
    <mat-cell *matCellDef="let row"> {{ row.name }} </mat-cell>
  </ng-container>
</mat-table>
```

### 8.2 移动端方案对比

| 对比项 | Vue 生态 | React 生态 | Angular 生态 |
|--------|---------|-----------|------------|
| **原生交叉编译** | uni-app / Weex（维护少） | React Native（成熟） | Ionic Capacitor（基于 Web） |
| **Web 移动端** | Vant / NutUI（H5 最佳） | Ant Design Mobile | Ionic Framework |
| **小程序** | uni-app / Taro（首选） | Taro / Remax | 无官方方案 |
| **桌面端** | Electron / Tauri | Electron / Tauri | Electron / Tauri |
| **跨平台一致性** | 中等 | 高（RN 接近原生） | 中等（Ionic 依赖 WebView） |

### 8.3 测试工具链

| 对比项 | Vue 生态 | React 生态 | Angular 生态 |
|--------|---------|-----------|------------|
| **单元测试** | Vitest + @vue/test-utils | Vitest + @testing-library/react | Jasmine / Jest + Angular Testing |
| **组件测试** | @vue/test-utils 原生 | Testing Library（行为驱动） | TestBed + ComponentFixture |
| **集成测试** | Vitest | Vitest | Jest (esbuild) |
| **E2E** | Playwright / Cypress | Playwright / Cypress | Playwright / Cypress |
| **可测试性设计** | 中等（SFC 需先编译） | 高（纯函数组件） | 极高（DI 天然可 mock） |

**测试代码对比：**

```typescript
// Vue — @vue/test-utils
import { mount } from '@vue/test-utils'
test('increments count', async () => {
  const wrapper = mount(Counter)
  await wrapper.find('button').trigger('click')
  expect(wrapper.text()).toContain('1')
})

// React — Testing Library
import { render, screen } from '@testing-library/react'
test('increments count', async () => {
  render(<Counter />)
  await userEvent.click(screen.getByRole('button'))
  expect(screen.getByText('1')).toBeInTheDocument()
})

// Angular — TestBed
import { TestBed, ComponentFixture } from '@angular/core/testing'
test('increments count', () => {
  const fixture = TestBed.createComponent(Counter)
  fixture.detectChanges()
  const btn = fixture.nativeElement.querySelector('button')
  btn.click()
  fixture.detectChanges()
  expect(fixture.nativeElement.textContent).toContain('1')
})
```

### 8.4 国际化与本地化

| 对比项 | Vue (vue-i18n) | React (react-i18next) | Angular (@angular/localize) |
|--------|---------------|----------------------|----------------------------|
| **运行时翻译** | ✅ vue-i18n v9 | ✅ react-i18next | ✅ $localize + ngx-translate |
| **编译时提取** | CLI 插件 | i18next-parser | @angular/localize CLI |
| **动态语言切换** | ✅ useI18n | ✅ useTranslation | ✅ 自定义服务 |
| **ICU 语法** | ✅ 完整 | ✅ 完整 | ✅ @angular/localize |
| **SSR 集成** | Nuxt i18n 模块 | next-i18next | Angular Universal |
| **流行度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

### 8.5 动画方案

| 对比项 | Vue | React | Angular |
|--------|-----|-------|---------|
| **内置** | ``<Transition>`` / ``<TransitionGroup>`` | ❌ 无内置 | `@angular/animations` 完整内置 |
| **第三方** | @vueuse/motion / GSAP | framer-motion / react-spring / GSAP | GSAP / Three.js |
| **声明式动画** | ✅ 内置 transition 指令 | ❌ 需 framer-motion | ✅ @trigger / @state / @transition |
| **路由过渡** | ``<RouterView>`` 配合 transition | framer-motion AnimatePresence | @routeAnimation 触发器 |
| **性能** | 良好（CSS 动画居多） | 良好（framer-motion 使用 GPU） | 良好（Web Animations API） |

### 8.6 表单方案

| 对比项 | Vue | React | Angular |
|--------|-----|-------|---------|
| **基础方案** | v-model 双向绑定 | useState + onChange | [(ngModel)] 双向绑定 |
| **复杂表单** | VeeValidate / FormKit | React Hook Form / Formik | Reactive Forms（内置强大） |
| **验证** | zod / yup + @vee-validate/zod | zod / yup + @hookform/resolvers | Validators 内置 + 自定义 |
| **动态表单** | FormKit 动态 schema | React JSON Schema Form | Formly（JSON schema） |
| **Signal 表单** | 社区实验 | 社区实验 | Angular 21 Signal Forms（官方） |

### 8.7 AI / LLM 开发生态

| 对比项 | Vue 生态 | React 生态 | Angular 生态 |
|--------|---------|-----------|------------|
| **AI SDK** | @nuxt/ai（实验） | Vercel AI SDK（最成熟） | Angular MCP Server |
| **流式渲染** | 社区方案 | Vercel AI SDK 原生支持 | Angular @defer + resource |
| **AI 组件** | 较少 | Vercel AI UI 组件集 | 较少（企业自建） |
| **MCP 协议** | 社区适配 | Vercel MCP + 社区 | Angular MCP Server 官方 |
| **AI 代码生成** | Cursor + Vue 模板 | Cursor + TSX 最佳支持 | Cursor + Angular 模板 |
| **Copilot 集成** | 中等（模板语法不够精准） | 最高（JSX 即数据） | 中等（装饰器复杂） |
| **AI 代理** | Nuxt AI | Vercel AI Agents | Analog AI |
| **社区热度** | 增长中 | 🔥 主导 AI 前端生态 | 起步阶段 |

---

## 九、TypeScript 集成

| 对比项 | Vue 3 | React 19 | Angular 21 |
|--------|-------|----------|------------|
| **TS 支持** | 优秀（`<script setup lang="ts">`） | 优秀 | 原生（必须 TS） |
| **类型推断** | 基于 SFC 编译 | 基于 JSX | 基于装饰器 |
| **泛型组件** | `<script setup generic="T">` | `<T,>` | 类泛型 |
| **ref 类型** | `Ref<T>` | `RefObject<T>` | `Signal<T>` |
| **严格模式** | 可选 | 可选 | 默认（strict: true） |
| **工具类型** | 丰富 | 丰富（Utility Types） | 完整（Angular 类型包） |

**Angular 是唯一强制使用 TypeScript 的主流框架**，从创建项目到每个 API 都深度集成 TS。

### TS 配置对比

```json
// Vue 3 — tsconfig.json（宽松）
{
  "compilerOptions": {
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}

// React 19 — tsconfig.json（中等）
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "types": ["vitest/globals"]
  }
}

// Angular 21 — tsconfig.json（严格默认）
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

---

## 十、安全与合规对比

| 安全维度 | Vue 3 | React 19 | Angular 21 |
|---------|-------|----------|------------|
| **XSS 防护** | 模板自动转义 | JSX 默认转义（dangerouslySetInnerHTML 警告） | 默认转义 + DomSanitizer |
| **CSRF 防护** | 需自行实现 | 需自行实现 | HttpClient 拦截器内置 |
| **CSP 兼容** | 兼容（无内联事件） | 需要 nonce 配置 | Strict CSP 兼容性好 |
| **SQL 注入** | 后端责任 | 后端责任 | 后端责任 |
| **依赖扫描** | npm audit / Snyk | npm audit / Snyk | Angular CLI 内置安全扫描 |
| **认证方案** | Vue Auth / Firebase | NextAuth / Auth0 / Clerk | Angular Firebase / Auth0 |
| **OIDC/OAuth** | 社区库 | NextAuth 生态最丰富 | angular-oauth2-oidc 成熟 |
| **RBAC** | 自定义 | Casbin / CASL | Angular 路由守卫原生 |
| **审计日志** | 自定义 | 自定义/Axiom | DI 拦截器原生支持 |

```typescript
// Angular — DomSanitizer（内置安全管道）
@Pipe({ name: 'safeUrl' })
class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url)
  }
}

// React — 需要自行注意
<div dangerouslySetInnerHTML={{ __html: userContent }} /> // ⚠️ XSS 风险

// Vue — 模板自动转义
<div v-html="userContent" /> // ⚠️ 需确保内容已消毒
```

---

