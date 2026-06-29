package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
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

func InitUpload(c *gin.Context) {
	ensureUploadInit()
	var req InitUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
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
		c.JSON(500, gin.H{"error": "Failed to create chunk directory"})
		return
	}

	uploadSessions.Store(id, session)
	saveSessions()

	c.JSON(200, gin.H{"uploadId": id})
}

func GetUploadStatus(c *gin.Context) {
	ensureUploadInit()
	uploadID := c.Param("uploadId")
	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		c.JSON(404, gin.H{"error": "Upload session not found"})
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

	c.JSON(200, gin.H{
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

func DownloadUpload(c *gin.Context) {
	ensureUploadInit()
	uploadID := c.Param("uploadId")
	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		c.JSON(404, gin.H{"error": "Upload session not found"})
		return
	}
	session := val.(*UploadSession)
	safeName := sanitizeFilename(session.Filename)
	if safeName == "" {
		c.JSON(404, gin.H{"error": "Filename not found"})
		return
	}

	filePath := filepath.Join(uploadDir, fmt.Sprintf("%s_%s", uploadID, safeName))
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(404, gin.H{"error": "File not found"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safeName))
	c.Header("Content-Type", "application/octet-stream")
	c.File(filePath)
}

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
	c.JSON(200, gin.H{"sessions": sessions})
}

func UploadChunk(c *gin.Context) {
	ensureUploadInit()
	uploadID := c.PostForm("uploadId")
	chunkIndexStr := c.PostForm("chunkIndex")
	hash := c.PostForm("hash")

	var chunkIndex int
	if _, err := fmt.Sscanf(chunkIndexStr, "%d", &chunkIndex); err != nil {
		c.JSON(400, gin.H{"error": "Invalid chunk index"})
		return
	}

	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		c.JSON(404, gin.H{"error": "Upload session not found"})
		return
	}
	session := val.(*UploadSession)

	if hash == "" {
		c.JSON(400, gin.H{"error": "Missing hash"})
		return
	}

	file, _, err := c.Request.FormFile("chunk")
	if err != nil {
		c.JSON(400, gin.H{"error": "Missing chunk file"})
		return
	}
	defer file.Close()

	chunkData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read chunk"})
		return
	}

	serverHash := sha256.Sum256(chunkData)
	serverHashStr := hex.EncodeToString(serverHash[:])
	if serverHashStr != hash {
		c.JSON(400, gin.H{
			"error":      "Hash mismatch",
			"expected":   hash,
			"computed":   serverHashStr,
			"chunkIndex": chunkIndex,
		})
		return
	}

	chunkPath := filepath.Join(uploadDir, uploadID, fmt.Sprintf("chunk_%d", chunkIndex))
	if err := os.WriteFile(chunkPath, chunkData, 0644); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save chunk"})
		return
	}

	session.mu.Lock()
	session.Received[chunkIndex] = true
	received := len(session.Received)
	session.mu.Unlock()
	saveSessions()

	c.JSON(200, gin.H{
		"success":    true,
		"chunkIndex": chunkIndex,
		"received":   received,
		"total":      session.TotalChunks,
	})
}

func CompleteUpload(c *gin.Context) {
	ensureUploadInit()
	var req CompleteUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	val, ok := uploadSessions.Load(req.UploadID)
	if !ok {
		c.JSON(404, gin.H{"error": "Upload session not found"})
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
		c.JSON(400, gin.H{
			"error":   "Not all chunks received",
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
		c.JSON(500, gin.H{"error": "Failed to create output file"})
		return
	}

	hasher := sha256.New()
	multiWriter := io.MultiWriter(outFile, hasher)

	for i := 0; i < session.TotalChunks; i++ {
		chunkPath := filepath.Join(chunkDir, fmt.Sprintf("chunk_%d", i))
		chunkData, err := os.ReadFile(chunkPath)
		if err != nil {
			outFile.Close()
			c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to read chunk %d", i)})
			return
		}
		if _, err := multiWriter.Write(chunkData); err != nil {
			outFile.Close()
			c.JSON(500, gin.H{"error": "Failed to write merged data"})
			return
		}
	}
	outFile.Close()

	fileHash := hex.EncodeToString(hasher.Sum(nil))
	integrityOK := session.FileHash == "" || session.FileHash == fileHash

	os.RemoveAll(chunkDir)
	saveSessions()

	c.JSON(200, gin.H{
		"success":     true,
		"fileHash":    fileHash,
		"expected":    session.FileHash,
		"integrityOK": integrityOK,
		"fileSize":    session.FileSize,
		"filename":    session.Filename,
	})
}
