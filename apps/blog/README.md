# 个人博客应用

## 数据库连接最佳实践

在Next.js应用中连接数据库（尤其是使用Prisma和MySQL）的最佳实践指南。

### 1. 数据库连接架构

我们采用了以下架构来优化数据库连接：

```
Blog项目
├── apps/
│   └── blog/              # Next.js博客应用
│       ├── config/
│       │   ├── public-env.ts    # 浏览器可见环境变量唯一入口
│       │   ├── server-env.ts    # 服务端环境变量唯一入口
│       │   ├── site-config.ts   # 站点配置
│       │   └── services/        # Redis / MeiliSearch / OAuth 等配置
│       ├── lib/
│       │   ├── server/
│       │   │   ├── db.ts        # 服务端数据访问层
│       │   │   └── redis.ts     # 服务端 Redis 集成
│       │   ├── client/
│       │   │   └── api-client.ts # 浏览器 API 请求工具
│       │   └── shared/
│       │       └── error-handler.ts # 通用错误处理工具
│       └── .env.{APP_ENV} # 应用局部环境变量覆盖层（可选）
│
└── packages/
    └── db/                # 共享数据库包
        ├── prisma/
        │   ├── schema.prisma   # 数据库模型定义
        │   ├── seed.ts         # 数据库种子脚本
        │   └── .env.{APP_ENV} # 数据库包局部环境变量覆盖层（可选）
        └── index.ts      # 使用单例模式导出Prisma客户端
```

### 2. 数据库命令说明

项目根目录的`package.json`中提供了以下数据库相关命令：

```bash
# 生成Prisma客户端
pnpm db:generate

# 将Prisma模型推送到数据库（开发环境使用）
pnpm db:push

# 启动Prisma Studio管理界面
pnpm db:studio

# 创建新的迁移（开发环境使用）
pnpm db:migrate:dev

# 部署迁移（生产环境使用）
pnpm db:migrate:deploy

# 重置数据库（谨慎使用！）
pnpm db:reset

# 初始化种子数据
pnpm db:seed
```

#### 命令使用示例

1. **初始设置数据库**

    ```bash
    # 第一次设置，生成Prisma客户端并推送数据库模型
    pnpm db:generate
    pnpm db:push

    # 填充测试数据
    pnpm db:seed
    ```

2. **修改数据模型后的流程**

    ```bash
    # 开发环境中修改schema.prisma后
    pnpm db:migrate:dev --name add_new_field

    # 生产环境部署前
    pnpm db:migrate:deploy
    ```

3. **查看和管理数据**

    ```bash
    # 启动Prisma Studio可视化界面
    pnpm db:studio
    ```

### 3. 核心原则

- **单例模式**：确保每个应用实例只创建一个数据库连接
- **连接池复用**：避免创建过多连接导致数据库负载过高
- **错误处理**：统一处理数据库错误并转换为适当的HTTP响应
- **环境变量管理**：分离开发和生产环境的配置
- **类型安全**：利用Prisma生成的类型确保数据库操作的类型安全
- **抽象层**：通过工具函数抽象常见操作，避免重复代码

### 4. 在Next.js中使用数据库的最佳实践

#### 4.1 服务器组件中

在服务器组件中，可以直接导入数据库客户端并进行查询：

```typescript
// app/posts/page.tsx
import { getPublishedArticles } from '@/lib/server/db';

export default async function PostsPage() {
  const posts = await getPublishedArticles();

  return (
    // 渲染数据
  );
}
```

#### 4.2 API路由中

在API路由中，应当使用错误处理工具来包装数据库操作：

```typescript
// app/api/posts/route.ts
import { getPublishedArticles } from '@/lib/server/db';
import { withErrorHandling } from '@/lib/shared/error-handler';
import { NextResponse } from 'next/server';

export async function GET() {
    return withErrorHandling(async () => {
        const posts = await getPublishedArticles();
        return NextResponse.json(posts);
    }, '获取文章失败');
}
```

#### 4.3 长请求处理

对于可能耗时较长的数据库操作，考虑使用超时处理：

```typescript
async function queryWithTimeout<T>(dbQuery: () => Promise<T>, timeoutMs = 5000): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('数据库查询超时')), timeoutMs);
    });

    return Promise.race([dbQuery(), timeoutPromise]);
}
```

### 5. 部署考虑事项

#### 5.1 连接数限制

MySQL通常有最大连接数限制。Prisma默认会为每个应用实例创建多个连接。因此：

