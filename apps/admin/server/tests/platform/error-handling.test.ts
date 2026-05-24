import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, BusinessError, ErrorCode, ValidationError } from '../../src/types/errors';
import { Response } from '../../src/utils/response';
import { errorHandler } from '../../src/middlewares/error-handler';

const mockedLogger = vi.hoisted(() => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../src/utils/logger', () => mockedLogger);
vi.mock('../../src/utils/auth', () => ({
    PermissionCacheService: {
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        getUserPermissions: vi.fn(),
    },
}));

import { ControllerErrorHandler, ServiceErrorHandler } from '../../src/utils/decorators';

class DecoratedBusinessService {
    @ServiceErrorHandler
    async fail() {
        throw new AuthError(ErrorCode.UNAUTHORIZED, '未登录');
    }
}

class DecoratedSystemService {
    @ServiceErrorHandler
    async fail() {
        throw new Error('boom');
    }
}

class DecoratedController {
    @ControllerErrorHandler
    async fail(ctx: Context) {
        ctx.state = ctx.state || {};
        throw new Error('boom');
    }
}

class DecoratedBusinessController {
    constructor(private readonly service = new DecoratedBusinessService()) {}

    @ControllerErrorHandler
    async fail(ctx: Context) {
        ctx.state = ctx.state || {};
        await this.service.fail();
    }
}

class DecoratedSystemController {
    constructor(private readonly service = new DecoratedSystemService()) {}

    @ControllerErrorHandler
    async fail(ctx: Context) {
        ctx.state = ctx.state || {};
        await this.service.fail();
    }
}

class ValidatedService {
    @ServiceErrorHandler
    async fail(input: { password: string }) {
        throw new Error(`boom:${input.password}`);
    }
}

class ValidatedController {
    @ControllerErrorHandler
    async login(ctx: Context) {
        class ValidateTarget {
            @ServiceErrorHandler
            async call(payload: { username?: string; password?: string }) {
                if (!payload.username || !payload.password) {
                    throw new ValidationError('用户名和密码不能为空');
                }
            }
        }

        const target = new ValidateTarget();
        await target.call(ctx.request.body as { username?: string; password?: string });
    }
}

const createMockContext = (): Context =>
    ({
        method: 'POST',
        url: '/api/auth/login',
        ip: '127.0.0.1',
        query: {},
        request: {
            body: {
                username: 'tester',
                password: 'secret-password',
                captcha: '1234',
                token: 'reset-token',
            },
        },
        state: {},
        get: () => 'Vitest',
    }) as unknown as Context;

describe('error handling decorators', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('keeps business errors to a single warn log with controller and service context', async () => {
        const controller = new DecoratedBusinessController();
        const ctx = createMockContext();

        await errorHandler()(ctx, async () => {
            await controller.fail(ctx);
        });

        expect(mockedLogger.logger.error).not.toHaveBeenCalled();
        expect(mockedLogger.logger.warn).toHaveBeenCalledTimes(1);
        const [, payload] = mockedLogger.logger.warn.mock.calls[0];
        expect(payload.controller).toMatchObject({
            className: 'DecoratedBusinessController',
            methodName: 'fail',
        });
        expect(payload.service).toMatchObject({
            className: 'DecoratedBusinessService',
            methodName: 'fail',
        });
        expect(payload.error).toMatchObject({
            name: 'AuthError',
            message: '未登录',
            code: 'UNAUTHORIZED',
            statusCode: 401,
        });
        expect(payload.error.stack).toBeUndefined();
        expect(payload.controller.request).toBeUndefined();
    });

    it('logs unexpected system errors once and keeps stack traces for diagnosis', async () => {
        const controller = new DecoratedSystemController();
        const ctx = createMockContext();

        await errorHandler()(ctx, async () => {
            await controller.fail(ctx);
        });

        expect(mockedLogger.logger.warn).not.toHaveBeenCalled();
        expect(mockedLogger.logger.error).toHaveBeenCalledTimes(1);
        const [, payload] = mockedLogger.logger.error.mock.calls[0];
        expect(payload.controller).toMatchObject({
            className: 'DecoratedSystemController',
            methodName: 'fail',
        });
        expect(payload.service).toMatchObject({
            className: 'DecoratedSystemService',
            methodName: 'fail',
        });
        expect(payload.error.name).toBe('Error');
        expect(payload.error.message).toBe('boom');
        expect(payload.error.stack).toContain('boom');
    });

    it('preserves generic service errors instead of force-wrapping them as BusinessError', async () => {
        const service = new ValidatedService();
        let thrownError: unknown;

        try {
            await service.fail({
                password: 'secret-password',
            });
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError).not.toBeInstanceOf(BusinessError);
        expect((thrownError as Error).message).toBe('boom:secret-password');
    });

    it('avoids duplicate logging for validation failures while keeping the final 400 response', async () => {
        const controller = new ValidatedController();
        const ctx = createMockContext();
        ctx.request.body = {};

        await errorHandler()(ctx, async () => {
            await controller.login(ctx);
        });

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual(Response.error('用户名和密码不能为空', 400));
        expect(mockedLogger.logger.warn).toHaveBeenCalledTimes(1);
        expect(mockedLogger.logger.error).not.toHaveBeenCalled();
    });
});

describe('global error handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps multer file size errors to a 400 response', async () => {
        const middleware = errorHandler();
        const ctx = createMockContext();

        await middleware(ctx, async () => {
            const error = Object.assign(new Error('File too large'), {
                name: 'MulterError',
                code: 'LIMIT_FILE_SIZE',
            });
            throw error;
        });

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual(Response.error('文件大小超过限制', 400));
    });
});
