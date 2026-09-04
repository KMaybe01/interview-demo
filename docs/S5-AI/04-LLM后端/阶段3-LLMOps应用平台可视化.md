# 🖥️ 阶段3：LLMOps应用平台可视化 - 详细教程

> 🎯 **学习目标**：构建完整的 LLMOps 可视化平台（Go Gin + React + TypeScript）

---

## 📋 目录

1. [插件系统架构](#1-插件系统架构)
2. [知识库模块开发](#2-知识库模块开发)
3. [流式响应实现](#3-流式响应实现)
4. [JWT 授权认证](#4-jwt-授权认证)
5. [开放 API 设计](#5-开放-api-设计)

---

## 1. 插件系统架构

### 1.1 插件接口定义

```go
// internal/plugins/plugin.go
package plugins

import "context"

// Plugin 插件接口
type Plugin interface {
    Execute(ctx context.Context, params map[string]interface{}) (interface{}, error)
    GetSchema() PluginSchema
    ValidateInput(params map[string]interface{}) error
}

// PluginSchema 插件 schema
type PluginSchema struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Parameters  map[string]interface{} `json:"parameters"`
}

// PluginManager 插件管理器
type PluginManager struct {
    plugins map[string]Plugin
}

func NewPluginManager() *PluginManager {
    return &PluginManager{
        plugins: make(map[string]Plugin),
    }
}

// Register 注册插件
func (m *PluginManager) Register(name string, plugin Plugin) {
    m.plugins[name] = plugin
}

// Get 获取插件
func (m *PluginManager) Get(name string) (Plugin, bool) {
    plugin, exists := m.plugins[name]
    return plugin, exists
}

// List 列出所有插件
func (m *PluginManager) List() []PluginSchema {
    var schemas []PluginSchema
    for _, plugin := range m.plugins {
        schemas = append(schemas, plugin.GetSchema())
    }
    return schemas
}

// Execute 执行插件
func (m *PluginManager) Execute(ctx context.Context, name string, params map[string]interface{}) (interface{}, error) {
    plugin, exists := m.Get(name)
    if !exists {
        return nil, fmt.Errorf("插件 %s 不存在", name)
    }

    if err := plugin.ValidateInput(params); err != nil {
        return nil, err
    }

    return plugin.Execute(ctx, params)
}
```

### 1.2 内置插件实现

```go
// internal/plugins/weather.go
package plugins

import (
    "context"
    "fmt"
)

type WeatherPlugin struct{}

func NewWeatherPlugin() *WeatherPlugin {
    return &WeatherPlugin{}
}

func (p *WeatherPlugin) Execute(ctx context.Context, params map[string]interface{}) (interface{}, error) {
    city, ok := params["city"].(string)
    if !ok {
        return nil, fmt.Errorf("缺少 city 参数")
    }

    weatherData := map[string]map[string]string{
        "北京": {"temp": "22°C", "condition": "晴朗", "humidity": "45%"},
        "上海": {"temp": "25°C", "condition": "多云", "humidity": "60%"},
        "广州": {"temp": "28°C", "condition": "小雨", "humidity": "75%"},
    }

    if data, ok := weatherData[city]; ok {
        return data, nil
    }

    return map[string]string{"temp": "未知", "condition": "未知"}, nil
}

func (p *WeatherPlugin) GetSchema() PluginSchema {
    return PluginSchema{
        Name:        "weather",
        Description: "获取指定城市的天气信息",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "city": map[string]interface{}{
                    "type":        "string",
                    "description": "城市名称",
                },
            },
            "required": []string{"city"},
        },
    }
}

func (p *WeatherPlugin) ValidateInput(params map[string]interface{}) error {
    if _, ok := params["city"]; !ok {
        return fmt.Errorf("缺少 city 参数")
    }
    return nil
}
```

```go
// internal/plugins/search.go
package plugins

import (
    "context"
    "fmt"
)

type SearchPlugin struct{}

func NewSearchPlugin() *SearchPlugin {
    return &SearchPlugin{}
}

func (p *SearchPlugin) Execute(ctx context.Context, params map[string]interface{}) (interface{}, error) {
    query, ok := params["query"].(string)
    if !ok {
        return nil, fmt.Errorf("缺少 query 参数")
    }

    return map[string]interface{}{
        "results": []map[string]string{
            {"title": fmt.Sprintf("关于'%s'的结果1", query), "url": "https://example.com/1"},
            {"title": fmt.Sprintf("关于'%s'的结果2", query), "url": "https://example.com/2"},
        },
    }, nil
}

func (p *SearchPlugin) GetSchema() PluginSchema {
    return PluginSchema{
        Name:        "search",
        Description: "搜索网络信息",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "query": map[string]interface{}{
                    "type":        "string",
                    "description": "搜索查询",
                },
            },
            "required": []string{"query"},
        },
    }
}

func (p *SearchPlugin) ValidateInput(params map[string]interface{}) error {
    if _, ok := params["query"]; !ok {
        return fmt.Errorf("缺少 query 参数")
    }
    return nil
}
```

### 1.3 插件处理器

```go
// internal/handlers/plugins.go
package handlers

import (
    "net/http"

    "github.com/ai-agent-backend/internal/plugins"
    "github.com/ai-agent-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

var pluginManager = plugins.NewPluginManager()

func InitPlugins() {
    pluginManager.Register("weather", plugins.NewWeatherPlugin())
    pluginManager.Register("search", plugins.NewSearchPlugin())
}

func ListPlugins(c *gin.Context) {
    schemas := pluginManager.List()
    utils.SuccessResponse(c, schemas, "success")
}

type ExecutePluginRequest struct {
    Name   string                 `json:"name" binding:"required"`
    Params map[string]interface{} `json:"params"`
}

func ExecutePlugin(c *gin.Context) {
    var req ExecutePluginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, "请提供插件名称", http.StatusBadRequest)
        return
    }

    result, err := pluginManager.Execute(c.Request.Context(), req.Name, req.Params)
    if err != nil {
        utils.ErrorResponse(c, "插件执行失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    utils.SuccessResponse(c, result, "success")
}
```

---

## 2. 知识库模块开发

### 2.1 知识库管理器

```go
// internal/services/knowledge_base.go
package services

import (
    "sync"
    "time"

    "github.com/google/uuid"
)

type KnowledgeBase struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    DocCount    int       `json:"doc_count"`
    ChunkCount  int       `json:"chunk_count"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type Document struct {
    ID          string                 `json:"id"`
    KBID        string                 `json:"kb_id"`
    Title       string                 `json:"title"`
    Content     string                 `json:"content"`
    Source      string                 `json:"source"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
    CreatedAt   time.Time              `json:"created_at"`
}

type KnowledgeBaseManager struct {
    kb      map[string]*KnowledgeBase
    docs    map[string][]Document
    chunks  map[string][]DocumentChunk
    mu      sync.RWMutex
}

func NewKnowledgeBaseManager() *KnowledgeBaseManager {
    return &KnowledgeBaseManager{
        kb:     make(map[string]*KnowledgeBase),
        docs:   make(map[string][]Document),
        chunks: make(map[string][]DocumentChunk),
    }
}

func (m *KnowledgeBaseManager) Create(name, description string) *KnowledgeBase {
    m.mu.Lock()
    defer m.mu.Unlock()

    kb := &KnowledgeBase{
        ID:          uuid.New().String(),
        Name:        name,
        Description: description,
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    m.kb[kb.ID] = kb
    m.docs[kb.ID] = []Document{}
    m.chunks[kb.ID] = []DocumentChunk{}

    return kb
}

func (m *KnowledgeBaseManager) Get(id string) (*KnowledgeBase, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    kb, exists := m.kb[id]
    return kb, exists
}

func (m *KnowledgeBaseManager) List() []*KnowledgeBase {
    m.mu.RLock()
    defer m.mu.RUnlock()

    var result []*KnowledgeBase
    for _, kb := range m.kb {
        result = append(result, kb)
    }
    return result
}

func (m *KnowledgeBaseManager) Delete(id string) bool {
    m.mu.Lock()
    defer m.mu.Unlock()

    if _, exists := m.kb[id]; !exists {
        return false
    }

    delete(m.kb, id)
    delete(m.docs, id)
    delete(m.chunks, id)
    return true
}

func (m *KnowledgeBaseManager) AddDocument(kbID, title, content, source string) *Document {
    m.mu.Lock()
    defer m.mu.Unlock()

    doc := &Document{
        ID:        uuid.New().String(),
        KBID:      kbID,
        Title:     title,
        Content:   content,
        Source:    source,
        CreatedAt: time.Now(),
    }

    m.docs[kbID] = append(m.docs[kbID], *doc)

    // 分块
    chunks := m.chunkDocument(doc)
    m.chunks[kbID] = append(m.chunks[kbID], chunks...)

    // 更新统计
    if kb, exists := m.kb[kbID]; exists {
        kb.DocCount++
        kb.ChunkCount += len(chunks)
        kb.UpdatedAt = time.Now()
    }

    return doc
}

func (m *KnowledgeBaseManager) chunkDocument(doc *Document) []DocumentChunk {
    var chunks []DocumentChunk
    content := doc.Content
    chunkSize := 500
    overlap := 50

    for i := 0; i < len(content); i += chunkSize - overlap {
        end := i + chunkSize
        if end > len(content) {
            end = len(content)
        }

        chunk := DocumentChunk{
            ID:         uuid.New().String(),
            DocumentID: doc.ID,
            Content:    content[i:end],
            ChunkIndex: len(chunks),
        }

        chunks = append(chunks, chunk)

        if end == len(content) {
            break
        }
    }

    return chunks
}
```

### 2.2 知识库处理器

```go
// internal/handlers/knowledge_base.go
package handlers

import (
    "net/http"

    "github.com/ai-agent-backend/internal/services"
    "github.com/ai-agent-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

var kbManager = services.NewKnowledgeBaseManager()

type CreateKBRequest struct {
    Name        string `json:"name" binding:"required"`
    Description string `json:"description"`
}

func CreateKnowledgeBase(c *gin.Context) {
    var req CreateKBRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, "请提供知识库名称", http.StatusBadRequest)
        return
    }

    kb := kbManager.Create(req.Name, req.Description)
    utils.CreatedResponse(c, kb, "知识库创建成功")
}

func ListKnowledgeBases(c *gin.Context) {
    kbs := kbManager.List()
    utils.SuccessResponse(c, kbs, "success")
}

func GetKnowledgeBase(c *gin.Context) {
    id := c.Param("id")
    kb, exists := kbManager.Get(id)
    if !exists {
        utils.ErrorResponse(c, "知识库不存在", http.StatusNotFound)
        return
    }
    utils.SuccessResponse(c, kb, "success")
}

func DeleteKnowledgeBase(c *gin.Context) {
    id := c.Param("id")
    if !kbManager.Delete(id) {
        utils.ErrorResponse(c, "知识库不存在", http.StatusNotFound)
        return
    }
    utils.SuccessResponse(c, nil, "删除成功")
}

type AddDocRequest struct {
    Title   string `json:"title" binding:"required"`
    Content string `json:"content" binding:"required"`
    Source  string `json:"source"`
}

func AddDocument(c *gin.Context) {
    kbID := c.Param("id")

    var req AddDocRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, "请提供文档标题和内容", http.StatusBadRequest)
        return
    }

    doc := kbManager.AddDocument(kbID, req.Title, req.Content, req.Source)
    utils.CreatedResponse(c, doc, "文档添加成功")
}
```

---

## 3. 流式响应实现

### 3.1 SSE 流式响应

```go
// internal/handlers/stream.go
package handlers

import (
    "fmt"
    "net/http"

    "github.com/ai-agent-backend/internal/services"
    "github.com/ai-agent-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

var llmService *services.LLMService

func InitLLMService(apiKey string) {
    llmService = services.NewLLMService(apiKey)
}

func ChatStream(c *gin.Context) {
    var req struct {
        Messages []models.Message `json:"messages" binding:"required"`
        Model    string           `json:"model"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, "请提供消息", http.StatusBadRequest)
        return
    }

    // 设置 SSE 头
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")
    c.Header("Access-Control-Allow-Origin", "*")

    // 创建流式请求
    stream, err := llmService.ChatStream(c.Request.Context(), req.Messages, req.Model)
    if err != nil {
        utils.ErrorResponse(c, "创建流失败: "+err.Error(), http.StatusInternalServerError)
        return
    }
    defer stream.Close()

    // 读取流式响应
    ch := make(chan models.StreamChunk)
    go services.ReadStream(stream, ch)

    for chunk := range ch {
        if chunk.Done {
            fmt.Fprintf(c.Writer, "data: [DONE]\n\n")
            c.Writer.Flush()
            return
        }
        fmt.Fprintf(c.Writer, "data: %s\n\n", chunk.Content)
        c.Writer.Flush()
    }
}
```

### 3.2 前端流式处理

```typescript
// src/services/api.ts
export const chatAPI = {
  async chatStream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onDone();
              return;
            }
            onChunk(data);
          }
        }
      }

      onDone();
    } catch (error) {
      onError(error instanceof Error ? error.message : '流式响应失败');
    }
  },
};
```

---

## 4. JWT 授权认证

### 4.1 JWT 服务

```go
// internal/services/auth.go
package services

