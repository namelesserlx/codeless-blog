# 路由与菜单系统重构方案

## 一、现状问题分析

### 1.1 当前文件与职责

| 文件               | 名义职责          | 实际内容                                                                                                                                                                   |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/route.ts`   | 类型定义          | `RouteMeta`、`ExtendedRouteObject`、`ButtonPermission`，但 `ExtendedRouteObject` 带有 `[key: string]: any` 且是一个多余的中间类型                                          |
| `config/routes.ts` | 统一路由配置源    | `appRoutes` 数据 + `buildExtendedRoutes` + `buildReactRouterConfig`（从未使用）+ `buildMenuTree`（从未使用），还反向导入了 `MenuItem` 类型                                 |
| `routes/index.ts`  | React Router 配置 | 导入 `appRoutes` 只为构建 `extendedRoutes` 并再导出给 `menu.ts` 用；实际的 React Router 路由树仍然是手写的，与 `appRoutes` 毫无关联                                        |
| `config/menu.ts`   | 菜单配置          | 导入 `extendedRoutes`（从 `routes/index.ts`），用自己的 `generateMenuFromRoutes` 生成菜单（与 `config/routes.ts` 的 `buildMenuTree` 重复），还混入了面包屑、路径映射等功能 |

### 1.2 核心问题

**问题 1：「单一配置源」名存实亡**

`config/routes.ts` 里的 `appRoutes` 只被用来生成 `extendedRoutes`（仅供菜单使用）。真正的 React Router 路由树（`routes/index.ts` 里的 `routes`）是完全独立手写的。也就是说：

- 新增一个页面需要改两个地方：`appRoutes`（菜单元数据）和 `routes`（路由懒加载）。
- 它们之间没有任何代码级关联，只靠"path 字符串一致"来隐式同步。

**问题 2：数据流转混乱，存在实质性的循环依赖**

```
config/routes.ts  →(appRoutes)→  routes/index.ts  →(extendedRoutes)→  config/menu.ts
      ↑                                                                      │
      └──────────── import { MenuItem } from config/menu ─────────────────────┘
```

- `config/routes.ts` 导入 `MenuItem` 类型 ← 来自 `config/menu.ts`
- `config/menu.ts` 导入 `extendedRoutes` ← 来自 `routes/index.ts`
- `routes/index.ts` 导入 `appRoutes` ← 来自 `config/routes.ts`

这是一个 A→B→C→A 的三角循环依赖（目前因为只是类型导入所以运行时不报错，但逻辑上非常不健康）。

**问题 3：大量死代码和重复逻辑**

- `buildReactRouterConfig()`：从未被调用。
- `buildMenuTree()`：从未被调用。
- `config/menu.ts` 的 `generateMenuFromRoutes()` 与 `config/routes.ts` 的 `buildMenuTree()` 做的是同一件事。
- `menuConfig`、`pathNameMap` 等"向后兼容"的模块级常量，在组件中实际被 `getMenuConfig()`、`getPathNameMap()` 函数调用取代。

**问题 4：`ExtendedRouteObject` 是一个多余的中间类型**

它的唯一作用是在 `AppRoute` 和 `MenuItem` 之间做一层转换。如果 `config/menu.ts` 直接消费 `AppRoute`，这个类型就完全不需要了。

**问题 5：`config/menu.ts` 职责过重**

一个菜单文件里包含了：

- 菜单树生成（`generateMenuFromRoutes`、`getMenuConfig`、`getMenuItems`）
- 路径查找（`findMenuItemByPath`、`getParentPath`、`findRouteByPath`）
- 路径 → 名称映射（`createPathNameMap`、`getPathNameMap`、`pathNameMap`）
- 面包屑生成（`generateBreadcrumbItems`）

面包屑和路径映射在语义上更接近「导航工具」而非「菜单配置」。

**问题 6：布局组件被重复懒加载**

`routes/index.ts` 中，`@/layouts` 被懒加载了 3 次（根 `/`、`system`、`blog`），这意味着 Layout 组件会被加载 3 次实例。按正常结构应该是所有需要鉴权的页面共享一个 Layout 路由节点。

---

## 二、重构目标

1. **真正的单一配置源**：一份配置同时驱动路由和菜单，不需要手动同步。
2. **消除循环依赖**：数据流向清晰单向。
3. **删除所有死代码和重复逻辑**。
4. **删除不必要的中间类型**（`ExtendedRouteObject`）。
5. **职责分离**：路由归路由，菜单归菜单，面包屑归导航工具。
6. **统一布局路由节点**：所有鉴权页面共享一个 Layout。

---

## 三、重构后的文件结构

```
src/
├── types/
│   └── route.ts              # 类型定义：AppRoute、RouteMeta、MenuItem
├── config/
│   └── app-routes.ts         # 单一配置源（数据 + 页面导入映射）
├── routes/
│   └── index.ts              # 只做一件事：生成 React Router 的 RouteObject[]
├── utils/
│   └── menu.ts               # 菜单工具：从 AppRoute 生成菜单树、过滤、查找
│   └── breadcrumb.ts         # 面包屑工具：从 AppRoute 生成面包屑
└── ...
```

删除的文件/导出：

- `config/routes.ts`（整个文件删除，由 `config/app-routes.ts` 替代）
- `config/menu.ts`（整个文件删除，由 `utils/menu.ts` + `utils/breadcrumb.ts` 替代）
- `types/route.ts` 中的 `ExtendedRouteObject` 和 `ButtonPermission`

---

## 四、重构后的数据流

```
types/route.ts                    ← 纯类型定义
    │
    ▼
