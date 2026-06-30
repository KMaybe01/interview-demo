## 📦 阶段二十六：Redis 缓存与数据结构

### Q190: 什么是 Redis?

**考点**：内存数据库、数据结构服务器、高性能

**答案要点**：
- Redis 是开源的内存数据结构存储系统，可用作数据库、缓存、消息中间件
- 支持多种数据结构：String、Hash、List、Set、ZSet 等
- 单线程模型（6.0+ 引入多线程 IO），性能极高（10w+ QPS）
- 支持持久化（RDB + AOF）、主从复制、集群

```mermaid
graph LR
    Client[客户端] -->|TCP 连接| Redis[Redis Server]
    Redis --> Mem[(内存数据存储)]
    Redis --> RDB[(RDB 快照)]
    Redis --> AOF[(AOF 日志)]
    Redis --> Master[Master 节点]
    Master -->|复制| Slave[Slave 节点]
```

---

### Q191: Redis 的数据类型？

**考点**：5种基础类型+3种特殊类型

**答案要点**：
- **String**：字符串/整数/浮点数，最基础类型
- **Hash**：哈希表，适合存储对象
- **List**：双向链表，支持阻塞操作
- **Set**：无序集合，支持交集/并集/差集
- **ZSet（Sorted Set）**：有序集合，按 score 排序
- **特殊类型**：Bitmap、HyperLogLog、Geo（地理位置）

---

### Q192: 使用 Redis 有哪些好处？

**考点**：性能、数据结构、生态

**答案要点**：
- 极高的读写性能（内存操作）
- 丰富的数据结构，减少应用层复杂度
- 支持持久化，数据不丢失
- 原子操作，天然支持分布式锁
- 发布订阅、Lua 脚本、事务

---

### Q193: Redis 相比 Memcached 有哪些优势？

**考点**：功能对比、数据类型、持久化

**答案要点**：
- Redis 支持更多数据类型（Memcached 仅 String）
- Redis 支持持久化，Memcached 不支持
- Redis 支持主从复制和集群
- Redis 支持 Lua 脚本、事务
- Memcached 多线程，Redis 单线程（6.0+ 多线程 IO）

---

### Q194: Memcached 与 Redis 的区别都有哪些？

**考点**：架构对比、线程模型、场景

**答案要点**：

| 维度 | Redis | Memcached |
|------|-------|-----------|
| 数据类型 | 丰富 | 仅 String |
| 持久化 | 支持 | 不支持 |
| 线程模型 | 单线程+多线程IO | 多线程 |
| 集群 | 原生支持 | 客户端分片 |
| 事务 | 支持 | 不支持 |
| 适用场景 | 缓存/DB/消息 | 纯缓存 |

---

### Q195: Redis 是单进程单线程的？

**考点**：事件循环、6.0 多线程、性能瓶颈

**答案要点**：
- Redis 6.0 之前：单进程单线程，基于 Reactor 事件循环
- Redis 6.0+：网络 IO 多线程，命令执行仍单线程
- 单线程优势：无锁竞争、简单、避免上下文切换
- 瓶颈：单核 CPU 性能上限，大 key 阻塞

```mermaid
graph TD
    subgraph "Redis 6.0+ 架构"
        IO1[IO Thread 1] -->|读取请求| EP[Epoll 事件循环]
        IO2[IO Thread 2] -->|读取请求| EP
        IO3[IO Thread N] -->|读取请求| EP
        EP -->|命令队列| CMD[命令执行线程]
        CMD -->|响应数据| IO1
        CMD -->|响应数据| IO2
        CMD -->|响应数据| IO3
    end
```

---

### Q196: 一个字符串类型的值能存储最大容量是多少？

**考点**：内存限制、SDS 结构

**答案要点**：
- 单个 String 值最大 512MB
- 底层使用 SDS（Simple Dynamic String）
- 实际受限于可用内存

---

### Q197: Redis 的持久化机制是什么？各自的优缺点？

**考点**：RDB、AOF、混合持久化

**答案要点**：
- **RDB**：快照方式，定期保存全量数据
  - 优点：文件小、恢复快、适合备份
  - 缺点：可能丢失最后一次快照后的数据
- **AOF**：追加日志，记录每条写命令
  - 优点：数据安全性高（每秒/每次写入）
  - 缺点：文件大、恢复慢
- **混合持久化**（4.0+）：RDB 快照 + AOF 增量

