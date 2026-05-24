import { Empty, Row, Spin } from 'antd';
import { ContentFunnelPanel } from './components/ContentFunnelPanel';
import { DashboardHeader } from './components/DashboardHeader';
import { HealthOverviewPanel } from './components/HealthOverviewPanel';
import { HotArticlesPanel } from './components/HotArticlesPanel';
import { MetricCards } from './components/MetricCards';
import { PendingTasksPanel } from './components/PendingTasksPanel';
import { TrendPanel } from './components/TrendPanel';
import { useDashboardFilterState } from './hooks/useDashboardFilterState';
import { useDashboardOverviewData } from './hooks/useDashboardOverviewData';
import styles from './index.module.less';

function DashboardPage() {
    const { selectedDateRange, handleRangeChange, handleDateRangeChange } =
        useDashboardFilterState();
    const { dashboardPageData, loading } = useDashboardOverviewData({
        selectedDateRange,
    });

    return (
        <div className={styles.dashboardShell}>
            <div className={styles.dashboardContainer}>
                <DashboardHeader
                    selectedDateRange={selectedDateRange}
                    onRangeChange={handleRangeChange}
                    onDateRangeChange={handleDateRangeChange}
                />

                {dashboardPageData ? (
                    <>
                        <MetricCards metrics={dashboardPageData.metrics} />

                        <Row gutter={[16, 16]}>
                            <TrendPanel
                                selectedDateRange={selectedDateRange}
                                data={dashboardPageData.trafficData}
                                summary={dashboardPageData.trendSummary}
                            />
                            <HotArticlesPanel articles={dashboardPageData.topArticles} />
                        </Row>

                        <Row gutter={[16, 16]}>
                            <HealthOverviewPanel items={dashboardPageData.healthGauges} />
                            <PendingTasksPanel tasks={dashboardPageData.pendingTasks} />
                            <ContentFunnelPanel stages={dashboardPageData.funnelStages} />
                        </Row>
                    </>
                ) : (
                    <div
                        style={{
                            minHeight: 360,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {loading ? <Spin size="large" /> : <Empty description="暂无控制台数据" />}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DashboardPage;
