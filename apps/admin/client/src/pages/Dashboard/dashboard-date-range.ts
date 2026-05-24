import dayjs from 'dayjs';
import type { DashboardRange } from '@blog/shared';
import type { DashboardDateRange } from './types';

export const DEFAULT_DASHBOARD_PRESET_RANGE: DashboardRange = '7d';

const normalizeDashboardDateRange = (dateRange: DashboardDateRange): DashboardDateRange => [
    dateRange[0].startOf('day'),
    dateRange[1].endOf('day'),
];

export const createDashboardPresetDateRange = (range: DashboardRange): DashboardDateRange => {
    const today = dayjs();

    if (range === 'today') {
        return normalizeDashboardDateRange([today, today]);
    }

    if (range === '30d') {
        return normalizeDashboardDateRange([today.subtract(29, 'day'), today]);
    }

    return normalizeDashboardDateRange([today.subtract(6, 'day'), today]);
};

export const isSameDashboardDateRange = (
    leftDateRange: DashboardDateRange,
    rightDateRange: DashboardDateRange,
) => {
    return (
        leftDateRange[0].isSame(rightDateRange[0], 'day') &&
        leftDateRange[1].isSame(rightDateRange[1], 'day')
    );
};

export const getDashboardPresetRange = (
    selectedDateRange: DashboardDateRange,
): DashboardRange | null => {
    const presetRanges: DashboardRange[] = ['today', '7d', '30d'];

    for (const presetRange of presetRanges) {
        const presetDateRange = createDashboardPresetDateRange(presetRange);

        if (isSameDashboardDateRange(selectedDateRange, presetDateRange)) {
            return presetRange;
        }
    }

    return null;
};

export const buildDashboardDateRangeKey = (selectedDateRange: DashboardDateRange): string => {
    return [
        selectedDateRange[0].format('YYYY-MM-DD'),
        selectedDateRange[1].format('YYYY-MM-DD'),
    ].join(':');
};

export const normalizeDashboardSelectedDateRange = (
    selectedDateRange: DashboardDateRange,
): DashboardDateRange => normalizeDashboardDateRange(selectedDateRange);
