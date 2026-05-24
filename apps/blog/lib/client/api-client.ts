// lib/api.ts - 简化的 API 请求工具

import { publicEnv } from '@/config/public-env';

/**
 * API 请求参数接口
 */
interface ApiParams {
    /** API 端点路径，如：/api/posts */
    endpoint: string;
    /** HTTP 请求方法，默认为 GET */
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /** 请求数据，GET 请求会转为查询参数，其他请求会放入请求体 */
    data?: unknown;
    /** 额外的 fetch 请求选项 */
    options?: RequestInit;
}

interface ApiErrorResponse {
    message?: unknown;
}

const readResponseJson = async <T>(response: Response): Promise<T | null> => {
    try {
        return (await response.json()) as T;
    } catch {
        return null;
    }
};

const getErrorMessage = (response: Response, payload: ApiErrorResponse | null): string => {
    return typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : `请求失败: ${response.status}`;
};

/**
 * 统一的 API 请求函数
 *
 * @template T - 响应数据的类型
 * @param params - 请求参数对象
 * @param params.endpoint - API 端点路径，会自动拼接到配置的服务器地址后面
 * @param params.method - HTTP 请求方法，支持 GET/POST/PUT/DELETE，默认为 GET
 * @param params.data - 请求数据，GET 请求时会转换为 URL 查询参数，其他请求时会序列化为 JSON 放入请求体
 * @param params.options - 额外的 fetch 请求选项，会与默认选项合并
 *
 * @returns Promise<T> - 返回解析后的 JSON 响应数据
 *
 * @throws {Error} - 当请求失败时抛出错误
 *
 * @example
 * ```typescript
 * // GET 请求示例
 * const posts = await apiRequest<Post[]>({
 *     endpoint: '/api/posts'
 * });
 *
 * // GET 请求带查询参数
 * const posts = await apiRequest<Post[]>({
 *     endpoint: '/api/posts',
 *     method: 'GET',
 *     data: { page: 1, limit: 10, tag: 'react' }
 * });
 *
 * // POST 请求示例
 * const newPost = await apiRequest<Post>({
 *     endpoint: '/api/posts',
 *     method: 'POST',
 *     data: { title: '文章标题', content: '文章内容' }
 * });
 *
 * // 带自定义请求头的示例
 * const result = await apiRequest<ApiResponse>({
 *     endpoint: '/api/protected',
 *     method: 'GET',
 *     options: {
 *         headers: { 'Authorization': 'Bearer token123' }
 *     }
 * });
 * ```
 */
export async function apiRequest<T>({
    endpoint,
    method = 'GET',
    data,
    options,
}: ApiParams): Promise<T> {
    const apiBaseUrl = publicEnv.urls.api;
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

    // 构建完整的请求 URL
    let url = `${apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // GET 请求将 data 转换为 URL 查询参数
    if (method === 'GET' && data) {
        const params = new URLSearchParams(data as Record<string, string>);
        url += `?${params}`;
    }

    // 构建请求选项，合并默认配置和用户自定义选项
    const { headers: customHeaders, credentials, ...restOptions } = options || {};
    const requestOptions: RequestInit = {
        method,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...customHeaders, // 合并自定义 headers
        },
        // 默认带上凭证（用于验证码/登录等需要会话的接口），允许被 options.credentials 覆盖
        credentials: credentials ?? 'include',
        ...restOptions, // 展开其他选项，但不包括 headers
    };

    // 非 GET 请求将 data 序列化为 JSON 放入请求体
    if (method !== 'GET' && data) {
        requestOptions.body = isFormData ? data : JSON.stringify(data);
    }

    // 发起网络请求
    const response = await fetch(url, requestOptions);

    const responseData = await readResponseJson<T & ApiErrorResponse>(response);

    // 检查响应状态，优先展示后端返回的业务错误信息
    if (!response.ok) {
        throw new Error(getErrorMessage(response, responseData));
    }

    if (!responseData) {
        throw new Error('响应解析失败');
    }

    return responseData;
}
