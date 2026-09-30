# 篇五 · 工程效能 · 23 CI/CD 与 DevOps

> **定位**：流水线设计、构建缓存、制品与发布策略、GitOps
> **面试权重**：🔥🔥 常考 ｜ **前置**：3-15
> **🔁 前端类比**：前端 CI 打包 + 静态资源发布 → 后端镜像构建 + 滚动/灰度发布，链路同构

## 🧭 核心考点

- CI 流水线：lint → test → build → 镜像 → 部署
- 构建缓存与增量构建提速
- 发布策略：滚动、蓝绿、金丝雀与回滚
- GitOps 与环境管理
- 质量门禁：覆盖率、静态扫描、安全扫描

## 📑 本篇题目索引（共 6 题）

| # | 题目 | 难度 | 频率 |
|---|------|------|------|
| Q1 | Go 二进制文件如何构建最小化 Docker 镜像？ | ⭐⭐ | 📌 常考 |
| Q2 | K8s 中蓝绿部署、金丝雀发布、滚动更新的区别？ | ⭐⭐⭐ | 📌 常考 |
| Q3 | 一条完整的 Go CI 流水线包含哪些阶段？（GitHub Actions 实战） | ⭐⭐⭐ | 🔥 高频 |
| Q4 | 如何加速 CI：构建缓存、并行化与依赖复用？ | ⭐⭐ | 📌 常考 |
| Q5 | 质量门禁怎么做（覆盖率 / 静态扫描 / 安全扫描）？ | ⭐⭐ | 📌 常考 |
| Q6 | 什么是 CGO？交叉编译时如何处理 CGO 依赖？ | ⭐⭐ | 📖 了解 |

---

### Q1: Go 二进制文件如何构建最小化 Docker 镜像？

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

### Q2: K8s 中蓝绿部署、金丝雀发布、滚动更新的区别？

**难度**：⭐⭐⭐ | **频率**：📌 常考

**考点**：流量切换、风险控制、Service/Ingress 配置。

**💡 记忆关键词**：滚动更新逐步替、蓝绿双环境秒切换、金丝雀小流量验证

**答案要点**：
- **滚动更新 (Rolling Update)**：默认策略，逐步替换 Pod，零停机但存在新旧版本共存期。
- **蓝绿部署**：同时运行两套环境，切换 Service 标签瞬间完成，回滚快但资源消耗大。
- **金丝雀 (Canary)**：先放量 5% 给新版本，监控指标正常后逐步放大，适合高风险变更。
- **Go 优势**：启动快、内存占用低，非常适合滚动更新和弹性伸缩（HPA）。

---

---

### Q3: 一条完整的 Go CI 流水线包含哪些阶段？（GitHub Actions 实战）

**难度**：⭐⭐⭐ | **频率**：🔥 高频

**考点**：流水线阶段划分、并行加速、制品管理、环境隔离。

**💡 记忆关键词**：lint → test → build → 镜像 → 部署、并行 job、缓存依赖、只构建一次多处复用

**答案要点**：
- **阶段划分（按「由快到慢、由便宜到昂贵」）**：
  1. **静态检查**（秒级）：`gofmt`/`go vet`/`golangci-lint`、commitlint；
  2. **单元测试**（分钟级）：`go test -race -cover ./...`；
  3. **构建**：`CGO_ENABLED=0 go build`，产出单二进制（**只构建一次**，后续所有环境复用同一个制品）；
  4. **镜像**：多阶段 Dockerfile 打包（见本篇 Q1）；
  5. **集成/E2E 测试**（可选，可用 docker-compose 起依赖）；
  6. **部署**：按环境（dev → staging → prod）逐级推进，生产需人工审批。
- **关键原则**：
  - **同一制品晋级**（build once, deploy many）：dev 与 prod 用的是**同一个镜像 digest**，避免「打包两次结果不同」；
  - **配置外置**：环境差异靠环境变量/配置中心，不进镜像；
  - **快速失败**：便宜的检查放前面，别等构建完才报 lint 错；
  - **可重复**：锁定依赖版本（`go.sum`）、固定 Go 版本与基础镜像。
- **GitHub Actions 示例**（本仓库就用了类似结构：lint + test + typecheck 并行）：
  ```yaml
  name: ci
  on: [push, pull_request]
  jobs:
    lint-test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-go@v5
          with: { go-version: '1.26', cache: true }   # 缓存模块与构建缓存
        - run: go vet ./...
        - run: go test -race -covermode=atomic -coverprofile=cover.out ./...
        - run: go build -trimpath -ldflags="-s -w" -o bin/app ./cmd/server
    image:
      needs: lint-test
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: docker/build-push-action@v6
          with: { push: true, tags: "registry/app:${{ github.sha }}" }
  ```
- **部署侧**：`kubectl set image` / Helm upgrade / Argo CD 同步；生产建议**自动部署到预发 + 人工审批到生产**。

**🔁 前端类比**：`npm ci → eslint → vitest → vite build → 上传 CDN` 就是前端流水线，后端只是把「上传静态资源」换成「构建镜像 + 滚动发布」。

**📝 一句话总结**：lint → test → build → image → deploy 五段式，便宜的先跑，制品只构建一次并逐环境晋级。

