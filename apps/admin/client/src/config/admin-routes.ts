import type { AppRoute } from '@/types/route';
import {
    DashboardOutlined,
    UserOutlined,
    SettingOutlined,
    UsergroupAddOutlined,
    BookOutlined,
    FileOutlined,
    TagOutlined,
    CommentOutlined,
    FileImageOutlined,
    FileTextOutlined,
    BarChartOutlined,
} from '@ant-design/icons';

/**
 * 后台管理布局内的路由树
 *
 * 这是路由与菜单的**唯一配置来源**：
 * - `routes/index.ts`   消费它，自动生成 React Router `RouteObject[]`
 * - `utils/menu.ts`     消费它，自动生成侧边栏菜单树
 * - `utils/breadcrumb.ts` 消费它，自动生成面包屑路径映射
 *
 * 所有需要在后台 Layout（侧边栏 + 头部 + 内容区）中渲染的页面都在这里注册。
 */
export const layoutRoutes: AppRoute[] = [
    {
        path: 'dashboard',
        meta: {
            title: '控制台',
            icon: DashboardOutlined,
            showInMenu: true,
            showInBreadcrumb: true,
            order: 1,
            code: 'dashboard',
            permissionType: 'MENU',
        },
        component: () => import('@/pages/Dashboard'),
    },
    {
        path: 'blog',
        meta: {
            title: '博客管理',
            icon: BookOutlined,
            showInMenu: true,
            showInBreadcrumb: true,
            order: 2,
        },
        children: [
            {
                path: 'article',
                meta: {
                    title: '文章管理',
                    icon: FileOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 1,
                    code: 'article',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/Blog/article'),
            },
            {
                path: 'article-report',
                meta: {
                    title: '文章报表',
                    icon: BarChartOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 2,
                    code: 'article_report',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/Blog/articleReport'),
            },
            {
                path: 'snippet',
                meta: {
                    title: '片段管理',
                    icon: FileTextOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 3,
                    code: 'snippet',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/Blog/snippet'),
            },
            {
                path: 'comment',
                meta: {
                    title: '评论管理',
                    icon: CommentOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 4,
                    code: 'comment',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/Blog/comment'),
            },
            {
                path: 'tag',
                meta: {
                    title: '标签管理',
                    icon: TagOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 5,
                    code: 'tag',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/Blog/tag'),
            },
            {
                path: 'photo',
                meta: {
                    title: '相册管理',
                    icon: FileImageOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 6,
                    code: 'photo',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/Blog/photo'),
            },
        ],
    },
    {
        path: 'system',
        meta: {
            title: '系统管理',
            icon: SettingOutlined,
            showInMenu: true,
            showInBreadcrumb: true,
            order: 3,
            code: 'system',
            permissionType: 'DIRECTORY',
        },
        children: [
            {
                path: 'user',
                meta: {
                    title: '用户管理',
                    icon: UserOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 1,
                    code: 'user_management',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/System/user'),
            },
            {
                path: 'role',
                meta: {
                    title: '角色&权限管理',
                    icon: UsergroupAddOutlined,
                    showInMenu: true,
                    showInBreadcrumb: true,
                    order: 2,
                    code: 'role',
                    permissionType: 'MENU',
                },
                component: () => import('@/pages/System/role'),
            },
        ],
    },
    {
        path: 'profile',
        meta: {
            title: '个人中心',
            icon: UserOutlined,
            showInMenu: false,
            showInBreadcrumb: true,
        },
        component: () => import('@/pages/System/user/profile/index'),
    },
];

/**
 * 独立路由——不使用后台 Layout（无侧边栏 + 头部）
 *
 * 适用于：OAuth 回调、全屏编辑器等独立场景。
 * 路径均为相对于根 `/` 的相对路径。
 */
export const standaloneRoutes: AppRoute[] = [
    {
        path: 'blog/article/edit/:id/fullscreen',
        component: () => import('@/pages/Blog/article/editArticle/fullscreen'),
    },
    {
        path: 'blog/article/edit/:id',
        component: () => import('@/pages/Blog/article/editArticle'),
    },
    {
        path: 'auth/github/callback',
        component: () => import('@/pages/AuthCallback/githubCallback'),
    },
    {
        path: 'auth/google/callback',
        component: () => import('@/pages/AuthCallback/GoogleCallback'),
    },
];
