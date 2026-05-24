import type {
    ArticleReportArticleTrendResponse,
    ArticleReportItem,
    ArticleReportListItem,
    ArticleReportListQuery,
    ArticleReportListResponse,
    ArticleReportMetricSet,
    ArticleReportOption,
    ArticleReportOverviewResponse,
    ArticleReportPoint,
    ArticleReportQuery,
    ArticleReportResponse,
} from '@blog/shared';
import { ServiceErrorHandler, TraceSpan } from '../../../utils/decorators';
import {
    addDays,
    buildDateBuckets,
    formatDate,
    formatDateTime,
    parseDate,
    startOfDay,
    type DateBucket,
} from '../../../utils/date';
import {
    loadFilterOptions,
    loadMetrics,
    loadPosts,
    type ArticleReportMetricsSnapshot,
    type ArticleReportPostRow,
    type NumberMap,
} from './repository';
import { runWithSpan } from '../../../telemetry/tracing';

const DEFAULT_REPORT_DAYS = 30;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const COVER_TONES = ['#1677ff', '#13c2c2', '#52c41a', '#faad14', '#eb2f96', '#2f54eb'];

type MetricWindow = {
    previousStart: Date;
    currentEnd: Date;
    currentKeys: Set<string>;
    previousKeys: Set<string>;
};

type ReportContext = MetricWindow & {
    start: Date;
    end: Date;
    currentEnd: Date;
    buckets: DateBucket[];
    startDate: string;
    endDate: string;
};

type ArticleReportSortableItem = ArticleReportListItem | ArticleReportItem;

const createMetricSet = (): ArticleReportMetricSet => ({
    uv: 0,
    comments: 0,
    likeAdds: 0,
});

const resolveReportContext = (query: ArticleReportQuery): ReportContext => {
    const today = startOfDay(new Date());
    const end = parseDate(query.endDate, today);
    const start = parseDate(query.startDate, addDays(end, -(DEFAULT_REPORT_DAYS - 1)));
    const currentEnd = addDays(end, 1);
    const buckets = buildDateBuckets(start, end);
    const days = buckets.length;
    const previousStart = addDays(start, -days);
    const currentKeys = new Set(buckets.map((bucket) => bucket.key));
    const previousKeys = new Set(
        buildDateBuckets(previousStart, addDays(start, -1)).map((bucket) => bucket.key),
    );

    return {
        start,
        end,
        currentEnd,
        previousStart,
        currentKeys,
        previousKeys,
        buckets,
        startDate: formatDate(start),
        endDate: formatDate(end),
    };
};

const buildPostWhere = (query: ArticleReportQuery, articleId?: string) => {
    const conditions: Record<string, unknown>[] = [];
    const keyword = query.keyword?.trim();

    if (articleId) {
        conditions.push({ id: articleId });
    }

    if (keyword) {
        conditions.push({
            OR: [
                { title: { contains: keyword } },
                { summary: { contains: keyword } },
                {
                    tags: {
                        some: {
                            name: { contains: keyword },
                        },
                    },
                },
            ],
        });
    }

    if (typeof query.authorId === 'number') {
        conditions.push({ authorId: query.authorId });
    }

    if (typeof query.tagId === 'number') {
        conditions.push({
            tags: {
                some: {
                    id: query.tagId,
                },
            },
        });
    }

    return conditions.length === 0 ? {} : { AND: conditions };
};

const buildAuthorLabel = (author: { username: string; nickname: string | null }): string =>
    author.nickname?.trim() || author.username;

const buildAuthorOptionsFromPosts = (posts: ArticleReportPostRow[]): ArticleReportOption[] => {
    const authorMap = new Map<string, string>();

    posts.forEach((post) => {
        authorMap.set(String(post.authorId), buildAuthorLabel(post.author));
    });

    return Array.from(authorMap.entries())
        .sort((left, right) => left[1].localeCompare(right[1], 'zh-CN'))
        .map(([value, label]) => ({ value, label }));
};

const buildTagOptionsFromPosts = (posts: ArticleReportPostRow[]): ArticleReportOption[] => {
    const tagMap = new Map<string, string>();

    posts.forEach((post) => {
        post.tags.forEach((tag) => {
            tagMap.set(String(tag.id), tag.name);
        });
    });

    return Array.from(tagMap.entries())
        .sort((left, right) => left[1].localeCompare(right[1], 'zh-CN'))
        .map(([value, label]) => ({ value, label }));
};

