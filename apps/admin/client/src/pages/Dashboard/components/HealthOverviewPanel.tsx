import { useMemo } from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { Col } from 'antd';
import { getGaugeChartOption } from '../chart-options';
import type { HealthGaugeItem } from '../types';
import { EChart } from './EChart';
import styles from '../index.module.less';

interface HealthOverviewPanelProps {
    items: HealthGaugeItem[];
}

export function HealthOverviewPanel({ items }: HealthOverviewPanelProps) {
    const gaugeOptions = useMemo(
        () =>
            items.map((item) => ({
                key: item.key,
                label: item.label,
                option: getGaugeChartOption(item),
            })),
        [items],
    );

    return (
        <Col xs={24} lg={8}>
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <SyncOutlined />
                        <span>系统健康概览（实时）</span>
                    </div>
                </div>

                <div className={styles.gaugeRow}>
                    {gaugeOptions.map((item) => (
                        <div key={item.key} className={styles.gaugeItem}>
                            <span className={styles.gaugeLabel}>{item.label}</span>
                            <EChart option={item.option} className={styles.gaugeChart} />
                        </div>
                    ))}
                </div>
            </section>
        </Col>
    );
}
