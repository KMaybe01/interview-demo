import type { ValidateFunction } from 'ajv';
import { Button, notification, Spin, Tag, Typography } from 'antd';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Renderer from './Renderer.tsx';
import {
  compileAjvSchema,
  type FormSchema,
  findLeaf,
  flattenSchema,
  updateValue,
  validateSchema,
} from './types.ts';

const { Text } = Typography;

interface BackendError {
  path: string;
  message: string;
  source: string;
}

export interface DynamicFormHandle {
  setFormData: (data: Record<string, unknown>) => void;
}

interface DynamicFormProps {
  schema: FormSchema;
  initialData?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => void;
  title?: string;
  backendErrors?: Record<string, string>;
  maxDepth?: number;
  onBackendValidate?: (data: Record<string, unknown>) => Promise<BackendError[]>;
  onChange?: (data: Record<string, unknown>) => void;
}

const DynamicForm = forwardRef<DynamicFormHandle, DynamicFormProps>(function DynamicForm(
  {
    schema,
    initialData = {},
    onSubmit,
    title,
    backendErrors = {},
    maxDepth = 10,
    onBackendValidate,
    onChange,
  },
  ref,
) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [asyncValidating, setAsyncValidating] = useState<Record<string, boolean>>({});
  const [ajvErrors, setAjvErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const compiledRef = useRef<Map<string, ValidateFunction>>(new Map());
  const prevAutoFillRef = useRef<Record<string, unknown>>({});

  useImperativeHandle(
    ref,
    () => ({
      setFormData(newData: Record<string, unknown>) {
        setData(newData);
      },
    }),
    [],
  );

  const leaves = useMemo(() => flattenSchema(schema), [schema]);

  const runAjvValidation = useCallback(
    (currentData: Record<string, unknown>) => {
      const newAjvErrors: Record<string, string[]> = {};
      for (const leaf of leaves) {
        if (!leaf.ajvSchema) continue;
        const key = leaf.key;
        let validate = compiledRef.current.get(key);
        if (!validate) {
          const compiled = compileAjvSchema(leaf.ajvSchema);
          if (compiled) {
            validate = compiled;
            compiledRef.current.set(key, validate);
          }
        }
        if (validate) {
          validate(currentData[key]);
          if (validate.errors) {
            newAjvErrors[key] = validate.errors.map((e) => {
              if (e.keyword === 'type') return `应为 ${String(e.params.type)} 类型`;
              if (e.keyword === 'required')
                return `缺少必填字段: ${String(e.params.missingProperty)}`;
              if (e.keyword === 'enum')
                return `值不在允许范围内: ${String(e.params.allowedValues)}`;
              if (e.keyword === 'pattern') return `格式不匹配: ${String(e.message)}`;
              return e.message ?? '格式错误';
            });
          }
        }
      }
      setAjvErrors((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(newAjvErrors)) return prev;
        return newAjvErrors;
      });
    },
    [leaves],
  );

  function handleChange(path: string, value: unknown) {
    const leaf = findLeaf(schema, path);
    const validationFn = leaf?.validation;

    setData((prev) => {
      const newData = updateValue(prev, path, value);
      if (validationFn) {
        const err = validationFn(value, newData);
        setErrors((current) => {
          if (err) {
            return { ...current, [path]: err };
          }
          return Object.fromEntries(Object.entries(current).filter(([k]) => k !== path));
        });
      }
      return newData;
    });

    if (!validationFn) {
      setErrors((prev) => {
        if (prev[path]) {
          return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== path));
        }
        return prev;
      });
    }
  }

  async function runAsyncValidation(blurPath: string, currentData: Record<string, unknown>) {
    const leaf = findLeaf(schema, blurPath);
    if (!leaf?.asyncValidation) return;

    setAsyncValidating((prev) => ({ ...prev, [blurPath]: true }));
    try {
      const err = await leaf.asyncValidation(currentData[blurPath]);
      setErrors((prev) => {
        if (err) {
          return { ...prev, [blurPath]: err };
        }
        return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== blurPath));
      });
    } catch {
      setErrors((prev) => ({ ...prev, [blurPath]: '校验异常' }));
    } finally {
      setAsyncValidating((prev) => ({ ...prev, [blurPath]: false }));
    }
  }

  function handleBlur(blurPath: string) {
    void runAsyncValidation(blurPath, data);
  }

  useEffect(() => {
    if (Object.keys(data).length === 0) return;
    runAjvValidation(data);
  }, [data, runAjvValidation]);

  useEffect(() => {
    const updates: Record<string, unknown> = {};
    let hasUpdates = false;

    for (const leaf of leaves) {
      if (leaf.autoFill && leaf.dependencies && leaf.dependencies.length > 0) {
        const allDepsPresent = leaf.dependencies.every((dep) => dep in data);
        if (allDepsPresent) {
          const computedValue = leaf.autoFill(data);
          const prev = prevAutoFillRef.current[leaf.key];
          if (computedValue !== prev) {
            updates[leaf.key] = computedValue;
            prevAutoFillRef.current[leaf.key] = computedValue;
            hasUpdates = true;
          }
        }
      }
    }

    if (hasUpdates) {
      setData((prev) => {
        let next = prev;
        for (const [key, val] of Object.entries(updates)) {
          next = updateValue(next, key, val);
        }
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, leaves]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dataInitialized = useRef(false);
  useEffect(() => {
    if (!dataInitialized.current) {
      dataInitialized.current = true;
      return;
    }
    onChangeRef.current?.(data);
  }, [data]);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitted(false);

    const result = validateSchema(schema, data);

    if (result.length > 0) {
      const errorMap: Record<string, string> = {};
      for (const e of result) {
        errorMap[e.path] = e.message;
      }
      setErrors(errorMap);
      notification.error({
        title: '表单校验失败',
        description: `共有 ${String(result.length)} 个错误`,
      });
      setSubmitting(false);
      return;
    }

    const asyncResults: { path: string; message: string }[] = [];
    const asyncPromises: Promise<void>[] = [];

    for (const leaf of leaves) {
      const asyncFn = leaf.asyncValidation;
      if (asyncFn) {
        const promise = (async () => {
          setAsyncValidating((prev) => ({ ...prev, [leaf.key]: true }));
          try {
            const err = await asyncFn(data[leaf.key]);
            if (err) {
              asyncResults.push({ path: leaf.key, message: err });
            }
          } catch {
            asyncResults.push({ path: leaf.key, message: `${leaf.title} 校验异常` });
          } finally {
            setAsyncValidating((prev) => ({ ...prev, [leaf.key]: false }));
          }
        })();
        asyncPromises.push(promise);
      }
    }

    await Promise.all(asyncPromises);

    if (asyncResults.length > 0) {
      const errorMap: Record<string, string> = {};
      for (const e of asyncResults) {
        errorMap[e.path] = e.message;
      }
      setErrors(errorMap);
      notification.error({
        title: '异步校验失败',
        description: `共有 ${String(asyncResults.length)} 个错误`,
      });
      setSubmitting(false);
      return;
    }

    if (onBackendValidate) {
      try {
        const backendResults = await onBackendValidate(data);
        if (backendResults.length > 0) {
          const errorMap: Record<string, string> = {};
          for (const e of backendResults) {
            errorMap[e.path] = `[后端] ${e.message}`;
          }
          setErrors(errorMap);
          notification.warning({
            title: '后端业务校验失败',
            description: `共有 ${String(backendResults.length)} 个业务规则错误`,
          });
          setSubmitting(false);
          return;
        }
      } catch {
        notification.error({ title: '后端校验请求失败', description: '请检查网络连接和后端服务' });
        setSubmitting(false);
        return;
      }
    }

    setSubmitted(true);
    setErrors({});
    onSubmit?.(data);
    notification.success({ title: '表单提交成功', description: '数据已通过校验' });
    setSubmitting(false);
  }

  function handleReset() {
    setData(initialData);
    setErrors({});
    setSubmitted(false);
    setAsyncValidating({});
    setAjvErrors({});
    prevAutoFillRef.current = {};
  }

  const hasAsyncErrors = Object.values(asyncValidating).some(Boolean);

  return (
    <Spin spinning={submitting} description="提交中...">
      <div>
        {title && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 16 }}>
              {title}
            </Text>
          </div>
        )}
        <Renderer
          schema={schema}
          data={data}
          errors={errors}
          path=""
          onChange={handleChange}
          onBlur={handleBlur}
          backendErrors={backendErrors}
          ajvErrors={ajvErrors}
          asyncValidating={asyncValidating}
          allData={data}
          _depth={0}
          maxDepth={maxDepth}
        />
        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={hasAsyncErrors}
          >
            提交
          </Button>
          <Button onClick={handleReset} disabled={submitting}>
            重置
          </Button>
          {Object.keys(errors).length > 0 && (
            <Text type="danger">{Object.keys(errors).length} 个校验错误</Text>
          )}
          {submitted && <Tag color="green">已提交</Tag>}
        </div>
      </div>
    </Spin>
  );
});

export default DynamicForm;
