# Next Blog Docker Standalone 部署

本文面向 `apps/blog`，采用 Next.js 官方推荐的 `output: 'standalone'` 自托管方式。

官方文档参考：

- <https://nextjs.org/docs/app/guides/self-hosting>
- <https://nextjs.org/docs/app/api-reference/config/next-config-js/output>
- <https://nextjs.org/docs/app/guides/environment-variables>

## 1. 适用场景

适合以下部署方式：

- 博客前台单独部署到一台服务器
- 前台使用 Docker 镜像运行
- 通过 Nginx 或云负载均衡反代到容器的 `3000` 端口

不适合做静态导出。当前博客前台依赖：

- Prisma / MySQL
- Redis
- MeiliSearch
- Server Actions

因此它本质上是一个需要长期运行的 Node.js 服务。

## 2. 当前仓库已做的适配

`apps/blog/next.config.ts` 已启用：

- `output: 'standalone'`
- `outputFileTracingRoot`

其中 `outputFileTracingRoot` 是 monorepo 下的关键配置，用于让 Next.js 在构建 standalone 产物时正确追踪工作区根目录中的共享包文件。

## 3. 构建镜像

在仓库根目录执行：

```bash
docker build \
  -f apps/blog/Dockerfile \
  -t blog-next:latest \
  --build-arg BLOG_PUBLIC_URL=https://www.example.com \
  --build-arg ADMIN_PUBLIC_URL=https://www.example.com \
  --build-arg API_PUBLIC_URL=https://www.example.com \
  --build-arg DATABASE_URL='mysql://blog:blogpass@host.docker.internal:3306/blog' \
  --build-arg REDIS_HOST=host.docker.internal \
  --build-arg REDIS_PORT=6379 \
  --build-arg MEILI_URL=http://host.docker.internal:7700 \
  --build-arg NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id \
  .
```

说明：

- `BLOG_PUBLIC_URL`、`ADMIN_PUBLIC_URL`、`API_PUBLIC_URL` 会在 `next build` 时写入前端产物，必须在构建镜像时传入
- 当前仓库的首页、标签页、片段页、相册页会在 `next build` 阶段预渲染，因此构建阶段也必须能访问 MySQL，且建议同时能访问 Redis / MeiliSearch
- `host.docker.internal` 适用于 macOS / Windows Docker Desktop；如果你在 Linux 上构建镜像，请替换成宿主机内网 IP，或在构建时使用 `--add-host host.docker.internal:host-gateway`
- 不需要的 OAuth 变量可以暂时留空，但建议保持和生产环境一致

## 4. 运行容器

```bash
docker run -d \
  --name blog-next \
  --restart unless-stopped \
  -p 3000:3000 \
  -e BLOG_PUBLIC_URL=https://www.example.com \
  -e ADMIN_PUBLIC_URL=https://www.example.com \
  -e API_PUBLIC_URL=https://www.example.com \
  -e DATABASE_URL='mysql://user:password@mysql.example.internal:3306/blog' \
  -e REDIS_HOST=redis.example.internal \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=your_redis_password \
  -e MEILI_URL=http://meili.example.internal:7700 \
  -e MEILI_SEARCH_KEY=your_meili_search_key \
  -e GITHUB_TOKEN=your_github_token \
  blog-next:latest
```

## 5. 必需环境变量

### 5.1 构建阶段变量

这些变量会在 `next build` 阶段被读取，建议在 `docker build` 时显式传入。

必需的公开变量：

- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`
- `NEXT_PUBLIC_GITHUB_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

当前仓库建议一并传入的服务端变量：

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `MEILI_URL`
- `MEILI_SEARCH_KEY`
- `GITHUB_TOKEN`

### 5.2 运行阶段变量

这些变量由容器启动时注入：

- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `MEILI_URL`
- `MEILI_SEARCH_KEY`
- `GITHUB_TOKEN`

## 6. 分服务器部署注意事项

如果你把博客前台、后台 API、数据库、搜索服务拆到不同服务器：

- 博客前台容器所在服务器必须能访问 MySQL
- 博客前台容器所在服务器必须能访问 Redis
- 博客前台容器所在服务器必须能访问 MeiliSearch
- `API_PUBLIC_URL` 必须指向真实的线上 API 域名，而不是容器内地址

当前博客前台会直接访问数据库和缓存服务，不是纯前端站点。

## 7. 推荐网络拓扑

- `www.example.com` -> Nginx -> blog-next 容器 `3000`
- `www.example.com` -> 后台 API 服务
- `www.example.com` -> 后台前端静态站点
- `mysql.example.internal:3306` -> MySQL
- `redis.example.internal:6379` -> Redis
- `meili.example.internal:7700` -> MeiliSearch

## 8. Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

如果启用 HTTPS，建议通过 Certbot 或云厂商证书服务配置 TLS。

## 9. 发布流程建议

每次发版建议按下面顺序执行：

1. 更新代码
2. 重新构建镜像
3. 停掉旧容器
4. 用同样的运行参数启动新容器
5. 检查首页、文章页、评论、搜索、登录流程

## 10. 本地先跑通，再上内网服务器

推荐按下面顺序推进：

1. 先在本机准备一套可访问的 MySQL、Redis、MeiliSearch
2. 在本机执行数据库迁移和必要 seed
3. 在本机执行 `docker build`，确认镜像能成功构建
4. 在本机执行 `docker run`，确认博客首页、文章页和静态资源可访问
5. 再把同一套 Dockerfile、镜像标签和环境变量迁移到内网服务器
6. 仅替换这些地址：
    - `BLOG_PUBLIC_URL`
    - `ADMIN_PUBLIC_URL`
    - `API_PUBLIC_URL`
    - `DATABASE_URL`
    - `REDIS_HOST`
    - `MEILI_URL`

这样本地跑通后，内网环境只是“换地址”，不是“换部署方式”。

## 11. 仓库相关补充

当前 Docker 构建阶段执行的是根目录脚本 `pnpm build:blog`，它会通过 Turbo 先构建博客依赖的共享包，再构建 `apps/blog`，更适合这个 monorepo。
