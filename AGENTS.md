# Blog Monorepo — AI 协作手册

此文件是仓库入口索引。详细的操作规范见对应的 Skills。

## 仓库结构

| 模块 | 路径 | 栈 | Skill |
|------|------|----|-------|
| 博客前台 | `apps/blog` | Next.js 16 + Tailwind CSS 4 | `blog-frontend` |
| 后台前端 | `apps/admin/client` | Vite 7 + Ant Design 6 + Zustand | `blog-frontend` |
| 后台服务端 | `apps/admin/server` | Koa 3 + Prisma 7 + MySQL + Redis + MeiliSearch | `blog-server` |
| 数据库层 | `packages/db` | Prisma 7 | `blog-db` |
| 共享契约 | `packages/shared` | 跨端类型 + 纯工具 | `blog-arch` |
| 工程配置 | `packages/config` | ESLint / Prettier / TypeScript | `blog-arch` |

## Skills 速查

| Skill | 命令 | 覆盖内容 |
|-------|------|---------|
| **blog-arch** | `/blog-arch` | 仓库结构、环境变量体系（加载顺序/变量表）、共享包管理、CI 质量门禁 |
| **blog-db** | `/blog-db` | 模型图谱、迁移流程、Seed、统计表模式、查询建议 |
| **blog-frontend** | `/blog-frontend` | 前台样式规范、后台 CRUD 三件套（SearchForm/StandardTable/Modal）、构建验证 |
| **blog-server** | `/blog-server` | 三层架构、各层 CRUD 样板、装饰器体系、中间件链、认证流程、错误处理 |

## 协作铁律

1. **先读目标模块的 `AGENTS.md`**，再引用对应的 Skill 获取详细规范
2. **不修改与任务无关的代码**——不改格式、不重构、不"顺便修 bug"
3. **无验证不宣称完成**——改前端 → lint + build，改服务端 → 跑测试，改共享层 → 验证两端编译
4. **不改 `.env` 文件、不泄露凭据**——模板看 `.env.example`

## 常用命令

```
pnpm dev:blog       # 博客前台 :3000
pnpm dev:admin      # 后台前端 :5173
pnpm dev:server     # 后台服务端 :8000
pnpm build:<模块>    # 构建指定模块
pnpm ci:quality     # 完整 CI 质量门禁 (lint + baseline + build)
```

## 提交规范

```
<emoji> type(scope): summary

✨ feat(blog)  🐞 fix(server)  📃 docs(repo)  🦄 refactor(shared)
🎈 perf(blog)  🧪 test(server)  🔧 build(client)  🎡 ci(jenkins)

scope: repo, blog, client, server, db, shared, editor, config, all
```

如果提交包含多个改动点，在 subject 后空一行，用简要要点列出：

```
✨ feat(server): 文章列表支持按标签筛选

- 路由层新增 tagId 查询参数声明
- 服务层 buildWhere 增加 tags 关联过滤
- 补充对应单元测试
```
