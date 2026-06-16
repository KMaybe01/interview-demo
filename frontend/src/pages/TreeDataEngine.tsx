import {
  DeleteOutlined,
  FileOutlined,
  FolderAddOutlined,
  FolderOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  message,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from "antd"
import type { DataNode } from "antd/es/tree"
import { useCallback, useMemo, useState } from "react"

const { Text } = Typography

interface TreeNodeData {
  key: string
  title: string
  type: "folder" | "file" | "config"
  children?: TreeNodeData[]
}

type NodeType = TreeNodeData["type"]

interface ValidationError {
  key: string
  message: string
}

interface TreeStats {
  totalNodes: number
  maxDepth: number
  folderCount: number
  fileCount: number
  configCount: number
}

type ExtendedDataNode = DataNode & { nodeType: NodeType }

function generateKey(): string {
  return crypto.randomUUID()
}

function createDefaultNode(type: NodeType): TreeNodeData {
  return {
    key: generateKey(),
    title: `New ${type}`,
    type,
    children: type === "folder" ? [] : undefined,
  }
}

function getNodeIcon(type: NodeType): React.ReactNode {
  switch (type) {
    case "folder":
      return <FolderOutlined />
    case "file":
      return <FileOutlined />
    case "config":
      return <SettingOutlined />
  }
}

function findNode(nodes: TreeNodeData[], key: string): TreeNodeData | null {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.children) {
      const found = findNode(node.children, key)
      if (found) return found
    }
  }
  return null
}

function getPath(nodes: TreeNodeData[], key: string): number[] | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].key === key) return [i]
    const children = nodes[i].children
    if (children) {
      const found = getPath(children, key)
      if (found) return [i, ...found]
    }
  }
  return null
}

function updateAt(
  nodes: TreeNodeData[],
  path: number[],
  updater: (node: TreeNodeData) => TreeNodeData,
): TreeNodeData[] {
  return nodes.map((node, index) => {
    if (index !== path[0]) return node
    if (path.length === 1) return updater(node)
    return {
      ...node,
      children: node.children ? updateAt(node.children, path.slice(1), updater) : node.children,
    }
  })
}

function removeNodeByKey(
  nodes: TreeNodeData[],
  key: string,
): { nodes: TreeNodeData[]; removed: TreeNodeData | null } {
  const result: TreeNodeData[] = []
  let removed: TreeNodeData | null = null

  for (const node of nodes) {
    if (node.key === key) {
      removed = node
      continue
    }
    if (node.children) {
      const processed = removeNodeByKey(node.children, key)
      result.push({ ...node, children: processed.nodes })
      if (processed.removed != null) {
        removed = processed.removed
      }
    } else {
      result.push(node)
    }
  }

  return { nodes: result, removed }
}

function insertAt(
  nodes: TreeNodeData[],
  parentPath: number[],
  newNode: TreeNodeData,
  index: number,
): TreeNodeData[] {
  if (parentPath.length === 0) {
    const result = [...nodes]
    if (index >= result.length) {
      result.push(newNode)
    } else {
      result.splice(index, 0, newNode)
    }
    return result
  }

  return nodes.map((node, i) => {
    if (i !== parentPath[0]) return node
    if (parentPath.length === 1) {
      const children = [...(node.children ?? [])]
      if (index >= children.length) {
        children.push(newNode)
      } else {
        children.splice(index, 0, newNode)
      }
      return { ...node, children }
    }
    return {
      ...node,
      children: node.children
        ? insertAt(node.children, parentPath.slice(1), newNode, index)
        : node.children,
    }
  })
}

function isDescendantOrSelf(
  nodes: TreeNodeData[],
  ancestorKey: string,
  descendantKey: string,
): boolean {
  if (ancestorKey === descendantKey) return true
  const ancestor = findNode(nodes, ancestorKey)
  if (ancestor?.children == null) return false
  return ancestor.children.some((child) => isDescendantOrSelf(nodes, child.key, descendantKey))
}

