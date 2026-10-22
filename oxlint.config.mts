// oxlint.config.mts — 本仓库 oxlint 配置（根级，各 app 就近查找生效）
//
// 底座：Ultracite 的 oxlint 预设（core + react + vitest），提供跨引擎的精选规则集
// （详见 https://www.ultracite.ai/docs）。其上叠加本仓库自定义规则与 overrides：
//   - ourRules：Ultracite 预设未覆盖、或需调整严重度/选项的本仓库规则
//   - ourOverrides：存量代码按区域/文件放宽的规则（沿用 Biome 时期口径）
//   - ourIgnores：本仓库额外的忽略项
//
// 渐进式迁移（relaxedRules）：Ultracite 预设引入的、在存量代码上大量报错（共 3439 处）
// 的规则，先统一降级为 warn —— 不阻塞 CI（oxlint 对 warn 退出码为 0），但保留可见性，
// 待后续逐步清理后再升级回 error（或直接删除该区块以恢复 Ultracite 默认 error）。
// 注意：这些规则放在「顶层 rules」而非 override —— oxlint 在启用 unicorn 等插件后，会把
// 部分规则的默认 deny 以 override 形式施加，且优先级高于本配置的 relaxed override；
// 只有顶层 rules 的最后赋值能稳定压过它们。

import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

const ourRules = {
  // —— 本仓库自定义：Ultracite 预设未覆盖或需调整严重度/选项 ——
  "no-console": "warn",
  "eqeqeq": ["error", "smart"],
  "prefer-const": "error",
  "no-unused-vars": [
    "error",
    {
      "args": "after-used",
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true,
    },
  ],
  "typescript/no-explicit-any": "warn",
  "typescript/no-non-null-assertion": "warn",
  "typescript/prefer-optional-chain": "error",
  "typescript/only-throw-error": "error",
  "react/react-in-jsx-scope": "off",
  "react/rules-of-hooks": "error",
  "react/exhaustive-deps": "warn",
  "react/no-danger": "error",
  "react/no-array-index-key": "warn",
  "react/jsx-no-useless-fragment": "warn",
  "react/self-closing-comp": "warn",
  // 行内编辑场景主动使用 autoFocus 提升体验（如 TreeDataEngine 的重命名输入框），非可访问性缺陷
  "jsx-a11y/no-autofocus": "off",
  // React Compiler 相关规则（oxlint 1.89 归入 correctness，默认开启）：
  // 存量代码有大量「effect 内 setState / 渲染期读 ref」写法，先按 Biome 时期口径关掉，留作后续单独治理。
  "react/set-state-in-effect": "off",
  "react/refs": "off",
  "react/purity": "off",
  "react/immutability": "off",
  // vitest 插件的这两条对存量测试用例要求过严（mock 泛型必填 / 每个 test 必须有 expect），与 Biome 时期口径对齐后关闭
  "vitest/require-mock-type-parameters": "off",
  "vitest/expect-expect": "off",
  // oxlint 在启用 unicorn 插件后，会把 no-useless-promise-resolve-reject 等规则的默认严重度
  // 作为 override 施加在源码文件上，且优先级高于本配置的 relaxed override；这里在顶层显式关闭，
  // 保证存量 `Promise.reject(error)` 写法（如 fetchClient 的 typed error boundary）today 通过。
  "unicorn/no-useless-promise-resolve-reject": "off",
};

