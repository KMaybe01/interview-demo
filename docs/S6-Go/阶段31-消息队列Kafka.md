## 📨 阶段三十一：消息队列 (Kafka)

### Q318: Kafka 是什么？主要应用场景有哪些？

**难度**：⭐⭐ | **频率**：🔥 高频

**考点**：分布式消息队列、高吞吐、持久化

**💡 记忆关键词**：事件流平台、高吞吐、日志收集

**答案要点**：
- Kafka 是分布式事件流平台，高吞吐、持久化、可扩展
- 核心概念：Producer、Consumer、Broker、Topic、Partition
- 应用场景：
  1. 日志收集
  2. 消息系统（解耦、削峰）
  3. 用户活动追踪
  4. 流式处理（Kafka Streams）
  5. 事件溯源

```mermaid
graph TB
    subgraph Producers
        P1[Producer 1]
        P2[Producer 2]
        P3[Producer 3]
    end

    subgraph Kafka_Cluster[Kafka Cluster]
        subgraph Broker_1[Broker 1]
            T1P1[Topic-A P0]
            T2P1[Topic-B P0]
        end
        subgraph Broker_2[Broker 2]
            T1P2[Topic-A P1]
            T2P2[Topic-B P1]
        end
        subgraph Broker_3[Broker 3]
            T1P3[Topic-A P2]
            T2P3[Topic-B P2]
        end
    end

    subgraph Consumers
        C1[Consumer Group A]
        C2[Consumer Group B]
    end

    P1 --> T1P1
    P2 --> T1P2
    P3 --> T1P3
    P1 --> T2P1

    T1P1 --> C1
    T1P2 --> C1
    T1P3 --> C1
    T2P1 --> C2
    T2P2 --> C2
```

**📝 一句话总结**：Kafka 事件流平台，高吞吐持久扩展强；日志消息流处理，五大场景应用广。

---

### Q319: 和其他消息队列相比，Kafka 的优势在哪里？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：吞吐量、持久化、生态对比

**💡 记忆关键词**：十万TPS、磁盘持久、生态丰富

**答案要点**：
- **吞吐量**：单机十万级 TPS，远超 RabbitMQ
- **持久化**：消息持久化到磁盘，支持回溯
- **扩展性**：分布式集群，水平扩展
- **生态**：Connect、Streams、KSQL
- 对比：RabbitMQ（低延迟、复杂路由）、RocketMQ（事务消息、金融级）

**📝 一句话总结**：Kafka 吞吐十万级，磁盘持久可回溯；分布式集群水平扩，生态丰富胜一筹。

---

### Q320: 什么是 Producer、Consumer、Broker、Topic、Partition？

**难度**：⭐⭐ | **频率**：🔥 高频

**考点**：核心概念、角色职责

**💡 记忆关键词**：生产者消费者、Broker节点、Topic分区

**答案要点**：
- **Producer**：消息生产者，发布消息到 Topic
- **Consumer**：消息消费者，从 Topic 订阅消息
- **Broker**：Kafka 服务器节点
- **Topic**：消息分类/主题
- **Partition**：Topic 的分区，实现并行和扩展

**📝 一句话总结**：Producer 生产 Consumer 消，Broker 节点 Topic 分；Partition 并行扩展，五大概念记心间。

---

### Q321: Kafka 的多副本机制了解吗？

**难度**：⭐⭐⭐ | **频率**：🔥 高频

**考点**：Leader、Follower、ISR、同步复制

**💡 记忆关键词**：Leader读写、Follower同步、ISR集合

**答案要点**：
- 每个 Partition 有多个副本（Replica）
- **Leader**：处理读写请求
- **Follower**：从 Leader 同步数据
- **ISR**（In-Sync Replicas）：与 Leader 保持同步的副本集合
- 只有 ISR 中的副本才能被选为 Leader

```mermaid
graph LR
    subgraph Partition_0[Partition 0 Replicas]
        L[Leader<br/>Broker 1]
        F1[Follower 1<br/>Broker 2]
        F2[Follower 2<br/>Broker 3]
    end

    Producer -->|Write| L
    L -->|Replicate| F1
    L -->|Replicate| F2
    Consumer -->|Read| L

    subgraph ISR[In-Sync Replicas]
        L
        F1
        F2
    end

    style L fill:#4CAF50,color:#fff
    style F1 fill:#2196F3,color:#fff
    style F2 fill:#2196F3,color:#fff
```

