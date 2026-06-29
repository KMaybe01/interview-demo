package handlers

import (
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var (
	jwtSecret     []byte
	adminUsername string
	adminPassword string
)

func init() {
	jwtSecret = func() []byte {
		if s := os.Getenv("JWT_SECRET"); s != "" {
			return []byte(s)
		}
		return []byte("interview-demo-secret-key-2026")
	}()
	adminUsername = getEnvDefault("AUTH_USERNAME", "admin")
	adminPassword = getEnvDefault("AUTH_PASSWORD", "admin123")
}

func getEnvDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

var usedRefreshTokens struct {
	sync.RWMutex
	m     map[string]time.Time
	limit int
}

func init() {
	usedRefreshTokens.m = make(map[string]time.Time)
	usedRefreshTokens.limit = 10000
	go usedRefreshTokensCleanup()
}

func usedRefreshTokensCleanup() {
	for {
		time.Sleep(30 * time.Minute)
		usedRefreshTokens.Lock()
		for k, v := range usedRefreshTokens.m {
			if time.Since(v) > 1*time.Hour {
				delete(usedRefreshTokens.m, k)
			}
		}
		usedRefreshTokens.Unlock()
	}
}

func markTokenUsed(token string) {
	usedRefreshTokens.Lock()
	usedRefreshTokens.m[token] = time.Now()
	if len(usedRefreshTokens.m) > usedRefreshTokens.limit {
		for k, v := range usedRefreshTokens.m {
			if time.Since(v) > 10*time.Minute {
				delete(usedRefreshTokens.m, k)
			}
			if len(usedRefreshTokens.m) <= usedRefreshTokens.limit/2 {
				break
			}
		}
	}
	usedRefreshTokens.Unlock()
}

var activeSessions sync.Map

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

func createToken(sub string, duration time.Duration, nonce ...string) (string, error) {
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
	return token.SignedString(jwtSecret)
}

func createRefreshToken(sub, nonce string, duration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":   sub,
		"nonce": nonce,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(duration).Unix(),
		"role":  "admin",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func parseAndValidateToken(tokenStr string) (*jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
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

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if req.Username != adminUsername || req.Password != adminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	nonce := fmt.Sprintf("%d", time.Now().UnixNano())
	activeSessions.Store("user_001", nonce)

	accessToken, err := createToken("user_001", 15*time.Minute, nonce)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Token 失败"})
		return
	}
	refreshToken, err := createRefreshToken("user_001", nonce, 1*time.Hour)
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

func RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	usedRefreshTokens.RLock()
	_, alreadyUsed := usedRefreshTokens.m[req.RefreshToken]
	usedRefreshTokens.RUnlock()

	if alreadyUsed {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Refresh Token 已被使用（Replay Attack 检测）",
			"code":    "TOKEN_REUSED",
			"message": "此 Refresh Token 已被轮换过，请重新登录",
		})
		return
	}

	claims, err := parseAndValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh Token 无效或已过期", "code": "TOKEN_INVALID"})
		return
	}

	sub, _ := (*claims)["sub"].(string)
	nonceFromToken, _ := (*claims)["nonce"].(string)

	storedNonce, ok := activeSessions.Load(sub)
	if ok && nonceFromToken != storedNonce.(string) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "此账号已在其他设备登录",
			"code":    "SESSION_REPLACED",
			"message": "您的账号已在其他设备登录，请重新登录",
		})
		return
	}

	newAccessToken, err := createToken(sub, 15*time.Minute, nonceFromToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Token 失败"})
		return
	}
	newRefreshToken, err := createRefreshToken(sub, nonceFromToken, 1*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建 Refresh Token 失败"})
		return
	}

	markTokenUsed(req.RefreshToken)

	c.JSON(http.StatusOK, gin.H{
		"access_token":  newAccessToken,
		"refresh_token": newRefreshToken,
		"expires_in":    900,
		"rotation":      true,
	})
}

func CheckToken(c *gin.Context) {
	tokenStr := c.GetHeader("Authorization")
	if tokenStr == "" || len(tokenStr) < 7 {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "未提供 Token"})
		return
	}

	tokenStr = tokenStr[7:]
	claims, err := parseAndValidateToken(tokenStr)
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
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := c.GetHeader("Authorization")
		if tokenStr == "" || len(tokenStr) < 7 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未提供 Token"})
			return
		}

		tokenStr = tokenStr[7:]
		claims, err := parseAndValidateToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token 无效或已过期"})
			return
		}

		sub, _ := (*claims)["sub"].(string)
		nonceFromToken, _ := (*claims)["nonce"].(string)

		storedNonce, ok := activeSessions.Load(sub)
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

func GetUsedTokenCount(c *gin.Context) {
	usedRefreshTokens.RLock()
	count := len(usedRefreshTokens.m)
	usedRefreshTokens.RUnlock()
	c.JSON(http.StatusOK, gin.H{"count": count})
}
