/**
 * 登录请求参数
 */
export interface LoginRequest {
    username: string;
    password: string;
    captcha: string;
}

/**
 * 邮箱登录请求参数
 */
export interface EmailLoginRequest {
    email: string;
    code: string;
}

/**
 * 注册请求参数
 */
export interface RegisterRequest {
    username: string;
    nickname: string;
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
}

/**
 * 角色信息
 */
export interface RoleInfo {
    id: number;
    name: string;
    code: string;
    description?: string;
    level: number;
}

/**
 * 权限信息
 */
export interface PermissionInfo {
    id?: number;
    name?: string;
    code: string;
    type?: string;
    resource?: string;
    action?: string;
    path?: string;
    component?: string;
    icon?: string;
}

/**
 * 角色权限信息
 */
export interface RolePermission {
    id: number;
    name: string;
    code: string;
    type: string;
    resource?: string;
    action?: string;
}

/**
 * 用户登录信息
 */
export interface LoginUserInfo {
    id: number;
    username: string;
    email?: string;
    nickname?: string;
    avatar?: string;
    bio?: string;
    address?: string;
    phone?: string;
    status?: string;
    roles?: RoleInfo[];
    permissions: PermissionInfo[];
    createdAt?: string;
    updatedAt?: string;
    githubId?: string;
    googleId?: string;
}

/**
 * 当前登录用户资料
 */
export interface CurrentUserProfile {
    id: number;
    username: string;
    email: string;
    nickname?: string;
    avatar?: string;
}

/**
 * 当前登录用户资料更新请求
 */
export interface UpdateCurrentUserProfileRequest {
    nickname?: string;
    email?: string;
    code?: string;
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
    token: string;
    user: LoginUserInfo;
}

/**
 * 用户状态接口（用于前端状态管理）
 */
export interface UserState {
    userInfo: LoginUserInfo | null;
    permissions: string[];
}
