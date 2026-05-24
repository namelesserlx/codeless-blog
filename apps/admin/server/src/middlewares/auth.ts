import type { Context, Next } from 'koa';
import { Response } from '../utils/response';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/auth';
import { isPublicRoute } from '../config/public-routes';
import { env } from '../config/env';
import { judgeKeyOverdue, removeListKey, PermissionCacheService } from '../utils/auth';
import { clearAuthSession } from '../services/auth/session-manager';
import { logger } from '../utils/logger';
import { isKnownApiRoute } from '../routes';
import { AuthError, PermissionError, ErrorCode } from '../types/errors';

// JWT 认证中间件
export const jwtAuth = async (ctx: Context, next: Next) => {
    // 检查是否是公共路由
    if (isPublicRoute(ctx.path)) {
        await next();
        return;
    }

    if (!ctx.path.startsWith('/api') || !isKnownApiRoute(ctx.path, ctx.method)) {
        await next();
        return;
    }

    const { authorization = '' } = ctx.request.header;
    const token = authorization.replace('Bearer ', '');

    if (!authorization || !authorization.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = Response.unauthorized('未提供有效的认证token');
        return;
    }
    if (!token) {
        ctx.status = 401;
        ctx.body = Response.unauthorized('未提供认证token');
        return;
    }

    try {
        // 验证 token是否被篡改，如果被篡改，则会抛出JsonWebTokenError: jwt malformed错误
        const decoded = jwt.verify(token, env.auth.jwtSecret) as JwtPayload;
        const { session, id } = decoded;
        // 查询 sessionId 过期了没
        if (!(await judgeKeyOverdue(session))) {
            // 删除 login_tokens 集合中的过期key
            await removeListKey([session]);
            clearAuthSession(ctx);
            ctx.status = 401;
            ctx.body = Response.unauthorized('token已失效，请重新登录');
            return;
        }

        // 将用户信息存储在 ctx.state 中
        ctx.state.user = decoded;
        await next();
    } catch (error) {
        // 只处理JWT相关的错误，其他错误让全局错误处理中间件处理
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError' ||
            error.message?.includes('jwt') ||
            error.message?.includes('token')
        ) {
            logger.warn('Token verification error', {
                path: ctx.path,
                name: error.name,
                message: error.message,
            });
            ctx.status = 401;
            ctx.body = Response.unauthorized('token验证失败');
        } else {
            // 重新抛出非认证错误，让全局错误处理中间件处理
            throw error;
        }
    }
};

// 权限校验中间件
export function checkPermission(requiredPermissions: string | string[]) {
    return async (ctx: Context, next: Next) => {
        // 检查是否已通过JWT认证
        if (!ctx.state.user || !ctx.state.user.id) {
            throw new AuthError(ErrorCode.UNAUTHORIZED, '未提供认证信息');
        }

        const userId = ctx.state.user.id;

        const hasRequiredPermissions = await PermissionCacheService.hasPermission(
            userId,
            requiredPermissions,
        );

        if (!hasRequiredPermissions) {
            const permissionList = Array.isArray(requiredPermissions)
                ? requiredPermissions.join(', ')
                : requiredPermissions;

            throw new PermissionError(`缺少必要权限: ${permissionList}`);
        }

        // 将用户权限列表添加到 ctx.state 中，方便后续使用
        if (!ctx.state.permissions) {
            ctx.state.permissions = await PermissionCacheService.getUserPermissions(userId);
        }

        await next();
    };
}
