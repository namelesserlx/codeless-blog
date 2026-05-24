import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import { API_WHITE_LIST } from './constants';
import { LoginResponse, ResponseData, ResponseCode } from '@blog/shared';
import { authStorage } from './authStorage';
import {
    createRequestError,
    getResponseCode,
    getResponseMessage,
    getResponseStatus,
} from './request-errors';

const request = axios.create({
    baseURL: '/api',
    timeout: 10000,
    withCredentials: true, // 生产使用Cookie会话
});

const refreshClient = axios.create({
    baseURL: '/api',
    timeout: 10000,
    withCredentials: true,
});

let refreshPromise: Promise<LoginResponse | null> | null = null;

const isWhiteListRequest = (url?: string) => {
    return API_WHITE_LIST.some((path) => url?.includes(path));
};

const hasAdminAccess = (user: LoginResponse['user']) => {
    return user.permissions?.some((permission) => permission.code === 'dashboard') === true;
};

const clearAuthAndRedirect = () => {
    authStorage.clearToken();
    authStorage.clearUserInfo();
    window.location.href = '/login';
};

const refreshAccessToken = async (): Promise<LoginResponse | null> => {
    if (!refreshPromise) {
        refreshPromise = refreshClient
            .post<ResponseData<LoginResponse>>('/auth/admin-refresh')
            .then((response) => {
                const result = response.data;
                if (result.code !== ResponseCode.SUCCESS || !result.data?.token) {
                    return null;
                }

                if (!result.data.user || !hasAdminAccess(result.data.user)) {
                    authStorage.clearToken();
                    authStorage.clearUserInfo();
                    return null;
                }

                authStorage.setToken(result.data.token);
                authStorage.setUserInfo(result.data.user);

                return result.data;
            })
            .catch(() => null)
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        // 检查是否在白名单中
        const isWhiteList = isWhiteListRequest(config.url);

        // 非白名单请求需要token（开发用token方案，生产Cookie会话也能兼容）
        if (!isWhiteList) {
            const token = authStorage.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        const res = response.data as ResponseData<unknown>;

        if (res.code === ResponseCode.SUCCESS) {
            return Promise.resolve(res) as unknown as AxiosResponse;
        }

        // 401 错误（未授权）且不在白名单中才跳转登录
        if (res.code === ResponseCode.UNAUTHORIZED && !isWhiteListRequest(response.config.url)) {
            clearAuthAndRedirect();
            return Promise.reject(
                createRequestError(res.message || '未授权，请重新登录', {
                    status: ResponseCode.UNAUTHORIZED,
                    code: ResponseCode.UNAUTHORIZED,
                }),
            );
        }

        return Promise.reject(
            createRequestError(res.message || '请求失败', {
                status: response.status,
                code: res.code,
                response: {
                    status: response.status,
                    data: {
                        code: res.code,
                        message: res.message,
                    },
                },
            }),
        );
    },
    async (error) => {
        const originalRequest = error.config as
            | (AxiosRequestConfig & { _retry?: boolean })
            | undefined;

        if (
            error.response?.status === ResponseCode.UNAUTHORIZED &&
            originalRequest &&
            !isWhiteListRequest(originalRequest.url) &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/admin-refresh')
        ) {
            originalRequest._retry = true;

            const refreshedAuth = await refreshAccessToken();
            if (refreshedAuth?.token) {
                originalRequest.headers = {
                    ...originalRequest.headers,
                    Authorization: `Bearer ${refreshedAuth.token}`,
                };

                return request(originalRequest);
            }
        }

        if (
            error.response?.status === ResponseCode.UNAUTHORIZED &&
            originalRequest &&
            !isWhiteListRequest(originalRequest.url)
        ) {
            clearAuthAndRedirect();
            const unauthorizedError = createRequestError('未授权，请重新登录', {
                status: ResponseCode.UNAUTHORIZED,
                code: ResponseCode.UNAUTHORIZED,
                response: error.response,
            });
            message.error(unauthorizedError.message);
            return Promise.reject(unauthorizedError);
        }

        return Promise.reject(
            createRequestError(getResponseMessage(error, '网络错误'), {
                status: getResponseStatus(error),
                code: getResponseCode(error),
                response: error.response,
            }),
        );
    },
);

// 扩展 request 方法，使其支持泛型
export interface RequestInstance {
    <T = unknown>(config: AxiosRequestConfig): Promise<ResponseData<T>>;
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ResponseData<T>>;
    post<T = unknown>(
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig,
    ): Promise<ResponseData<T>>;
    put<T = unknown>(
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig,
    ): Promise<ResponseData<T>>;
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ResponseData<T>>;
}

export default request as RequestInstance;
