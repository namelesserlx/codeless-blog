# Server Error Governance Baseline

## 目的

这份文档用于记录后台服务端错误治理专项的最小回归入口、真实 smoke 观察点和当前基线，避免后续错误处理重构再次引入：

- 同一异常重复打多次日志
- `401/403/404/500` 状态码漂移
- `4xx` 业务失败重新带回重型日志
- 权限缓存或依赖故障再次伪装成普通 `403`

## 自动化回归

优先执行下面这组最小回归：

```bash
pnpm --filter @blog/server test \
  tests/platform/error-handling.test.ts \
  tests/controllers/admin-permission-guards.test.ts \
  tests/services/article-search-error-semantics.test.ts \
  tests/services/request-error-semantics.test.ts
```

覆盖目标：

- 业务异常只记录一次主日志
- `4xx` 默认轻量日志，不带重复 `stack`
- 权限缓存故障返回 `500`，不伪装成 `403`
- 搜索服务配置故障映射成语义化 `500`
- 上传缺文件、摘要空内容等输入错误映射成 `400`

## 真实 Smoke

推荐至少执行一次真实链路验证：

```bash
PORT=8015 NODE_ENV=development APP_ENV=development node apps/admin/server/dist/app.js
curl -i http://127.0.0.1:8015/api/auth/checkLogin
```

预期：

- 响应状态：`401`
- 响应体：`{"code":401,"data":null,"message":"未登录"}`
- 终端日志：一条访问日志 + 一条主错误日志
- 不应再出现：
    - `服务方法 Xxx.yyy 执行失败`
    - `控制器方法 Xxx.yyy 执行失败`

## 当前基线

最近一次真实 smoke 观测结果：

- 时间：`2026-04-20`
- 路径：`GET /api/auth/checkLogin`
- 响应状态：`401`
- 响应体：`code = 401`
- 终端日志：
    - `1` 条访问日志
    - `1` 条 `请求处理出错`
- 观测耗时：`7ms`

## 已知独立噪音

下面这些日志目前不属于“重复异常日志”问题本身：

- `邮件服务连接验证失败 Error: Greeting never received`
- `环境变量组 cos 配置不完整`

它们是独立的基础设施配置/连通性问题，应该单独治理，不应与请求级错误日志重复问题混在一起判断。