**📝 一句话总结**：多副本 Leader 读写，Follower 同步 ISR 集；同步副本选 Leader，高可用数据不丢失。

---

### Q322: Kafka 的多分区（Partition）以及多副本（Replica）机制有什么好处？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：并行、负载均衡、高可用

**💡 记忆关键词**：并行消费、水平扩展、高可用冗余

**答案要点**：
- **多分区**：
  1. 并行消费（每个分区只能被消费者组内一个消费者消费）
  2. 水平扩展（分区分布在不同 Broker）
  3. 提高吞吐量
- **多副本**：
  1. 高可用（Leader 故障自动切换）
  2. 数据冗余（防止数据丢失）

**📝 一句话总结**：多分区并行消费，水平扩展吞吐高；多副本高可用强，数据冗余防丢失。

---

### Q323: ZooKeeper 在 Kafka 中的作用知道吗？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：元数据管理、Controller 选举、3.0 移除

**💡 记忆关键词**：元数据存储、Controller选举、KRaft替代

**答案要点**：
- 存储集群元数据（Broker、Topic、Partition 信息）
- Controller 选举（管理分区 Leader 选举）
- Consumer Group 管理（旧版本）
- **Kafka 3.0+**：引入 KRaft 模式，逐步移除 ZooKeeper 依赖

**📝 一句话总结**：ZK 存储元数据，Controller 选举 Leader 管；Kafka 3.0 KRaft 替，去 ZK 化是趋势。

---

### Q324: Kafka 如何保证消息的消费顺序？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：分区有序、全局有序、单分区

**💡 记忆关键词**：单分区有序、key路由、消费者单线程

**答案要点**：
- Kafka 仅保证**单分区内**消息有序
- 全局有序：Topic 仅设 1 个 Partition（牺牲吞吐）
- 局部有序：相同 key 的消息路由到同一 Partition
- 消费者单线程消费单分区保证顺序

**📝 一句话总结**：Kafka 单分区有序，全局有序一 Partition；相同 key 路由同区，单线程消费保顺序。

---

### Q325: Kafka 如何保证消息不丢失？

**难度**：⭐⭐⭐ | **频率**：🔥 高频

**考点**：生产端、Broker、消费端

**💡 记忆关键词**：acks=all、ISR确认、手动提交

**答案要点**：
- **生产端**：`acks=all`（所有 ISR 确认），重试机制
- **Broker**：`min.insync.replicas > 1`，`unclean.leader.election.enable=false`
- **消费端**：手动提交 Offset，处理成功后再提交
- **副本**：多副本机制，防止单点故障

```mermaid
sequenceDiagram
    participant P as Producer
    participant L as Leader
    participant F1 as Follower 1
    participant F2 as Follower 2
    participant C as Consumer

    P->>L: Send Message (acks=all)
    L->>F1: Replicate
    L->>F2: Replicate
    F1-->>L: ACK
    F2-->>L: ACK
    L-->>P: ACK (All ISR confirmed)
    
    Note over L,F2: Message persisted in all ISR
    
    C->>L: Fetch Message
    L-->>C: Return Message
    C->>L: Process Message
    C->>L: Commit Offset
```

**📝 一句话总结**：生产 acks=all 全确认，Broker ISR 最小副本；消费手动提交 Offset，三端配合消息不丢。

---

### Q326: Kafka 判断一个节点是否还活着有哪两个条件？

**难度**：⭐ | **频率**：📖 了解

**考点**：ZK 会话、ISR 列表

**💡 记忆关键词**：ZK心跳、ISR同步、双重判断

**答案要点**：
1. 与 ZooKeeper 保持会话连接（心跳）
2. 在 ISR 列表中（与 Leader 保持同步）
- 不满足任一条件则认为节点宕机

**📝 一句话总结**：ZK 心跳保连接，ISR 列表同步在；双重条件判死活，任一不满足即宕。

---

### Q327: Producer 是否直接将数据发送到 Broker 的 Leader（主节点）？

**难度**：⭐ | **频率**：📖 了解

**考点**：路由、Leader 写入、副本同步

**💡 记忆关键词**：只发Leader、Follower拉取、元数据查询

