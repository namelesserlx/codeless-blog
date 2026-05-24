/**
 * 业务错误码枚举
 */
export enum ErrorCode {
    // 通用错误
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    RESOURCE_EXISTS = 'RESOURCE_EXISTS',

    // 用户相关错误
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    USER_EXISTS = 'USER_EXISTS',
    EMAIL_EXISTS = 'EMAIL_EXISTS',
    USERNAME_EXISTS = 'USERNAME_EXISTS',
    INVALID_USER_ID = 'INVALID_USER_ID',
    CANNOT_DELETE_SUPER_ADMIN = 'CANNOT_DELETE_SUPER_ADMIN',
    INVALID_PASSWORD = 'INVALID_PASSWORD',

    // 认证相关错误
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    UNAUTHORIZED = 'UNAUTHORIZED',

    // 文件相关错误
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',

    // 权限管理相关错误
    PERMISSION_CODE_EXISTS = 'PERMISSION_CODE_EXISTS',
    PARENT_PERMISSION_NOT_FOUND = 'PARENT_PERMISSION_NOT_FOUND',
    PERMISSION_HAS_CHILDREN = 'PERMISSION_HAS_CHILDREN',
    PERMISSION_IN_USE = 'PERMISSION_IN_USE',
    UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',

    // 角色管理相关错误
    ROLE_NAME_EXISTS = 'ROLE_NAME_EXISTS',
    PARENT_ROLE_NOT_FOUND = 'PARENT_ROLE_NOT_FOUND',
    ROLE_HAS_USERS = 'ROLE_HAS_USERS',
    ROLE_HAS_CHILDREN = 'ROLE_HAS_CHILDREN',
    CORE_ROLE_CANNOT_DELETE = 'CORE_ROLE_CANNOT_DELETE',
    SOME_PERMISSIONS_NOT_FOUND = 'SOME_PERMISSIONS_NOT_FOUND',
}

/**
 * HTTP 状态码映射
 */
export const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
    [ErrorCode.UNKNOWN_ERROR]: 500,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.RESOURCE_NOT_FOUND]: 404,
    [ErrorCode.RESOURCE_EXISTS]: 400,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.USER_EXISTS]: 400,
    [ErrorCode.EMAIL_EXISTS]: 400,
    [ErrorCode.USERNAME_EXISTS]: 400,
    [ErrorCode.INVALID_USER_ID]: 400,
    [ErrorCode.CANNOT_DELETE_SUPER_ADMIN]: 403,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.UPLOAD_FAILED]: 500,
    [ErrorCode.INVALID_FILE_TYPE]: 400,
    [ErrorCode.FILE_TOO_LARGE]: 400,
    [ErrorCode.INVALID_PASSWORD]: 400,
    [ErrorCode.PERMISSION_CODE_EXISTS]: 400,
    [ErrorCode.PARENT_PERMISSION_NOT_FOUND]: 400,
    [ErrorCode.PERMISSION_HAS_CHILDREN]: 400,
    [ErrorCode.PERMISSION_IN_USE]: 400,
    [ErrorCode.UNSUPPORTED_OPERATION]: 400,
    [ErrorCode.ROLE_NAME_EXISTS]: 400,
    [ErrorCode.PARENT_ROLE_NOT_FOUND]: 400,
    [ErrorCode.ROLE_HAS_USERS]: 400,
    [ErrorCode.ROLE_HAS_CHILDREN]: 400,
    [ErrorCode.CORE_ROLE_CANNOT_DELETE]: 403,
    [ErrorCode.SOME_PERMISSIONS_NOT_FOUND]: 400,
};

/**
 * 错误消息映射
 */
export const ERROR_MESSAGE_MAP: Record<ErrorCode, string> = {
    [ErrorCode.UNKNOWN_ERROR]: '未知错误',
    [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
    [ErrorCode.PERMISSION_DENIED]: '权限不足',
    [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
    [ErrorCode.RESOURCE_EXISTS]: '资源已存在',
    [ErrorCode.USER_NOT_FOUND]: '用户不存在',
    [ErrorCode.USER_EXISTS]: '用户已存在',
    [ErrorCode.EMAIL_EXISTS]: '邮箱已存在',
    [ErrorCode.USERNAME_EXISTS]: '用户名已存在',
    [ErrorCode.INVALID_USER_ID]: '无效的用户ID',
    [ErrorCode.CANNOT_DELETE_SUPER_ADMIN]: '不能删除超级管理员账号',
    [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
    [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
    [ErrorCode.UNAUTHORIZED]: '未授权访问',
    [ErrorCode.UPLOAD_FAILED]: '文件上传失败',
    [ErrorCode.INVALID_FILE_TYPE]: '不支持的文件类型',
    [ErrorCode.FILE_TOO_LARGE]: '文件大小超过限制',
    [ErrorCode.INVALID_PASSWORD]: '密码错误',
    [ErrorCode.PERMISSION_CODE_EXISTS]: '权限代码已存在',
    [ErrorCode.PARENT_PERMISSION_NOT_FOUND]: '父权限不存在',
    [ErrorCode.PERMISSION_HAS_CHILDREN]: '该权限下还有子权限，无法删除',
    [ErrorCode.PERMISSION_IN_USE]: '该权限被角色使用，无法删除',
    [ErrorCode.UNSUPPORTED_OPERATION]: '不支持的操作类型',
    [ErrorCode.ROLE_NAME_EXISTS]: '角色名称已存在',
    [ErrorCode.PARENT_ROLE_NOT_FOUND]: '父角色不存在',
    [ErrorCode.ROLE_HAS_USERS]: '该角色下还有用户，无法删除',
    [ErrorCode.ROLE_HAS_CHILDREN]: '该角色下还有子角色，无法删除',
    [ErrorCode.CORE_ROLE_CANNOT_DELETE]: '核心角色不能删除',
    [ErrorCode.SOME_PERMISSIONS_NOT_FOUND]: '部分权限不存在',
};

/**
 * 业务异常基类
 */
export class BusinessError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: any;

    constructor(code: ErrorCode, message?: string, details?: any) {
        super(message || ERROR_MESSAGE_MAP[code]);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = HTTP_STATUS_MAP[code];
        this.details = details;

        // 确保错误堆栈信息正确
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 用户相关异常
 */
export class UserError extends BusinessError {
    constructor(code: ErrorCode, message?: string, details?: any) {
        super(code, message, details);
    }
}

/**
 * 验证异常
 */
export class ValidationError extends BusinessError {
    constructor(message?: string, details?: any) {
        super(ErrorCode.VALIDATION_ERROR, message, details);
    }
}

/**
 * 权限异常
 */
export class PermissionError extends BusinessError {
    constructor(message?: string, details?: any) {
        super(ErrorCode.PERMISSION_DENIED, message, details);
    }
}

/**
 * 资源不存在异常
 */
export class NotFoundError extends BusinessError {
    constructor(message?: string, details?: any) {
        super(ErrorCode.RESOURCE_NOT_FOUND, message, details);
    }
}

/**
 * 认证异常
 */
export class AuthError extends BusinessError {
    constructor(code: ErrorCode, message?: string, details?: any) {
        super(code, message, details);
    }
}

/**
 * 文件处理异常
 */
export class FileError extends BusinessError {
    constructor(code: ErrorCode, message?: string, details?: any) {
        super(code, message, details);
    }
}