config/app-routes.ts              ← 唯一数据源：AppRoute[]（含 meta + 页面导入）
    │
    ├──▶ routes/index.ts          ← 消费 AppRoute[]，生成 RouteObject[]（给 React Router）
    │
    ├──▶ utils/menu.ts            ← 消费 AppRoute[]，生成 MenuItem[]（给 Sider）
    │
    └──▶ utils/breadcrumb.ts      ← 消费 AppRoute[]，生成面包屑（给 Header）
```

单向流动，无循环。

---

## 五、各文件详细设计

### 5.1 `types/route.ts`

```ts
import type { ComponentType } from 'react';

export interface RouteMeta {
    title: string;
    icon?: ComponentType<any>;
    showInMenu?: boolean;
    showInBreadcrumb?: boolean;
    order?: number;
    code?: string;
    permissionType?: 'DIRECTORY' | 'MENU' | 'BUTTON';
}

export interface AppRoute {
    path: string;
    meta?: RouteMeta;
    component?: () => Promise<{ default: ComponentType } | { Component: ComponentType }>;
    children?: AppRoute[];
}

export interface MenuItem {
    key: string;
    label: string;
    icon?: ComponentType<any>;
    children?: MenuItem[];
    order?: number;
}
```

变化要点：

- `RouteMeta.title` 改为必填（有 meta 就一定有标题）。
- 删除 `showInMenu`/`showInBreadcrumb` 从 MenuItem（这是路由层面的概念，生成菜单时过滤即可）。
- `AppRoute` 新增 `component` 字段：页面组件的懒加载函数。
- 删除 `ExtendedRouteObject`、`ButtonPermission`。
- `MenuItem` 搬到这里，不再在 `menu.ts` 里定义（避免循环导入问题）。

### 5.2 `config/app-routes.ts`

```ts
import { DashboardOutlined, BookOutlined, ... } from '@ant-design/icons';
import type { AppRoute } from '@/types/route';

export const appRoutes: AppRoute[] = [
    {
        path: 'dashboard',
        meta: { title: '控制台', icon: DashboardOutlined, showInMenu: true, order: 1, code: 'dashboard', permissionType: 'DIRECTORY' },
        component: () => import('@/pages/Dashboard'),
    },
    {
        path: 'blog',
        meta: { title: '博客管理', icon: BookOutlined, showInMenu: true, order: 2 },
        children: [
            {
                path: 'article',
                meta: { title: '文章管理', icon: FileOutlined, showInMenu: true },
                component: () => import('@/pages/Blog/article'),
            },
            // ...其他 blog 子路由
        ],
    },
    {
        path: 'system',
        meta: { title: '系统管理', icon: SettingOutlined, showInMenu: true, order: 3, code: 'system', permissionType: 'DIRECTORY' },
        children: [
            {
                path: 'user',
                meta: { title: '用户管理', icon: UserOutlined, showInMenu: true, order: 1, code: 'user_management', permissionType: 'MENU' },
                component: () => import('@/pages/System/user'),
            },
            // ...
        ],
    },
    {
        path: 'profile',
        meta: { title: '个人中心', showInMenu: false, showInBreadcrumb: true },
        component: () => import('@/pages/System/user/profile/index'),
    },
];

