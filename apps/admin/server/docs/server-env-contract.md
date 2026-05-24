# 后台服务端环境变量契约

这份文档用于说明 `apps/admin/server` 与 `packages/db` 的环境变量装载规则、最低启动要求和集成项分组，避免“代码里有 `process.env`，但没人知道应该配什么”。

## 一、装载规则

服务端通过 [load-env.ts](../src/bootstrap/load-env.ts) 按下面优先级装载，前面的来源优先级更高：

- 系统环境变量 / CI 注入
- `apps/admin/server/.env.${APP_ENV}`
- `apps/admin/server/.env`
- 根目录 `.env.${APP_ENV}`
- 根目录 `.env`

数据库包通过 [prisma.config.ts](../../../../packages/db/prisma.config.ts) 装载：

- 系统环境变量 / CI 注入
- `packages/db/.env.${APP_ENV}`
- `packages/db/.env`
- 根目录 `.env.${APP_ENV}`
- 根目录 `.env`

仓库权威模板统一放在根目录：

- [/.env.example](../../../../.env.example)

## 二、服务端最低启动要求

启动时必须存在的环境变量，由 [env.ts](../src/config/env.ts) 校验：

- `JWT_SECRET`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`

缺任意一项，服务端应在启动期失败，而不是运行后再出现隐式 401 或 Redis 异常。

## 三、可选集成项分组

以下环境变量按“整组生效”理解；如果只配了一部分，服务启动时会给出 warning：

- 邮件：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`
- COS：`COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`
- GitHub OAuth：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`
- 博客前台 GitHub OAuth：`GITHUB_NEXT_CLIENT_ID`、`GITHUB_NEXT_CLIENT_SECRET`
- Google OAuth：`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`
- 博客前台 Google OAuth：`GOOGLE_NEXT_CLIENT_ID`、`GOOGLE_NEXT_CLIENT_SECRET`
- Google OAuth 代理：`GOOGLE_OAUTH_PROXY_URL`，可选，仅在服务器无法直连 Google API 时配置
- MeiliSearch：`MEILI_URL`、`MEILI_ADMIN_KEY`
- DeepSeek：`DEEPSEEK_API_KEY`

OAuth 回调地址统一由 `BLOG_PUBLIC_URL` / `ADMIN_PUBLIC_URL` 派生，不再提供独立 redirect URI 变量或运行时代码覆盖口。

## 四、当前约定

- 邮件 `secure` 不再写死，默认由 `SMTP_SECURE` 或端口 `465` 推导。
- COS bucket、region、custom domain 不再硬编码在源码里。
- 上传和删除文件前会先检查 COS 配置是否完整。
- `packages/db` 与 `apps/admin/server` 都依赖 `DATABASE_URL`，两侧示例文件要同步维护。

## 五、维护原则

- 新增基础设施接入时，先补 env 契约，再写业务代码。
- 不要把生产 bucket、域名、密钥、OAuth secret 提交到仓库。
- 如果引入新的必填项，需要同时更新：
    - 根目录 `.env.example`
    - `env.ts`
    - 本文档
