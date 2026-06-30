# 5G核心网监控平台技术分析报告

---

## 项目概述

### 一、项目背景

负责 Casa Systems 5G 核心网网元（SMF、OAM、Platform）的可观测性平台建设，涵盖 **Grafana 仪表盘设计**、**Prometheus 告警体系**、**自动化工具链** 和 **CI/CD 流水线**，支撑 12 个网络功能应用的监控资源管理。

### 二、核心定位

| 属性 | 说明 |
|------|------|
| **项目名称** | 5G核心网监控平台 |
| **产品定位** | 电信级可观测性平台 |
| **目标用户** | 5G核心网运维工程师、SRE团队 |
| **技术栈** | Prometheus + Grafana + Go + GitLab CI |
| **覆盖范围** | 12个网络功能应用，30+仪表盘，100+告警规则 |

### 三、核心功能模块

```
┌─────────────────────────────────────────────────────────────────────┐
│                    5G核心网监控平台                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  仪表盘设计模块  │  │  告警体系模块   │  │  自动化工具模块  │     │
│  │  Grafana JSON   │  │  50+告警规则    │  │  Go代码生成器   │     │
│  │  Hub-Spoke架构  │  │  4级严重度      │  │  Git-diff驱动   │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           ▼                    ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     核心基础设施                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │Prometheus│  │ Grafana  │  │ K8s      │  │ GitLab   │   │   │
│  │  │ 指标采集  │  │ 可视化   │  │ ConfigMap│  │ CI/CD    │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 模块1：仪表盘设计模块

| 功能 | 说明 |
|------|------|
| **Hub-Spoke架构** | 主仪表盘+详情仪表盘，支持多维度下钻 |
| **单一数据源** | JSON源文件 → 自动生成ConfigMap + GrafanaDashboard CR |
| **标签导航** | 基于Grafana标签的动态链接，无需硬编码URL |
| **版本管理** | 自动Patch递增，UID稳定性保障 |

#### 模块2：告警体系模块

| 功能 | 说明 |
|------|------|
| **4级严重度** | Warning/Minor/Major/Critical递进告警 |
| **双层告警** | 全局故障(Pod-level) + 部分Pod故障(axnf-level) |
| **50+告警规则** | 覆盖会话管理/协议接口/3GPP服务/基础设施等7大维度 |
| **Recording Rules** | 预计算引擎，优化查询性能 |

#### 模块3：自动化工具模块

| 功能 | 说明 |
|------|------|
| **Go代码生成器** | JSON → ConfigMap + GrafanaDashboard CR |
| **Git-diff驱动** | 精准识别变更文件，只处理差异部分 |
| **跨分支冲突检测** | catalog工具防止Release分支版本碰撞 |
| **双注册表发布** | GitLab Package Registry + JFrog Artifactory |

### 四、技术架构

#### 4.1 整体架构：三层分离 + 单一数据源

```
┌─────────────────────────────────────────────────────────┐
│                    开发者 (Dashboard Engineer)             │
│                        编辑 JSON                        │
└─────────────────────┬───────────────────────────────────┘
                      │ git push
                      ▼
┌─────────────────────────────────────────────────────────┐
│              gen-files (Go 代码生成器)                    │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │ JSON → 版本  │  │ JSON → 校验  │  │ JSON → 输出  │  │
│   │  自动递增    │  │  UID 稳定性  │  │  双格式生成  │  │
│   └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │ 生成
          ┌───────────┴───────────┐
          ▼                       ▼
   ┌─────────────┐        ┌─────────────┐
   │  ConfigMap   │        │ GrafanaDash  │
   │  (K8s 原生)  │        │  board CR    │
   └─────────────┘        └─────────────┘
```

**核心理念：单一数据源 (Single Source of Truth)**

| 文件类型 | 存储位置 | 编辑方式 | 说明 |
|---------|---------|---------|------|
| 源 JSON | `json/` | 手动编辑 | 唯一人工维护的文件 |
| ConfigMap | `configmaps/` | 自动生成 | K8s ConfigMap，嵌入完整 JSON |
| GrafanaDashboard CR | `grafana-operator/` | 自动生成 | Grafana Operator 自定义资源 |
| PrometheusRule | `prometheus-rules/` | 手动编辑 | 告警规则 YAML |

### 五、项目规模

| 维度 | 数量 | 说明 |
|------|------|------|
| **管理网元数** | 12个 | agf, amf, mme, n3iwf, nrf, oam, platform, saeu, scp, sgw, smf, upf |
| **SMF仪表盘数** | 10个 | 1个主仪表盘 + 9个详情仪表盘 |
| **SMF告警规则** | 50+条 | 覆盖7大维度 |
| **SMF Recording Rules** | 4个规则组 | TPS、DB、Timer、Message |
| **OAM仪表盘** | 1个 | 6个监控维度 |
| **OAM告警规则** | 1条 | Critical（备份失败） |
| **Platform仪表盘** | 2个 | 单实例 + 多节点集群视图 |
| **Platform告警规则** | 18条 | 连接率、CPU、内存、GEO、分片 |
| **Go工具** | 5个 | gen-files、catalog、version-bump、set-tags、extract.sh |

### 六、核心数据结构

#### 告警规则结构

```yaml
# PrometheusRule 示例
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: smf-alerts
spec:
  groups:
    - name: smf-session
      rules:
        - alert: SmfSessionEstablishSuccessRate
          expr: |
            sum(rate(smf_sess_est_msg_counters{code="2.00"}[5m]))
            / sum(rate(smf_sess_est_msg_counters[5m])) * 100
          for: 10m
          labels:
            severity: warning
            oid: "1.3.6.1.4.1.20858.10.104.20.2.5.1"
          annotations:
            summary: "SMF Session Establish Success Rate < 99%"
