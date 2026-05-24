import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler';

const mockedModules = vi.hoisted(() => ({
    permissionCacheService: {
        hasPermission: vi.fn(),
        getUserPermissions: vi.fn(),
    },
    permissionService: {
        createPermission: vi.fn(),
    },
    roleService: {
        createRole: vi.fn(),
    },
    articleService: {
        getArticleList: vi.fn(),
    },
    articleSearchService: {
        reindexAll: vi.fn(),
    },
    dashboardService: {
        getOverview: vi.fn(),
    },
    commentService: {
        getCommentsPage: vi.fn(),
        editComment: vi.fn(),
        moderateComment: vi.fn(),
        updateComment: vi.fn(),
    },
}));

vi.mock('../../src/utils/auth', () => ({
    PermissionCacheService: mockedModules.permissionCacheService,
}));

vi.mock('../../src/services/system/permission', () => ({
    permissionService: mockedModules.permissionService,
}));

vi.mock('../../src/services/system/role', () => ({
    roleService: mockedModules.roleService,
}));

vi.mock('../../src/services/blog/article', () => ({
    articleService: mockedModules.articleService,
}));

vi.mock('../../src/services/search/article', () => ({
    articleSearchService: mockedModules.articleSearchService,
}));

vi.mock('../../src/services/dashboard', () => ({
    dashboardService: mockedModules.dashboardService,
}));

vi.mock('../../src/services/blog/comment', () => ({
    commentService: mockedModules.commentService,
}));

import { permissionController } from '../../src/controllers/system/permission';
import { roleController } from '../../src/controllers/system/role';
import { articleController } from '../../src/controllers/blog/article';
import { dashboardController } from '../../src/controllers/dashboard';
import { commentController } from '../../src/controllers/blog/comment';

const createMockContext = ({
    body = {},
    query = {},
    userId = 1,
}: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    userId?: number;
} = {}): Context => {
    return {
        request: {
            body,
            header: {},
        },
        query,
        state: {
            user: {
                id: userId,
            },
        },
        status: undefined,
        body: undefined,
        get: () => '',
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

describe('admin permission guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedModules.permissionCacheService.hasPermission.mockResolvedValue(false);
        mockedModules.permissionCacheService.getUserPermissions.mockResolvedValue([]);
        mockedModules.permissionService.createPermission.mockResolvedValue({ id: 1 });
        mockedModules.roleService.createRole.mockResolvedValue({ id: 1 });
        mockedModules.articleSearchService.reindexAll.mockResolvedValue(undefined);
        mockedModules.dashboardService.getOverview.mockResolvedValue({ totalUsers: 0 });
        mockedModules.commentService.getCommentsPage.mockResolvedValue({
            list: [],
            total: 0,
            page: 1,
            pageSize: 10,
        });
        mockedModules.commentService.editComment.mockResolvedValue({ id: 1 });
        mockedModules.commentService.moderateComment.mockResolvedValue({ id: 1 });
        mockedModules.commentService.updateComment.mockResolvedValue({ id: 1 });
    });

    it('blocks permission creation when the current user lacks permission management access', async () => {
        const ctx = createMockContext({
            body: {
                name: '新增权限',
                code: 'permission:create',
                type: 'BUTTON',
            },
        });

        await runWithGlobalErrorHandler(
            ctx,
            permissionController.createPermission.bind(permissionController),
        );

        expect(ctx.status).toBe(403);
        expect(mockedModules.permissionService.createPermission).not.toHaveBeenCalled();
    });

    it('blocks role creation when the current user lacks role creation permission', async () => {
        const ctx = createMockContext({
            body: {
                name: '运营',
                code: 'ops',
            },
        });

        await runWithGlobalErrorHandler(ctx, roleController.createRole.bind(roleController));

        expect(ctx.status).toBe(403);
        expect(mockedModules.roleService.createRole).not.toHaveBeenCalled();
    });

    it('blocks article search reindex when the current user lacks content permission', async () => {
        const ctx = createMockContext();

        await runWithGlobalErrorHandler(
            ctx,
            articleController.reindexSearch.bind(articleController),
        );

        expect(ctx.status).toBe(403);
        expect(mockedModules.articleSearchService.reindexAll).not.toHaveBeenCalled();
    });

    it('blocks dashboard overview when the current user lacks dashboard permission', async () => {
        const ctx = createMockContext();

        await runWithGlobalErrorHandler(
            ctx,
            dashboardController.getOverview.bind(dashboardController),
        );

        expect(ctx.status).toBe(403);
        expect(mockedModules.dashboardService.getOverview).not.toHaveBeenCalled();
    });

    it('blocks comment moderation attempts from users without content permission', async () => {
        const ctx = createMockContext({
            body: {
                id: 1,
                status: 'PUBLISHED',
            },
        });

        await runWithGlobalErrorHandler(
            ctx,
            commentController.updateComment.bind(commentController),
        );

        expect(ctx.status).toBe(403);
        expect(mockedModules.commentService.moderateComment).not.toHaveBeenCalled();
    });

    it('surfaces permission infrastructure failures as 500 instead of disguising them as 403', async () => {
        mockedModules.permissionCacheService.hasPermission.mockRejectedValueOnce(
            new Error('redis unavailable'),
        );

        const ctx = createMockContext();

        await runWithGlobalErrorHandler(
            ctx,
            articleController.reindexSearch.bind(articleController),
        );

        expect(ctx.status).toBe(500);
        expect(ctx.body).toMatchObject({
            code: 500,
            message: '权限数据加载失败',
        });
        expect(mockedModules.articleSearchService.reindexAll).not.toHaveBeenCalled();
    });
});
