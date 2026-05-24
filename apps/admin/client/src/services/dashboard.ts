import request from '@/utils/request';
import {
    createWebSocketConnection,
    type WebSocketConnection,
    type WebSocketOptions,
} from '@/utils/websocket';
import type {
    DashboardOverviewQuery,
    DashboardOverviewResponse,
    DashboardRange,
    DashboardRealtimeMessage,
} from '@blog/shared';

type RealtimeSocketCallbacks = Pick<
    WebSocketOptions<DashboardRealtimeMessage>,
    'onMessage' | 'onClose' | 'onError' | 'onOpen'
>;

export class DashboardService {
    async getOverview(params: DashboardOverviewQuery) {
        return request<DashboardOverviewResponse>({
            url: '/dashboard/overview',
            method: 'GET',
            params,
        });
    }

    createRealtimeSocket(
        presetRange: DashboardRange,
        callbacks?: RealtimeSocketCallbacks,
    ): WebSocketConnection | null {
        const token = localStorage.getItem('token') || '';
        if (!token) {
            return null;
        }

        return createWebSocketConnection<DashboardRealtimeMessage>({
            pathname: '/ws/dashboard',
            searchParams: { token, range: presetRange },
            ...callbacks,
        });
    }
}

export const dashboardService = new DashboardService();
