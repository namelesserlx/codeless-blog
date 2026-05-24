import { METRICS, OVERVIEW_METRIC_CARD_TEMPLATES } from './config';
import { calculateDelta, formatDelta, formatDeltaCount, formatNumber } from './formatters';
import type {
    ArticlePerformanceRow,
    ArticleReportApiListItem,
    ArticleReportOverviewApiResponse,
    MetricDefinition,
    MetricKey,
    OverviewMetricItem,
    SelectOption,
    TrendPoint,
} from './types';

export function getMetricDefinition(metricKey: MetricKey): MetricDefinition {
    return METRICS.find((metric) => metric.key === metricKey) || METRICS[0];
}

export function buildAuthorOptions(
    overview?: ArticleReportOverviewApiResponse | null,
): SelectOption[] {
    return overview?.authors || [];
}

export function buildTagOptions(
    overview?: ArticleReportOverviewApiResponse | null,
): SelectOption[] {
    return overview?.tags || [];
}

function pickMetricValue(point: TrendPoint, metricKey: MetricKey) {
    return point[metricKey];
}

export function sumMetric(points: TrendPoint[], metricKey: MetricKey) {
    return points.reduce((sum, point) => sum + pickMetricValue(point, metricKey), 0);
}

export function buildArticlePerformanceRows(
    articles: ArticleReportApiListItem[],
): ArticlePerformanceRow[] {
    return articles.map((article) => {
        return {
            id: article.id,
            title: article.title,
            summary: article.summary,
            author: article.author,
            status: article.status,
            tags: article.tags.map((tag) => tag.name),
            updatedAt: article.updatedAt,
            publishedAt: article.publishedAt,
            rangeUv: article.current.uv,
            rangeComments: article.current.comments,
            currentLikes: article.currentLikes,
            uvDelta: calculateDelta(article.current.uv, article.previous.uv),
            coverTone: article.coverTone,
        };
    });
}

interface BuildOverviewMetricsParams {
    overview?: ArticleReportOverviewApiResponse | null;
    rangeLabel: string;
}

export function buildOverviewMetrics({
    overview,
    rangeLabel,
}: BuildOverviewMetricsParams): OverviewMetricItem[] {
    const current = overview?.overview.current;
    const previous = overview?.overview.previous;
    const articleCount = current?.articleCount || 0;
    const newArticleCount = current?.newArticleCount || 0;
    const previousNewArticleCount = previous?.newArticleCount || 0;
    const rangeUv = current?.uv || 0;
    const previousUv = previous?.uv || 0;
    const rangeComments = current?.comments || 0;
    const previousComments = previous?.comments || 0;
    const likesTotal = current?.likes || 0;
    const previousLikeAdds = previous?.likeAdds || 0;
    const currentLikeAdds = current?.likeAdds || 0;
    const uniqueAuthorCount = current?.uniqueAuthorCount || 0;

    const metricValues: Record<
        OverviewMetricItem['key'],
        Omit<OverviewMetricItem, 'icon' | 'iconStyle' | 'label' | 'key'>
    > = {
        articleCount: {
            value: `${articleCount}`,
            hint: `筛选后覆盖 ${uniqueAuthorCount} 位作者`,
            delta: formatDeltaCount(newArticleCount - previousNewArticleCount),
        },
        uv: {
            value: formatNumber(rangeUv),
            hint: `${rangeLabel} 内汇总访问`,
            delta: formatDelta(calculateDelta(rangeUv, previousUv), rangeUv),
        },
        comments: {
            value: formatNumber(rangeComments),
            hint: `${rangeLabel} 内累计评论总量`,
            delta: formatDelta(calculateDelta(rangeComments, previousComments), rangeComments),
        },
        likes: {
            value: formatNumber(likesTotal),
            hint: `范围内互动 ${formatNumber(currentLikeAdds)}`,
            delta: formatDelta(
                calculateDelta(currentLikeAdds, previousLikeAdds),
                currentLikeAdds,
                formatNumber,
            ),
        },
    };

    return OVERVIEW_METRIC_CARD_TEMPLATES.map((template) => ({
        ...template,
        ...metricValues[template.key],
    }));
}
