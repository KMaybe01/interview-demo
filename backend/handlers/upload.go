package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	uploadSessions = sync.Map{}
	uploadDir      = "uploads"
)

type UploadSession struct {
	ID          string
	Filename    string
	FileSize    int64
	ChunkSize   int64
	TotalChunks int
	Received    map[int]bool
	FileHash    string
	CreatedAt   time.Time
	mu          sync.Mutex
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

	go func() {
		time.Sleep(30 * time.Minute)
		uploadSessions.Delete(id)
		os.RemoveAll(chunkDir)
	}()

	c.JSON(200, gin.H{"uploadId": id})
}

func UploadChunk(c *gin.Context) {
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

	c.JSON(200, gin.H{
		"success":    true,
		"chunkIndex": chunkIndex,
		"received":   received,
		"total":      session.TotalChunks,
	})
}

func CompleteUpload(c *gin.Context) {
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
	uploadSessions.Delete(req.UploadID)

	c.JSON(200, gin.H{
		"success":     true,
		"fileHash":    fileHash,
		"expected":    session.FileHash,
		"integrityOK": integrityOK,
		"fileSize":    session.FileSize,
		"filename":    session.Filename,
	})
}