import (
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
)

type AuthService struct {
    secret     []byte
    expireHour int
}

func NewAuthService(secret string, expireHour int) *AuthService {
    return &AuthService{
        secret:     []byte(secret),
        expireHour: expireHour,
    }
}

type Claims struct {
    UserID   string `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}

// GenerateToken 生成 JWT Token
func (s *AuthService) GenerateToken(userID, username string) (string, error) {
    claims := Claims{
        UserID:   userID,
        Username: username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.expireHour) * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "ai-agent-backend",
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(s.secret)
}

// ValidateToken 验证 JWT Token
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return s.secret, nil
    })

    if err != nil {
        return nil, err
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, errors.New("无效的 token")
    }

    return claims, nil
}

// HashPassword 哈希密码
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

// CheckPassword 验证密码
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### 4.2 认证中间件

```go
// internal/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/ai-agent-backend/internal/services"
    "github.com/ai-agent-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

var authService *services.AuthService

func InitAuthService(secret string, expireHour int) {
    authService = services.NewAuthService(secret, expireHour)
}

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取 Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            utils.ErrorResponse(c, "未提供认证信息", http.StatusUnauthorized)
            c.Abort()
            return
        }

        // 解析 Bearer token
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            utils.ErrorResponse(c, "认证格式错误", http.StatusUnauthorized)
            c.Abort()
            return
        }

        // 验证 token
        claims, err := authService.ValidateToken(parts[1])
        if err != nil {
            utils.ErrorResponse(c, "认证失败: "+err.Error(), http.StatusUnauthorized)
            c.Abort()
            return
        }

        // 将用户信息存储到上下文
        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)

        c.Next()
    }
}
```

### 4.3 登录处理器

```go
// internal/handlers/auth.go
package handlers

