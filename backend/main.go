package main

import (
	"interview-demo/backend/handlers"
	"interview-demo/backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.MaxMultipartMemory = 100 << 20
	r.Use(middleware.CORS())

	api := r.Group("/api")
	{
		api.GET("/gis/points", handlers.GetGISPoints)
		api.GET("/sse/logs", handlers.SSELogStream)
		api.POST("/auth/login", handlers.Login)
		api.POST("/auth/refresh", handlers.RefreshToken)
		api.GET("/auth/check", handlers.CheckToken)
		api.GET("/auth/used-tokens", handlers.GetUsedTokenCount)
		api.POST("/schema/validate", handlers.ValidateSchema)
		api.GET("/sse/encrypted-logs", handlers.EncryptedLogStream)
		api.POST("/upload/init", handlers.InitUpload)
		api.POST("/upload/chunk", handlers.UploadChunk)
		api.POST("/upload/complete", handlers.CompleteUpload)
	}

	r.GET("/ws/alerts", handlers.WebSocketAlerts)

	println("Backend running on :8080")
	r.Run(":8080")
}
