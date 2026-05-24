# 后台服务端上线 smoke list

这份清单用于上线前最后一轮人工验收，重点验证“服务能不能稳住”，而不是追求完整业务回归。

## 一、上线前命令检查

- `pnpm --filter @blog/server test`
- `pnpm --filter @blog/db build`
- `pnpm --filter @blog/server build`

如果这三步有一项失败，不进入发布。

## 二、启动与基础设施检查

- `/health` 返回 `200`，并且 body 可识别服务存活。
- 服务启动时没有 `JWT_SECRET`、`DATABASE_URL`、`REDIS_HOST`、`REDIS_PORT` 缺失告警。
- Redis 连接正常。
- 需要用到搜索时，MeiliSearch 可连通。
- 需要发邮件时，SMTP 配置完整且连接验证成功。

## 三、关键链路 smoke

- 登录成功，返回正常 session / token。
- 无 token 请求后台接口返回 `401`，不是 `200`。
- 低权限账号访问系统管理写接口时返回 `403`。
- 匿名用户无法访问后台上传接口。
- 上传合法图片可成功，超限或非法类型被拒绝。
- 文章创建 / 更新后不影响主流程，搜索同步失败时有 warning 日志。
- 评论普通编辑与后台审核路径行为分离。
- 文章预览在多实例场景下仍可命中 Redis 预览态。

## 四、人工抽检项

- Swagger 文档前缀与真实路由一致。
- public routes 清单里没有后台敏感写接口。
- 生产环境不注册测试邮件路由。
- 日志中不出现验证码、token、密码、完整评论对象。

## 五、回滚前提

出现下面任一情况，应立即停止上线或准备回滚：

- 启动期环境变量校验失败。
- 登录链路或权限链路出现大面积 `500`。
- 上传、评论审核、文章保存等后台核心链路不可用。
- Redis / 数据库 / 搜索依赖无法建立连接且无降级路径。

## 六、后续配套文档

- [server-test-matrix.md](./server-test-matrix.md)
- [server-env-contract.md](./server-env-contract.md)
- [server-style-governance-boundary.md](./server-style-governance-boundary.md)

## 七、本地烟测记录

### 2026-04-11

本地已实际执行并验证通过的链路：

- `/health` 返回 `200`
- 匿名访问后台接口返回 `401`
- 普通用户审核评论返回 `403`
- 普通用户创建评论、编辑本人评论成功
- 具备 `content` 权限的编辑账号可审核评论
- 匿名上传返回 `401`
- 非法文件类型上传返回 `400`
- 超限文件上传返回 `400`
- 文章创建 / 更新 / 删除成功
- 文章预览 token 创建成功，预览内容可从 Redis 命中
- 在补齐 `COS_BUCKET` / `COS_REGION` 的本地运行值后，合法图片上传成功

本地运行时观察到的环境提示：

- 默认本地 `.env` 仍缺 `COS_BUCKET` / `COS_REGION`
- 本地 `.env` 目前给了 Redis 密码，但本机 Redis 实例没有开启 `requirepass`，启动时会有一条连接 warning
- GitHub / Google OAuth redirect URI 已统一由 `BLOG_PUBLIC_URL` / `ADMIN_PUBLIC_URL` 派生；如需搜索能力，仍需显式提供 `MEILI_URL` 与 `MEILI_ADMIN_KEY`