**答案要点**：
- 是的。Producer 只向 Partition 的 Leader 发送数据
- Follower 从 Leader 拉取数据同步
- Producer 通过元数据查询找到 Leader 所在 Broker

**📝 一句话总结**：Producer 只发 Leader，Follower 拉取来同步；元数据查 Leader 位，写入主节点是规则。

---

### Q328: Kafka Consumer 是否可以消费指定分区消息？

**难度**：⭐ | **频率**：📖 了解

**考点**：assign、分区指定、手动分配

**💡 记忆关键词**：assign手动、subscribe自动、特殊场景

**答案要点**：
- 可以。使用 `consumer.assign()` 手动指定分区
- 通常使用 `subscribe()` 自动分配（消费者组协议）
- 手动分配适用于特殊场景（如按分区处理）

**📝 一句话总结**：Consumer 可指分区，assign 手动 subscribe 自；消费者组自动分配，特殊场景手动选。

---

### Q329: Kafka 高效文件存储设计特点是什么？

**难度**：⭐⭐⭐ | **频率**：📌 常考

**考点**：顺序写、零拷贝、分段索引

**💡 记忆关键词**：顺序写盘、零拷贝sendfile、分段索引

**答案要点**：
- **顺序写磁盘**：比随机写快几个数量级
- **零拷贝**（sendfile）：数据直接从页缓存到网卡
- **分段存储**：每个 Partition 分为多个 Segment
- **索引文件**：.index（偏移量索引）、.timeindex（时间索引）
- **页缓存**：利用 OS 页缓存，减少 IO

**📝 一句话总结**：顺序写盘零拷贝，分段存储索引快；页缓存用减 IO，高效设计是核心。

---

### Q330: Partition 的数据如何保存到硬盘？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：Segment、Log 文件、滚动策略

**💡 记忆关键词**：Segment分段、log+index、滚动清理

**答案要点**：
- 每个 Partition 分为多个 Segment（段）
- 每个 Segment 包含：.log（数据）、.index（偏移量索引）、.timeindex
- 按大小（1GB）或时间（7 天）滚动创建新 Segment
- 旧 Segment 可被清理（Delete/Compact）

**📝 一句话总结**：Partition 分 Segment，log 数据 index 索引；大小时间滚动建，旧段清理 Delete Compact。

---

### Q331: Kafka 生产数据时数据的分组策略是怎样的？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：分区器、key 哈希、轮询

**💡 记忆关键词**：key哈希取模、轮询分配、Sticky分区

**答案要点**：
- 指定 key：`hash(key) % numPartitions`，相同 key 到同一分区
- 未指定 key：轮询（Round-Robin）分配
- 自定义分区器：实现 `Partitioner` 接口
- Sticky Partitioner（0.11+）：减少分区切换

**📝 一句话总结**：有 key 哈希取模分，无 key 轮询平均分；自定义器 Partitioner，Sticky 减少切换频。

---

### Q332: Consumer 是推还是拉？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：Pull 模式、消费速率控制

**💡 记忆关键词**：Pull拉模式、速率自控、长轮询优化

**答案要点**：
- Kafka Consumer 使用 **Pull（拉）** 模式
- 优点：
  1. 消费者控制消费速率
  2. 避免推送过快导致消费者过载
  3. 支持批量拉取
- 缺点：可能拉取为空（通过长轮询优化）

**📝 一句话总结**：Consumer 拉模式 Pull，速率自控不过载；批量拉取效率高，长轮询优化空拉取。

---

### Q333: Kafka 维护消费状态跟踪的方法有什么？

**难度**：⭐⭐ | **频率**：📌 常考

**考点**：Offset、消费者组、自动/手动提交

**💡 记忆关键词**：Offset跟踪、__consumer_offsets、手动提交

**答案要点**：
- 每个 Consumer Group 维护每个 Partition 的 Offset
- Offset 存储在内部 Topic（`__consumer_offsets`）
- **自动提交**：`enable.auto.commit=true`（默认 5s）
- **手动提交**：`commitSync()` / `commitAsync()`
- 重启后从上次提交的 Offset 继续消费

**📝 一句话总结**：Consumer Group 维 Offset，内部 Topic 来存储；自动五秒手动提，重启续消费不丢。

---
