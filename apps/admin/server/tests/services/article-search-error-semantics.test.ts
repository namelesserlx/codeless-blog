import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedModules = vi.hoisted(() => ({
    getArticlesSearchIndex: vi.fn(),
}));

vi.mock('@blog/db', () => ({
    prisma: {
        post: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

vi.mock('../../src/lib/meilisearch', () => ({
    getArticlesSearchIndex: mockedModules.getArticlesSearchIndex,
}));

import { articleSearchService } from '../../src/services/search/article';

describe('article search service error semantics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps search configuration failures to a semantic 500 business error', async () => {
        mockedModules.getArticlesSearchIndex.mockImplementation(() => {
            throw new Error('[config/meilisearch] config broken');
        });

        await expect(articleSearchService.search('hello')).rejects.toMatchObject({
            name: 'BusinessError',
            code: 'UNKNOWN_ERROR',
            statusCode: 500,
            message: '搜索服务未配置',
        });
    });
});
