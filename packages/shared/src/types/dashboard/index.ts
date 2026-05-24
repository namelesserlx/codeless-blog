export type DashboardRange = 'today' | '7d' | '30d';
export type DashboardDisplayRange = DashboardRange | 'custom';

export const DASHBOARD_RANGES: DashboardRange[] = ['today', '7d', '30d'];

export const isDashboardRange = (value: string): value is DashboardRange =>
    DASHBOARD_RANGES.includes(value as DashboardRange);

export interface DashboardMetric {
    key: 'article' | 'snippet' | 'comment' | 'view';
    total: number;
    unit: string;
    trend: number;
    hint: string;
}

export interface DashboardTrendPoint {
    date: string;
    label: string;
    visits: number;
}

export interface DashboardTrendSummary {
    totalVisits: number;
    peakDailyVisits: number;
    avgReadSeconds: number;
}

export interface DashboardHotArticle {
    id: string;
    title: string;
    views: number;
}

export interface DashboardHealthGauge {
    key: 'cpu' | 'memory' | 'queue';
    label: string;
    value: number;
    total: number;
    activeColor: string;
    unit?: string;
}

export type DashboardTaskPriority = '高' | '中' | '低';

export enum DashboardTaskType {
    COMMENT_REVIEW = 'COMMENT_REVIEW',
    ARTICLE_DRAFT_PUBLISH = 'ARTICLE_DRAFT_PUBLISH',
    SNIPPET_DRAFT_PUBLISH = 'SNIPPET_DRAFT_PUBLISH',
}

export const DashboardTaskTypeLabels: Record<DashboardTaskType, string> = {
    [DashboardTaskType.COMMENT_REVIEW]: '评论审核',
    [DashboardTaskType.ARTICLE_DRAFT_PUBLISH]: '文章草稿',
    [DashboardTaskType.SNIPPET_DRAFT_PUBLISH]: '片段草稿',
};

export interface DashboardTaskItem {
    id: string;
    title: string;
    type: DashboardTaskType;
    description: string;
    priority: DashboardTaskPriority;
    targetId: string;
}

export interface DashboardFunnelStage {
    key: 'draft' | 'review' | 'ready' | 'published';
    step: string;
    count: number;
    conversionRate: number;
    avgStayHours: number;
    color: string;
}

export interface DashboardOverviewQuery {
    range?: DashboardRange;
    startDate?: string;
    endDate?: string;
}

export interface DashboardOverviewResponse {
    range: DashboardDisplayRange;
    startDate?: string;
    endDate?: string;
    metrics: DashboardMetric[];
    trend: {
        points: DashboardTrendPoint[];
        summary: DashboardTrendSummary;
    };
    hotArticles: DashboardHotArticle[];
    healthGauges: DashboardHealthGauge[];
    pendingTasks: DashboardTaskItem[];
    funnelStages: DashboardFunnelStage[];
    generatedAt: string;
}

export type DashboardRealtimeMessageType =
    | 'dashboard:init'
    | 'dashboard:update'
    | 'dashboard:error'
    | 'dashboard:pong';

export interface DashboardRealtimeMessage {
    type: DashboardRealtimeMessageType;
    ts: string;
    payload?: DashboardOverviewResponse;
    message?: string;
}

export interface DashboardSubscribeMessage {
    type: 'dashboard:subscribe';
    range: DashboardRange;
}

export interface DashboardPingMessage {
    type: 'dashboard:ping';
}

export type DashboardClientMessage = DashboardSubscribeMessage | DashboardPingMessage;