---

### Q4: 如何加速 CI：构建缓存、并行化与依赖复用？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：缓存命中率、并行 job、Runner 优化。

**💡 记忆关键词**：go mod 缓存 + GOCACHE、并行 job、matrix、Docker buildx cache、只跑变更部分

**答案要点**：
- **缓存**（收益最大）：
  1. **依赖缓存**：`go mod download` 的模块缓存 + **`GOCACHE` 构建缓存**（CI 中两者都要缓存，`actions/setup-go` 的 `cache: true` 会处理）；
  2. **镜像层缓存**：Dockerfile 里**先 `COPY go.mod go.sum` 再 `go mod download`，最后才 `COPY .`** ，让依赖层在代码变更时仍能命中；
  3. **Docker buildx 的 registry/local cache**（`--cache-from/--cache-to`）。
- **并行化**：
  - 无依赖的 job 并行（lint / test / typecheck 同时跑，本仓库与 turbo 的做法一致）；
  - 测试**分片**（`-shard`/`matrix` 切成 N 份并行）；
  - **Monorepo 按变更路径过滤**（turbo `--filter`、`git diff` 判断只跑受影响的包）——本仓库的 lint/test 就是 turbo 编排。
- **其他**：
  - 用更小的基础镜像与自托管/更大规格 Runner（CI 常见瓶颈是 CPU 与网络）；
  - 避免在 CI 里 `go test ./...` 无条件全量跑（受影响的包 + 定期全量nightly）。
- **量化**：给流水线加**时长看板**，找出最慢的 job（通常是 E2E 与镜像构建）优先优化。

**📝 一句话总结**：缓存（模块 + GOCACHE + 镜像层）、并行（job 并行 + 测试分片）、过滤（只跑受影响包）是三板斧。

---

### Q5: 质量门禁怎么做（覆盖率 / 静态扫描 / 安全扫描）？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：门禁清单、覆盖率策略、依赖漏洞、静态扫描。

**💡 记忆关键词**：增量覆盖率门禁、govulncheck、golangci-lint、SAST、禁止跳过测试

**答案要点**：
- **质量门禁清单（可裁剪）**：
  1. **格式化与 lint**：`gofmt -l` 有输出即失败；`golangci-lint run`（CI 里用**只检查、不自动修**的模式）；
  2. **测试**：全绿 + **竞态检测 `-race`**（并发代码必须开，见 1-03 Q11）；
  3. **覆盖率**：优先用**增量覆盖率（diff coverage）**门禁（如新增代码 ≥ 60%），全量覆盖率门禁容易逼出「为刷覆盖率写废测试」；
  4. **静态安全扫描**：`gosec`（SAST）、`govulncheck`（官方 **依赖与标准库漏洞**扫描，会指出可被实际调用的漏洞函数，误报少）；
  5. **依赖与许可证**：`go mod verify`、SBOM 生成、License 合规检查；
  6. **镜像扫描**：Trivy/Grype 扫基础镜像与依赖 CVE；
  7. **提交规范**：commitlint + husky（本仓库即如此）。
- **落地建议**：
  - 门禁**只拦阻断项**（编译失败、测试失败、高危漏洞），低级告警先设为「不阻断但记录」，避免团队绕过 CI；
  - **禁止跳过测试**：不允许 `t.Skip` 进主干、不允许 `-short` 掩盖失败；
  - 门禁规则**写进代码仓库**（配置文件与代码同 PR 评审），避免「某人在 CI 后台偷偷关掉」。

```yaml
# 关键门禁片段
- run: test -z "$(gofmt -l .)" || (gofmt -l . && exit 1)
- run: go test -race ./...
- run: go run golang.org/x/vuln/cmd/govulncheck@latest ./...
- run: docker run --rm -v $PWD:/src aquasec/trivy image registry/app:${{ github.sha }}
```

**📝 一句话总结**：门禁只管阻断项（lint/测试+race/高危漏洞/镜像扫描），覆盖率用增量口径，规则与代码同仓库评审。

---

### Q6: 什么是 CGO？交叉编译时如何处理 CGO 依赖？

**难度**：⭐⭐ | **频率**：📖 了解

**考点**：C 语言交互、构建标签、Docker 多阶段构建。

**💡 记忆关键词**：C 语言调用、动态链接、交叉编译器、多阶段构建

**答案要点**：
- `CGO` 允许 Go 代码调用 C 代码，但会失去纯静态编译优势，产生动态链接依赖。
- 交叉编译时，若依赖 CGO，需配置对应的 C 交叉编译器（如 `CC=x86_64-linux-musl-gcc`）。
- **最佳实践**：尽量使用纯 Go 实现（如 `sqlite` 的纯 Go 驱动 `modernc.org/sqlite`）；必须使用时，在 Docker 中使用多阶段构建，第一阶段安装 GCC 编译，第二阶段复制二进制文件。

---

## ✅ 自测清单（答不出就回去看对应题）

- [ ] 能脱离资料讲清本篇「核心考点」中的每一条
- [ ] 能手写/口述至少 2 道 🔥 高频题的最小实现
- [ ] 能结合自己的项目讲出 1 个坑或 1 次调优

