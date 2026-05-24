---
name: blog-frontend
description: Blog 前端开发 — Next.js 渲染/SEO/数据获取规范、后台 CRUD 三件套、样式与构建
user-invocable: true
argument-hint: [blog|admin|style|seo]
---

# Blog Frontend — 前端开发

## 一、Next.js 渲染策略 (apps/blog)

### 页面渲染方式

| 渲染方式           | 适用页面                   | 示例文件                               |
| ------------------ | -------------------------- | -------------------------------------- |
| **SSR (动态)**     | 文章详情、片段列表、标签页 | `app/articles/[id]/page.tsx`           |
| **SSG (静态)**     | 首页、关于页               | `app/page.tsx`                         |
| **ISR (增量静态)** | sitemap                    | `app/sitemap.ts` (`revalidate = 3600`) |

- 大部分页面使用 SSR（默认），因为内容频繁更新
- 页面组件是 **async server component**，直接在组件内 `await` 获取数据
- 路由参数通过 `params: Promise<{id: string}>` 获取（Next.js 16）

### 服务端组件 vs 客户端组件

```
app/
├── page.tsx              # 默认 server component
├── articles/[id]/
│   ├── page.tsx          # server component (数据获取 + SEO)
│   └── _components/
│       ├── ArticleActions.tsx        # 'use client' 交互组件
│       ├── ArticleContentRenderer.tsx # 'use client' 富文本渲染
│       └── comments/CommentForm.tsx   # 'use client' 表单
└── _providers/
    └── ThemeProvider.tsx   # 'use client' 上下文
```

- **默认用 server component**，只在需要交互（onClick、useState、useEffect）时加 `'use client'`
- 客户端组件放在 `_components/` 下，由 server 组件引入

### 数据获取

**方式一：服务端组件直接查询（推荐）**

```ts
// lib/server/db.ts — 标记为 'server-only'
import { prisma } from '@blog/db';
export async function getPublishedArticles() { ... }

// app/articles/[id]/page.tsx — 直接在 async 组件中 await
export default async function ArticlePage({ params }) {
    const data = await getArticlePageData({ params, searchParams });
    return <ArticlePageShell article={data.article} />;
}
```

- 所有服务端数据查询放在 `lib/server/` 下
- 文件顶部加 `import 'server-only'` 防止被客户端代码意外引入

**方式二：Next.js API Routes（`app/api/`）**

```ts
// app/api/posts/[id]/like/route.ts — 内部 API，供客户端组件交互使用
export async function GET(request: NextRequest) { ... }
```

- 客户端组件直接用 `fetch('/api/posts/' + id + '/like')` 调用（相对路径，同源）
- 适用于点赞、浏览上报、搜索等**读密集或频繁操作**，不走外部 API 避免跨域/延迟

**方式三：`apiRequest` 调用外部 Admin Server API**

```ts
import { apiRequest } from '@/lib/client/api-client';
// 实际请求 `http://localhost:8000/api/auth/login`
await apiRequest({ endpoint: '/api/auth/login', method: 'POST', data: { username, password } });
```

- `apiRequest` 指向 `publicEnv.urls.api`（Admin Server 地址）
- 适用于**登录、注册、OAuth 回调、评论提交、用户资料**等需要 Admin Server 处理的操作
- 与方式二的区别：方式二走 Next.js 自管路由（读 Prisma/MeiliSearch），方式三走外部 API（需要 Admin Server 运行）

**方式四：`react.cache`（同页面多组件复用）**

```ts
// data.ts — 用 cache() 包装，确保同一请求中重复调用只查一次
const resolveArticle = cache(async (articleId: string) => {
    return await getArticleById(articleId);
});
```

### 三种方式选型速查

| 场景                         | 方式                                | 示例                                       |
| ---------------------------- | ----------------------------------- | ------------------------------------------ |
| SSR 页面初始数据             | 服务端组件直接查 `lib/server/db`    | 文章列表、文章详情、首页                   |
| 客户端交互（点赞/浏览/搜索） | `fetch('/api/*')` Next.js API Route | `app/api/posts/[id]/like`                  |
| 登录/注册/评论/用户资料      | `apiRequest` 调用 Admin Server      | `apiRequest({endpoint:'/api/auth/login'})` |
| 同页面多处复用相同查询       | `react.cache()` 包装                | 文章详情页的 data/seo/组件                 |

## SEO 规范

### Metadata API

- 每个页面导出 `generateMetadata` 函数（如 `app/articles/[id]/page.tsx`）
- 使用 Next.js Metadata API，不手动管理 `<head>`

### 关键 SEO 文件

```
app/
├── sitemap.ts            # 动态 sitemap.xml (含所有公开文章)
├── robots.ts             # robots.txt 配置
└── manifest.ts           # PWA manifest
```

### 文章详情页 SEO 三件套

每个文章详情页包含（实现在 `app/articles/[id]/seo.ts`）：

1. **Metadata** → `buildArticleMetadata()`: OG/Twitter card/keywords/authors
2. **JSON-LD** → `buildArticleJsonLd()`: Schema.org Article 结构化数据
3. **OpenGraph 图片** → `opengraph-image.tsx`: 动态 OG Image

### 性能优化

- 字体使用本地可变字体 (`IBMPlexSans-VariableFont`)，替代 Google Fonts
- 图片使用 Next.js `<Image>` 组件（自动优化/懒加载/WebP）
- PWA 支持 (manifest + service worker)

## 二、后台 CRUD 三件套规范 (apps/admin/client)

### SearchForm + StandardTable + Modal

```tsx
// 1. SearchForm — Ant Design Form 封装
<SearchForm onSearch={onSearch} onReset={onReset} loading={loading}>
  <Form.Item name="keyword" label="关键词">
    <Input placeholder="搜索..." />
  </Form.Item>
  <Form.Item name="status" label="状态">
    <Select placeholder="请选择" allowClear options={statusOptions} />
  </Form.Item>
