import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import Renderer from '../Renderer.tsx';
import type { FieldComponentProps } from '../types.ts';
import { getDefaultsFromSchema } from '../types.ts';

const { Text } = Typography;

type ArrayItem = Record<string, unknown>;

export default function ArrayField({
  schema,
  value,
  onChange,
  path,
  error,
  allData,
  onBlur,
}: FieldComponentProps) {
  const items = Array.isArray(value) ? (value as ArrayItem[]) : [];
  const itemSchema = schema.items;

  const handleAdd = () => {
    const defaults = itemSchema ? getDefaultsFromSchema(itemSchema) : {};
    onChange(path, [...items, defaults]);
  };

  const handleRemove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(path, next);
  };

  const handleItemChange = (index: number) => (itemPath: string, itemValue: unknown) => {
    const next = [...items];
    next[index] = { ...next[index], [itemPath]: itemValue };
    onChange(path, next);
  };

  const handleItemBlur = () => {
    onBlur?.(path);
  };

  if (!itemSchema) {
    return (
      <div>
        <Text type="warning">数组字段未定义 items 结构</Text>
      </div>
    );
  }

  const disableAdd = schema.maxItems !== undefined && items.length >= schema.maxItems;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, index) => (
          <Card
            key={`${path}-${String(index)}`}
            size="small"
            variant="outlined"
            title={
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text type="secondary">项 #{index + 1}</Text>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    handleRemove(index);
                  }}
                  disabled={schema.minItems !== undefined && items.length <= schema.minItems}
                />
              </div>
            }
          >
            <Renderer
              schema={itemSchema}
              data={item}
              errors={{}}
              path=""
              onChange={handleItemChange(index)}
              onBlur={handleItemBlur}
              allData={allData}
              _depth={0}
            />
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={disableAdd}
        >
          添加
        </Button>
        {error && (
          <Text type="danger" style={{ marginLeft: 8, fontSize: 12 }}>
            {error}
          </Text>
        )}
      </div>
    </div>
  );
}
