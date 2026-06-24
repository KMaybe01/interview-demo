import {
  Alert,
  Button,
  Card,
  Collapse,
  Divider,
  Input,
  message,
  notification,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import DynamicForm, { type DynamicFormHandle } from "../components/dynamic-form/DynamicForm.tsx"
import ArrayField from "../components/dynamic-form/fields/ArrayField.tsx"
import DateTimeField from "../components/dynamic-form/fields/DateTimeField.tsx"
import JsonField from "../components/dynamic-form/fields/JsonField.tsx"
import NumberField from "../components/dynamic-form/fields/NumberField.tsx"
import SelectField from "../components/dynamic-form/fields/SelectField.tsx"
import StringField from "../components/dynamic-form/fields/StringField.tsx"
import SwitchField from "../components/dynamic-form/fields/SwitchField.tsx"
import { registerField } from "../components/dynamic-form/registry.tsx"
import type { FormSchema } from "../components/dynamic-form/types.ts"
import { getErrorMessage, http } from "../utils/fetchClient.ts"

const { Text, Title } = Typography

registerField("string", StringField)
registerField("number", NumberField)
registerField("select", SelectField)
registerField("switch", SwitchField)
registerField("datetime", DateTimeField)
registerField("json", JsonField)
registerField("array", ArrayField)

const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/

function augmentSchema(schema: FormSchema): FormSchema {
  const walk = (node: FormSchema): FormSchema => {
    if (node.type === "leaf" && node.properties) {
      for (const [key, leaf] of Object.entries(node.properties)) {
        if (key === "ipAddress") {
          leaf.validation = (value) => {
            if (typeof value === "string" && value && !ipPattern.test(value)) {
              return "IP 地址格式无效 (需为 x.x.x.x 格式)"
            }
            return undefined
          }
        }
        if (key === "cellId") {
          leaf.asyncValidation = async (value) => {
            await new Promise((r) => {
              setTimeout(r, 1000)
            })
            if (String(value) === "CELL-999") {
              return "基站 ID CELL-999 已被占用"
            }
            return undefined
          }
        }
        if (key === "fullCellName") {
          leaf.autoFill = (d) => {
            const typeLabel =
              d.cellType === "macro"
                ? "宏"
                : d.cellType === "micro"
                  ? "微"
                  : d.cellType === "pico"
                    ? "皮"
                    : "家庭"
            const name = typeof d.cellName === "string" ? d.cellName : ""
            return `${typeLabel}基站-${name}`
          }
        }
        if (leaf.items) {
          leaf.items = walk(leaf.items)
        }
      }
    }
    if (node.children) {
      node.children = node.children.map(walk)
    }
    if (node.tabs) {
      node.tabs = node.tabs.map((tab) => ({
        ...tab,
        children: tab.children.map(walk),
      }))
    }
    return node
  }
  return walk(structuredClone(schema))
}

export default function JsonSchemaFormPage() {
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({})
  const formRef = useRef<DynamicFormHandle>(null)
  const [liveData, setLiveData] = useState<Record<string, unknown>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fetchedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    http
      .get<{ schema: Record<string, unknown>; initialData: Record<string, unknown> }>(
        "/api/schema/config",
      )
      .then((res) => {
        const rawSchema = res.data.schema as unknown as FormSchema
        const augmented = augmentSchema(rawSchema)
        setSchema(augmented)
        setInitialData(res.data.initialData)
        setLiveData(res.data.initialData)
      })
      .catch((err: unknown) => {
        fetchedRef.current = false
        setFetchError(getErrorMessage(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])
  const handleFormChange = useCallback((data: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLiveData(data)
    }, 150)
  }, [])
  const liveDataJson = useMemo(() => JSON.stringify(liveData, null, 2), [liveData])
  const [jsonEditing, setJsonEditing] = useState(false)
  const [editJsonText, setEditJsonText] = useState("")
  const [activeTab, setActiveTab] = useState("form")
  const [formCollapsed, setFormCollapsed] = useState(false)
  const [jsonCollapsed, setJsonCollapsed] = useState(false)

  const handleBackendValidate = useCallback(
    async (
      data: Record<string, unknown>,
    ): Promise<{ path: string; message: string; source: string }[]> => {
      try {
        const res = await http.post<{
          valid: boolean
          errors: { path: string; message: string; source: string }[] | null
        }>("/api/schema/validate", { data })
        setBackendErrors(() => {
          const map: Record<string, string> = {}
          for (const e of res.data.errors ?? []) {
            map[e.path] = `[后端] ${e.message}`
          }
          return map
        })
        return res.data.errors ?? []
      } catch (err) {
        // 401 handled by axios interceptor (refresh + redirect)
        notification.error({
          title: "后端校验网络错误",
          description: getErrorMessage(err),
        })
        return []
      }
    },
    [],
  )

  const handleSubmit = useCallback((data: Record<string, unknown>) => {
    setSubmittedData(data)
    setBackendErrors({})
  }, [])

  const handleCopyJson = useCallback(() => {
    navigator.clipboard
      .writeText(JSON.stringify(liveData, null, 2))
      .then(() => message.success("已复制到剪贴板"))
      .catch(() => message.error("复制失败"))
  }, [liveData])

  const handleStartEdit = useCallback(() => {
    setEditJsonText(JSON.stringify(liveData, null, 2))
    setJsonEditing(true)
  }, [liveData])

  const handleApplyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(editJsonText) as Record<string, unknown>
      formRef.current?.setFormData(parsed)
      setJsonEditing(false)
      message.success("JSON 已应用到表单")
    } catch {
      message.error("JSON 格式错误")
    }
  }, [editJsonText])

  const handleCancelEdit = useCallback(() => {
    setJsonEditing(false)
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          5G 网元配置表单
        </Title>
        <Text type="secondary">递归渲染引擎 | 8 种字段类型 | 前后端双重校验</Text>
      </div>
      <Collapse
        items={[
          {
            key: "info",
            label: <Text strong>架构说明 / 演示指南</Text>,
            children: (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <Text strong>递归渲染流程</Text>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      background: "#f5f5f5",
                      padding: 8,
                      borderRadius: 4,
                      marginTop: 4,
                    }}
                  >
                    renderTabs → renderCard → renderForm → renderLeaf
                  </div>
                </div>
                <Divider style={{ margin: "4px 0" }} />
                <div>
                  <Text strong>控件注册表</Text>
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[
                      { type: "string", label: "String", color: "blue" },
                      { type: "number", label: "Number", color: "cyan" },
                      { type: "select", label: "Select", color: "geekblue" },
                      { type: "switch", label: "Switch", color: "purple" },
                      { type: "datetime", label: "DateTime", color: "orange" },
                      { type: "json", label: "JSON", color: "magenta" },
                      { type: "array", label: "Array", color: "lime" },
                    ].map((t) => (
                      <Tag key={t.type} color={t.color}>
                        {t.label}
                      </Tag>
                    ))}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    运行时 register() 可扩展自定义控件
                  </Text>
                </div>
                <Divider style={{ margin: "4px 0" }} />
                <div>
                  <Text strong>前端校验</Text>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    <Tag color="gold">ajv</Tag> Schema 结构校验 (类型/必填/枚举)
                    <br />
                    <Tag color="cyan">自定义</Tag> IP 格式、端口范围
                    <br />
                    <Tag color="purple">异步</Tag> Cell ID 唯一性 (1s 模拟)
                    <br />
                    <Tag color="volcano">显隐</Tag> 加密字段条件联动
                    <br />
                    <Tag color="geekblue">联动</Tag> 基站名称自动填充
                  </div>
                </div>
                <Divider style={{ margin: "4px 0" }} />
                <div>
                  <Text strong>后端业务校验</Text>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    <Tag color="red">业务</Tag> IP 地址合法性 + 回环地址检测
                    <br />
                    <Tag color="red">业务</Tag> Cell ID 格式 (CELL-xxx)
                    <br />
                    <Tag color="red">业务</Tag> MCC/MNC 联动 + 国家码白名单
                    <br />
                    <Tag color="red">业务</Tag> 端口号与基站类型关联规则
                    <br />
                    <Tag color="red">业务</Tag> 带宽标准值校验
                  </div>
                </div>
                <Divider style={{ margin: "4px 0" }} />
                <div>
                  <Text strong>双重校验策略</Text>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      background: "#f5f5f5",
                      padding: 8,
                      borderRadius: 4,
                    }}
                  >
                    前端校验 = 黄色提示（格式错误）
                    <br />
                    后端校验 = 红色错误（业务冲突）
                    <br />
                    前端通过后才允许提交
                    <br />
                    后端错误 setFields 精准映射到控件
                  </div>
                </div>
                <Divider style={{ margin: "4px 0" }} />
                <div>
                  <Text strong>演示说明</Text>
                  <ul style={{ fontSize: 12, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                    <li>
                      <Text code>传输配置</Text> Tab: SCTP 端口数组 (添加/删除)
                    </li>
                    <li>
                      <Text code>启用加密</Text>: 切换后显隐联动加密算法/证书字段
                    </li>
                    <li>
                      <Text code>完整基站名称</Text>: 自动填充 (cellType + cellName)
                    </li>
                    <li>
                      <Text code>基站 ID</Text> 输入 CELL-999: 异步校验拒绝
                    </li>
                    <li>
                      <Text code>IP 127.x.x.x</Text>: 后端拦截回环地址
                    </li>
                    <li>先通过前端校验 → 后端业务校验 → 提交成功</li>
                  </ul>
                </div>
              </div>
            ),
          },
        ]}
        defaultActiveKey={[]}
        size="small"
        style={{ marginBottom: 16, background: "#fff" }}
        bordered={false}
      />
      {fetchError && (
        <Alert
          type="error"
          title="加载表单配置失败"
          description={fetchError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Card>
        <Spin spinning={loading} description="正在加载表单配置...">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "form",
                label: "表单",
                children: (
                  <Card
                    title={
                      <Space
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setFormCollapsed(!formCollapsed)
                        }}
                      >
                        <Text strong>5G 网元配置表单</Text>
                        <Tag color="blue">{formCollapsed ? "展开" : "折叠"}</Tag>
                        {formCollapsed && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            (点击展开)
                          </Text>
                        )}
                      </Space>
                    }
                    size="small"
                  >
                    {!formCollapsed && schema && initialData && (
                      <DynamicForm
                        ref={formRef}
                        schema={schema}
                        initialData={initialData}
                        onBackendValidate={handleBackendValidate}
                        onSubmit={handleSubmit}
                        onChange={handleFormChange}
                        backendErrors={
                          Object.keys(backendErrors).length > 0 ? backendErrors : undefined
                        }
                      />
                    )}
                  </Card>
                ),
              },
              {
                key: "json",
                label: "JSON 数据",
                children: (
                  <Card
                    title={
                      <Space
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setJsonCollapsed(!jsonCollapsed)
                        }}
                      >
                        <Text strong>JSON 数据</Text>
                        <Tag color="blue">{jsonCollapsed ? "展开" : "折叠"}</Tag>
                      </Space>
                    }
                    extra={
                      jsonEditing ? (
                        <Space>
                          <Button size="small" type="primary" onClick={handleApplyJson}>
                            应用
                          </Button>
                          <Button size="small" onClick={handleCancelEdit}>
                            取消
                          </Button>
                        </Space>
                      ) : (
                        <Space>
                          <Button size="small" onClick={handleStartEdit}>
                            编辑
                          </Button>
                          <Button size="small" onClick={handleCopyJson}>
                            复制
                          </Button>
                        </Space>
                      )
                    }
                    size="small"
                  >
                    {!jsonCollapsed && (
                      <div>
                        {jsonEditing ? (
                          <Input.TextArea
                            value={editJsonText}
                            onChange={(e) => {
                              setEditJsonText(e.target.value)
                            }}
                            rows={24}
                            style={{
                              fontFamily: "'Courier New', monospace",
                              fontSize: 12,
                            }}
                          />
                        ) : (
                          <pre
                            style={{
                              fontSize: 12,
                              maxHeight: 600,
                              overflow: "auto",
                              margin: 0,
                            }}
                          >
                            {liveDataJson}
                          </pre>
                        )}
                      </div>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        </Spin>
      </Card>
      {submittedData && (
        <Card title="提交数据" size="small" style={{ marginTop: 12 }}>
          <pre style={{ fontSize: 12, maxHeight: 400, overflow: "auto", margin: 0 }}>
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  )
}