const resolveFilterOptions = (
    posts: ArticleReportPostRow[],
    filterOptions: {
        authors: ArticleReportOption[];
        tags: ArticleReportOption[];
    },
) => ({
    authors:
        filterOptions.authors.length > 0
            ? filterOptions.authors
            : buildAuthorOptionsFromPosts(posts),
    tags: filterOptions.tags.length > 0 ? filterOptions.tags : buildTagOptionsFromPosts(posts),
});

const summarizeText = (summary: string | null): string => {
    const text = summary?.replace(/\s+/g, ' ').trim() || '';
    if (!text) {
        return '暂无摘要';
    }
    return text.length <= 60 ? text : `${text.slice(0, 60)}...`;
};

const getStatus = (post: Pick<ArticleReportPostRow, 'published' | 'isDraft'>) => {
    if (post.published) {
        return '已发布' as const;
    }
    if (post.isDraft) {
        return '草稿' as const;
    }
    return '待发布' as const;
};

const getPublishedAt = (
    post: Pick<ArticleReportPostRow, 'published' | 'isDraft' | 'createdAt'>,
) => {
    if (post.published) {
        return formatDate(post.createdAt);
    }
    if (post.isDraft) {
        return '未发布';
    }
    return '待发布';
};

const getCoverTone = (postId: string): string => {
    let hash = 0;

    for (const character of postId) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return COVER_TONES[hash % COVER_TONES.length];
};

const sumNumberMap = (map: NumberMap): number =>
    Array.from(map.values()).reduce((total, value) => total + value, 0);

const addMetricSet = (target: ArticleReportMetricSet, source: ArticleReportMetricSet) => {
    target.uv += source.uv;
    target.comments += source.comments;
    target.likeAdds += source.likeAdds;
};

const buildArticleTrend = (
    articleId: string,
    buckets: DateBucket[],
    metrics: ArticleReportMetricsSnapshot,
): ArticleReportPoint[] =>
    buckets.map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        uv: metrics.viewMetrics.trend.get(articleId)?.get(bucket.key) || 0,
        comments: metrics.commentMetrics.trend.get(articleId)?.get(bucket.key) || 0,
        likeAdds: metrics.likeMetrics.trend.get(articleId)?.get(bucket.key) || 0,
    }));

const buildArticleListItem = (
    post: ArticleReportPostRow,
    metrics: ArticleReportMetricsSnapshot,
): ArticleReportListItem => {
    const currentUv = metrics.viewMetrics.current.get(post.id) || 0;
    const previousUv = metrics.viewMetrics.previous.get(post.id) || 0;
    const currentComments = metrics.commentMetrics.current.get(post.id) || 0;
    const previousComments = metrics.commentMetrics.previous.get(post.id) || 0;
    const currentLikeAdds = metrics.likeMetrics.current.get(post.id) || 0;
    const previousLikeAdds = metrics.likeMetrics.previous.get(post.id) || 0;
    const currentLikes = metrics.currentLikeCountByPost.get(post.id) || 0;

    return {
        id: post.id,
        title: post.title,
        summary: summarizeText(post.summary),
        authorId: post.authorId,
        author: buildAuthorLabel(post.author),
        status: getStatus(post),
        tags: post.tags,
        publishedAt: getPublishedAt(post),
        updatedAt: formatDateTime(post.updatedAt),
        coverTone: getCoverTone(post.id),
        currentLikes,
        current: {
            uv: currentUv,
            comments: currentComments,
            likeAdds: currentLikeAdds,
        },
        previous: {
            uv: previousUv,
            comments: previousComments,
            likeAdds: previousLikeAdds,
        },
    };
};

const buildArticleItem = (
    post: ArticleReportPostRow,
    metrics: ArticleReportMetricsSnapshot,
    buckets: DateBucket[],
): ArticleReportItem => ({
    ...buildArticleListItem(post, metrics),
    trend: buildArticleTrend(post.id, buckets, metrics),
});

const getSortableValue = (
    article: ArticleReportSortableItem,
    sortBy: NonNullable<ArticleReportListQuery['sortBy']>,
): number => {
    if (sortBy === 'comments') {
        return article.current.comments;
    }
    if (sortBy === 'likes') {
        return article.currentLikes;
    }
    if (sortBy === 'updatedAt') {
        return Date.parse(article.updatedAt.replace(' ', 'T')) || 0;
    }
    return article.current.uv;
};

const sortArticles = <T extends ArticleReportSortableItem>(
    articles: T[],
    query: Pick<ArticleReportListQuery, 'sortBy' | 'sortOrder'>,
): T[] => {
    const sortBy = query.sortBy || 'uv';
    const direction = query.sortOrder === 'asc' ? 1 : -1;

    return [...articles].sort((left, right) => {
        const diff = getSortableValue(left, sortBy) - getSortableValue(right, sortBy);
        if (diff !== 0) {
            return diff * direction;
        }

        return left.id.localeCompare(right.id);
    });
};

