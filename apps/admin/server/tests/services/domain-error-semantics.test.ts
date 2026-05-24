import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@blog/db', () => ({
    prisma: {
        post: {
            findUnique: vi.fn(),
        },
        snippet: {
            findUnique: vi.fn(),
        },
        comment: {
            findUnique: vi.fn(),
        },
    },
}));

import { prisma } from '@blog/db';
import { articleService } from '../../src/services/blog/article';
import { commentService } from '../../src/services/blog/comment';
import { snippetService } from '../../src/services/blog/snippet';

describe('domain error semantics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps missing article detail to a not found error', async () => {
        vi.mocked(prisma.post.findUnique).mockResolvedValue(null);

        await expect(articleService.getArticleDetail('missing')).rejects.toMatchObject({
            name: 'NotFoundError',
            code: 'RESOURCE_NOT_FOUND',
            statusCode: 404,
            message: '文章不存在',
        });
    });

    it('maps missing snippet update target to a not found error', async () => {
        vi.mocked(prisma.snippet.findUnique).mockResolvedValue(null);

        await expect(
            snippetService.updateSnippet({
                id: 'snippet-1',
                title: 'title',
                content: 'content',
                images: [],
                video: [],
            }),
        ).rejects.toMatchObject({
            name: 'NotFoundError',
            code: 'RESOURCE_NOT_FOUND',
            statusCode: 404,
            message: '片段不存在',
        });
    });

    it('maps editing another users comment to a permission error', async () => {
        vi.mocked(prisma.comment.findUnique).mockResolvedValue({
            id: 1,
            authorId: 100,
        } as never);

        await expect(
            commentService.editComment({
                id: 1,
                content: 'updated content',
                authorId: 200,
            }),
        ).rejects.toMatchObject({
            name: 'PermissionError',
            code: 'PERMISSION_DENIED',
            statusCode: 403,
            message: '无权修改他人评论',
        });
    });
});
