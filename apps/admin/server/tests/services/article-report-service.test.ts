import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedRepository = vi.hoisted(() => ({
    loadFilterOptions: vi.fn(),
    loadMetrics: vi.fn(),
    loadPosts: vi.fn(),
}));

vi.mock('../../src/services/blog/article-report/repository', () => ({
    loadFilterOptions: mockedRepository.loadFilterOptions,
    loadMetrics: mockedRepository.loadMetrics,
    loadPosts: mockedRepository.loadPosts,
}));

import { ArticleReportService } from '../../src/services/blog/article-report';

const createMetricMaps = () => ({
    current: new Map<string, number>(),
    previous: new Map<string, number>(),
    trend: new Map<string, Map<string, number>>(),
});

const createMetricsSnapshot = () => ({
    viewMetrics: createMetricMaps(),
    commentMetrics: createMetricMaps(),
    likeMetrics: createMetricMaps(),
    currentLikeCountByPost: new Map<string, number>(),
});

const posts = [
    {
        id: 'post-a',
        title: '文章 A',
        summary: '文章 A 摘要',
        published: true,
        isDraft: false,
        createdAt: new Date('2026-04-01T08:00:00'),
        updatedAt: new Date('2026-05-01T09:30:00'),
        authorId: 1,
        author: {
            username: 'alice',
            nickname: 'Alice',
        },
        tags: [{ id: 10, name: 'React' }],
    },
    {
        id: 'post-b',
        title: '文章 B',
        summary: '文章 B 摘要',
        published: true,
        isDraft: false,
        createdAt: new Date('2026-04-02T08:00:00'),
        updatedAt: new Date('2026-05-02T09:30:00'),
        authorId: 2,
        author: {
            username: 'bob',
            nickname: null,
        },
        tags: [{ id: 20, name: 'Node' }],
    },
];

describe('article report service', () => {
    const service = new ArticleReportService();

    beforeEach(() => {
        vi.clearAllMocks();
        mockedRepository.loadFilterOptions.mockResolvedValue({
            authors: [
                { label: 'Alice', value: '1' },
                { label: 'bob', value: '2' },
            ],
            tags: [
                { label: 'React', value: '10' },
                { label: 'Node', value: '20' },
            ],
        });
    });

    it('returns article list batches without per-article trend payloads', async () => {
        const metrics = createMetricsSnapshot();
        metrics.viewMetrics.current.set('post-a', 120);
        metrics.viewMetrics.current.set('post-b', 80);
        metrics.viewMetrics.previous.set('post-a', 100);
        metrics.viewMetrics.previous.set('post-b', 90);
        metrics.commentMetrics.current.set('post-a', 12);
        metrics.commentMetrics.current.set('post-b', 8);
        metrics.currentLikeCountByPost.set('post-a', 30);
        metrics.currentLikeCountByPost.set('post-b', 20);

        mockedRepository.loadPosts.mockResolvedValue(posts);
        mockedRepository.loadMetrics.mockResolvedValue(metrics);

        const result = await service.getArticleList({
            startDate: '2026-05-01',
            endDate: '2026-05-02',
            limit: 1,
        });

        expect(result.articles).toHaveLength(1);
        expect(result.articles[0]).toMatchObject({
            id: 'post-a',
            current: {
                uv: 120,
                comments: 12,
            },
            previous: {
                uv: 100,
            },
        });
        expect(result.articles[0]).not.toHaveProperty('trend');
        expect(result.pageInfo).toEqual({
            limit: 1,
            total: 2,
            nextCursor: '1',
            hasMore: true,
        });
        expect(mockedRepository.loadMetrics).toHaveBeenCalledWith(
            ['post-a', 'post-b'],
            expect.any(Object),
            { includeTrend: false },
        );
    });

    it('loads a single article trend on demand', async () => {
        const metrics = createMetricsSnapshot();
        metrics.viewMetrics.trend.set(
            'post-a',
            new Map([
                ['2026-05-01', 5],
                ['2026-05-02', 9],
            ]),
        );
        metrics.commentMetrics.trend.set('post-a', new Map([['2026-05-02', 2]]));
        metrics.likeMetrics.trend.set('post-a', new Map([['2026-05-01', 1]]));

        mockedRepository.loadPosts.mockResolvedValue([posts[0]]);
        mockedRepository.loadMetrics.mockResolvedValue(metrics);

        const result = await service.getArticleTrend('post-a', {
            startDate: '2026-05-01',
            endDate: '2026-05-02',
        });

        expect(result.articleId).toBe('post-a');
        expect(result.trend).toEqual([
            {
                date: '2026-05-01',
                label: '5/1',
                uv: 5,
                comments: 0,
                likeAdds: 1,
            },
            {
                date: '2026-05-02',
                label: '5/2',
                uv: 9,
                comments: 2,
                likeAdds: 0,
            },
        ]);
        expect(mockedRepository.loadPosts).toHaveBeenCalledWith(
            expect.objectContaining({
                AND: expect.arrayContaining([{ id: 'post-a' }]),
            }),
        );
        expect(mockedRepository.loadMetrics).toHaveBeenCalledWith(['post-a'], expect.any(Object), {
            includeTrend: true,
        });
    });
});
