# 路由与菜单约定（apps/admin/client）

> 本文用于约束管理后台前端的路由 path 命名与菜单/权限映射规则，方便后续重构和扩展。

## 1. 路由命名规则

- **统一使用小写短横线风格（kebab-case）**
    - 例如：`/blog/article-detail`、`/system/user-profile`
- **模块级前缀**
    - 博客模块：`/blog/*`
    - 系统管理：`/system/*`
    - 个人中心：`/profile`（挂在根下）
- **操作语义放在 path 尾部**
    - 列表页：`/blog/article`
    - 详情页：`/blog/article/:id`
    - 编辑页：`/blog/article/edit/:id`

## 2. 路由与菜单的映射

- 每一个可在侧边菜单中展示的页面，都应具备以下元数据字段（在路由配置中或统一的 `RouteMeta` 中）：
    - `title`: 菜单与面包屑显示名称
    - `icon`: 菜单图标（Ant Design Icon 组件）
    - `showInMenu`: 是否显示在侧边菜单
    - `showInBreadcrumb`: 是否显示在面包屑
    - `order`: 同级菜单排序
    - `code`: 对应后端权限编码（详见下文）
    - `permissionType`: 权限类型，如 `DIRECTORY` / `MENU` / `BUTTON` 等

## 3. 权限 code 约定

- **命名规范**
    - 目录级：使用模块名，例如：`dashboard`、`blog`、`system`
    - 菜单级：`模块_资源`，例如：`blog_article`、`blog_comment`、`system_user`
    - 按钮/操作级：`模块_资源_动作`，例如：`blog_article_create`、`system_user_reset_password`
- **前后端对齐**
    - 后端权限表中的 `code` 字段必须与前端 `meta.code` 一致。
    - 新增菜单或按钮时，需同时在后端新增对应权限记录。

## 4. 路由配置建议

- 后续会在 `src/config/routes.ts` 中维护**单一来源**的路由配置：
    - 由该配置生成：
        - React Router `RouteObject[]`
        - 菜单树结构（用于侧边栏）
    - 不在业务组件中直接硬编码 path 字符串，统一从常量或路由配置导出使用。

## 5. 渐进式演进建议

- 新增页面或菜单时，优先遵循本约定；
- 旧路由在重构前可以保持不变，但建议逐步迁移到统一的配置与命名方式。