// 独立路由（不在 Layout 内的页面）
export const standaloneRoutes: AppRoute[] = [
    {
        path: 'blog/article/edit/:id',
        component: () => import('@/pages/Blog/article/editArticle'),
    },
    {
        path: '/editor',
        component: () => import('@/pages/Test/editor'),
    },
    {
        path: '/auth/github/callback',
        component: () => import('@/pages/AuthCallback/githubCallback'),
    },
    {
        path: '/auth/google/callback',
        component: () => import('@/pages/AuthCallback/GoogleCallback'),
    },
];
```

变化要点：

- **一份配置同时包含 meta 和 component**，新增/修改页面只改这一处。
- 不嵌套 `path: '/'` 的外层包装，路由组装逻辑交给 `routes/index.ts`。
- 将「不在 Layout 内」的独立路由（编辑文章、编辑器、OAuth 回调等）单独维护为 `standaloneRoutes`。

### 5.3 `routes/index.ts`

```ts
import type { RouteObject } from 'react-router-dom';
import { redirect } from 'react-router-dom';
import type { AppRoute } from '@/types/route';
import { appRoutes, standaloneRoutes } from '@/config/app-routes';
import { authService } from '@/services/auth';
import { message } from 'antd';
import NotFound from '@/pages/404';

// 将 AppRoute 转换为 React Router 的 RouteObject
const toRouteObject = (route: AppRoute): RouteObject => {
    const result: RouteObject = { path: route.path };

    if (route.component) {
        const loader = route.component;
        result.lazy = async () => {
            const mod = await loader();
            const Component = 'default' in mod ? mod.default : mod.Component;
            return { Component };
        };
    }

    if (route.children?.length) {
        result.children = route.children.map(toRouteObject);
    }

    return result;
};

const routes: RouteObject[] = [
    {
        path: '/',
        Component: null,
        children: [
            // 根路径重定向
            {
                index: true,
                loader: async () => {
                    /* checkLogin → redirect */
                },
            },
            // 登录
            {
                path: 'login',
                lazy: async () => {
                    /* import Login */
                },
            },
            // 鉴权布局（所有后台页面共享一个 Layout）
            {
                path: '/',
                lazy: async () => {
                    /* import Layout */
                },
                children: appRoutes.map(toRouteObject),
            },
            // 独立页面（不包裹 Layout）
            ...standaloneRoutes.map(toRouteObject),
            // 404
            { path: '*', Component: NotFound },
        ],
    },
];

export default routes;
```

变化要点：

- **Layout 只加载一次**，所有后台页面都是它的 children。
- 路由树由 `appRoutes.map(toRouteObject)` 自动生成，不再手写。
- 不再导出 `extendedRoutes`，彻底切断与菜单的直接耦合。

### 5.4 `utils/menu.ts`

```ts
import type { AppRoute, MenuItem } from '@/types/route';
import { appRoutes } from '@/config/app-routes';
import { hasPermission } from '@/hooks/usePermission';

// 从 AppRoute 生成菜单树（含权限过滤 + 排序）
export const buildMenuItems = (routes: AppRoute[], parentPath = ''): MenuItem[] => {
    return routes
        .filter((route) => route.meta?.showInMenu)
        .filter((route) => !route.meta?.code || hasPermission(route.meta.code))
        .map((route) => {
            const fullPath = parentPath ? `${parentPath}/${route.path}` : `/${route.path}`;
            const item: MenuItem = {
                key: fullPath,
                label: route.meta!.title,
                icon: route.meta!.icon,
                order: route.meta!.order,
            };
            if (route.children?.length) {
                const children = buildMenuItems(route.children, fullPath);
                if (children.length > 0) {
                    item.children = children;
                }
            }
            return item;
        })
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
};

