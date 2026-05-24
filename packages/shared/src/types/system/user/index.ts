// 用户状态枚举 - 与Prisma schema保持一致
export enum UserStatus {
    ACTIVE = 'ACTIVE', // 激活
    INACTIVE = 'INACTIVE', // 未激活
    BANNED = 'BANNED', // 禁用
    DELETED = 'DELETED', // 已删除
}

// 用户状态标签映射
export const UserStatusLabels = {
    [UserStatus.ACTIVE]: '正常',
    [UserStatus.INACTIVE]: '未激活',
    [UserStatus.BANNED]: '已禁用',
    [UserStatus.DELETED]: '已删除',
} as const;

// 用户状态颜色映射
export const UserStatusColors = {
    [UserStatus.ACTIVE]: 'success',
    [UserStatus.INACTIVE]: 'warning',
    [UserStatus.BANNED]: 'error',
    [UserStatus.DELETED]: 'default',
} as const;

// 用户基础信息
export interface User {
    id: number;
    username: string;
    email: string;
    nickname?: string;
    avatar?: string;
    bio?: string;
    address?: string;
    status: UserStatus;
    createdAt: string;
    updatedAt: string;
    phone?: string;
    githubId?: string;
    googleId?: string;
}

// 用户与角色信息
export interface UserWithRoles extends User {
    userRoles: {
        role: {
            id: number;
            name: string;
            code: string;
        };
    }[];
}

// 用户列表查询参数
export interface UserListRequest {
    page: number;
    pageSize: number;
    username?: string;
    email?: string;
    nickname?: string;
    status?: UserStatus;
    startTime?: string;
    endTime?: string;
}

// 用户列表响应
export interface UserListResponse {
    list: UserWithRoles[];
    total: number;
    page: number;
    pageSize: number;
}

// 创建用户请求
export interface CreateUserRequest {
    username: string;
    email: string;
    nickname?: string;
    password: string;
    confirmPassword?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    address?: string;
    status?: UserStatus;
    roleIds?: number[];
}

// 更新用户请求
export interface UpdateUserRequest {
    id: number;
    username?: string;
    email?: string;
    nickname?: string;
    avatar?: string;
    bio?: string;
    address?: string;
    phone?: string;
    status?: UserStatus;
    roleIds?: number[];
}

// 更新用户头像请求
export interface UpdateAvatarRequest {
    id: number;
    file: File;
}

// 批量操作请求
export interface BatchOperationRequest {
    ids: number[];
    action: 'delete' | 'activate' | 'deactivate' | 'ban';
}

// 用户详情响应
export type UserDetailResponse = UserWithRoles;

// 用户信息（用于本地存储）
export interface UserInfo {
    id: number;
    username: string;
    email: string;
    nickname?: string;
    avatar?: string;
    role?: string;
    roles?: string[];
}