const resolveListLimit = (limit?: number): number => {
    if (!Number.isFinite(limit)) {
        return DEFAULT_LIST_LIMIT;
    }

    return Math.min(Math.max(Math.floor(limit || DEFAULT_LIST_LIMIT), 1), MAX_LIST_LIMIT);
};

const resolveCursorOffset = (cursor?: string): number => {
    if (!cursor) {
        return 0;
    }

    const offset = Number(cursor);
    return Number.isInteger(offset) && offset > 0 ? offset : 0;
};

const buildOverviewTrend = (
    posts: ArticleReportPostRow[],
    buckets: DateBucket[],
    metrics: ArticleReportMetricsSnapshot,
): ArticleReportPoint[] => {
    const overviewTrendMap = new Map(
        buckets.map((bucket) => [
            bucket.key,
            {
                date: bucket.key,
                label: bucket.label,
                ...createMetricSet(),
            },
        ]),
    );

    posts.forEach((post) => {
        buildArticleTrend(post.id, buckets, metrics).forEach((point) => {
            addMetricSet(overviewTrendMap.get(point.date)!, point);
        });
    });

    return buckets.map((bucket) => overviewTrendMap.get(bucket.key)!);
};

const buildOverviewCounts = (posts: ArticleReportPostRow[], context: ReportContext) => {
    let currentNewArticleCount = 0;
    let previousNewArticleCount = 0;

    posts.forEach((post) => {
        if (post.createdAt >= context.start && post.createdAt < context.currentEnd) {
            currentNewArticleCount += 1;
            return;
        }

        if (post.createdAt >= context.previousStart && post.createdAt < context.start) {
            previousNewArticleCount += 1;
        }
    });

    return {
        currentNewArticleCount,
        previousNewArticleCount,
    };
};

const createEmptyOverviewResponse = (
    context: ReportContext,
    authors: ArticleReportOption[],
    tags: ArticleReportOption[],
): ArticleReportOverviewResponse => ({
    startDate: context.startDate,
    endDate: context.endDate,
    authors,
    tags,
    overview: {
        current: {
            articleCount: 0,
            newArticleCount: 0,
            uniqueAuthorCount: 0,
            likes: 0,
            ...createMetricSet(),
        },
        previous: {
            newArticleCount: 0,
            ...createMetricSet(),
        },
        trend: context.buckets.map((bucket) => ({
            date: bucket.key,
            label: bucket.label,
            ...createMetricSet(),
        })),
    },
    generatedAt: new Date().toISOString(),
});

const buildOverviewResponse = (
    posts: ArticleReportPostRow[],
    context: ReportContext,
    metrics: ArticleReportMetricsSnapshot,
    authors: ArticleReportOption[],
    tags: ArticleReportOption[],
): ArticleReportOverviewResponse => {
    const { currentNewArticleCount, previousNewArticleCount } = buildOverviewCounts(posts, context);

    return {
        startDate: context.startDate,
        endDate: context.endDate,
        authors,
        tags,
        overview: {
            current: {
                articleCount: posts.length,
                newArticleCount: currentNewArticleCount,
                uniqueAuthorCount: new Set(posts.map((post) => post.authorId)).size,
                uv: sumNumberMap(metrics.viewMetrics.current),
                comments: sumNumberMap(metrics.commentMetrics.current),
                likeAdds: sumNumberMap(metrics.likeMetrics.current),
                likes: sumNumberMap(metrics.currentLikeCountByPost),
            },
            previous: {
                newArticleCount: previousNewArticleCount,
                uv: sumNumberMap(metrics.viewMetrics.previous),
                comments: sumNumberMap(metrics.commentMetrics.previous),
                likeAdds: sumNumberMap(metrics.likeMetrics.previous),
            },
            trend: buildOverviewTrend(posts, context.buckets, metrics),
        },
        generatedAt: new Date().toISOString(),
    };
};

const loadReportMetrics = (
    postIds: string[],
    context: ReportContext,
    options: { includeTrend: boolean },
) =>
    runWithSpan('article.report.metrics.load', () => loadMetrics(postIds, context, options), {
        'article.report.post_count': postIds.length,
    });

