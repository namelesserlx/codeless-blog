import { Prisma, prisma } from '@blog/db';
import redis from '../../lib/redis';
import { runWithSpan } from '../../telemetry/tracing';
import { addDays, formatDate, startOfDay } from '../../utils/date';
import type {
    ArticleViewCountRow,
    DailyViewCountRow,
    DateBucket,
    DashboardWindow,
    PendingPostUvSnapshot,
    TrafficModuleData,
} from './types';

const isDateInRange = (date: Date, start: Date, endExclusive: Date): boolean =>
    date >= start && date < endExclusive;

const toInt = (value: number | null | undefined): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    return Math.round(value);
};

const createTimeRange = (start: Date, endExclusive: Date) => ({
    gte: start,
    lt: endExclusive,
});

const parseCompactDateKey = (value: string): Date | null => {
    if (!/^\d{8}$/.test(value)) return null;

    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    return startOfDay(new Date(year, month - 1, day));
};

const getPendingPostUvSnapshot = async (
    trendStart: Date,
    trendEndExclusive: Date,
    postRangeStart: Date,
    postRangeEndExclusive: Date,
): Promise<PendingPostUvSnapshot> => {
    return runWithSpan(
        'dashboard.traffic.pending-uv-scan',
        async () => {
            const byDate = new Map<string, number>();
            const byPostIdInRange = new Map<string, number>();
            let total = 0;

            const scanStream = redis.scanStream({
                match: 'post:*:uv:*',
                count: 100,
            });

            for await (const scanResult of scanStream) {
                const keys = (scanResult as string[]).filter(Boolean);
                if (keys.length === 0) continue;

                const pipeline = redis.pipeline();
                keys.forEach((key) => pipeline.scard(key));
                const countRows = await pipeline.exec();
                if (!countRows) continue;

                keys.forEach((key, index) => {
                    const parts = key.split(':');
                    if (parts.length < 4) return;

                    const postId = parts[1];
                    const viewedAt = parseCompactDateKey(parts[3]);
                    const countRow = countRows[index];
                    const count = typeof countRow?.[1] === 'number' ? countRow[1] : 0;
                    if (count <= 0) return;

                    total += count;

                    if (viewedAt && isDateInRange(viewedAt, trendStart, trendEndExclusive)) {
                        const dateKey = formatDate(viewedAt);
                        byDate.set(dateKey, (byDate.get(dateKey) || 0) + count);
                    }

                    if (
                        viewedAt &&
                        isDateInRange(viewedAt, postRangeStart, postRangeEndExclusive)
                    ) {
                        byPostIdInRange.set(postId, (byPostIdInRange.get(postId) || 0) + count);
                    }
                });
            }

            return {
                total,
                byDate,
                byPostIdInRange,
            };
        },
        {
            'dashboard.traffic.window_days':
                Math.max(
                    1,
                    Math.round((trendEndExclusive.getTime() - trendStart.getTime()) / 86400000),
                ) || 1,
        },
    );
};

const sumPendingViewsInRange = (
    byDate: Map<string, number>,
    start: Date,
    endExclusive: Date,
): number => {
    let total = 0;

    for (let cursor = startOfDay(start); cursor < endExclusive; cursor = addDays(cursor, 1)) {
        total += byDate.get(formatDate(cursor)) || 0;
    }

    return total;
};

const buildTrendPoints = (
    buckets: DateBucket[],
    postRows: DailyViewCountRow[],
    snippetRows: DailyViewCountRow[],
    pendingSnapshot: PendingPostUvSnapshot,
) => {
    const postViewMap = new Map<string, number>();
    const snippetViewMap = new Map<string, number>();

    postRows.forEach((row) => {
        postViewMap.set(formatDate(row.viewedAt), row._count._all);
    });
    snippetRows.forEach((row) => {
        snippetViewMap.set(formatDate(row.viewedAt), row._count._all);
    });

    return buckets.map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        visits:
            (postViewMap.get(bucket.key) || 0) +
            (snippetViewMap.get(bucket.key) || 0) +
            (pendingSnapshot.byDate.get(bucket.key) || 0),
    }));
};

const buildHotArticles = async (
    topArticleViewRows: ArticleViewCountRow[],
    pendingSnapshot: PendingPostUvSnapshot,
) => {
    const articleViewCountMap = new Map<string, number>();

    topArticleViewRows.forEach((row) => {
        articleViewCountMap.set(row.postId, row._count.postId);
    });

    pendingSnapshot.byPostIdInRange.forEach((count, postId) => {
        articleViewCountMap.set(postId, (articleViewCountMap.get(postId) || 0) + count);
    });

    const topArticleIds = Array.from(articleViewCountMap.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([postId]) => postId);

    if (topArticleIds.length > 0) {
        const articleRows = await prisma.post.findMany({
            where: { id: { in: topArticleIds } },
            select: { id: true, title: true },
        });
        const articleTitleMap = new Map<string, string>(
            articleRows.map((row) => [
                row.id,
                typeof row.title === 'string' && row.title.trim() ? row.title : '未命名文章',
            ]),
        );

        return topArticleIds.map((postId) => ({
            id: postId,
            title: articleTitleMap.get(postId) || '未命名文章',
            views: articleViewCountMap.get(postId) || 0,
        }));
    }

    const fallbackPublishedArticles = await prisma.post.findMany({
        where: { published: true },
        select: { id: true, title: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
    });

    const fallbackArticles =
        fallbackPublishedArticles.length > 0
            ? fallbackPublishedArticles
            : await prisma.post.findMany({
                  select: { id: true, title: true },
                  orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
                  take: 5,
              });

    return fallbackArticles.map((article) => ({
        id: article.id,
        title: article.title || '未命名文章',
        views: 0,
    }));
};

export const createEmptyTrafficModule = (buckets: DateBucket[]): TrafficModuleData => ({
    totalViews: 0,
    currentWindowViews: 0,
    previousWindowViews: 0,
    trendPoints: buckets.map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        visits: 0,
    })),
    peakDailyVisits: 0,
    avgReadSeconds: 0,
    hotArticles: [],
});

