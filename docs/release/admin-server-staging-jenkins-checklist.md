# Admin Server Staging Jenkins CI/CD 清单

本文档整理 `apps/admin/server` 在 `staging` 环境下的最终版 Jenkins CI/CD 流程清单。

目标只有三个：

- 流程足够简单，便于长期维护
- 敏感信息只放在 Jenkins 凭证文件里
- 部署失败时不污染线上正在运行的旧版本

## 一、部署目标

本流程面向 `admin-server` 的 `staging` 部署，部署方式为：

- Jenkins 拉取仓库代码
- Jenkins 打包源码产物
- Jenkins 上传到远端部署机
- 远端机器完成安装、构建、迁移、启动
- Jenkins 最后做健康检查

部署结果应满足：

- 服务端使用 `pm2` 常驻运行
- 数据库迁移只在远端执行
- `seed` 和 `init-search` 默认不自动执行
- 健康检查失败时可以回滚到上一个可用版本

## 二、环境与职责边界

### 1. Jenkins 负责什么

- 拉取最新代码
- 本地做最小化验证
- 生成部署产物
- 生成非敏感环境变量文件
- 读取 Jenkins Secret File 凭证
- 上传文件到远端服务器
- 触发远端部署命令
- 执行部署后的健康检查

### 2. 远端服务器负责什么

- 解压源码包
- 加载公开环境变量和敏感环境变量
- 安装依赖
- 构建 server
- 执行 Prisma 正式迁移
- 按参数决定是否执行 seed / init-search
- 启动或重启 `pm2` 进程
- 保留一定数量的历史版本用于回滚

### 3. 什么信息放 Jenkinsfile，什么信息放凭证文件

放到 Jenkinsfile `environment {}` 的内容：

- 非敏感的部署配置
- 公开运行参数
- 端口、IP、目录
- 回调地址
- TTL、Cookie 名称、日志级别之类的普通配置

典型示例：

- `APP_ENV=staging`
- `NODE_ENV=production`
- `DEPLOY_HOST=192.168.5.120`
- `DEPLOY_DIR=/srv/blog/staging/admin-server`
- `PORT=18000`
- `HEALTHCHECK_URL=http://192.168.5.120:18000/health`
- `BLOG_PUBLIC_URL=http://192.168.5.121:13000`
- `ADMIN_PUBLIC_URL=http://192.168.5.121:15173`
- `API_PUBLIC_URL=http://192.168.5.120:18000`
- `ADMIN_ALLOWED_ORIGINS=http://192.168.5.121:15173`

只放进 Jenkins Secret File 凭证的内容：

- `DATABASE_URL`
- `JWT_SECRET`
- `SMTP_PASS`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `MEILI_ADMIN_KEY`
- `DEEPSEEK_API_KEY`
- 其他真正敏感的第三方密钥

结论很明确：

- 公开配置不要塞进凭证文件
- 凭证文件只保留敏感项

## 三、最终版部署流程

### 1. Checkout

Jenkins 从仓库拉取目标分支代码。

目的：

- 获取本次部署的精确代码版本
- 让产物和提交记录一一对应

### 2. Verify

Jenkins 本地只做最必要的验证，不在 Jenkins 里重复做整套远端构建。

建议最小验证：

- `pnpm install --frozen-lockfile`
- `pnpm --filter @blog/server test`

这样做的意义：

- 提前挡住明显的单测问题
- 避免把必然失败的代码上传到远端

### 3. Package

Jenkins 只生成三类部署文件：

1. 源码压缩包
2. 公开环境变量文件
3. 敏感环境变量文件

#### 3.1 源码压缩包包含什么

产物是一个源码压缩包，例如：

```bash
.jenkins/admin-server.tar.gz
```

这个压缩包建议直接基于当前 `HEAD` 生成，只包含仓库源码，不包含 `node_modules` 和构建产物。

它实际包含的是当前提交下的仓库文件，例如：

- `apps/admin/server`
- `packages/db`
- `packages/shared`
- `packages/config`
- 根目录 `package.json`
- 根目录 `pnpm-lock.yaml`
- 根目录 `pnpm-workspace.yaml`
- 根目录 `turbo.json`

这样做的原因：

- `admin-server` 构建依赖 workspace 里的共享包
- 远端需要完整 monorepo 上下文来安装和构建
- 不需要在 Jenkins 上传编译后的 `dist`，避免平台差异和产物失真

