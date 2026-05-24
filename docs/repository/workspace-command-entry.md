# Workspace 标准命令入口

本文件用于定义仓库级推荐命令入口，避免开发时直接从各应用脚本里“猜命令”。

## 1. 根目录标准入口

日常开发、构建、格式化与数据库操作，优先使用根目录脚本。

### 开发

```bash
pnpm dev:blog
pnpm dev:admin
pnpm dev:server
```

### 构建

```bash
pnpm build:blog
pnpm build:admin
pnpm build:server
pnpm build
```

### 代码质量

```bash
pnpm lint
pnpm format
```

### 数据库

```bash
pnpm db:generate
pnpm db:push
pnpm db:studio
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:reset
pnpm db:seed
```

## 2. 应用级专项入口

以下脚本仍然保留在应用目录下，但定位是专项入口，不是仓库级默认入口。

### `apps/blog`

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm format`

适用场景：

- 只针对前台做局部调试
- 只验证 Blog 应用本身

### `apps/admin/client`

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm preview`
- `pnpm format`

适用场景：

- 只针对后台前端做局部调试
- 只验证管理端前端构建或预览

### `apps/admin/server`

- `pnpm dev`
- `pnpm test`
- `pnpm test:watch`
- `pnpm build`
- `pnpm init-admin:*`
- `pnpm init-search:*`
- `pnpm metrics:worker:*`
- `pnpm clean`

适用场景：

- 服务端专项测试与调试
- 初始化管理员或搜索索引
- 调试指标 worker

## 3. 使用规则

- 日常开发优先使用根目录脚本
- 只有在明确需要应用内上下文时，才进入应用目录使用局部脚本
- README、AGENTS 和任务文档中的主命令入口，应统一指向根目录脚本
- 应用级脚本可以继续保留，但不应替代根目录作为主要开发入口
