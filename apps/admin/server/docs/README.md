# 后台服务端文档

本目录用于存放 `apps/admin/server` 的应用内文档。

当前关键入口：

- `admin-server-optimization-task-list.md`：后台服务端当前优化周期的主任务文件
- `server-test-matrix.md`：后台服务端最小回归矩阵
- `server-env-contract.md`：服务端与数据库环境变量契约说明
- `server-style-governance-boundary.md`：上线前命名与风格治理边界
- `server-release-smoke-list.md`：上线前 smoke 验收清单
- `server-error-governance-baseline.md`：错误治理专项的最小回归、真实 smoke 与当前性能基线

适合放在这里的内容：

- 服务端模块、路由、控制层与服务层说明
- 认证、会话、搜索、邮件、指标等服务端专项说明
- 服务端重构计划、接口约定与运行说明
- 只对后台服务端生效的实现记录

不适合放在这里的内容：

- 仓库级任务清单
- 共享基础层盘点
- 同时覆盖多个应用的全局架构说明

这些内容应放回仓库根目录下的 `docs/`。
