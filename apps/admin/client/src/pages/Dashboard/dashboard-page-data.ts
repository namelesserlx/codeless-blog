import type { DashboardOverviewResponse } from '@blog/shared';
import type {
    DashboardMetricCardTemplate,
    FunnelStageItem,
    HealthGaugeItem,
    HotArticleItem,
    MetricItem,
    TaskItem,
    TrafficPoint,
    TrendSummaryItem,
} from './types';

export interface DashboardPageData {
    metrics: MetricItem[];
    trafficData: TrafficPoint[];
    trendSummary: TrendSummaryItem[];
    topArticles: HotArticleItem[];
    healthGauges: HealthGaugeItem[];
    pendingTasks: TaskItem[];
    funnelStages: FunnelStageItem[];
}

const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('zh-CN').format(value);
};

const formatCompactNumber = (value: number): string => {
    if (value >= 10_000) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return formatNumber(value);
};

const formatTrend = (value: number): string => {
    if (value > 0) return `+${value}%`;
    return `${value}%`;
};

const formatReadTime = (seconds: number): string => {
    if (seconds <= 0) return '0s';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins <= 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

const buildSummaryLabel = (range: DashboardOverviewResponse['range']): string => {
    if (range === 'today') return '今日总访问';
    if (range === '30d') return '近 30 天总访问';
    if (range === 'custom') return '所选范围总访问';
    return '本周总访问';
};

export const mapDashboardOverviewToPageData = (
    dashboardOverview: DashboardOverviewResponse,
    metricCardTemplates: DashboardMetricCardTemplate[],
): DashboardPageData => {
    const metricMap = new Map(dashboardOverview.metrics.map((item) => [item.key, item]));

    const metrics = metricCardTemplates.flatMap((template) => {
        const metric = metricMap.get(template.key as 'article' | 'snippet' | 'comment' | 'view');
        if (!metric) return [];
        const trendDirection: MetricItem['trendDirection'] = metric.trend >= 0 ? 'up' : 'down';

        return [
            {
                ...template,
                value: formatNumber(metric.total),
                suffix: metric.unit,
                trend: formatTrend(metric.trend),
                trendDirection,
                hint: metric.hint,
            },
        ];
    });

    const trafficData: TrafficPoint[] = dashboardOverview.trend.points.map((point) => ({
        label: point.label,
        visits: point.visits,
    }));

    const trendSummary: TrendSummaryItem[] = [
        {
            label: buildSummaryLabel(dashboardOverview.range),
            value: formatNumber(dashboardOverview.trend.summary.totalVisits),
        },
        { label: '单日峰值', value: formatNumber(dashboardOverview.trend.summary.peakDailyVisits) },
        {
            label: '平均阅读时长',
            value: formatReadTime(dashboardOverview.trend.summary.avgReadSeconds),
        },
    ];

    const topArticles: HotArticleItem[] = dashboardOverview.hotArticles.map((item) => ({
        title: item.title,
        views: formatCompactNumber(item.views),
    }));

    const healthGauges: HealthGaugeItem[] = dashboardOverview.healthGauges.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.value,
        total: item.total,
        activeColor: item.activeColor,
        unit: item.unit,
    }));

    const pendingTasks: TaskItem[] = dashboardOverview.pendingTasks.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        description: item.description,
        priority: item.priority,
        targetId: item.targetId,
    }));

    const funnelStages: FunnelStageItem[] = dashboardOverview.funnelStages.map((stage) => ({
        key: stage.key,
        step: stage.step,
        count: stage.count,
        conversionRate: stage.conversionRate,
        avgStayHours: stage.avgStayHours,
        color: stage.color,
    }));

    return {
        metrics,
        trafficData,
        trendSummary,
        topArticles,
        healthGauges,
        pendingTasks,
        funnelStages,
    };
};
