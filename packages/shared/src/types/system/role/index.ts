import type { User } from '../user';

// 角色状态枚举 - 与Prisma schema保持一致
export enum RoleStatus {
    ACTIVE = 'ACTIVE', // 激活
    INACTIVE = 'INACTIVE', // 禁用
}

// 角色状态标签映射
export const RoleStatusLabels = {
    [RoleStatus.ACTIVE]: '激活',
    [RoleStatus.INACTIVE]: '禁用',
} as const;

// 角色状态颜色映射
export const RoleStatusColors = {
    [RoleStatus.ACTIVE]: 'success',
    [RoleStatus.INACTIVE]: 'default',
} as const;

// 角色基础信息
export interface Role {
    id: number;
    name: string;
    code: string;
    description?: string;
    level: number;
    status: RoleStatus;
    parentId?: number;
    createdAt: string;
    updatedAt: string;
}

// 带有层级关系的角色
export interface RoleWithHierarchy extends Role {
    parent?: Role;
    children?: RoleWithHierarchy[];
    userCount?: number; // 用户数量统计
    permissionCount?: number; // 权限数量统计
}

// 带有权限的角色
export interface RoleWithPermissions extends Role {
    rolePermissions: {
        permission: {
            id: number;
            name: string;
            code: string;
            type: string;
        };
    }[];
}

// 角色列表查询参数
export interface RoleListRequest {
    page: number;
    pageSize: number;
    keyword?: string;
    name?: string;
    code?: string;
    status?: RoleStatus;
    level?: number;
    parentId?: number;
}

// 角色列表响应
export interface RoleListResponse {
    list: RoleWithHierarchy[];
    total: number;
    page: number;
    pageSize: number;
}

// 创建角色请求
export interface CreateRoleRequest {
    name: string;
    code: string;
    description?: string;
    level?: number;
    status?: RoleStatus;
    parentId?: number;
    permissionIds?: number[];
}

// 更新角色请求
export interface UpdateRoleRequest {
    id: number;
    name?: string;
    code?: string;
    description?: string;
    level?: number;
    status?: RoleStatus;
    parentId?: number;
    permissionIds?: number[];
}

// 角色详情响应
export interface RoleDetailResponse extends RoleWithPermissions {
    parent?: Role;
    children?: Role[];
}

// 批量操作请求
export interface RoleBatchOperationRequest {
    ids: number[];
    action: 'delete' | 'activate' | 'deactivate';
}

// 角色权限分配请求
export interface RolePermissionAssignRequest {
    roleId: number;
    permissionIds: number[];
}

// 角色用户查询响应
export interface RoleUsersResponse {
    list: User[];
    total: number;
}

// 从角色移除用户请求
export interface RemoveRoleUserRequest {
    roleId: number;
    userId: number;
}

// 角色选项
export interface RoleOption {
    id: number;
    name: string;
    code: string;
    description?: string;
    level: number;
}

// 角色统计信息
export interface RoleStatsResponse {
    total: number;
    active: number;
    inactive: number;
}
