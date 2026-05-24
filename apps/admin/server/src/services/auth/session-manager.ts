import type { Context } from 'koa';
import jwt from 'jsonwebtoken';
import { generateHash, getUserMachineSnapshot } from '@blog/shared';
import type { AuthSessionData, JwtPayload, LoginResponse } from '../../types/auth';
import { authConfig } from '../../config/auth';
import { env } from '../../config/env';
import { addSession, queryKeyValue, refreshSession, updateSessionData } from '../../utils/auth';
import { logger } from '../../utils/logger';
import { queryGeoIpAddress } from '../geoip';

type AccessTokenClaims = Pick<JwtPayload, 'id' | 'username' | 'roles' | 'session'>;

interface SessionUserSnapshot {
    id: number;
    username: string;
}

interface CreateLoginResultParams {
    ctx: Context;
    user: LoginResponse['user'];
    roleCodes: string[];
}

const getSessionCookieOptions = () => ({
    httpOnly: true,
    secure: authConfig.cookieSecure,
    sameSite: 'lax' as const,
    domain: authConfig.cookieDomain,
    path: '/',
    maxAge: authConfig.sessionCookieMaxAgeMs,
});

const buildSessionRecord = (
    user: SessionUserSnapshot,
    machine: Record<string, unknown>,
): AuthSessionData => {
    const now = new Date().toISOString();

    return {
        userId: user.id,
        username: user.username,
        loginTime: new Date().toLocaleDateString('zh-CN'),
        createdAt: now,
        lastSeenAt: now,
        ...machine,
    };
};

const fillSessionAddressInBackground = (sessionId: string, ip: unknown, address: unknown): void => {
    if (typeof ip !== 'string' || address !== '查询中') {
        return;
    }

    void queryGeoIpAddress(ip)
        .then(async (resolvedAddress) => {
            if (!resolvedAddress || resolvedAddress === address) {
                return;
            }

            await updateSessionData(sessionId, {
                address: resolvedAddress,
                location: resolvedAddress,
            });
        })
        .catch((error) => {
            logger.warn('异步补全登录地址失败', {
                sessionId,
                ip,
                error,
            });
        });
};

export const issueAccessToken = (claims: AccessTokenClaims): string => {
    const payload: JwtPayload = {
        ...claims,
        exp: Math.floor(Date.now() / 1000) + authConfig.accessTokenTtlSeconds,
    };

    return jwt.sign(payload, env.auth.jwtSecret);
};

export const readAuthSessionId = (ctx: Context): string | null => {
    return ctx.cookies.get(authConfig.sessionCookieName) || null;
};

export const writeAuthSession = (ctx: Context, sessionId: string): void => {
    ctx.cookies.set(authConfig.sessionCookieName, sessionId, getSessionCookieOptions());
};

export const clearAuthSession = (ctx: Context): void => {
    ctx.cookies.set(authConfig.sessionCookieName, '', {
        ...getSessionCookieOptions(),
        maxAge: 0,
        expires: new Date(0),
    });
};

export const getAuthSession = async (sessionId: string): Promise<AuthSessionData | null> => {
    try {
        return (await queryKeyValue(sessionId)) as AuthSessionData | null;
    } catch (error) {
        return null;
    }
};

export const resolveSessionUser = (
    sessionData: AuthSessionData | null,
): SessionUserSnapshot | null => {
    if (!sessionData || typeof sessionData.userId !== 'number') {
        return null;
    }

    return {
        id: sessionData.userId,
        username: typeof sessionData.username === 'string' ? sessionData.username : '',
    };
};

export const refreshAuthSession = async (sessionId: string): Promise<void> => {
    await refreshSession(sessionId, authConfig.sessionTtlSeconds);
};

/**
 * 创建登录结果
 * @param ctx 上下文
 * @param user 用户
 * @param roleCodes 角色代码
 * @returns
 */
export const createLoginResult = async ({
    ctx,
    user,
    roleCodes,
}: CreateLoginResultParams): Promise<LoginResponse> => {
    const sessionId = generateHash(16);
    const machine = getUserMachineSnapshot(ctx);
    const sessionRecord = buildSessionRecord(
        {
            id: user.id,
            username: user.username,
        },
        machine as Record<string, unknown>,
    );

    await addSession(sessionId, sessionRecord, authConfig.sessionTtlSeconds);
    fillSessionAddressInBackground(sessionId, sessionRecord.ip, sessionRecord.address);

    const token = issueAccessToken({
        id: user.id,
        username: user.username,
        roles: roleCodes,
        session: sessionId,
    });

    writeAuthSession(ctx, sessionId);
    ctx.state.user = {
        id: user.id,
        username: user.username,
        roles: roleCodes,
        session: sessionId,
        exp: Math.floor(Date.now() / 1000) + authConfig.accessTokenTtlSeconds,
    };

    return {
        token,
        user,
    };
};