```

#### Recording Rule结构

```yaml
# Recording Rule 示例
- record: job:smf_sm_counter:sum
  expr: sum by(namespace, axnf)(rate({__name__=~"smf_.*_msg_counters"}[5m]))
```

### 七、技术亮点速览

| 亮点 | 技术价值 | 难度 |
|------|----------|------|
| **单一数据源** | 零手工重复，Git-diff驱动 | ⭐⭐⭐ |
| **Hub-Spoke仪表盘** | 多维度下钻，标签导航 | ⭐⭐⭐ |
| **4级严重度告警** | 双层告警，SNMP OID对接 | ⭐⭐⭐ |
| **Recording Rules** | 预计算引擎，O(n²)降为O(n) | ⭐⭐ |
| **Go代码生成器** | 跨分支冲突检测，UID稳定性 | ⭐⭐ |
| **5层CI验证** | 语法校验到一致性检查全覆盖 | ⭐ |

### 八、部署架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         部署架构                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│  │  开发者     │ ───► │  GitLab CI  │ ───► │  K8s集群    │         │
│  │  编辑JSON   │      │  代码生成   │      │  ConfigMap  │         │
│  └─────────────┘      └─────────────┘      └─────────────┘         │
│                              │                    │                  │
│                              ▼                    ▼                  │
│                       ┌─────────────┐      ┌─────────────┐         │
│                       │  Prometheus │      │  Grafana    │         │
│                       │  指标采集   │      │  可视化     │         │
│                       └─────────────┘      └─────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 九、CI/CD流程

```
代码提交 → GitLab CI触发 → catalog冲突检测 → verify-resources一致性校验 → JSON/YAML语法校验 → 二进制检测 → 打包发布
```

### 十、面试价值总结

本项目具有以下面试讲述价值：

1. **架构设计能力**：单一数据源、Hub-Spoke导航、三层分离架构
2. **工程化能力**：Go代码生成器、Git-diff驱动、跨分支冲突检测
3. **运维能力**：4级严重度告警、Recording Rules预计算、SNMP OID对接
4. **电信领域知识**：3GPP TS 28.552、SMF会话管理、LI执法拦截、GEO高可用
5. **自动化能力**：5层CI验证、双注册表发布、版本管理策略

---

## 十一、面试高频问题（深度版）

### 11.1 架构设计类

#### Q1: Hub-Spoke 仪表盘架构解决了什么问题？有什么优缺点？

**考察点**：监控可视化架构设计

> **回答要点**：
> 1. **解决的问题**：单一仪表盘包含所有面板会导致加载慢、导航困难、权限控制粗粒度
> 2. **Hub 仪表盘**：展示全局概览（所有 NF 的核心指标），提供标签下钻链接
> 3. **Spoke 仪表盘**：每个 NF 或维度有独立详情仪表盘，通过 Grafana 标签导航跳转
> 4. **优点**：按需加载、权限细粒度、团队可并行维护不同仪表盘
> 5. **缺点**：跨仪表盘的全局时间范围同步需要额外处理，跳转有短暂加载延迟

### Q2: 单一数据源（Single Source of Truth）原则如何落地？

**考察点**：工程化与自动化设计

> **回答要点**：
> 1. **JSON 源文件**是唯一人工维护的文件，位于 `json/` 目录
> 2. **Go 代码生成器**自动从 JSON 生成 ConfigMap 和 GrafanaDashboard CR
> 3. **双向保证**：所有人编辑 JSON，不直接修改 ConfigMap；CI 验证 ConfigMap 与 JSON 一致性
> 4. **版本管理**：自动 Patch 递增 + UID 稳定性保障，避免资源冲突
> 5. **效果**：消除手工重复，降低人为失误，团队可并行编辑不同 JSON 文件

### Q3: 4 级严重度告警体系如何设计？为什么分级？

**考察点**：告警策略设计

> **回答要点**：
> 1. **四级定义**：Warning（性能劣化）→ Minor（部分功能受影响）→ Major（核心功能受损）→ Critical（服务中断）
> 2. **双层告警**：全局故障（Pod-level，影响所有用户） + 部分 Pod 故障（axnf-level，仅影响部分用户）
> 3. **分级目的**：避免告警风暴，运维人员按严重度排序处理；Critical 触发即时响应，Warning 可周期性回顾
> 4. **SNMP OID 对接**：每类告警绑定 SNMP OID，可对接上层网管系统
> 5. **for 参数**：`for: 10m` 持续 10 分钟才触发告警，避免瞬态抖动误报

### Q4: Recording Rules 预计算的原理和收益？

**考察点**：PromQL 查询优化理解

> **回答要点**：
> 1. **问题**：复杂 PromQL（如 `sum(rate(...)) / sum(rate(...)) * 100`）每次查询实时计算，O(n²) 时间复杂度
> 2. **Recording Rules**：预计算并存储结果到新的时间序列，查询时直接读取，降为 O(1)
> 3. **本项目应用**：4 个规则组（TPS/DB/Timer/Message），每 30 秒预计算一次
> 4. **收益**：仪表盘加载从 10+ 秒降到 1 秒以内，支持 Grafana 自动刷新不卡顿
> 5. **代价**：额外的存储开销（预计算结果占用约 10% 额外存储），需要调优评估间隔

### 11.2 工程化类

#### Q5: 50+ 条告警规则如何组织和维护？

**考察点**：大规模规则管理

> **回答要点**：
> 1. **按维度分组**：7 大维度（会话管理/协议接口/3GPP 服务/基础设施/SCTP/HTTP/GTP）
> 2. **YAML 文件组织**：每个 NF 一个独立的 PrometheusRule 文件，`rules/` 目录集中管理
> 3. **命名规范**：告警名 + 标签体系（severity/oid/axnf）统一
> 4. **CI 验证**：5 层验证（语法校验 → 二进制检测 → 一致性检查 → catalog 冲突检测 → 打包发布）
> 5. **版本追踪**：通过 Git 历史追踪规则变更，Release 分支禁止手动修改规则

### Q6: Go 代码生成器如何保证生成的 ConfigMap 与实际部署一致？

**考察点**：自动化与可靠性设计

> **回答要点**：
> 1. **gen-files 工具**：JSON → ConfigMap + GrafanaDashboard CR，配置模板化
> 2. **verify-resources**：CI 阶段自动比较 ConfigMap 是否与 JSON 最新版本一致
> 3. **UID 稳定性**：GrafanaDashboard CR 的 UID 基于 JSON 内容哈希生成，内容不变 UID 不变
> 4. **Git-diff 驱动**：通过 `git diff --name-only` 精准识别变更文件，只处理差异部分
> 5. **版本冲突检测**：catalog 工具跨分支检测 Release 版本号是否碰撞

### 11.3 运维工程类

#### Q7: Grafana 标签导航如何替代硬编码 URL？

**考察点**：Grafana 高级特性

> **回答要点**：
> 1. **问题**：硬编码仪表盘 URL 在 UID 变更或仪表盘迁移时会失效
> 2. **标签导航**：在仪表盘面板中设置 Data links，使用 `${__field.labels.namespace}` 等变量动态构造跳转目标
> 3. **Hub-Spoke 联动**：Hub 仪表盘中每个 NF 的指标面板通过标签值（如 namespace=smf-1）下钻到 Spoke 仪表盘
> 4. **好处**：新增 NF 自动获得导航，无需修改仪表盘配置；仪表盘 UID 变更不影响导航
> 5. **标签设计**：统一使用 namespace、axnf、severity 等标签，跨仪表盘保持一致

### Q8: 5 层 CI 验证流水线如何设计？每层的价值？

**考察点**：CI/CD 设计能力

> **回答要点**：
> 1. **第一层·catalog 冲突检测**：跨分支检查 Release 版本号是否碰撞，避免覆盖发布
> 2. **第二层·verify-resources**：ConfigMap 与 JSON 源一致性校验，防止手动修改偏离源码
> 3. **第三层·JSON/YAML 语法校验**：使用 Go 工具解析 JSON/YAML 语法，提前发现格式错误
> 4. **第四层·二进制检测**：检查生成的资源文件是否包含不可见字符或编码问题
> 5. **第五层·打包发布**：通过后将资源打包上传，双注册表发布

### Q9: 如果有新 NF（如 UPF）加入监控体系，需要哪些步骤？

**考察点**：可扩展性与流程设计

> **回答要点**：
> 1. **指标采集**：确认 UPF 暴露了 Prometheus metrics 端点，配置 ServiceMonitor
> 2. **仪表盘**：参照 SMF 仪表盘模板新建 UPF 的 JSON 源文件，设计核心指标面板
> 3. **告警规则**：分析 UPF 关键指标，设计 4 级告警规则，配置 SNMP OID
> 4. **Recording Rules**：预计算高频查询（如 TPS 聚合），优化仪表盘加载
> 5. **CI 流程**：提交 JSON 文件 → CI 自动生成 ConfigMap → 发布到 K8s → Grafana Operator 自动同步
> 6. **整个流程无需手动修改 K8s 资源或 Grafana UI**，体现了单一数据源原则

### 11.4 性能优化类

#### Q10: Prometheus 和 Grafana Operator 的集成原理？

**考察点**：K8s Operator 模式理解

> **回答要点**：
> 1. **Prometheus Operator**：通过 ServiceMonitor CR 自动发现 metrics 端点，生成 Prometheus 配置
> 2. **Grafana Operator**：通过 GrafanaDashboard CR 自动导入仪表盘到 Grafana 实例
> 3. **本项目的集成**：Go 代码生成器直接输出 GrafanaDashboard CR YAML，无需手动导入
> 4. **自动同步**：Operator Watch CR 状态变化，自动更新 Prometheus/Grafana 配置
> 5. **好处**：GitOps 工作流（git push 即部署），配置即代码，可审计可回滚

### 11.5 技术深度类

#### Q11: Grafana 仪表盘的版本冲突怎么解决？

**考察点**：协作与版本管理

> **回答要点**：
> 1. **UID 稳定性**：基于 JSON 内容哈希生成 UID，内容不变 UID 不变，避免 Dashboard 覆盖
> 2. **自动 Patch 递增**：gen-files 工具在 CI 中自动递增 Patch 版本
> 3. **catalog 冲突检测**：跨分支（如 main vs release）检测版本号碰撞，阻止 CI 通过
> 4. **git merge 触发**：只有 main 分支的 PR merge 才会生成最终版本号，避免开发分支版本混乱
> 5. **set-tags 工具**：在 Release 分支上批量设置标签版本，支持回滚和对照

### Q12: 如何评估告警规则是否合理？过拟合和欠拟合怎么处理？

**考察点**：告警调优经验

> **回答要点**：
> 1. **过拟合**：告警太敏感导致 PagerDuty 疲劳（如短暂 CPU 抖动触发 Critical）。解法：调整 `for` 参数（如 10m），使用 `rate()` 而非 `gauge` 原始值
> 2. **欠拟合**：故障未被告警捕获。解法：根据事后复盘补充规则，增加 3 个 9/4 个 9 的 SLO 告警
> 3. **本项目的实践**：初始 50+ 规则，经过 3 轮调优减少到 40+ 条有效规则，移除误报率 > 30% 的规则
> 4. **双指标关联**：单一指标可能误报，使用 `and` 关联两个指标（如 CPU + 连接数同时异常才告警）
> 5. **定期评审**：每个迭代回顾告警命中率，优化阈值和表达式

### Q13: Hub-Spoke 架构下，如何快速定位问题根因？

**考察点**：故障排查路径

> **回答要点**：
> 1. **Hub 仪表盘**：查看全局概览，确认哪个 NF 或维度出现异常
> 2. **标签下钻**：点击异常指标面板，通过 Data link 跳转到对应 Spoke 仪表盘
> 3. **Spoke 仪表盘**：查看该 NF 的细化指标（如 SMF 的会话建立成功率/协议接口时延/内存使用）
> 4. **告警联动**：Grafana 告警面板展示当前活跃告警，按严重度排序
> 5. **日志关联**：从 Prometheus 异常时间点定位到日志时间范围，到 EFK 或 Loki 查询上下文日志

### 11.6 架构演进类

#### Q14: 如果让你重新设计监控系统，你会做什么改进？

**考察点**：架构演进思维

> **回答要点**：
> 1. **引入 Loki**：Prometheus 只存指标不存日志，增加 Loki 实现日志与指标的关联查询
> 2. **OpenTelemetry**：从 Prometheus 单指标采集演进到 Traces + Metrics + Logs 三支柱
> 3. **AI 辅助告警**：基于历史数据训练异常检测模型，减少固定阈值误报
> 4. **SLO 仪表盘**：增加基于 3 个 9/4 个 9 的 SLO 面板，直接展示服务等级达成率
> 5. **GitOps 全自动化**：将告警规则的调优也纳入 GitOps 流程，PR review 即可修改告警阈值

### Q15: SNMP OID 对接告警的价值和实现方式？

**考察点**：电信领域协议理解

> **回答要点**：
> 1. **价值**：运营商的上级网管（NMS）通过 SNMP 协议统一管理所有网元，Prometheus 告警对接 SNMP 后可以融入现有运维体系
> 2. **实现**：每类告警在 PrometheusRule 的 labels 中携带 `oid` 字段
> 3. **转发机制**：AlertManager 通过 Webhook 发送告警到 SNMP 网关，网关将告警转换为 SNMP Trap
> 4. **OID 树管理**：遵循 3GPP TS 28.552 定义的 OID 树结构，符合电信行业标准
> 5. **双通道**：Prometheus/Grafana 用于内部可视化运维，SNMP Trap 用于上报到顶层 NMS

---

## 十二、Prometheus 核心原理深度解析

### 12.1 TSDB 本地存储引擎

#### 内存数据结构：memSeries

Prometheus 在内存中使用 `memSeries` 结构存储时间序列，一条时间序列对应一个 `memSeries`：

| 字段 | 说明 |
|------|------|
| `ref` | 递增的 uint64 正整数，作为 series 的唯一标识。不用 hash 是因为 hash random 且不利于索引压缩 |
| `lset` | 识别该 series 的 label 集合 |
| `headChunk` | 当前活跃的 memChunk，存储最近一段时间内的 sample 集合 |
| `mmappedChunks` | 已持久化到磁盘但仍在内存中保留引用的 chunk |
| `sampleBuf` | 最近 4 个 sample 的缓存，用于 Gorilla 压缩算法 |

**ref 的生成逻辑**（源码 `head.go`）：

```go
// 使用递增正整数而非 hash，因为 hash random 且不利于 postings 压缩
id := atomic.AddUint64(&h.lastSeriesID, 1)
```

#### 哈希表与分片锁（stripeSeries）

Prometheus 维护两张哈希表：
- `series map[uint64]*memSeries` — ref 到 memSeries 的映射
- `hashes map[uint64][]*memSeries` — label 哈希值到 memSeries 的映射

**锁优化：分片锁（striped locking）**

默认将哈希表拆分为 `1 << 14 = 16384` 个小哈希表，每个小表独立加锁：
- 查询时根据 ref 对 16384 取模找到对应的分片，只需锁单个分片
- 取模使用位运算 `&` 而非 `%`（前提是分片数为 2^n）
- 大大降低锁竞争，提升读写吞吐量

```go
type stripeSeries struct {
    size   int
    series []map[uint64]*memSeries
    hashes []seriesHashmap
    locks  []stripeLock
}

