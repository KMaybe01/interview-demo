import { DatePicker } from "antd"
import type { FieldComponentProps } from "../types.ts"

export default function DateTimeField({
  schema,
  value,
  onChange,
  path,
  error,
  onBlur,
}: FieldComponentProps) {
  return (
    <div>
      <DatePicker
        value={value ? (typeof value === "string" ? undefined : undefined) : undefined}
        onChange={(_, dateStr) => {
          onChange(path, dateStr)
        }}
        placeholder={schema.placeholder}
        showTime
        style={{ width: "100%" }}
        status={error ? "error" : undefined}
        onBlur={() => {
          onBlur?.(path)
        }}
      />
      {error && <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 2 }}>{error}</div>}
    </div>
  )
}
