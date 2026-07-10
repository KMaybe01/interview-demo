package knowledge

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"interview-demo/backend/internal/model"
)

type Handler struct {
	ragService       *RAGService
	chunkerManager   *ChunkerManager
	embeddingService *EmbeddingService
	vectorDB         *VectorDatabase
}

func NewHandler(
	ragService *RAGService,
	chunkerManager *ChunkerManager,
	embeddingService *EmbeddingService,
	vectorDB *VectorDatabase,
) *Handler {
	return &Handler{
		ragService:       ragService,
		chunkerManager:   chunkerManager,
		embeddingService: embeddingService,
		vectorDB:         vectorDB,
	}
}

// CreateKnowledgeBase  godoc
// @Summary     创建知识库
// @Description 创建新的知识库，同时创建对应的向量集合
// @Tags        知识库
// @Accept      json
// @Produce     json
// @Param       body body     object{name=string,description=string} true "创建请求"
// @Success     201  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /knowledge-base [post]
func (h *Handler) CreateKnowledgeBase(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	kb := h.ragService.CreateKnowledgeBase(req.Name, req.Description)

	_, err := h.vectorDB.CreateCollectionWithID(kb.ID, req.Name, 1536)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("创建向量集合失败: %v", err)})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":           kb.ID,
		"name":         kb.Name,
		"description":  kb.Description,
		"collectionId": kb.ID,
		"createdAt":    kb.CreatedAt,
	})
}