- 使用连接池管理器
- 设置合理的`connection_limit`
- 使用次世代服务器（如Vercel）时需关注冷启动问题

#### 5.2 数据库迁移

在生产环境部署前，确保数据库架构已同步：

```bash
pnpm db:migrate:deploy  # 应用迁移
```

#### 5.3 环境变量

确保所有环境（开发、测试、生产）都配置了正确的环境变量：

- DATABASE_URL（必须）
- 其他Prisma配置（如连接池大小等）

Blog 前台目前推荐把环境变量分成两层，并统一通过 `apps/blog/config/` 暴露给业务代码：

- 核心最小集：`DATABASE_URL`、`BLOG_PUBLIC_URL`、`ADMIN_PUBLIC_URL`、`API_PUBLIC_URL`
- 可选功能集：OAuth、GitHub About、MeiliSearch、Redis 相关变量，按实际启用的能力再补

示例文件：

- 本地开发优先参考根目录 `.env.example`；复制成 `.env.development` 后使用，如需局部覆盖，再在 `apps/blog/.env.development` 中覆盖同名变量
- 生产 / Docker 示例见 `apps/blog/docs/docker-standalone-deployment.md`

### 6. Docker 使用流程

以下流程用于在本地快速验证 `apps/blog/Dockerfile` 构建与运行。

#### 6.1 构建镜像

在仓库根目录执行（`-f` 指向 blog 应用 Dockerfile）：

```bash
docker build -f apps/blog/Dockerfile -t blog-next:test \
  --build-arg DATABASE_URL="mysql://<user>:<password>@<db-host>:3306/blog_db" \
  --build-arg BLOG_PUBLIC_URL="http://localhost:3000" \
  --build-arg ADMIN_PUBLIC_URL="http://localhost:5173" \
  --build-arg API_PUBLIC_URL="http://localhost:8000" \
  .
```

说明：

- `BLOG_PUBLIC_URL`、`ADMIN_PUBLIC_URL`、`API_PUBLIC_URL` 属于公开地址变量，需要在 build 阶段注入。
- `DATABASE_URL` 在当前构建策略下也会参与构建期的数据读取（用于静态/ISR页面预渲染）。

#### 6.2 启动容器

```bash
docker run -d --name blog-next-test -p 3001:3000 \
  -e DATABASE_URL="mysql://<user>:<password>@<db-host>:3306/blog_db" \
  -e BLOG_PUBLIC_URL="http://localhost:3001" \
  -e ADMIN_PUBLIC_URL="http://localhost:5173" \
  -e API_PUBLIC_URL="http://localhost:8000" \
  blog-next:test
```

启动后访问：

- `http://127.0.0.1:3001/`
- `http://127.0.0.1:3001/photos`
- `http://127.0.0.1:3001/snippets`
- `http://127.0.0.1:3001/sitemap.xml`

#### 6.3 常用排查命令

```bash
# 查看容器状态
docker ps --filter "name=blog-next-test"

# 查看容器日志
docker logs --tail 200 blog-next-test

# 查看镜像大小
docker images blog-next:test
```

#### 6.4 清理与重建（强制验证）

```bash
# 删除容器和镜像
docker rm -f blog-next-test
docker rmi -f blog-next:test

# 清理 BuildKit 缓存（谨慎）
docker builder prune -af

# 无缓存重建
docker build --no-cache -f apps/blog/Dockerfile -t blog-next:test ...
```

#### 6.5 常见错误

- `Host 'x.x.x.x' is not allowed to connect to this MySQL server`
    - 数据库账号未授权该来源主机，需调整 MySQL 用户 Host 权限（如 `%` 或指定网段）。
- 访问页面 500，日志含数据库连接错误
    - 优先检查 `DATABASE_URL`、数据库可达性、账号权限、密码中是否包含未转义特殊字符。

### 7. 故障排除

#### 连接问题

如果遇到连接问题：

1. 检查环境变量是否正确配置
2. 确认数据库服务器是否允许从应用服务器的IP连接
3. 验证用户名和密码是否正确
4. 检查数据库名称是否存在

#### 性能问题

如果遇到性能问题：

1. 检查查询是否使用了合适的索引
2. 考虑使用缓存（Redis或Next.js内置的缓存机制）
3. 优化查询，特别是嵌套查询和关联
4. 考虑使用读写分离

### 8. 总结

可以确保Next.js应用与MySQL数据库之间的连接既安全又高效。关键是正确管理数据库连接生命周期，妥善处理错误，并利用Prisma的类型安全特性构建可靠的应用。
