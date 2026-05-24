# apps/blog — 博客前台

负责公开页面渲染、文章/片段/照片的内容展示、搜索入口、评论互动和用户登录。面向所有访客的端。

技术栈: Next.js 16 App Router + React 19 + Tailwind CSS 4 + Turbopack

## 引用 Skill

Next.js 渲染规范、SEO、数据获取、样式指南 → 执行 `/blog-frontend`

## 关键路径

```
app/
├── layout.tsx             # 根布局 (Header + Main + Footer)
├── page.tsx               # 首页 (SSR/SSG)
├── articles/[id]/         # 文章详情页 (SEO + 评论 + 交互)
│   ├── page.tsx           #   async server component
│   ├── seo.ts             #   Metadata + JSON-LD + OG
│   ├── data.ts            #   react.cache 数据获取
│   ├── opengraph-image.tsx # 动态 OG 图片
│   ├── toc.ts             #   目录提取
│   └── _components/       #   'use client' 交互组件
├── snippets/              # 片段页
├── photos/                # 照片流
├── tags/                  # 标签浏览
├── about/                 # 关于页
├── api/                   # API Routes (posts, snippets, search, comments, photos, tags)
├── sitemap.ts             # 动态 sitemap (revalidate=3600)
├── robots.ts              # robots.txt
└── manifest.ts            # PWA manifest
components/                # 通用 UI 组件 (header, search, ui, theme, footer)
lib/server/                # 服务端数据查询 (server-only)
lib/client/                # 客户端工具 (api-client, hooks, visitor-id)
config/                    # 环境变量与服务配置
context/                   # AuthContext
types/                     # 前台类型
```

## 渲染与数据获取

- 大部分页面使用 **SSR** (async server component 直接取数据)
- 服务端数据查询在 `lib/server/db.ts`，文件顶部 `import 'server-only'`
- 客户端组件需交互时通过 `app/api/*` API Routes 调用
- 同一页面多处复用同个数据 → `react.cache()` 包装（见 `data.ts`）

## SEO

- 文章详情页三件套: `seo.ts`(Metadata + OG + Twitter) + JSON-LD + 动态 OG Image
- 全站: `sitemap.ts` + `robots.ts` + 语义化 HTML 结构

## 本地注意点

- `pnpm dev:blog` 使用 Turbopack，热更新快但部分 Next.js 特性可能不兼容
- **build 阶段需要数据库连接**（`lib/server/db.ts` 在构建时被引用）
- PWA manifest 在 `app/manifest.ts` 动态生成
- 访客追踪通过 `@fingerprintjs/fingerprintjs` 生成 `visitorId`
- 编辑器包 `@namelesserlx/editor` 同时在后台使用，修改需验证两端

## 测试

| 命令 | 类型 |
|------|------|
| `test:contracts` | Vitest 合同测试 |
| `test:unit` | Vitest 单元测试 |
| `test:e2e` | Playwright E2E |
