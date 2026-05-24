import { useMemo } from 'react';
import { BellOutlined } from '@ant-design/icons';
import { Col } from 'antd';
import { getDashboardPresetRange } from '../dashboard-date-range';
import { getTrendChartOption } from '../chart-options';
import { EChart } from './EChart';
import type { DashboardDateRange, TrafficPoint, TrendSummaryItem } from '../types';
import styles from '../index.module.less';

const getTrendPanelTitle = (selectedDateRange: DashboardDateRange): string => {
    const selectedPresetRange = getDashboardPresetRange(selectedDateRange);

    if (selectedPresetRange) {
        if (selectedPresetRange === 'today') return '内容发布与访问趋势（今日）';
        if (selectedPresetRange === '30d') return '内容发布与访问趋势（近 30 天）';
        return '内容发布与访问趋势（近 7 天）';
    }

    return `内容发布与访问趋势（${selectedDateRange[0].format('MM/DD')} - ${selectedDateRange[1].format('MM/DD')}）`;
};

interface TrendPanelProps {
    selectedDateRange: DashboardDateRange;
    data: TrafficPoint[];
    summary: TrendSummaryItem[];
}

export function TrendPanel({ selectedDateRange, data, summary }: TrendPanelProps) {
    const option = useMemo(() => getTrendChartOption(data), [data]);
    const title = getTrendPanelTitle(selectedDateRange);

    return (
        <Col xs={24} lg={16}>
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <BellOutlined />
                        <span>{title}</span>
                    </div>
                    <span className={styles.panelExtra}>单位：访问量</span>
                </div>

                <div className={styles.trendSurface}>
                    <EChart option={option} className={styles.trendChart} />
                </div>

                <div className={styles.summaryGrid}>
                    {summary.map((item) => (
                        <div key={item.label} className={styles.summaryCard}>
                            <div className={styles.summaryLabel}>{item.label}</div>
                            <div className={styles.summaryValue}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </section>
        </Col>
    );
}
