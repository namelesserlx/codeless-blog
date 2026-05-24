# 仓库级测试基线

本文件用于定义当前仓库的最小测试基线，目标是让后续优化有统一入口和最基本的回归护栏。

## 1. 根级测试入口

当前统一从根目录执行以下命令：

```bash
pnpm test
```

该命令当前等价于：

```bash
pnpm test:server && pnpm test:db
```

当前根级测试入口已经覆盖：

- `apps/admin/server` 的 Vitest 用例
- `packages/db` 的 Vitest 用例

## 2. 当前最小验证矩阵

### 必跑项

```bash
pnpm test
```

用途：

- 运行 `apps/admin/server` 当前已有的 Vitest 用例
- 运行 `packages/db` 的 Prisma 升级与入口回归测试
- 作为仓库级最小自动化测试入口

### 共享层 smoke check

```bash
pnpm check:shared
```

用途：

- 验证 `@blog/shared` 仍可正常构建

## 3. 当前执行顺序

在进行仓库治理或共享基础层改动时，推荐按下面的顺序执行：

1. `pnpm test`
2. `pnpm check:shared`

## 4. 当前边界

这份基线只代表仓库当前已经具备的最小自动化能力，不代表最终测试体系已经完善。

当前已知边界：

- Blog 前台尚未纳入自动化测试
- Admin Client 尚未纳入自动化测试
- `@blog/db` 已纳入这份基线，但目前只覆盖 Prisma 配置与入口回归，不覆盖真实数据库集成行为
- 仓库级 CI 还未建立，这部分由 `A-07` 继续推进

## 5. 后续扩展方向

- 把 Blog 前台纳入自动化验证
- 把 Admin Client 纳入自动化验证
- 给共享包补齐更明确的测试或导出面校验
- 在 `A-07` 中把这份基线接入 CI
