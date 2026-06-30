package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

var allowedOrigin string

func init() {
	allowedOrigin = os.Getenv("CORS_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}
}

// CORS returns a Gin middleware for cross-origin resource sharing.
// Allowed origin is read from the CORS_ORIGIN environment variable (default: *).
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", allowedOrigin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
