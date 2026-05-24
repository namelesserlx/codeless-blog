import request from '@/utils/request';
import { LoginRequest, LoginResponse, ResponseData, RolePermission } from '@blog/shared';

const GOOGLE_OAUTH_TIMEOUT_MS = 30000;

/**
 * 认证服务
 */
export class AuthService {
    /**
     * 获取验证码
     */
    async getCaptcha(): Promise<ResponseData<string>> {
        return request<string>({
            url: '/auth/captcha',
            method: 'GET',
        });
    }

    /**
     * 登录
     */
    async login(data: LoginRequest): Promise<ResponseData<LoginResponse>> {
        return request<LoginResponse>({
            url: '/auth/admin-login',
            method: 'POST',
            data,
        });
    }

    /**
     * 退出登录
     */
    async logout(): Promise<ResponseData<unknown>> {
        return request<unknown>({
            url: '/auth/logout',
            method: 'POST',
        });
    }

    /**
     * 发送修改密码邮箱验证码
     */
    async sendPasswordChangeCode(): Promise<ResponseData<{ email: string; expiresIn: number }>> {
        return request<{ email: string; expiresIn: number }>({
            url: '/auth/send-password-change-code',
            method: 'POST',
        });
    }

    /**
     * 校验修改密码邮箱验证码
     */
    async verifyPasswordChangeCode(data: {
        code: string;
    }): Promise<ResponseData<{ token: string; expiresIn: number }>> {
        return request<{ token: string; expiresIn: number }>({
            url: '/auth/verify-password-change-code',
            method: 'POST',
            data,
        });
    }

    /**
     * 修改当前登录用户密码
     */
    async changePassword(data: {
        token: string;
        newPassword: string;
    }): Promise<ResponseData<null>> {
        return request<null>({
            url: '/auth/change-password',
            method: 'POST',
            data,
        });
    }

    /**
     * 获取用户权限列表
     */
    async getUserPermissions(): Promise<ResponseData<RolePermission[]>> {
        return request<RolePermission[]>({
            url: '/auth/permissions',
            method: 'GET',
        });
    }

    /**
     * 检测是否登录
     */
    async checkLogin(): Promise<ResponseData<LoginResponse>> {
        return request<LoginResponse>({
            url: '/auth/admin-checkLogin',
            method: 'GET',
        });
    }

    /**
     * 刷新登录态
     */
    async refresh(): Promise<ResponseData<LoginResponse>> {
        return request<LoginResponse>({
            url: '/auth/admin-refresh',
            method: 'POST',
        });
    }

    /**
     * GitHub 登录
     */
    async githubLogin(code: string): Promise<ResponseData<LoginResponse>> {
        return request<LoginResponse>({
            url: '/oauth/github/login',
            method: 'POST',
            data: {
                code,
            },
        });
    }

    /**
     * 绑定 GitHub 账号
     */
    async bindGithub(code: string): Promise<ResponseData<unknown>> {
        return request<unknown>({
            url: '/oauth/github/bind',
            method: 'POST',
            data: {
                code,
            },
        });
    }

    /**
     * 解绑 GitHub 账号
     */
    async unbindGithub(): Promise<ResponseData<unknown>> {
        return request<unknown>({
            url: '/oauth/github/unbind',
            method: 'POST',
        });
    }

    /**
     * Google 登录
     */
    async googleLogin(code: string): Promise<ResponseData<LoginResponse>> {
        return request<LoginResponse>({
            url: '/oauth/google/login',
            method: 'POST',
            timeout: GOOGLE_OAUTH_TIMEOUT_MS,
            data: {
                code,
            },
        });
    }

    /**
     * 绑定 Google 账号
     */
    async bindGoogle(code: string): Promise<ResponseData<unknown>> {
        return request<unknown>({
            url: '/oauth/google/bind',
            method: 'POST',
            timeout: GOOGLE_OAUTH_TIMEOUT_MS,
            data: {
                code,
            },
        });
    }

    /**
     * 解绑 Google 账号
     */
    async unbindGoogle(): Promise<ResponseData<unknown>> {
        return request<unknown>({
            url: '/oauth/google/unbind',
            method: 'POST',
        });
    }
}

export const authService = new AuthService();