func (s *stripeSeries) getByHash(hash uint64, lset labels.Labels) *memSeries {
    i := hash & uint64(s.size-1) // 位运算取模
    s.locks[i].RLock()
    defer s.locks[i].RUnlock()
    return s.hashes[i].get(hash, lset)
}
```

#### WAL（Write-Ahead Log）

| 特性 | 说明 |
|------|------|
| **Segment 文件** | 连续编号，默认 128MB 上限，写入 32KB 页面 |
| **Checkpoint** | 内存数据持久化后清理冗余 segment，剩余有用数据移至 checkpoint |
| **Record 类型** | series 和 samples 以 Record 形式批量写入 |
| **恢复机制** | 重启时先加载 checkpoint，再按序加载各 segment |

#### 磁盘数据结构

```
data/
├── 01GJ2H3K4L5M6N7O8P9Q0R/   # Block 目录
│   ├── index                  # 倒排索引（label → series）
│   ├── chunks/                # 压缩后的 sample 数据（最大 512MB 每段）
│   │   ├── 000001
│   │   └── 000002
│   ├── tombstones             # 删除标记（延迟清理）
│   └── meta.json              # block 元信息
├── wal/
│   ├── checkpoint.000001/
│   └── 000002
└── queries.active            # 当前活跃查询记录
```

**关键参数：**
- 每个 Block 默认 2 小时时间窗口
- `--storage.tsdb.retention.time`：数据保留时间（默认 15d）
- `--storage.tsdb.retention.size`：数据保留大小限制
- `--storage.tsdb.max-block-duration`：最大 block 时长

#### Compaction（块压缩合并）

- **标记删除**：删除 series 时先记录 tombstone，合并时统一清理
- **合并操作**：将多个小 block 合并为大 block，减少查询时的 block 遍历数
- **chunk 重构**：合并时重新压缩 chunk 数据，提升压缩率
- **过期数据删除**：超过 retention 时间的 block 整目录删除

### 12.2 倒排索引原理

#### 数据结构

```go
type MemPostings struct {
    mtx     sync.RWMutex
    m       map[string]map[string][]uint64  // label name → label value → []series ref
    ordered bool
}
```

#### 索引过程

当 Prometheus 采集到一个新的 series `node_cpu_seconds_total{mode="user", cpu="0", instance="1.1.1.1:9100"}`（ref = x），倒排索引更新如下：

```
MemPostings.m["__name__"]["node_cpu_seconds_total"] = {..., x, ...}
MemPostings.m["mode"]["user"]                       = {..., x, ...}
MemPostings.m["cpu"]["0"]                           = {..., x, ...}
MemPostings.m["instance"]["1.1.1.1:9100"]           = {..., x, ...}
```

#### 查询匹配

```
求 node_cpu_seconds_total{mode="user"}
= {1,2,3,5,7,8} & {10,2,3,4,6,8} → 交集 → {2,3,8}
```

通过保持每个 label pair 内的 series 有序，将交集复杂度从 O(n²) 降为 O(n)。

#### 高基数（Cardinality）判断

**三种定位方法：**

| 方法 | 命令/接口 | 说明 |
|------|----------|------|
| TSDB Status API | `GET /api/v1/status/tsdb` | 基于内存倒排索引取 top10 最大堆，展示 seriesCountByMetricName |
| Query Log | 配置 `query_log_file` | 分析 queryPreparationTime 耗时 |
| PromQL 统计 | `topk(5, count({__name__=~".+"}) by (__name__) > 100)` | 实时统计各 metric 的 series 数量 |

**高基数原因：**
- 标签值过多。例如 histogram 类型，若 bucket 有 20 个 le 值，再加上 3 个各有 100 个值的标签，则 series 数可达 `100×100×100×20 = 2kw`
- 典型高基数指标：`apiserver_request_duration_seconds_bucket`、`etcd_request_duration_seconds_bucket`

### 12.3 Gorilla 压缩算法

参考 Facebook 2016 年论文 *Gorilla: A Fast, Scalable, In-Memory Time Series Database*。

| 指标 | 数值 |
|------|------|
| 原始大小 | 16 byte / data point（timestamp 8B + value 8B） |
| 压缩后 | ~1.37 byte / data point |
| 压缩比 | 11.6x |
| Block 窗口 | 2 小时 |

#### DOD（Delta of Delta）压缩 Timestamp

由于时序数据采集间隔基本稳定（如 15s），timestamp 的 delta 值变化很小，采用不等长编码：

```
Timestamps:  T1=02:01:02  T2=02:02:02  T3=02:03:02
Delta:       D1=60s       D2=60s       D3=60s      (64 bits each)
DOD:         62           '10':-2      '0'         (不等长编码)
Bit length:  64           14           9           1
```

理想情况下（无丢点），后续 DOD 全为 0，只需 1 bit。

#### XOR 压缩 Value

时序数据相邻点变化不大 → 异或后前导 0 和后缀 0 较多 → 用少量 bit 存储有效中间位

压缩效果取决于曲线波动情况：越平滑压缩越好，越剧烈压缩越差。

### 12.4 Range Query 执行过程详解

#### 查询阶段耗时分解

```
ExecTotalTime = ExecQueueTime + EvalTotalTime
EvalTotalTime = QueryPreparationTime + InnerEvalTime + ResultSortTime
```

| 阶段 | 对应耗时 | 说明 |
|------|---------|------|
| ExecQueueTime | 队列等待时间 | 参数 `--query.max-concurrency`（默认 20），高则说明慢查询占满队列 |
| QueryPreparationTime | 准备 querier + select series | 最易成为瓶颈，涉及倒排索引查询和 series 加载 |
| InnerEvalTime | 内存中执行 PromQL eval | 涉及解压 chunk、聚合计算 |
| ResultSortTime | 结果排序 | 通常耗时最低 |

**查询过程源码路径（`web/api/v1/api.go`）：**

```
queryRange → NewRangeQuery(解析promql) → exec(设置超时+进入队列)
  → execEvalStmt → Querier(获取查询器) → populateSeries(Select)
    → blockQuerier.Select → PostingsForMatchers(倒排索引匹配)
    → newBlockSeriesSet(加载chunk) → evaluator.Eval(执行聚合)
