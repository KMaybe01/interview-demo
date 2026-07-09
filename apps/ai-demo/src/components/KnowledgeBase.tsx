import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { knowledgeAPI } from '../services/api.ts';
import type { Document, KnowledgeBase, KnowledgeSearchResult } from '../types/index.ts';

const { Text } = Typography;
const { TextArea } = Input;

interface UploadFileEntry {
  file: File;
  content: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

function KnowledgeBasePage() {
  const message = useMessageApi();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [addDocModalVisible, setAddDocModalVisible] = useState(false);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [activeTab, setActiveTab] = useState('list');

  const [uploadFiles, setUploadFiles] = useState<UploadFileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, done: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedKBDocs, setSelectedKBDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [createForm] = Form.useForm();

  const loadKnowledgeBases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await knowledgeAPI.list();
      setKnowledgeBases(response.knowledgeBases || []);
    } catch {
      message.error('加载知识库失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      await knowledgeAPI.create(values);
      message.success('知识库创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadKnowledgeBases();
    } catch {
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeAPI.delete(id);
      message.success('删除成功');
      loadKnowledgeBases();
    } catch {
      message.error('删除失败');
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadFileEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await readFileContent(file);
      newFiles.push({ file, content, status: 'pending' });
    }
    setUploadFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (!selectedKB || uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress({ total: uploadFiles.length, done: 0 });

    try {
      const documents = uploadFiles.map((f) => ({
        title: f.file.name.replace(/\.[^/.]+$/, ''),
        content: f.content,
        source: '文件上传',
        mimeType: f.file.type || 'text/markdown',
      }));

      const response = await knowledgeAPI.batchAddDocuments(selectedKB.id, documents);
      message.success(`成功上传 ${response.added} 篇文档`);
      setUploadFiles([]);
      setAddDocModalVisible(false);
      loadKnowledgeBases();
    } catch {
      message.error('批量上传失败');
    } finally {
      setUploading(false);
      setUploadProgress({ total: 0, done: 0 });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await knowledgeAPI.search({
        query: searchQuery,
        topK: 5,
      });
      setSearchResults(response.results || []);
    } catch {
      message.error('搜索失败');
    }
  };

  const viewDocuments = async (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    setLoadingDocs(true);
    setDocModalVisible(true);
    try {
      const response = await knowledgeAPI.get(kb.id);
      setSelectedKBDocs(response.documents || []);
    } catch {
      message.error('加载文档失败');
    } finally {
      setLoadingDocs(false);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name' as const,
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description' as const,
      key: 'description',
      ellipsis: true,
    },
    {
      title: '文档数',
      dataIndex: 'docCount' as const,
      key: 'docCount',
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '分块数',
      dataIndex: 'chunkCount' as const,
      key: 'chunkCount',
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt' as const,
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: KnowledgeBase) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedKB(record);
              setAddDocModalVisible(true);
            }}
          >
            添加文档
          </Button>
          <Button type="link" size="small" onClick={() => viewDocuments(record)}>
            查看文档
          </Button>
          <Popconfirm title="确定删除此知识库吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: (
              <span>
                <FolderOutlined /> 知识库列表
              </span>
            ),
            children: (
              <>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    创建知识库
                  </Button>
                  <Tooltip title="刷新列表">
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={loadKnowledgeBases}
                      loading={loading}
                    />
                  </Tooltip>
                </div>

                <Table<KnowledgeBase>
                  columns={columns}
                  dataSource={knowledgeBases}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  expandable={{
                    expandedRowRender: (record: KnowledgeBase) => (
                      <div style={{ padding: '8px 0' }}>
                        <Text type="secondary">
                          文档数: {record.docCount} | 分块数: {record.chunkCount}
                        </Text>
                        <br />
                        <Button
                          type="link"
                          size="small"
                          onClick={() => viewDocuments(record)}
                          style={{ padding: 0, marginTop: 4 }}
                        >
                          查看文档列表
                        </Button>
                      </div>
                    ),
                  }}
                />
              </>
            ),
          },
          {
            key: 'search',
            label: (
              <span>
                <SearchOutlined /> 语义搜索
              </span>
            ),
            children: (
              <Card>
                <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                  <Input
                    placeholder="输入搜索内容..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onPressEnter={handleSearch}
                  />
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    搜索
                  </Button>
                </Space.Compact>

                <List
                  dataSource={searchResults}
                  renderItem={(item: KnowledgeSearchResult) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <FileTextOutlined />
                            <Text>{item.docTitle ?? '未知文档'}</Text>
                            <Tag color="green">相似度: {(item.score * 100).toFixed(1)}%</Tag>
                          </Space>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.chunk?.content || item.content}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无搜索结果' }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="创建知识库"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
      >
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如：产品文档" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="知识库描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`添加文档到: ${selectedKB?.name || ''}`}
        open={addDocModalVisible}
        onCancel={() => {
          setAddDocModalVisible(false);
          setUploadFiles([]);
        }}
        footer={null}
        width={680}
      >
        <button
          className="upload-zone"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dt = e.dataTransfer;
            if (dt.files.length > 0) {
              const syntheticEvent = {
                target: { files: dt.files },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileSelect(syntheticEvent);
            }
          }}
        >
          <InboxOutlined style={{ fontSize: 40, color: '#667eea', marginBottom: 8 }} />
          <div>
            <Text strong style={{ fontSize: 14 }}>
              点击或拖拽文件到此处
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              支持 .md, .txt, .json, .csv 等文本文件，可多选
            </Text>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.txt,.json,.csv,.xml,.yaml,.yml,.log"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </button>

        {uploadFiles.length > 0 && (
          <>
            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text strong>已选择 {uploadFiles.length} 个文件</Text>
              <Button size="small" onClick={() => setUploadFiles([])}>
                清空
              </Button>
            </div>
            <List
              size="small"
              bordered
              style={{ marginBottom: 16, maxHeight: 280, overflowY: 'auto' }}
              dataSource={uploadFiles}
              renderItem={(item: UploadFileEntry, index: number) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeUploadFile(index)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.status === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : item.status === 'error' ? (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      ) : (
                        <FileTextOutlined style={{ color: '#667eea' }} />
                      )
                    }
                    title={<Text style={{ fontSize: 13 }}>{item.file.name}</Text>}
                    description={
                      <Space size={4}>
                        <Tag>{(item.file.size / 1024).toFixed(1)} KB</Tag>
                        <Tag color="blue">{item.content.length} 字符</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            {uploading && (
              <Progress
                percent={Math.round((uploadProgress.done / uploadProgress.total) * 100)}
                status="active"
                style={{ marginBottom: 16 }}
              />
            )}
            <Button
              type="primary"
              block
              loading={uploading}
              onClick={handleBatchUpload}
              icon={<PlusOutlined />}
            >
              {uploading
                ? `上传中 (${uploadProgress.done}/${uploadProgress.total})...`
                : `上传 ${uploadFiles.length} 篇文档`}
            </Button>
          </>
        )}
      </Modal>

      <Modal
        title={`${selectedKB?.name || ''} - 文档列表`}
        open={docModalVisible}
        onCancel={() => setDocModalVisible(false)}
        footer={null}
        width={800}
      >
        <List
          loading={loadingDocs}
          bordered
          dataSource={selectedKBDocs}
          locale={{ emptyText: '暂无文档' }}
          renderItem={(doc: Document) => (
            <List.Item>
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: 20, color: '#667eea' }} />}
                title={<Text strong>{doc.title}</Text>}
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {doc.source && <Tag style={{ marginRight: 8 }}>{doc.source}</Tag>}
                      {new Date(doc.createdAt).toLocaleString()}
                    </Text>
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        background: '#f6f8fa',
                        borderRadius: 6,
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontSize: 12,
                          fontFamily: 'monospace',
                        }}
                      >
                        {doc.content}
                      </pre>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}

export default KnowledgeBasePage;
