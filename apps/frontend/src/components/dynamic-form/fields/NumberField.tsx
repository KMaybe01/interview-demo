import { InputNumber } from 'antd';
import type { FieldComponentProps } from '../types.ts';

export default function NumberField({
  schema,
  value,
  onChange,
  path,
  error,
  onBlur,
}: FieldComponentProps) {
  return (
    <div>
      <InputNumber
        value={value as number}
        onChange={(v) => {
          onChange(path, v);
        }}
        placeholder={schema.placeholder}
        min={schema.min}
        max={schema.max}
        style={{ width: '100%' }}
        status={error ? 'error' : undefined}
        onBlur={() => {
          onBlur?.(path);
        }}
      />
      {error && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 2 }}>{error}</div>}
    </div>
  );
}