// 获取当前用户可见的菜单
export const getMenuItems = (): MenuItem[] => {
    return buildMenuItems(appRoutes);
};

// 根据路径查找菜单项
export const findMenuItemByPath = (path: string, items?: MenuItem[]): MenuItem | null => {
    // ...
};

// 获取某个路径的父级路径
export const getParentPath = (targetPath: string, items?: MenuItem[]): string | null => {
    // ...
};
```

变化要点：

- 直接消费 `AppRoute[]`，不再需要 `ExtendedRouteObject` 中间层。
- 权限过滤和排序在生成时一步到位，不再"先生成后回查排序"。
- `MenuItem` 中直接带 `order`，排序逻辑不需要回查 `extendedRoutes`。

### 5.5 `utils/breadcrumb.ts`

```ts
import type { AppRoute } from '@/types/route';
import { appRoutes } from '@/config/app-routes';

// 构建路径 → 标题的映射表
const buildPathTitleMap = (routes: AppRoute[], parentPath = ''): Record<string, string> => {
    const map: Record<string, string> = {};
    routes.forEach((route) => {
        const fullPath = parentPath ? `${parentPath}/${route.path}` : `/${route.path}`;
        if (route.meta?.title) {
            map[fullPath] = route.meta.title;
        }
        if (route.children?.length) {
            Object.assign(map, buildPathTitleMap(route.children, fullPath));
        }
    });
    return map;
};

const pathTitleMap = buildPathTitleMap(appRoutes);

// 根据当前路径生成面包屑数组
export const generateBreadcrumbItems = (pathname: string) => {
    // ...使用 pathTitleMap
};
```

变化要点：

- 从 `config/menu.ts` 中独立出来，职责单一。
- 直接消费 `AppRoute[]`。

---

## 六、消费方改动清单

| 文件                                              | 当前导入                                                     | 重构后导入                                                          |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `layouts/Sider/index.tsx`                         | `getMenuItems, getMenuConfig, MenuItem` from `@/config/menu` | `getMenuItems` from `@/utils/menu`，`MenuItem` from `@/types/route` |
| `layouts/Header/index.tsx`                        | `generateBreadcrumbItems` from `@/config/menu`               | `generateBreadcrumbItems` from `@/utils/breadcrumb`                 |
| `pages/System/permission/FunctionPermissions.tsx` | `extendedRoutes` from `@/routes`                             | `appRoutes` from `@/config/app-routes`，改为直接消费 `AppRoute[]`   |

---

## 七、迁移步骤

1. **更新 `types/route.ts`**：定义 `AppRoute`、`RouteMeta`、`MenuItem`，删除 `ExtendedRouteObject`、`ButtonPermission`。
2. **新增 `config/app-routes.ts`**：将 `appRoutes` 迁移过来并添加 `component` 字段，新增 `standaloneRoutes`。
3. **新增 `utils/menu.ts`**：将菜单生成/查找/过滤逻辑迁移过来，直接消费 `AppRoute[]`。
4. **新增 `utils/breadcrumb.ts`**：将面包屑逻辑迁移过来。
5. **重写 `routes/index.ts`**：用 `toRouteObject` 自动生成路由树，统一 Layout 为一个节点。
6. **更新消费方**：`Sider`、`Header`、`FunctionPermissions` 的导入路径。
7. **删除旧文件**：`config/routes.ts`、`config/menu.ts`。
8. **验证**：启动项目，确认菜单渲染、路由跳转、面包屑、权限过滤均正常。

---

## 八、风险评估

| 风险点                                                         | 等级 | 应对                                                                                 |
| -------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| Layout 统一为一个节点后，`system/*` 和 `blog/*` 的路径结构变化 | 中   | 子路由 path 保持不变（如 `system/user`），只是父路由从 `path: 'system'` 变为扁平结构 |
| `FunctionPermissions` 直接消费 `extendedRoutes` 的逻辑较复杂   | 中   | 改为消费 `AppRoute[]`，`convertRoutesToMenuData` 函数入参类型对齐即可                |
| 模块级常量 `menuConfig`、`pathNameMap` 被外部引用              | 低   | 检索确认无其他消费方后直接删除                                                       |
