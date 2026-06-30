package demo

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func uploadCleanup(t *testing.T) {
	t.Helper()
	uploadSessions.Range(func(key, _ interface{}) bool {
		chunkDir := filepath.Join(uploadDir, key.(string))
		os.RemoveAll(chunkDir)
		uploadSessions.Delete(key)
		return true
	})
	mergedFiles, _ := filepath.Glob(filepath.Join(uploadDir, "upload_*_*"))
	for _, f := range mergedFiles {
		os.Remove(f)
	}
}

func uploadInit(t *testing.T, filename string) string {
	t.Helper()
	body := fmt.Sprintf(`{"filename":"%s","fileSize":100,"chunkSize":50,"totalChunks":2,"fileHash":""}`, filename)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/init",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	InitUpload(c)
	if w.Code != 200 {
		t.Fatalf("InitUpload failed: %d %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	return resp["uploadId"].(string)
}

func TestInitUpload_Success(t *testing.T) {
	uploadCleanup(t)
	uploadID := uploadInit(t, "test.txt")
	if uploadID == "" {
		t.Fatal("expected non-empty uploadId")
	}
	// Verify session was created
	val, ok := uploadSessions.Load(uploadID)
	if !ok {
		t.Fatal("upload session not created")
	}
	session := val.(*UploadSession)
	if session.Filename != "test.txt" {
		t.Fatalf("expected filename test.txt, got %s", session.Filename)
	}
}

func TestInitUpload_MissingBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/init",
		strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")
	InitUpload(c)
	if w.Code != 400 {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestGetUploadStatus_NotFound(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upload/status/nonexistent", nil)
	c.Params = gin.Params{{Key: "uploadId", Value: "nonexistent"}}

	GetUploadStatus(c)

	if w.Code != 404 {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestUploadChunk_Success(t *testing.T) {
	uploadCleanup(t)
	uploadID := uploadInit(t, "chunk_test.txt")

	var buf bytes.Buffer
	mp := multipart.NewWriter(&buf)
	mp.WriteField("uploadId", uploadID)
	mp.WriteField("chunkIndex", "0")
	mp.WriteField("hash", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
	part, _ := mp.CreateFormFile("chunk", "chunk_0")
	part.Write([]byte{})
	mp.Close()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/chunk", &buf)
	c.Request.Header.Set("Content-Type", mp.FormDataContentType())

	UploadChunk(c)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["success"].(bool) != true {
		t.Fatal("expected success=true")
	}
}

func TestUploadChunk_HashMismatch(t *testing.T) {
	uploadCleanup(t)
	uploadID := uploadInit(t, "hash_test.txt")

	var buf bytes.Buffer
	mp := multipart.NewWriter(&buf)
	mp.WriteField("uploadId", uploadID)
	mp.WriteField("chunkIndex", "0")
	mp.WriteField("hash", "0000000000000000000000000000000000000000000000000000000000000000")
	part, _ := mp.CreateFormFile("chunk", "chunk_0")
	part.Write([]byte("hello"))
	mp.Close()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/chunk", &buf)
	c.Request.Header.Set("Content-Type", mp.FormDataContentType())

	UploadChunk(c)

	if w.Code != 400 {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUploadChunk_SessionNotFound(t *testing.T) {
	var buf bytes.Buffer
	mp := multipart.NewWriter(&buf)
	mp.WriteField("uploadId", "nonexistent")
	mp.WriteField("chunkIndex", "0")
	mp.WriteField("hash", "abc")
	mp.Close()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/chunk", &buf)
	c.Request.Header.Set("Content-Type", mp.FormDataContentType())

	UploadChunk(c)

	if w.Code != 404 {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestUploadChunk_MissingHash(t *testing.T) {
	uploadCleanup(t)
	uploadID := uploadInit(t, "missing_hash.txt")

	var buf bytes.Buffer
	mp := multipart.NewWriter(&buf)
	mp.WriteField("uploadId", uploadID)
	mp.WriteField("chunkIndex", "0")
	mp.Close()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/chunk", &buf)
	c.Request.Header.Set("Content-Type", mp.FormDataContentType())

	UploadChunk(c)

	if w.Code != 400 {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCompleteUpload_Success(t *testing.T) {
	uploadCleanup(t)
	uploadID := uploadInit(t, "complete_test.txt")

	// Upload two chunks (empty data, simplified)
	for i := 0; i < 2; i++ {
		content := []byte(fmt.Sprintf("chunk-data-%d", i))
		hash := sha256Hex(content)
		var buf bytes.Buffer
		mp := multipart.NewWriter(&buf)
		mp.WriteField("uploadId", uploadID)
		mp.WriteField("chunkIndex", fmt.Sprintf("%d", i))
		mp.WriteField("hash", hash)
		part, _ := mp.CreateFormFile("chunk", fmt.Sprintf("chunk_%d", i))
		part.Write(content)
		mp.Close()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/chunk", &buf)
		c.Request.Header.Set("Content-Type", mp.FormDataContentType())
		UploadChunk(c)
		if w.Code != 200 {
			t.Fatalf("chunk %d upload failed: %d %s", i, w.Code, w.Body.String())
		}
	}

	// Complete upload
	body := fmt.Sprintf(`{"uploadId":"%s"}`, uploadID)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/complete",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CompleteUpload(c)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	readBody(t, w, &resp)
	if resp["success"].(bool) != true {
		t.Fatal("expected success=true")
	}
	if resp["integrityOK"].(bool) != true {
		t.Fatal("expected integrityOK=true")
	}
}

func TestCompleteUpload_MissingChunks(t *testing.T) {
	uploadCleanup(t)
	uploadID := uploadInit(t, "missing.txt")

	body := fmt.Sprintf(`{"uploadId":"%s"}`, uploadID)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/complete",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CompleteUpload(c)

	if w.Code != 400 {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCompleteUpload_NotFound(t *testing.T) {
	body := `{"uploadId":"nonexistent"}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/upload/complete",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CompleteUpload(c)

	if w.Code != 404 {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestListUploadSessions(t *testing.T) {
	uploadCleanup(t)
	uploadInit(t, "list_test.txt")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upload/sessions", nil)

	ListUploadSessions(c)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	sessions := resp["sessions"].([]any)
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
}

func TestListUploadSessions_Empty(t *testing.T) {
	uploadCleanup(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upload/sessions", nil)

	ListUploadSessions(c)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	readBody(t, w, &resp)
	sessions := resp["sessions"].([]any)
	if len(sessions) != 0 {
		t.Fatalf("expected 0 sessions, got %d", len(sessions))
	}
}

func TestDownloadUpload_NotFound(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/upload/download/nonexistent", nil)
	c.Params = gin.Params{{Key: "uploadId", Value: "nonexistent"}}

	DownloadUpload(c)

	if w.Code != 404 {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func sha256Hex(data []byte) string {
	h := sha256.New()
	h.Write(data)
	return fmt.Sprintf("%x", h.Sum(nil))
}
