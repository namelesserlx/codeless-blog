import type {
    DashboardClientMessage,
    DashboardRange,
    DashboardRealtimeMessage,
    DashboardRealtimeMessageType,
    DashboardSubscribeMessage,
} from '@blog/shared';
import { isDashboardRange } from '@blog/shared';
import type { RawData } from 'ws';
import type { JwtPayload } from '../../types/auth';
import type { Channel, WsContext } from '../../lib/websocket';
import { env } from '../../config/env';
import { authenticateSocketRequest } from '../auth';
import { dashboardService } from './index';
import { AuthError, ErrorCode } from '../../types/errors';

const DASHBOARD_WEBSOCKET_PATH = '/ws/dashboard';
const DASHBOARD_PUSH_INTERVAL_MS = env.dashboard.pushIntervalMs;

interface DashboardState {
    range: DashboardRange;
    sessionId: string;
    userId: number;
    pushInterval?: NodeJS.Timeout;
}

const resolveRange = (rawRange: string | null): DashboardRange => {
    return rawRange && isDashboardRange(rawRange) ? rawRange : '7d';
};

const parseClientMessage = (rawData: RawData): DashboardClientMessage | null => {
    try {
        const text =
            typeof rawData === 'string'
                ? rawData
                : Array.isArray(rawData)
                  ? Buffer.concat(rawData).toString('utf-8')
                  : rawData instanceof ArrayBuffer
                    ? Buffer.from(rawData).toString('utf-8')
                    : rawData.toString('utf-8');
        return JSON.parse(text) as DashboardClientMessage;
    } catch {
        return null;
    }
};

const sendMessage = (
    ctx: WsContext<DashboardState, JwtPayload>,
    type: DashboardRealtimeMessageType,
    payload?: DashboardRealtimeMessage['payload'],
    message?: string,
) => {
    ctx.sendJson({
        type,
        ts: new Date().toISOString(),
        payload,
        message,
    } satisfies DashboardRealtimeMessage);
};

const stopPush = (ctx: WsContext<DashboardState, JwtPayload>) => {
    const state = ctx.state;

    if (!state.pushInterval) {
        return;
    }

    clearInterval(state.pushInterval);
    state.pushInterval = undefined;
};

const pushSnapshot = async (
    ctx: WsContext<DashboardState, JwtPayload>,
    type: DashboardRealtimeMessageType,
) => {
    const state = ctx.state;

    try {
        const payload = await dashboardService.getOverview({ range: state.range });
        sendMessage(ctx, type, payload);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '控制台数据推送失败';
        sendMessage(ctx, 'dashboard:error', undefined, errorMessage);
    }
};

const startPush = (ctx: WsContext<DashboardState, JwtPayload>) => {
    stopPush(ctx);

    const state = ctx.state;
    state.pushInterval = setInterval(() => {
        void pushSnapshot(ctx, 'dashboard:update');
    }, DASHBOARD_PUSH_INTERVAL_MS);
};

const handleSubscribe = (
    ctx: WsContext<DashboardState, JwtPayload>,
    message: DashboardSubscribeMessage,
) => {
    ctx.state.range = resolveRange(message.range);
    void pushSnapshot(ctx, 'dashboard:update');
};

export const dashboardChannel: Channel<DashboardState, JwtPayload> = {
    path: DASHBOARD_WEBSOCKET_PATH,
    authenticate: authenticateSocketRequest,
    createState: ({ requestUrl, user }) => {
        if (!user) {
            throw new AuthError(
                ErrorCode.UNAUTHORIZED,
                'Dashboard websocket requires authentication',
            );
        }

        return {
            range: resolveRange(requestUrl.searchParams.get('range')),
            sessionId: user.session,
            userId: user.id,
        };
    },
    onConnect: (ctx) => {
        void pushSnapshot(ctx, 'dashboard:init');
        startPush(ctx);
    },
    onMessage: (ctx, rawData) => {
        const message = parseClientMessage(rawData);
        if (!message) {
            return;
        }

        if (message.type === 'dashboard:subscribe') {
            handleSubscribe(ctx, message);
            return;
        }

        if (message.type === 'dashboard:ping') {
            sendMessage(ctx, 'dashboard:pong');
        }
    },
    onClose: (ctx) => {
        stopPush(ctx);
    },
    onError: (ctx) => {
        stopPush(ctx);
    },
};
