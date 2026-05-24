import type { AppRoute } from '@/types/route';
import { layoutRoutes } from '@/config/admin-routes';

export interface BreadcrumbItem {
    title: string;
    href?: string;
}

/**
 * 递归遍历 layoutRoutes，构建「完整路径 → 中文标题」的映射表。
 * 只收录 `showInBreadcrumb !== false` 且存在 title 的节点。
 */
const buildPathTitleMap = (routes: AppRoute[], parentPath = ''): Record<string, string> => {
    const map: Record<string, string> = {};

    routes.forEach((route) => {
        const fullPath = parentPath ? `${parentPath}/${route.path}` : `/${route.path}`;

        if (route.meta?.title && route.meta.showInBreadcrumb !== false) {
            map[fullPath] = route.meta.title;
        }

        if (route.children?.length) {
            Object.assign(map, buildPathTitleMap(route.children, fullPath));
        }
    });

    return map;
};

// 模块加载时生成一次，配置不变则无需重复计算
const pathTitleMap: Record<string, string> = buildPathTitleMap(layoutRoutes);

/**
 * 根据当前 pathname 生成面包屑数组。
 * 首项固定为「首页 → /dashboard」，后续按路径段逐级追加。
 */
export const generateBreadcrumbItems = (pathname: string): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ title: '首页', href: '/dashboard' }];

    let url = '';
    segments.forEach((seg, index) => {
        url += `/${seg}`;
        const title = pathTitleMap[url] ?? seg;

        if (index === segments.length - 1) {
            items.push({ title });
        } else {
            items.push({ title, href: url });
        }
    });

    return items;
};
