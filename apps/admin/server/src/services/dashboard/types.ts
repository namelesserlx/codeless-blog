import type {
    DashboardDisplayRange,
    DashboardHotArticle,
    DashboardRange,
    DashboardTaskItem,
    DashboardTrendPoint,
} from '@blog/shared';

export interface DateBucket {
    date: Date;
    key: string;
    label: string;
}

export interface DashboardWindow {
    range: DashboardDisplayRange;
    buckets: DateBucket[];
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
    startDate: string;
    endDate: string;
}

export interface PendingPostUvSnapshot {
    total: number;
    byDate: Map<string, number>;
    byPostIdInRange: Map<string, number>;
}

export interface ContentModuleData {
    article: {
        total: number;
        published: number;
        draft: number;
        currentNew: number;
        previousNew: number;
    };
    snippet: {
        total: number;
        published: number;
        draft: number;
        currentNew: number;
        previousNew: number;
    };
    comment: {
        total: number;
        pending: number;
        currentNew: number;
        previousNew: number;
    };
}

export interface TrafficModuleData {
    totalViews: number;
    currentWindowViews: number;
    previousWindowViews: number;
    trendPoints: DashboardTrendPoint[];
    peakDailyVisits: number;
    avgReadSeconds: number;
    hotArticles: DashboardHotArticle[];
}

export interface FunnelModuleData {
    reviewCount: number;
    readyCount: number;
    draftAvgStay: number;
    reviewAvgStay: number;
    readyAvgStay: number;
    publishedAvgStay: number;
}

export interface PendingCommentTaskRow {
    id: number;
    content: string;
    createdAt: Date;
    post: {
        title: string;
    } | null;
    snippet: {
        title: string | null;
    } | null;
}

export interface PendingArticleTaskRow {
    id: string;
    title: string;
    updatedAt: Date;
}

export interface PendingSnippetTaskRow {
    id: string;
    title: string | null;
    content: string;
    updatedAt: Date;
}

export interface ArticleViewCountRow {
    postId: string;
    _count: {
        postId: number;
    };
}

export interface DailyViewCountRow {
    viewedAt: Date;
    _count: {
        _all: number;
    };
}

export type PendingTasks = DashboardTaskItem[];
