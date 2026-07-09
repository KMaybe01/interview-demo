import {
  ApiOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  List,
  Modal,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import type { Plugin } from '../types/index.ts';

const { Title, Text } = Typography;

const builtinPlugins: Plugin[] = [
  {
    id: 'weather',
    name: '天气查询',
    description: '获取指定城市的天气信息',
    version: '1.0.0',
    enabled: true,
    parameters: [{ name: 'city', type: 'string', required: true, description: '城市名称' }],
    category: 'utility',
  },
  {
    id: 'calculator',
    name: '计算器',
    description: '执行数学计算',
    version: '1.0.0',
    enabled: true,
    parameters: [
      {
        name: 'expression',
        type: 'string',
        required: true,
        description: '数学表达式',
      },
    ],
    category: 'utility',
  },
  {
    id: 'search',
    name: '搜索引擎',
    description: '搜索互联网获取信息',
    version: '1.0.0',
    enabled: true,
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: '搜索关键词',
      },
    ],
    category: 'information',
  },
  {
    id: 'database',
    name: '数据库查询',
    description: '查询数据库获取数据',
    version: '1.0.0',
    enabled: false,
    parameters: [
      {
        name: 'sql',
        type: 'string',
        required: true,
        description: 'SQL 查询语句',
      },
    ],
    category: 'data',
  },
  {
    id: 'email',
    name: '邮件发送',
    description: '发送电子邮件',
    version: '1.0.0',
    enabled: false,
    parameters: [
      { name: 'to', type: 'string', required: true, description: '收件人邮箱' },
      {
        name: 'subject',
        type: 'string',
        required: true,
        description: '邮件主题',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '邮件内容',
      },
    ],
    category: 'communication',
  },
  {
    id: 'code_executor',
    name: '代码执行器',
    description: '安全执行 Python/JavaScript 代码',
    version: '1.0.0',
    enabled: true,
    parameters: [
      {
        name: 'language',
        type: 'string',
        required: true,
        description: '编程语言',
      },
      { name: 'code', type: 'string', required: true, description: '代码内容' },
    ],
    category: 'development',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  utility: 'blue',
  information: 'green',
  data: 'orange',
  communication: 'purple',
  development: 'cyan',
};

const CATEGORY_LABELS: Record<string, string> = {
  utility: '工具',
  information: '信息',
  data: '数据',
  communication: '通信',
  development: '开发',
};

function Plugins() {
  const message = useMessageApi();
  const [plugins, setPlugins] = useState<Plugin[]>(builtinPlugins);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const handleTogglePlugin = (id: string, enabled: boolean) => {
    setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, enabled } : p)));
    message.success(`插件已${enabled ? '启用' : '禁用'}`);
  };

  const columns = [
    {
      title: '插件名称',
      dataIndex: 'name' as const,
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category' as const,
      key: 'category',
      render: (category: string) => (
        <Tag color={CATEGORY_COLORS[category] || 'default'}>
          {CATEGORY_LABELS[category] || category}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description' as const,
      key: 'description',
      ellipsis: true,
    },
    {
      title: '版本',
      dataIndex: 'version' as const,
      key: 'version',
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled' as const,
      key: 'enabled',
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            已启用
          </Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            已禁用
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Plugin) => (
        <Space>
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(checked) => handleTogglePlugin(record.id, checked)}
          />
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedPlugin(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'list',
            label: (
              <span>
                <ToolOutlined /> 插件列表
              </span>
            ),
            children: (
              <Card>
                <Table<Plugin>
                  columns={columns}
                  dataSource={plugins}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'categories',
            label: (
              <span>
                <ApiOutlined /> 插件分类
              </span>
            ),
            children: (
              <Card>
                <List
                  dataSource={Object.keys(CATEGORY_LABELS)}
                  renderItem={(category: string) => (
                    <List.Item
                      extra={
                        <Tag color={CATEGORY_COLORS[category]}>
                          {plugins.filter((p) => p.category === category).length} 个插件
                        </Tag>
                      }
                    >
                      <List.Item.Meta
                        title={CATEGORY_LABELS[category]}
                        description={`包含: ${plugins
                          .filter((p) => p.category === category)
                          .map((p) => p.name)
                          .join('、')}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },
          {
            key: 'about',
            label: (
              <span>
                <BulbOutlined /> 关于插件
              </span>
            ),
            children: (
              <Card>
                <Title level={5}>插件系统说明</Title>
                <Text>
                  插件系统允许扩展 AI Agent 的能力。每个插件都是一个独立的功能模块，
                  可以被智能体调用来完成特定任务。
                </Text>

                <Title level={5} style={{ marginTop: 24 }}>
                  如何创建自定义插件
                </Title>
                <List
                  bordered
                  dataSource={[
                    '实现 Plugin 接口',
                    '定义插件 Schema',
                    '注册到 PluginManager',
                    '在智能体中调用',
                  ]}
                  renderItem={(item: string, index: number) => (
                    <List.Item key={`step-${index}`}>{`${index + 1}. ${item}`}</List.Item>
                  )}
                />

                <Title level={5} style={{ marginTop: 24 }}>
                  插件参数说明
                </Title>
                <Table
                  size="small"
                  columns={[
                    { title: '参数名', dataIndex: 'name', key: 'name' },
                    { title: '类型', dataIndex: 'type', key: 'type' },
                    {
                      title: '必填',
                      dataIndex: 'required',
                      key: 'required',
                      render: (v: boolean) => (v ? '是' : '否'),
                    },
                    {
                      title: '描述',
                      dataIndex: 'description',
                      key: 'description',
                    },
                  ]}
                  dataSource={selectedPlugin?.parameters || []}
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="插件详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedPlugin && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="插件ID">{selectedPlugin.id}</Descriptions.Item>
            <Descriptions.Item label="名称">{selectedPlugin.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedPlugin.description}</Descriptions.Item>
            <Descriptions.Item label="版本">{selectedPlugin.version}</Descriptions.Item>
            <Descriptions.Item label="分类">
              <Tag color={CATEGORY_COLORS[selectedPlugin.category]}>
                {CATEGORY_LABELS[selectedPlugin.category]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedPlugin.enabled ? <Tag color="success">已启用</Tag> : <Tag>已禁用</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="参数">
              <Table
                size="small"
                columns={[
                  { title: '参数名', dataIndex: 'name', key: 'name' },
                  { title: '类型', dataIndex: 'type', key: 'type' },
                  {
                    title: '必填',
                    dataIndex: 'required',
                    key: 'required',
                    render: (v: boolean) => (v ? '是' : '否'),
                  },
                  {
                    title: '描述',
                    dataIndex: 'description',
                    key: 'description',
                  },
                ]}
                dataSource={selectedPlugin.parameters}
                pagination={false}
              />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default Plugins;
