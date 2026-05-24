---
name: blog-server
description: Blog 后台服务端 — 三层架构规范、各层 CRUD 样板、装饰器、中间件链、认证与错误处理
user-invocable: true
argument-hint: [routes|controller|service|decorator|auth|crud]
---

# Blog Server — 后台服务端

## 一、三层架构

```
路由 (routes/) → 控制器 (controllers/) → 服务层 (services/)
```

| 层         | 职责                | 允许做的事                                                            | 不允许做的事                   |
| ---------- | ------------------- | --------------------------------------------------------------------- | ------------------------------ |
| **路由**   | URL 映射 + 方法绑定 | 定义 path/method，绑定控制器方法                                      | 读写 ctx.req/res，业务逻辑     |
| **控制器** | 请求解析 + 响应构造 | 解析 `ctx.query/params/body`，调用服务，构造 `Response.success/error` | 直接操作数据库、调用其他控制器 |
| **服务层** | 业务逻辑 + 数据访问 | 操作 Prisma/Redis/MeiliSearch，调用其他服务（通过构造注入）           | 直接读写 ctx，依赖 HTTP 上下文 |

### 路由层样板

```ts
// routes/blog/article/index.ts
import Router from '@koa/router';
import { articleController } from '../../../controllers/blog/article';

export const articleRouter = new Router({ prefix: '/blog/articles' });
articleRouter.get('/list', articleController.getArticleList);
articleRouter.get('/detail/:id', articleController.getArticleDetail);
articleRouter.post('/create', articleController.createArticle);
```

- 不写任何业务逻辑
- URL 命名统一 kebab-case

### 控制器层样板

```ts
// controllers/blog/article/index.ts
@prefix('/blog/articles')
export default class ArticleController {
    @request('get', '/list')
    @summary('获取文章列表')
    @tag
    @query({...})
    @RequirePermission({ permissions: 'article' })
    @ControllerErrorHandler
    async getArticleList(ctx: Context) {
        const { page, pageSize, ... } = ctx.query;
        const result = await articleService.getArticleList({ page, pageSize, ... });
        ctx.body = Response.success(result, '获取成功');
    }
}
```

- 使用 `koa-swagger-decorator` 装饰器定义路由元数据（自动生成 Swagger）
- 参数从 `ctx.query/params/body` 取出，做好类型转换再传给服务层

### 服务层样板

```ts
// services/blog/article/index.ts
@ServiceErrorHandler
export class ArticleService {
    async getArticleList(filter: ArticleListRequest): Promise<ArticleListResponse> {
        const where = this.buildWhere(filter);
        const [list, total] = await Promise.all([
            prisma.post.findMany({ where, skip, take, orderBy }),
            prisma.post.count({ where }),
        ]);
        return { list: list.map(toDTO), total, page, pageSize };
    }

    async createArticle(data: CreateArticleRequest): Promise<ArticleDetailResponse> {
        // 校验权限
        // 数据转换
        // Prisma 写入
        // 同步搜索索引
        // 返回 DTO
    }
}
```

- 通过 Prisma Client 读写 MySQL（不走 ORM 以外的 SQL）
- Redis 缓存 + MeiliSearch 索引在服务层协调
- 返回转换后的 DTO（不直接暴露 Prisma 模型）

## 二、装饰器体系

| 装饰器                            | 位置       | 用途                                  |
| --------------------------------- | ---------- | ------------------------------------- |
| `@ControllerErrorHandler`         | 控制器方法 | 捕获未处理异常，映射为统一错误响应    |
| `@ServiceErrorHandler` / `@error` | 服务层     | 异常包装 + 日志记录                   |
| `@RequirePermission`              | 控制器     | 权限校验，code 格式如 `article:write` |
| `@validation`                     | 方法       | 请求参数校验                          |
| `@tracing` / `@TraceSpan`         | 方法       | OpenTelemetry 链路追踪                |
| `@sanitize`                       | 方法       | 输入清理                              |

## 三、错误处理体系

```
服务层 throw BusinessError → 控制器 @ControllerErrorHandler 捕获
  → error-handler 中间件 → 映射为 HTTP 状态码 + 统一 JSON 响应
```

错误类型定义在 `types/errors.ts`:

- `BusinessError(code, message, status?)` — 通用业务错误
- `NotFoundError(entity)` — 404
- `ValidationError(message)` — 参数校验失败
- `PermissionError()` — 403

所有异步操作必须被 `try/catch` 或 `@error` 装饰器覆盖。

## 四、CRUD 服务层模式

### 列表查询

```ts
async list(filter: ListRequest): Promise<ListResponse> {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
        prisma.model.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
        prisma.model.count({ where }),
    ]);
    return { list: items.map(toDTO), total, page, pageSize };
}
```

### 创建

```ts
async create(data: CreateDTO): Promise<DetailDTO> {
    const record = await prisma.model.create({ data: { ...data } });
    await searchService.sync(record); // 同步搜索索引
    return toDTO(record);
}
```

### 更新

```ts
async update(id: string, data: UpdateDTO): Promise<DetailDTO> {
    const existing = await prisma.model.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Model');
    const updated = await prisma.model.update({ where: { id }, data });
    await searchService.sync(updated);
    return toDTO(updated);
}
```

### 删除

```ts
async delete(id: string): Promise<void> {
    const existing = await prisma.model.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Model');
    await prisma.model.delete({ where: { id } });
    await searchService.remove(id);
}
```

## 五、中间件链

```
请求 → normalizeSecureProxyHeaders
     → logger (koa-logger)
     → errorHandler (全局异常捕获)
     → cors (多源白名单)
     → bodyParser
     → transformDate (Date 序列化)
     → swagger / health
     → jwtAuth (JWT 验证)
     → 业务路由
     → notFoundHandler (404 fallback)
```

- `errorHandler` 必须放在业务中间件**外层**，才能捕获所有下游异常
- `jwtAuth` 在业务路由之前，公开路由通过 `config/public-routes.ts` 跳过
- CORS 源配置通过 `ADMIN_ALLOWED_ORIGINS` 环境变量控制

## 六、测试

```bash
pnpm --filter @blog/server test        # 全量测试
pnpm --filter @blog/server test:watch  # 监听模式
```

测试文件在 `tests/` 下按 `auth/`, `controllers/`, `platform/`, `services/` 组织，使用 Vitest。
