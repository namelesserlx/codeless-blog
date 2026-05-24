import { CommentStatus, Prisma, prisma } from '@blog/db';
import type { ArticleReportOption } from '@blog/shared';
import redis from '../../../lib/redis';
import { runWithSpan } from '../../../telemetry/tracing';
import { formatDate } from '../../../utils/date';

export type NumberMap = Map<string, number>;
type PostDateCountMap = Map<string, NumberMap>;

type ArticleMetricMaps = {
    current: NumberMap;
    previous: NumberMap;
    trend: PostDateCountMap;
};

type MetricWindow = {
    previousStart: Date;
    currentEnd: Date;
    currentKeys: Set<string>;
    previousKeys: Set<string>;
};

type LoadMetricsOptions = {
    includeTrend?: boolean;
};

const articleReportPostSelect = {
    id: true,
    title: true,
    summary: true,
    published: true,
    isDraft: true,
    createdAt: true,
    updatedAt: true,
    authorId: true,
    author: {
        select: {
            username: true,
            nickname: true,
        },
    },
    tags: {
        select: {
            id: true,
            name: true,
        },
    },
} satisfies Prisma.PostSelect;

export type ArticleReportPostRow = Prisma.PostGetPayload<{
    select: typeof articleReportPostSelect;
}>;

interface SqlDailyCountRow {
    postId: string;
    dateKey: string;
    total: bigint | number | string;
}

interface GroupCountRow {
    postId: string;
    _count: {
        _all: number;
    };
}

export interface ArticleReportMetricsSnapshot {
    viewMetrics: ArticleMetricMaps;
    commentMetrics: ArticleMetricMaps;
    likeMetrics: ArticleMetricMaps;
    currentLikeCountByPost: NumberMap;
}

const createMetricMaps = (): ArticleMetricMaps => ({
    current: new Map(),
    previous: new Map(),
    trend: new Map(),
});

const createEmptyMetricsSnapshot = (): ArticleReportMetricsSnapshot => ({
    viewMetrics: createMetricMaps(),
    commentMetrics: createMetricMaps(),
    likeMetrics: createMetricMaps(),
    currentLikeCountByPost: new Map(),
});

const parseCompactDateKey = (value: string): string | null => {
    if (!/^\d{8}$/.test(value)) {
        return null;
    }

    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const addMapValue = (map: NumberMap, key: string, value: number) => {
    if (!value) {
        return;
    }

    map.set(key, (map.get(key) || 0) + value);
};

const addTrendValue = (map: PostDateCountMap, postId: string, dateKey: string, value: number) => {
    if (!value) {
        return;
    }

    const dateCounts = map.get(postId) || new Map<string, number>();
    dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + value);
    map.set(postId, dateCounts);
};

const applyMetric = (
    metricMaps: ArticleMetricMaps,
    postId: string,
    dateKey: string,
    value: number,
    metricWindow: MetricWindow,
    options: Required<LoadMetricsOptions>,
) => {
    if (!value) {
        return;
    }

    if (metricWindow.currentKeys.has(dateKey)) {
        addMapValue(metricMaps.current, postId, value);
        if (options.includeTrend) {
            addTrendValue(metricMaps.trend, postId, dateKey, value);
        }
        return;
    }

    if (metricWindow.previousKeys.has(dateKey)) {
        addMapValue(metricMaps.previous, postId, value);
    }
};

const toSafeNumber = (value: bigint | number | string | null | undefined): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'bigint') {
        return Number(value);
    }

    if (typeof value === 'string') {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : 0;
    }

    return 0;
};

const mapGroupCountRows = (rows: GroupCountRow[]): NumberMap =>
    new Map(rows.map((row) => [row.postId, row._count._all] as const));

const mapViewRows = (
    rows: Array<{
        postId: string;
        viewedAt: Date;
        _count: { _all: number };
    }>,
    metricWindow: MetricWindow,
    options: Required<LoadMetricsOptions>,
): ArticleMetricMaps => {
    const metrics = createMetricMaps();

    rows.forEach((row) => {
        applyMetric(
            metrics,
            row.postId,
            formatDate(row.viewedAt),
            row._count._all,
            metricWindow,
            options,
        );
    });

    return metrics;
};

