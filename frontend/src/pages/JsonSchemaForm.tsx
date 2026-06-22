import {
  Button,
  Card,
  Collapse,
  Divider,
  Input,
  message,
  notification,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd"
import { useCallback, useMemo, useRef, useState } from "react"
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

const networkSchema: FormSchema = {
  type: "tabs",
  key: "root",
  tabs: [
    {
      title: "基站配置",
      key: "cell",
      children: [
        {
          type: "card",
          key: "basic",
          title: "基本信息",
          description: "基站核心参数",
          children: [
            {
              type: "leaf",
              key: "basic-fields",
              properties: {
                cellName: {
                  type: "string",
                  key: "cellName",
                  title: "基站名称",
                  required: true,
                  placeholder: "例如: SMF-01",
                  minLength: 2,
                  maxLength: 32,
                },
                fullCellName: {
                  type: "string",
                  key: "fullCellName",
                  title: "完整基站名称",
                  description: "自动生成",
                  placeholder: "由基站类型和名称自动拼接",
                  dependencies: ["cellName", "cellType"],
                  autoFill: (d) => {
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
                  },
                },
                cellId: {
                  type: "string",
                  key: "cellId",
                  title: "基站 ID",
                  required: true,
                  placeholder: "例如: CELL-001",
                  asyncValidation: async (value) => {
                    await new Promise((r) => {
                      setTimeout(r, 1000)
                    })
                    if (String(value) === "CELL-999") {
                      return "基站 ID CELL-999 已被占用"
                    }
                    return undefined
                  },
                },
                cellType: {
                  type: "select",
                  key: "cellType",
                  title: "基站类型",
                  required: true,
                  options: [
                    { label: "宏基站 (Macro)", value: "macro" },
                    { label: "微基站 (Micro)", value: "micro" },
                    { label: "皮基站 (Pico)", value: "pico" },
                    { label: "家庭基站 (Femto)", value: "femto" },
                  ],
                  placeholder: "选择基站类型",
                },
                status: {
                  type: "select",
                  key: "status",
                  title: "运行状态",
                  options: [
                    { label: "在线", value: "online" },
                    { label: "离线", value: "offline" },
                    { label: "维护", value: "maintenance" },
                  ],
                  placeholder: "选择状态",
                },
              },
            },
          ],
        },
        {
          type: "card",
          key: "network",
          title: "网络配置",
          description: "IP 与传输参数",
          children: [
            {
              type: "leaf",
              key: "network-fields",
              properties: {
                ipAddress: {
                  type: "string",
                  key: "ipAddress",
                  title: "管理 IP",
                  required: true,
                  placeholder: "例如: 192.168.1.100",
                  validation: (value) => {
                    if (typeof value === "string" && value && !ipPattern.test(value)) {
                      return "IP 地址格式无效 (需为 x.x.x.x 格式)"
                    }
                    return undefined
                  },
                },
                port: {
                  type: "number",
                  key: "port",
                  title: "端口号",
                  required: true,
                  min: 1024,
                  max: 65535,
                  placeholder: "例如: 8080",
                },
                mcc: {
                  type: "string",
                  key: "mcc",
                  title: "MCC (移动国家码)",
                  minLength: 3,
                  maxLength: 3,
                  placeholder: "例如: 460",
                },
                mnc: {
                  type: "string",
                  key: "mnc",
                  title: "MNC (移动网络码)",
                  minLength: 2,
                  maxLength: 3,
                  placeholder: "例如: 01",
                },
                tac: {
                  type: "number",
                  key: "tac",
                  title: "TAC (跟踪区码)",
                  min: 1,
                  max: 65535,
                  placeholder: "例如: 1",
                },
              },
            },
          ],
        },
      ],
    },
    {
      title: "传输配置",
      key: "transport",
      children: [
        {
          type: "card",
          key: "sctp-config",
          title: "SCTP 传输配置",
          description: "SCTP 端口列表",
          children: [
            {
              type: "leaf",
              key: "sctp-fields",
              properties: {
                sctpPorts: {
                  type: "array",
                  key: "sctpPorts",
                  title: "SCTP 端口",
                  description: "添加/删除 SCTP 端口对",
                  required: true,
                  minItems: 1,
                  maxItems: 10,
                  items: {
                    type: "leaf",
                    key: "sctp-port-item",
                    properties: {
                      localPort: {
                        type: "number",
                        key: "localPort",
                        title: "本地端口",
                        required: true,
                        min: 1,
                        max: 65535,
                        placeholder: "例如: 38472",
                      },
                      remotePort: {
                        type: "number",
                        key: "remotePort",
                        title: "远端端口",
                        required: true,
                        min: 1,
                        max: 65535,
                        placeholder: "例如: 38472",
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      title: "业务参数",
      key: "service",
      children: [
        {
          type: "card",
          key: "service-config",
          title: "业务配置",
          children: [
            {
              type: "leaf",
              key: "service-fields",
              properties: {
                maxUsers: {
                  type: "number",
                  key: "maxUsers",
                  title: "最大用户数",
                  required: true,
                  min: 1,
                  max: 100000,
                  placeholder: "例如: 10000",
                },
                bandwidth: {
                  type: "select",
                  key: "bandwidth",
                  title: "带宽 (MHz)",
                  required: true,
                  options: [
                    { label: "5 MHz", value: 5 },
                    { label: "10 MHz", value: 10 },
                    { label: "20 MHz", value: 20 },
                    { label: "40 MHz", value: 40 },
                    { label: "100 MHz", value: 100 },
                  ],
                },
                enableEncryption: {
                  type: "switch",
                  key: "enableEncryption",
                  title: "启用加密",
                  default: true,
                },
                enableLogging: {
                  type: "switch",
                  key: "enableLogging",
                  title: "启用日志",
                  default: false,
                },
              },
            },
          ],
        },
        {
          type: "card",
          key: "advanced",
          title: "高级配置",
          children: [
            {
              type: "leaf",
              key: "advanced-fields",
              properties: {
                encryptAlgorithm: {
                  type: "select",
                  key: "encryptAlgorithm",
                  title: "加密算法",
                  options: [
                    { label: "AES-256", value: "aes-256" },
                    { label: "AES-128", value: "aes-128" },
                    { label: "SM4", value: "sm4" },
                  ],
                  placeholder: "选择加密算法",
                  default: "aes-256",
                  visible: "enableEncryption === true",
                },
                certType: {
                  type: "select",
                  key: "certType",
                  title: "证书类型",
                  options: [
                    { label: "自签名", value: "self-signed" },
                    { label: "CA 签发", value: "ca-signed" },
                  ],
                  placeholder: "选择证书类型",
                  default: "self-signed",
                  visible: "enableEncryption === true",
                },
                certPath: {
                  type: "string",
                  key: "certPath",
                  title: "证书路径",
                  placeholder: "例如: /etc/certs/server.pem",
                  visible: 'enableEncryption === true && certType === "ca-signed"',
                },
                deployTime: { type: "datetime", key: "deployTime", title: "部署时间" },
                extraConfig: {
                  type: "json",
                  key: "extraConfig",
                  title: "扩展配置",
                  description: "JSON 格式自定义参数",
                },
              },
            },
          ],
        },
      ],
    },
  ],
}

const initialData: Record<string, unknown> = {
  cellName: "SMF-01",
  cellId: "CELL-001",
  cellType: "macro",
  status: "online",
  ipAddress: "192.168.1.100",
  port: 8080,
  mcc: "460",
  mnc: "01",
  tac: 1,
  maxUsers: 10000,
  bandwidth: 100,
  enableEncryption: true,
  enableLogging: false,
  sctpPorts: [{ localPort: 38472, remotePort: 38472 }],
  encryptAlgorithm: "aes-256",
  certType: "self-signed",
  extraConfig: { nfId: "smf-001", plmn: "46001" },
}

export default function JsonSchemaFormPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({})
  const formRef = useRef<DynamicFormHandle>(null)
  const [liveData, setLiveData] = useState<Record<string, unknown>>(initialData)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
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
                  <Space style={{ cursor: "pointer" }} onClick={() => { setFormCollapsed(!formCollapsed) }}>
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
                {!formCollapsed && (
                  <DynamicForm
                    ref={formRef}
                    schema={networkSchema}
                    initialData={initialData}
                    onBackendValidate={handleBackendValidate}
                    onSubmit={handleSubmit}
                    onChange={handleFormChange}
                    backendErrors={Object.keys(backendErrors).length > 0 ? backendErrors : undefined}
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
                  <Space style={{ cursor: "pointer" }} onClick={() => { setJsonCollapsed(!jsonCollapsed) }}>
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