import (
    "net/http"

    "github.com/ai-agent-backend/internal/services"
    "github.com/ai-agent-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, "请提供用户名和密码", http.StatusBadRequest)
        return
    }

    // 这里应该查询数据库验证用户
    // 简化示例
    if req.Username != "admin" || req.Password != "123456" {
        utils.ErrorResponse(c, "用户名或密码错误", http.StatusUnauthorized)
        return
    }

    token, err := authService.GenerateToken("1", req.Username)
    if err != nil {
        utils.ErrorResponse(c, "生成 token 失败", http.StatusInternalServerError)
        return
    }

    utils.SuccessResponse(c, gin.H{
        "token":    token,
        "username": req.Username,
    }, "登录成功")
}

func GetProfile(c *gin.Context) {
    userID, _ := c.Get("user_id")
    username, _ := c.Get("username")

    utils.SuccessResponse(c, gin.H{
        "user_id":  userID,
        "username": username,
    }, "success")
}
```

---

## 5. 开放 API 设计

### 5.1 API Key 管理

```go
// internal/services/api_key.go
package services

import (
    "sync"
    "time"

    "github.com/google/uuid"
)

type APIKey struct {
    ID        string     `json:"id"`
    Name      string     `json:"name"`
    Key       string     `json:"key"`
    Status    string     `json:"status"` // "active", "inactive"
    CreatedAt time.Time  `json:"created_at"`
    LastUsed  *time.Time `json:"last_used,omitempty"`
}

