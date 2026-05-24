import type { CSSProperties, ReactNode } from 'react';
import type { Dayjs } from 'dayjs';
import type { DashboardMetric, DashboardRange, DashboardTaskType } from '@blog/shared';

export type TrendDirection = 'up' | 'down';
export type TaskPriority = '高' | '中' | '低';

export interface DashboardMetricCardTemplate {
    key: DashboardMetric['key'];
    title: string;
    icon: ReactNode;
    iconStyle: CSSProperties;
}

export interface MetricItem {
    key: DashboardMetric['key'];
    title: string;
    value: string;
    suffix: string;
    icon: ReactNode;
    iconStyle: CSSProperties;
    trend: string;
    trendDirection: TrendDirection;
    hint: string;
}

export interface TrendSummaryItem {
    label: string;
    value: string;
}

export interface TrafficPoint {
    label: string;
    visits: number;
}

export interface HotArticleItem {
    title: string;
    views: string;
}

export interface HealthGaugeItem {
    key: string;
    label: string;
    value: number;
    total: number;
    activeColor: string;
    unit?: string;
}

export interface TaskItem {
    id: string;
    title: string;
    type: DashboardTaskType;
    description: string;
    priority: TaskPriority;
    targetId: string;
}

export interface FunnelStageItem {
    key: string;
    step: string;
    count: number;
    conversionRate: number;
    avgStayHours: number;
    color: string;
}

export interface DashboardRangeOption {
    label: string;
    value: DashboardRange;
}

export type DashboardDateRange = [Dayjs, Dayjs];
