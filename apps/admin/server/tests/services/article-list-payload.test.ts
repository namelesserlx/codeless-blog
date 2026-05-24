import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@blog/db', () => ({
    prisma: {
        post: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
    },
}));

vi.mock('../../src/utils/deepseek', () => ({
    default: {
        generateSummary: vi.fn(),
    },
}));

vi.mock('../../src/services/search/article', () => ({
    articleSearchService: {
        indexArticle: vi.fn(),
        deleteArticle: vi.fn(),
        deleteArticles: vi.fn(),
        indexArticles: vi.fn(),
        reindexAll: vi.fn(),
    },
}));

vi.mock('../../src/services/blog/article/preview', () => ({
    createArticlePreviewSession: vi.fn(),
    getArticlePreviewSession: vi.fn(),
}));

vi.mock('../../src/lib/redis', () => ({
    default: {
        setex: vi.fn(),
        get: vi.fn(),
        del: vi.fn(),
    },
}));

import { prisma } from '@blog/db';
import { articleService } from '../../src/services/blog/article';

describe('article list payload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not fetch full article content for list responses', async () => {
        vi.mocked(prisma.post.findMany).mockResolvedValue([
            {
                id: 'article-1',
                title: 'Article 1',
                summary: 'Summary',
                published: true,
                isDraft: false,
                allowComments: true,
                cardType: 'LARGE_IMAGE',
                cardImageUrl: null,
                authorId: 1,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                author: {
                    id: 1,
                    username: 'admin',
                    nickname: 'Admin',
                    email: 'admin@example.com',
                    avatar: null,
                },
                tags: [{ id: 1, name: 'Next.js' }],
            },
        ] as never);
        vi.mocked(prisma.post.count).mockResolvedValue(1);

        const result = await articleService.getArticleList({ page: 1, pageSize: 10 });
        const query = vi.mocked(prisma.post.findMany).mock.calls[0]?.[0] as {
            select?: Record<string, unknown>;
            include?: unknown;
        };

        expect(query).toHaveProperty('select');
        expect(query).not.toHaveProperty('include');
        expect(query.select).not.toHaveProperty('content');
        expect(result.list[0]).not.toHaveProperty('content');
    });
});