</SearchForm>

// 2. StandardTable — Ant Design Table 封装
<StandardTable<ItemType>
  columns={columns} dataSource={dataSource} loading={loading} rowKey="id"
  pagination={{ total, current, pageSize, onPageChange }}
  toolbar={<Button type="primary">新增</Button>}
/>

// 3. Modal — @ebay/nice-modal-react 管理弹窗
<NiceModalUse show={visible} onOk={handleSave} onCancel={handleClose}>
  <Form form={form}>...</Form>
</NiceModalUse>
```

- 每页面三件套 + 权限控制组件 `AuthButton` / `AuthField`
- 列配置 `columns` 在页面文件中定义
- Modal 接收 `record?` 参数区分新增/编辑

### 请求层 (services)

```ts
export class ArticleService {
    async getList(params: ListRequest): Promise<ResponseData<ListResponse>> {
        return request({ url: '/blog/articles/list', method: 'GET', params });
    }
}
export const articleService = new ArticleService();
```

- class 模式 + 单例导出，统一走 `utils/request.ts`
- 类型从 `@blog/shared` 导入

## 三、样式规范

### apps/blog — Tailwind CSS 4 体系

#### Tailwind 4 配置方式

项目使用 **Tailwind CSS 4（CSS-first configuration）**，与传统 Tailwind 3 的区别：

| 特性       | Tailwind 3                            | Tailwind 4（本项目）                 |
| ---------- | ------------------------------------- | ------------------------------------ |
| 配置       | `tailwind.config.js`                  | `globals.css` 中 `@theme` 块内联定义 |
| 入口       | `@tailwind base/components/utilities` | `@import 'tailwindcss'` 单行         |
| 插件       | `plugins: [...]`                      | `@plugin '...'` 指令                 |
| 自定义变体 | `variants: [...]`                     | `@custom-variant` 指令               |

核心 CSS 入口文件 `apps/blog/app/globals.css`：

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@custom-variant dark (&:is(.dark *));
@plugin '@tailwindcss/typography';
```

- 所有颜色/圆角/字体等 token 定义在 `@theme inline { ... }` 块中
- 无需 `tailwind.config.js`（配置在 `components.json` 中仅为 shadcn-ui 工具链保留）

#### 颜色系统 — CSS 变量 + shadcn-ui 体系

颜色体系基于 **CSS 变量 + 暗色模式切换**，遵循 shadcn-ui 的命名约定：

```css
/* globals.css */
:root {
    --background: #f7fafc; /* 亮色-页面背景 */
    --foreground: oklch(0.145 0 0); /* 亮色-文字主色 */
    --primary: #0ea5e9; /* 亮色-主题色 sky-500 */
    --card: oklch(1 0 0); /* 亮色-卡片背景 */
    --border: oklch(0.922 0 0); /* 亮色-边框 */
    --radius: 0.625rem; /* 通用圆角基准 */
}

.dark {
    --background: #1a202c; /* 暗色-页面背景 */
    --foreground: oklch(0.985 0 0); /* 暗色-文字主色 */
    --primary: #0ea5e9; /* 暗色-主题色不变 */
    --card: oklch(27.8% 0.033 256.848); /* 暗色-卡片背景 */
    --border: oklch(1 0 0 / 10%); /* 暗色-边框 */
}
```

使用方式：

```html
<div class="bg-background text-foreground">
    <h1 class="text-primary">标题</h1>
    <div class="bg-card border-border rounded-lg">卡片</div>
</div>
```

所有颜色通过 CSS 变量定义在 `@theme inline {}` 中，Tailwind 自动生成 `bg-background` / `text-foreground` 等工具类，不需要手动写 `var(--background)`。

#### 暗色模式

- 通过 `next-themes` 的 `ThemeProvider`（`app/_providers/ThemeProvider.tsx`）管理
- HTML 元素上 class 切换为 `.dark`，对应 Tailwind 自定义变体：
    ```css
    @custom-variant dark (&:is(.dark *));
    ```