type APIKeyManager struct {
    keys map[string]*APIKey
    mu   sync.RWMutex
}

func NewAPIKeyManager() *APIKeyManager {
    return &APIKeyManager{
        keys: make(map[string]*APIKey),
    }
}

func (m *APIKeyManager) Create(name string) *APIKey {
    m.mu.Lock()
    defer m.mu.Unlock()

    key := &APIKey{
        ID:        uuid.New().String(),
        Name:      name,
        Key:       "sk-" + uuid.New().String(),
        Status:    "active",
        CreatedAt: time.Now(),
    }

    m.keys[key.ID] = key
    return key
}

func (m *APIKeyManager) Validate(key string) (*APIKey, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    for _, k := range m.keys {
        if k.Key == key && k.Status == "active" {
            now := time.Now()
            k.LastUsed = &now
            return k, true
        }
    }
    return nil, false
}

func (m *APIKeyManager) Revoke(id string) bool {
    m.mu.Lock()
    defer m.mu.Unlock()

    if key, exists := m.keys[id]; exists {
        key.Status = "inactive"
        return true
    }
    return false
}

func (m *APIKeyManager) List() []*APIKey {
    m.mu.RLock()
    defer m.mu.RUnlock()

    var result []*APIKey
    for _, key := range m.keys {
        result = append(result, key)
    }
    return result
}
```

### 5.2 API Key 认证中间件

```go
// internal/middleware/api_key.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/ai-agent-backend/internal/services"
    "github.com/ai-agent-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