```mermaid
graph LR
    subgraph "持久化对比"
        RDB[RDB 快照] -->|fork 子进程| Disk1[(RDB 文件)]
        AOF[AOF 日志] -->|追加写入| Disk2[(AOF 文件)]
        Mix[混合持久化] -->|RDB+AOF| Disk3[(混合文件)]
    end
    Disk1 -.恢复快.-> Redis[(Redis)]
    Disk2 -.数据安全.-> Redis
    Disk3 -.最佳实践.-> Redis
```

---

### Q198: Redis 常见性能问题和解决方案

**考点**：大 key、热 key、网络、内存

**答案要点**：
- **大 key**：拆分、压缩、删除
- **热 key**：本地缓存、读写分离、热点探测
- **网络延迟**：同机房部署、连接池、Pipeline
- **内存碎片**：重启、调整内存分配器

---

### Q199: Redis 过期键的删除策略？

**考点**：定期删除、惰性删除、内存淘汰

**答案要点**：
- **定期删除**：每秒随机抽查过期 key 并删除
- **惰性删除**：访问时检查是否过期，过期则删除
- 两者结合：定期删除处理大部分，惰性删除兜底

---

### Q200: Redis 的回收策略（淘汰策略）?

**考点**：8种策略、LRU/LFU

**答案要点**：
- `noeviction`：不删除，返回错误（默认）
- `allkeys-lru`：所有 key 中淘汰最近最少使用
- `volatile-lru`：仅淘汰设置了过期时间的 key
- `allkeys-lfu`：所有 key 中淘汰最少频率使用（4.0+）
- `volatile-lfu`、`allkeys-random`、`volatile-random`、`volatile-ttl`

```mermaid
graph TD
    MaxMem[内存达到 maxmemory] --> Check{淘汰策略}
    Check -->|noeviction| Err[写操作返回错误]
    Check -->|allkeys-lru| LRU1[淘汰最近最少使用的 key]
    Check -->|volatile-lru| LRU2[淘汰设置了过期的 LRU key]
    Check -->|allkeys-lfu| LFU1[淘汰使用频率最低的 key]
    Check -->|volatile-ttl| TTL[淘汰即将过期的 key]
    Check -->|random| Rand[随机淘汰]
```

---

### Q201: 为什么 Redis 需要把所有数据放到内存中？

**考点**：性能设计、持久化补充

**答案要点**：
- 内存访问速度远超磁盘（纳秒 vs 毫秒）
- 单线程模型要求极低延迟
- 持久化作为数据备份，非主要存储
- Redis 7.0+ 实验性支持磁盘存储（非主流用法）

---

### Q202: Redis 的同步机制了解么？

**考点**：全量同步、增量同步、PSYNC

**答案要点**：
- **全量同步**：首次连接或无法增量同步时，Master 生成 RDB 发送给 Slave
- **增量同步**：Master 将写命令传播给 Slave（复制积压缓冲区）
- **PSYNC**：2.8+ 引入，支持部分重同步，减少全量同步

---

### Q203: Pipeline 有什么好处，为什么要用 Pipeline？

**考点**：减少 RTT、批量操作、性能提升

**答案要点**：
- 将多个命令打包一次发送，减少网络 RTT
- 性能提升显著（10x~100x）
- 注意：Pipeline 不是原子操作，大量命令可能阻塞

```go
pipe := client.Pipeline()
for i := 0; i < 1000; i++ {
    pipe.Set(ctx, fmt.Sprintf("key:%d", i), value, 0)
}
pipe.Exec(ctx) // 一次性发送
```

---

### Q204: 是否使用过 Redis 集群，集群的原理是什么？

**考点**：哈希槽、去中心化、Gossip 协议

**答案要点**：
- 16384 个哈希槽，key 通过 CRC16 映射到槽
- 每个节点负责一部分槽
- 去中心化架构，节点间通过 Gossip 协议通信
- 客户端直连目标节点，MOVED/ASK 重定向

```mermaid
graph LR
    subgraph "Redis Cluster 哈希槽分布"
        Key[Key] -->|CRC16| Hash[CRC16 % 16384]
        Hash --> Slot[哈希槽 0-16383]
    end
    subgraph "节点分配"
        Slot --> N1[Node1: 0-5460]
        Slot --> N2[Node2: 5461-10922]
        Slot --> N3[Node3: 10923-16383]
    end
    N1 --> S1[(Slave1)]
    N2 --> S2[(Slave2)]
    N3 --> S3[(Slave3)]
```

---

### Q205: Redis 集群方案什么情况下会导致整个集群不可用？

**考点**：故障转移、槽覆盖、多数派

**答案要点**：
- 某个槽段的所有节点（主从）都宕机
- 超过半数 Master 节点不可用（集群元数据无法达成共识）
- 网络分区导致节点间无法通信

---

