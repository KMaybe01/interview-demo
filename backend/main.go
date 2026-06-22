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
		api.POST("/auth/login", handlers.Login)
		api.POST("/auth/refresh", handlers.RefreshToken)
		api.GET("/auth/check", handlers.CheckToken)
		api.GET("/auth/used-tokens", handlers.GetUsedTokenCount)
		api.GET("/sse/logs", handlers.SSELogStream)
		api.GET("/sse/encrypted-logs", handlers.EncryptedLogStream)
		api.GET("/upload/download/:uploadId", handlers.DownloadUpload)

		protected := api.Group("")
		protected.Use(handlers.AuthMiddleware())
		{
			protected.GET("/gis/points", handlers.GetGISPoints)
			protected.GET("/schema/config", handlers.GetSchemaConfig)
			protected.POST("/schema/validate", handlers.ValidateSchema)
			protected.POST("/upload/init", handlers.InitUpload)
			protected.POST("/upload/chunk", handlers.UploadChunk)
			protected.POST("/upload/complete", handlers.CompleteUpload)
			protected.GET("/upload/status/:uploadId", handlers.GetUploadStatus)
			protected.GET("/upload/sessions", handlers.ListUploadSessions)
			protected.POST("/rbac/check", handlers.CheckPermissions)
			protected.GET("/services", handlers.GetServices)
			protected.GET("/config", handlers.GetConfig)
			protected.GET("/logs", handlers.GetLogs)
			protected.POST("/vitals/report", handlers.ReportVitals)
			protected.GET("/vitals/summary", handlers.GetVitalsSummary)
			protected.GET("/vitals/history", handlers.GetVitalsHistory)
			protected.POST("/vitals/page-report", handlers.ReportPage)
			protected.GET("/vitals/pages", handlers.GetPageSummary)
			protected.GET("/vitals/page-history", handlers.GetPageHistory)
			protected.GET("/request-loading/demo", handlers.DemoRequest)
		}
	}

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/ws/alerts", handlers.AlertDispatcher)
	r.GET("/api/alerts", handlers.AlertDispatcher)

	println("Backend running on :8080")
	r.Run(":8080")
}
