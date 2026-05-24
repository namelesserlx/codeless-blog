import type { AppRoute, MenuItem } from '@/types/route';
import { layoutRoutes } from '@/config/admin-routes';
import { hasPermission } from '@/hooks/usePermission';

/**
 * 递归将 layoutRoutes 节点转换为侧边菜单项。
 * - 只保留 `showInMenu: true` 的节点
 * - 有 `code` 的节点额外做权限校验
 * - 按 `order` 升序排列
 */
const buildMenuTree = (routes: AppRoute[], parentPath = ''): MenuItem[] => {
    return routes
        .filter((route) => route.meta?.showInMenu === true)
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
                const children = buildMenuTree(route.children, fullPath);
                if (children.length > 0) item.children = children;
            }

            return item;
        })
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
};

/** 返回当前用户权限下的侧边菜单树 */
export const getMenuItems = (): MenuItem[] => buildMenuTree(layoutRoutes);

/** 在菜单树中按完整路径查找某个节点 */
export const findMenuItemByPath = (
    targetPath: string,
    items: MenuItem[] = getMenuItems(),
): MenuItem | null => {
    for (const item of items) {
        if (item.key === targetPath) return item;
        if (item.children) {
            const found = findMenuItemByPath(targetPath, item.children);
            if (found) return found;
        }
    }
    return null;
};

/** 返回某路径的直接父级菜单项的 key；找不到则返回 null */
export const getParentMenuKey = (
    targetPath: string,
    items: MenuItem[] = getMenuItems(),
): string | null => {
    for (const item of items) {
        if (item.children?.some((c) => c.key === targetPath)) return item.key;
        if (item.children) {
            const found = getParentMenuKey(targetPath, item.children);
            if (found) return found;
        }
    }
    return null;
};
