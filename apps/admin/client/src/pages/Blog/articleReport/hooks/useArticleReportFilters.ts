import { useCallback, useState } from 'react';
import {
    ARTICLE_REPORT_DEFAULT_PRESET,
    createPresetRangeByValue,
    normalizeArticleReportDateRange,
} from '../date-range';
import type { ArticleReportFilterFormValues, ArticleReportFilters } from '../types';

const INITIAL_FILTER_VALUES: ArticleReportFilterFormValues = {
    selectedDateRange: createPresetRangeByValue(ARTICLE_REPORT_DEFAULT_PRESET),
    authorFilter: undefined,
    tagFilter: undefined,
    keyword: '',
};

function toFilters(values: ArticleReportFilterFormValues): ArticleReportFilters {
    return {
        selectedDateRange: normalizeArticleReportDateRange(values.selectedDateRange),
        authorFilter: values.authorFilter,
        tagFilter: values.tagFilter,
        keyword: values.keyword?.trim() || '',
    };
}

export function useArticleReportFilters() {
    const initialValues = INITIAL_FILTER_VALUES;
    const [filters, setFilters] = useState<ArticleReportFilters>(() =>
        toFilters(INITIAL_FILTER_VALUES),
    );

    const handleSearch = useCallback((values: ArticleReportFilterFormValues) => {
        setFilters(toFilters(values));
    }, []);

    const handleReset = useCallback(() => {
        setFilters(toFilters(INITIAL_FILTER_VALUES));
    }, []);

    return {
        initialValues,
        filters,
        onSearch: handleSearch,
        onReset: handleReset,
    };
}
