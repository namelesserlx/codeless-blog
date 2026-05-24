import type { CSSProperties, ReactNode } from 'react';
import type { Dayjs } from 'dayjs';
import type {
    ArticleReportItem,
    ArticleReportListItem,
    ArticleReportListResponse,
    ArticleReportOption,
    ArticleReportOverviewResponse,
    ArticleReportPoint,
    ArticleReportResponse,
    ArticleReportStatus,
} from '@blog/shared';

export type ArticleReportDateRange = [Dayjs, Dayjs];
export type MetricKey = 'uv' | 'comments' | 'likeAdds';
export type ArticleStatus = ArticleReportStatus;
export type ArticleReportPresetRange = '7d' | '30d' | '90d';
export type ArticleReportPresetValue = ArticleReportPresetRange | 'custom';
export type ArticleOverviewMetricKey = 'articleCount' | 'uv' | 'comments' | 'likes';

export type TrendPoint = ArticleReportPoint;
export type SelectOption = ArticleReportOption;
export type ArticleReportApiResponse = ArticleReportResponse;
export type ArticleReportOverviewApiResponse = ArticleReportOverviewResponse;
export type ArticleReportListApiResponse = ArticleReportListResponse;
export type ArticleReportApiItem = ArticleReportItem;
export type ArticleReportApiListItem = ArticleReportListItem;

export interface ArticleReportFilters {
    selectedDateRange: ArticleReportDateRange;
    authorFilter?: string;
    tagFilter?: string;
    keyword: string;
}

export interface ArticleReportFilterFormValues {
    selectedDateRange: ArticleReportDateRange;
    authorFilter?: string;
    tagFilter?: string;
    keyword?: string;
}

export interface MetricDefinition {
    key: MetricKey;
    label: string;
    color: string;
    areaStart: string;
    areaEnd: string;
    axisFormatter: (value: number) => string;
    valueFormatter: (value: number) => string;
    tooltipSuffix: string;
}

export interface ArticlePerformanceRow {
    id: string;
    title: string;
    summary: string;
    author: string;
    status: ArticleStatus;
    tags: string[];
    updatedAt: string;
    publishedAt: string;
    rangeUv: number;
    rangeComments: number;
    currentLikes: number;
    uvDelta: number | null;
    coverTone: string;
}

export interface ArticleReportPresetOption {
    label: string;
    value: ArticleReportPresetRange;
}

export interface ArticleDetailLegendItem {
    key: MetricKey;
    label: string;
    color: string;
}

export interface OverviewMetricCardTemplate {
    key: ArticleOverviewMetricKey;
    label: string;
    icon: ReactNode;
    iconStyle: CSSProperties;
}

export interface OverviewMetricItem extends OverviewMetricCardTemplate {
    value: string;
    hint: string;
    delta: string;
}
