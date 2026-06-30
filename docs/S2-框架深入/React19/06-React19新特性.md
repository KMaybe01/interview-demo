---
title: React 19 新特性
---

# 第五部分：React 19 新特性深度解析

## 1️⃣ React Compiler 深度解析

### 🔄 工作原理

```jsx
// React Compiler 的核心思想：
// 1. 静态分析组件
// 2. 自动推断依赖
// 3. 自动添加 memo/useMemo/useCallback

// 编译器会做的事情：
// - 自动缓存计算结果
// - 自动优化 re-render
// - 自动跳过不必要的更新

// 示例：
function ProductList({ products, onSelect }) {
  // 编译器自动分析：
  // - products 依赖
  // - onSelect 依赖
  // - 生成 useMemo/useCallback

  const sorted = products.sort((a, b) => a.price - b.price);
  const handleClick = (id) => onSelect(id);

  return (
    <ul>
      {sorted.map(p => (
        <li key={p.id} onClick={() => handleClick(p.id)}>
          {p.name}
        </li>
      ))}
    </ul>
  );
}

// 编译后（简化）：
function ProductList({ products, onSelect }) {
  const sorted = useMemo(() => products.sort((a, b) => a.price - b.price), [products]);
  const handleClick = useCallback((id) => onSelect(id), [onSelect]);

  return (
    <ul>
      {sorted.map(p => (
        <li key={p.id} onClick={() => handleClick(p.id)}>
          {p.name}
        </li>
      ))}
    </ul>
  );
}
```

### 📍 编译器配置

```json
// .babelrc 或 babel.config.js（推荐使用 flat config 方式）
{
  "presets": [
    ["react-compiler", {
      "sources": (filename) => {
        return filename.endsWith('.tsx') || filename.endsWith('.jsx');
      },
      "compilationMode": "annotation",
      "panicThreshold": "CRITICAL_ERRORS"
    }]
  ]
}
```
----
## 🔍 React Compiler 源码原理

### 🔄 编译流程

```jsx
// packages/babel-plugin-react-compiler/src/index.ts
// React Compiler 的编译流程

function compileFunctionAST(ast) {
  // 1. 分析组件
  const analysis = analyzeComponent(ast);

  // 2. 确定依赖
  const dependencies = analyzeDependencies(analysis);

  // 3. 生成缓存代码
  const optimized = generateMemoCode(analysis, dependencies);

  return optimized;
}

// 示例：
// 原始代码
function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  const double = count * 2;
  return <div>{double}</div>;
}

// 编译后
function Counter({ initialCount }) {
  const $ = useMemo(() => [initialCount], [initialCount]);
  const [count, setCount] = useState($[0]);
  const double = useMemo(() => count * 2, [count]);
  return <div>{double}</div>;
}
```

### 📍 依赖分析算法

```jsx
// packages/babel-plugin-react-compiler/src/DependencyAnalysis.ts
function analyzeDependencies(analysis) {
  const dependencies = new Map();

  // 1. 遍历所有 reactive 表达式
  for (const expr of analysis.reactiveExpressions) {
    // 2. 分析表达式依赖
    const deps = analyzeExpression(expr);

    // 3. 确定依赖项
    dependencies.set(expr, deps);
  }

  return dependencies;
}

// 依赖类型
enum DependencyType {
  State = 'state',         // useState
  Ref = 'ref',             // useRef
  Context = 'context',     // useContext
  Props = 'props',         // props
  Memo = 'memo',           // useMemo
  Callback = 'callback'    // useCallback
}

// 依赖分析结果
interface Dependency {
  type: DependencyType;
  source: string;          // 依赖来源
  path: string[];          // 访问路径
  isStable: boolean;       // 是否稳定
}
```

---
## 2️⃣ Actions 机制深度解析

```jsx
// Actions 的核心思想：
// 1. 自动管理 pending 状态
// 2. 自动处理错误
// 3. 自动批量更新

// 使用 useActionState
function Form() {
  const [state, formAction, isPending] = useActionState(
    async (previousState, formData) => {
      // 异步操作
      const result = await submitForm(formData);
      return result;
    },
    { success: false, message: '' }
  );

  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}

// useOptimistic 乐观更新
function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleSubmit(formData) {
    const text = formData.get('text');
    addOptimisticTodo({ id: Date.now(), text, done: false });
    await addTodo(text);
  }

  return (
    <form action={handleSubmit}>
      <input name="text" />
      <button type="submit">添加</button>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text}
          </li>
        ))}
      </ul>
    </form>
  );
}
```

## 3️⃣ use() Hook 深度解析

```jsx
// use() 的核心能力：
// 1. 在渲染时读取 Promise
// 2. 在渲染时读取 Context
// 3. 条件调用（打破 Hooks 规则）

// 读取 Promise
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // 暂挂组件直到 Promise resolve

  return <div>{user.name}</div>;
}

// 读取 Context
function Theme() {
  const theme = use(ThemeContext);  // 类似 useContext
  return <div style={{ color: theme.color }}>Hello</div>;
}

// 条件调用
function ConditionalComponent({ showData }) {
  const [data, setData] = useState(null);

  if (showData) {
    const result = use(fetchData());  // 条件调用
    return <div>{result}</div>;
  }

  return <div>No data</div>;
}

// 与 Suspense 配合
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userPromise={fetchUser()} />
    </Suspense>
  );
}
```