// ListKnowledgeBases  godoc
// @Summary     列出知识库
// @Description 返回所有知识库列表（含文档数、分块数）
// @Tags        知识库
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /knowledge-base [get]
func (h *Handler) ListKnowledgeBases(c *gin.Context) {
	kbs := h.ragService.ListKnowledgeBases()

	var result []gin.H
	for _, kb := range kbs {
		result = append(result, gin.H{
			"id":          kb.ID,
			"name":        kb.Name,
			"description": kb.Description,
			"docCount":    kb.DocCount,
			"chunkCount":  kb.ChunkCount,
			"createdAt":   kb.CreatedAt,
			"updatedAt":   kb.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"knowledgeBases": result,
		"count":          len(result),
	})
}

// GetKnowledgeBase  godoc
// @Summary     获取知识库详情
// @Description 获取指定知识库的详细信息，包含文档列表
// @Tags        知识库
// @Produce     json
// @Param       id path string true "知识库 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /knowledge-base/{id} [get]
func (h *Handler) KnowledgeBaseDetail(c *gin.Context) {
	id := c.Param("id")

	kb, exists := h.ragService.KnowledgeBase(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	docs := h.ragService.Documents(id)

	c.JSON(http.StatusOK, gin.H{
		"id":          kb.ID,
		"name":        kb.Name,
		"description": kb.Description,
		"docCount":    kb.DocCount,
		"chunkCount":  kb.ChunkCount,
		"documents":   docs,
		"createdAt":   kb.CreatedAt,
		"updatedAt":   kb.UpdatedAt,
	})
}

// DeleteKnowledgeBase  godoc
// @Summary     删除知识库
// @Description 删除指定知识库及其向量集合
// @Tags        知识库
// @Produce     json
// @Param       id path string true "知识库 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /knowledge-base/{id} [delete]
func (h *Handler) DeleteKnowledgeBase(c *gin.Context) {
	id := c.Param("id")

	if !h.ragService.DeleteKnowledgeBase(id) {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	h.vectorDB.DeleteCollection(id)

	c.JSON(http.StatusOK, gin.H{"message": "知识库已删除"})
}

// AddDocument  godoc
// @Summary     添加文档
// @Description 向知识库中添加文档，自动进行分块和向量化存储
// @Tags        知识库
// @Accept      json
// @Produce     json
// @Param       id   path string                          true "知识库 ID"
// @Param       body body  object{title=string,content=string,source=string,mimeType=string} true "文档内容"
// @Success     201  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     404  {object} map[string]interface{}
// @Router      /knowledge-base/{id}/document [post]
func (h *Handler) AddDocument(c *gin.Context) {
	kbID := c.Param("id")

	var req struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Source   string `json:"source"`
		MimeType string `json:"mimeType"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if _, exists := h.ragService.KnowledgeBase(kbID); !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	doc := model.Document{
		ID:      uuid.New().String(),
		Title:   req.Title,
		Content: req.Content,
		Source:  req.Source,
		Metadata: map[string]interface{}{
			"mime_type": req.MimeType,
		},
	}

	addedDoc := h.ragService.AddDocument(kbID, doc)

	chunks := h.chunkerManager.ChunkDocument(req.Content, req.MimeType)
	fmt.Printf("文档分块完成: %d 个块\n", len(chunks))

	for _, chunk := range chunks {
		result, err := h.embeddingService.EmbedText(chunk.Content)
		if err != nil {
			fmt.Printf("生成嵌入失败: %v\n", err)
			continue
		}

		err = h.vectorDB.InsertVector(kbID, result.Vector, chunk.Metadata, &model.DocumentChunk{
			ID:         fmt.Sprintf("%d", chunk.Index),
			Content:    chunk.Content,
			ChunkIndex: chunk.Index,
		})
		if err != nil {
			fmt.Printf("存储向量失败: %v\n", err)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"document": addedDoc,
		"chunks":   len(chunks),
		"message":  "文档添加成功",
	})
}

// GetDocuments  godoc
// @Summary     获取文档列表
// @Description 获取指定知识库的文档列表
// @Tags        知识库
// @Produce     json
// @Param       id path string true "知识库 ID"
// @Success     200 {object} map[string]interface{}
// @Router      /knowledge-base/{id}/document [get]
func (h *Handler) KnowledgeBaseDocuments(c *gin.Context) {
	kbID := c.Param("id")

	docs := h.ragService.Documents(kbID)

	c.JSON(http.StatusOK, gin.H{
		"documents": docs,
		"count":     len(docs),
	})
}

// DeleteDocument  godoc
// @Summary     删除文档
// @Description 从知识库中删除指定文档
// @Tags        知识库
// @Produce     json
// @Param       id    path string true "知识库 ID"
// @Param       docId path string true "文档 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /knowledge-base/{id}/document/{docId} [delete]
func (h *Handler) DeleteDocument(c *gin.Context) {
	kbID := c.Param("id")
	docID := c.Param("docId")

	if !h.ragService.DeleteDocument(kbID, docID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "文档不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "文档已删除"})
}

// BatchAddDocuments  godoc
// @Summary     批量添加文档
// @Description 向知识库中批量添加多篇文档，每篇自动分块和向量化
// @Tags        知识库
// @Accept      json
// @Produce     json
// @Param       id   path string                            true "知识库 ID"
// @Param       body body  object{documents=[]object{title=string,content=string}} true "批量文档"
// @Success     201  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     404  {object} map[string]interface{}
// @Router      /knowledge-base/{id}/documents/batch [post]
func (h *Handler) BatchAddDocuments(c *gin.Context) {
	kbID := c.Param("id")

	var req struct {
		Documents []struct {
			Title    string `json:"title" binding:"required"`
			Content  string `json:"content" binding:"required"`
			Source   string `json:"source"`
			MimeType string `json:"mimeType"`
		} `json:"documents" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if _, exists := h.ragService.KnowledgeBase(kbID); !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	var results []gin.H
	var addedCount, failedCount int

	for _, docReq := range req.Documents {
		doc := model.Document{
			ID:      uuid.New().String(),
			Title:   docReq.Title,
			Content: docReq.Content,
			Source:  docReq.Source,
			Metadata: map[string]interface{}{
				"mime_type": docReq.MimeType,
			},
		}

		addedDoc := h.ragService.AddDocument(kbID, doc)
		chunks := h.chunkerManager.ChunkDocument(docReq.Content, docReq.MimeType)

		for _, chunk := range chunks {
			result, err := h.embeddingService.EmbedText(chunk.Content)
			if err != nil {
				continue
			}
			_ = h.vectorDB.InsertVector(kbID, result.Vector, chunk.Metadata, &model.DocumentChunk{
				ID:         fmt.Sprintf("%d", chunk.Index),
				Content:    chunk.Content,
				ChunkIndex: chunk.Index,
			})
		}

		addedCount++
		results = append(results, gin.H{
			"id":      addedDoc.ID,
			"title":   addedDoc.Title,
			"chunks":  len(chunks),
			"success": true,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"total":   len(req.Documents),
		"added":   addedCount,
		"failed":  failedCount,
		"results": results,
		"message": fmt.Sprintf("成功添加 %d 篇文档", addedCount),
	})
}

// Search  godoc
// @Summary     搜索知识库
// @Description 在知识库中搜索相关文档（支持语义搜索 / 混合搜索）
// @Tags        知识库
// @Accept      json
// @Produce     json
// @Param       body body     object{query=string,knowledgeBaseId=string,topK=int,hybrid=bool} true "搜索请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Router      /knowledge-base/search [post]
func (h *Handler) Search(c *gin.Context) {
	var req struct {
		Query           string `json:"query" binding:"required"`
		KnowledgeBaseID string `json:"knowledgeBaseId"`
		TopK            int    `json:"topK"`
		Hybrid          bool   `json:"hybrid"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.TopK <= 0 {
		req.TopK = 5
	}

	var response model.SearchResponse
	if req.Hybrid {
		response = h.ragService.HybridSearch(req.Query, req.KnowledgeBaseID, req.TopK, true)
	} else {
		response = h.ragService.Search(req.Query, req.KnowledgeBaseID, req.TopK)
	}

	c.JSON(http.StatusOK, gin.H{
		"query":   req.Query,
		"results": response.Results,
		"count":   len(response.Results),
	})
}
