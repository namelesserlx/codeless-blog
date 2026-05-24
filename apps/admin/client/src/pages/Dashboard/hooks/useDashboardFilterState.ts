import { useCallback, useState } from 'react';
import type { DashboardRange } from '@blog/shared';
import {
    createDashboardPresetDateRange,
    DEFAULT_DASHBOARD_PRESET_RANGE,
    isSameDashboardDateRange,
    normalizeDashboardSelectedDateRange,
} from '../dashboard-date-range';
import type { DashboardDateRange } from '../types';

export const useDashboardFilterState = () => {
    const [selectedDateRange, setSelectedDateRange] = useState<DashboardDateRange>(() =>
        createDashboardPresetDateRange(DEFAULT_DASHBOARD_PRESET_RANGE),
    );

    const handleRangeChange = useCallback((nextRange: DashboardRange) => {
        const nextDateRange = createDashboardPresetDateRange(nextRange);

        setSelectedDateRange((currentDateRange) =>
            isSameDashboardDateRange(currentDateRange, nextDateRange)
                ? currentDateRange
                : nextDateRange,
        );
    }, []);

    const handleDateRangeChange = useCallback((nextDateRange: DashboardDateRange | null) => {
        if (!nextDateRange) {
            setSelectedDateRange(createDashboardPresetDateRange(DEFAULT_DASHBOARD_PRESET_RANGE));
            return;
        }

        const normalizedDateRange = normalizeDashboardSelectedDateRange(nextDateRange);

        setSelectedDateRange((currentDateRange) =>
            isSameDashboardDateRange(currentDateRange, normalizedDateRange)
                ? currentDateRange
                : normalizedDateRange,
        );
    }, []);

    return {
        selectedDateRange,
        handleRangeChange,
        handleDateRangeChange,
    };
};