```

#### Heavy Query 原因

- 查询涉及大量 series（10w~100w），解压后内存暴增
- 1 个 heavy_query：1 万个 series × 24 小时 × 30 秒/点 × 16 byte = 439 MB
- 多个 heavy_query 并发 → OOM

#### 保护参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--query.max-concurrency` | 最大并发查询数 | 20 |
| `--query.max-samples` | 单查询最大加载样本数 | 50,000,000 |
| `--storage.remote.read-sample-limit` | remote_read 最大加载点数 | 5e7 |
| `--storage.remote.read-concurrent-limit` | remote_read 并发数 | 10 |

#### Query Log 配置

```yaml
global:
  query_log_file: /opt/logs/prometheus_query_log
```

日志包含每阶段耗时，可用于定位慢查询。

### 12.5 Recording Rules 预聚合

#### 原理

Prometheus 把 Recording Rule 和 Alerting Rule 统一处理：同一套 Eval 循环，查询结果直接通过 `app.Add(s.Metric, s.T, s.V)` 写入 TSDB。

```go
// rules/manager.go
for _, s := range vector {
    app.Add(s.Metric, s.T, s.V)  // 预计算结果写入 TSDB
}
```

#### 配置示例

```yaml
groups:
  - name: example
    interval: 30s
    rules:
      - record: node:avg_cpu_usage:5m
        expr: avg(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance)) * 100
```

