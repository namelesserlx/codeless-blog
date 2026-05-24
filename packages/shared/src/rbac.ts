import { PermissionStatus, PermissionType } from './types/system/permission';
import { RoleStatus } from './types/system/role';

export const SUPER_ADMIN_ROLE_CODE = 'super_admin';
export const ADMIN_ROLE_CODE = 'admin';
export const USER_ROLE_CODE = 'user';
export const CORE_ROLE_CODES = [SUPER_ADMIN_ROLE_CODE, ADMIN_ROLE_CODE, USER_ROLE_CODE] as const;
export const REMOVED_BUILTIN_ROLE_CODES = ['editor'] as const;

export interface BuiltinPermissionDefinition {
    name: string;
    code: string;
    type: PermissionType;
    resource?: string | null;
    action?: string | null;
    sort: number;
    status?: PermissionStatus;
    parentCode?: string | null;
}

export interface BuiltinRoleDefinition {
    name: string;
    code: string;
    description: string;
    level: number;
    status?: RoleStatus;
    parentCode?: string | null;
}

export const BUILTIN_PERMISSION_DEFINITIONS: readonly BuiltinPermissionDefinition[] = [
    {
        name: '控制台',
        code: 'dashboard',
        type: PermissionType.MENU,
        sort: 1,
    },
    {
        name: '文章管理',
        code: 'article',
        type: PermissionType.MENU,
        sort: 2,
    },
    {
        name: '撰写文章',
        code: 'article:write',
        type: PermissionType.BUTTON,
        action: 'write',
        sort: 1,
        parentCode: 'article',
    },
    {
        name: '管理文章',
        code: 'article:manage',
        type: PermissionType.BUTTON,
        action: 'manage',
        sort: 2,
        parentCode: 'article',
    },
    {
        name: '文章报表',
        code: 'article_report',
        type: PermissionType.MENU,
        sort: 3,
    },
    {
        name: '片段管理',
        code: 'snippet',
        type: PermissionType.MENU,
        sort: 4,
    },
    {
        name: '编辑片段',
        code: 'snippet:edit',
        type: PermissionType.BUTTON,
        action: 'edit',
        sort: 1,
        parentCode: 'snippet',
    },
    {
        name: '评论管理',
        code: 'comment',
        type: PermissionType.MENU,
        sort: 5,
    },
    {
        name: '编辑评论',
        code: 'comment:edit',
        type: PermissionType.BUTTON,
        action: 'edit',
        sort: 1,
        parentCode: 'comment',
    },
    {
        name: '标签管理',
        code: 'tag',
        type: PermissionType.MENU,
        sort: 6,
    },
    {
        name: '编辑标签',
        code: 'tag:edit',
        type: PermissionType.BUTTON,
        action: 'edit',
        sort: 1,
        parentCode: 'tag',
    },
    {
        name: '相册管理',
        code: 'photo',
        type: PermissionType.MENU,
        sort: 7,
    },
    {
        name: '编辑相册',
        code: 'photo:edit',
        type: PermissionType.BUTTON,
        action: 'edit',
        sort: 1,
        parentCode: 'photo',
    },
    {
        name: '系统管理',
        code: 'system',
        type: PermissionType.DIRECTORY,
        sort: 4,
    },
    {
        name: '用户管理',
        code: 'user_management',
        type: PermissionType.MENU,
        sort: 3,
    },
    {
        name: '角色管理',
        code: 'role',
        type: PermissionType.MENU,
        sort: 1,
        parentCode: 'system',
    },
    {
        name: '权限管理',
        code: 'permission',
        type: PermissionType.MENU,
        sort: 2,
        parentCode: 'system',
    },
    {
        name: '新增用户',
        code: 'user:create',
        type: PermissionType.BUTTON,
        action: 'create',
        sort: 1,
        parentCode: 'user_management',
    },
    {
        name: '编辑用户',
        code: 'user:update',
        type: PermissionType.BUTTON,
        action: 'update',
        sort: 2,
        parentCode: 'user_management',
    },
    {
        name: '删除用户',
        code: 'user:delete',
        type: PermissionType.BUTTON,
        action: 'delete',
        sort: 3,
        parentCode: 'user_management',
    },
    {
        name: '导出用户',
        code: 'user:export',
        type: PermissionType.BUTTON,
        action: 'export',
        sort: 4,
        parentCode: 'user_management',
    },
    {
        name: '新增角色',
        code: 'role:create',
        type: PermissionType.BUTTON,
        action: 'create',
        sort: 1,
        parentCode: 'role',
    },
    {
        name: '编辑角色',
        code: 'role:update',
        type: PermissionType.BUTTON,
        action: 'update',
        sort: 2,
        parentCode: 'role',
    },
    {
        name: '删除角色',
        code: 'role:delete',
        type: PermissionType.BUTTON,
        action: 'delete',
        sort: 3,
        parentCode: 'role',
    },
    {
        name: '分配权限',
        code: 'role:assign',
        type: PermissionType.BUTTON,
        action: 'assign',
        sort: 4,
        parentCode: 'role',
    },
] as const;

export const BUILTIN_ROLE_DEFINITIONS: readonly BuiltinRoleDefinition[] = [
    {
        name: '超级管理员',
        code: SUPER_ADMIN_ROLE_CODE,
        description: '系统超级管理员，拥有所有权限',
        level: 0,
    },
    {
        name: '管理员',
        code: ADMIN_ROLE_CODE,
        description: '内容管理员，可查看内容数据并撰写文章',
        level: 1,
        parentCode: SUPER_ADMIN_ROLE_CODE,
    },
    {
        name: '普通用户',
        code: USER_ROLE_CODE,
        description: '普通用户，基础权限',
        level: 2,
        parentCode: ADMIN_ROLE_CODE,
    },
] as const;

export const BUILTIN_PERMISSION_CODES = BUILTIN_PERMISSION_DEFINITIONS.map(
    (permission) => permission.code,
);

export function resolveBuiltinRolePermissionCodes(
    roleCode: string,
    availablePermissionCodes: readonly string[] = BUILTIN_PERMISSION_CODES,
): string[] {
    const availablePermissionCodeSet = new Set(availablePermissionCodes);
    const resolveExistingCodes = (codes: readonly string[]) =>
        codes.filter((code) => availablePermissionCodeSet.has(code));

    switch (roleCode) {
        case SUPER_ADMIN_ROLE_CODE:
            return [...availablePermissionCodes];
        case ADMIN_ROLE_CODE:
            return resolveExistingCodes([
                'dashboard',
                'article',
                'article:write',
                'article_report',
                'snippet',
                'comment',
                'tag',
                'photo',
            ]);
        case USER_ROLE_CODE:
            return [];
        default:
            return [];
    }
}
