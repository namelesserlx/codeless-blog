# packages/db — 数据库层

统一管理所有数据模型定义、迁移历史和种子数据。所有端通过 `@blog/db` 获取 Prisma Client 实例。

Prisma 7 + MySQL 8+。

## 引用 Skill

模型图谱、迁移流程、查询建议 → 执行 `/blog-db`

## 关键文件

```
prisma/schema.prisma       # 数据模型 (10 实体 + 7 统计表)
prisma/seed.ts             # 种子数据 (默认账号 + 文章 + 标签)
prisma/migrations/          # 迁移历史
generated/prisma/           # 自动生成的 Client (不手动改)
index.ts                    # Prisma Client 统一导出
```

## 本地注意点

- 修改 schema 后必须 `pnpm db:generate` 重新生成 Client
- 生产环境永远用 `db:migrate:deploy` 而非 `db:push`
- 内容表 (Post, Snippet) 使用 `cuid`，系统表使用自增 `Int`
- 统计表通过 `@@unique` 约束保证幂等
- `pnpm db:studio` 启动 Prisma Studio 图形界面查看数据
