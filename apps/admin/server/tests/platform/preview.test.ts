import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDetailResponse } from '@blog/shared';
import redis from '../../src/lib/redis';
import {
    createArticlePreviewSession,
    getArticlePreviewSession,
} from '../../src/services/blog/article/preview';

vi.mock('nanoid', () => ({
    nanoid: vi.fn(() => 'preview-token'),
}));

vi.mock('../../src/lib/redis', () => ({
    default: {
        setex: vi.fn(),
        get: vi.fn(),
        del: vi.fn(),
    },
}));

const articleFixture = {
    id: 'article-1',
    title: 'Preview Article',
    content: 'preview-content',
} as unknown as ArticleDetailResponse;

describe('preview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('stores article previews in redis with an expiry', async () => {
        const result = await createArticlePreviewSession(articleFixture);

        expect(result.token).toBe('preview-token');
        expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
        expect(redis.setex).toHaveBeenCalledWith(
            'article-preview:preview-token',
            600,
            JSON.stringify(articleFixture),
        );
    });

    it('reads preview payloads from redis instead of in-memory state', async () => {
        vi.mocked(redis.get).mockResolvedValue(JSON.stringify(articleFixture));

        const result = await getArticlePreviewSession('preview-token');

        expect(redis.get).toHaveBeenCalledWith('article-preview:preview-token');
        expect(result).toEqual(articleFixture);
    });
});
