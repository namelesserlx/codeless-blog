import type { IncomingMessage } from 'http';
import type { JwtPayload } from '../../types/auth';
import { isSessionValid, refreshSession, verifyToken } from '../../utils/auth';
import { authConfig } from '../../config/auth';

export const extractAccessToken = (request: IncomingMessage, requestUrl?: URL): string | null => {
    const tokenFromQuery = requestUrl?.searchParams.get('token');
    if (tokenFromQuery) return tokenFromQuery;

    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return null;
    }

    const accessToken = authorization.replace('Bearer ', '').trim();
    return accessToken || null;
};

export const authenticateAccessToken = async (accessToken: string): Promise<JwtPayload | null> => {
    const payload = verifyToken(accessToken);
    if (!payload?.session) {
        return null;
    }

    const sessionAlive = await isSessionValid(payload.session);
    if (!sessionAlive) {
        return null;
    }

    await refreshSession(payload.session, authConfig.sessionTtlSeconds);
    return payload;
};

export const authenticateSocketRequest = async (
    request: IncomingMessage,
    requestUrl: URL,
): Promise<JwtPayload | null> => {
    const accessToken = extractAccessToken(request, requestUrl);
    if (!accessToken) {
        return null;
    }

    return authenticateAccessToken(accessToken);
};