// 渐进式迁移：Ultracite 预设在存量代码上当前报错的全部规则，先降级为 warn。
// TODO：逐步清理后把这些规则移回 error（或直接删除该区块以恢复 Ultracite 默认 error）。
const relaxedRules: Record<string, "warn"> = {
  "eslint/sort-keys": "warn",
  "eslint/curly": "warn",
  "eslint/func-style": "warn",
  "eslint/require-unicode-regexp": "warn",
  "unicorn/filename-case": "warn",
  "react/function-component-definition": "warn",
  "eslint/no-plusplus": "warn",
  "eslint/no-nested-ternary": "warn",
  "unicorn/numeric-separators-style": "warn",
  "eslint/no-eq-null": "warn",
  "eslint/prefer-named-capture-group": "warn",
  "vitest/prefer-describe-function-title": "warn",
  "vitest/require-mock-type-parameters": "warn",
  "eslint/no-use-before-define": "warn",
  "import/consistent-type-specifier-style": "warn",
  "vitest/prefer-strict-equal": "warn",
  "promise/prefer-await-to-then": "warn",
  "vitest/prefer-to-be-truthy": "warn",
  "eslint/require-await": "warn",
  "unicorn/switch-case-braces": "warn",
  "react/todo": "warn",
  "eslint/no-empty-function": "warn",
  "eslint/prefer-destructuring": "warn",
  "typescript/array-type": "warn",
  "eslint/no-await-in-loop": "warn",
  "unicorn/catch-error-name": "warn",
  "unicorn/prefer-add-event-listener": "warn",
  "eslint/no-bitwise": "warn",
  "vitest/prefer-to-be-falsy": "warn",
  "eslint/class-methods-use-this": "warn",
  "eslint/arrow-body-style": "warn",
  "vitest/require-top-level-describe": "warn",
  "vitest/max-expects": "warn",
  "promise/avoid-new": "warn",
  "unicorn/prefer-string-replace-all": "warn",
  "unicorn/prefer-export-from": "warn",
  "typescript/no-inferrable-types": "warn",
  "eslint/no-negated-condition": "warn",
  "unicorn/prefer-spread": "warn",
  "unicorn/no-negated-condition": "warn",
  "import/no-named-as-default-member": "warn",
  "promise/prefer-await-to-callbacks": "warn",
  "react/no-unstable-nested-components": "warn",
  "unicorn/prefer-query-selector": "warn",
  "unicorn/require-post-message-target-origin": "warn",
  "vitest/prefer-import-in-mock": "warn",
  "vitest/prefer-to-have-length": "warn",
  "eslint/complexity": "warn",
  "vitest/prefer-expect-resolves": "warn",
  "unicorn/no-useless-undefined": "warn",
  "vitest/expect-expect": "warn",
  "unicorn/no-array-sort": "warn",
  "eslint/no-inline-comments": "warn",
  "eslint/no-void": "warn",
  "react/jsx-curly-brace-presence": "warn",
  "eslint/no-promise-executor-return": "warn",
  "unicorn/prefer-at": "warn",
  "promise/param-names": "warn",
  "unicorn/consistent-function-scoping": "warn",
  "vitest/prefer-importing-vitest-globals": "warn",
  "typescript/parameter-properties": "warn",
  "eslint/prefer-arrow-callback": "warn",
  "react/rule-suppression": "warn",
  "unicorn/prefer-code-point": "warn",
  "unicorn/prefer-number-coercion": "warn",
  "vitest/prefer-called-once": "warn",
  "eslint/default-case": "warn",
  "unicorn/escape-case": "warn",
  "eslint/no-shadow": "warn",
  "unicorn/consistent-existence-index-check": "warn",
  "react/memo-dependencies": "warn",
  "react/hook-use-state": "warn",
  "unicorn/no-array-reverse": "warn",
  "unicorn/prefer-number-properties": "warn",
  "react/no-unescaped-entities": "warn",
  "eslint/no-implicit-globals": "warn",
  "unicorn/prefer-modern-math-apis": "warn",
  "unicorn/prefer-string-slice": "warn",
  "eslint/no-multi-assign": "warn",
  "react/no-set-state": "warn",
  "react/exhaustive-effect-dependencies": "warn",
  "unicorn/no-array-for-each": "warn",
  "react/no-object-type-as-default-prop": "warn",
  "unicorn/prefer-array-find": "warn",
  "typescript/no-dynamic-delete": "warn",
  "vitest/prefer-to-contain": "warn",
  "eslint/preserve-caught-error": "warn",
  "vitest/prefer-called-with": "warn",
  "eslint/func-name-matching": "warn",
  "vitest/prefer-mock-return-shorthand": "warn",
  "typescript/consistent-generic-constructors": "warn",
  "vitest/no-conditional-expect": "warn",
  "unicorn/prefer-set-has": "warn",
  "unicorn/prefer-logical-operator-over-ternary": "warn",
  "unicorn/prefer-blob-reading-methods": "warn",
  "typescript/prefer-for-of": "warn",
  "unicorn/no-await-expression-member": "warn",
  "import/first": "warn",
  "unicorn/error-message": "warn",
  "eslint/no-alert": "warn",
  "vitest/prefer-expect-type-of": "warn",
  "react/jsx-handler-names": "warn",
  "unicorn/prefer-dom-node-remove": "warn",
  "eslint/max-classes-per-file": "warn",
  "promise/no-nesting": "warn",
  "eslint/no-useless-return": "warn",
  "unicorn/prefer-math-trunc": "warn",
  "promise/prefer-catch": "warn",
  "unicorn/prefer-dom-node-append": "warn",
  "eslint/no-param-reassign": "warn",
  "unicorn/no-lonely-if": "warn",
  "typescript/consistent-type-definitions": "warn",
  "eslint/prefer-template": "warn",
  "react/state-in-constructor": "warn",
  "typescript/consistent-type-imports": "warn",
  "unicorn/prefer-negative-index": "warn",
  // 以下在 ai-course 的 server/、shared/ 目录（lint 脚本覆盖范围超出 src/）与 interview-docs 全目录中触发，先降级为 warn
  "typescript/method-signature-style": "warn",
  "unicorn/prefer-single-call": "warn",
  "unicorn/text-encoding-identifier-case": "warn",
  "unicorn/no-array-reduce": "warn",
  // interview-docs 等非 src 的 .mjs 脚本里用到 `import * as path from "node:path"` 等，
  // 先降级为 warn（保留可见性），后续再统一为默认导入。
  "unicorn/import-style": "warn",
  "unicorn/prefer-import-meta-properties": "warn",
};

