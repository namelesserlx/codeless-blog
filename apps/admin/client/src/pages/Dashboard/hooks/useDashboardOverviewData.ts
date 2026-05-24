import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRequest } from 'ahooks';
import { message } from 'antd';
import type {
    DashboardOverviewQuery,
    DashboardOverviewResponse,
    DashboardRange,
} from '@blog/shared';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';
import { dashboardService } from '@/services/dashboard';
import type { WebSocketConnection } from '@/utils/websocket';
import { buildDashboardDateRangeKey, getDashboardPresetRange } from '../dashboard-date-range';
import { dashboardMetricCardTemplates } from '../dashboard-config';
import { mapDashboardOverviewToPageData } from '../dashboard-page-data';
import type { DashboardDateRange } from '../types';

interface UseDashboardOverviewDataParams {
    selectedDateRange: DashboardDateRange;
}

interface DashboardOverviewSnapshot {
    dateRangeKey: string;
    overview: DashboardOverviewResponse;
}

const buildDashboardOverviewQuery = (
    selectedDateRange: DashboardDateRange,
): DashboardOverviewQuery => {
    return {
        startDate: selectedDateRange[0].format('YYYY-MM-DD'),
        endDate: selectedDateRange[1].format('YYYY-MM-DD'),
    };
};

const getDashboardRealtimeRange = (
    selectedDateRange: DashboardDateRange,
): DashboardRange | null => {
    return getDashboardPresetRange(selectedDateRange);
};

export const useDashboardOverviewData = ({ selectedDateRange }: UseDashboardOverviewDataParams) => {
    const isDocumentVisible = useDocumentVisibility();
    const [dashboardOverviewSnapshot, setDashboardOverviewSnapshot] =
        useState<DashboardOverviewSnapshot | null>(null);
    const realtimeConnectionRef = useRef<WebSocketConnection | null>(null);
    const latestOverviewRequestIdRef = useRef(0);
    const lastRealtimeErrorMessageRef = useRef<string | null>(null);

    const dashboardOverviewQuery = useMemo(
        () => buildDashboardOverviewQuery(selectedDateRange),
        [selectedDateRange],
    );
    const dashboardDateRangeKey = useMemo(
        () => buildDashboardDateRangeKey(selectedDateRange),
        [selectedDateRange],
    );
    const dashboardRealtimeRange = useMemo(
        () => getDashboardRealtimeRange(selectedDateRange),
        [selectedDateRange],
    );

    const disconnectDashboardRealtime = useCallback((reason = 'normal') => {
        const realtimeConnection = realtimeConnectionRef.current;
        if (!realtimeConnection) return;

        realtimeConnectionRef.current = null;
        realtimeConnection.disconnect(reason);
    }, []);

    const { loading, run: runDashboardOverviewRequest } = useRequest(
        async (query: DashboardOverviewQuery, overviewRequestId: number, dateRangeKey: string) => {
            const response = await dashboardService.getOverview(query);
            return { overviewRequestId, response, dateRangeKey };
        },
        {
            manual: true,
            onSuccess: ({ overviewRequestId, response, dateRangeKey }) => {
                if (overviewRequestId !== latestOverviewRequestIdRef.current) return;

                setDashboardOverviewSnapshot({
                    dateRangeKey,
                    overview: response.data,
                });
                lastRealtimeErrorMessageRef.current = null;
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '获取控制台数据失败';
                message.error(errorMessage);
            },
        },
    );

    const loadDashboardOverview = useCallback(() => {
        latestOverviewRequestIdRef.current += 1;
        void runDashboardOverviewRequest(
            dashboardOverviewQuery,
            latestOverviewRequestIdRef.current,
            dashboardDateRangeKey,
        );
    }, [dashboardDateRangeKey, dashboardOverviewQuery, runDashboardOverviewRequest]);

    const connectDashboardRealtime = useCallback(
        (dashboardRange: DashboardRange) => {
            disconnectDashboardRealtime('reconnect');

            const realtimeConnection = dashboardService.createRealtimeSocket(dashboardRange, {
                onMessage: (realtimeMessage) => {
                    if (!realtimeMessage) return;

                    if (realtimeMessage.type === 'dashboard:error') {
                        const errorMessage = realtimeMessage.message || '控制台实时连接异常';

                        if (lastRealtimeErrorMessageRef.current !== errorMessage) {
                            message.error(errorMessage);
                            lastRealtimeErrorMessageRef.current = errorMessage;
                        }

                        return;
                    }

                    if (realtimeMessage.payload) {
                        lastRealtimeErrorMessageRef.current = null;
                        setDashboardOverviewSnapshot({
                            dateRangeKey: dashboardDateRangeKey,
                            overview: realtimeMessage.payload,
                        });
                    }
                },
                onClose: () => {
                    realtimeConnectionRef.current = null;
                },
            });
            if (!realtimeConnection) return;

            realtimeConnectionRef.current = realtimeConnection;
        },
        [dashboardDateRangeKey, disconnectDashboardRealtime],
    );

    useEffect(() => {
        lastRealtimeErrorMessageRef.current = null;
    }, [dashboardDateRangeKey]);

    useEffect(() => {
        if (!isDocumentVisible) {
            disconnectDashboardRealtime('hidden');
            return;
        }

        loadDashboardOverview();

        if (!dashboardRealtimeRange) {
            disconnectDashboardRealtime('custom-range');
            return;
        }

        connectDashboardRealtime(dashboardRealtimeRange);

        return () => {
            disconnectDashboardRealtime('cleanup');
        };
    }, [
        connectDashboardRealtime,
        dashboardRealtimeRange,
        disconnectDashboardRealtime,
        isDocumentVisible,
        loadDashboardOverview,
    ]);

    const dashboardPageData = useMemo(() => {
        if (
            !dashboardOverviewSnapshot ||
            dashboardOverviewSnapshot.dateRangeKey !== dashboardDateRangeKey
        ) {
            return null;
        }

        return mapDashboardOverviewToPageData(
            dashboardOverviewSnapshot.overview,
            dashboardMetricCardTemplates,
        );
    }, [dashboardDateRangeKey, dashboardOverviewSnapshot]);

    return {
        dashboardPageData,
        loading,
    };
};