#### 3.2 公开环境变量文件怎么生成

Jenkins 根据 `environment {}` 中的公开变量，生成一份例如：

```bash
.jenkins/admin-server.public.env
```

这份文件只包含公开配置，不包含任何密钥。

#### 3.3 敏感环境变量文件从哪里来

Jenkins 通过 `withCredentials(file(...))` 读取 Secret File，例如：

- `blog-server-staging.env`

Jenkins 不需要展开成一堆 `export XXX=...`，而是直接把这份文件原样上传到远端即可。

## 四、远端部署流程

### 1. 创建发布目录

远端目录建议结构如下：

```text
/srv/blog/staging/admin-server/
├── current
├── releases/
│   ├── 20260421_210001-12
│   ├── 20260421_213015-13
│   └── ...
└── shared/
    ├── admin-server.public.env
    ├── admin-server.secret.env
    ├── admin-server.rollback.env
    └── admin-server.deploy.lock
```

说明：

- `releases/` 保存每次发布版本
- `current` 永远指向当前运行版本
- `shared/` 保存跨版本复用的公共文件

### 2. 上传文件

Jenkins 上传以下文件到远端：

- `admin-server.tar.gz`
- `admin-server.public.env`
- `blog-server-staging.env`

上传后建议落到：

- `release` 目录保存源码包
- `shared/admin-server.public.env` 保存公开环境变量
- `shared/admin-server.secret.env` 保存敏感环境变量

### 3. 部署锁

远端部署开始前应获取文件锁，例如：

- `shared/admin-server.deploy.lock`

目的：

- 防止两个 Jenkins 构建同时部署
- 防止并发迁移数据库
- 防止 `current` 在两个发布任务中互相覆盖

### 4. 解压源码并进入发布目录

远端将源码包解压到本次发布目录，例如：

```text
/srv/blog/staging/admin-server/releases/20260421_213015-13
```

之后所有安装、构建、迁移动作都在这个版本目录内完成。

### 5. 注入环境变量

远端不需要一行行手写 `export`，而是统一通过两份 env 文件加载：

```bash
set -a
. /srv/blog/staging/admin-server/shared/admin-server.public.env
. /srv/blog/staging/admin-server/shared/admin-server.secret.env
set +a
```

这就是最终推荐方式。

优点：

- 结构清晰
- 维护成本低
- Jenkinsfile 不会变成大段重复 `export`
- 敏感和非敏感配置边界清楚

### 6. 安装依赖并构建

远端执行：

- `pnpm install --frozen-lockfile`
- `pnpm build:server`

这里的构建是在远端完成，而不是 Jenkins 本地完成。

原因：

- 减少产物与运行环境不一致的问题
- 让远端始终基于自己的 Node、pnpm、系统环境生成最终运行产物

### 7. 数据库迁移

远端构建完成后执行：

```bash
pnpm --filter @blog/db db:migrate:deploy
```

这一步必须在切换 `current` 之前执行。

原因：

- 如果迁移失败，旧服务还能继续跑
- 只有迁移成功，才允许新版本接管流量

#### 迁移冲突时怎么办

如果数据库迁移失败，本次部署必须立即终止，不要继续执行：

- 不切换 `current`
- 不重启 `pm2`
- 不执行 seed
- 不执行 init-search

此时处理原则是：

1. 保留旧版本继续运行
2. 查看 Prisma migration 报错
3. 人工修复 schema 或数据问题
4. 修复后重新发版

也就是说，迁移失败不是“自动回滚”的场景，而是“根本不切流量”的场景。

### 8. Seed 和 Init Search

这两个动作不应该每次部署都跑。

最终策略：

- `RUN_SEED_IF_EMPTY=false`
- `RUN_INIT_SEARCH=false`

并且放到 Jenkins 参数中手动控制。

#### 8.1 seed 的执行原则

只在以下情况手动开启：

- 首次部署新环境
- 确认数据库为空
- 需要补齐初始化管理员数据

推荐执行逻辑：

- 即使参数打开，也只允许运行 `seed-database-if-empty.js`
- 如果数据库已有用户，则脚本自动跳过

#### 8.2 init-search 的执行原则

只在以下情况手动开启：

- 首次接入 MeiliSearch
- 搜索索引结构有变更
- 需要主动重建全文索引

