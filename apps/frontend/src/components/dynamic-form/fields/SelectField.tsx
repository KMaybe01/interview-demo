import { Select } from 'antd';
import type { FieldComponentProps } from '../types.ts';

export default function SelectField({
  schema,
  value,
  onChange,
  path,
  error,
  onBlur,
}: FieldComponentProps) {
  return (
    <div>
      <Select
        value={value as string | number | undefined}
        onChange={(v) => {
          onChange(path, v);
        }}
        placeholder={schema.placeholder}
        options={schema.options}
        mode={schema.multiple ? 'multiple' : undefined}
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
