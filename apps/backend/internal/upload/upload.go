package upload

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	uploadSessions = sync.Map{}
	uploadDir      = "uploads"
	sessionsFile   = "uploads/sessions.json"
	cleanupOnce    sync.Once
	uploadInitOnce sync.Once
)

func ensureUploadInit() {
	uploadInitOnce.Do(func() {
		os.MkdirAll(uploadDir, 0755)
		loadSessions()
		startCleanup()
	})
}

type UploadSession struct {
	mu          sync.Mutex
	ID          string       `json:"id"`
	Filename    string       `json:"filename"`
	FileSize    int64        `json:"fileSize"`
	ChunkSize   int64        `json:"chunkSize"`
	TotalChunks int          `json:"totalChunks"`
	Received    map[int]bool `json:"received"`
	FileHash    string       `json:"fileHash"`
	CreatedAt   time.Time    `json:"createdAt"`
}

type sessionSnapshot struct {
	ID          string       `json:"id"`
	Filename    string       `json:"filename"`
	FileSize    int64        `json:"fileSize"`
	ChunkSize   int64        `json:"chunkSize"`
	TotalChunks int          `json:"totalChunks"`
	Received    map[int]bool `json:"received"`
	FileHash    string       `json:"fileHash"`
	CreatedAt   time.Time    `json:"createdAt"`
}

func saveSessions() {
	snapshots := make(map[string]*sessionSnapshot)
	uploadSessions.Range(func(key, val interface{}) bool {
		session := val.(*UploadSession)
		session.mu.Lock()
		recv := make(map[int]bool, len(session.Received))
		for k, v := range session.Received {
			recv[k] = v
		}
		snapshots[key.(string)] = &sessionSnapshot{
			ID:          session.ID,
			Filename:    session.Filename,
			FileSize:    session.FileSize,
			ChunkSize:   session.ChunkSize,
			TotalChunks: session.TotalChunks,
			Received:    recv,
			FileHash:    session.FileHash,
			CreatedAt:   session.CreatedAt,
		}
		session.mu.Unlock()
		return true
	})
	raw, err := json.Marshal(snapshots)
	if err != nil {
		return
	}
	if err := os.WriteFile(sessionsFile, raw, 0644); err != nil {
		log.Printf("save sessions: %v", err)
	}
}

func loadSessions() {
	raw, err := os.ReadFile(sessionsFile)
	if err != nil {
		return
	}
	var data map[string]*UploadSession
	if err := json.Unmarshal(raw, &data); err != nil {
		return
	}
	for k, v := range data {
		uploadSessions.Store(k, v)
	}
}

func startCleanup() {
	cleanupOnce.Do(func() {
		go func() {
			for {
				time.Sleep(10 * time.Minute)
				now := time.Now()
				uploadSessions.Range(func(key, val interface{}) bool {
					session := val.(*UploadSession)
					if now.After(session.CreatedAt.Add(30 * time.Minute)) {
						chunkDir := filepath.Join(uploadDir, session.ID)
						os.RemoveAll(chunkDir)
						uploadSessions.Delete(key)
					}
					return true
				})
				saveSessions()
			}
		}()
	})
}

type InitUploadRequest struct {
	Filename    string `json:"filename" binding:"required"`
	FileSize    int64  `json:"fileSize" binding:"required"`
	ChunkSize   int64  `json:"chunkSize" binding:"required"`
	TotalChunks int    `json:"totalChunks" binding:"required"`
	FileHash    string `json:"fileHash"`
}

type CompleteUploadRequest struct {
	UploadID string `json:"uploadId" binding:"required"`
}

