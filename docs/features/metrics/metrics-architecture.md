## 博客热点统计架构说明（Redis + MySQL）

本文档说明博客侧「阅读数 / 点赞 / 阅读时长」相关的长期高 QPS 方案，包括：

- 数据流转架构
- Redis Key 设计
- 环境变量约定
- Blog 应用 API 行为
- Admin Server 中的定时同步 worker 与 PM2 配置

---

### 1. 整体架构

#### 1.1 角色与数据流

- **前台 Blog（Next 15 App Router，`apps/blog`）**
    - 负责记录文章阅读、点赞、阅读时长。
    - 所有「写」操作只写入 **Redis**，不直接写 MySQL。
    - 统计展示接口（`/api/posts/[id]/stats`）同时从 Redis + MySQL 读取并合并结果。

- **后台 Admin Server（Koa，`apps/admin/server`）**
    - 挂载一个 **metrics worker**（`src/scripts/flush-metrics.ts`），定时从 Redis 批量刷新数据到 MySQL（`@blog/db`）。
    - MySQL 作为最终一致的持久化存储，主要用于后台统计、报表与长期存档。

- **MySQL / Prisma（`packages/db`）**
    - 表结构：
        - `PostReadTime`：按文章 + 访客累计阅读秒数。
        - `PostViewDaily`：按文章 + 访客 + 日期的 UV 记录。
        - `PostLike`：文章点赞记录（匿名访客 / actor 维度）。

#### 1.2 统一身份维度（actorId）

为统一不同访客的行为统计，引入 **actorId** 概念。

当前 Blog 侧实现仅基于 `visitorId` 生成 actorId：

- `actorId = visitorId`（保持与历史数据兼容，不再额外加前缀）

说明：

- 旧版文档中提到的 `admin_user` 共享 cookie 方案已移除。
- Blog 与 Admin 的登录态联动现在统一通过 `sid` cookie + `/api/auth/checkLogin` 恢复，不再通过共享 `admin_user`/`admin_token` 参与指标计算。

相关实现：

- 公共工具（shared 包）：
    - `packages/shared/src/utils/metrics.ts`
        - `getActorId({ userId, visitorId })`
        - Redis Key helper：`getPostReadTimeKey` / `getPostLikeKey` / `getPostDailyUvKey`。
- Blog 内部工具：
    - `apps/blog/lib/metrics.ts`
        - `getActorIdFromRequest({ visitorId })`：基于请求体或查询参数中的 `visitorId` 计算 actorId。

---

### 2. Redis Key 约定

所有与文章统计相关的 Redis Key 约定如下（以 `postId` 为主维度）：

- **阅读时长增量（Hash）**
    - Key：`post:{postId}:readtime:delta`
    - Field：`actorId`
    - Value：秒数增量（整数，累加）
    - 用途：Blog API 不直接更新 MySQL 的 `PostReadTime`，只在这个 Hash 里追加增量，worker 周期性同步。

- **每日 UV（Set）**
    - Key：`post:{postId}:uv:{yyyymmdd}`
    - Member：`actorId`
    - 用途：同一 actor 在同一天只记一次 UV。worker 按天 flush 到 `PostViewDaily`。

- **点赞集合（Set）**
    - Key：`post:{postId}:like`
    - Member：`actorId`
    - 用途：Redis 视为点赞集合的真实来源；worker 会将 Redis 与 MySQL 的 `PostLike` 做对齐（插入/删除）。

---

### 3. 环境变量约定（Blog & Admin 共用）

#### 3.1 Redis 连接

优先在根目录 `.env.{APP_ENV}` 中设置相同的 Redis 连接信息；
如需局部覆盖，再在对应应用目录创建 `.env.{APP_ENV}` 覆盖同名变量。

```env
# Redis 连接信息
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_or_empty

# metrics flush 周期（毫秒，可选，默认 60000）
METRICS_FLUSH_INTERVAL_MS=60000
```

#### 3.2 使用说明

- Blog 使用 `apps/blog/lib/redis.ts` 创建 Redis 客户端，读取上述环境变量。
- Admin Server 使用 `apps/admin/server/src/lib/redis.ts` 创建 Redis 客户端，同样读取这些变量。
- `METRICS_FLUSH_INTERVAL_MS` 控制 metrics worker 执行的周期，可根据业务压测结果调整。

---

### 4. Blog 端 API 行为（Next App Router）

相关路由目录：`apps/blog/app/api/posts/[id]/`

#### 4.1 `/view`：记录文章 UV

文件：`view/route.ts`

- 接口：`POST /api/posts/{id}/view`
- 请求体：`{ visitorId?: string }`
- 行为：
    1. 同时读取：
        - 请求体中的 `visitorId`
    2. 通过 `getActorIdFromRequest` 计算 actorId。
    3. 写入 Redis：
        - `SADD post:{postId}:uv:{today} actorId`
    4. 不直接写 MySQL，由 metrics worker 周期性同步。

#### 4.2 `/readtime`：记录阅读时长增量

文件：`readtime/route.ts`

- 接口：`POST /api/posts/{id}/readtime`
- 请求体：`{ visitorId?: string; deltaSeconds?: number }`
- 行为：
    1. 计算 `inc = max(0, round(deltaSeconds))`。
    2. 通过 `getActorIdFromRequest` 得到 actorId。
    3. `inc === 0` 直接返回 `{ ok: true, message: 'no increment' }`。
    4. 写入 Redis：
        - `HINCRBY post:{postId}:readtime:delta actorId inc`
    5. worker 会将增量累加到 MySQL 的 `PostReadTime.seconds`。

#### 4.3 `/like`：记录 / 查询点赞

文件：`like/route.ts`