export const fetchTrafficModule = async (window: DashboardWindow): Promise<TrafficModuleData> => {
    return runWithSpan(
        'dashboard.traffic.fetch',
        async () => {
            const currentPostViewWhere: Prisma.PostViewDailyWhereInput = {
                viewedAt: createTimeRange(window.currentStart, window.currentEnd),
            };
            const previousPostViewWhere: Prisma.PostViewDailyWhereInput = {
                viewedAt: createTimeRange(window.previousStart, window.previousEnd),
            };
            const currentSnippetViewWhere: Prisma.SnippetViewDailyWhereInput = {
                viewedAt: createTimeRange(window.currentStart, window.currentEnd),
            };
            const previousSnippetViewWhere: Prisma.SnippetViewDailyWhereInput = {
                viewedAt: createTimeRange(window.previousStart, window.previousEnd),
            };

            const trafficSummaryPromise = runWithSpan('dashboard.traffic.summary.load', () =>
                prisma.$transaction([
                    prisma.postViewDaily.count(),
                    prisma.snippetViewDaily.count(),
                    prisma.postViewDaily.count({ where: currentPostViewWhere }),
                    prisma.snippetViewDaily.count({ where: currentSnippetViewWhere }),
                    prisma.postViewDaily.count({ where: previousPostViewWhere }),
                    prisma.snippetViewDaily.count({ where: previousSnippetViewWhere }),
                    prisma.postReadTime.aggregate({
                        _sum: { seconds: true },
                        _count: { _all: true },
                    }),
                    prisma.snippetReadTime.aggregate({
                        _sum: { seconds: true },
                        _count: { _all: true },
                    }),
                ]),
            );

            const pendingSnapshotPromise = getPendingPostUvSnapshot(
                window.previousStart,
                window.currentEnd,
                window.currentStart,
                window.currentEnd,
            );
            const trendLoadPromise = runWithSpan('dashboard.traffic.trend.load', async () => {
                const [topArticleViewRows, trendPostRows, trendSnippetRows] = await Promise.all([
                    prisma.postViewDaily.groupBy({
                        by: ['postId'],
                        where: currentPostViewWhere,
                        _count: { postId: true },
                        orderBy: {
                            _count: {
                                postId: 'desc',
                            },
                        },
                    }),
                    prisma.postViewDaily.groupBy({
                        by: ['viewedAt'],
                        where: currentPostViewWhere,
                        _count: { _all: true },
                    }),
                    prisma.snippetViewDaily.groupBy({
                        by: ['viewedAt'],
                        where: currentSnippetViewWhere,
                        _count: { _all: true },
                    }),
                ]);

                return {
                    topArticleViewRows,
                    trendPostRows,
                    trendSnippetRows,
                };
            });

            const [
                [
                    totalPostViews,
                    totalSnippetViews,
                    currentPostViews,
                    currentSnippetViews,
                    previousPostViews,
                    previousSnippetViews,
                    avgPostRead,
                    avgSnippetRead,
                ],
                pendingSnapshot,
                { topArticleViewRows, trendPostRows, trendSnippetRows },
            ] = await Promise.all([
                trafficSummaryPromise,
                pendingSnapshotPromise,
                trendLoadPromise,
            ]);

            const currentPendingViews = sumPendingViewsInRange(
                pendingSnapshot.byDate,
                window.currentStart,
                window.currentEnd,
            );
            const previousPendingViews = sumPendingViewsInRange(
                pendingSnapshot.byDate,
                window.previousStart,
                window.previousEnd,
            );

            const trendPoints = buildTrendPoints(
                window.buckets,
                trendPostRows as DailyViewCountRow[],
                trendSnippetRows as DailyViewCountRow[],
                pendingSnapshot,
            );
            const peakDailyVisits = trendPoints.reduce(
                (max, item) => Math.max(max, item.visits),
                0,
            );
            const totalReadSeconds =
                toInt(avgPostRead._sum.seconds) + toInt(avgSnippetRead._sum.seconds);
            const totalReadActors =
                toInt(avgPostRead._count._all) + toInt(avgSnippetRead._count._all);
            const avgReadSeconds =
                totalReadActors > 0 ? Math.round(totalReadSeconds / totalReadActors) : 0;
            const hotArticles = await runWithSpan(
                'dashboard.traffic.hot-articles.build',
                () =>
                    buildHotArticles(topArticleViewRows as ArticleViewCountRow[], pendingSnapshot),
                {
                    'dashboard.traffic.bucket_count': window.buckets.length,
                },
            );

            return {
                totalViews: totalPostViews + totalSnippetViews + pendingSnapshot.total,
                currentWindowViews: currentPostViews + currentSnippetViews + currentPendingViews,
                previousWindowViews:
                    previousPostViews + previousSnippetViews + previousPendingViews,
                trendPoints,
                peakDailyVisits,
                avgReadSeconds,
                hotArticles,
            };
        },
        {
            'dashboard.traffic.bucket_count': window.buckets.length,
        },
    );
};
