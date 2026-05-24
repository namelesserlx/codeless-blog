import Router from '@koa/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockedRouteMiddlewares = vi.hoisted(() => ({
    global: vi.fn(async (_ctx, next) => next?.()),
    authLogin: vi.fn(async (_ctx, next) => next?.()),
    authGithub: vi.fn(async (_ctx, next) => next?.()),
    authGoogle: vi.fn(async (_ctx, next) => next?.()),
    user: vi.fn(async (_ctx, next) => next?.()),
    role: vi.fn(async (_ctx, next) => next?.()),
    permission: vi.fn(async (_ctx, next) => next?.()),
    article: vi.fn(async (_ctx, next) => next?.()),
    tag: vi.fn(async (_ctx, next) => next?.()),
    comment: vi.fn(async (_ctx, next) => next?.()),
    email: vi.fn(async (_ctx, next) => next?.()),
    photo: vi.fn(async (_ctx, next) => next?.()),
    snippet: vi.fn(async (_ctx, next) => next?.()),
    dashboard: vi.fn(async (_ctx, next) => next?.()),
    articleReport: vi.fn(async (_ctx, next) => next?.()),
}));

vi.mock('../../src/routes/global', () => ({
    globalRouter: {
        routes: () => mockedRouteMiddlewares.global,
    },
}));

vi.mock('../../src/routes/auth', () => ({
    authLoginRouter: {
        routes: () => mockedRouteMiddlewares.authLogin,
    },
    authGithubRouter: {
        routes: () => mockedRouteMiddlewares.authGithub,
    },
    authGoogleRouter: {
        routes: () => mockedRouteMiddlewares.authGoogle,
    },
}));

vi.mock('../../src/routes/system/user', () => ({
    userRouter: {
        routes: () => mockedRouteMiddlewares.user,
    },
}));

vi.mock('../../src/routes/system/role', () => ({
    roleRouter: {
        routes: () => mockedRouteMiddlewares.role,
    },
}));

vi.mock('../../src/routes/system/permission', () => ({
    permissionRouter: {
        routes: () => mockedRouteMiddlewares.permission,
    },
}));

vi.mock('../../src/routes/blog/article', () => ({
    articleRouter: {
        routes: () => mockedRouteMiddlewares.article,
    },
}));

vi.mock('../../src/routes/blog/tag', () => ({
    tagRouter: {
        routes: () => mockedRouteMiddlewares.tag,
    },
}));

vi.mock('../../src/routes/blog/comment', () => ({
    default: {
        routes: () => mockedRouteMiddlewares.comment,
    },
}));

vi.mock('../../src/routes/email/test', () => ({
    default: {
        routes: () => mockedRouteMiddlewares.email,
    },
}));

vi.mock('../../src/routes/blog/photo', () => ({
    photoRouter: {
        routes: () => mockedRouteMiddlewares.photo,
    },
}));

vi.mock('../../src/routes/blog/snippet', () => ({
    snippetRouter: {
        routes: () => mockedRouteMiddlewares.snippet,
    },
}));

vi.mock('../../src/routes/dashboard', () => ({
    dashboardRouter: {
        routes: () => mockedRouteMiddlewares.dashboard,
    },
}));

vi.mock('../../src/routes/blog/article-report', () => ({
    articleReportRouter: {
        routes: () => mockedRouteMiddlewares.articleReport,
    },
}));

describe('api router registration', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    let useSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.resetModules();
        useSpy = vi.spyOn(Router.prototype, 'use');
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        useSpy.mockRestore();
    });

    it('does not register email test routes in production', async () => {
        process.env.NODE_ENV = 'production';

        const { createApiRouter } = await import('../../src/routes');
        createApiRouter();

        expect(useSpy).not.toHaveBeenCalledWith(mockedRouteMiddlewares.email);
    });

    it('keeps email test routes in non-production environments', async () => {
        process.env.NODE_ENV = 'development';

        const { createApiRouter } = await import('../../src/routes');
        createApiRouter();

        expect(useSpy).toHaveBeenCalledWith(mockedRouteMiddlewares.email);
    });
});
