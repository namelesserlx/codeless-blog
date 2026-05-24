import request from '@/utils/request';
import {
    CreatePermissionRequest,
    Permission,
    PermissionBatchOperationRequest,
    PermissionDetailResponse,
    PermissionListRequest,
    PermissionListResponse,
    PermissionOption,
    PermissionStatsResponse,
    PermissionTreeResponse,
    UpdatePermissionRequest,
} from '@blog/shared';

interface PermissionTreeQuery {
    status?: string;
    type?: string;
}

interface PermissionOptionQuery {
    type?: string;
    parentId?: number;
}

/**
 * 权限服务
 */
export class PermissionService {
    /**
     * 获取权限列表
     */
    async getPermissionList(params: PermissionListRequest) {
        return request<PermissionListResponse>({
            url: '/system/permissions/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取权限树
     */
    async getPermissionTree(params: PermissionTreeQuery) {
        return request<PermissionTreeResponse>({
            url: '/system/permissions/tree',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取权限详情
     */
    async getPermissionDetail(id: number) {
        return request<PermissionDetailResponse>({
            url: `/system/permissions/detail/${id}`,
            method: 'GET',
        });
    }

    /**
     * 创建权限
     */
    async createPermission(data: CreatePermissionRequest) {
        return request<Permission>({
            url: '/system/permissions/create',
            method: 'POST',
            data,
        });
    }

    /**
     * 更新权限
     */
    async updatePermission(data: UpdatePermissionRequest) {
        return request<Permission>({
            url: '/system/permissions/update',
            method: 'POST',
            data,
        });
    }

    /**
     * 删除权限
     */
    async deletePermission(id: number) {
        return request<null>({
            url: '/system/permissions/delete',
            method: 'POST',
            data: {
                id,
            },
        });
    }

    /**
     * 批量操作
     */
    async batchOperation(data: PermissionBatchOperationRequest) {
        return request<null>({
            url: '/system/permissions/batch',
            method: 'POST',
            data,
        });
    }

    /**
     * 获取权限选项
     */
    async getPermissionOptions(params: PermissionOptionQuery) {
        return request<PermissionOption[]>({
            url: '/system/permissions/options',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取权限统计信息
     */
    async getPermissionStats() {
        return request<PermissionStatsResponse>({
            url: '/system/permissions/stats',
            method: 'GET',
        });
    }

    /**
     * 检查权限代码是否可用
     */
    async checkCode(code: string, excludeId?: number) {
        return request<{ available: boolean }>({
            url: '/system/permissions/check-code',
            method: 'GET',
            params: {
                code,
                excludeId,
            },
        });
    }
}

export const permissionService = new PermissionService();
