import { CheckCircleOutlined, CloseCircleOutlined, LockOutlined } from "@ant-design/icons"
import type { TableColumnsType } from "antd"
import {
  Badge,
  Card,
  Col,
  Collapse,
  Descriptions,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tree,
  Typography,
} from "antd"
import { useMemo, useState } from "react"
import {
  getPermissionsFromCode,
  getRoleName,
  hasPermission,
  type PermissionKey,
  Permissions,
  Roles,
} from "../utils/rbac.ts"

const { Text } = Typography

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  READ: "Read",
  WRITE: "Write",
  DELETE: "Delete",
  EXPORT: "Export",
  IMPORT: "Import",
  ADMIN: "Admin",
}

interface PermissionNode {
  title: string
  requiredPermissions: PermissionKey[]
  children?: PermissionNode[]
}

const PERMISSION_TREE: PermissionNode[] = [
  {
    title: "System Management",
    requiredPermissions: ["READ"],
    children: [
      {
        title: "User Management",
        requiredPermissions: ["READ", "WRITE", "DELETE"],
        children: [
          { title: "User List", requiredPermissions: ["READ"] },
          { title: "Create User", requiredPermissions: ["WRITE"] },
          { title: "Delete User", requiredPermissions: ["DELETE"] },
        ],
      },
      {
        title: "Content Management",
        requiredPermissions: ["READ", "WRITE"],
        children: [
          { title: "Articles", requiredPermissions: ["READ", "WRITE"] },
          { title: "Comments", requiredPermissions: ["READ", "WRITE", "DELETE"] },
        ],
      },
      {
        title: "Settings",
        requiredPermissions: ["READ", "WRITE", "ADMIN"],
        children: [
          { title: "System Config", requiredPermissions: ["ADMIN"] },
          { title: "Audit Logs", requiredPermissions: ["READ"] },
        ],
      },
    ],
  },
]

interface FlatNode {
  key: string
  title: string
  requiredPermissions: PermissionKey[]
  code: number
  depth: number
  children?: FlatNode[]
}

interface TreeItem {
  key: string
  title: React.ReactNode
  icon: React.ReactNode
  disabled: boolean
  children?: TreeItem[]
}

interface RouteRow {
  key: string
  title: string
  code: number
  requiredPermissions: PermissionKey[]
  grantedPerms: PermissionKey[]
  deniedPerms: PermissionKey[]
  accessible: boolean
}

interface ButtonRow {
  key: string
  title: string
  code: number
  requiredPermissions: PermissionKey[]
  checks: Record<PermissionKey, boolean>
  accessible: boolean
}

function flattenWithCodes(
  nodes: PermissionNode[],
  depth = 0,
  startIndex = 0,
): { flatNodes: FlatNode[]; count: number } {
  const flatNodes: FlatNode[] = []
  let currentIndex = startIndex

  for (const node of nodes) {
    const flat: FlatNode = {
      key: String(currentIndex),
      title: node.title,
      requiredPermissions: node.requiredPermissions,
      code: 1 << currentIndex,
      depth,
    }
    currentIndex++

    if (node.children !== undefined) {
      const result = flattenWithCodes(node.children, depth + 1, currentIndex)
      flat.children = result.flatNodes
      currentIndex = result.count
    }

    flatNodes.push(flat)
  }

  return { flatNodes, count: currentIndex }
}

function getAllNodes(nodes: FlatNode[]): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.children !== undefined) {
      result.push(...getAllNodes(node.children))
    }
  }
  return result
}

function buildTreeData(nodes: FlatNode[], roleCode: number): TreeItem[] {
  return nodes.map((node) => {
    const accessible = node.requiredPermissions.every((p) =>
      hasPermission(roleCode, Permissions[p]),
    )
    return {
      key: node.key,
      title: (
        <Text
          style={{
            color: accessible ? undefined : "#bfbfbf",
            textDecoration: accessible ? undefined : "line-through",
          }}
        >
          {node.title}
        </Text>
      ),
      icon: accessible ? (
        <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 14 }} />
      ) : (
        <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 14 }} />
      ),
      disabled: !accessible,
      children: node.children !== undefined ? buildTreeData(node.children, roleCode) : undefined,
    }
  })
}

const { flatNodes: ROOT_NODES } = flattenWithCodes(PERMISSION_TREE)
const ALL_NODES = getAllNodes(ROOT_NODES)

const ROLES_OPTIONS = Object.entries(Roles).map(([k, v]) => ({
  label: k,
  value: v,
}))

