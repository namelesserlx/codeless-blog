import type { Context } from 'koa';
import { PermissionCacheService } from '../auth';
import { logger } from '../logger';
import { AuthError, BusinessError, ErrorCode, PermissionError } from '../../types/errors';
import { sanitizeForLog } from './sanitize';
import { attachErrorContext } from './error';

export enum PermissionStrategy {
    ALL = 'ALL',
    ANY = 'ANY',
    OWNER = 'OWNER',
}

export interface PermissionConfig {
    permissions: string | string[];
    strategy?: PermissionStrategy;
    message?: string;
    allowOwner?: boolean;
}

export function RequirePermission(config: PermissionConfig) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (ctx: Context, ...args: any[]) {
            if (!ctx.state.user || !ctx.state.user.id) {
                throw new AuthError(ErrorCode.UNAUTHORIZED, '未授权访问');
            }

            const userId = ctx.state.user.id;
            const {
                permissions,
                strategy = PermissionStrategy.ALL,
                message,
                allowOwner = false,
            } = config;

            if (allowOwner && (await checkResourceOwner(ctx, userId))) {
                return await originalMethod.apply(this, [ctx, ...args]);
            }

            let hasRequiredPermission = false;

            try {
                hasRequiredPermission = await checkUserPermission(userId, permissions, strategy);

                if (hasRequiredPermission && !ctx.state.permissions) {
                    ctx.state.permissions = await PermissionCacheService.getUserPermissions(userId);
                }
            } catch (error) {
                if (error instanceof BusinessError) {
                    throw error;
                }

                throw attachErrorContext(
                    new BusinessError(ErrorCode.UNKNOWN_ERROR, '权限数据加载失败'),
                    {
                        permission: {
                            methodName: propertyName,
                            permissions: sanitizeForLog(config.permissions),
                            strategy: config.strategy ?? PermissionStrategy.ALL,
                            userId,
                        },
                    },
                );
            }

            if (!hasRequiredPermission) {
                const errorMessage =
                    message ||
                    `缺少必要权限: ${Array.isArray(permissions) ? permissions.join(', ') : permissions}`;
                throw attachErrorContext(new PermissionError(errorMessage), {
                    permission: {
                        methodName: propertyName,
                        permissions: sanitizeForLog(permissions),
                        strategy,
                        userId,
                    },
                });
            }

            return await originalMethod.apply(this, [ctx, ...args]);
        };

        return descriptor;
    };
}

async function checkUserPermission(
    userId: number,
    permissions: string | string[],
    strategy: PermissionStrategy,
): Promise<boolean> {
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];
    try {
        switch (strategy) {
            case PermissionStrategy.ALL:
                return await PermissionCacheService.hasPermission(userId, permissionList);
            case PermissionStrategy.ANY:
                return await PermissionCacheService.hasAnyPermission(userId, permissionList);
            default:
                return await PermissionCacheService.hasPermission(userId, permissionList);
        }
    } catch (error) {
        if (error instanceof BusinessError) {
            throw error;
        }

        throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '权限数据加载失败', {
            source: 'RequirePermission.checkUserPermission',
            cause: error instanceof Error ? error.message : String(error),
            userId,
            permissions: permissionList,
            strategy,
        });
    }
}

async function checkResourceOwner(ctx: Context, userId: number): Promise<boolean> {
    const resourceId = ctx.params.id || (ctx.request.body as any)?.id;

    if (!resourceId) {
        return false;
    }

    const path = ctx.path;
    const numericResourceId = parseInt(resourceId);

    try {
        if (path.includes('/users/') || path.includes('/user/')) {
            return numericResourceId === userId;
        }

        return false;
    } catch (error) {
        logger.error('资源所有者检查失败', {
            userId,
            resourceId,
            path,
            error,
        });
        return false;
    }
}

export function RequireSuperAdmin(message?: string) {
    return RequirePermission({
        permissions: 'system:super_admin',
        message: message || '需要超级管理员权限',
    });
}

export function CombinePermissions(...decorators: any[]) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        decorators.reverse().forEach((decorator) => {
            decorator(target, propertyName, descriptor);
        });
    };
}
