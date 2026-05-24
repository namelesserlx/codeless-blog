import type { LoginUserInfo } from '@blog/shared';
import { storage as sharedStorage } from '@blog/shared';

const TOKEN_KEY = 'token';

/**
 * 管理后台前端的鉴权存储适配层
 *
 * - 基于 @blog/shared 提供的 storage 工具统一管理 userInfo
 * - 在此模块内集中管理 token 与 userInfo 的读写，避免在业务代码中直接操作 localStorage
 */
export const authStorage = {
    getToken(): string | null {
        return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
    },

    setToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(TOKEN_KEY, token);
    },

    clearToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(TOKEN_KEY);
    },

    getUserInfo(): LoginUserInfo | null {
        // sharedStorage 内部基于同一个 localStorage key 存储用户信息
        return sharedStorage.getUserInfo() as unknown as LoginUserInfo | null;
    },

    setUserInfo(userInfo: LoginUserInfo): void {
        // 这里与 @blog/shared 中的存储结构保持兼容，允许多余字段存在
        sharedStorage.setUserInfo(
            userInfo as unknown as Parameters<typeof sharedStorage.setUserInfo>[0],
        );
    },

    updateUserInfo(partialUserInfo: Partial<LoginUserInfo>): void {
        sharedStorage.updateUserInfo(
            partialUserInfo as unknown as Parameters<typeof sharedStorage.updateUserInfo>[0],
        );
    },

    clearUserInfo(): void {
        sharedStorage.clearUserInfo();
    },
};
