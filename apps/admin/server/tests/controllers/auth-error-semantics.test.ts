import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ErrorCode, ValidationError } from '../../src/types/errors';
import { errorHandler } from '../../src/middlewares/error-handler';

const mockedAuthService = vi.hoisted(() => ({
    createCaptchaChallenge: vi.fn(),
    login: vi.fn(),
    checkLogin: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    sendEmailVerificationCode: vi.fn(),
    emailLogin: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    verifyResetToken: vi.fn(),
    resetPassword: vi.fn(),
    register: vi.fn(),
}));

vi.mock('../../src/services/auth', () => ({
    authService: mockedAuthService,
}));
vi.mock('../../src/utils/auth', () => ({
    PermissionCacheService: {
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        getUserPermissions: vi.fn(),
    },
}));

import { authController } from '../../src/controllers/auth/login';

const createMockContext = ({
    body = {},
}: {
    body?: Record<string, unknown>;
} = {}): Context => {
    return {
        method: 'POST',
        url: '/api/auth/login',
        ip: '127.0.0.1',
        query: {},
        request: {
            body,
            header: {},
        },
        headers: {},
        state: {},
        get: () => '',
        status: undefined,
        body: undefined,
    } as unknown as Context;
};

const runWithGlobalErrorHandler = async (
    ctx: Context,
    handler: (ctx: Context) => Promise<void>,
) => {
    const middleware = errorHandler();
    await middleware(ctx, async () => {
        await handler(ctx);
    });
};

describe('auth controller error semantics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps login validation failures to HTTP 400 instead of a pseudo-success response', async () => {
        mockedAuthService.login.mockRejectedValue(new ValidationError('验证码错误'));

        const ctx = createMockContext({
            body: {
                username: 'tester',
                password: 'secret',
                captcha: 'bad',
            },
        });

        await runWithGlobalErrorHandler(ctx, authController.login.bind(authController));

        expect(ctx.status).toBe(400);
        expect(ctx.body).toMatchObject({
            message: '验证码错误',
        });
    });

    it('maps unauthenticated checkLogin failures to HTTP 401', async () => {
        mockedAuthService.checkLogin.mockRejectedValue(
            new AuthError(ErrorCode.UNAUTHORIZED, '未登录'),
        );

        const ctx = createMockContext();
        ctx.method = 'GET';
        ctx.url = '/api/auth/checkLogin';

        await runWithGlobalErrorHandler(ctx, authController.checkLogin.bind(authController));

        expect(ctx.status).toBe(401);
        expect(ctx.body).toMatchObject({
            message: '未登录',
        });
    });
});
