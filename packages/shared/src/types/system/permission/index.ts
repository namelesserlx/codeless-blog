// 权限类型枚举 - 与Prisma schema保持一致
export enum PermissionType {
    DIRECTORY = 'DIRECTORY', // 目录权限
    MENU = 'MENU', // 菜单权限
    BUTTON = 'BUTTON', // 按钮权限
}

// 权限状态枚举 - 与Prisma schema保持一致
export enum PermissionStatus {
    ACTIVE = 'ACTIVE', // 激活
    INACTIVE = 'INACTIVE', // 禁用
}

// 权限类型标签映射
export const PermissionTypeLabels = {
    [PermissionType.DIRECTORY]: '目录权限',
    [PermissionType.MENU]: '菜单权限',
    [PermissionType.BUTTON]: '按钮权限',
} as const;

// 权限状态标签映射
export const PermissionStatusLabels = {
    [PermissionStatus.ACTIVE]: '激活',
    [PermissionStatus.INACTIVE]: '禁用',
} as const;

// 权限类型颜色映射
export const PermissionTypeColors = {
    [PermissionType.MENU]: 'blue',
    [PermissionType.BUTTON]: 'green',
    [PermissionType.DIRECTORY]: 'orange',
} as const;

// 权限状态颜色映射
export const PermissionStatusColors = {
    [PermissionStatus.ACTIVE]: 'success',
    [PermissionStatus.INACTIVE]: 'default',
} as const;

// 权限基础信息
export interface Permission {
    id: number;
    name: string;
    code: string;
    type: PermissionType;
    resource?: string;
    action?: string;
    path?: string;
    component?: string;
    icon?: string;
    sort: number;
    status: PermissionStatus;
    parentId?: number;
    createdAt: string;
    updatedAt: string;
}

// 带有层级关系的权限
export interface PermissionWithHierarchy extends Permission {
    parent?: Permission;
    children?: PermissionWithHierarchy[];
}

// 权限树节点
export interface PermissionTreeNode extends Permission {
    children?: PermissionTreeNode[];
    level?: number;
    disabled?: boolean;
    checked?: boolean;
    indeterminate?: boolean;
}

// 权限列表查询参数
export interface PermissionListRequest {
    page?: number;
    pageSize?: number;
    name?: string;
    code?: string;
    type?: PermissionType;
    status?: PermissionStatus;
    parentId?: number;
    tree?: boolean; // 是否返回树形结构
}

// 权限列表响应
export interface PermissionListResponse {
    list: PermissionWithHierarchy[];
    total: number;
    page?: number;
    pageSize?: number;
}

// 权限树响应
export interface PermissionTreeResponse {
    tree: PermissionTreeNode[];
    total: number;
}

// 创建权限请求
export interface CreatePermissionRequest {
    name: string;
    code: string;
    type: PermissionType;
    resource?: string;
    action?: string;
    path?: string;
    component?: string;
    icon?: string;
    sort?: number;
    status?: PermissionStatus;
    parentId?: number;
}

// 更新权限请求
export interface UpdatePermissionRequest {
    id: number;
    name?: string;
    code?: string;
    type?: PermissionType;
    resource?: string;
    action?: string;
    path?: string;
    component?: string;
    icon?: string;
    sort?: number;
    status?: PermissionStatus;
    parentId?: number;
}

// 权限详情响应
export interface PermissionDetailResponse extends Permission {
    parent?: Permission;
    children?: Permission[];
}

// 批量操作请求
export interface PermissionBatchOperationRequest {
    ids: number[];
    action: 'delete' | 'activate' | 'deactivate';
}

// 权限选项
export interface PermissionOption {
    id: number;
    name: string;
    code: string;
    type: PermissionType;
    parentId?: number;
}

// 角色权限查询响应
export interface RolePermissionsResponse {
    roleId: number;
    permissionIds: number[];
    permissions: PermissionTreeNode[];
}

// 权限统计信息
export interface PermissionStatsResponse {
    total: number;
    menu: number;
    button: number;
    directory: number;
    active: number;
    inactive: number;
}
