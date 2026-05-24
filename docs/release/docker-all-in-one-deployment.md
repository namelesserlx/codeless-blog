# 三端 Docker 一键部署

本文档面向仓库根目录，目标是用一套 `docker compose` 编排同时启动：

- 博客前台 `apps/blog`
- 管理后台前端 `apps/admin/client`
- 管理后台服务端 `apps/admin/server`
- 以及它们依赖的 MariaDB / Redis / MeiliSearch

## 一、为什么不是直接 `docker compose up --build`

`apps/blog` 当前在 `next build` 阶段就会访问数据库。

而普通的 `docker compose up --build` 流程是：

1. 先构建镜像
2. 再启动容器

这会导致 blog 镜像构建时数据库还没起来，从而构建失败。

因此仓库提供的是：

- 根目录 `docker-compose.yml`：负责完整编排
- 根目录 `scripts/docker-up.sh`：先起基础设施，再构建并启动三端

这才是真正可复用的一键启动入口。

## 二、准备环境变量

仓库根目录的 `.env.example` 是唯一权威模板。

测试部署先复制：

```bash
cp .env.example .env.staging
```

正式部署先复制：

```bash
cp .env.example .env.production
```

至少需要检查这些变量：

- `DATABASE_URL`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `MEILI_MASTER_KEY`
- `MEILI_ADMIN_KEY`
- `MEILI_SEARCH_KEY`
- `JWT_SECRET`
- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`

如果你修改了数据库地址、用户名、密码或端口，也要同步更新 `DATABASE_URL`，因为当前 blog 镜像构建阶段和应用运行阶段统一使用这一个数据库连接变量。

这里的 MeiliSearch key 分工是：

- `MEILI_MASTER_KEY`：只给 `meilisearch` 容器自身使用，用来保护实例和管理 API keys
- `MEILI_ADMIN_KEY`：给 `apps/admin/server` 使用，用来初始化索引和同步文档
- `MEILI_SEARCH_KEY`：给 `apps/blog` 使用，用来执行只读搜索

如果这是第一次部署 MeiliSearch，还需要先拿到 Admin / Search key。推荐步骤是：

测试部署：

```bash
docker compose --env-file .env.staging up -d meilisearch
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:${MEILI_PORT:-7700}/keys
```

正式部署：

```bash
docker compose --env-file .env.production up -d meilisearch
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:${MEILI_PORT:-7700}/keys
```

把返回中的 `Default Admin API Key` 和 `Default Search API Key` 分别写回当前环境文件的 `MEILI_ADMIN_KEY`、`MEILI_SEARCH_KEY`，再执行后续一键部署。

如果你只是本机体验，示例默认值通常已经够用。

## 三、一键启动

在仓库根目录执行：

测试部署：

```bash
pnpm docker:up:staging
```

正式部署：

```bash
pnpm docker:up:production
```

它会顺序做四件事：

1. 启动 `mysql`、`redis`、`meilisearch`
2. 等待基础设施健康
3. 执行 `admin-server-migrate`、`admin-server-seed`、`admin-search-init` 一次性 job
4. 构建并启动 `admin-server`、`admin-metrics-worker`、`admin-client`、`blog`

其中 `blog` 会强制走一次无缓存构建，因为它在 `next build` 阶段直接读取数据库内容；如果复用 Docker layer cache，就可能把“空库时构建”的旧页面继续带到新部署里。

启动完成后，默认访问地址为：

- Blog: `http://localhost:3000`
- Admin: `http://localhost:8080`
- API: `http://localhost:8000`

## 四、常用命令

测试部署：

```bash
pnpm docker:ps:staging
pnpm docker:logs:staging
pnpm docker:down:staging
```

正式部署：

```bash
pnpm docker:ps:production
pnpm docker:logs:production
pnpm docker:down:production
```

## 五、编排说明

### 1. 管理后台前端

- 使用 `apps/admin/client/Dockerfile`
- 产物由 `nginx` 托管
- 容器内通过 `nginx` 把 `/api`、`/ws` 代理到 `admin-server:8000`

因此后台前端可以保持：

- 接口请求走 `/api`
- WebSocket 入口走后台域名
- React Router 刷新走 `index.html` 回退

### 2. 管理后台服务端

- 使用 `apps/admin/server/Dockerfile`
- 运行镜像只负责启动 `dist/app.js`
- 数据库迁移由 `admin-server-migrate` 一次性 job 执行
- 首次空库部署会由 `admin-server-seed` 自动执行种子数据初始化；如果已存在用户则自动跳过
- MeiliSearch 初始化由 `admin-search-init` 一次性 job 执行
- `admin-server` 必须显式拿到 `MEILI_ADMIN_KEY`
- `admin-metrics-worker` 与 `admin-server` 共用同一份构建产物，但启动命令独立配置

### 3. 博客前台

- 继续复用 `apps/blog/Dockerfile`
- 构建阶段通过 `host.docker.internal + 宿主机端口` 访问已经启动的 MySQL
- 运行阶段再切回容器内服务地址（`mysql` / `redis` / `meilisearch`）
- 搜索能力只读取显式配置的 `MEILI_SEARCH_KEY`

这也是一键部署脚本必须“先起基础设施、后构建 blog”的原因。

## 六、首次部署后的补充动作

首次空库部署时，一键脚本会自动执行 seed，并创建默认后台账号：

- `superadmin` / `admin123`
- `admin` / `admin123`
- `editor` / `user123`
- `test` / `user123`

如果你希望手动重跑这一步，可以执行：

```bash
docker compose --env-file .env.staging run --rm admin-server-seed
```

正式环境改为 `.env.production`。

如果你修改了搜索索引结构，也可以手动重跑：

```bash
docker compose --env-file .env.staging run --rm admin-search-init
```

正式环境改为 `.env.production`。

## 七、验证建议

启动后至少检查：

1. `pnpm docker:ps` 中 `blog`、`admin-client`、`admin-server` 状态正常
   测试部署使用 `pnpm docker:ps:staging`，正式部署使用 `pnpm docker:ps:production`
2. 打开博客首页能渲染
3. 打开后台登录页能加载静态资源
4. `http://localhost:8000/health` 返回成功
5. 搜索、登录、评论等依赖链路没有明显 5xx
