# 仓库级环境变量 Contract

本文件用于定义当前仓库的环境变量边界，目标是让 Blog、Admin Client、Admin Server、`@blog/db` 的配置来源更可见，也让 Turbo 的缓存感知配置更贴近真实使用情况。

## 1. 约定原则

- 根目录 `.env.example` 是仓库唯一权威模板，实际运行文件优先使用 `.env.{APP_ENV}`，可选 `.env` 作为基础默认层
- `APP_ENV` 只允许：`development`、`staging`、`production`
- 运行时 / 构建时 / Docker 编排变量都在根模板中按模块分组维护
- 应用目录 `.env.{APP_ENV}` 允许存在，但只作为局部覆盖层
- 系统环境变量 / CI 注入永远优先级最高
- `.env.local`、`.env.*.local` 不进入当前仓库的正式加载链路

## 2. Blog 前台

### 客户端 / 构建时变量

- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`
- `NEXT_PUBLIC_GITHUB_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### 服务端运行时变量

- `DATABASE_URL`
- `GITHUB_TOKEN`
- `MEILI_URL`
- `MEILI_SEARCH_KEY`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

### 额外说明

- Blog 前台虽然是 Next.js 应用，但当前实现会直接导入 `@blog/db`
- 因此在 `next build`、`next start`、Docker 构建阶段，`apps/blog` 进程本身也需要可用的 `DATABASE_URL`

## 3. Admin Client

### 客户端 / 构建时变量

- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`
- `VITE_GITHUB_ID`
- `VITE_GOOGLE_ID`

## 4. Admin Server

### 服务端运行时变量

- `PORT`
- `JWT_SECRET`
- `ACCESS_TOKEN_TTL_SECONDS`
- `SESSION_TTL_SECONDS`
- `CAPTCHA_TTL_SECONDS`
- `AUTH_SESSION_COOKIE_NAME`
- `SESSION_COOKIE_MAX_AGE_MS`
- `CAPTCHA_COOKIE_NAME`
- `CAPTCHA_COOKIE_MAX_AGE_MS`
- `COOKIE_SECURE`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE_PROXY_HOSTS`
- `ADMIN_ALLOWED_ORIGINS`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `MEILI_URL`
- `MEILI_ADMIN_KEY`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM_NAME`
- `EMAIL_FROM_ADDRESS`
- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`
- `COS_BUCKET`
- `COS_REGION`
- `COS_CUSTOM_DOMAIN`
- `COS_SLICE_SIZE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_NEXT_CLIENT_ID`
- `GOOGLE_NEXT_CLIENT_SECRET`
- `GOOGLE_OAUTH_PROXY_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_NEXT_CLIENT_ID`
- `GITHUB_NEXT_CLIENT_SECRET`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DASHBOARD_PUSH_INTERVAL_MS`
- `METRICS_FLUSH_INTERVAL_MS`
- `IP2REGION_XDB_PATH`
- `OTEL_ENABLED`
- `OTEL_SERVICE_NAME`
- `OTEL_SERVICE_VERSION`
- `OTEL_ENVIRONMENT`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_TRACES_SAMPLE_RATE_PERCENT`

## 5. `@blog/db`

### 数据层变量

- `DATABASE_URL`
- `NODE_ENV`

### 当前加载约定

- `@blog/db` 通过 `prisma.config.ts` 走仓库统一 loader
- 实际优先级为：
    1. 系统环境变量 / CI 注入
    2. `packages/db/.env.{APP_ENV}`（可选覆盖）
    3. 仓库根目录 `.env.{APP_ENV}`
- 不再依赖 plain `.env`

## 6. 当前纳入 Turbo 缓存感知的变量

当前纳入 `turbo.json` `globalEnv` 的变量，应限制在“会影响构建输出或根级任务行为”的范围：

- `NODE_ENV`
- `APP_ENV`
- `DATABASE_URL`
- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`
- `NEXT_PUBLIC_GITHUB_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `VITE_GITHUB_ID`
- `VITE_GOOGLE_ID`

## 7. 当前加载顺序

本仓库统一通过 `@blog/shared/env` 装载环境变量。读取文件顺序为：

1. 根目录 `.env`
2. 根目录 `.env.{APP_ENV}`
3. 应用目录 `.env`
4. 应用目录 `.env.{APP_ENV}`

系统环境变量 / CI 注入在加载前会被锁定，文件加载不会覆盖系统已有值。因此最终优先级为：

1. 系统环境变量 / CI 注入
2. 应用目录 `.env.{APP_ENV}`
3. 应用目录 `.env`
4. 根目录 `.env.{APP_ENV}`
5. 根目录 `.env`

说明：

- `development` 通常配合 `NODE_ENV=development`
- `staging` / `production` 通常都配合 `NODE_ENV=production`
- Docker 一键部署不再使用 `.env.docker`，改为显式读取 `.env.staging` 或 `.env.production`