const PERM_COLORS: Record<string, string> = {
  READ: "blue",
  WRITE: "orange",
  DELETE: "red",
  ADMIN: "purple",
}

const PERM_BIT_POSITIONS: [PermissionKey, number, number][] = (
  Object.entries(Permissions) as [PermissionKey, number][]
).map(([key, val]) => [key, val, Math.log2(val)])

const ROLES_DATA = Object.entries(Roles).map(([name, code]) => {
  const perms = getPermissionsFromCode(code)
  return { name, code, binary: code.toString(2).padStart(6, "0"), perms }
})

const BUTTON_PERMS: PermissionKey[] = ["READ", "WRITE", "DELETE", "ADMIN"]

const ROUTE_COLUMNS: TableColumnsType<RouteRow> = [
  {
    title: "Route",
    dataIndex: "title",
    key: "title",
  },
  {
    title: "Permissions Required",
    key: "required",
    render: (_: unknown, record: RouteRow) => (
      <Space size={4}>
        {record.requiredPermissions.map((p) => (
          <Tag key={p} color={PERM_COLORS[p]}>
            {p}
          </Tag>
        ))}
      </Space>
    ),
  },
  {
    title: "Grants",
    key: "grants",
    render: (_: unknown, record: RouteRow) => (
      <Space size={4}>
        {record.grantedPerms.length > 0 ? (
          record.grantedPerms.map((p) => (
            <Tag key={p} color="success">
              {p}
            </Tag>
          ))
        ) : (
          <Text type="secondary">—</Text>
        )}
        {record.deniedPerms.length > 0
          ? record.deniedPerms.map((p) => (
              <Tag key={p} color="error">
                {p}
              </Tag>
            ))
          : null}
      </Space>
    ),
  },
  {
    title: "Access",
    key: "status",
    align: "center",
    render: (_: unknown, record: RouteRow) =>
      record.accessible ? (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Enabled
        </Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="error">
          Disabled
        </Tag>
      ),
  },
]

const PERM_COLUMNS_TABLE = BUTTON_PERMS.map((p) => ({
  title: p,
  key: p,
  align: "center" as const,
  render: (_: unknown, record: ButtonRow) =>
    record.checks[p] ? (
      <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 14 }} />
    ) : (
      <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 14 }} />
    ),
}))

const BUTTON_COLUMNS: TableColumnsType<ButtonRow> = [
  {
    title: "Action",
    dataIndex: "title",
    key: "title",
    fixed: "left",
  },
  {
    title: "Required",
    key: "required",
    render: (_: unknown, record: ButtonRow) => (
      <Space size={4}>
        {record.requiredPermissions.map((p) => (
          <Tag key={p} color={PERM_COLORS[p]}>
            {p}
          </Tag>
        ))}
      </Space>
    ),
  },
  ...PERM_COLUMNS_TABLE,
  {
    title: "Access",
    key: "status",
    align: "center",
    render: (_: unknown, record: ButtonRow) =>
      record.accessible ? (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Enabled
        </Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="error">
          Disabled
        </Tag>
      ),
  },
]

const DATA_SOURCE_NODE_COLUMNS: TableColumnsType<FlatNode> = [
  { title: "Node", dataIndex: "title", key: "title" },
  { title: "Depth", dataIndex: "depth", key: "depth", align: "center" },
  {
    title: "Bit Code",
    key: "code",
    render: (_: unknown, r: FlatNode) => `1 << ${r.key}`,
    align: "center",
  },
  {
    title: "Hex",
    key: "hex",
    render: (_: unknown, r: FlatNode) => `0x${r.code.toString(16).toUpperCase()}`,
    align: "center",
  },
  {
    title: "Required Perms",
    key: "perms",
    render: (_: unknown, r: FlatNode) => (
      <Space size={4}>
        {r.requiredPermissions.map((p) => (
          <Tag key={p} color={PERM_COLORS[p]}>
            {p}
          </Tag>
        ))}
      </Space>
    ),
  },
]

