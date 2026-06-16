import Ajv from "ajv"

export interface FormSchema {
  type: "tabs" | "card" | "form" | "leaf"
  key: string
  title?: string
  description?: string
  children?: FormSchema[]
  properties?: Record<string, LeafSchema>
  tabs?: TabSchema[]
}

export interface TabSchema {
  title: string
  key: string
  children: FormSchema[]
}

export interface LeafSchema {
  type: FieldType
  key: string
  title: string
  description?: string
  required?: boolean
  default?: unknown
  placeholder?: string
  options?: { label: string; value: string | number }[]
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  multiple?: boolean
  visible?: string
  items?: FormSchema
  minItems?: number
  maxItems?: number
  validation?: (value: unknown, data: Record<string, unknown>) => string | undefined
  asyncValidation?: (value: unknown) => Promise<string | undefined>
  autoFill?: (data: Record<string, unknown>) => unknown
  dependencies?: string[]
  ajvSchema?: Record<string, unknown>
}

export type FieldType = "string" | "number" | "select" | "switch" | "datetime" | "json" | "array"

export interface FieldComponentProps {
  schema: LeafSchema
  value: unknown
  path: string
  onChange: (path: string, value: unknown) => void
  onBlur?: (path: string) => void
  error?: string
  asyncValidating?: boolean
  allData?: Record<string, unknown>
}

export interface ValidationError {
  path: string
  message: string
}

let ajvInstance: Ajv | null = null

export function getAjv(): Ajv {
  if (ajvInstance) return ajvInstance
  ajvInstance = new Ajv({ allErrors: true, verbose: true })
  return ajvInstance
}

export function compileAjvSchema(
  schema: Record<string, unknown>,
): ReturnType<Ajv["compile"]> | null {
  try {
    const ajv = getAjv()
    return ajv.compile(schema)
  } catch {
    return null
  }
}

export function getDefaultsFromSchema(schema: FormSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  const leaves = flattenSchema(schema)
  for (const leaf of leaves) {
    if (leaf.default !== undefined) {
      defaults[leaf.key] = leaf.default
    } else if (leaf.type === "switch") {
      defaults[leaf.key] = false
    } else if (leaf.type === "array") {
      defaults[leaf.key] = []
    } else {
      defaults[leaf.key] = undefined
    }
  }
  return defaults
}

export function flattenSchema(schema: FormSchema): LeafSchema[] {
  const result: LeafSchema[] = []
  const walk = (node: FormSchema) => {
    if (node.type === "leaf") {
      if (node.properties) {
        for (const leaf of Object.values(node.properties)) {
          result.push(leaf)
          if (leaf.items) {
            walk(leaf.items)
          }
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child)
      }
    }
    if (node.tabs) {
      for (const tab of node.tabs) {
        for (const child of tab.children) {
          walk(child)
        }
      }
    }
  }
  walk(schema)
  return result
}

export function validateSchema(
  schema: FormSchema,
  data: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = []
  const leaves = flattenSchema(schema)
  for (const leaf of leaves) {
    const value = data[leaf.key]
    if (leaf.required && (value == null || value === "")) {
      errors.push({ path: leaf.key, message: `${leaf.title} 为必填项` })
    }
    if (value != null && value !== "") {
      if (
        leaf.type === "string" &&
        leaf.minLength !== undefined &&
        typeof value === "string" &&
        value.length < leaf.minLength
      ) {
        errors.push({
          path: leaf.key,
          message: `${leaf.title} 最少 ${String(leaf.minLength)} 个字符`,
        })
      }
      if (
        leaf.type === "string" &&
        leaf.maxLength !== undefined &&
        typeof value === "string" &&
        value.length > leaf.maxLength
      ) {
        errors.push({
          path: leaf.key,
          message: `${leaf.title} 最多 ${String(leaf.maxLength)} 个字符`,
        })
      }
      if (leaf.type === "number") {
        const num = Number(value)
        if (Number.isNaN(num)) {
          errors.push({ path: leaf.key, message: `${leaf.title} 必须为数字` })
        } else {
          if (leaf.min !== undefined && num < leaf.min) {
            errors.push({ path: leaf.key, message: `${leaf.title} 最小值为 ${String(leaf.min)}` })
          }
          if (leaf.max !== undefined && num > leaf.max) {
            errors.push({ path: leaf.key, message: `${leaf.title} 最大值为 ${String(leaf.max)}` })
          }
        }
      }
      if (leaf.type === "select" && leaf.options) {
        const validValues = leaf.options.map((o) => o.value)
        if (!validValues.includes(value as string | number)) {
          errors.push({ path: leaf.key, message: `${leaf.title} 选项值无效` })
        }
      }
      if (leaf.type === "array" && Array.isArray(value)) {
        if (leaf.minItems !== undefined && value.length < leaf.minItems) {
          errors.push({ path: leaf.key, message: `${leaf.title} 最少 ${String(leaf.minItems)} 项` })
        }
        if (leaf.maxItems !== undefined && value.length > leaf.maxItems) {
          errors.push({ path: leaf.key, message: `${leaf.title} 最多 ${String(leaf.maxItems)} 项` })
        }
      }
    }
    if (leaf.validation) {
      const customError = leaf.validation(value, data)
      if (customError) {
        errors.push({ path: leaf.key, message: customError })
      }
    }
  }
  return errors
}

export function updateValue(
  data: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  return { ...data, [path]: value }
}

export function getValueAtPath(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = data
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function findLeaf(schema: FormSchema, key: string): LeafSchema | undefined {
  const leaves = flattenSchema(schema)
  return leaves.find((l) => l.key === key)
}
