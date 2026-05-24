/**
 * 通用响应数据结构
 */
export interface ResponseData<T = any> {
    code: number;
    data: T;
    message: string;
}

/**
 * 错误响应数据结构
 */
export interface ErrorResponseData {
    code: number;
    data: null;
    message: string;
}

/**
 * 响应状态码
 */
export enum ResponseCode {
    SUCCESS = 0, // 成功
    ERROR = 1, // 错误
    UNAUTHORIZED = 401, // 未授权（未登录）
    FORBIDDEN = 403, // 禁止访问（无权限）
}

/**
 * 分页响应数据
 */
export interface PaginationData<T = any> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
    [key: string]: any;
}

/**
 * 分页响应数据格式
 */
export interface PaginationResponse<T = any> {
    code: number;
    data: PaginationData<T>;
    message: string;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
    page?: number;
    pageSize?: number;
}