### Q206: Redis 支持的 Java 客户端都有哪些？官方推荐用哪个？

**考点**：Jedis、Lettuce、Redisson

**答案要点**：
- **Jedis**：轻量、直接、线程不安全（需连接池）
- **Lettuce**：基于 Netty，线程安全，Spring Boot 默认
- **Redisson**：功能丰富（分布式锁、集合），高级抽象
- 官方推荐：Lettuce（生产环境）

---

### Q207: Jedis 与 Redisson 对比有什么优缺点？

**考点**：API 风格、功能、性能

**答案要点**：
- **Jedis**：API 接近 Redis 命令，轻量快速，功能基础
- **Redisson**：Java 集合风格 API，功能强大（分布式锁、布隆过滤器等），较重
- 选择：简单操作用 Jedis/Lettuce，复杂场景用 Redisson

---

### Q208: Redis 如何设置密码及验证密码？

**考点**：AUTH、CONFIG、安全性

**答案要点**：
- 配置文件：`requirepass yourpassword`
- 运行时：`CONFIG SET requirepass "password"`
- 客户端连接后：`AUTH password`
- 建议：结合 TLS 加密传输，避免明文密码

---

### Q209: 说说 Redis 哈希槽的概念？

**考点**：16384 槽、CRC16、槽分配

**答案要点**：
- Redis Cluster 使用 16384 个哈希槽（0-16383）
- Key 通过 `CRC16(key) % 16384` 确定槽位
- 每个节点负责一段连续的槽
- Hash Tag：`{user:100}.name` 和 `{user:100}.age` 映射到同一槽

---

### Q210: Redis 集群的主从复制模型是怎样的？

**考点**：一主多从、异步复制、读写分离

**答案要点**：
- 一个 Master 可挂多个 Slave
- Master 负责写，Slave 负责读（可配置）
- 异步复制：Master 写完成后异步传播给 Slave
- Slave 可级联复制（Master → Slave → Sub-Slave）

---

### Q211: Redis 集群会有写操作丢失吗？为什么？

**考点**：异步复制、故障切换、数据一致性

**答案要点**：
- 会。因为主从复制是异步的
- Master 写入后未同步到 Slave 就宕机，这部分数据丢失
- 配置 `min-replicas-to-write` 可减少丢失风险
- 强一致性需使用 Redlock 或等待同步确认

---

### Q212: Redis 集群之间是如何复制的？

**考点**：复制流、积压缓冲区、部分重同步

**答案要点**：
- Master 将写命令写入复制流（replication backlog）
- Slave 连接后从指定 offset 开始接收增量数据
- 若 offset 超出 backlog 范围，触发全量同步
- 复制流大小由 `repl-backlog-size` 控制

---

### Q213: Redis 集群最大节点个数是多少？

**考点**：16384 槽限制、实际部署

**答案要点**：
- 理论最大 16384 个节点（每个节点一个槽）
- 实际建议不超过 1000 个节点
- Gossip 协议消息量随节点数增长

---

### Q214: Redis 集群如何选择数据库？

**考点**：db 0-15、集群限制

**答案要点**：
- 单机 Redis 支持 16 个数据库（db 0-15）
- **Redis Cluster 仅支持 db 0**，不支持多数据库
- 集群环境下通过不同 key 前缀或命名空间隔离

---

### Q215: 怎么测试 Redis 的连通性

**考点**：PING、客户端连接

**答案要点**：
- CLI：`redis-cli ping` 返回 PONG
- Go：`client.Ping(ctx).Err()`
- 检查网络、防火墙、bind 配置

---

### Q216: 如何理解 Redis 事务？

**考点**：MULTI/EXEC、不隔离、无回滚

**答案要点**：
- Redis 事务不是真正的 ACID 事务
- 命令排队后一次性执行，不会被中断
- 不支持回滚（命令入队后即使语法错误也继续）
- 无隔离性，其他客户端命令可穿插执行

---

### Q217: Redis 事务相关的命令有哪几个？

**考点**：MULTI、EXEC、DISCARD、WATCH

**答案要点**：
- `MULTI`：开启事务
- `EXEC`：执行事务
- `DISCARD`：取消事务
- `WATCH`：乐观锁，监控 key 变化
- `UNWATCH`：取消监控

---

### Q218: Redis KEY 的过期时间和永久有效分别怎么设置？

**考点**：EXPIRE、PERSIST、TTL

**答案要点**：
- 过期：`SET key value EX seconds` 或 `EXPIRE key seconds`
- 永久：`PERSIST key` 移除过期时间
- 查询：`TTL key`（剩余秒数），-1 永久，-2 不存在

---

