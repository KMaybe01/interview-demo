package knowledge

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"interview-demo/backend/internal/models"
)

type DocLoader struct {
	ragService     *RAGService
	chunkerManager *ChunkerManager
	embeddingSvc   *EmbeddingService
	vectorDB       *VectorDatabase
}

func NewDocLoader(
	ragService *RAGService,
	chunkerManager *ChunkerManager,
	embeddingSvc *EmbeddingService,
	vectorDB *VectorDatabase,
) *DocLoader {
	return &DocLoader{
		ragService:     ragService,
		chunkerManager: chunkerManager,
		embeddingSvc:   embeddingSvc,
		vectorDB:       vectorDB,
	}
}

type LoadResult struct {
	KBName     string `json:"kbName"`
	KBID       string `json:"kbId"`
	DocCount   int    `json:"docCount"`
	ChunkCount int    `json:"chunkCount"`
}

func (l *DocLoader) LoadDocsFromDir(docsDir string) ([]LoadResult, error) {
	if _, err := os.Stat(docsDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("文档目录不存在: %s", docsDir)
	}

	entries, err := os.ReadDir(docsDir)
	if err != nil {
		return nil, fmt.Errorf("读取文档目录失败: %v", err)
	}

	var results []LoadResult
	totalDocs := 0
	totalChunks := 0

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		dirPath := filepath.Join(docsDir, entry.Name())
		result, err := l.loadDirAsKB(dirPath, entry.Name())
		if err != nil {
			fmt.Printf("⚠️  加载目录 %s 失败: %v\n", entry.Name(), err)
			continue
		}
		results = append(results, *result)
		totalDocs += result.DocCount
		totalChunks += result.ChunkCount
		fmt.Printf("📚 %s: %d 篇文档, %d 个块\n", result.KBName, result.DocCount, result.ChunkCount)
	}

	var rootFiles []string
	_ = filepath.Walk(docsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && strings.HasSuffix(strings.ToLower(info.Name()), ".md") && filepath.Dir(path) == docsDir {
			rootFiles = append(rootFiles, path)
		}
		return nil
	})

	if len(rootFiles) > 0 {
		result, err := l.loadFilesAsKB(rootFiles, docsDir, "课程文档", "全栈开发课程文档（根目录）")
		if err == nil && result != nil {
			results = append(results, *result)
			totalDocs += result.DocCount
			totalChunks += result.ChunkCount
			fmt.Printf("📚 %s: %d 篇文档, %d 个块\n", result.KBName, result.DocCount, result.ChunkCount)
		}
	}

	fmt.Printf("✅ 全部加载完成: %d 个知识库, %d 篇文档, %d 个块\n", len(results), totalDocs, totalChunks)
	return results, nil
}

func (l *DocLoader) loadDirAsKB(dirPath, dirName string) (*LoadResult, error) {
	var mdFiles []string
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && strings.HasSuffix(strings.ToLower(info.Name()), ".md") {
			mdFiles = append(mdFiles, path)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("遍历目录失败: %v", err)
	}

	if len(mdFiles) == 0 {
		return &LoadResult{KBName: dirName, DocCount: 0, ChunkCount: 0}, nil
	}

	return l.loadFilesAsKB(mdFiles, dirPath, dirName, fmt.Sprintf("课程文档 - %s", dirName))
}

func (l *DocLoader) loadFilesAsKB(mdFiles []string, basePath, kbName, kbDesc string) (*LoadResult, error) {
	existingKBs := l.ragService.ListKnowledgeBases()
	var kb models.KnowledgeBase
	for _, existing := range existingKBs {
		if existing.Name == kbName {
			kb = existing
			break
		}
	}

	if kb.ID == "" {
		kb = l.ragService.CreateKnowledgeBase(kbName, kbDesc)
		_, err := l.vectorDB.CreateCollectionWithID(kb.ID, kbName, 1536)
		if err != nil {
			return nil, fmt.Errorf("创建向量集合失败: %v", err)
		}
		fmt.Printf("📚 创建知识库: %s (ID: %s)\n", kbName, kb.ID)
	}

	totalChunks := 0

	for _, filePath := range mdFiles {
		content, err := os.ReadFile(filePath)
		if err != nil {
			fmt.Printf("⚠️  读取文件失败: %s, 错误: %v\n", filePath, err)
			continue
		}

		relPath, _ := filepath.Rel(basePath, filePath)
		title := strings.TrimSuffix(relPath, ".md")
		title = strings.ReplaceAll(title, "\\", "/")

		mimeType := "text/markdown"

		doc := models.Document{
			ID:      uuid.New().String(),
			Title:   title,
			Content: string(content),
			Source:  "docs/" + relPath,
			Metadata: map[string]interface{}{
				"mime_type": mimeType,
				"file_path": filePath,
			},
		}

		l.ragService.AddDocument(kb.ID, doc)

		chunks := l.chunkerManager.ChunkDocument(string(content), mimeType)
		for _, chunk := range chunks {
			result, err := l.embeddingSvc.EmbedText(chunk.Content)
			if err != nil {
				fmt.Printf("⚠️  生成嵌入失败 [%s]: %v\n", title, err)
				continue
			}
			_ = l.vectorDB.InsertVector(kb.ID, result.Vector, chunk.Metadata, &models.DocumentChunk{
				ID:         fmt.Sprintf("%d", chunk.Index),
				Content:    chunk.Content,
				ChunkIndex: chunk.Index,
			})
		}

		totalChunks += len(chunks)
		fmt.Printf("  📄 %s (%d 块)\n", title, len(chunks))
	}

	return &LoadResult{
		KBName:     kbName,
		KBID:       kb.ID,
		DocCount:   len(mdFiles),
		ChunkCount: totalChunks,
	}, nil
}
