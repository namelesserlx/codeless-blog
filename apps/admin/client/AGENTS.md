# apps/admin/client — 管理后台前端

负责内容管理（文章/片段/照片/评论/标签）、系统管理（用户/角色/权限）、仪表盘数据可视化和后台交互流程。管理员通过此端运营整个博客平台。

技术栈: Vite 7 + React 19 + Ant Design 6 + React Router 7 + Zustand

## 引用 Skill

前台样式规范、后台 CRUD 三件套 → 执行 `/blog-frontend`

## 关键路径

```
src/
├── pages/                 # 页面 (按功能目录组织)
├── components/            # 通用组件 (SearchForm, StandardTable, Upload, AuthButton)
├── services/              # API 请求层 (class 模式 + 单例导出)
├── stores/user.ts         # Zustand 状态管理
├── routes/index.ts        # React Router 路由入口
├── config/admin-routes.ts # 路由+菜单+面包屑三合一定义
├── hooks/                 # 自定义 hooks
└── utils/request.ts       # axios 封装 (token 注入 + 错误处理)
```

## 组件规范

- **每页面三件套**: `SearchForm`(搜索) + `StandardTable`(表格) + `Modal`(弹窗)，见 blog-frontend skill
- **权限控制**: 按钮用 `<AuthButton code="article:write" />`，字段用 `<AuthField code="xxx">`
- **图片上传**: `Upload/ImageUpload` 封装了腾讯云 COS 直传流程
- **组件文件**: 页面内的子组件放在 `pages/<Module>/components/` 下，纯展示组件只接收 props

## Hooks 规范

- `usePermission(permission?)` → 检查当前用户是否有指定权限，返回 `boolean`
- `useRequest` → 基于 ahooks 的请求 hook，管理 loading/error 状态
- `useIntersectionObserver` / `useDocumentVisibility` → 浏览器 API 封装
- 业务相关 hook 放在页面目录内（如 `Dashboard/hooks/useDashboardFilterState.ts`）

## Store 规范 (Zustand)

当前只有 `stores/user.ts`，模式：

```ts
interface UserStore extends UserState {
    actions: () => Promise<void>;    // async 方法直接调用 service
    hasPermission: (code?) => boolean; // 同步权限检查
}
```

- state 通过 `authStorage` (localStorage) 持久化登录态和用户信息
- 新增 store 放在 `stores/` 下，按模块命名
- 避免 store 过大，不同领域拆不同 store

使用示例：

```tsx
// 登录 — 按需取单个 action
const login = useUserStore((s) => s.login);
await login(username, password, captcha);

// 权限检查 — 按需取 permissions 数组
const permissions = useUserStore((s) => s.permissions);
const canEdit = permissions.includes('article:write');

// 或直接调用 store 上的 hasPermission 方法
const hasPermission = useUserStore((s) => s.hasPermission);
if (hasPermission('article:write')) { /* ... */ }

// 还有配套的 AuthButton 组件，按权限显隐
<AuthButton permission="article:write">
    <Button type="primary">编辑</Button>
</AuthButton>

// 获取用户信息
const userInfo = useUserStore((s) => s.userInfo);
```

## Services 规范

每条 API 对应一个 Service 类，按模块分文件，单例导出：

```ts
// services/blog/article.ts
export class ArticleService {
    async getList(params: ListRequest): Promise<ResponseData<ListResponse>> {
        return request({ url: '/blog/articles/list', method: 'GET', params });
    }
}
export const articleService = new ArticleService();
```

- 请求统一走 `utils/request.ts`（自动注入 token、统一错误处理）
- URL 路径对应服务端路由，类型从 `@blog/shared` 导入
- 方法名去掉模块前缀（`getArticleList` → `getList`），因为 `articleService.getList()` 已表明所属

## 路由规范

`config/admin-routes.ts` 是**唯一配置来源**，同时驱动三件事：

1. **路由** → `routes/index.ts` 自动消费生成 `RouteObject[]`
2. **菜单** → `utils/menu.ts` 自动消费生成侧边栏
3. **面包屑** → `utils/breadcrumb.ts` 自动消费生成路径映射

```ts
// config/admin-routes.ts
export const layoutRoutes: AppRoute[] = [
    {
        path: 'dashboard',
        meta: { title: '控制台', icon: DashboardOutlined, showInMenu: true, code: 'dashboard' },
        component: () => import('@/pages/Dashboard'),
    },
];
```

新增页面步骤：
1. 在 `pages/` 下创建页面目录和组件
2. 在 `admin-routes.ts` 中注册路由节点（path / meta / component）
3. `routes/index.ts` 自动消费，无需额外配置

## 本地注意点

- 环境变量通过 `import.meta.env.VITE_*` 访问，定义在 `src/config/env.ts`
- API 代理到 `localhost:8000`，配置在 `vite.config.ts`
- 大文件上传通过腾讯云 COS 直传（服务端签名）
- WebSocket 在 `src/utils/websocket.ts` 封装，用于仪表盘实时推送