export class ArticleReportService {
    @TraceSpan('article.report.overview.get', (query: ArticleReportQuery) => ({
        'article.report.has_keyword': Boolean(query.keyword?.trim()),
        'article.report.has_author': typeof query.authorId === 'number',
        'article.report.has_tag': typeof query.tagId === 'number',
    }))
    @ServiceErrorHandler
    async getOverview(query: ArticleReportQuery): Promise<ArticleReportOverviewResponse> {
        const context = resolveReportContext(query);
        const [posts, filterOptions] = await runWithSpan(
            'article.report.posts.load',
            () => Promise.all([loadPosts(buildPostWhere(query)), loadFilterOptions()]),
            {
                'article.report.bucket_count': context.buckets.length,
            },
        );
        const { authors, tags } = resolveFilterOptions(posts, filterOptions);

        if (posts.length === 0) {
            return createEmptyOverviewResponse(context, authors, tags);
        }

        const metrics = await loadReportMetrics(
            posts.map((post) => post.id),
            context,
            { includeTrend: true },
        );

        return buildOverviewResponse(posts, context, metrics, authors, tags);
    }

    @TraceSpan('article.report.list.get', (query: ArticleReportListQuery) => ({
        'article.report.has_keyword': Boolean(query.keyword?.trim()),
        'article.report.has_author': typeof query.authorId === 'number',
        'article.report.has_tag': typeof query.tagId === 'number',
        'article.report.limit': query.limit || DEFAULT_LIST_LIMIT,
    }))
    @ServiceErrorHandler
    async getArticleList(query: ArticleReportListQuery): Promise<ArticleReportListResponse> {
        const context = resolveReportContext(query);
        const limit = resolveListLimit(query.limit);
        const cursorOffset = resolveCursorOffset(query.cursor);
        const posts = await loadPosts(buildPostWhere(query));

        if (posts.length === 0) {
            return {
                startDate: context.startDate,
                endDate: context.endDate,
                pageInfo: {
                    limit,
                    total: 0,
                    hasMore: false,
                },
                articles: [],
            };
        }

        const metrics = await loadReportMetrics(
            posts.map((post) => post.id),
            context,
            { includeTrend: false },
        );
        const articles = sortArticles(
            posts.map((post) => buildArticleListItem(post, metrics)),
            query,
        );
        const slicedArticles = articles.slice(cursorOffset, cursorOffset + limit);
        const nextOffset = cursorOffset + slicedArticles.length;
        const hasMore = nextOffset < articles.length;

        return {
            startDate: context.startDate,
            endDate: context.endDate,
            pageInfo: {
                limit,
                total: articles.length,
                nextCursor: hasMore ? String(nextOffset) : undefined,
                hasMore,
            },
            articles: slicedArticles,
        };
    }

    @TraceSpan('article.report.trend.get', (articleId: string, query: ArticleReportQuery) => ({
        'article.report.article_id': articleId,
        'article.report.has_keyword': Boolean(query.keyword?.trim()),
    }))
    @ServiceErrorHandler
    async getArticleTrend(
        articleId: string,
        query: ArticleReportQuery,
    ): Promise<ArticleReportArticleTrendResponse> {
        const context = resolveReportContext(query);
        const posts = await loadPosts(buildPostWhere(query, articleId));
        const postIds = posts.length > 0 ? [posts[0].id] : [];
        const metrics = await loadReportMetrics(postIds, context, { includeTrend: true });

        return {
            articleId,
            startDate: context.startDate,
            endDate: context.endDate,
            trend: buildArticleTrend(articleId, context.buckets, metrics),
        };
    }

    @TraceSpan('article.report.get', (query: ArticleReportQuery) => ({
        'article.report.has_keyword': Boolean(query.keyword?.trim()),
        'article.report.has_author': typeof query.authorId === 'number',
        'article.report.has_tag': typeof query.tagId === 'number',
    }))
    @ServiceErrorHandler
    async getReport(query: ArticleReportQuery): Promise<ArticleReportResponse> {
        const context = resolveReportContext(query);
        const [posts, filterOptions] = await runWithSpan(
            'article.report.posts.load',
            () => Promise.all([loadPosts(buildPostWhere(query)), loadFilterOptions()]),
            {
                'article.report.bucket_count': context.buckets.length,
            },
        );
        const { authors, tags } = resolveFilterOptions(posts, filterOptions);

        if (posts.length === 0) {
            return {
                ...createEmptyOverviewResponse(context, authors, tags),
                articles: [],
            };
        }

        const metrics = await loadReportMetrics(
            posts.map((post) => post.id),
            context,
            { includeTrend: true },
        );
        const overviewResponse = buildOverviewResponse(posts, context, metrics, authors, tags);

        return {
            ...overviewResponse,
            articles: posts.map((post) => buildArticleItem(post, metrics, context.buckets)),
        };
    }
}

export const articleReportService = new ArticleReportService();
