import { CommentStatus, prisma } from '@blog/db';
import type { ContentModuleData, DashboardWindow } from './types';

const createTimeRange = (start: Date, endExclusive: Date) => ({
    gte: start,
    lt: endExclusive,
});

export const createEmptyContentModule = (): ContentModuleData => ({
    article: {
        total: 0,
        published: 0,
        draft: 0,
        currentNew: 0,
        previousNew: 0,
    },
    snippet: {
        total: 0,
        published: 0,
        draft: 0,
        currentNew: 0,
        previousNew: 0,
    },
    comment: {
        total: 0,
        pending: 0,
        currentNew: 0,
        previousNew: 0,
    },
});

export const fetchContentModule = async (window: DashboardWindow): Promise<ContentModuleData> => {
    const currentCreatedAt = createTimeRange(window.currentStart, window.currentEnd);
    const previousCreatedAt = createTimeRange(window.previousStart, window.previousEnd);

    const [
        articleTotal,
        articlePublished,
        articleDraft,
        currentArticleNew,
        previousArticleNew,
        snippetTotal,
        snippetPublished,
        snippetDraft,
        currentSnippetNew,
        previousSnippetNew,
        commentTotal,
        commentPending,
        currentCommentNew,
        previousCommentNew,
    ] = await prisma.$transaction([
        prisma.post.count(),
        prisma.post.count({ where: { published: true } }),
        prisma.post.count({ where: { isDraft: true } }),
        prisma.post.count({ where: { createdAt: currentCreatedAt } }),
        prisma.post.count({ where: { createdAt: previousCreatedAt } }),
        prisma.snippet.count(),
        prisma.snippet.count({ where: { published: true } }),
        prisma.snippet.count({ where: { isDraft: true } }),
        prisma.snippet.count({ where: { createdAt: currentCreatedAt } }),
        prisma.snippet.count({ where: { createdAt: previousCreatedAt } }),
        prisma.comment.count(),
        prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
        prisma.comment.count({ where: { createdAt: currentCreatedAt } }),
        prisma.comment.count({ where: { createdAt: previousCreatedAt } }),
    ]);

    return {
        article: {
            total: articleTotal,
            published: articlePublished,
            draft: articleDraft,
            currentNew: currentArticleNew,
            previousNew: previousArticleNew,
        },
        snippet: {
            total: snippetTotal,
            published: snippetPublished,
            draft: snippetDraft,
            currentNew: currentSnippetNew,
            previousNew: previousSnippetNew,
        },
        comment: {
            total: commentTotal,
            pending: commentPending,
            currentNew: currentCommentNew,
            previousNew: previousCommentNew,
        },
    };
};