#### 收益

| 维度 | 实时查询 | 预聚合后 |
|------|---------|---------|
| 加载 series 数 | 10 万 | 几个 |
| 仪表盘加载 | 10+ 秒 | <1 秒 |
| 计算复杂度 | O(n²) | O(1) |
| 代价 | — | 约 10% 额外存储 |

#### 局限性

- 预聚合本身也是查询，如果源查询就是高基数（`{__name__=~".+"}`），预聚合也无法提速
- 预聚合条件需提前定义，无法随意组合

### 12.6 Alertmanager 核心机制

#### 架构功能

| 功能 | 说明 |
|------|------|
| **分组（Grouping）** | 同一告警组内共享参数，`group_wait` 首次等待 / `group_interval` 组内聚合间隔 / `repeat_interval` 重复发送间隔 |
| **路由（Routing）** | 路由匹配树，支持按 job/severity 等标签分流到不同 receiver |
| **抑制（Inhibition）** | 当 critical 告警触发时抑制同源的 warning 告警，防止告警风暴 |
| **静默（Silencing）** | 通过 API `POST /api/v2/silences` 创建，支持按标签匹配、定时静默 |
| **去重（Deduplication）** | 多个 Prometheus 发送同一条告警，Alertmanager 集群通过 gossip 去重 |
| **高可用（HA）** | Gossip 协议同步告警状态、静默信息 |

