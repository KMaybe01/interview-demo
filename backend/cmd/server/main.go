// @title           Interview Demo API
// @version         1.0
// @description     AI Agent Demo — Go + Gin 后端，提供 13 个技术演示场景的 API 支持
// @host            localhost:8080
// @BasePath        /api
// @schemes         http

// @contact.name   Developer
// @contact.email  dev@example.com

// @securityDefinitions.apikey Bearer
// @in header
// @name Authorization
// @description 输入格式: "Bearer {token}"

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

	"interview-demo/backend/internal/agent"
	"interview-demo/backend/internal/auth"
	"interview-demo/backend/internal/chat"
	"interview-demo/backend/internal/demo"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/memory"
	"interview-demo/backend/internal/middleware"
	"interview-demo/backend/internal/payment"

	"github.com/gin-gonic/gin"

	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
	_ "interview-demo/backend/docs"
)

func main() {
	r := gin.Default()
	r.MaxMultipartMemory = 100 << 20
	r.Use(middleware.CORS())

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		log.Println("Warning: OPENAI_API_KEY not set")
	}

	authService := auth.NewService()
	llmService := chat.NewLLMService(apiKey)
	memoryService := memory.NewService()
	ragService := knowledge.NewRAGService()
	chunkerManager := knowledge.NewChunkerManager()
	embeddingService := knowledge.NewEmbeddingService(knowledge.EmbeddingOpenAI)
	vectorDB := knowledge.NewVectorDatabase()
	modelManager := chat.DefaultModelManager()
	agentFactory := agent.NewFactory(llmService, ragService)
	agentHandler := agent.NewHandler(agentFactory, modelManager)
	chatHandler := chat.NewHandler(
		llmService, memoryService, ragService,
		func(id string) chat.AgentExecutor {
			agt, ok := agentHandler.Agent(id)
			if !ok {
				return nil
			}
			return agt
		},
		func(agentType, name string) chat.AgentExecutor {
			var t agent.Type
			switch agentType {
			case "react":
				t = agent.TypeReAct
			case "function":
				t = agent.TypeFunction
			case "multi":
				t = agent.TypeMulti
			default:
				t = agent.TypeReAct
			}
			return agentFactory.CreateAgent(t, name)
		},
	)
	knowledgeHandler := knowledge.NewHandler(ragService, chunkerManager, embeddingService, vectorDB)
	modelHandler := chat.NewModelHandler(modelManager)

	docsDir := os.Getenv("DOCS_DIR")
	if docsDir == "" {
		docsDir = "../docs"
	}
	docLoader := knowledge.NewDocLoader(ragService, chunkerManager, embeddingService, vectorDB)

	api := r.Group("/api")
	{
		api.POST("/auth/login", authService.Login)
		api.POST("/auth/refresh", authService.RefreshToken)
		api.GET("/auth/check", authService.CheckToken)
		api.GET("/auth/used-tokens", authService.UsedTokenCount)
		api.GET("/sse/logs", demo.SSELogStream)
		api.GET("/sse/encrypted-logs", demo.EncryptedLogStream)
		api.GET("/upload/download/:uploadId", demo.DownloadUpload)

		api.GET("/health", demo.HealthCheck)

		api.POST("/chat", chatHandler.Chat)
		api.POST("/chat/stream", chatHandler.ChatStream)
		api.GET("/chat/history/:conversationId", chatHandler.History)
		api.DELETE("/chat/history/:conversationId", chatHandler.ClearHistory)

		api.POST("/knowledge-base", knowledgeHandler.CreateKnowledgeBase)
		api.GET("/knowledge-base", knowledgeHandler.ListKnowledgeBases)
		api.GET("/knowledge-base/:id", knowledgeHandler.KnowledgeBaseDetail)
		api.DELETE("/knowledge-base/:id", knowledgeHandler.DeleteKnowledgeBase)
		api.POST("/knowledge-base/:id/document", knowledgeHandler.AddDocument)
		api.POST("/knowledge-base/:id/documents/batch", knowledgeHandler.BatchAddDocuments)
		api.GET("/knowledge-base/:id/document", knowledgeHandler.KnowledgeBaseDocuments)
		api.DELETE("/knowledge-base/:id/document/:docId", knowledgeHandler.DeleteDocument)
		api.POST("/knowledge-base/search", knowledgeHandler.Search)
		api.POST("/knowledge-base/init-docs", func(c *gin.Context) {
			// InitDocs godoc
			// @Summary     初始化文档
			// @Description 从本地目录加载文档到知识库（含分块和向量化）
			// @Tags        知识库
			// @Produce     json
			// @Success     200 {object} map[string]interface{}
			// @Failure     500 {object} map[string]interface{}
			// @Router      /knowledge-base/init-docs [post]

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
		api.GET("/models/:id", modelHandler.ModelDetail)
		api.POST("/models/:id/chat", modelHandler.Chat)

		api.GET("/agents", agentHandler.ListAgents)
		api.POST("/agents", agentHandler.CreateAgent)
		api.POST("/agents/:id/execute", agentHandler.ExecuteAgent)
		api.DELETE("/agents/:id", agentHandler.DeleteAgent)

		protected := api.Group("")
		protected.Use(authService.AuthMiddleware())
		{
			protected.GET("/gis/points", demo.GISPoints)
			protected.GET("/schema/config", demo.SchemaConfig)
			protected.POST("/schema/validate", demo.ValidateSchema)
			protected.POST("/upload/init", demo.InitUpload)
			protected.POST("/upload/chunk", demo.UploadChunk)
			protected.POST("/upload/complete", demo.CompleteUpload)
			protected.GET("/upload/status/:uploadId", demo.UploadStatus)
			protected.GET("/upload/sessions", demo.ListUploadSessions)
			protected.POST("/rbac/check", demo.CheckPermissions)
			protected.GET("/services", demo.Services)
			protected.GET("/config", demo.Config)
			protected.GET("/logs", demo.Logs)
			protected.GET("/request-loading/demo", demo.DemoRequest)
			protected.POST("/payments/create", payment.CreatePayment)
			protected.POST("/payments/process/:id", payment.ProcessPayment)
			protected.GET("/payments/order/:id", payment.OrderDetail)
			protected.GET("/payments/orders", payment.ListOrders)
			protected.POST("/payments/transition/:id", payment.TransitionPayment)
			protected.POST("/payments/idempotency-test", payment.IdempotencyTest)
			protected.POST("/payments/security-check", payment.SecurityCheck)
			protected.POST("/payments/retry-demo", payment.RetryDemo)
		}

		api.POST("/vitals/report", demo.ReportVitals)
		api.GET("/vitals/summary", demo.VitalsSummaryReport)
		api.GET("/vitals/history", demo.VitalsHistory)
		api.POST("/vitals/page-report", demo.ReportPage)
		api.GET("/vitals/pages", demo.PageSummaryReport)
		api.GET("/vitals/page-history", demo.PageHistory)
	}

	r.GET("/healthz", func(c *gin.Context) {
		// Healthz godoc
		// @Summary     K8s 健康检查
		// @Description Kubernetes 存活探针
		// @Tags        监控
		// @Produce     json
		// @Success     200 {object} map[string]interface{}
		// @Router      /healthz [get]

		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/ws/alerts", demo.AlertDispatcher)
	r.GET("/api/alerts", demo.AlertDispatcher)

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
