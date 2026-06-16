import { Alert, Card, Tabs, Tag, Typography } from "antd"
import { memo, useMemo } from "react"
import { getField } from "./registry.tsx"
import type { FormSchema } from "./types.ts"

const { Text } = Typography

interface RendererProps {
  schema: FormSchema
  data: Record<string, unknown>
  errors: Record<string, string>
  path: string
  onChange: (path: string, value: unknown) => void
  onBlur?: (path: string) => void
  backendErrors?: Record<string, string>
  ajvErrors?: Record<string, string[]>
  asyncValidating?: Record<string, boolean>
  allData?: Record<string, unknown>
  _depth?: number
  _visitedRefs?: WeakSet<FormSchema>
  maxDepth?: number
}

function getTokenValue(token: string, data: Record<string, unknown>): unknown {
  const t = token.trim()
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')))
    return t.slice(1, -1)
  if (/^-?\d+\.?\d*$/.test(t)) return Number(t)
  if (t === "true") return true
  if (t === "false") return false
  if (t === "null") return null
  if (t === "undefined") return undefined
  return data[t]
}

function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ""
  let i = 0
  while (i < s.length) {
    if (s[i] === "(" || s[i] === "[") depth++
    else if (s[i] === ")" || s[i] === "]") depth--
    if (depth === 0 && s.slice(i).startsWith(sep)) {
      parts.push(cur.trim())
      cur = ""
      i += sep.length
      continue
    }
    cur += s[i]
    i++
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function evaluateExpression(expr: string, data: Record<string, unknown>): boolean {
  try {
    const clean = expr.trim()
    if (!clean) return true

    if (clean.startsWith("(") && clean.endsWith(")"))
      return evaluateExpression(clean.slice(1, -1), data)

    const andParts = splitTopLevel(clean, "&&")
    if (andParts.length > 1) return andParts.every((p) => evaluateExpression(p, data))

    const orParts = splitTopLevel(clean, "||")
    if (orParts.length > 1) return orParts.some((p) => evaluateExpression(p, data))

    const strictEq = /^(.+?)\s*===\s*(.+)$/.exec(clean)
    if (strictEq) return getTokenValue(strictEq[1], data) === getTokenValue(strictEq[2], data)

    const strictNeq = /^(.+?)\s*!==\s*(.+)$/.exec(clean)
    if (strictNeq) return getTokenValue(strictNeq[1], data) !== getTokenValue(strictNeq[2], data)

    const val = getTokenValue(clean, data)
    if (typeof val === "boolean") return val
    if (typeof val === "string") return val === "true"
    return Boolean(val)
  } catch {
    return true
  }
}

function Renderer({
  schema,
  data,
  errors,
  path,
  onChange,
  onBlur,
  backendErrors,
  ajvErrors: ajvErrorsMap,
  asyncValidating,
  allData,
  _depth = 0,
  _visitedRefs,
  maxDepth = 10,
}: RendererProps) {
  const activeData = allData ?? data

  const leafVisibility = useMemo(() => {
    if (schema.type !== "leaf" || !schema.properties) return null
    const result: Record<string, boolean> = {}
    for (const [propKey, leaf] of Object.entries(schema.properties)) {
      if (!leaf.visible) {
        result[propKey] = true
      } else {
        result[propKey] = evaluateExpression(leaf.visible, activeData)
      }
    }
    return result
  }, [schema, activeData])

  if (_depth > maxDepth) {
    return (
      <Alert
        type="warning"
        title="递归深度超出限制"
        description={`最大深度 ${String(maxDepth)}，当前深度 ${String(_depth)}`}
        showIcon
        style={{ marginBottom: 8 }}
      />
    )
  }

  if (_visitedRefs) {
    if (_visitedRefs.has(schema)) {
      return (
        <Alert
          type="warning"
          title="检测到循环引用"
          description={`Schema key: ${schema.key}`}
          showIcon
          style={{ marginBottom: 8 }}
        />
      )
    }
    _visitedRefs.add(schema)
  }

  if (schema.type === "tabs" && schema.tabs) {
    return (
      <Tabs
        items={schema.tabs.map((tab) => ({
          key: tab.key,
          label: tab.title,
          children: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tab.children.map((child, i) => (
                <Renderer
                  key={`${child.key}-${String(i)}`}
                  schema={child}
                  data={data}
                  errors={errors}
                  path={path}
                  onChange={onChange}
                  onBlur={onBlur}
                  backendErrors={backendErrors}
                  ajvErrors={ajvErrorsMap}
                  asyncValidating={asyncValidating}
                  allData={activeData}
                  _depth={_depth + 1}
                  _visitedRefs={_visitedRefs}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          ),
        }))}
      />
    )
  }

  if (schema.type === "card") {
    return (
      <Card
        title={
          <Space>
            <Text strong>{schema.title}</Text>
            {schema.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {schema.description}
              </Text>
            )}
          </Space>
        }
        size="small"
        variant="outlined"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(schema.children ?? []).map((child, i) => (
            <Renderer
              key={`${child.key}-${String(i)}`}
              schema={child}
              data={data}
              errors={errors}
              path={path}
              onChange={onChange}
              onBlur={onBlur}
              backendErrors={backendErrors}
              ajvErrors={ajvErrorsMap}
              asyncValidating={asyncValidating}
              allData={activeData}
              _depth={_depth + 1}
              _visitedRefs={_visitedRefs}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      </Card>
    )
  }

  if (schema.type === "form") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(schema.children ?? []).map((child, i) => (
          <Renderer
            key={`${child.key}-${String(i)}`}
            schema={child}
            data={data}
            errors={errors}
            path={path}
            onChange={onChange}
            onBlur={onBlur}
            backendErrors={backendErrors}
            ajvErrors={ajvErrorsMap}
            asyncValidating={asyncValidating}
            allData={activeData}
            _depth={_depth + 1}
            _visitedRefs={_visitedRefs}
            maxDepth={maxDepth}
          />
        ))}
      </div>
    )
  }

  if (schema.type === "leaf" && schema.properties) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.entries(schema.properties).map(([propKey, leaf]) => {
          const isVisible = leafVisibility ? leafVisibility[propKey] : true
          if (!isVisible) return null

          const fullPath = leaf.key
          const FieldComponent = getField(leaf.type)
          const fieldError = errors[fullPath] ?? backendErrors?.[fullPath]
          const fieldAjvErrors = ajvErrorsMap?.[fullPath]
          const isLoading = asyncValidating?.[fullPath]

          if (!FieldComponent) {
            return (
              <div key={fullPath}>
                <Tag color="orange">未注册: {leaf.type}</Tag>
                <Text type="secondary" code>
                  {fullPath}
                </Text>
              </div>
            )
          }

          return (
            <div key={fullPath}>
              <div style={{ marginBottom: 4 }}>
                <Text strong>{leaf.title}</Text>
                {leaf.required && (
                  <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>
                    必填
                  </Tag>
                )}
                {leaf.ajvSchema && (
                  <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>
                    ajv
                  </Tag>
                )}
                {leaf.description && (
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    {leaf.description}
                  </Text>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <FieldComponent
                  schema={leaf}
                  value={data[fullPath]}
                  path={fullPath}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={fieldError}
                  asyncValidating={isLoading}
                  allData={activeData}
                />
                {isLoading && (
                  <div style={{ position: "absolute", right: 8, top: 4 }}>
                    <Tag color="processing" style={{ fontSize: 10 }}>
                      校验中...
                    </Tag>
                  </div>
                )}
              </div>
              {fieldAjvErrors && fieldAjvErrors.length > 0 && (
                <div style={{ marginTop: 2 }}>
                  {fieldAjvErrors.map((ajvErr, i) => (
                    <Tag
                      key={`ajv-${String(i)}`}
                      color="warning"
                      style={{ fontSize: 11, marginTop: 2 }}
                    >
                      格式提示: {ajvErr}
                    </Tag>
                  ))}
                </div>
              )}
              {backendErrors?.[fullPath] && (
                <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 2 }}>
                  {backendErrors[fullPath]}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return null
}

function Space({ children, ...props }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...props.style }}>{children}</div>
  )
}

export default memo(Renderer)
