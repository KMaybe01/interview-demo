import { Input } from "antd"
import type { FieldComponentProps } from "../types.ts"

const { TextArea } = Input

export default function JsonField({
  schema,
  value,
  onChange,
  path,
  error,
  onBlur,
}: FieldComponentProps) {
  const textValue = value ? JSON.stringify(value, null, 2) : ""

  const handleChange = (v: string) => {
    try {
      const parsed: unknown = JSON.parse(v)
      onChange(path, parsed)
    } catch {
      onChange(path, v)
    }
  }

  return (
    <div>
      <TextArea
        value={textValue}
        onChange={(e) => {
          handleChange(e.target.value)
        }}
        placeholder={schema.placeholder ?? "输入 JSON"}
        rows={4}
        style={{ fontFamily: "monospace", fontSize: 12 }}
        status={error ? "error" : undefined}
        onBlur={() => {
          onBlur?.(path)
        }}
      />
      {error && <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 2 }}>{error}</div>}
    </div>
  )
}