const mapDailyRows = (
    rows: SqlDailyCountRow[],
    metricWindow: MetricWindow,
    options: Required<LoadMetricsOptions>,
): ArticleMetricMaps => {
    const metrics = createMetricMaps();

    rows.forEach((row) => {
        applyMetric(
            metrics,
            row.postId,
            row.dateKey,
            toSafeNumber(row.total),
            metricWindow,
            options,
        );
    });

    return metrics;
};

async function scanPendingUv(postIdSet: Set<string>): Promise<PostDateCountMap> {
    return runWithSpan(
        'article.report.metrics.pending-uv-scan',
        async () => {
            const pendingUvByPost = new Map<string, Map<string, number>>();
            const scanStream = redis.scanStream({
                match: 'post:*:uv:*',
                count: 100,
            });

            for await (const batch of scanStream) {
                const keys = (batch as string[]).filter((key) => {
                    const parts = key.split(':');
                    return parts.length >= 4 && postIdSet.has(parts[1]);
                });

                if (keys.length === 0) {
                    continue;
                }

                const pipeline = redis.pipeline();
                keys.forEach((key) => {
                    pipeline.scard(key);
                });

                const rows = await pipeline.exec();
                if (!rows) {
                    continue;
                }

                keys.forEach((key, index) => {
                    const parts = key.split(':');
                    const postId = parts[1];
                    const dateKey = parseCompactDateKey(parts[3]);
                    const count = typeof rows[index]?.[1] === 'number' ? rows[index][1] : 0;

                    if (!dateKey || count <= 0) {
                        return;
                    }

                    addTrendValue(pendingUvByPost, postId, dateKey, count);
                });
            }

            return pendingUvByPost;
        },
        {
            'article.report.post_count': postIdSet.size,
        },
    );
}

async function scanPendingLikeCounts(postIdSet: Set<string>): Promise<NumberMap> {
    return runWithSpan(
        'article.report.metrics.pending-like-scan',
        async () => {
            const pendingLikeCountByPost = new Map<string, number>();
            const scanStream = redis.scanStream({
                match: 'post:*:like',
                count: 100,
            });

            for await (const batch of scanStream) {
                const keys = (batch as string[]).filter((key) => {
                    const parts = key.split(':');
                    return parts.length >= 3 && postIdSet.has(parts[1]);
                });

                if (keys.length === 0) {
                    continue;
                }

                const pipeline = redis.pipeline();
                keys.forEach((key) => {
                    pipeline.scard(key);
                });

                const rows = await pipeline.exec();
                if (!rows) {
                    continue;
                }

                keys.forEach((key, index) => {
                    const parts = key.split(':');
                    const postId = parts[1];
                    const count = typeof rows[index]?.[1] === 'number' ? rows[index][1] : 0;

                    if (count > 0) {
                        pendingLikeCountByPost.set(postId, count);
                    }
                });
            }

            return pendingLikeCountByPost;
        },
        {
            'article.report.post_count': postIdSet.size,
        },
    );
}

export async function loadPosts(postWhere: Prisma.PostWhereInput): Promise<ArticleReportPostRow[]> {
    try {
        return await prisma.post.findMany({
            where: postWhere,
            select: articleReportPostSelect,
            orderBy: {
                updatedAt: 'desc',
            },
        });
    } catch {
        return [];
    }
}

