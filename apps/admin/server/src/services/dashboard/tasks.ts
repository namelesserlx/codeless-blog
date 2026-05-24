import { CommentStatus, prisma } from '@blog/db';
import { DashboardTaskType, type DashboardTaskItem } from '@blog/shared';
import { formatMonthDayTime } from '../../utils/date';
import type { PendingArticleTaskRow, PendingCommentTaskRow, PendingSnippetTaskRow } from './types';

const getHoursSince = (date: Date): number => {
    return (Date.now() - date.getTime()) / 3_600_000;
};

const getDraftPriority = (updatedAt: Date): '高' | '中' | '低' => {
    const hours = getHoursSince(updatedAt);

    if (hours >= 24 * 30) return '高';
    if (hours >= 24 * 14) return '中';
    return '低';
};

const getCommentPriority = (createdAt: Date): '高' | '中' | '低' => {
    const hours = getHoursSince(createdAt);

    if (hours >= 72) return '高';
    if (hours >= 24) return '中';
    return '低';
};

const priorityWeight: Record<'高' | '中' | '低', number> = {
    高: 3,
    中: 2,
    低: 1,
};

const trimTaskText = (value: string | null | undefined, fallback: string): string => {
    if (!value) return fallback;

    const text = value.replace(/\s+/g, ' ').trim();
    if (!text) return fallback;

    return text.length > 26 ? `${text.slice(0, 26)}...` : text;
};

const buildPendingTasks = (
    pendingCommentRows: PendingCommentTaskRow[],
    pendingArticleRows: PendingArticleTaskRow[],
    pendingSnippetRows: PendingSnippetTaskRow[],
): DashboardTaskItem[] => {
    return [
        ...pendingCommentRows.map((comment) => ({
            id: `task-comment-review-${comment.id}`,
            targetId: String(comment.id),
            title: trimTaskText(comment.content, `待审核评论 #${comment.id}`),
            type: DashboardTaskType.COMMENT_REVIEW,
            description: `${
                comment.post?.title
                    ? `文章《${comment.post.title}》`
                    : comment.snippet?.title
                      ? `片段《${comment.snippet.title}》`
                      : '独立评论'
            } · 提交于 ${formatMonthDayTime(comment.createdAt)}`,
            priority: getCommentPriority(comment.createdAt),
        })),
        ...pendingArticleRows.map((article) => ({
            id: `task-article-draft-${article.id}`,
            targetId: article.id,
            title: trimTaskText(article.title, '未命名文章'),
            type: DashboardTaskType.ARTICLE_DRAFT_PUBLISH,
            description: `文章草稿 · 最近更新 ${formatMonthDayTime(article.updatedAt)}`,
            priority: getDraftPriority(article.updatedAt),
        })),
        ...pendingSnippetRows.map((snippet) => ({
            id: `task-snippet-draft-${snippet.id}`,
            targetId: snippet.id,
            title: trimTaskText(snippet.title || snippet.content, '未命名片段'),
            type: DashboardTaskType.SNIPPET_DRAFT_PUBLISH,
            description: `片段草稿 · 最近更新 ${formatMonthDayTime(snippet.updatedAt)}`,
            priority: getDraftPriority(snippet.updatedAt),
        })),
    ].sort((left, right) => priorityWeight[right.priority] - priorityWeight[left.priority]);
};

export const fetchPendingTasksModule = async (): Promise<DashboardTaskItem[]> => {
    const [pendingCommentRows, pendingArticleRows, pendingSnippetRows] = await prisma.$transaction([
        prisma.comment.findMany({
            where: {
                status: CommentStatus.PENDING,
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                post: {
                    select: {
                        title: true,
                    },
                },
                snippet: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
            take: 20,
        }),
        prisma.post.findMany({
            where: {
                isDraft: true,
            },
            select: {
                id: true,
                title: true,
                updatedAt: true,
            },
            orderBy: {
                updatedAt: 'asc',
            },
            take: 20,
        }),
        prisma.snippet.findMany({
            where: {
                isDraft: true,
            },
            select: {
                id: true,
                title: true,
                content: true,
                updatedAt: true,
            },
            orderBy: {
                updatedAt: 'asc',
            },
            take: 20,
        }),
    ]);

    return buildPendingTasks(
        pendingCommentRows as PendingCommentTaskRow[],
        pendingArticleRows as PendingArticleTaskRow[],
        pendingSnippetRows as PendingSnippetTaskRow[],
    );
};
