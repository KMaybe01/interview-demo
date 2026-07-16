import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  ScissorOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { XMarkdown } from '@ant-design/x-markdown';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageApi } from '../AIDemo.tsx';
import { knowledgeAPI } from '../services/api.ts';
import type {
  ChunkStrategy,
  ChunkStrategyType,
  Document,
  DocumentChunk,
  EmbeddingConfig,
  KnowledgeBase,
  KnowledgeSearchResult,
} from '../types/index.ts';

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
  const { token } = theme.useToken();
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

  const [kbDocs, setKbDocs] = useState<Record<string, Document[]>>({});
  const [loadingKbDocs, setLoadingKbDocs] = useState<string | null>(null);
  const [expandedKbRows, setExpandedKbRows] = useState<Set<string>>(new Set());

  const [chunkStrategy, setChunkStrategy] = useState<ChunkStrategy>({
    type: 'recursive',
    chunkSize: 512,
    overlap: 50,
  });
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig>({
    model: 'openai',
    dimension: 1536,
  });
  const [hybridSearch, setHybridSearch] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [docChunks, setDocChunks] = useState<Record<string, DocumentChunk[]>>({});
  const [loadingChunks, setLoadingChunks] = useState<string | null>(null);
  const [expandedChunkDocs, setExpandedChunkDocs] = useState<Set<string>>(new Set());

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
      setKbDocs((prev) => {
        const next = { ...prev };
        delete next[selectedKB.id];
        return next;
      });
      setExpandedKbRows((prev) => {
        const next = new Set(prev);
        next.delete(selectedKB.id);
        return next;
      });
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
        hybrid: hybridSearch,
      });
      setSearchResults(response.results || []);
    } catch {
      message.error('搜索失败');
    }
  };

  const loadConfig = useCallback(async () => {
    try {
      const config = await knowledgeAPI.getConfig();
      setChunkStrategy({
        type: config.chunkStrategy,
        chunkSize: config.chunkSize,
        overlap: config.overlap,
      });
      setEmbeddingConfig({
        model: config.embeddingModel,
        dimension: config.dimensions,
      });
    } catch {
      // 后端未启动时使用默认值
    }
  }, []);

  const handleSaveConfig = useCallback(async () => {
    setConfigSaving(true);
    try {
      const config = await knowledgeAPI.updateConfig({
        chunkStrategy: chunkStrategy.type,
        chunkSize: chunkStrategy.chunkSize,
        overlap: chunkStrategy.overlap,
        embeddingModel: embeddingConfig.model,
      });
      setChunkStrategy({
        type: config.chunkStrategy,
        chunkSize: config.chunkSize,
        overlap: config.overlap,
      });
      setEmbeddingConfig({
        model: config.embeddingModel,
        dimension: config.dimensions,
      });
      message.success('配置已保存，后续添加的文档将使用新配置');
    } catch {
      message.error('保存配置失败');
    } finally {
      setConfigSaving(false);
    }
  }, [chunkStrategy, embeddingConfig, message]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const loadChunks = useCallback(
    async (kbId: string, docId: string) => {
      if (docChunks[docId]) return;

      setLoadingChunks(docId);
      try {
        const res = await knowledgeAPI.getDocumentChunks(kbId, docId);
        setDocChunks((prev) => ({ ...prev, [docId]: res.chunks || [] }));
      } catch {
        message.error('加载分块失败');
      } finally {
        setLoadingChunks(null);
      }
    },
    [docChunks, message],
  );

  const loadDocuments = useCallback(
    async (kbId: string) => {
      if (kbDocs[kbId]) return;

      setLoadingKbDocs(kbId);
      try {
        const response = await knowledgeAPI.get(kbId);
        setKbDocs((prev) => ({ ...prev, [kbId]: response.documents || [] }));
      } catch {
        message.error('加载文档失败');
      } finally {
        setLoadingKbDocs(null);
      }
    },
    [kbDocs, message],
  );

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
                    expandedRowKeys: [...expandedKbRows],
                    onExpand: (expanded: boolean, record: KnowledgeBase) => {
                      if (expanded) {
                        loadDocuments(record.id);
                        setExpandedKbRows((prev) => new Set(prev).add(record.id));
                      } else {
                        setExpandedKbRows((prev) => {
                          const next = new Set(prev);
                          next.delete(record.id);
                          return next;
                        });
                      }
                    },
                    expandedRowRender: (record: KnowledgeBase) => (
                      <Table<Document>
                        loading={loadingKbDocs === record.id && !kbDocs[record.id]}
                        dataSource={kbDocs[record.id] || []}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 5 }}
                        locale={{ emptyText: '暂无文档，点击「添加文档」上传' }}
                        columns={[
                          {
                            title: '标题',
                            dataIndex: 'title',
                            key: 'title',
                            render: (text: string) => <Text strong>{text}</Text>,
                          },
                          {
                            title: '来源',
                            dataIndex: 'source',
                            key: 'source',
                            width: 100,
                            render: (source?: string) =>
                              source ? <Tag>{source}</Tag> : <Text type="secondary">-</Text>,
                          },
                          {
                            title: '创建时间',
                            dataIndex: 'createdAt',
                            key: 'createdAt',
                            width: 160,
                            render: (t: string) => (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(t).toLocaleString()}
                              </Text>
                            ),
                          },
                          {
                            title: '内容预览',
                            dataIndex: 'content',
                            key: 'content',
                            ellipsis: true,
                            render: (content: string) => (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {content.length > 50 ? `${content.slice(0, 50)}...` : content}
                              </Text>
                            ),
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 100,
                            render: (_: unknown, doc: Document) => {
                              const expanded = expandedChunkDocs.has(doc.id);
                              return (
                                <Button
                                  size="small"
                                  type="link"
                                  icon={<ScissorOutlined />}
                                  loading={loadingChunks === doc.id}
                                  onClick={() => {
                                    if (expanded) {
                                      setExpandedChunkDocs((prev) => {
                                        const next = new Set(prev);
                                        next.delete(doc.id);
                                        return next;
                                      });
                                    } else {
                                      loadChunks(record.id, doc.id);
                                      setExpandedChunkDocs((prev) => new Set(prev).add(doc.id));
                                    }
                                  }}
                                >
                                  {expanded ? '收起' : '查看分块'}
                                </Button>
                              );
                            },
                          },
                        ]}
                        expandable={{
                          expandedRowKeys: [...expandedChunkDocs],
                          onExpand: (expanded: boolean, doc: Document) => {
                            if (expanded) {
                              loadChunks(record.id, doc.id);
                              setExpandedChunkDocs((prev) => new Set(prev).add(doc.id));
                            } else {
                              setExpandedChunkDocs((prev) => {
                                const next = new Set(prev);
                                next.delete(doc.id);
                                return next;
                              });
                            }
                          },
                          expandedRowRender: (doc: Document) => (
                            <div>
                              <div
                                style={{
                                  marginBottom: 12,
                                  padding: 12,
                                  background: token.colorFillQuaternary,
                                  borderRadius: 6,
                                  maxHeight: 200,
                                  overflow: 'auto',
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  完整内容（{doc.content.length} 字符）
                                </Text>
                                <XMarkdown content={doc.content} openLinksInNewTab />
                              </div>
                              {loadingChunks === doc.id && !docChunks[doc.id] && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  加载分块中...
                                </Text>
                              )}
                              {docChunks[doc.id] && (
                                <>
                                  <Text strong style={{ fontSize: 13 }}>
                                    <ScissorOutlined /> 分块列表（{docChunks[doc.id].length} 个）
                                  </Text>
                                  <Collapse
                                    size="small"
                                    style={{ marginTop: 8 }}
                                    items={docChunks[doc.id].map(
                                      (chunk: DocumentChunk, i: number) => ({
                                        key: chunk.id || i,
                                        label: (
                                          <Space>
                                            <Tag color="blue">#{chunk.chunk_index + 1}</Tag>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                              {chunk.content.length} 字符
                                            </Text>
                                          </Space>
                                        ),
                                        children: (
                                          <XMarkdown content={chunk.content} openLinksInNewTab />
                                        ),
                                      }),
                                    )}
                                  />
                                </>
                              )}
                            </div>
                          ),
                        }}
                      />
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
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Space.Compact style={{ flex: 1 }}>
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
                  <Tooltip title="结合关键词和向量搜索">
                    <Select
                      value={hybridSearch ? 'hybrid' : 'vector'}
                      onChange={(v) => setHybridSearch(v === 'hybrid')}
                      size="small"
                      style={{ width: 100 }}
                      options={[
                        { value: 'vector', label: '向量搜索' },
                        { value: 'hybrid', label: '混合搜索' },
                      ]}
                    />
                  </Tooltip>
                </div>

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
          {
            key: 'config',
            label: (
              <span>
                <SettingOutlined /> 配置
              </span>
            ),
            children: (
              <div style={{ maxWidth: 600 }}>
                <Card title="分块策略" style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>分块方式</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group
                        value={chunkStrategy.type}
                        onChange={(e) =>
                          setChunkStrategy((prev) => ({
                            ...prev,
                            type: e.target.value as ChunkStrategyType,
                          }))
                        }
                        options={[
                          { value: 'fixed', label: '固定大小' },
                          { value: 'recursive', label: '递归分割' },
                          { value: 'token', label: 'Token 分割' },
                          { value: 'markdown', label: 'Markdown 分割' },
                        ]}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>分块大小: {chunkStrategy.chunkSize} 字符</Text>
                    <Slider
                      min={100}
                      max={2000}
                      step={50}
                      value={chunkStrategy.chunkSize}
                      onChange={(v) => setChunkStrategy((prev) => ({ ...prev, chunkSize: v }))}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>重叠长度: {chunkStrategy.overlap} 字符</Text>
                    <Slider
                      min={0}
                      max={200}
                      step={10}
                      value={chunkStrategy.overlap}
                      onChange={(v) => setChunkStrategy((prev) => ({ ...prev, overlap: v }))}
                    />
                  </div>
                </Card>

                <Card title="向量化配置" style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Embedding 模型（{embeddingConfig.dimension} 维）</Text>
                    <div style={{ marginTop: 8 }}>
                      <Select
                        value={embeddingConfig.model}
                        onChange={(v) => {
                          const dim = v === 'openai' ? 1536 : v === 'bge' ? 1024 : 768;
                          setEmbeddingConfig((prev) => ({ ...prev, model: v, dimension: dim }));
                        }}
                        style={{ width: '100%' }}
                        options={[
                          { value: 'openai', label: 'OpenAI (1536维)' },
                          { value: 'bge', label: 'BGE (1024维)' },
                          { value: 'local', label: 'Local (768维)' },
                        ]}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="检索设置">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Space orientation="vertical" style={{ gap: 0 }}>
                      <Text strong>混合检索</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        同时使用关键词和向量搜索，提高召回率
                      </Text>
                    </Space>
                    <Switch checked={hybridSearch} onChange={setHybridSearch} />
                  </div>
                </Card>

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={configSaving}
                  onClick={handleSaveConfig}
                  style={{ marginTop: 16 }}
                >
                  保存配置
                </Button>
              </div>
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
    </div>
  );
}

export default KnowledgeBasePage;