export async function loadFilterOptions(): Promise<{
    authors: ArticleReportOption[];
    tags: ArticleReportOption[];
}> {
    try {
        const authorRows = await prisma.user.findMany({
            where: {
                posts: {
                    some: {},
                },
            },
            select: {
                id: true,
                username: true,
                nickname: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        const tagRows = await prisma.tag.findMany({
            where: {
                posts: {
                    some: {},
                },
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return {
            authors: authorRows.map((author) => ({
                value: String(author.id),
                label: author.nickname?.trim() || author.username,
            })),
            tags: tagRows.map((tag) => ({
                value: String(tag.id),
                label: tag.name,
            })),
        };
    } catch {
        return {
            authors: [],
            tags: [],
        };
    }
}

export async function loadMetrics(
    postIds: string[],
    metricWindow: MetricWindow,
    options: LoadMetricsOptions = {},
): Promise<ArticleReportMetricsSnapshot> {
    if (postIds.length === 0) {
        return createEmptyMetricsSnapshot();
    }

    const resolvedOptions = {
        includeTrend: options.includeTrend ?? true,
    };

    try {
        return await runWithSpan(
            'article.report.metrics.load',
            async () => {
                const viewRows = await prisma.postViewDaily.groupBy({
                    by: ['postId', 'viewedAt'],
                    where: {
                        postId: {
                            in: postIds,
                        },
                        viewedAt: {
                            gte: metricWindow.previousStart,
                            lt: metricWindow.currentEnd,
                        },
                    },
                    _count: {
                        _all: true,
                    },
                });
                const commentRows = await prisma.$queryRaw<SqlDailyCountRow[]>(Prisma.sql`
                    SELECT
                        \`postId\`,
                        DATE_FORMAT(\`createdAt\`, '%Y-%m-%d') AS \`dateKey\`,
                        COUNT(*) AS \`total\`
                    FROM \`Comment\`
                    WHERE \`status\` = ${CommentStatus.PUBLISHED}
                        AND \`postId\` IS NOT NULL
                        AND \`postId\` IN (${Prisma.join(postIds)})
                        AND \`createdAt\` >= ${metricWindow.previousStart}
                        AND \`createdAt\` < ${metricWindow.currentEnd}
                    GROUP BY \`postId\`, DATE_FORMAT(\`createdAt\`, '%Y-%m-%d')
                `);
                const likeRows = await prisma.$queryRaw<SqlDailyCountRow[]>(Prisma.sql`
                    SELECT
                        \`postId\`,
                        DATE_FORMAT(\`createdAt\`, '%Y-%m-%d') AS \`dateKey\`,
                        COUNT(*) AS \`total\`
                    FROM \`PostLike\`
                    WHERE \`postId\` IN (${Prisma.join(postIds)})
                        AND \`createdAt\` >= ${metricWindow.previousStart}
                        AND \`createdAt\` < ${metricWindow.currentEnd}
                    GROUP BY \`postId\`, DATE_FORMAT(\`createdAt\`, '%Y-%m-%d')
                `);
                const currentLikeRows = await prisma.postLike.groupBy({
                    by: ['postId'],
                    where: {
                        postId: {
                            in: postIds,
                        },
                    },
                    _count: {
                        _all: true,
                    },
                });
                const pendingUvByPost = await scanPendingUv(new Set(postIds));
                const pendingLikeCountByPost = await scanPendingLikeCounts(new Set(postIds));

                const viewMetrics = mapViewRows(
                    viewRows as Array<{
                        postId: string;
                        viewedAt: Date;
                        _count: { _all: number };
                    }>,
                    metricWindow,
                    resolvedOptions,
                );
                const currentLikeCountByPost = mapGroupCountRows(
                    currentLikeRows as GroupCountRow[],
                );

                pendingUvByPost.forEach((dateCounts, postId) => {
                    dateCounts.forEach((count, dateKey) => {
                        applyMetric(
                            viewMetrics,
                            postId,
                            dateKey,
                            count,
                            metricWindow,
                            resolvedOptions,
                        );
                    });
                });

                pendingLikeCountByPost.forEach((count, postId) => {
                    currentLikeCountByPost.set(postId, count);
                });

                return {
                    viewMetrics,
                    commentMetrics: mapDailyRows(commentRows, metricWindow, resolvedOptions),
                    likeMetrics: mapDailyRows(likeRows, metricWindow, resolvedOptions),
                    currentLikeCountByPost,
                };
            },
            {
                'article.report.post_count': postIds.length,
            },
        );
    } catch {
        return createEmptyMetricsSnapshot();
    }
}