function validateTree(nodes: TreeNodeData[]): ValidationError[] {
  const errors: ValidationError[] = []
  const seenKeys = new Set<string>()

  function walk(list: TreeNodeData[]) {
    for (const node of list) {
      if (!node.title.trim()) {
        errors.push({ key: node.key, message: "Node title cannot be empty" })
      }
      if (seenKeys.has(node.key)) {
        errors.push({ key: node.key, message: "Duplicate key detected" })
      }
      seenKeys.add(node.key)
      if (node.children) {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return errors
}

function computeStats(nodes: TreeNodeData[]): TreeStats {
  let totalNodes = 0
  let maxDepth = 0
  let folderCount = 0
  let fileCount = 0
  let configCount = 0

  function walk(list: TreeNodeData[], depth: number) {
    for (const node of list) {
      totalNodes++
      maxDepth = Math.max(maxDepth, depth)
      switch (node.type) {
        case "folder":
          folderCount++
          break
        case "file":
          fileCount++
          break
        case "config":
          configCount++
          break
      }
      if (node.children) {
        walk(node.children, depth + 1)
      }
    }
  }

  walk(nodes, 1)
  return { totalNodes, maxDepth, folderCount, fileCount, configCount }
}

function makeNode(title: string, type: NodeType, children?: TreeNodeData[]): TreeNodeData {
  return { key: generateKey(), title, type, children }
}

const initialData: TreeNodeData[] = [
  makeNode("Project Root", "folder", [
    makeNode("src", "folder", [
      makeNode("components", "folder", [
        makeNode("Header.tsx", "file"),
        makeNode("Footer.tsx", "file"),
        makeNode("Sidebar.tsx", "file"),
      ]),
      makeNode("pages", "folder", [makeNode("Home.tsx", "file"), makeNode("About.tsx", "file")]),
      makeNode("app.ts", "file"),
      makeNode("main.tsx", "file"),
    ]),
    makeNode("config", "folder", [
      makeNode("tsconfig.json", "config"),
      makeNode("eslint.config.js", "config"),
    ]),
    makeNode("package.json", "config"),
    makeNode("README.md", "file"),
  ]),
]

export default function TreeDataEngine() {
  const [data, setData] = useState<TreeNodeData[]>(initialData)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [addModalMode, setAddModalMode] = useState<"root" | "child">("root")
  const [addParentKey, setAddParentKey] = useState<string | null>(null)
  const [newNodeType, setNewNodeType] = useState<NodeType>("folder")

  const handleStartEdit = useCallback((key: string, title: string) => {
    setEditingKey(key)
    setNewTitle(title)
  }, [])

  const handleNewTitleChange = useCallback((value: string) => {
    setNewTitle(value)
  }, [])

  const handleSaveEdit = useCallback(
    (key: string) => {
      const trimmed = newTitle.trim()
      if (!trimmed) {
        message.warning("Title cannot be empty")
        return
      }
      setData((prev) => {
        const path = getPath(prev, key)
        if (!path) return prev
        return updateAt(prev, path, (node) => ({ ...node, title: trimmed }))
      })
      setEditingKey(null)
      setNewTitle("")
    },
    [newTitle],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null)
    setNewTitle("")
  }, [])

  const handleAddRoot = useCallback(() => {
    setAddModalMode("root")
    setAddParentKey(null)
    setNewNodeType("folder")
    setAddModalVisible(true)
  }, [])

  const handleAddChild = useCallback((parentKey: string) => {
    setAddModalMode("child")
    setAddParentKey(parentKey)
    setNewNodeType("folder")
    setAddModalVisible(true)
  }, [])

  const handleAddConfirm = useCallback(() => {
    const newNode = createDefaultNode(newNodeType)
    if (addModalMode === "root") {
      setData((prev) => [...prev, newNode])
    } else if (addParentKey != null) {
      setData((prev) => {
        const path = getPath(prev, addParentKey)
        if (!path) return prev
        return updateAt(prev, path, (node) => ({
          ...node,
          children: [...(node.children ?? []), newNode],
        }))
      })
    }
    setAddModalVisible(false)
  }, [addModalMode, addParentKey, newNodeType])

  const handleDeleteNode = useCallback(
    (key: string) => {
      const node = findNode(data, key)
      if (!node) return
      Modal.confirm({
        title: "Delete Node",
        content: `Are you sure you want to delete "${node.title}"?`,
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: () => {
          setData((prev) => removeNodeByKey(prev, key).nodes)
          message.success("Node deleted")
        },
      })
    },
    [data],
  )

  const handleDrop = useCallback(
    (info: { dragNode: DataNode; node: DataNode; dropPosition: number; dropToGap: boolean }) => {
      const dragKey = String(info.dragNode.key)
      const targetKey = String(info.node.key)

      if (dragKey === targetKey) return

      if (isDescendantOrSelf(data, dragKey, targetKey)) {
        message.warning("Cannot drop a node onto itself or its descendants")
        return
      }

      const targetNode = findNode(data, targetKey)
      if (targetNode == null) return

      if (!info.dropToGap && targetNode.type !== "folder") {
        message.warning("Can only add children to folder nodes")
        return
      }

      setData((prev) => {
        const { nodes: afterRemove, removed } = removeNodeByKey(prev, dragKey)
        if (removed == null) return prev

        const targetPath = getPath(afterRemove, targetKey)
        if (targetPath == null) return prev

        let parentPath: number[]
        let insertIndex: number

        if (info.dropToGap) {
          parentPath = targetPath.slice(0, -1)
          const targetIndex = targetPath[targetPath.length - 1]
          insertIndex = info.dropPosition === -1 ? targetIndex : targetIndex + 1
        } else {
          parentPath = targetPath
          insertIndex = Infinity
        }

        return insertAt(afterRemove, parentPath, removed, insertIndex)
      })
      message.success("Node moved")
    },
    [data],
  )

  const handleValidate = useCallback(() => {
    const errors = validateTree(data)
    if (errors.length === 0) {
      message.success("Tree is valid")
    } else {
      message.warning(`${String(errors.length)} validation error(s) found`)
    }
  }, [data])

  const treeData: ExtendedDataNode[] = useMemo(() => {
    function convert(node: TreeNodeData): ExtendedDataNode {
      return {
        key: node.key,
        title: node.title,
        nodeType: node.type,
        icon: getNodeIcon(node.type),
        children: node.children?.map(convert),
      }
    }
    return data.map(convert)
  }, [data])

  const validationErrors = useMemo(() => validateTree(data), [data])

  const stats = useMemo(() => computeStats(data), [data])

  const titleRender = useCallback(
    (node: DataNode) => {
      const nodeKey = String(node.key)
      const isEditing = nodeKey === editingKey
      const extNode = node as ExtendedDataNode
      const nodeType: NodeType | undefined = extNode.nodeType

      if (isEditing) {
        return (
          <Input
            size="small"
            value={newTitle}
            onChange={(e) => {
              handleNewTitleChange(e.target.value)
            }}
            onPressEnter={() => {
              handleSaveEdit(nodeKey)
            }}
            onBlur={handleCancelEdit}
            autoFocus
            style={{ width: 180 }}
          />
        )
      }

      return (
        <Space size={4}>
          <span
            onClick={() => {
              handleStartEdit(nodeKey, node.title as string)
            }}
            style={{ cursor: "pointer" }}
          >
            {node.title as string}
          </span>
          {nodeType === "folder" && (
            <Tooltip title="Add child node">
              <Button
                type="text"
                size="small"
                icon={<FolderAddOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddChild(nodeKey)
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete node">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteNode(nodeKey)
              }}
            />
          </Tooltip>
        </Space>
      )
    },
    [
      editingKey,
      newTitle,
      handleStartEdit,
      handleNewTitleChange,
      handleSaveEdit,
      handleCancelEdit,
      handleAddChild,
      handleDeleteNode,
    ],
  )

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Nodes" value={stats.totalNodes} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Max Depth" value={stats.maxDepth} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Folders" value={stats.folderCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Files / Config"
              value={`${String(stats.fileCount)} / ${String(stats.configCount)}`}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoot}>
          Add Root Node
        </Button>
        <Button onClick={handleValidate}>Validate Tree</Button>
      </Space>

      {validationErrors.length > 0 && (
        <Card
          title={<Text type="danger">Validation Errors ({validationErrors.length})</Text>}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Space wrap>
            {validationErrors.map((err) => (
              <Tag key={err.key} color="error">
                {err.key.slice(0, 8)}...: {err.message}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      <Card
        title={
          <Space>
            <span>Tree Data Engine</span>
            <Tag color="default">Drag to reorder</Tag>
            <Tag color="default">Click title to edit</Tag>
          </Space>
        }
      >
        <Tree
          treeData={treeData}
          titleRender={titleRender}
          draggable
          onDrop={handleDrop}
          defaultExpandAll
          showLine
          blockNode
        />
      </Card>

      <Modal
        title={addModalMode === "root" ? "Add Root Node" : "Add Child Node"}
        open={addModalVisible}
        onOk={handleAddConfirm}
        onCancel={() => {
          setAddModalVisible(false)
        }}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text>Select node type:</Text>
          <Space>
            {(["folder", "file", "config"] as const).map((type) => (
              <Button
                key={type}
                type={newNodeType === type ? "primary" : "default"}
                icon={getNodeIcon(type)}
                onClick={() => {
                  setNewNodeType(type)
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </Space>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              A new node with title &quot;New {newNodeType}&quot; will be created. You can edit the
              title after creation.
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  )
}
