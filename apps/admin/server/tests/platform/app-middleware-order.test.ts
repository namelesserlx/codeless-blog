import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareSentinels = vi.hoisted(() => ({
    requestLogger: vi.fn(async (_ctx, next) => next?.()),
    errorHandler: vi.fn(async (_ctx, next) => next?.()),
    notFoundHandler: vi.fn(async (_ctx, next) => next?.()),
    cors: vi.fn(async (_ctx, next) => next?.()),
    bodyParser: vi.fn(async (_ctx, next) => next?.()),
    secureProxy: vi.fn(async (_ctx, next) => next?.()),
    transform: vi.fn(async (_ctx, next) => next?.()),
    jwtAuth: vi.fn(async (_ctx, next) => next?.()),
    router: vi.fn(async (_ctx, next) => next?.()),
    allowedMethods: vi.fn(async (_ctx, next) => next?.()),
    healthRoutes: vi.fn(async (_ctx, next) => next?.()),
    healthAllowedMethods: vi.fn(async (_ctx, next) => next?.()),
    swaggerRoutes: vi.fn(async (_ctx, next) => next?.()),
    swaggerAllowedMethods: vi.fn(async (_ctx, next) => next?.()),
    validateSecurityConfig: vi.fn(),
    validateServerEnvironment: vi.fn(),
    startKoaServer: vi.fn(() => ({ close: vi.fn() })),
    getServerPort: vi.fn(() => 8000),
    registerWebSocketServer: vi.fn(),
}));

vi.mock('../../src/bootstrap/load-env', () => ({}));
vi.mock('../../src/telemetry/init', () => ({}));
vi.mock('koa-logger', () => ({
    default: () => middlewareSentinels.requestLogger,
}));
vi.mock('koa-bodyparser', () => ({
    default: () => middlewareSentinels.bodyParser,
}));
vi.mock('../../src/routes', () => ({
    default: {
        routes: () => middlewareSentinels.router,
        allowedMethods: () => middlewareSentinels.allowedMethods,
    },
}));
vi.mock('../../src/routes/health', () => ({
    healthRouter: {
        routes: () => middlewareSentinels.healthRoutes,
        allowedMethods: () => middlewareSentinels.healthAllowedMethods,
    },
}));
vi.mock('../../src/middlewares/auth', () => ({
    jwtAuth: middlewareSentinels.jwtAuth,
}));
vi.mock('../../src/middlewares/cors', () => ({
    corsMiddleware: () => middlewareSentinels.cors,
}));
vi.mock('../../src/middlewares/secure-proxy', () => ({
    normalizeSecureProxyHeaders: middlewareSentinels.secureProxy,
}));
vi.mock('../../src/config/swagger', () => ({
    default: {
        routes: () => middlewareSentinels.swaggerRoutes,
        allowedMethods: () => middlewareSentinels.swaggerAllowedMethods,
    },
}));
vi.mock('../../src/config/env', () => ({
    validateServerEnvironment: middlewareSentinels.validateServerEnvironment,
}));
vi.mock('../../src/middlewares/transform', () => ({
    transformDateMiddleware: middlewareSentinels.transform,
}));
vi.mock('../../src/middlewares/error-handler', () => ({
    errorHandler: () => middlewareSentinels.errorHandler,
    notFoundHandler: () => middlewareSentinels.notFoundHandler,
}));
vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));
vi.mock('../../src/utils/port', () => ({
    getServerPort: middlewareSentinels.getServerPort,
    startKoaServer: middlewareSentinels.startKoaServer,
}));
vi.mock('../../src/lib/websocket', () => ({
    registerWebSocketServer: middlewareSentinels.registerWebSocketServer,
}));
vi.mock('../../src/services/dashboard/websocket', () => ({
    dashboardChannel: {},
}));

describe('app middleware order', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('registers request logging outside the global error handler', async () => {
        const { default: app } = await import('../../src/app');

        const loggerIndex = app.middleware.indexOf(middlewareSentinels.requestLogger);
        const errorHandlerIndex = app.middleware.indexOf(middlewareSentinels.errorHandler);
        const secureProxyIndex = app.middleware.indexOf(middlewareSentinels.secureProxy);

        expect(secureProxyIndex).toBeGreaterThanOrEqual(0);
        expect(loggerIndex).toBeGreaterThanOrEqual(0);
        expect(errorHandlerIndex).toBeGreaterThanOrEqual(0);
        expect(secureProxyIndex).toBeLessThan(loggerIndex);
        expect(loggerIndex).toBeLessThan(errorHandlerIndex);
    });
});