- `GET /api/posts/{id}/like?visitorId=xxx`
    - 通过 `getActorIdFromRequest`（基于 `visitorId`）计算 actorId。
    - 从 Redis：
        - 总点赞数：`SCARD post:{postId}:like`
        - 当前用户是否点赞：`SISMEMBER post:{postId}:like actorId`

- `POST /api/posts/{id}/like`
    - 请求体：`{ visitorId?: string }`
    - 计算 actorId。
    - 点赞 / 取消：
        - 若 `SISMEMBER == 1` → `SREM`（取消点赞）
        - 否则 → `SADD`（点赞）
    - 返回 `{ ok, liked, count }`，所有数据来自 Redis。

#### 4.4 `/stats`：文章统计聚合

文件：`stats/route.ts`

- 接口：`GET /api/posts/{id}/stats?visitorId=xxx`
- 行为：
    1. 从 `params` 中获取 `postId`（需 `await params`，因为 `params` 是 Promise）。
    2. 从 URL 中读取 `visitorId` 并计算 actorId。
    3. **阅读人数 views：**
        - 历史总数（已 flush 到 MySQL）：`dbViews = count(PostViewDaily where postId)`
        - Redis 当日 UV：`pendingViews = SCARD post:{postId}:uv:{today}`
        - 最终：`views = dbViews + pendingViews`
    4. **当前用户阅读时长 readSecondsForVisitor：**
        - MySQL 历史值：
            - `baseSeconds = PostReadTime.seconds (postId, visitorId = actorId)`
        - Redis 增量：
            - `deltaSeconds = HGET post:{postId}:readtime:delta actorId`
        - 合并：`readSecondsForVisitor = baseSeconds + deltaSeconds`

---

### 5. Admin Server metrics worker（Koa 端定时刷新）

文件：`apps/admin/server/src/scripts/flush-metrics.ts`

#### 5.1 flush 内容概览

- **阅读时长增量 → `PostReadTime`**
    - 扫描 Key：`post:*:readtime:delta`
    - 对每个 Key：
        - `HGETALL` → `actorId → secondsIncrement`
        - 调用 `prisma.postReadTime.upsert`：
            - `where: { postId_visitorId: { postId, visitorId: actorId } }`
            - `create: { postId, visitorId: actorId, seconds }`
            - `update: { seconds: { increment: seconds } }`
        - 同步成功后 `DEL key`。

- **UV → `PostViewDaily`**
    - 扫描 Key：`post:*:uv:*`
    - Key 解析：`post:{postId}:uv:{yyyymmdd}`
    - `SMEMBERS` 获取 actorId 列表：
        - 对每个 actorId：
            - `upsert` 到 `PostViewDaily`（unique 复合索引：`postId_visitorId_viewedAt`）。
    - 同步成功后 `DEL key`。

- **点赞集合 → `PostLike`**
    - 扫描 Key：`post:*:like`
    - Redis 视为真实数据源：
        - 读取 Redis 集合：`actorIds = SMEMBERS(key)`
        - 从 MySQL 读取已有点赞：`PostLike`（postId 对应全部 visitorId）
        - 做集合对比：
            - Redis 有、MySQL 无 → 插入
            - MySQL 有、Redis 无 → 删除

#### 5.2 运行方式

在 `apps/admin/server/package.json` 中已经增加了脚本：

- 开发：
    - `"metrics:worker:dev": "dotenv -e .env -e .env.development -- ts-node-dev src/scripts/flush-metrics.ts"`
- 生产：
    - `"metrics:worker:prod": "dotenv -e .env -e .env.production -- node dist/scripts/flush-metrics.js"`

可以结合 PM2 使用（见下）。

---

### 6. PM2 配置与启动示例

PM2 配置文件：`apps/admin/server/ecosystem.config.js`

已经增加两个 worker app：

- `blog-admin-metrics-worker-dev`
- `blog-admin-metrics-worker-prod`

示例片段：

```7:24:apps/admin/server/ecosystem.config.js
        {
            name: 'blog-admin-metrics-worker-dev',
            script: './dist/scripts/flush-metrics.js',
            node_args: '--experimental-specifier-resolution=node',
            env: {
                NODE_ENV: 'development',
                METRICS_FLUSH_INTERVAL_MS: process.env.METRICS_FLUSH_INTERVAL_MS || '60000',
            },
        },
        {
            name: 'blog-admin-metrics-worker-prod',
            script: './dist/scripts/flush-metrics.js',
            node_args: '--experimental-specifier-resolution=node',
            env: {
                NODE_ENV: 'production',
                METRICS_FLUSH_INTERVAL_MS: process.env.METRICS_FLUSH_INTERVAL_MS || '60000',
            },
        },
```

启动示例：

- 开发环境：
    - `pm2 start ecosystem.config.js --only blog-admin-server-dev`
    - `pm2 start ecosystem.config.js --only blog-admin-metrics-worker-dev`

- 生产环境：
    - `pm2 start ecosystem.config.js --only blog-admin-server-prod`
    - `pm2 start ecosystem.config.js --only blog-admin-metrics-worker-prod`

---

### 7. 注意事项与后续扩展

- **一致性模型**
    - 前台展示的统计数据可能略领先于 MySQL（因为 Redis 尚未 flush），属于最终一致。
    - 后台报表/管理界面建议以 MySQL 为准。

- **容错**
    - 如果 Redis 中的数据在 flush 前丢失（极端情况），会损失近实时指标，但不会影响已在 MySQL 中的数据。
    - 可根据需要为 Redis 开启持久化（RDB/AOF）。

- **登录与匿名切换**
    - 当前实现中，登录用户使用 `u:{userId}` 维度，匿名用户使用 `visitorId`。
    - 如需在用户登录时将历史 visitorId 数据迁移到 userId，可在登录成功后增加一段迁移逻辑（未来可单独设计）。