正常日常发版默认关闭。

### 9. 记录回滚信息并切换 current

新版本准备完成后，先记录回滚信息，再切换软链接：

- 记录当前旧版本路径
- 将 `current` 切换到新版本目录

这样如果后续健康检查失败，就知道应该退回哪个版本。

### 10. 启动 PM2 进程

建议维持两个进程：

- `blog-admin-server-staging`
- `blog-admin-metrics-worker-staging`

启动前先删旧进程，再重新启动，并执行：

- `pm2 save`

这样做的目的：

- 保证环境变量刷新生效
- 保证进程列表和当前版本一致

## 五、健康检查

健康检查 URL 是服务端自己的健康接口，不是前端 URL。

也就是说这里检查的是：

```text
http://192.168.5.120:18000/health
```

不是：

- 前端页面地址
- `/api` 代理地址
- 管理后台登录页 URL

### 检查策略

Jenkins 在部署完成后循环请求健康接口，例如：

- 每 5 秒一次
- 最多重试 18 次

成功条件：

- `curl -fsS` 返回 2xx

失败处理：

- 读取回滚文件
- 将 `current` 指回上一个版本
- 重新启动旧版本 `pm2`
- 本次 Jenkins 构建标记为失败

## 六、回滚策略

回滚只处理一种情况：

- 新版本已经切换并启动，但健康检查失败

回滚流程：

1. 读取 `shared/admin-server.rollback.env`
2. 找到 `PREVIOUS_RELEASE`
3. 重新把 `current` 指向旧版本
4. 重新加载公开和敏感环境变量
5. 重新启动旧版本 PM2 进程
6. `pm2 save`

这个方案的优势是：

- 回滚动作简单
- 不依赖重新上传旧版本
- 只要历史版本还在，就能快速恢复

## 七、历史版本清理

每次部署成功后，建议只保留最近 5 个 release。

目的：

- 避免磁盘被长期占满
- 仍然保留足够的回滚窗口

## 八、Jenkins 参数建议

建议为 Jenkins Job 增加两个布尔参数：

```text
RUN_SEED_IF_EMPTY
RUN_INIT_SEARCH
```

默认值都应为：

```text
false
```

这样普通发版不会误跑初始化逻辑，只有在你明确勾选时才会执行。

## 九、最终版流水线步骤总表

最终版推荐顺序如下：

1. `Checkout`
2. `Verify`
3. `Package`
4. `Deploy`
5. `Health Check`
6. `Cleanup`

每一步职责如下：

- `Checkout`：拉代码
- `Verify`：最小化验证
- `Package`：生成源码包和公开 env 文件
- `Deploy`：上传、远端构建、迁移、条件执行 seed/init-search、启动服务
- `Health Check`：检查 `/health`，失败则回滚
- `Cleanup`：清理历史版本

## 十、发布前人工确认清单

每次发版前至少确认以下内容：

- Jenkins `environment {}` 里的部署 IP、端口、目录正确
- Jenkins Secret File 中只包含敏感信息
- 远端服务器的 Node / pnpm / pm2 可用
- `DATABASE_URL` 指向正确的 `staging` 数据库
- 本次是否真的需要勾选 `RUN_SEED_IF_EMPTY`
- 本次是否真的需要勾选 `RUN_INIT_SEARCH`
- 健康检查 URL 确认是服务端 `/health`

## 十一、发布后人工确认清单

部署成功后建议人工再确认一次：

- `pm2 ls` 中两个 staging 进程都在线
- `curl http://192.168.5.120:18000/health` 返回成功
- 管理后台前端可以正常请求服务端接口
- 登录、文章列表、仪表盘等核心接口没有明显 5xx
- 数据库迁移结果符合预期

## 十二、最终结论

`admin-server` 的 staging 部署不应该再使用“把所有变量全部手写 export 到远端”的方式。

最终推荐方案是：

- Jenkinsfile 只保存公开配置
- Jenkins Secret File 只保存敏感配置
- Jenkins 上传源码包和两份 env 文件
- 远端统一 `source` 公开 env 和敏感 env
- 迁移成功后再切换 `current`
- `seed` 和 `init-search` 默认关闭，改为手动参数控制
- 健康检查失败时自动回滚

这套方案已经足够覆盖日常 staging 发版的主要风险点，并且比旧脚本更清晰、可维护、可排错。