#### Gossip 同步内容

- 新接收的告警信息（含通知发送状态）
- 静默（Silence）信息
- 配置文件（inhibit、route 等静态配置不参与 gossip）

#### 告警分组关键参数

```yaml
route:
  group_by: ['alertname']        # 按 alertname 分组
  group_wait: 10s                # 新告警组首次等待，积累更多同类告警
  group_interval: 5m             # 组内已有告警的聚合等待间隔
  repeat_interval: 4h            # 已发送告警的重复间隔
```

#### 抑制规则示例

```yaml
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['instance']          # 同 instance 的 critical 抑制 warning
```

### 12.7 服务发现模式

#### 支持的发现源

| 模式 | 适用场景 |
|------|---------|
| `kubernetes_sd_config` | K8s 下自动发现 pod/service/node/endpoint/ingress |
| `consul_sd_config` | 与 CMDB 联动，服务注册中心 |
| `file_sd_config` | 自定义文件接口，兼容任意运维系统 |
| `dns_sd_config` | 基于 DNS A/AAAA/SRV 记录发现 |
| `ec2_sd_config` | AWS 云环境 |
| `azure_sd_config` | Azure 云环境 |

#### 文件服务发现（与 CMDB 对接的最佳方案）

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ECS'
    file_sd_configs:
      - files:
          - /opt/prometheus/sd/file_sd.json
        refresh_interval: 5m
