import { type ReactNode } from 'react';
import useUserStore from '@/stores/user';

type PermissionType = string | string[] | ((permissions: string[]) => boolean);

interface AuthButtonProps {
    permission?: PermissionType;
    children: ReactNode;
}

/**
 * 按钮权限控制组件
 * @param permission 权限标识，可以是字符串、字符串数组或自定义判断函数
 * @param children 子元素
 */
const AuthButton = ({ permission, children }: AuthButtonProps) => {
    const permissions = useUserStore((s) => s.permissions);
    // 检查是否有权限
    const hasPermission = (code?: PermissionType) => {
        // 如果没有权限要求，则允许访问
        if (!code) return true;

        // 如果是函数，使用函数进行判断
        if (typeof code === 'function') {
            return code(permissions);
        }

        // 如果是数组，需要满足所有权限
        if (Array.isArray(code)) {
            return code.every((item) => permissions.includes(item));
        }

        // 如果是字符串，判断是否包含该权限
        return permissions.includes(code);
    };

    // 如果没有权限，则不渲染任何内容
    if (!hasPermission(permission)) {
        return null;
    }

    return <>{children}</>;
};

export default AuthButton;
