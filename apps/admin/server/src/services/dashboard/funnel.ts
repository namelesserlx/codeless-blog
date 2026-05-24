import { Prisma, prisma } from '@blog/db';
import type { DashboardFunnelStage } from '@blog/shared';
import type { ContentModuleData, FunnelModuleData } from './types';

const FUNNEL_STAGE_COLORS: Record<DashboardFunnelStage['key'], string> = {
    draft: '#bfdbfe',
    review: '#93c5fd',
    ready: '#60a5fa',
    published: '#3b82f6',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toHours = (milliseconds: number): number => {
    return Number((milliseconds / 3_600_000).toFixed(1));
};

const sampleAverageStayHours = async (
    postWhere: Prisma.PostWhereInput,
    snippetWhere: Prisma.SnippetWhereInput,
): Promise<number> => {
    const [postRows, snippetRows] = await prisma.$transaction([
        prisma.post.findMany({
            where: postWhere,
            select: { updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 100,
        }),
        prisma.snippet.findMany({
            where: snippetWhere,
            select: { updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 100,
        }),
    ]);

    const rows = [...postRows, ...snippetRows];
    if (rows.length === 0) return 0;

    const now = Date.now();
    const totalHours = rows.reduce((sum, row) => sum + toHours(now - row.updatedAt.getTime()), 0);
    return Number((totalHours / rows.length).toFixed(1));
};

export const EMPTY_FUNNEL_MODULE: FunnelModuleData = {
    reviewCount: 0,
    readyCount: 0,
    draftAvgStay: 0,
    reviewAvgStay: 0,
    readyAvgStay: 0,
    publishedAvgStay: 0,
};

export const fetchFunnelModule = async (reviewSplitDate: Date): Promise<FunnelModuleData> => {
    const reviewPostWhere: Prisma.PostWhereInput = {
        isDraft: false,
        published: false,
        updatedAt: { lte: reviewSplitDate },
    };
    const reviewSnippetWhere: Prisma.SnippetWhereInput = {
        isDraft: false,
        published: false,
        updatedAt: { lte: reviewSplitDate },
    };
    const readyPostWhere: Prisma.PostWhereInput = {
        isDraft: false,
        published: false,
        updatedAt: { gt: reviewSplitDate },
    };
    const readySnippetWhere: Prisma.SnippetWhereInput = {
        isDraft: false,
        published: false,
        updatedAt: { gt: reviewSplitDate },
    };

    const reviewAndReadyPromise = prisma.$transaction([
        prisma.post.count({ where: reviewPostWhere }),
        prisma.snippet.count({ where: reviewSnippetWhere }),
        prisma.post.count({ where: readyPostWhere }),
        prisma.snippet.count({ where: readySnippetWhere }),
    ]);

    const averageStayPromise = Promise.all([
        sampleAverageStayHours({ isDraft: true }, { isDraft: true }),
        sampleAverageStayHours(reviewPostWhere, reviewSnippetWhere),
        sampleAverageStayHours(readyPostWhere, readySnippetWhere),
        sampleAverageStayHours({ published: true }, { published: true }),
    ]);

    const [
        [reviewPostCount, reviewSnippetCount, readyPostCount, readySnippetCount],
        [draftAvgStay, reviewAvgStay, readyAvgStay, publishedAvgStay],
    ] = await Promise.all([reviewAndReadyPromise, averageStayPromise]);

    return {
        reviewCount: reviewPostCount + reviewSnippetCount,
        readyCount: readyPostCount + readySnippetCount,
        draftAvgStay,
        reviewAvgStay,
        readyAvgStay,
        publishedAvgStay,
    };
};

export const buildFunnelStages = (
    content: ContentModuleData,
    funnel: FunnelModuleData,
): DashboardFunnelStage[] => {
    const draftCount = content.article.draft + content.snippet.draft;
    const publishedCount = content.article.published + content.snippet.published;
    const reviewConversion =
        draftCount === 0 ? 0 : Math.round((funnel.reviewCount / draftCount) * 100);
    const readyConversion =
        funnel.reviewCount === 0 ? 0 : Math.round((funnel.readyCount / funnel.reviewCount) * 100);
    const publishedConversion =
        funnel.readyCount === 0 ? 0 : Math.round((publishedCount / funnel.readyCount) * 100);

    return [
        {
            key: 'draft',
            step: '草稿',
            count: draftCount,
            conversionRate: 100,
            avgStayHours: funnel.draftAvgStay,
            color: FUNNEL_STAGE_COLORS.draft,
        },
        {
            key: 'review',
            step: '待审核',
            count: funnel.reviewCount,
            conversionRate: clamp(reviewConversion, 0, 100),
            avgStayHours: funnel.reviewAvgStay,
            color: FUNNEL_STAGE_COLORS.review,
        },
        {
            key: 'ready',
            step: '待发布',
            count: funnel.readyCount,
            conversionRate: clamp(readyConversion, 0, 100),
            avgStayHours: funnel.readyAvgStay,
            color: FUNNEL_STAGE_COLORS.ready,
        },
        {
            key: 'published',
            step: '已发布',
            count: publishedCount,
            conversionRate: clamp(publishedConversion, 0, 100),
            avgStayHours: funnel.publishedAvgStay,
            color: FUNNEL_STAGE_COLORS.published,
        },
    ];
};