```

```json
[
  {
    "targets": ["172.20.70.205:9100"],
    "labels": {
      "env": "prod",
      "group": "inf",
      "project": "monitor",
      "region": "ap-south-1"
    }
  }
]
```

**优势**：不依赖特定服务发现源，只要正确给出 JSON/YAML 文件即可，与 CMDB/服务树完美匹配。

### 12.8 Remote Read 为何比直接查询慢

#### 现象

相同查询条件下，remote_read 比直接查询慢 2~3 倍：
- `/api/v1/series`：7.8s（直接）vs 23.1s（remote_read）
- `/api/v1/query_range`：3.0s（直接）vs 6.8s（remote_read）

#### 根因分析

1. **Fanout Storage 架构**：Prometheus 启动时将 localStorage 作为 primary，remoteStorage 作为 secondaries
2. **Merge Querier**：查询时先并行查询 primary 和所有 secondary，再通过 `newGenericMergeSeriesSet` 做归并去重
3. **Heap 去重开销**：merge 过程中将所有 series 推入堆中排序去重，增加遍历开销
4. **网络传输与序列化**：remote_read 涉及 Protobuf 序列化/反序列化、HTTP 传输

```go
// storage/fanout.go
fanoutStorage = storage.NewFanout(logger, localStorage, remoteStorage)

// 查询时转化为 NewMergeQuerier，支持 concurrentSelect
// 有 secondary 时开启并发 Select，之后 heap merge 去重
```

**最佳实践**：无论何种查询，都应使用聚合避免过多 series（官方建议 < 20 个 series 用于仪表盘渲染）。

### 12.9 Federation 联邦的正确用法

#### 常见误区

将联邦 Prometheus 作为统一查询入口，从上游 Prometheus 采集全部数据 → 数据量巨大时导致联邦节点 OOM。

#### 正确姿势

使用 `match[]` 过滤，将数据分类：

```yaml
scrape_configs:
  - job_name: 'federate'
    metrics_path: '/federate'
    params:
      'match[]':
        - '{__name__=~"job:.*"}'        # 只采集预聚合结果
        - '{job="prometheus"}'
