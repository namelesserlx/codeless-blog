import { DetailPanel } from './components/DetailPanel';
import { FilterPanel } from './components/FilterPanel';
import { MetricCards } from './components/MetricCards';
import { OverviewPanel } from './components/OverviewPanel';
import { TablePanel } from './components/TablePanel';
import { useArticleReportData } from './hooks/useArticleReportData';
import { useArticleReportFilters } from './hooks/useArticleReportFilters';
import styles from './index.module.less';

export default function ArticleReportPage() {
    const { initialValues, filters, onSearch, onReset } = useArticleReportFilters();

    const {
        authorOptions,
        tagOptions,
        articleRows,
        articleTotal,
        selectedArticle,
        selectedArticleId,
        onArticleSelect,
        rangeLabel,
        overviewTrend,
        overviewMetrics,
        selectedArticleOption,
        selectedArticleTrendLoading,
        loadMoreArticles,
        hasMoreArticles,
        articleListLoading,
        loading,
    } = useArticleReportData({ filters });

    return (
        <div className={styles.pageShell}>
            <div className={styles.pageContainer}>
                <FilterPanel
                    initialValues={initialValues}
                    authorOptions={authorOptions}
                    tagOptions={tagOptions}
                    loading={loading}
                    onSearch={onSearch}
                    onReset={onReset}
                />

                <MetricCards metrics={overviewMetrics} />

                <OverviewPanel
                    articleCount={articleTotal}
                    rangeLabel={rangeLabel}
                    points={overviewTrend}
                />

                <TablePanel
                    articleRows={articleRows}
                    articleTotal={articleTotal}
                    selectedArticleId={selectedArticleId}
                    loading={loading}
                    loadingMore={articleListLoading && articleRows.length > 0}
                    hasMore={hasMoreArticles}
                    onArticleSelect={onArticleSelect}
                    onLoadMore={loadMoreArticles}
                />

                <DetailPanel
                    selectedArticle={selectedArticle}
                    option={selectedArticleOption}
                    loading={selectedArticleTrendLoading}
                />
            </div>
        </div>
    );
}
