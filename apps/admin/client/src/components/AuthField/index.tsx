import { type ReactNode } from 'react';
import useUserStore from '@/stores/user';

type PermissionPredicate<T> = (value: T, permissions: string[]) => boolean;
type PermissionType<T> = string | string[] | PermissionPredicate<T>;

interface AuthFieldProps<T = unknown> {
    permission?: PermissionType<T>;
    value: T;
    placeholder?: ReactNode;
    render?: (value: T) => ReactNode;
}

/**
 * 字段权限控制组件
 * @param permission 权限标识，可以是字符串、字符串数组或自定义判断函数
 * @param value 字段值
 * @param placeholder 无权限时显示的占位内容
 * @param render 自定义渲染函数
 */
const AuthField = <T,>({ permission, value, placeholder = '***', render }: AuthFieldProps<T>) => {
    const permissions = useUserStore((s) => s.permissions);

    // 检查是否有权限
    const hasPermission = (code?: PermissionType<T>) => {
        // 如果没有权限要求，则允许访问
        if (!code) return true;

        // 如果是函数，使用函数进行判断
        if (typeof code === 'function') {
            return code(value, permissions);
        }

        // 如果是数组，需要满足所有权限
        if (Array.isArray(code)) {
            return code.every((item) => permissions.includes(item));
        }

        // 如果是字符串，判断是否包含该权限
        return permissions.includes(code);
    };

    // 如果没有权限，显示占位内容
    if (!hasPermission(permission)) {
        return <span>{placeholder}</span>;
    }

    // 如果有自定义渲染函数，使用自定义渲染
    if (render) {
        return <span>{render(value)}</span>;
    }

    // 默认渲染
    return <span>{String(value)}</span>;
};

export default AuthField;
