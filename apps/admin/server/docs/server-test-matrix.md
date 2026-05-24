# 后台服务端最小回归矩阵

这份文档用于固定 `apps/admin/server` 上线前必须可执行的最小回归基线，避免后续修复只靠手工点点点。

## 一、执行入口

- 根目录：`pnpm --filter @blog/server test`
- 单包观察：`pnpm --filter @blog/server test:watch`
- 构建验证：`pnpm --filter @blog/server build`
- 数据层构建：`pnpm --filter @blog/db build`

## 二、当前最小矩阵

当前基线按三个维度组织：

- `tests/auth/**`
  覆盖 JWT、captcha、session manager、security config。
- `tests/controllers/**`
  覆盖后台权限守卫、认证错误语义、查询参数解析。
- `tests/platform/**`
  覆盖 public routes、routes index、upload config、health route、error handling、preview store、email delivery、logger、server env contract、Prisma entrypoint。

当前固定纳入基线的测试文件：

- `tests/auth/captcha.test.ts`
- `tests/auth/jwt-auth.test.ts`
- `tests/auth/security.test.ts`
- `tests/auth/session-manager.test.ts`
- `tests/controllers/admin-permission-guards.test.ts`
- `tests/controllers/auth-error-semantics.test.ts`
- `tests/controllers/query-parsing.test.ts`
- `tests/platform/email.test.ts`
- `tests/platform/email-delivery.test.ts`
- `tests/platform/error-handling.test.ts`
- `tests/platform/health-route.test.ts`
- `tests/platform/logger.test.ts`
- `tests/platform/preview.test.ts`
- `tests/platform/prisma-entrypoint.test.ts`
- `tests/platform/public-routes.test.ts`
- `tests/platform/routes-index.test.ts`
- `tests/platform/env-contract.test.ts`
- `tests/platform/upload.test.ts`

## 三、上线前必须覆盖的风险面

- 认证：缺失 token、非法 token、session 失效、JWT secret 漏配。
- 权限：低权限账号访问系统管理接口、评论审核越权。
- 公共入口：匿名上传、public routes 白名单。
- 运行时契约：错误 status、query 布尔解析、健康检查。
- 多实例状态：文章预览态、邮件发送行为。
- 配置契约：邮件 secure 推导、服务端 env 必填项。

## 四、新增测试的准入规则

- 新增 P0/P1 修复时，优先补一个最小回归测试。
- 测试命名尽量贴近风险面，而不是贴近实现细节。
- 涉及基础设施时，优先 mock 外部依赖，不在单测里直连 Redis、SMTP、COS。
- 如果修复无法通过单测表达，至少补到 smoke list。

## 五、当前边界

- 这不是完整集成测试矩阵。
- 这轮不引入 e2e 框架，不在上线前扩成全链路自动化。
- 前台、后台前端与共享层的组合回归，仍然由仓库根脚本负责。
