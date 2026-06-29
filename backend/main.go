package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"interview-demo/backend/handlers"
	"interview-demo/backend/middleware"
	"interview-demo/backend/services"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.MaxMultipartMemory = 100 << 20
	r.Use(middleware.CORS())

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		log.Println("Warning: OPENAI_API_KEY not set")
	}

	authService := handlers.NewAuthService()
	llmService := services.NewLLMService(apiKey)
	memoryService := services.NewMemoryService()
	ragService := services.NewRAGService()
	chunkerManager := services.NewChunkerManager()
	embeddingService := services.NewEmbeddingService(services.EmbeddingOpenAI)
	vectorDB := services.NewVectorDatabase()
	modelManager := services.DefaultModelManager()
	agentFactory := services.NewAgentFactory(llmService, ragService)
	agentHandler := handlers.NewAgentHandler(agentFactory, modelManager)
	chatHandler := handlers.NewChatHandler(llmService, memoryService, ragService, agentFactory, agentHandler)
	knowledgeHandler := handlers.NewKnowledgeHandler(ragService, chunkerManager, embeddingService, vectorDB)
	modelHandler := handlers.NewModelHandler(modelManager)

	docsDir := os.Getenv("DOCS_DIR")
	if docsDir == "" {
		docsDir = "../docs"
	}
	docLoader := services.NewDocLoader(ragService, chunkerManager, embeddingService, vectorDB)

	api := r.Group("/api")
	{
		api.POST("/auth/login", authService.Login)
		api.POST("/auth/refresh", authService.RefreshToken)
		api.GET("/auth/check", authService.CheckToken)
		api.GET("/auth/used-tokens", authService.GetUsedTokenCount)
		api.GET("/sse/logs", handlers.SSELogStream)
		api.GET("/sse/encrypted-logs", handlers.EncryptedLogStream)
		api.GET("/upload/download/:uploadId", handlers.DownloadUpload)

		api.GET("/health", handlers.HealthCheck)

		api.POST("/chat", chatHandler.Chat)
		api.POST("/chat/stream", chatHandler.ChatStream)
		api.GET("/chat/history/:conversationId", chatHandler.GetHistory)
		api.DELETE("/chat/history/:conversationId", chatHandler.ClearHistory)

		api.POST("/knowledge-base", knowledgeHandler.CreateKnowledgeBase)
		api.GET("/knowledge-base", knowledgeHandler.ListKnowledgeBases)
		api.GET("/knowledge-base/:id", knowledgeHandler.GetKnowledgeBase)
		api.DELETE("/knowledge-base/:id", knowledgeHandler.DeleteKnowledgeBase)
		api.POST("/knowledge-base/:id/document", knowledgeHandler.AddDocument)
		api.POST("/knowledge-base/:id/documents/batch", knowledgeHandler.BatchAddDocuments)
		api.GET("/knowledge-base/:id/document", knowledgeHandler.GetDocuments)
		api.DELETE("/knowledge-base/:id/document/:docId", knowledgeHandler.DeleteDocument)
		api.POST("/knowledge-base/search", knowledgeHandler.Search)
		api.POST("/knowledge-base/init-docs", func(c *gin.Context) {
			docsDir := os.Getenv("DOCS_DIR")
			if docsDir == "" {
				docsDir = "../docs"
			}
			results, err := docLoader.LoadDocsFromDir(docsDir)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			totalDocs, totalChunks := 0, 0
			for _, r := range results {
				totalDocs += r.DocCount
				totalChunks += r.ChunkCount
			}
			c.JSON(200, gin.H{
				"knowledgeBases": results,
				"totalKBs":       len(results),
				"totalDocs":      totalDocs,
				"totalChunks":    totalChunks,
				"message":        fmt.Sprintf("loaded %d knowledge bases, %d docs, %d chunks", len(results), totalDocs, totalChunks),
			})
		})

		api.GET("/models", modelHandler.ListModels)
		api.GET("/models/:id", modelHandler.GetModel)
		api.POST("/models/:id/chat", modelHandler.Chat)

		api.GET("/agents", agentHandler.ListAgents)
		api.POST("/agents", agentHandler.CreateAgent)
		api.POST("/agents/:id/execute", agentHandler.ExecuteAgent)
		api.DELETE("/agents/:id", agentHandler.DeleteAgent)

		protected := api.Group("")
		protected.Use(authService.AuthMiddleware())
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
			protected.POST("/payments/create", handlers.CreatePayment)
			protected.POST("/payments/process/:id", handlers.ProcessPayment)
			protected.GET("/payments/order/:id", handlers.GetOrder)
			protected.GET("/payments/orders", handlers.ListOrders)
			protected.POST("/payments/transition/:id", handlers.TransitionPayment)
			protected.POST("/payments/idempotency-test", handlers.IdempotencyTest)
			protected.POST("/payments/security-check", handlers.SecurityCheck)
			protected.POST("/payments/retry-demo", handlers.RetryDemo)
		}
	}

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/ws/alerts", handlers.AlertDispatcher)
	r.GET("/api/alerts", handlers.AlertDispatcher)

	fmt.Println("=====================================")
	fmt.Printf("Loading docs from: %s\n", docsDir)
	results, err := docLoader.LoadDocsFromDir(docsDir)
	if err != nil {
		fmt.Printf("Doc loading failed: %v\n", err)
	} else {
		totalDocs, totalChunks := 0, 0
		for _, r := range results {
			totalDocs += r.DocCount
			totalChunks += r.ChunkCount
		}
		fmt.Printf("Docs loaded: %d knowledge bases, %d docs, %d chunks\n", len(results), totalDocs, totalChunks)
	}
	fmt.Println("=====================================")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Backend running on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("listen error: %s\n", err)
			os.Exit(1)
		}
	}()

	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