// InitUpload  godoc
// @Summary     初始化分片上传
// @Description 创建新的分片上传会话，返回 uploadId 用于后续分片上传
// @Tags        演示
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       body body     InitUploadRequest true "初始化请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /upload/init [post]
func InitUpload(c *gin.Context) {
	ensureUploadInit()
	var req InitUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := fmt.Sprintf("upload_%d", time.Now().UnixNano())
	session := &UploadSession{
		ID:          id,
		Filename:    req.Filename,
		FileSize:    req.FileSize,
		ChunkSize:   req.ChunkSize,
		TotalChunks: req.TotalChunks,
		Received:    make(map[int]bool),
		FileHash:    req.FileHash,
		CreatedAt:   time.Now(),
	}

	chunkDir := filepath.Join(uploadDir, id)
	if err := os.MkdirAll(chunkDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create chunk directory"})
		return
	}

	uploadSessions.Store(id, session)
	saveSessions()

	c.JSON(http.StatusOK, gin.H{"uploadId": id})
}

// GetUploadStatus  godoc
// @Summary     查询上传状态
// @Description 查询指定上传会话的进度和已接收分片列表
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Param       uploadId path string true "上传会话 ID"
// @Success     200 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Router      /upload/status/{uploadId} [get]
func UploadStatus(c *gin.Context) {
	ensureUploadInit()
	uploadID := c.Param("uploadId")
	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "upload session not found"})
		return
	}
	session := val.(*UploadSession)
	session.mu.Lock()
	received := make([]int, 0, len(session.Received))
	for i := 0; i < session.TotalChunks; i++ {
		if session.Received[i] {
			received = append(received, i)
		}
	}
	session.mu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"uploadId":      session.ID,
		"filename":      session.Filename,
		"fileSize":      session.FileSize,
		"chunkSize":     session.ChunkSize,
		"totalChunks":   session.TotalChunks,
		"received":      received,
		"receivedCount": len(received),
		"fileHash":      session.FileHash,
		"createdAt":     session.CreatedAt,
	})
}

func sanitizeFilename(name string) string {
	cleaned := filepath.Base(name)
	if cleaned == "." || cleaned == "/" {
		return "unnamed_file"
	}
	return cleaned
}

// DownloadUpload  godoc
// @Summary     下载已上传文件
// @Description 根据 uploadId 下载已合并的完整文件
// @Tags        演示
// @Produce     application/octet-stream
// @Param       uploadId path string true "上传会话 ID"
// @Success     200
// @Failure     404 {object} map[string]interface{}
// @Router      /upload/download/{uploadId} [get]
func DownloadUpload(c *gin.Context) {
	ensureUploadInit()
	uploadID := c.Param("uploadId")
	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "upload session not found"})
		return
	}
	session := val.(*UploadSession)
	safeName := sanitizeFilename(session.Filename)
	if safeName == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "filename not found"})
		return
	}

	filePath := filepath.Join(uploadDir, fmt.Sprintf("%s_%s", uploadID, safeName))
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safeName))
	c.Header("Content-Type", "application/octet-stream")
	c.File(filePath)
}

