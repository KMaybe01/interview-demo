## 🚀 阶段十二：CI/CD 与 DevOps 实践

### 12.1 容器化优化
#### Q50: Go 二进制文件如何构建最小化 Docker 镜像？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：多阶段构建、Distroless/Alpine、CGO 静态编译。

**💡 记忆关键词**：多阶段构建、CGO_ENABLED=0、distroless/scratch、-ldflags

**答案要点**：
- **多阶段构建**：第一阶段使用 `golang` 镜像编译，第二阶段使用 `scratch` 或 `alpine` 仅复制二进制。
- **静态编译**：`CGO_ENABLED=0 go build -ldflags="-s -w"` 去除调试符号，体积可减少 50%+。
- **安全**：使用非 root 用户运行，设置 `USER 1000`；启用只读文件系统。


```dockerfile
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
USER 1000
ENTRYPOINT ["/server"]
```

### 12.2 部署策略
#### Q51: K8s 中蓝绿部署、金丝雀发布、滚动更新的区别？

**难度**：⭐⭐⭐ | **频率**：📌 常考

**考点**：流量切换、风险控制、Service/Ingress 配置。

**💡 记忆关键词**：滚动更新逐步替、蓝绿双环境秒切换、金丝雀小流量验证

**答案要点**：
- **滚动更新 (Rolling Update)**：默认策略，逐步替换 Pod，零停机但存在新旧版本共存期。
- **蓝绿部署**：同时运行两套环境，切换 Service 标签瞬间完成，回滚快但资源消耗大。
- **金丝雀 (Canary)**：先放量 5% 给新版本，监控指标正常后逐步放大，适合高风险变更。
- **Go 优势**：启动快、内存占用低，非常适合滚动更新和弹性伸缩（HPA）。


---

