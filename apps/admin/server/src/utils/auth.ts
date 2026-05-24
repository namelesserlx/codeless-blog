import redis from '../lib/redis';
import jwt from 'jsonwebtoken';
import { prisma } from '@blog/db';
import type { AuthSessionData, JwtPayload } from '../types/auth';
import { env } from '../config/env';
import { AuthError, BusinessError, ErrorCode } from '../types/errors';

/**
 * 添加session
 * @param key redis的key
 * @param data 数据
 * @param time 过期时间（秒）默认3600秒（1小时）
 */
export const saveSessionData = async (key: string, data: unknown, time = 3600) => {
    await redis.sadd('login_tokens', key);
    await redis.set(key, JSON.stringify(data));
    // 对象过期时间设置（秒）
    await redis.expire(key, time);
};

export const addSession = async (key: string, data: unknown, time = 3600) => {
    await saveSessionData(key, data, time);
};

export const updateSessionData = async (
    key: string,
    patch: Record<string, unknown>,
): Promise<void> => {
    const current = await queryKeyValue(key);
    if (!current || typeof current !== 'object') {
        return;
    }

    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify({ ...current, ...patch }));
    if (ttl > 0) {
        await redis.expire(key, ttl);
    }
};

/**
 * 验证JWT token
 * @param token JWT token
 * @returns JwtPayload | null
 */
export const verifyToken = (token: string): JwtPayload | null => {
    try {
        return jwt.verify(token, env.auth.jwtSecret) as JwtPayload;
    } catch (error) {
        return null;
    }
};

/**
 * 验证用户权限
 * @param userRoles 用户角色代码数组
 * @param requiredRoles 需要的角色代码数组
 * @returns boolean
 */
export const hasRole = (userRoles: string[], requiredRoles: string[]): boolean => {
    return requiredRoles.some((role) => userRoles.includes(role));
};

/**
 * 验证用户是否有超级管理员权限
 * @param userRoles 用户角色代码数组
 * @returns boolean
 */
export const isSuperAdmin = (userRoles: string[]): boolean => {
    return userRoles.includes('super_admin');
};

/**
 * 检查会话是否有效
 * @param sessionId 会话ID
 * @returns boolean
 */
export const isSessionValid = async (sessionId: string): Promise<boolean> => {
    const exists = await judgeKeyOverdue(sessionId);
    return exists === 1;
};

/**
 * 删除用户会话
 * @param sessionId 会话ID
 */
export const removeSession = async (sessionId: string) => {
    await redis.srem('login_tokens', sessionId);
    await redis.del(sessionId);
    recordNum('del');
};

/**
 * 更新会话过期时间
 * @param sessionId 会话ID
 * @param time 过期时间（秒）
 */
export const refreshSession = async (sessionId: string, time = 3600) => {
    const sessionData = await queryKeyValue(sessionId);
    if (sessionData) {
        await redis.expire(sessionId, time);
        recordNum('expire');
    }
};

/**
 * 获取用户在线会话数量
 * @returns number
 */
export const getOnlineUserCount = async (): Promise<number> => {
    const tokens = await getAllUserInfo();
    let onlineCount = 0;

    for (const token of tokens) {
        const exists = await judgeKeyOverdue(token);
        if (exists === 1) {
            onlineCount++;
        }
    }

    return onlineCount;
};

/**
 * 清理过期会话
 */
export const cleanExpiredSessions = async () => {
    const tokens = await getAllUserInfo();
    const expiredTokens: string[] = [];

    for (const token of tokens) {
        const exists = await judgeKeyOverdue(token);
        if (exists === 0) {
            expiredTokens.push(token);
        }
    }

    if (expiredTokens.length > 0) {
        await removeListKey(expiredTokens);
    }

    return expiredTokens.length;
};

/**
 * 强制用户下线
 * @param userId 用户ID
 */
export const forceLogout = async (userId: number) => {
    const tokens = await getAllUserInfo();
    const userTokens: string[] = [];

    for (const token of tokens) {
        try {
            const sessionData = (await queryKeyValue(token)) as AuthSessionData | null;
            if (sessionData?.userId === userId) {
                userTokens.push(token);
            }
        } catch (error) {
            // 忽略解析错误的token
        }
    }

    if (userTokens.length > 0) {
        await removeListKey(userTokens);
        // 删除对应的session数据
        for (const token of userTokens) {
            await redis.del(token);
        }
    }

    return userTokens.length;
};

/**
 * 记录redis命令使用次数
 * @param type: string
 */
export const recordNum = async (type: string) => {
    redis.incr(type);
};

/**
 * 获取 集合 的 所有的值
 * @param key string
 * @returns string[]
 */
export const getSetsValue = async (key: string) => {
    recordNum('smembers');
    return (await redis.smembers(key)) as string[];
};

