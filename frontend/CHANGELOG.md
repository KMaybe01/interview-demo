## 1.0.0 (2026-07-01)

### Features

* add AI Demo page with 6-tab agent management interface ([f4ab8ee](https://github.com/KMaybe01/interview-demo/commit/f4ab8ee32c97034d0b224f9834caa4bfaf1ef9ad))
* add Swagger/OpenAPI docs for all handler endpoints ([83a7141](https://github.com/KMaybe01/interview-demo/commit/83a7141c71e00778789496421132815ff8541465))
* migrate AI Agent backend (chat, knowledge base, models, agents) from AI-Agent-Demo ([f0dc1b7](https://github.com/KMaybe01/interview-demo/commit/f0dc1b7f1c18c80513dbaed51d29b0678928b01f))

### Bug Fixes

* 从环境变量读取 JWT 密钥和登录凭据，校验 JWT 签名算法，加固 CORS/WebSocket 来源校验 ([e713b05](https://github.com/KMaybe01/interview-demo/commit/e713b056a85248923c1b67185db4869a8575fc1e))
* 修复 ProcessPayment goroutine 泄漏，添加 context 取消；usedRefreshTokens 添加 TTL 清理；payment.go 改用 RWMutex 处理读场景 ([409607b](https://github.com/KMaybe01/interview-demo/commit/409607b9646be8dbb01a2e5179eef1c9d18f7bdf))
* 修复所有被忽略的错误 — json.Marshal、WriteFile、token 创建错误不再忽略 ([ac587b1](https://github.com/KMaybe01/interview-demo/commit/ac587b14abb3943376af410e453893e1dbaea1da))
* 移除非 main 包中的 log.Fatalf；用 sync.Once 替代 init() 副作用；端口从环境变量读取 ([af312ce](https://github.com/KMaybe01/interview-demo/commit/af312ce2cedd59cf4586be6f42f1e99bcb09235f))
* ai chat dark mode support - replace hardcoded colors with antd theme tokens ([6175495](https://github.com/KMaybe01/interview-demo/commit/61754954fdec54e0387729608c1f56687db8df8d))
* ai demo page dark mode support for tabs and dashboard feature cards ([e55bc9b](https://github.com/KMaybe01/interview-demo/commit/e55bc9beb74e84a5f54abceccd6c89b76eb31dd5))
* code review optimization - bug fixes and architecture improvements ([5ead874](https://github.com/KMaybe01/interview-demo/commit/5ead874f6755efcf07e530c1f6d1f95a8648a272))
* dynamicForm infinite loop in runAjvValidation useEffect ([7d43faf](https://github.com/KMaybe01/interview-demo/commit/7d43fafd28e86ab807f8f671cb09000cedc6d625))
* increase access token lifetime and fix hydrate to prevent auto-logout ([5769a6e](https://github.com/KMaybe01/interview-demo/commit/5769a6edf41f3c63579798a829ced02017505089))
* move vitals endpoints out of auth group so page tracking works without login ([7867df7](https://github.com/KMaybe01/interview-demo/commit/7867df7413522f01181b5eb33e7419dfaea27700))
* payment.go data race - 值拷贝分离读写锁，消除 ProcessPayment goroutine 并发竞争 ([2ce4446](https://github.com/KMaybe01/interview-demo/commit/2ce44461beaadaff40092b36090a8ed3f382b127))