// ListUploadSessions  godoc
// @Summary     列出上传会话
// @Description 返回当前所有活跃的上传会话列表
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Success     200 {object} map[string]interface{}
// @Router      /upload/sessions [get]
func ListUploadSessions(c *gin.Context) {
	ensureUploadInit()
	var sessions []map[string]interface{}
	uploadSessions.Range(func(key, val interface{}) bool {
		session := val.(*UploadSession)
		session.mu.Lock()
		sessions = append(sessions, map[string]interface{}{
			"uploadId":      session.ID,
			"filename":      session.Filename,
			"fileSize":      session.FileSize,
			"totalChunks":   session.TotalChunks,
			"receivedCount": len(session.Received),
			"createdAt":     session.CreatedAt,
		})
		session.mu.Unlock()
		return true
	})
	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// UploadChunk  godoc
// @Summary     上传分片
// @Description 上传单个文件分片（multipart/form-data），含 SHA256 哈希校验
// @Tags        演示
// @Accept      multipart/form-data
// @Produce     json
// @Security    Bearer
// @Param       uploadId   formData string true "上传会话 ID"
// @Param       chunkIndex formData int    true "分片索引"
// @Param       hash      formData string true "分片 SHA256 哈希"
// @Param       chunk     formData file   true "分片文件内容"
// @Success     200 {object} map[string]interface{}
// @Failure     400 {object} map[string]interface{}
// @Failure     404 {object} map[string]interface{}
// @Failure     500 {object} map[string]interface{}
// @Router      /upload/chunk [post]
func UploadChunk(c *gin.Context) {
	ensureUploadInit()
	uploadID := c.PostForm("uploadId")
	chunkIndexStr := c.PostForm("chunkIndex")
	hash := c.PostForm("hash")

	var chunkIndex int
	if _, err := fmt.Sscanf(chunkIndexStr, "%d", &chunkIndex); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chunk index"})
		return
	}

	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "upload session not found"})
		return
	}
	session := val.(*UploadSession)

	if hash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing hash"})
		return
	}

	file, _, err := c.Request.FormFile("chunk")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing chunk file"})
		return
	}
	defer file.Close()

	chunkData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read chunk"})
		return
	}

	serverHash := sha256.Sum256(chunkData)
	serverHashStr := hex.EncodeToString(serverHash[:])
	if serverHashStr != hash {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":      "hash mismatch",
			"expected":   hash,
			"computed":   serverHashStr,
			"chunkIndex": chunkIndex,
		})
		return
	}

	chunkPath := filepath.Join(uploadDir, uploadID, fmt.Sprintf("chunk_%d", chunkIndex))
	if err := os.WriteFile(chunkPath, chunkData, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save chunk"})
		return
	}

	session.mu.Lock()
	session.Received[chunkIndex] = true
	received := len(session.Received)
	session.mu.Unlock()
	saveSessions()

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"chunkIndex": chunkIndex,
		"received":   received,
		"total":      session.TotalChunks,
	})
}

// CompleteUpload  godoc
// @Summary     完成分片上传
// @Description 合并所有已上传分片为完整文件，验证文件完整性
// @Tags        演示
// @Accept      json
// @Produce     json
// @Security    Bearer
// @Param       body body     CompleteUploadRequest true "完成请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     404  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /upload/complete [post]
func CompleteUpload(c *gin.Context) {
	ensureUploadInit()
	var req CompleteUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	val, ok := uploadSessions.Load(req.UploadID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "upload session not found"})
		return
	}
	session := val.(*UploadSession)
	session.mu.Lock()
	receivedCount := len(session.Received)
	if receivedCount != session.TotalChunks {
		missing := make([]int, 0, session.TotalChunks-receivedCount)
		for i := 0; i < session.TotalChunks; i++ {
			if !session.Received[i] {
				missing = append(missing, i)
			}
		}
		session.mu.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "not all chunks received",
			"missing": missing,
		})
		return
	}
	session.mu.Unlock()

	chunkDir := filepath.Join(uploadDir, req.UploadID)
	outputName := fmt.Sprintf("%s_%s", req.UploadID, session.Filename)
	outputPath := filepath.Join(uploadDir, outputName)

	outFile, err := os.Create(outputPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create output file"})
		return
	}

	hasher := sha256.New()
	multiWriter := io.MultiWriter(outFile, hasher)

	for i := 0; i < session.TotalChunks; i++ {
		chunkPath := filepath.Join(chunkDir, fmt.Sprintf("chunk_%d", i))
		chunkData, err := os.ReadFile(chunkPath)
		if err != nil {
			outFile.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read chunk %d", i)})
			return
		}
		if _, err := multiWriter.Write(chunkData); err != nil {
			outFile.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write merged data"})
			return
		}
	}
	outFile.Close()

	fileHash := hex.EncodeToString(hasher.Sum(nil))
	integrityOK := session.FileHash == "" || session.FileHash == fileHash

	os.RemoveAll(chunkDir)
	saveSessions()

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"fileHash":    fileHash,
		"expected":    session.FileHash,
		"integrityOK": integrityOK,
		"fileSize":    session.FileSize,
		"filename":    session.Filename,
	})
}
