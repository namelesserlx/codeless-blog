import type { LoginResponse, LoginUserInfo, ResponseData } from '@blog/shared';
import { ResponseCode } from '@blog/shared';
import { clientEnv } from '@/config/env';
import { authStorage } from '@/utils/authStorage';

const QUERY_KEY_PAYLOAD = 'payload';
const QUERY_KEY_TOKEN = 'token';
const QUERY_KEY_USER = 'user';

interface AuthPayload {
    token?: string;
    user?: LoginUserInfo;
}

const clearStoredAuth = () => {
    authStorage.clearToken();
    authStorage.clearUserInfo();
};

const hasAdminAccess = (user: LoginResponse['user']) => {
    return user.permissions?.some((permission) => permission.code === 'dashboard') === true;
};

const safeParseJson = <T>(value: string | null): T | null => {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const clearAuthUrlParams = (url: URL) => {
    url.searchParams.delete(QUERY_KEY_PAYLOAD);
    url.searchParams.delete(QUERY_KEY_TOKEN);
    url.searchParams.delete(QUERY_KEY_USER);
    window.history.replaceState({}, '', url.toString());
};

const bootstrapAuthFromUrl = () => {
    if (typeof window === 'undefined') return;

    try {
        const url = new URL(window.location.href);
        let hasAuthParam = false;

        const payload = url.searchParams.get(QUERY_KEY_PAYLOAD);
        if (payload) {
            try {
                const decoded = decodeURIComponent(atob(payload));
                const json = safeParseJson<AuthPayload>(decoded);
                if (json?.token) {
                    authStorage.setToken(json.token);
                    hasAuthParam = true;
                }
                if (json?.user) {
                    authStorage.setUserInfo(json.user);
                    hasAuthParam = true;
                }
            } catch {
                // 忽略格式错误的 payload
            }
        }

        const qsToken = url.searchParams.get(QUERY_KEY_TOKEN);
        const qsUser = url.searchParams.get(QUERY_KEY_USER);

        if (qsToken) {
            authStorage.setToken(qsToken);
            hasAuthParam = true;
        }

        if (qsUser) {
            const decodedUser = decodeURIComponent(qsUser);
            const user = safeParseJson<LoginUserInfo>(decodedUser);
            if (user) {
                authStorage.setUserInfo(user);
                hasAuthParam = true;
            }
        }

        if (hasAuthParam) {
            clearAuthUrlParams(url);
        }
    } catch {
        // 忽略 URL 解析错误
    }
};

const restoreAuthSession = async () => {
    if (typeof window === 'undefined') return;

    const token = authStorage.getToken();
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    try {
        const response = await fetch('/api/auth/admin-checkLogin', {
            method: 'GET',
            credentials: 'include',
            headers,
        });

        if (!response.ok) {
            clearStoredAuth();
            return;
        }

        const result = (await response.json()) as ResponseData<LoginResponse>;
        if (
            result.code !== ResponseCode.SUCCESS ||
            !result.data?.token ||
            !result.data.user ||
            !hasAdminAccess(result.data.user)
        ) {
            clearStoredAuth();
            return;
        }

        authStorage.setToken(result.data.token);
        authStorage.setUserInfo(result.data.user);
    } catch {
        // 网络异常时保留本地登录态，后续请求再按各自逻辑处理
    }
};

/**
 * 统一的鉴权启动流程。
 *
 * - development：支持从 URL hash 临时接收 token，方便博客前台跳转后台
 * - 所有环境：通过 sid 会话或 token 向服务端恢复登录态
 *
 * 在 React 渲染前尽早调用，以减少首屏 401 的概率。
 */
export const bootstrapAuth = async () => {
    if (typeof window === 'undefined') return;

    if (clientEnv.app.isDevelopment) {
        bootstrapAuthFromUrl();
    }

    await restoreAuthSession();
};
