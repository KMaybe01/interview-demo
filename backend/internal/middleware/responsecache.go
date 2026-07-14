package middleware

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type cachedResponse struct {
	Data      string
	Status    int
	Headers   map[string]string
	ExpiresAt time.Time
}

type ResponseCache struct {
	mu       sync.RWMutex
	items    map[string]*cachedResponse
	keys     []string
	maxSize  int
	ttl      time.Duration
}

var defaultCache *ResponseCache

func init() {
	defaultCache = NewResponseCache(200, 30*time.Second)
}

func NewResponseCache(maxSize int, ttl time.Duration) *ResponseCache {
	return &ResponseCache{
		items:   make(map[string]*cachedResponse),
		keys:    make([]string, 0, maxSize),
		maxSize: maxSize,
		ttl:     ttl,
	}
}

func cacheKey(c *gin.Context) string {
	body := ""
	if c.Request.Body != nil {
		bodyBytes, _ := io.ReadAll(c.Request.Body)
		_ = c.Request.Body.Close()
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		body = string(bodyBytes)
	}
	raw := fmt.Sprintf("%s:%s:%s", c.Request.Method, c.Request.URL.Path, body)
	hash := md5.Sum([]byte(raw))
	return hex.EncodeToString(hash[:])
}

func ResponseCacher() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodPost {
			c.Next()
			return
		}

		if strings.HasPrefix(c.Request.URL.Path, "/api/chat") ||
			strings.HasPrefix(c.Request.URL.Path, "/api/agents") {
			c.Next()
			return
		}

		key := cacheKey(c)

		defaultCache.mu.RLock()
		cached, exists := defaultCache.items[key]
		defaultCache.mu.RUnlock()

		if exists && time.Now().Before(cached.ExpiresAt) {
			for k, v := range cached.Headers {
				c.Header(k, v)
			}
			c.Data(cached.Status, "application/json; charset=utf-8", []byte(cached.Data))
			c.Abort()
			return
		}

		writer := &cacheWriter{body: &strings.Builder{}, ResponseWriter: c.Writer}
		c.Writer = writer

		c.Next()

		if c.Writer.Status() == http.StatusOK {
			defaultCache.mu.Lock()
			defaultCache.items[key] = &cachedResponse{
				Data:      writer.body.String(),
				Status:    c.Writer.Status(),
				Headers:   map[string]string{},
				ExpiresAt: time.Now().Add(defaultCache.ttl),
			}
			defaultCache.keys = append(defaultCache.keys, key)
			if len(defaultCache.keys) > defaultCache.maxSize {
				delete(defaultCache.items, defaultCache.keys[0])
				defaultCache.keys = defaultCache.keys[1:]
			}
			defaultCache.mu.Unlock()
		}
	}
}

type cacheWriter struct {
	gin.ResponseWriter
	body *strings.Builder
}

func (w *cacheWriter) Write(data []byte) (int, error) {
	w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

func (w *cacheWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

func (w *cacheWriter) WriteHeaderNow() {
}

func InitCache() {
	defaultCache = NewResponseCache(200, 30*time.Second)
	_ = json.NewEncoder(nil)
}
