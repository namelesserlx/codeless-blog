# 文档导航

`docs/` 只放仓库级文档，不放某个单独页面、组件或局部实现的说明。

## 目录结构

```text
docs/
├── repository/   # 仓库治理、任务清单、共享基础层盘点
├── database/     # 数据库设计与数据层方案
├── features/     # 功能相关文档
│   ├── metrics/  # 阅读量、点赞、阅读时长等指标链路
│   └── search/   # 站内搜索与 MeiliSearch
└── release/      # 上线检查与发布前清单
```

## 仓库级文档

### `repository/`

- [仓库优化任务清单](./repository/repo-optimization-task-list.md)
- [共享基础层盘点记录](./repository/shared-foundation-audit.md)
- [仓库级环境变量 Contract](./repository/environment-contract.md)
- [根工作区依赖分类清单](./repository/root-workspace-dependencies.md)
- [仓库级测试基线](./repository/test-baseline.md)
- [Workspace 标准命令入口](./repository/workspace-command-entry.md)

### `database/`

- [数据库架构优化方案](./database/database-architecture-proposal.md)

### `features/metrics/`

- [指标体系架构说明](./features/metrics/metrics-architecture.md)
- [文章报表性能优化方案](./features/metrics/article-report-performance-optimization.md)

### `features/search/`

- [MeiliSearch 快速开始](./features/search/meilisearch-quickstart.md)
- [MeiliSearch 集成说明](./features/search/meilisearch-integration.md)

### `release/`

- [上线前功能检查清单](./release/prelaunch-feature-checklist.md)

## 三端文档入口

- [博客前台文档](../apps/blog/docs/README.md)
- [后台前端文档](../apps/admin/client/docs/README.md)
- [后台服务端文档](../apps/admin/server/docs/README.md)

## 放置规则

- 仓库治理与任务清单放 `repository/`
- 数据库与数据层方案放 `database/`
- 功能相关文档放 `features/`
- 指标链路与统计方案放 `features/metrics/`
- 搜索相关文档放 `features/search/`
- 发布前检查清单放 `release/`
- 只对某个应用生效的说明，放对应应用目录下的 `docs/`