const ourOverrides = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "react/no-array-index-key": "off",
    },
  },
  {
    files: ["**/*.worker.ts"],
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"],
    rules: {
      // 存量测试里已有「条件断言」（找不到目标数据就跳过），迁移阶段先保持行为不变
      "vitest/no-conditional-expect": "off",
    },
  },
  {
    files: ["apps/frontend/src/components/dynamic-form/Renderer.tsx"],
    rules: {
      // Renderer 的 path 目前只在递归中传递（叶子字段用 leaf.key 拼路径），
      // 属于预留的嵌套表单位置上下文，先保留参数、关掉这条 oxc 规则
      "oxc/only-used-in-recursion": "off",
    },
  },
  {
    files: ["apps/interview-docs/**"],
    rules: {
      "no-unused-vars": "off",
      "no-cond-assign": "off",
      "typescript/no-non-null-assertion": "off",
      "react/no-array-index-key": "off",
      "react/no-danger": "off",
      "jsx-a11y/alt-text": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/prefer-tag-over-role": "off",
      "jsx-a11y/control-has-associated-label": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
    },
  },
];

const ourIgnores = [
  "**/dist/**",
  "**/node_modules/**",
  "**/coverage/**",
  "**/.turbo/**",
  "apps/backend/**",
  "apps/interview-docs/public/**",
  "**/*.config.ts",
  "**/*.config.mts",
  "**/*.setup.ts",
  "**/__mocks__/**",
  "**/*.d.ts",
];

const config = {
  env: { browser: true, node: true, es2024: true },
  plugins: Array.from(
    new Set([
      ...(core.plugins ?? []),
      ...(react.plugins ?? []),
      ...(vitest.plugins ?? []),
      // vitest 预设仅在自身的 test 文件 override 里声明 plugins:["vitest"]；
      // 为让 vitest 规则在全局生效并能被下方 relaxedRules 降级，这里显式启用。
      "vitest",
    ]),
  ),
  ignorePatterns: Array.from(
    new Set([...(core.ignorePatterns ?? []), ...ourIgnores]),
  ),
  rules: {
    ...core.rules,
    ...react.rules,
    ...vitest.rules,
    ...ourRules,
    ...relaxedRules,
  },
  overrides: [
    ...(core.overrides ?? []),
    ...(react.overrides ?? []),
    // 注意：不展开 vitest.overrides —— 其 test 文件 override 会把 vitest 规则强制为 deny，
    // 且 oxlint 按「更具体的 files 优先」解析，会压过本配置的 relaxedRules（顶层 rules）。
    // 改为顶层启用 vitest 插件（见 plugins）+ 顶层 relaxedRules 统一 warn，保证存量代码 today 通过。
    ...ourOverrides,
  ],
};

export default config;