export default function RbacPermission() {
  const [roleCode, setRoleCode] = useState(Roles.EDITOR)

  const activePermissions = useMemo(() => getPermissionsFromCode(roleCode), [roleCode])
  const roleName = useMemo(() => getRoleName(roleCode), [roleCode])

  const treeData = useMemo(() => buildTreeData(ROOT_NODES, roleCode), [roleCode])

  const routeData: RouteRow[] = useMemo(() => {
    return ALL_NODES.filter((n) => n.depth === 1).map((node) => {
      const granted = node.requiredPermissions.filter((p) =>
        hasPermission(roleCode, Permissions[p]),
      )
      const denied = node.requiredPermissions.filter(
        (p) => !hasPermission(roleCode, Permissions[p]),
      )
      return {
        key: node.key,
        title: node.title,
        code: node.code,
        requiredPermissions: node.requiredPermissions,
        grantedPerms: granted,
        deniedPerms: denied,
        accessible: denied.length === 0,
      }
    })
  }, [roleCode])

  const buttonData: ButtonRow[] = useMemo(() => {
    return ALL_NODES.filter((n) => n.depth === 2).map((node) => {
      const checks: Record<PermissionKey, boolean> = {
        READ: hasPermission(roleCode, Permissions.READ),
        WRITE: hasPermission(roleCode, Permissions.WRITE),
        DELETE: hasPermission(roleCode, Permissions.DELETE),
        EXPORT: hasPermission(roleCode, Permissions.EXPORT),
        IMPORT: hasPermission(roleCode, Permissions.IMPORT),
        ADMIN: hasPermission(roleCode, Permissions.ADMIN),
      }
      const accessible = node.requiredPermissions.every((p) =>
        hasPermission(roleCode, Permissions[p]),
      )
      return {
        key: node.key,
        title: node.title,
        code: node.code,
        requiredPermissions: node.requiredPermissions,
        checks,
        accessible,
      }
    })
  }, [roleCode])

  const roleBinary = roleCode.toString(2).padStart(6, "0")
  const roleBits = roleBinary.split("").map((b) => b === "1")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Role selector */}
      <Card>
        <Space>
          <LockOutlined />
          <Text strong>Role Preset:</Text>
          <Select
            style={{ width: 220 }}
            options={ROLES_OPTIONS}
            value={roleCode}
            onChange={setRoleCode}
          />
          <Badge count={roleName} style={{ backgroundColor: "#1677ff" }} overflowCount={99} />
          <Text type="secondary">
            {activePermissions.length > 0
              ? activePermissions.map((p) => PERMISSION_LABELS[p]).join(", ")
              : "No permissions"}
          </Text>
          {/* Bit indicator */}
          <Space size={4}>
            <Text type="secondary" style={{ fontFamily: "monospace", fontSize: 12 }}>
              0b{roleBinary}
            </Text>
            <Tag style={{ fontFamily: "monospace" }}>
              0x{roleCode.toString(16).toUpperCase().padStart(2, "0")}
            </Tag>
          </Space>
        </Space>
      </Card>

      {/* Data source panel */}
      <Collapse
        ghost
        expandIconPlacement="end"
        items={[
          {
            key: "datasource",
            label: (
              <Space>
                <Text strong>Data Source</Text>
                <Tag>Bit Encoding</Tag>
              </Space>
            ),
            children: (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
                {/* Principle explanation */}
                <Card
                  size="small"
                  title={<Text strong>Principle: Bitwise Permission Encoding</Text>}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Text>
                      Each permission is assigned to a unique <Text code>bit position</Text> in an
                      integer. A role&apos;s permissions are stored as a single{" "}
                      <Text code>bitmask</Text> — an integer where each <Text code>1</Text> bit
                      means that permission is granted, and <Text code>0</Text> means denied.
                    </Text>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          ① Permission → Bit
                        </Text>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            lineHeight: 2,
                            marginTop: 4,
                          }}
                        >
                          <div>READ = 1 {"<<"} 0 = 0b000001</div>
                          <div>WRITE = 1 {"<<"} 1 = 0b000010</div>
                          <div>DELETE = 1 {"<<"} 2 = 0b000100</div>
                          <div>EXPORT = 1 {"<<"} 3 = 0b001000</div>
                          <div>IMPORT = 1 {"<<"} 4 = 0b010000</div>
                          <div>ADMIN = 1 {"<<"} 5 = 0b100000</div>
                        </div>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          ② Role → Bitmask (OR)
                        </Text>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            lineHeight: 2,
                            marginTop: 4,
                          }}
                        >
                          <div>GUEST = READ = 0b000001</div>
                          <div>EDITOR = READ | WRITE = 0b000011</div>
                          <div>MODERATOR= READ | WRITE | DELETE = 0b000111</div>
                          <div>ADMIN = READ | WRITE | DELETE | ADMIN = 0b100111</div>
                          <div>SUPER = ALL 6 bits = 0b111111</div>
                        </div>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          ③ Check → AND
                        </Text>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            lineHeight: 2,
                            marginTop: 4,
                          }}
                        >
                          <div>{"hasPermission(code, perm)"}</div>
                          <div style={{ color: "#888" }}>{"// (code & perm) === perm"}</div>
                          <div> </div>
                          <div>EDITOR & DELETE</div>
                          <div>{"= 0b000011 & 0b000100"}</div>
                          <div>{"= 0b000000 !== DELETE"}</div>
                          <div style={{ color: "#ff4d4f" }}>→ false (denied)</div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#f6f8fa",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <Text type="secondary">
                        <Text strong>Why bit encoding?</Text> A single integer replaces an entire
                        set/list of permission strings. Checking ANY permission is a single CPU
                        instruction (<Text code>AND</Text>) — O(1), no iteration. Adding/removing
                        permissions uses <Text code>OR</Text> / <Text code>AND NOT</Text>. The
                        entire permission system fits in one database column (INTEGER).
                      </Text>
                    </div>
                  </div>
                </Card>

                {/* Permission bit positions */}
                <Descriptions title="Permission Bit Positions" column={3} size="small" bordered>
                  {PERM_BIT_POSITIONS.map(([key, val, bit]) => (
                    <Descriptions.Item key={key} label={<Tag color={PERM_COLORS[key]}>{key}</Tag>}>
                      <Text code>
                        Bit {bit} = {val}
                      </Text>
                    </Descriptions.Item>
                  ))}
                </Descriptions>

                {/* Role definitions */}
                <Descriptions title="Role Definitions (Bitmask)" column={3} size="small" bordered>
                  {ROLES_DATA.map((r) => (
                    <Descriptions.Item key={r.name} label={r.name}>
                      <Space>
                        <Tag style={{ fontFamily: "monospace" }}>0b{r.binary}</Tag>
                        <Text code>0x{r.code.toString(16).toUpperCase().padStart(2, "0")}</Text>
                        <Text type="secondary">
                          {r.perms.map((p) => PERMISSION_LABELS[p]).join(", ") || "None"}
                        </Text>
                      </Space>
                    </Descriptions.Item>
                  ))}
                </Descriptions>

                {/* Current role bit visualization */}
                <Card size="small" title={<Text strong>Current Bitmask: {roleName}</Text>}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {(Object.entries(Permissions) as [PermissionKey, number][])
                      .sort(([, a], [, b]) => a - b)
                      .map(([key, val], i) => {
                        const granted = hasPermission(roleCode, val)
                        return (
                          <div
                            key={key}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Tag color={PERM_COLORS[key]}>{key}</Tag>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                fontWeight: 700,
                                fontFamily: "monospace",
                                backgroundColor: granted ? "#f6ffed" : "#fff2f0",
                                border: `2px solid ${granted ? "#52c41a" : "#ff4d4f"}`,
                                color: granted ? "#52c41a" : "#ff4d4f",
                              }}
                            >
                              {roleBits[i] ? "1" : "0"}
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Bit {i}
                            </Text>
                          </div>
                        )
                      })}
                    <div style={{ marginLeft: 16 }}>
                      <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }}>
                        <Text type="secondary">Bin: </Text>
                        <Text code>0b{roleBinary}</Text>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }}>
                        <Text type="secondary">Hex: </Text>
                        <Text code>0x{roleCode.toString(16).toUpperCase().padStart(2, "0")}</Text>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }}>
                        <Text type="secondary">Dec: </Text>
                        <Text code>{roleCode}</Text>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Flattened node table */}
                <Card size="small" title={<Text strong>Flattened Permission Nodes</Text>}>
                  <Table
                    dataSource={ALL_NODES}
                    columns={DATA_SOURCE_NODE_COLUMNS}
                    pagination={false}
                    size="small"
                    rowKey="key"
                    scroll={{ x: "max-content" }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* Three-layer view */}
      <Row gutter={16}>
        <Col span={8}>
          <Card
            title={
              <Space>
                <Text strong>Menu Layer</Text>
                <Tag>Hierarchy</Tag>
              </Space>
            }
            size="small"
          >
            <Tree treeData={treeData} defaultExpandAll showIcon selectable={false} />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title={
              <Space>
                <Text strong>Route Layer</Text>
                <Tag>canAccess</Tag>
              </Space>
            }
            size="small"
          >
            <Table
              dataSource={routeData}
              columns={ROUTE_COLUMNS}
              pagination={false}
              size="small"
              rowKey="key"
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title={
              <Space>
                <Text strong>Button Layer</Text>
                <Tag>Actions</Tag>
              </Space>
            }
            size="small"
          >
            <Table
              dataSource={buttonData}
              columns={BUTTON_COLUMNS}
              pagination={false}
              size="small"
              rowKey="key"
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