### Q219: Redis 如何做内存优化？

**考点**：数据结构、编码、压缩

**答案要点**：
- 使用合适数据结构（Hash vs 多个 String）
- 启用压缩：`list-compress-depth`、`zset-max-ziplist-entries`
- 使用 short string 编码（embstr）
- 定期清理过期 key 和无用数据
- 控制 key 和 value 的长度

---

### Q220: Redis 回收进程如何工作的？

**考点**：后台线程、惰性+定期、内存淘汰

**答案要点**：
- 惰性删除：访问时检查过期
- 定期删除：后台线程每秒随机抽查
- 内存淘汰：内存达到 maxmemory 时按策略淘汰
- 三者协同工作

---

### Q221: 都有哪些办法可以降低 Redis 的内存使用情况呢？

**考点**：编码优化、压缩、数据结构选择

**答案要点**：
- 使用 Hash 替代多个 String key
- 缩短 key 和 field 名称
- 使用整数或短字符串
- 调整 ziplist/listpack 阈值
- 定期清理无用数据

---

### Q222: Redis 的内存用完了会发生什么？

**考点**：maxmemory 行为、OOM、淘汰策略

**答案要点**：
- 默认：继续分配直到系统 OOM
- 设置 `maxmemory`：按淘汰策略处理
- `noeviction`：写操作返回错误
- 其他策略：淘汰旧数据腾出空间

---

### Q223: 一个 Redis 实例最多能存放多少 keys？

**考点**：理论限制、实际限制

**答案要点**：
- 理论：2^32 - 1（约 42 亿）个 key
- List/Set/ZSet 最多 2^32 - 1 个元素
- 实际受限于内存大小和性能

---

### Q224: MySQL 有 2000W 数据，Redis 中只存 20W，如何保证 Redis 中都是热点数据？

**考点**：LRU、缓存预热、淘汰策略

**答案要点**：
- 使用 `allkeys-lru` 或 `allkeys-lfu` 淘汰策略
- 缓存预热：启动时加载热点数据
- 业务层控制：仅缓存高频访问数据
- 监控命中率，调整 maxmemory

---

### Q225: Redis 最适合的场景？

**考点**：缓存、排行榜、计数器、会话

**答案要点**：
- 缓存：热点数据加速访问
- 计数器/排行榜：INCR、ZSet
- 会话存储：分布式 Session
- 分布式锁：SETNX + 过期时间
- 消息队列：List/Stream
- 实时分析：HyperLogLog、Bitmap

---

### Q226: 假如 Redis 有 1 亿个 KEY，其中 10W 以某个前缀开头，如何找出来？

**考点**：SCAN、KEYS 禁止、游标

**答案要点**：
- **禁止使用 KEYS**（阻塞 Redis）
- 使用 `SCAN` 命令游标迭代
- `SCAN 0 MATCH prefix:* COUNT 1000`
- Go 中使用 `client.Scan()` 迭代器

```go
iter := client.Scan(ctx, 0, "prefix:*", 1000).Iterator()
for iter.Next(ctx) {
    fmt.Println(iter.Val())
}
```

---

### Q227: 大量 KEY 设置同一时间过期，需要注意什么？

**考点**：缓存雪崩、随机化、错峰

**答案要点**：
- 大量 key 同时过期可能导致瞬时请求穿透到 DB
- 解决：过期时间加随机值（±10%）
- 热点 key 设置不同过期时间
- 使用互斥锁防止缓存击穿

---

### Q228: 使用过 Redis 做异步队列么，你是怎么用的？

**考点**：List、Stream、发布订阅

**答案要点**：
- **List**：`LPUSH` 生产，`BRPOP` 消费（阻塞弹出）
- **Stream**（5.0+）：更强大的消息队列，支持消费者组
- **发布订阅**：轻量但不持久，消费者离线丢失消息
- 推荐：Stream 适合生产环境

---

### Q229: 使用过 Redis 分布式锁么，它是什么回事？

**考点**：SETNX、看门狗、Redlock

**答案要点**：
- 基础：`SET lock_key unique_value NX PX 30000`
- 释放：Lua 脚本原子检查并删除（防止误删）
- 续期：看门狗后台 goroutine 定时延长过期时间
- 高可用：Redlock（多节点独立加锁，多数成功）
- Go 实现：`redis-lock` 库或 Redisson（Java）

```go
// Go 分布式锁示例
lock, err := redislock.Obtain(ctx, client, "my-lock", 30*time.Second, nil)
if err == redislock.ErrNotObtained {
    // 获取锁失败
}
defer lock.Release(ctx)
// 执行业务逻辑...
```

---

---
