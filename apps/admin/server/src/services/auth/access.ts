import type { LoginResponse } from '../../types/auth';
import { PermissionError } from '../../types/errors';

export const ADMIN_ACCESS_PERMISSION_CODE = 'dashboard';

type Permission = LoginResponse['user']['permissions'][number];

export function hasAdminAccess(permissions: readonly Permission[] | undefined): boolean {
    return (
        permissions?.some((permission) => permission.code === ADMIN_ACCESS_PERMISSION_CODE) === true
    );
}

export function ensureAdminAccess(permissions: readonly Permission[] | undefined): void {
    if (!hasAdminAccess(permissions)) {
        throw new PermissionError('当前账号没有管理后台权限');
    }
}
