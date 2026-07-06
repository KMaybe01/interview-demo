# AGENTS — 前端知识体系

React 19 静态文档站点，GitHub Pages 部署，内容为前端面试知识体系。

## Commands

```bash
bun dev           # dev server (port 5000)
bun run build     # tsc -b → vite build → node gen-version.mjs
bun run preview   # serve dist/
bun run lint      # biome check --write . (auto-fix + format)
bun run typecheck # tsc -b --noEmit
bun test          # vitest run
bun run test:watch # vitest (watch mode)
bun run changelog # conventional-changelog
```

- `build` produces `dist/` with `version.json` (timestamp) + `404.html` (copy of `index.html` for GitHub Pages SPA fallback)
- Dependency management: **bun** only (lockfile `bun.lock`)

## Routing & Content

- **HashRouter** — not BrowserRouter. All internal links are hash-free in code; the router adds the hash.
- Vite base path `/` (default) — overridden to `/interview-demo/` for GitHub Pages deploy via `VITE_BASE_PATH` env.
- Route `/*` → `DocPage` (catch-all). Route `/` → `HomePage`.
- Content files live in `S1-*/` through `S6-*/` directories (outside `src/`).
- Loaded via `import.meta.glob('/S{1,2,3,4,5,6}-*/**/*.md', { query: '?raw' })` in `src/data/content.ts`.
- Route = MD file path minus `.md` extension. `index.md` maps to its parent directory path.
- Frontmatter (`---...---`) is stripped automatically; only body content is rendered.
- **Adding a new doc requires**:
  1. Create the `.md` file in the appropriate `S?-*/` directory
  2. Add a nav entry in `src/data/navigation.ts`

## Testing

- **Vitest** with `jsdom` environment + `@testing-library/react`.
- Setup file: `src/test-setup.ts` (imports `@testing-library/jest-dom`).
- Tests co-locate in `__tests__/` dirs next to source files.
- `tsconfig.app.json` excludes `**/__tests__/**` from typecheck — run `bun test` separately.

## Coding Conventions

- **Biome** (not ESLint/Prettier): space indent 2, single quotes, semicolons `asNeeded`, line width 100.
- Several rules disabled (noNonNullAssertion, noArrayIndexKey, noDangerouslySetInnerHtml, a11y rules).
- TypeScript: `strict: true`, `jsx: "react-jsx"`.
- Docs: Chinese, UTF-8, filename pattern `NN-中文标题.md`.
- Nav icons use emoji prefixes.

## Build Artifacts

- `dist/version.json` — generated post-build by `gen-version.mjs` (UTC timestamp).
- `dist/404.html` — exact copy of `index.html` for GitHub Pages SPA routing.
