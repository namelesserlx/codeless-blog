import type { Context } from 'koa';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtPayload } from '../../src/types/auth';
import * as authUtils from '../../src/utils/auth';
import * as routes from '../../src/routes';
import { jwtAuth } from '../../src/middlewares/auth';

vi.mock('../../src/utils/auth', () => ({
    judgeKeyOverdue: vi.fn(),
    removeListKey: vi.fn(),
    PermissionCacheService: {
        hasPermission: vi.fn(),
        getUserPermissions: vi.fn(),
    },
}));

vi.mock('../../src/routes', () => ({
    isKnownApiRoute: vi.fn(() => true),
}));

interface MockContextShape {
    path: string;
    cookies: {
        set: (name: string, value: string, options?: Record<string, unknown>) => void;
        get: (name: string) => string | undefined;
    };
    request: {
        header: Record<string, string>;
    };
    state: Record<string, unknown>;
    status?: number;
    body?: unknown;
}

const createMockContext = (path: string, authorization?: string): Context => {
    const headers: Record<string, string> = {};
    if (authorization !== undefined) {
        headers.authorization = authorization;
    }

    const mockContext: MockContextShape = {
        path,
        cookies: {
            set: () => undefined,
            get: () => undefined,
        },
        request: {
            header: headers,
        },
        state: {},
    };

    return mockContext as unknown as Context;
};

describe('jwtAuth middleware', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'unit-test-secret';
        vi.clearAllMocks();
        vi.mocked(authUtils.judgeKeyOverdue).mockResolvedValue(1);
    });

    it('should bypass authentication for exact-match public routes', async () => {
        const ctx = createMockContext('/api/auth/login');
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(ctx.status).toBeUndefined();
    });

    it('should bypass authentication for regex-based public routes', async () => {
        const ctx = createMockContext('/api/blog/articles/preview/hello-world');
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(ctx.status).toBeUndefined();
    });

    it('should bypass authentication for refresh route', async () => {
        const ctx = createMockContext('/api/auth/refresh');
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(ctx.status).toBeUndefined();
    });

    it('should reject protected routes when authorization header is missing', async () => {
        const ctx = createMockContext('/api/system/user/list');
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(ctx.status).toBe(401);
        expect((ctx.body as { code?: number })?.code).toBe(401);
        expect((ctx.body as { message?: string })?.message).toBe('未提供有效的认证token');
    });

    it('should reject protected routes when bearer token is empty', async () => {
        const ctx = createMockContext('/api/system/user/list', 'Bearer ');
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(ctx.status).toBe(401);
        expect((ctx.body as { code?: number })?.code).toBe(401);
        expect((ctx.body as { message?: string })?.message).toBe('未提供认证token');
    });

    it('should pass when token is valid and session is active', async () => {
        const payload: JwtPayload = {
            id: 7,
            username: 'test-user',
            roles: ['admin'],
            session: 'session-7',
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
            iat: Math.floor(Date.now() / 1000),
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET as string);

        const ctx = createMockContext('/api/system/user/list', `Bearer ${token}`);
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(ctx.state.user).toMatchObject({
            id: payload.id,
            session: payload.session,
        });
        expect(authUtils.judgeKeyOverdue).toHaveBeenCalledWith('session-7');
    });

    it('should reject when session is expired', async () => {
        const payload: JwtPayload = {
            id: 9,
            username: 'test-user-2',
            roles: ['user'],
            session: 'session-9',
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
            iat: Math.floor(Date.now() / 1000),
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET as string);
        vi.mocked(authUtils.judgeKeyOverdue).mockResolvedValue(0);

        const ctx = createMockContext('/api/system/user/list', `Bearer ${token}`);
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(ctx.status).toBe(401);
        expect((ctx.body as { code?: number })?.code).toBe(401);
        expect((ctx.body as { message?: string })?.message).toBe('token已失效，请重新登录');
        expect(authUtils.removeListKey).toHaveBeenCalledWith(['session-9']);
    });

    it('should allow unknown api routes to fall through to downstream 404 handling', async () => {
        vi.mocked(routes.isKnownApiRoute).mockReturnValue(false);

        const ctx = createMockContext('/api/not-found');
        const next = vi.fn(async () => undefined);

        await jwtAuth(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(ctx.status).toBeUndefined();
        expect(ctx.body).toBeUndefined();
    });
});
