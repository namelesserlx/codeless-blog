import { LineChartOutlined } from '@ant-design/icons';
import { Col } from 'antd';
import type { FunnelStageItem } from '../types';
import styles from '../index.module.less';

interface ContentFunnelPanelProps {
    stages: FunnelStageItem[];
}

export function ContentFunnelPanel({ stages }: ContentFunnelPanelProps) {
    return (
        <Col xs={24} lg={8}>
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <LineChartOutlined />
                        <span>内容生产漏斗（实时）</span>
                    </div>
                </div>

                <div className={styles.funnelList}>
                    {stages.map((stage) => (
                        <div key={stage.key} className={styles.funnelItem}>
                            <div className={styles.funnelTop}>
                                <span className={styles.funnelStep}>{stage.step}</span>
                                <div className={styles.funnelCountWrap}>
                                    <span className={styles.funnelCount}>{stage.count}</span>
                                    <span className={styles.funnelUnit}>篇</span>
                                </div>
                            </div>
                            <div className={styles.funnelProgressRow}>
                                <div className={styles.funnelTrack}>
                                    <div
                                        className={styles.funnelFill}
                                        style={{
                                            width: `${stage.conversionRate}%`,
                                            background: stage.color,
                                        }}
                                    />
                                </div>
                                <span className={styles.funnelPercent}>
                                    {stage.conversionRate}%
                                </span>
                            </div>
                            <div className={styles.funnelMeta}>
                                <span>
                                    {stage.key === 'draft'
                                        ? '基准层'
                                        : `较上层转化 ${stage.conversionRate}%`}
                                </span>
                                <span>平均停留 {stage.avgStayHours}h</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.panelFooterMuted}>查看内容转化详细分析 →</div>
            </section>
        </Col>
    );
}
