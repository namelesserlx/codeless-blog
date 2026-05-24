import type { DashboardDisplayRange, DashboardOverviewQuery, DashboardRange } from '@blog/shared';
import {
    addDays,
    buildDateBuckets,
    formatDate,
    formatMonthDay,
    parseDateSafe,
    startOfDay,
} from '../../utils/date';
import type { DateBucket, DashboardWindow } from './types';

const RANGE_TO_DAYS: Record<DashboardRange, number> = {
    today: 1,
    '7d': 7,
    '30d': 30,
};

export const DEFAULT_DASHBOARD_QUERY: DashboardOverviewQuery = { range: '7d' };

const getWeekLabel = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const getDateBuckets = (range: DashboardRange): DateBucket[] => {
    const days = RANGE_TO_DAYS[range];
    const today = startOfDay(new Date());

    return buildDateBuckets(addDays(today, -(days - 1)), today, (date) =>
        range === 'today' ? 'Today' : getWeekLabel(date),
    );
};

const formatBucketLabel = (date: Date, range: DashboardDisplayRange): string => {
    if (range === 'today') return 'Today';
    if (range === 'custom') return formatMonthDay(date);
    return getWeekLabel(date);
};

export const resolveDashboardWindow = (query: DashboardOverviewQuery): DashboardWindow => {
    const customStart = parseDateSafe(query.startDate);
    const customEnd = parseDateSafe(query.endDate);

    if (customStart && customEnd && customStart <= customEnd) {
        const buckets = buildDateBuckets(customStart, customEnd, (date) =>
            formatBucketLabel(date, 'custom'),
        );
        const days = buckets.length;
        const currentStart = buckets[0].date;
        const currentEnd = addDays(buckets[buckets.length - 1].date, 1);
        const previousStart = addDays(currentStart, -days);
        const previousEnd = currentStart;

        return {
            range: 'custom',
            buckets,
            currentStart,
            currentEnd,
            previousStart,
            previousEnd,
            startDate: formatDate(currentStart),
            endDate: formatDate(addDays(currentEnd, -1)),
        };
    }

    const range = query.range ?? '7d';
    const buckets = getDateBuckets(range);
    const currentStart = buckets[0].date;
    const currentEnd = addDays(buckets[buckets.length - 1].date, 1);
    const previousStart = addDays(currentStart, -buckets.length);
    const previousEnd = currentStart;

    return {
        range,
        buckets,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        startDate: formatDate(currentStart),
        endDate: formatDate(addDays(currentEnd, -1)),
    };
};
