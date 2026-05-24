import { useMemo } from 'react';
import useUserStore from '@/stores/user';

/**
 * 不依赖 React 的权限检查函数，可在任何地方使用（拦截器、工具函数等）。
 * 直接从 Store 读取快照，保证与 UI 状态一致。
 */
export const hasPermission = (permissionCode: string): boolean => {
    return useUserStore.getState().hasPermission(permissionCode);
};

/**
 * 权限判断 hook（响应式），组件中使用。
 * 只订阅 permissions 数组，userInfo 变化不会触发重渲染。
 */
export const usePermission = () => {
    const permissions = useUserStore((s) => s.permissions);

    const permissionSet = useMemo(() => new Set(permissions), [permissions]);

    const checkPermission = (code: string): boolean => {
        return permissionSet.has(code);
    };

    const hasAnyPermission = (codes: string[]): boolean => {
        return codes.some((c) => permissionSet.has(c));
    };

    const hasAllPermissions = (codes: string[]): boolean => {
        return codes.every((c) => permissionSet.has(c));
    };

    return {
        hasPermission: checkPermission,
        hasAnyPermission,
        hasAllPermissions,
        permissions,
    };
};
