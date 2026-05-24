import { nanoid } from 'nanoid';
import type { ArticleDetailResponse } from '@blog/shared';
import redis from '../../../lib/redis';

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const PREVIEW_TTL_SECONDS = PREVIEW_TTL_MS / 1000;
const PREVIEW_KEY_PREFIX = 'article-preview';

function getPreviewKey(token: string) {
    return `${PREVIEW_KEY_PREFIX}:${token}`;
}

export async function createArticlePreviewSession(article: ArticleDetailResponse) {
    const token = nanoid(32);
    const expiresAt = Date.now() + PREVIEW_TTL_MS;

    await redis.setex(getPreviewKey(token), PREVIEW_TTL_SECONDS, JSON.stringify(article));

    return {
        token,
        expiresAt: new Date(expiresAt).toISOString(),
    };
}

export async function getArticlePreviewSession(token: string) {
    const preview = await redis.get(getPreviewKey(token));
    if (!preview) {
        return null;
    }

    try {
        return JSON.parse(preview) as ArticleDetailResponse;
    } catch {
        await redis.del(getPreviewKey(token));
        return null;
    }
}