var apiKeyManager = services.NewAPIKeyManager()

func APIKeyMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 从 header 或 query 获取 API Key
        apiKey := c.GetHeader("X-API-Key")
        if apiKey == "" {
            apiKey = c.Query("api_key")
        }

        // 也支持 Authorization: Bearer sk-xxx 格式
        if apiKey == "" {
            authHeader := c.GetHeader("Authorization")
            if strings.HasPrefix(authHeader, "Bearer sk-") {
                apiKey = strings.TrimPrefix(authHeader, "Bearer ")
            }
        }

        if apiKey == "" {
            utils.ErrorResponse(c, "未提供 API Key", http.StatusUnauthorized)
            c.Abort()
            return
        }

        // 验证 API Key
        keyInfo, valid := apiKeyManager.Validate(apiKey)
        if !valid {
            utils.ErrorResponse(c, "无效的 API Key", http.StatusUnauthorized)
            c.Abort()
            return
        }

        c.Set("api_key_id", keyInfo.ID)
        c.Set("api_key_name", keyInfo.Name)

        c.Next()
    }
}
```

### 5.3 开放 API 路由

```go
// internal/routes/api.go
package routes

import (
    "github.com/ai-agent-backend/internal/handlers"
    "github.com/ai-agent-backend/internal/middleware"
    "github.com/gin-gonic/gin"
)

func SetupOpenAPIRoutes(api *gin.RouterGroup) {
    // 公开 API（需要 API Key 认证）
    open := api.Group("/open")
    open.Use(middleware.APIKeyMiddleware())
    {
        open.POST("/chat", handlers.Chat)
        open.POST("/chat/stream", handlers.ChatStream)
        open.GET("/models", handlers.ListModels)
    }
}
```

---

## 📝 常见问题

### Q1: JWT Token 过期

**解决方案：**
1. 实现 Token 刷新机制
2. 使用 Refresh Token
3. 前端在 token 过期前自动刷新

### Q2: API Key 安全

**解决方案：**
1. 不要在前端暴露 API Key
2. 使用 HTTPS
3. 实现请求频率限制
4. 定期轮换 API Key

### Q3: 流式响应中断

**解决方案：**
1. 添加心跳机制
2. 实现断点续传
3. 前端处理重连逻辑

---

## 🎯 实践练习

1. **实现 OAuth 2.0 认证**
2. **添加请求频率限制**
3. **实现 API 版本控制**
4. **添加 API 使用统计**

---

## 📚 下一步学习

完成阶段3后，请继续学习：
- [阶段4-8：扩展部署与实战](./阶段4-8-扩展部署与实战.md)
  - 工作流引擎
  - Docker 部署
  - 商业实战项目
