import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { KnowledgeService } from './knowledge.service';

@ApiTags('知识库')
@Controller('api/knowledge-base')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({ summary: '创建知识库' })
  createKnowledgeBase(@Body() body: { name: string; description: string }) {
    return this.knowledgeService.createKnowledgeBase(body.name, body.description);
  }

  @Get()
  @ApiOperation({ summary: '知识库列表' })
  listKnowledgeBases() {
    return this.knowledgeService.listKnowledgeBases();
  }

  @Get(':id')
  @ApiOperation({ summary: '知识库详情' })
  knowledgeBaseDetail(@Param('id') id: string) {
    const kb = this.knowledgeService.knowledgeBaseDetail(id);
    if (!kb) return { error: 'Knowledge base not found' };
    return kb;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除知识库' })
  deleteKnowledgeBase(@Param('id') id: string) {
    this.knowledgeService.deleteKnowledgeBase(id);
    return { ok: true };
  }

  @Post(':id/document')
  @ApiOperation({ summary: '添加文档' })
  addDocument(@Param('id') id: string, @Body() body: any) {
    return this.knowledgeService.addDocument(id, body.title, body.content, body);
  }

  @Post(':id/documents/batch')
  @ApiOperation({ summary: '批量添加文档' })
  batchAddDocuments(@Param('id') id: string, @Body() body: { documents: any[] }) {
    return this.knowledgeService.batchAddDocuments(id, body.documents);
  }

  @Get(':id/document')
  @ApiOperation({ summary: '知识库文档列表' })
  knowledgeBaseDocuments(@Param('id') id: string) {
    return this.knowledgeService.knowledgeBaseDocuments(id);
  }

  @Delete(':id/document/:docId')
  @ApiOperation({ summary: '删除文档' })
  deleteDocument(@Param('id') id: string, @Param('docId') docId: string) {
    this.knowledgeService.deleteDocument(id, docId);
    return { ok: true };
  }

  @Post('search')
  @ApiOperation({ summary: '搜索知识库' })
  search(
    @Body() body: { query: string; knowledge_base_id?: string; top_k?: number; min_score?: number },
  ) {
    return this.knowledgeService.search(
      body.knowledge_base_id || '',
      body.query,
      body.top_k || 5,
      body.min_score || 0,
    );
  }

  @Post('init-docs')
  @ApiOperation({ summary: '初始化文档' })
  initDocs(@Body() body: any) {
    return this.knowledgeService.loadDocsFromDir(body.docsDir || '../docs');
  }
}
