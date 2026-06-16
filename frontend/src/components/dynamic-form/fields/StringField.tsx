import { Input } from "antd"
import type { FieldComponentProps } from "../types.ts"

export default function StringField({
  schema,
  value,
  onChange,
  path,
  error,
  onBlur,
}: FieldComponentProps) {
  return (
    <div>
      <Input
        value={value as string}
        onChange={(e) => {
          onChange(path, e.target.value)
        }}
        placeholder={schema.placeholder}
        status={error ? "error" : undefined}
        onBlur={() => {
          onBlur?.(path)
        }}
      />
      {error && <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 2 }}>{error}</div>}
    </div>
  )
}
