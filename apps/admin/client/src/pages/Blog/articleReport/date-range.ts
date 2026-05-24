import dayjs from 'dayjs';
import type { ArticleReportDateRange, ArticleReportPresetRange } from './types';

export const ARTICLE_REPORT_TODAY = dayjs().startOf('day');
export const ARTICLE_REPORT_HISTORY_DAYS = 90;
export const ARTICLE_REPORT_DEFAULT_PRESET: ArticleReportPresetRange = '30d';

const ARTICLE_REPORT_PRESET_DAYS: Record<ArticleReportPresetRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

export const ARTICLE_REPORT_MIN_DATE = ARTICLE_REPORT_TODAY.subtract(
    ARTICLE_REPORT_HISTORY_DAYS - 1,
    'day',
);

export function createPresetRange(days: number): ArticleReportDateRange {
    return [
        ARTICLE_REPORT_TODAY.subtract(days - 1, 'day').startOf('day'),
        ARTICLE_REPORT_TODAY.endOf('day'),
    ];
}

export function createPresetRangeByValue(preset: ArticleReportPresetRange): ArticleReportDateRange {
    return createPresetRange(ARTICLE_REPORT_PRESET_DAYS[preset]);
}

export function normalizeArticleReportDateRange(
    nextDateRange: ArticleReportDateRange,
): ArticleReportDateRange {
    return [nextDateRange[0].startOf('day'), nextDateRange[1].endOf('day')];
}

export function buildPreviousRange(
    selectedDateRange: ArticleReportDateRange,
): ArticleReportDateRange {
    const days =
        selectedDateRange[1].startOf('day').diff(selectedDateRange[0].startOf('day'), 'day') + 1;

    return [
        selectedDateRange[0].subtract(days, 'day').startOf('day'),
        selectedDateRange[0].subtract(1, 'day').endOf('day'),
    ];
}

export function buildRangeLabel(selectedDateRange: ArticleReportDateRange) {
    return `${selectedDateRange[0].format('MM/DD')} - ${selectedDateRange[1].format('MM/DD')}`;
}
