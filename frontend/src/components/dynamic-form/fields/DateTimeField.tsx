import { DatePicker } from "antd"
import dayjs from "dayjs"
import type { FieldComponentProps } from "../types.ts"

function parseDateValue(value: unknown) {
  if (typeof value === "string" && value) {
    const d = dayjs(value)
    return d.isValid() ? d : undefined
  }
  if (dayjs.isDayjs(value)) return value
  return undefined
}

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
        value={parseDateValue(value)}
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
