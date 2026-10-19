package main

import (
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"

	"interview-demo/backend/internal/a2a"
	"interview-demo/backend/internal/airouter"
	"interview-demo/backend/internal/knowledge"
	"interview-demo/backend/internal/llm"
	"interview-demo/backend/internal/mcp"
	"interview-demo/backend/internal/obs"
	"interview-demo/backend/internal/tool"
)

// ragRetriever 把 internal/knowledge 的 RAGService 适配成 airouter.Retriever，
// 让编排层不直接依赖知识库包的具体实现（依赖倒置，便于替换向量库）。
type ragRetriever struct {
	svc *knowledge.RAGService
}

// Search 在指定知识库做混合检索（关键词 + 向量 + RRF 融合）。
func (r ragRetriever) Search(ctx context.Context, kbID, query string, topK int) ([]tool.KnowledgeHit, error) {
	if r.svc == nil {
		return nil, nil
	}
	if topK <= 0 {
		topK = 3
	}
	resp := r.svc.HybridSearch(query, kbID, topK, true)
	hits := make([]tool.KnowledgeHit, 0, len(resp.Results))
	for _, item := range resp.Results {
		hits = append(hits, tool.KnowledgeHit{
			Content:  item.Chunk.Content,
			Source:   item.DocSource,
			Document: item.DocTitle,
			Score:    item.Score,
		})
	}
	return hits, nil
}

// setupAI 构建并注册 /api/ai/* 全部能力。
//
// 装配顺序即依赖方向：
//
//	llm.Registry（Provider）→ tool.Registry（工具）→ obs（可观测）
//	  → airouter.Service（编排）→ Handler（HTTP）
//	  → mcp.Server（Agent ↔ 工具） / a2a.Server（Agent ↔ Agent）
func setupAI(api *gin.RouterGroup, r *gin.Engine, rag *knowledge.RAGService, port string) *airouter.Handler {
	// ① Provider 注册表：按环境变量装配 OpenAI / DeepSeek / Gemini / Qwen / Ollama
	llmReg := llm.NewRegistryFromEnv()
	providers := llmReg.ListProviders()
	if len(providers) == 0 {
		log.Println("Warning: 未配置任何 LLM API Key，/api/ai 将全部走离线降级模式")
	} else {
		log.Printf("LLM providers registered: %v", providers)
	}

	// ② 工具注册中心：内置工具 + 知识库检索工具
	tools := tool.NewRegistry()
	retriever := ragRetriever{svc: rag}
	tool.RegisterBuiltins(tools, tool.BuiltinOptions{Searcher: retriever})

	// ③ 可观测：链路 / 运行记录 / Prompt 版本 / 评测
	recorder := obs.NewRecorder(0)
	prompts := obs.NewPromptRegistry()
	prompts.EnsureDefaults()
	evals := obs.NewEvalStore()

	// ④ 编排服务
	cfg := airouter.DefaultServiceConfig()
	if len(providers) > 0 {
		if p, ok := llmReg.Default(); ok {
			if models := p.Models(); len(models) > 0 {
				cfg.DefaultModel = models[0].ID
			}
		}
	}
	svc := airouter.NewService(llmReg, tools, recorder, prompts, evals, retriever, cfg)
	handler := airouter.NewHandler(svc)

	// ⑤ MCP：内置工具 + Agent 工具（共用同一套权限/沙箱/审计）
	mcpReg := mcp.DefaultRegistry()
	mcpReg.Register("agent", airouter.NewToolMCPAdapter(tools))
	mcpServer := mcp.NewServer(mcpReg)

	// ⑥ A2A：Agent 之间的横向协作
	a2aServer := a2a.NewServer(a2a.DefaultRegistry())
	a2aServer.SetBaseURL("http://localhost:" + port)

	// ⑦ 注册路由
	airouter.RegisterRoutes(api.Group("/ai"), handler, mcpServer, a2aServer)

	// well-known 属于域级约定，不能挂在 /api 前缀下
	if r != nil {
		r.GET("/.well-known/agent.json", a2aServer.WellKnown)
	}

	// ⑧ 后台清理：链路默认保留 30 分钟
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if n := recorder.Prune(); n > 0 {
				log.Printf("obs: pruned %d expired traces", n)
			}
		}
	}()

	return handler
}