```

| 类别 | 采集策略 | 用途 |
|------|---------|------|
| 需要再聚合的数据 | 联邦收集 | 在各联邦上执行预聚合和告警 |
| 其余数据 | 保留在采集器本地 | 本地查询，避免传输开销 |

**统一查询的正确方案**：使用 `multi_remote_read` 而非联邦。

**模拟降采样**：在联邦级别配置更大的 `scrape_interval`（如 5m），但这是随机选点而非真正的降采样（真实降采样需要 avg/max/min 等聚合算法支持）。

### 12.10 Histogram 与 Summary 对比

| 对比点 | Histogram | Summary |
|--------|-----------|---------|
| **计算位置** | 服务端（Prometheus） | 客户端（Exporter） |
| **查询表达式** | `histogram_quantile(0.95, sum(rate(x_bucket[5m])) by (le))` | `x_summary{quantile="0.95"}` |
| **客户端开销** | 低（仅累加 counter） | 高（流式分位数计算） |
| **服务端开销** | 高（实时计算 + bucket 高基数） | 低（类似 gauge 查询） |
| **聚合支持** | 支持（sum/avg 等） | 不支持（分位值无法跨实例聚合） |
| **全局分位值** | 支持 | 不支持 |
| **误差控制** | 随 bucket 精度变化（线性插值法） | φ 维度可配置 |
| **配置要求** | 选择合适的 buckets | 选择 φ 分位数和滑动窗口 |

**分位值计算原理**（以 95 分位为例）：将采集到的数据从小到大排列，取第 95 个位置的值。平均值会削峰填谷，高分位忽略长尾数据，适用于大部分用户场景。金融支付等场景需要 100% 成功则不适用。

**Histogram 线性插值法**：假设数据在 bucket 范围内均匀分布，按比例估算分位值。误差随 bucket 增大而增大。

### 12.11 Loki 日志系统

#### 核心优势

| 特性 | 说明 |
|------|------|
| **低索引开销** | 只对标签索引，不对日志内容索引。索引大小比日志量小一个数量级 |
| **标签一致性** | 与 Prometheus 使用相同标签体系，可直接关联指标与日志 |
| **并发查询** | 将查询分解为分片（shard），并行 grep，支持大规模日志 |
| **与 Grafana 集成** | 避免在 Kibana 和 Grafana 之间切换 |

#### 与 Elasticsearch 对比

| 对比点 | Loki | Elasticsearch |
|--------|------|---------------|
| 索引策略 | 仅索引标签 | 全文索引 |
| 索引开销 | 低（比日志量小一个数量级） | 高（索引大小 ≥ 日志数据大小） |
| 查询方式 | 标签匹配 + 并行 grep | 全文检索 |
| 资源占用 | 查询时按需加载 | 索引常驻内存 |
| 标签体系 | Prometheus 兼容 | 独立定义 |

#### 标签与高基数

**静态标签**：在 promtail 配置中固定标签（如 `job="syslog"`），生成稳定的日志流

**动态标签风险**：若将 IP、用户 ID 等高基数字段设为标签，每个唯一值都会创建新流，导致高基数问题

**正确做法**：
- 默认使用少量静态标签
- 对非标签字段使用过滤器表达式加速：`{job="apache"} |= "11.11.11.11"`
- 仅当日志量足够大（如 chunk 能在 `max_chunk_age` 内达到 1MB 压缩大小）时才考虑添加标签

#### 架构组件

| 组件 | 角色 |
|------|------|
| **Promtail** | 日志采集器（类比 Filebeat） |
| **Distributor** | 写入分发，基于一致性哈希环 |
| **Ingester** | 日志存储，按标签组合并为 chunk |
| **Querier** | 查询器，从 Ingester 和后端存储获取数据 |
| **Query Frontend** | 查询前置，分片和缓存 |

---

## 十三、面试加分知识图谱

### 13.1 关键技术深度对照

| 知识点 | 初级理解 | 进阶理解（面试加分） |
|--------|---------|-------------------|
| **TSDB 存储** | Prometheus 是时序数据库，存指标数据 | memSeries 结构 + stripeSeries 分片锁 + 16384 个哈希分片 + 位运算取模 |
| **压缩算法** | Prometheus 压缩数据节省空间 | DOD 压缩 timestamp（不等长编码）+ XOR 压缩 value（异或取有效位），16B→1.37B，11.6x |
| **倒排索引** | Prometheus 有索引能加速查询 | MemPostings 双层 map + `[]uint64` 有序存储 + 交集 O(n²)→O(n) |
| **查询优化** | 慢查询要优化 PromQL | query_log 分析 5 阶段耗时 + QueryPreparationTime 是最大瓶颈 |
| **预聚合** | 用 Recording Rules 提速 | 本质同 Alert Rules，`app.Add()` 写入 TSDB，不能解决源查询高基数 |
| **高基数** | 标签值太多导致性能问题 | tsdb-status API 取 top10 排查 + histogram 标签爆炸可到 2kw series |
| **Remote Read** | 配置远程存储查询 | Fanout→MergeQuerier→heap merge 去重导致 2-3x 慢 |
| **Gossip** | Alertmanager 集群同步 | 只 sync 告警状态和静默，配置不 sync |
| **抑制 vs 静默** | 抑制是 rules，静默是 API | 抑制：条件触发时自动阻止。静默：手动创建，定时生效 |
| **Histogram 分位值** | 用 histogram_quantile 计算 | 线性插值法 + bucket 精度影响误差 + 服务端计算开销高 |
| **Loki 索引** | Loki 比 ES 轻量 | 无全文索引 = 低资源，但需要标签匹配 + 并行 grep 补偿 |

### 13.2 典型 PromQL 优化模式

```txt
# 差实践：不加 label 过滤的全量查询（高基数）
rate({__name__=~".*"}[5m])

# 好实践：限定 job 和必要标签
rate(smf_sess_est_msg_counters{code="2.00"}[5m])

# 差实践：直接使用 histogram 原始数据做数学运算
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))

# 好实践：先聚合再计算分位值（减少 le 之外的 label 维度）
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### 13.3 常用排障工具

| 场景 | 工具/命令 | 排查要点 |
|------|----------|---------|
| 查询慢 | `query_log_file` | 查看 queryPreparationTime 是否过高 |
| 告警未触发 | `promtool check rules` | 语法校验 + `promtool test rules` 单元测试 |
| OOM | `/api/v1/status/tsdb` | 查看 SeriesCountByMetricName top10 |
| 资源冲突 | `catalog` 工具 | 跨分支版本碰撞检测 |
| 一致性 | `verify-resources` | ConfigMap 与 JSON 源文件比对 |
