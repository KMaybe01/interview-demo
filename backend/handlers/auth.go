package handlers

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("interview-demo-secret-key-2026")

var usedRefreshTokens = struct {
	m map[string]bool
	sync.RWMutex
}{m: make(map[string]bool)}

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

	if req.Username != "admin" || req.Password != "admin123" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	nonce := fmt.Sprintf("%d", time.Now().UnixNano())
	activeSessions.Store("user_001", nonce)

	accessToken, _ := createToken("user_001", 1*time.Minute, nonce)
	refreshToken, _ := createRefreshToken("user_001", nonce, 1*time.Hour)

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600,
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

	newAccessToken, _ := createToken(sub, 1*time.Minute, nonceFromToken)
	newRefreshToken, _ := createRefreshToken(sub, nonceFromToken, 1*time.Hour)

	usedRefreshTokens.Lock()
	usedRefreshTokens.m[req.RefreshToken] = true
	usedRefreshTokens.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"access_token":  newAccessToken,
		"refresh_token": newRefreshToken,
		"expires_in":    60,
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
