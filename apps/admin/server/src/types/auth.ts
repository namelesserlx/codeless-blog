export interface LoginRequest {
    username: string;
    password: string;
    captcha?: string;
    [key: string]: any; // 允许其他可能的参数
}

export interface LoginResponse {
    token: string;
    user: {
        id: number;
        username: string;
        email?: string;
        nickname?: string;
        avatar?: string;
        bio?: string;
        address?: string;
        phone?: string;
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        roles?: Array<{
            id: number;
            name: string;
            code: string;
            level: number;
        }>;
        permissions: Array<{
            id?: number;
            name?: string;
            code: string;
            type?: string;
            resource?: string;
            action?: string;
            path?: string;
            component?: string;
            icon?: string;
        }>;
        googleId?: string;
        githubId?: string;
    };
}

export interface JwtPayload {
    id: number;
    username: string;
    roles: string[]; // 角色代码数组
    session: string;
    exp: number;
    iat?: number;
}

export interface AuthSessionData {
    userId: number;
    username: string;
    loginTime?: string;
    createdAt?: string;
    lastSeenAt?: string;
    ip?: string;
    ipAddress?: string;
    address?: string;
    location?: string;
    device?: string;
    deviceType?: string;
    [key: string]: unknown;
}

export interface GithubTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
}

export interface GithubUserResponse {
    id: number;
    login: string;
    name: string;
    email: string;
    avatar_url: string;
}

export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token: string;
}

export interface GoogleUserResponse {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}