- 组件中直接用 `dark:` 前缀：
    ```html
    <div class="bg-white text-black dark:bg-gray-800 dark:text-white" />
    ```

#### 排版与 Typography

- 使用 `@tailwindcss/typography` 插件（通过 `@plugin` 指令加载）
- 文章正文用 `prose` 类：
    ```html
    <article class="prose dark:prose-invert max-w-none">
        <!-- 文章 HTML 内容，由 ArticleContentRenderer 渲染 -->
    </article>
    ```
- `prose` 自动处理标题层级、列表、引用块等文章排版
- `dark:prose-invert` 自动切换暗色模式下的排版颜色

#### 字体系统

- 使用 **本地 IBM Plex Sans 可变字体**，替代 Google Fonts 加载
- 配置在 `app/layout.tsx`：
    ```tsx
    const ibmPlexSans = localFont({
        variable: '--font-ibm-plex-sans',
        src: [
            { path: '../public/fonts/IBMPlexSans-VariableFont_wdth,wght.ttf' },
            {
                path: '../public/fonts/IBMPlexSans-Italic-VariableFont_wdth,wght.ttf',
                style: 'italic',
            },
        ],
    });
    ```
- 在 CSS 中通过 `@theme` 引用：
    ```css
    @theme inline {
        --font-sans: var(--font-ibm-plex-sans), 'IBM Plex Sans', system-ui, sans-serif;
    }
    ```

#### 组件样式策略

**Tailwind 工具类优先** — 通用布局、间距、简单颜色直接写在 className 中：

```tsx
<div className="bg-card flex items-center gap-2 rounded-lg px-4 py-3" />
```

**CSS Modules 适用场景**（放在组件同级的 `.module.css` 中）：

- 复杂动画关键帧（如 `fade-in-section.module.css`）
- 编辑器内部样式覆盖（如 `ArticleContentRenderer.module.css`）
- **不用 CSS Modules 做布局或颜色**——这些用 Tailwind 解决

#### shadcn-ui 组件体系

UI 基础组件在 `components/ui/` 下，通过 `components.json` 配置：

```json
{ "style": "new-york", "aliases": { "ui": "@/components/ui" } }
```

这些组件（`button`, `dialog`, `card`, `dropdown-menu`, `command` 等）基于 Radix UI + Tailwind 构建：

- 直接在组件文件内用 `cn()` + Tailwind 类名控制样式
- 从 `@radix-ui/*` 获取无障碍行为
- 暗色模式自动适配（通过 `.dark` 和 CSS 变量）
- 新增 UI 组件时，参考现有组件模式（导入 `cn`，使用 `cva` 管理 variants）

#### 动画体系

| 动画类型   | 方案                            | 适用范围                                 |
| ---------- | ------------------------------- | ---------------------------------------- |
| 滚动入场   | `FadeInSection`（CSS keyframe） | 首页、文章列表的滚动渐入                 |
| 基础交互   | `motion` 库 `motion.div`        | hover/tap/transition 动效                |
| 页面级动画 | `AnimatePresence`（motion）     | 模态框、菜单的进出场                     |
| CSS 动画   | 直接写 `@keyframes`             | 打字机（`typewriter-effect.module.css`） |

使用示例：

```tsx
// 优先用封装的 FadeInSection
<FadeInSection direction="up" delay={200}>
    <ArticleCard />
</FadeInSection>

// 精细控制用 motion
<motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
    <Card />
</motion.div>
```

#### 响应式断点

使用 Tailwind 默认断点：

```
sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

项目中实际使用模式：

- **Header**: 三套布局 `mobile(<768)` / `pad(768-1024)` / `PC(>1024)`，见 `components/header/right/`
- **文章卡片**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **照片流**: `columns-1 md:columns-2 lg:columns-3`

#### motion 库注意事项

项目使用 `motion`（原 framer-motion 更名后的包），不是 `framer-motion`：

```tsx
import { motion, AnimatePresence } from 'motion/react';
// 不是从 'framer-motion' 导入
```

### apps/admin/client — Ant Design 6 + Less

- Ant Design 6 组件按需使用，无需额外加载配置
- Less 文件使用 CSS Modules 模式（`.module.less`），放在页面同级目录
- 项目主色/主题通过 Ant Design 的 `ConfigProvider` 全局配置（如需要）
- 页面布局的间距/尺寸参照 Ant Design 的 Design Token 体系
- 不混用 Less 和 Tailwind——admin client 全部使用 Less + Ant Design

## 四、构建验证

```bash
pnpm dev:blog        # 博客前台 :3000 (Turbopack)
pnpm dev:admin       # 后台前端 :5173 (Vite)
pnpm build:blog      # 博客前台构建（需要数据库连接）
pnpm build:admin     # 后台前端构建
```
