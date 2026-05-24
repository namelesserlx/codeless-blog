import type { DashboardOverviewQuery, DashboardOverviewResponse } from '@blog/shared';
import { addDays } from '../../utils/date';
import { ServiceErrorHandler, TraceSpan } from '../../utils/decorators';
import { logger } from '../../utils/logger';
import { runWithSpan } from '../../telemetry/tracing';
import { createEmptyContentModule, fetchContentModule } from './content';
import { buildFunnelStages, EMPTY_FUNNEL_MODULE, fetchFunnelModule } from './funnel';
import { buildHealthGauges, buildOverviewMetrics } from './presentation';
import { fetchPendingTasksModule } from './tasks';
import { createEmptyTrafficModule, fetchTrafficModule } from './traffic';
import { DEFAULT_DASHBOARD_QUERY, resolveDashboardWindow } from './window';

const loadDashboardModule = async <T>(
    moduleName: string,
    loader: () => Promise<T>,
    fallback: T,
): Promise<T> => {
    try {
        return await runWithSpan('dashboard.module.load', loader, {
            'dashboard.module': moduleName,
        });
    } catch (error) {
        logger.error(`[Dashboard] ${moduleName} module load failed`, error);
        return fallback;
    }
};

export class DashboardService {
    @TraceSpan('dashboard.overview', (query: DashboardOverviewQuery = DEFAULT_DASHBOARD_QUERY) => ({
        'dashboard.range': query.range,
    }))
    @ServiceErrorHandler
    async getOverview(
        query: DashboardOverviewQuery = DEFAULT_DASHBOARD_QUERY,
    ): Promise<DashboardOverviewResponse> {
        const window = resolveDashboardWindow(query);
        const reviewSplitDate = addDays(new Date(), -2);

        const [content, traffic, pendingTasks, funnel] = await Promise.all([
            loadDashboardModule(
                'content',
                () => fetchContentModule(window),
                createEmptyContentModule(),
            ),
            loadDashboardModule(
                'traffic',
                () => fetchTrafficModule(window),
                createEmptyTrafficModule(window.buckets),
            ),
            loadDashboardModule('pendingTasks', fetchPendingTasksModule, []),
            loadDashboardModule(
                'funnel',
                () => fetchFunnelModule(reviewSplitDate),
                EMPTY_FUNNEL_MODULE,
            ),
        ]);

        const trendSummary = {
            totalVisits: traffic.trendPoints.reduce((sum, item) => sum + item.visits, 0),
            peakDailyVisits: traffic.peakDailyVisits,
            avgReadSeconds: traffic.avgReadSeconds,
        };

        return {
            range: window.range,
            startDate: window.startDate,
            endDate: window.endDate,
            metrics: buildOverviewMetrics(content, traffic),
            trend: {
                points: traffic.trendPoints,
                summary: trendSummary,
            },
            hotArticles: traffic.hotArticles,
            healthGauges: buildHealthGauges(),
            pendingTasks,
            funnelStages: buildFunnelStages(content, funnel),
            generatedAt: new Date().toISOString(),
        };
    }
}

export const dashboardService = new DashboardService();
