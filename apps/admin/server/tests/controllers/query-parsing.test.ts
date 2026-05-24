import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedModules = vi.hoisted(() => ({
    permissionCacheService: {
        hasPermission: vi.fn(),
        getUserPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
    },
    articleService: {
        getArticleList: vi.fn(),
    },
    snippetService: {
        getSnippetList: vi.fn(),
    },
}));

vi.mock('../../src/utils/auth', () => ({
    PermissionCacheService: mockedModules.permissionCacheService,
}));

vi.mock('../../src/services/blog/article', () => ({
    articleService: mockedModules.articleService,
}));

vi.mock('../../src/services/blog/snippet', () => ({
    snippetService: mockedModules.snippetService,
}));
vi.mock('../../src/services/search/article', () => ({
    articleSearchService: {
        reindexAll: vi.fn(),
    },
}));

import { articleController } from '../../src/controllers/blog/article';
import { snippetController } from '../../src/controllers/blog/snippet';

const createMockContext = ({
    query = {},
}: {
    query?: Record<string, unknown>;
} = {}): Context =>
    ({
        method: 'GET',
        url: '/api/blog/articles/list',
        ip: '127.0.0.1',
        query,
        request: {
            body: {},
            header: {},
        },
        state: {
            user: {
                id: 1,
            },
        },
        get: () => '',
        body: undefined,
    }) as unknown as Context;

describe('query parsing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedModules.permissionCacheService.hasPermission.mockResolvedValue(true);
        mockedModules.permissionCacheService.hasAnyPermission.mockResolvedValue(true);
        mockedModules.permissionCacheService.getUserPermissions.mockResolvedValue(['content']);
        mockedModules.articleService.getArticleList.mockResolvedValue({
            list: [],
            total: 0,
            page: 1,
            pageSize: 10,
        });
        mockedModules.snippetService.getSnippetList.mockResolvedValue({
            list: [],
            total: 0,
            page: 1,
            pageSize: 10,
        });
    });

    it('parses false-like article query booleans as false instead of true', async () => {
        const ctx = createMockContext({
            query: {
                published: 'false',
                isDraft: 'false',
            },
        });

        await articleController.getArticleList(ctx);

        expect(mockedModules.articleService.getArticleList).toHaveBeenCalledWith(
            expect.objectContaining({
                published: false,
                isDraft: false,
            }),
        );
    });

    it('parses false-like snippet query booleans as false instead of true', async () => {
        const ctx = createMockContext({
            query: {
                published: 'false',
                isDraft: 'false',
            },
        });
        ctx.url = '/api/blog/snippets/list';

        await snippetController.getSnippetList(ctx);

        expect(mockedModules.snippetService.getSnippetList).toHaveBeenCalledWith(
            expect.objectContaining({
                published: false,
                isDraft: false,
            }),
        );
    });
});
