import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mockPostCount = vi.fn();
const mockPostViewDailyCount = vi.fn();
const mockPostLikeCount = vi.fn();
const mockGetRedisClient = vi.fn();

vi.mock('@blog/db', () => ({
    prisma: {
        post: {
            count: mockPostCount,
        },
        postViewDaily: {
            count: mockPostViewDailyCount,
        },
        postLike: {
            count: mockPostLikeCount,
        },
    },
}));

vi.mock('@/lib/server/redis', () => ({
    getRedisClient: mockGetRedisClient,
}));

describe('getHomeStats', () => {
    beforeEach(() => {
        vi.resetModules();
        mockPostCount.mockReset();
        mockPostViewDailyCount.mockReset();
        mockPostLikeCount.mockReset();
        mockGetRedisClient.mockReset();
        mockGetRedisClient.mockReturnValue({
            scan: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
            pipeline: vi.fn(),
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns remaining stats when one database counter fails', async () => {
        mockPostCount.mockResolvedValue(8);
        mockPostViewDailyCount.mockRejectedValue(new Error('Unable to start a transaction'));
        mockPostLikeCount.mockResolvedValue(3);

        const { getHomeStats } = await import('../../lib/server/db');

        await expect(getHomeStats()).resolves.toEqual({
            articleCount: 8,
            viewCount: 0,
            likeCount: 3,
        });
    });
});
