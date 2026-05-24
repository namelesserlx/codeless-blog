import request from '@/utils/request';
import {
    BatchOperationRequest,
    CreateUserRequest,
    RoleOption,
    UpdateUserRequest,
    User,
    UserDetailResponse,
    UserListRequest,
    UserListResponse,
} from '@blog/shared';

interface UserStatsResponse {
    total: number;
    active: number;
    inactive: number;
    banned: number;
}

/**
 * 用户服务
 */
export class UserService {
    /**
     * 获取用户列表
     */
    async getUserList(params: UserListRequest) {
        return request<UserListResponse>({
            url: '/system/users/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取用户详情
     */
    async getUserDetail(id: number) {
        return request<UserDetailResponse>({
            url: `/system/users/detail/${id}`,
            method: 'GET',
        });
    }

    /**
     * 创建用户
     */
    async createUser(data: CreateUserRequest) {
        return request<User>({
            url: '/system/users/create',
            method: 'POST',
            data,
        });
    }

    /**
     * 更新用户
     */
    async updateUser(data: UpdateUserRequest) {
        return request<User>({
            url: '/system/users/update',
            method: 'POST',
            data,
        });
    }

    /**
     * 删除用户
     */
    async deleteUser(id: number) {
        return request<null>({
            url: '/system/users/delete',
            method: 'POST',
            data: {
                id,
            },
        });
    }

    /**
     * 上传头像
     */
    async uploadAvatar(file: File) {
        const formData = new FormData();
        formData.append('avatar', file);

        return request<User>({
            url: '/system/users/avatar',
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * 批量操作
     */
    async batchOperation(data: BatchOperationRequest) {
        return request<null>({
            url: '/system/users/batch',
            method: 'POST',
            data,
        });
    }

    /**
     * 获取角色选项
     */
    async getRoleOptions() {
        return request<RoleOption[]>({
            url: '/system/users/role-options',
            method: 'GET',
        });
    }

    /**
     * 获取用户统计信息
     */
    async getUserStats() {
        return request<UserStatsResponse>({
            url: '/system/users/stats',
            method: 'GET',
        });
    }

    /**
     * 检查用户名是否可用
     */
    async checkUsername(username: string, excludeId?: number) {
        return request<{ available: boolean }>({
            url: '/system/users/check-username',
            method: 'GET',
            params: {
                username,
                excludeId,
            },
        });
    }

    /**
     * 检查邮箱是否可用
     */
    async checkEmail(email: string, excludeId?: number) {
        return request<{ available: boolean }>({
            url: '/system/users/check-email',
            method: 'GET',
            params: {
                email,
                excludeId,
            },
        });
    }
}

export const userService = new UserService();
