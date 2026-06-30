package auth

import (
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Public router registrations — main.go binds these.
// Login, RefreshToken, CheckToken, GetUsedTokenCount, AuthMiddleware.

func getEnvDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

type tokenStore struct {
	mu    sync.RWMutex
	m     map[string]time.Time
	limit int
}

func newTokenStore(limit int) *tokenStore {
	s := &tokenStore{
		m:     make(map[string]time.Time),
		limit: limit,
	}
	go s.cleanup()
	return s
}

func (s *tokenStore) cleanup() {
	for {
		time.Sleep(30 * time.Minute)
		s.mu.Lock()
		for k, v := range s.m {
			if time.Since(v) > 1*time.Hour {
				delete(s.m, k)
			}
		}
		s.mu.Unlock()
	}
}

func (s *tokenStore) MarkUsed(token string) {
	s.mu.Lock()
	s.m[token] = time.Now()
	if len(s.m) > s.limit {
		for k, v := range s.m {
			if time.Since(v) > 10*time.Minute {
				delete(s.m, k)
			}
			if len(s.m) <= s.limit/2 {
				break
			}
		}
	}
	s.mu.Unlock()
}

func (s *tokenStore) IsUsed(token string) bool {
	s.mu.RLock()
	_, used := s.m[token]
	s.mu.RUnlock()
	return used
}

func (s *tokenStore) Count() int {
	s.mu.RLock()
	count := len(s.m)
	s.mu.RUnlock()
	return count
}

type Service struct {
	jwtSecret     []byte
	adminUsername string
	adminPassword string
	tokenStore    *tokenStore
	sessions      sync.Map
}

func NewService() *Service {
	secret := []byte("interview-demo-secret-key-2026")
	if s := os.Getenv("JWT_SECRET"); s != "" {
		secret = []byte(s)
	}

	return &Service{
		jwtSecret:     secret,
		adminUsername: getEnvDefault("AUTH_USERNAME", "admin"),
		adminPassword: getEnvDefault("AUTH_PASSWORD", "admin123"),
		tokenStore:    newTokenStore(10000),
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

func (a *Service) createToken(sub string, duration time.Duration, nonce ...string) (string, error) {
	claims := jwt.MapClaims{
		"sub":  sub,
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(duration).Unix(),
		"role": "admin",
	}
	if len(nonce) > 0 {
		claims["nonce"] = nonce[0]
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.jwtSecret)
}

func (a *Service) createRefreshToken(sub, nonce string, duration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":   sub,
		"nonce": nonce,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(duration).Unix(),
		"role":  "admin",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.jwtSecret)
}

func (a *Service) parseAndValidateToken(tokenStr string) (*jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return &claims, nil
}

// Login  godoc
// @Summary     用户登录
// @Description 使用用户名密码登录，获取 JWT Token
// @Tags        认证
// @Accept      json
// @Produce     json
// @Param       body body     LoginRequest true "登录请求"
// @Success     200  {object} TokenResponse
// @Failure     400  {object} map[string]interface{}
// @Failure     401  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /auth/login [post]
func (a *Service) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if req.Username != a.adminUsername || req.Password != a.adminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	nonce := fmt.Sprintf("%d", time.Now().UnixNano())
	a.sessions.Store("user_001", nonce)

	accessToken, err := a.createToken("user_001", 15*time.Minute, nonce)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Token 失败"})
		return
	}
	refreshToken, err := a.createRefreshToken("user_001", nonce, 1*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Refresh Token 失败"})
		return
	}

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900,
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken  godoc
// @Summary     刷新 Token
// @Description 使用 Refresh Token 轮换获取新的 Access Token 和 Refresh Token，带重放攻击检测
// @Tags        认证
// @Accept      json
// @Produce     json
// @Param       body body     RefreshRequest true "刷新请求"
// @Success     200  {object} map[string]interface{}
// @Failure     400  {object} map[string]interface{}
// @Failure     401  {object} map[string]interface{}
// @Failure     500  {object} map[string]interface{}
// @Router      /auth/refresh [post]
func (a *Service) RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if a.tokenStore.IsUsed(req.RefreshToken) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Refresh Token 已被使用（Replay Attack 检测）",
			"code":    "TOKEN_REUSED",
			"message": "此 Refresh Token 已被轮换过，请重新登录",
		})
		return
	}

	claims, err := a.parseAndValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh Token 无效或已过期", "code": "TOKEN_INVALID"})
		return
	}

	sub, _ := (*claims)["sub"].(string)
	nonceFromToken, _ := (*claims)["nonce"].(string)

	storedNonce, ok := a.sessions.Load(sub)
	if ok && nonceFromToken != storedNonce.(string) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "此账号已在其他设备登录",
			"code":    "SESSION_REPLACED",
			"message": "您的账号已在其他设备登录，请重新登录",
		})
		return
	}

	newAccessToken, err := a.createToken(sub, 15*time.Minute, nonceFromToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Token 失败"})
		return
	}
	newRefreshToken, err := a.createRefreshToken(sub, nonceFromToken, 1*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Refresh Token 失败"})
		return
	}

	a.tokenStore.MarkUsed(req.RefreshToken)

	c.JSON(http.StatusOK, gin.H{
		"access_token":  newAccessToken,
		"refresh_token": newRefreshToken,
		"expires_in":    900,
		"rotation":      true,
	})
}

// CheckToken  godoc
// @Summary     验证 Token
// @Description 验证 JWT Token 是否有效，返回剩余过期时间
// @Tags        认证
// @Accept      json
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Failure     401 {object} map[string]interface{}
// @Router      /auth/check [get]
func (a *Service) CheckToken(c *gin.Context) {
	tokenStr := c.GetHeader("Authorization")
	if tokenStr == "" || len(tokenStr) < 7 {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "未提供 Token"})
		return
	}

	tokenStr = tokenStr[7:]
	claims, err := a.parseAndValidateToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "Token 无效或已过期"})
		return
	}

	sub, _ := (*claims)["sub"].(string)
	exp, _ := (*claims)["exp"].(float64)
	remaining := int(exp - float64(time.Now().Unix()))
	if remaining < 0 {
		remaining = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":     true,
		"sub":       sub,
		"remaining": remaining,
	})
}

// AuthMiddleware returns a Gin middleware that validates JWT Bearer tokens
// and checks session nonce for replay protection.
func (a *Service) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := c.GetHeader("Authorization")
		if tokenStr == "" || len(tokenStr) < 7 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未提供 Token"})
			return
		}

		tokenStr = tokenStr[7:]
		claims, err := a.parseAndValidateToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token 无效或已过期"})
			return
		}

		sub, _ := (*claims)["sub"].(string)
		nonceFromToken, _ := (*claims)["nonce"].(string)

		storedNonce, ok := a.sessions.Load(sub)
		if ok && nonceFromToken != storedNonce.(string) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "此账号已在其他设备登录",
				"code":    "SESSION_REPLACED",
				"message": "您的账号已在其他设备登录，请重新登录",
			})
			return
		}

		c.Set("sub", sub)
		c.Next()
	}
}

// GetUsedTokenCount  godoc
// @Summary     已用 Token 计数
// @Description 返回已被使用的 Refresh Token 数量（重放攻击检测统计）
// @Tags        认证
// @Produce     json
// @Success     200 {object} map[string]interface{}
// @Router      /auth/used-tokens [get]
func (a *Service) UsedTokenCount(c *gin.Context) {
	count := a.tokenStore.Count()
	c.JSON(http.StatusOK, gin.H{"count": count})
}