/**
 * 获取redis中所有登录的token
 * @returns string[]
 */
export const getAllUserInfo = async () => {
    recordNum('smembers');
    return (await redis.smembers('login_tokens')) as string[];
};

/**
 * 查询 sessionId 是否过期
 * @param key
 * @returns 1未过期 0过期
 */
export const judgeKeyOverdue = async (key: string) => {
    recordNum('exists');
    const res = await redis.exists(key);
    return res;
};

/**
 * 批量删除集合内的 sessionId
 * @param keys: string[]
 * @returns
 */
export const removeListKey = async (keys: string[]) => {
    await redis.srem('login_tokens', keys);
    recordNum('srem');
};

/**
 * 重置存储 session的过期时间
 * @param key
 * @param time 过期时间设置(秒)
 */
export const resetTime = (key: string, time = 3600) => {
    redis.expire(key, time);
    recordNum('expire');
};

/**
 * 批量删除集合内的值
 * @param setName: string
 * @param keys: string[]
 * @returns
 */
export const removeSetKeys = async (setName: string, keys: string[]) => {
    await redis.srem(setName, keys);
    recordNum('srem');
};

/**
 * 查询 用户的详细信息
 * @param key
 * @returns
 */
export const queryKeyValue = async (key: string) => {
    recordNum('get');
    return JSON.parse(await redis.get(key));
};

// 权限缓存服务
export class PermissionCacheService {
    private static readonly CACHE_PREFIX = 'user_permissions:';
    private static readonly CACHE_TTL = 60 * 60; // 1小时

    /**
     * 获取用户权限列表（带缓存）
     */
    static async getUserPermissions(userId: number): Promise<string[]> {
        const cacheKey = `${this.CACHE_PREFIX}${userId}`;

        try {
            // 先从缓存获取
            const cachedPermissions = await redis.get(cacheKey);
            if (cachedPermissions) {
                try {
                    return JSON.parse(cachedPermissions);
                } catch {
                    await redis.del(cacheKey);
                }
            }

            // 缓存不存在，从数据库查询
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    userRoles: {
                        include: {
                            role: {
                                include: {
                                    rolePermissions: {
                                        include: {
                                            permission: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!user) {
                throw new AuthError(ErrorCode.UNAUTHORIZED, '用户不存在或已被禁用');
            }

            // 检查用户状态
            if (user.status !== 'ACTIVE') {
                throw new AuthError(ErrorCode.UNAUTHORIZED, '用户不存在或已被禁用');
            }

            // 合并所有角色的权限
            const permissions = new Set<string>();
            user.userRoles.forEach((userRole) => {
                // 检查角色状态
                if (userRole.role.status === 'ACTIVE') {
                    userRole.role.rolePermissions.forEach((rolePermission) => {
                        // 检查权限状态
                        if (rolePermission.permission.status === 'ACTIVE') {
                            permissions.add(rolePermission.permission.code);
                        }
                    });
                }
            });

            const permissionList = Array.from(permissions);

            // 存入缓存
            await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(permissionList));

            return permissionList;
        } catch (error) {
            if (error instanceof BusinessError) {
                throw error;
            }

            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '权限数据加载失败', {
                source: 'PermissionCacheService.getUserPermissions',
                cause: error instanceof Error ? error.message : String(error),
                userId,
            });
        }
    }

    /**
     * 检查用户是否拥有指定权限
     */
    static async hasPermission(
        userId: number,
        requiredPermissions: string | string[],
    ): Promise<boolean> {
        const userPermissions = await this.getUserPermissions(userId);
        const permissions = Array.isArray(requiredPermissions)
            ? requiredPermissions
            : [requiredPermissions];

        return permissions.every((permission) => userPermissions.includes(permission));
    }

    /**
     * 检查用户是否拥有任意一个权限
     */
    static async hasAnyPermission(userId: number, requiredPermissions: string[]): Promise<boolean> {
        const userPermissions = await this.getUserPermissions(userId);

        return requiredPermissions.some((permission) => userPermissions.includes(permission));
    }

    /**
     * 清除用户权限缓存
     */
    static async clearUserPermissionCache(userId: number): Promise<void> {
        const cacheKey = `${this.CACHE_PREFIX}${userId}`;
        await redis.del(cacheKey);
    }

    /**
     * 批量清除权限缓存
     */
    static async clearPermissionCache(userIds: number[]): Promise<void> {
        if (userIds.length === 0) return;

        const cacheKeys = userIds.map((id) => `${this.CACHE_PREFIX}${id}`);
        await redis.del(...cacheKeys);
    }

    /**
     * 清除所有权限缓存
     */
    static async clearAllPermissionCache(): Promise<void> {
        const pattern = `${this.CACHE_PREFIX}*`;
        const keys = await redis.keys(pattern);

        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
}
