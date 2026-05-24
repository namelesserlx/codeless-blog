# apps/admin/server — 管理后台服务端

负责后台 API、认证鉴权 (JWT/OAuth/RBAC)、搜索索引、数据统计、邮件通知和可观测性。博客后台的核心数据层。

技术栈: Koa 3 + Prisma 7 + MySQL + Redis + MeiliSearch + JWT + OpenTelemetry

## 引用 Skill

三层架构、CRUD 样板、装饰器、错误处理等详细规范 → 执行 `/blog-server`

## 关键路径

```
src/
├── app.ts                # 应用入口 (中间件链 + WebSocket)
├── routes/               # 路由 (URL 映射，无业务逻辑)
├── controllers/          # 控制层 (请求/响应处理，路由分发)
├── services/             # 服务层 (核心业务逻辑)
├── middlewares/          # 中间件 (auth, cors, error-handler, transform)
├── lib/                  # 基础设施 (meilisearch, redis, storage/cos, websocket)
├── config/               # 配置 (env, auth, cos, email, oauth, upload, swagger)
├── scripts/              # 独立入口脚本 (metrics worker, search init, seed, permission sync)
├── utils/decorators/     # 装饰器 (@error, @permission, @validation, @tracing)
├── telemetry/            # OpenTelemetry 链路追踪
└── types/                # 类型定义
tests/                    # 测试 (auth, controllers, platform, services)
```

## 认证体系

认证流程: 请求 → `jwtAuth` 中间件 → 公开路由跳过 / 非公开路由校验 JWT → `ctx.state.user` 注入

- **JWT**: 登录成功后签发 access token，每次请求通过 `Authorization: Bearer <token>` 携带
- **Session**: 同时创建服务端 session (Redis)，支持强制下线、多端互踢
- **OAuth**: GitHub + Google 登录，每端 (admin/blog) 独立的 client_id/secret 配置
- **公开路由**: `config/public-routes.ts` 集中管理，包含登录、注册、验证码、OAuth 回调、Swagger、健康检查等

认证配置在 `config/auth.ts`，密钥通过 `JWT_SECRET` 环境变量注入。

## 权限体系 (RBAC)

权限模型: `User → UserRole → Role → RolePermission → Permission`

权限检查通过 `@RequirePermission` 装饰器在控制器层完成：

```ts
@RequirePermission({ permissions: 'article' })          // 单个权限，默认 ALL
@RequirePermission({ permissions: ['article', 'article:write'], strategy: PermissionStrategy.ANY })
@RequireSuperAdmin()                                     // 超级管理员快捷方式
```

- **策略**: `ALL`(全部满足) / `ANY`(任一满足) / `OWNER`(资源所有者)
- **缓存**: `PermissionCacheService` 基于 Redis 缓存用户权限，减少数据库查询
- **前端联动**: 权限 code 与 admin client 的 `AuthButton` / `AuthField` 组件对应

权限同步通过 `scripts/sync-permissions.ts` 脚本从代码配置同步到数据库。

## 中间件链

```
请求 → normalizeSecureProxyHeaders → logger → errorHandler
  → cors → bodyParser → transformDate → swagger/health → jwtAuth
  → 业务路由 (@RequirePermission 权限校验) → 控制器 → 服务层 → 响应
  → notFoundHandler (404 fallback)
```

- `errorHandler` 必须在业务中间件外层，捕获所有下游异常并统一格式
- `jwtAuth` 在业务路由之前，通过 `public-routes.ts` 跳过公开端点
- `transformDate` 确保 Date 字段在 JSON 响应中正确序列化

## 错误处理

```
服务层 throw BusinessError → 控制器 @ControllerErrorHandler 捕获
  → errorHandler 中间件 → 统一 JSON 响应 { code, message, data? }
```

错误类型 (`types/errors.ts`):
- `BusinessError` — 通用业务错误
- `NotFoundError(entity)` — 资源不存在 (404)
- `ValidationError(message)` — 参数校验失败
- `PermissionError()` — 无权限 (403)
- `AuthError(code, message)` — 认证失败 (401)

## 本地注意点

- `pnpm dev:server` 通过 `scripts/dev-with-worker.mjs` 同时启动主应用 + metrics worker
- **异步错误必须被捕获**：要么 `await` + `try/catch`，要么使用 `@error` 装饰器
- 修改 `packages/db/prisma/schema.prisma` 后必须先 `pnpm db:generate`
- 环境变量校验在 `src/config/env.ts`，启动时执行 `validateServerEnvironment()`
