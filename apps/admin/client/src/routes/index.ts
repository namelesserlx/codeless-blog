import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { redirect } from 'react-router';
import NotFound from '@/pages/404';
import type { AppRoute } from '@/types/route';
import { layoutRoutes, standaloneRoutes } from '@/config/admin-routes';
import { authStorage } from '@/utils/authStorage';

type LazyModule = { default?: ComponentType; Component?: ComponentType };

/**
 * 将 default 导出转为 React Router lazy 所需的 { Component } 格式。
 * 路由模块只需 `export default Component`，无需再写 `export { Component }`。
 *
 * @example
 * lazy: lazyRoute(() => import('@/pages/Login'))
 */
export const lazyRoute = (
    loader: () => Promise<LazyModule>,
): (() => Promise<{ Component: ComponentType }>) => {
    return async () => {
        const mod = await loader();
        const Component = mod.default ?? mod.Component;
        if (!Component) throw new Error('Lazy module must export default or Component');
        return { Component };
    };
};

/**
 * 将 AppRoute 节点转换为 React Router RouteObject。
 */
const toRouteObject = (route: AppRoute): RouteObject => {
    const result: RouteObject = { path: route.path };

    if (route.component) {
        result.lazy = lazyRoute(route.component);
    }

    if (route.children?.length) {
        result.children = route.children.map(toRouteObject);
    }

    return result;
};

const hasBootstrappedAuth = () => {
    const userInfo = authStorage.getUserInfo();
    return Boolean(
        authStorage.getToken() &&
        userInfo?.permissions?.some((permission) => permission.code === 'dashboard'),
    );
};

const routes: RouteObject[] = [
    {
        path: '/',
        children: [
            // 根路径：校验登录态后重定向
            {
                index: true,
                loader: () => {
                    return redirect(hasBootstrappedAuth() ? '/dashboard' : '/login');
                },
            },
            // 登录页（独立于 Layout）
            {
                path: 'login',
                loader: () => {
                    return hasBootstrappedAuth() ? redirect('/dashboard') : null;
                },
                lazy: lazyRoute(() => import('@/pages/Login')),
            },
            // 后台管理页——所有页面共享同一个 Layout 实例（侧边栏 + 头部）
            {
                path: '/',
                loader: () => {
                    return hasBootstrappedAuth() ? null : redirect('/login');
                },
                lazy: lazyRoute(() => import('@/layouts')),
                children: layoutRoutes.map(toRouteObject),
            },
            // 独立页面——不使用 Layout
            ...standaloneRoutes.map(toRouteObject),
            // 兜底 404
            { path: '*', Component: NotFound },
        ],
    },
];

export default routes;
