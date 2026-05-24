import request from '@/utils/request';
import {
    CreateRoleRequest,
    Role,
    RoleBatchOperationRequest,
    RoleDetailResponse,
    RoleListRequest,
    RoleListResponse,
    RoleOption,
    RolePermissionAssignRequest,
    RolePermissionsResponse,
    RoleStatsResponse,
    RoleUsersResponse,
    UpdateRoleRequest,
} from '@blog/shared';

/**
 * 角色服务
 */
export class RoleService {
    /**
     * 获取角色列表
     */
    async getRoleList(params: RoleListRequest) {
        return request<RoleListResponse>({
            url: '/system/roles/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取角色详情
     */
    async getRoleDetail(id: number) {
        return request<RoleDetailResponse>({
            url: `/system/roles/detail/${id}`,
            method: 'GET',
        });
    }

    /**
     * 创建角色
     */
    async createRole(data: CreateRoleRequest) {
        return request<Role>({
            url: '/system/roles/create',
            method: 'POST',
            data,
        });
    }

    /**
     * 更新角色
     */
    async updateRole(data: UpdateRoleRequest) {
        return request<Role>({
            url: '/system/roles/update',
            method: 'POST',
            data,
        });
    }

    /**
     * 删除角色
     */
    async deleteRole(id: number) {
        return request<null>({
            url: '/system/roles/delete',
            method: 'POST',
            data: {
                id,
            },
        });
    }

    /**
     * 批量操作
     */
    async batchOperation(data: RoleBatchOperationRequest) {
        return request<null>({
            url: '/system/roles/batch',
            method: 'POST',
            data,
        });
    }

    /**
     * 获取角色选项
     */
    async getRoleOptions() {
        return request<RoleOption[]>({
            url: '/system/roles/options',
            method: 'GET',
        });
    }

    /**
     * 获取角色统计信息
     */
    async getRoleStats() {
        return request<RoleStatsResponse>({
            url: '/system/roles/stats',
            method: 'GET',
        });
    }

    /**
     * 获取角色权限
     */
    async getRolePermissions(roleId: number) {
        return request<RolePermissionsResponse>({
            url: `/system/roles/${roleId}/permissions`,
            method: 'GET',
        });
    }

    /**
     * 获取角色用户
     */
    async getRoleUsers(roleId: number) {
        return request<RoleUsersResponse>({
            url: `/system/roles/${roleId}/users`,
            method: 'GET',
        });
    }

    /**
     * 分配角色权限
     */
    async assignPermissions(data: RolePermissionAssignRequest) {
        return request<null>({
            url: '/system/roles/assign-permissions',
            method: 'POST',
            data,
        });
    }

    /**
     * 从角色移除用户
     */
    async removeUserFromRole(roleId: number, userId: number) {
        return request<null>({
            url: '/system/roles/remove-user',
            method: 'POST',
            data: {
                roleId,
                userId,
            },
        });
    }

    /**
     * 检查角色代码是否可用
     */
    async checkCode(code: string, excludeId?: number) {
        return request<{ available: boolean }>({
            url: '/system/roles/check-code',
            method: 'GET',
            params: {
                code,
                excludeId,
            },
        });
    }
}

export const roleService = new RoleService();
