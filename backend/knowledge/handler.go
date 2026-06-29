package knowledge

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"interview-demo/backend/models"
)

type KnowledgeHandler struct {
	ragService       *RAGService
	chunkerManager   *ChunkerManager
	embeddingService *EmbeddingService
	vectorDB         *VectorDatabase
}

func NewKnowledgeHandler(
	ragService *RAGService,
	chunkerManager *ChunkerManager,
	embeddingService *EmbeddingService,
	vectorDB *VectorDatabase,
) *KnowledgeHandler {
	return &KnowledgeHandler{
		ragService:       ragService,
		chunkerManager:   chunkerManager,
		embeddingService: embeddingService,
		vectorDB:         vectorDB,
	}
}

func (h *KnowledgeHandler) CreateKnowledgeBase(c *gin.Context) {
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

func (h *KnowledgeHandler) ListKnowledgeBases(c *gin.Context) {
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

func (h *KnowledgeHandler) GetKnowledgeBase(c *gin.Context) {
	id := c.Param("id")

	kb, exists := h.ragService.GetKnowledgeBase(id)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	docs := h.ragService.GetDocuments(id)

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

func (h *KnowledgeHandler) DeleteKnowledgeBase(c *gin.Context) {
	id := c.Param("id")

	if !h.ragService.DeleteKnowledgeBase(id) {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	h.vectorDB.DeleteCollection(id)

	c.JSON(http.StatusOK, gin.H{"message": "知识库已删除"})
}

func (h *KnowledgeHandler) AddDocument(c *gin.Context) {
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

	if _, exists := h.ragService.GetKnowledgeBase(kbID); !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	doc := models.Document{
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

		err = h.vectorDB.InsertVector(kbID, result.Vector, chunk.Metadata, &models.DocumentChunk{
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

func (h *KnowledgeHandler) GetDocuments(c *gin.Context) {
	kbID := c.Param("id")

	docs := h.ragService.GetDocuments(kbID)

	c.JSON(http.StatusOK, gin.H{
		"documents": docs,
		"count":     len(docs),
	})
}

func (h *KnowledgeHandler) DeleteDocument(c *gin.Context) {
	kbID := c.Param("id")
	docID := c.Param("docId")

	if !h.ragService.DeleteDocument(kbID, docID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "文档不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "文档已删除"})
}

func (h *KnowledgeHandler) BatchAddDocuments(c *gin.Context) {
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

	if _, exists := h.ragService.GetKnowledgeBase(kbID); !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "知识库不存在"})
		return
	}

	var results []gin.H
	var addedCount, failedCount int

	for _, docReq := range req.Documents {
		doc := models.Document{
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
			_ = h.vectorDB.InsertVector(kbID, result.Vector, chunk.Metadata, &models.DocumentChunk{
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

func (h *KnowledgeHandler) Search(c *gin.Context) {
	var req struct {
		Query           string `json:"query" binding:"required"`
		KnowledgeBaseID string `json:"knowledgeBaseId"`
		TopK            int    `json:"topK"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.TopK <= 0 {
		req.TopK = 5
	}

	response := h.ragService.Search(req.Query, req.KnowledgeBaseID, req.TopK)

	c.JSON(http.StatusOK, gin.H{
		"query":   req.Query,
		"results": response.Results,
		"count":   len(response.Results),
	})
}
