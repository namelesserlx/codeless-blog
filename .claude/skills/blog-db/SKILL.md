---
name: blog-db
description: Blog 数据库操作 — Prisma 模型图谱、迁移流程、Seed、统计表模式、查询建议
user-invocable: true
argument-hint: [generate|migrate|seed|studio|schema]
---

# Blog DB — 数据库

## 一、数据模型图谱

### 内容实体

```
User (1) ──── Post (n)         # 作者关联
User (1) ──── Snippet (n)      # 作者关联
User (1) ──── Comment (n)      # 评论作者
Post (1) ──── Tag (n)          # 多对多 (Post 有 tags[])
Post (1) ──── Comment (n)      # 文章评论 → postId
Snippet (1) ── Comment (n)     # 片段评论 → snippetId
Comment (1) ── Comment (n)     # 嵌套回复 → parentId
```

### RBAC 权限体系

```
User (n) ──── UserRole (n) ──── Role (n)
Role (n) ──── RolePermission (n) ──── Permission (n)
```

- `Role` 支持层级树（`parentId` → children），`level` 数字越小权限越大
- `Permission` 类型: `DIRECTORY`(目录) / `MENU`(菜单) / `BUTTON`(按钮)
- 权限 code 如 `article`, `article:write`, `article:manage`

### 匿名统计表（7 个）

| 表 | 唯一约束 | 说明 |
|----|---------|------|
| PostLike | `[postId, visitorId]` | 文章点赞 |
| PostViewDaily | `[postId, visitorId, viewedAt]` | 日 UV |
| PostReadTime | `[postId, visitorId]` | 累计阅读秒数 |
| SnippetLike | `[snippetId, visitorId]` | 片段点赞 |
| SnippetViewDaily | `[snippetId, visitorId, viewedAt]` | 片段日 UV |
| SnippetReadTime | `[snippetId, visitorId]` | 片段阅读时长 |
| CommentLike | `[commentId, userId]` | 评论点赞（登录用户） |

### ID 策略

| 场景 | ID 类型 | 原因 |
|------|---------|------|
| Post, Snippet | `cuid String` | 全局唯一，防枚举 |
| User, Role, Permission, Tag, Comment, Photo | `autoincrement Int` | 查询频繁，性能优先 |

## 二、常用操作

```bash
pnpm db:generate          # 修改 schema 后重新生成 Client
pnpm db:migrate:dev       # 创建新迁移（dev 环境）
pnpm db:migrate:deploy    # 生产环境应用迁移
pnpm db:seed              # 填充种子数据
pnpm db:studio            # 启动 Prisma Studio
pnpm db:reset             # 重置数据库（危险！）
```

## 三、修改 Schema 流程

1. 编辑 `packages/db/prisma/schema.prisma`
2. `pnpm db:generate` → 验证无编译错误
3. `pnpm db:migrate:dev -- --name <描述>` → 创建迁移
4. 检查生成的 migration.sql 是否正确
5. 提交 schema + migration + generated 目录

## 四、查询建议

- **分页**: 使用 `skip` + `take`，配合 `orderBy` + 复合索引
- **统计表查询**: 尽量走 `@@index` 覆盖的查询路径
- **关联查询**: `include` / `select` 按需取字段，避免 SELECT *
- **复杂聚合**: 考虑中间结果存入 Redis
