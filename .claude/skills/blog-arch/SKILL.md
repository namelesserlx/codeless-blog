---
name: blog-arch
description: Blog Monorepo 总体架构 — 环境变量体系、部署方案、共享包管理、CI 质量门禁
user-invocable: true
argument-hint: [env|deploy|shared|ci]
---

# Blog Arch — 总体架构

## 一、环境变量体系

### 加载顺序（优先级从高到低）

1. 系统环境变量 / CI 注入
2. 应用目录 `.env.{APP_ENV}`（如 `apps/blog/.env.development`）
3. 应用目录 `.env`
4. 根目录 `.env.{APP_ENV}`
5. 根目录 `.env`

加载实现在 `packages/shared/src/env/index.ts` 的 `loadWorkspaceEnv()`。

### APP_ENV 取值

| 值 | 用途 |
|----|------|
| `development` | 本地开发 |
| `staging` | 测试部署 |
| `production` | 正式生产 |

### 各端消费方式

| 端 | 访问方式 | 配置位置 |
|----|---------|---------|
| blog (Next.js) | `process.env` (服务端) / `NEXT_PUBLIC_*` (客户端) | `config/server-env.ts` + `config/public-env.ts` |
| admin client (Vite) | `import.meta.env.VITE_*` | `src/config/env.ts` |
| admin server (Koa) | `env` 命名空间对象 | `src/config/env.ts` → `env.xxx` |

### 环境变量分组

| 分组 | 必填 | 说明 |
|------|------|------|
| 基础 | 是 | `DATABASE_URL`, `REDIS_HOST/PORT`, `JWT_SECRET`, `PUBLIC_URL*` |
| 服务端 | 是 | `PORT`, `ADMIN_ALLOWED_ORIGINS`, auth/session 配置 |
| 搜索 | 否 | `MEILI_URL/ADMIN_KEY/SEARCH_KEY` |
| OAuth | 否 | GitHub / Google client id + secret (各端分开) |
| 邮件 | 否 | `SMTP_*`, `EMAIL_*` |
| COS | 否 | 腾讯云对象存储 |
| DeepSeek | 否 | AI 摘要生成 |
| 可观测性 | 否 | OpenTelemetry 配置 |

详情见 `.env.example`（唯一权威模板）。

### 各部署模式的环境变量差异

| 变量 | 本地开发 | Docker 一键部署 | 独立部署 |
|------|---------|---------------|---------|
| `DATABASE_URL` | `127.0.0.1:3306` | `mysql:3306`（容器名） | 实际 MySQL 地址 |
| `REDIS_HOST` | `127.0.0.1` | `redis`（容器名） | 实际 Redis 地址 |
| `MEILI_URL` | `http://127.0.0.1:7700` | `http://meilisearch:7700`（容器名） | 实际 MeiliSearch 地址 |
| `API_PUBLIC_URL` | `http://localhost:8000` | `http://localhost:8000` | 实际 API 域名 |
| `COOKIE_SECURE` | `false` | `true`（生产） | 有 HTTPS 时 `true` |

Docker 部署时，服务间通过容器名互相访问（docker compose 内部 DNS），非 Docker 部署用 `127.0.0.1` 或实际 IP。

## 二、部署方式

### 方式 A：Docker 一键部署（推荐）

```bash
cp .env.example .env.staging   # 或 .env.production
# 修改 APP_ENV 和各环境变量
pnpm docker:up:staging         # 或 docker:up:production
```

启动流程（`docker-compose.yml`）：
```
mysql → redis → meilisearch
  → admin-server-migrate (仅首次: 执行 db:migrate:deploy)
  → admin-server-seed (仅空库: 填充默认账号/数据)
  → admin-search-init (仅首次: 初始化 MeiliSearch 索引)
  → admin-server (Koa, 端口 8000)
  → admin-metrics-worker (定时 flush 指标)
  → admin-client (Nginx 托管静态页面, 端口 8080)
  → blog (Next.js standalone, 端口 3000)
```

三端启动后:
- Blog: `http://localhost:3000`
- Admin: `http://localhost:8080`
- API: `http://localhost:8000`

默认后台账号（首次空库自动创建）: `superadmin/admin123`, `admin/admin123`, `editor/user123`

### 方式 B：独立部署

#### admin/server — Koa + PM2

```bash
pnpm build:server
# 直接启动
pnpm --filter @blog/server start
# 或 PM2 集群模式
pnpm --filter @blog/server deploy:prod
```

PM2 配置在 `apps/admin/server/ecosystem.config.js`：
- `blog-admin-server-prod`: 2 个实例 (cluster mode)，500M 内存重启
- `blog-admin-metrics-worker-prod`: 指标 worker 进程

两个进程分开管理，worker 独立于主应用。

#### admin/client — 单页面应用 (SPA)

```bash
pnpm build:admin
# 产物: apps/admin/client/dist/ (纯静态文件)
# Nginx 配置参考: apps/admin/client/nginx.conf
```

产物为纯静态文件，任意 Web 服务器 (Nginx/Caddy) 托管即可。

#### blog — Next.js (Docker 或直接启动)

```bash
pnpm build:blog
# 产物: apps/blog/.next/standalone/ (Next.js standalone 模式)
# 直接启动
node apps/blog/server.js
```

也可自行构建 Docker 镜像 (参考 `apps/blog/Dockerfile`)。注意 blog 构建时需要数据库连接。

## 三、共享包管理

`@blog/shared` — 跨端类型 + 纯工具。

- **原则**: 零运行时依赖，只放跨端共享内容
- **修改流程**: 改类型 → `build` → 验证消费端 (至少 server + blog 之一能编译)
- **向后兼容**: 改类型优先加 optional 字段，避免 breaking change
- **应用私有类型**留在各自的 `types/` 下，不放 shared

`@blog/config` — ESLint / Prettier / TypeScript 共享配置。

`@blog/db` — 数据库层，见 `blog-db` skill。

## 三、CI 质量门禁

```bash
pnpm ci:quality   # 完整流程: lint → baseline(server test + db test + shared build + config check) → build
```

- 提交前必须确保 `pnpm lint` 通过
- 修改服务端代码后运行 `pnpm --filter @blog/server test`
- 修改数据库层后运行 `pnpm --filter @blog/db test`
- 修改共享层后至少验证 server 和 blog 编译通过
