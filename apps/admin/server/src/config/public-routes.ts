export type RouteMatcher = string | RegExp;

/**
 * 统一公共路由配置（单一来源）：
 * 仅用于 jwtAuth 判定是否跳过登录态校验
 */
export const publicRouteMatchers: RouteMatcher[] = [
    '/api/auth/login',
    '/api/auth/admin-login',
    '/api/auth/captcha',
    '/api/auth/logout',
    '/api/auth/validate',
    '/api/auth/register',
    '/api/oauth/github/login',
    '/api/oauth/google/login',
    '/api/blog/comments',
    /^\/api\/blog\/articles\/preview\/[^/]+$/,
    '/api/auth/send-email-code',
    '/api/auth/email-login',
    '/api/auth/checkLogin',
    '/api/auth/admin-checkLogin',
    '/api/auth/refresh',
    '/api/auth/admin-refresh',
    '/api/auth/send-reset-email',
    '/api/auth/verify-reset-token',
    '/api/auth/reset-password',
    '/swagger',
    '/api-docs',
    '/health',
];

const matchRoute = (path: string, matcher: RouteMatcher): boolean => {
    if (typeof matcher === 'string') {
        return path === matcher;
    }

    return matcher.test(path);
};

export const isPublicRoute = (path: string): boolean => {
    return publicRouteMatchers.some((matcher) => matchRoute(path, matcher));
};
