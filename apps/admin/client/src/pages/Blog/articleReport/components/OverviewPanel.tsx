import { useMemo, useState } from 'react';
import { LineChartOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import { EChart } from '@/pages/Dashboard/components/EChart';
import { METRICS } from '../config';
import { buildTrendOption } from '../chart-options';
import { getMetricDefinition } from '../page-data';
import styles from '../index.module.less';
import type { MetricKey, TrendPoint } from '../types';

interface OverviewPanelProps {
    articleCount: number;
    rangeLabel: string;
    points: TrendPoint[];
}

export function OverviewPanel({ articleCount, rangeLabel, points }: OverviewPanelProps) {
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('uv');
    const metricDefinition = useMemo(() => getMetricDefinition(selectedMetric), [selectedMetric]);
    const option = useMemo(
        () => buildTrendOption(points, metricDefinition),
        [metricDefinition, points],
    );

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <div className={styles.sectionTitle}>全部文章趋势</div>
                    <div className={styles.sectionHint}>
                        当前展示 {articleCount} 篇文章在 {rangeLabel} 内的 {metricDefinition.label}{' '}
                        汇总走势。
                    </div>
                </div>
                <div className={styles.panelActionGroup}>
                    <span className={styles.panelActionLabel}>
                        <LineChartOutlined />
                        趋势指标
                    </span>
                    <Segmented
                        value={selectedMetric}
                        options={METRICS.map((metric) => ({
                            label: metric.label,
                            value: metric.key,
                        }))}
                        onChange={(value) => setSelectedMetric(value as MetricKey)}
                    />
                </div>
            </div>
            <div className={styles.chartWrap}>
                <EChart option={option} className={styles.chart} />
            </div>
        </section>
    );
}
