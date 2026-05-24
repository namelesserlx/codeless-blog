# Blog 前台发布验收清单

> 这份清单用于 `apps/blog` 上线前的最终发布验收。目标不是重复做大范围分析，而是把“是否可以发版”收敛成可执行、可复核的步骤。

## 一、使用方式

每次准备发布 `apps/blog` 时，按顺序执行：

1. 环境与依赖检查
2. 构建基线检查
3. SEO / 资源检查
4. 公开路由 smoke test
5. 登录、注册、重置密码、搜索等交互回归

只有所有阻塞项通过，才进入发布动作。

## 二、环境与依赖检查

- `.env.{APP_ENV}` 或部署注入的运行时环境变量已存在，并与当前发布环境保持一致
- `DATABASE_URL`、`REDIS_HOST`、`REDIS_PORT`、`BLOG_PUBLIC_URL`、`ADMIN_PUBLIC_URL`、`API_PUBLIC_URL`、OAuth 相关变量可用
- 后台服务与博客前台依赖的读接口处于可访问状态

## 三、构建基线检查

在 `apps/blog` 目录执行：

```bash
pnpm lint
pnpm exec tsc --noEmit --incremental false
pnpm exec next build
pnpm exec vitest run tests/contracts/image-loading.contract.test.ts tests/contracts/motion.contract.test.ts tests/contracts/accessibility.contract.test.ts
```

通过标准：

- `lint` 没有新的阻塞错误
- `tsc` 通过
- `next build` 通过
- 契约测试通过

## 四、SEO 与资源检查

- `manifest.webmanifest` 可访问
- icon / avatar / metadata 不再引用不存在的资源
- `sitemap.xml` 与 `robots.txt` 可访问
- `/articles/[id]/opengraph-image` 能正常生成

## 五、公开路由 Smoke Test

本轮发布前回归已通过手工验证。

如需后续自动化复跑，可执行：

```bash
pnpm exec playwright install chromium
pnpm run test:smoke
```

当前 smoke test 覆盖：

- `/`
- `/articles`
- `/articles/[id]`，通过文章列表进入详情
- `/tags`
- `/photos`
- `/snippets`
- 搜索弹层打开
- 移动端菜单打开登录 / 注册弹层
- `/auth/reset-password` 无 token 的兜底状态

## 六、手工回归建议

- 首页首屏、导航、搜索入口、主题切换
- 文章列表、文章详情、标签筛选
- 相册页和片段页的媒体预览
- 登录、注册、忘记密码、重置密码
- 评论表单与评论列表加载

## 七、当前结论

- 这份清单是 `apps/blog` 的发布验收入口
- 如果 smoke test 或构建基线失败，应先回到任务清单修复，再继续发版
