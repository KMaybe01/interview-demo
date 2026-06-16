import { Switch } from "antd"
import type { FieldComponentProps } from "../types.ts"

export default function SwitchField({
  schema: _schema,
  value,
  onChange,
  path,
}: FieldComponentProps) {
  return (
    <Switch
      checked={value as boolean}
      onChange={(v) => {
        onChange(path, v)
      }}
    />
  )
}
