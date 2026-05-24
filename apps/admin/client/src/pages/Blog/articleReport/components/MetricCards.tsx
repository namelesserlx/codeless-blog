import styles from '../index.module.less';
import type { OverviewMetricItem } from '../types';

interface MetricCardsProps {
    metrics: OverviewMetricItem[];
}

export function MetricCards({ metrics }: MetricCardsProps) {
    return (
        <section className={styles.metricsGrid}>
            {metrics.map((item) => (
                <article key={item.key} className={styles.metricCard}>
                    <div className={styles.metricTop}>
                        <div>
                            <div className={styles.metricLabel}>{item.label}</div>
                            <div className={styles.metricValue}>{item.value}</div>
                        </div>
                        <span className={styles.metricIcon} style={item.iconStyle}>
                            {item.icon}
                        </span>
                    </div>
                    <div className={styles.metricBottom}>
                        <span
                            className={
                                item.delta.startsWith('↓')
                                    ? styles.deltaTextDown
                                    : item.delta.startsWith('→')
                                      ? styles.deltaTextFlat
                                      : styles.deltaTextUp
                            }
                        >
                            {item.delta}
                        </span>
                        <span className={styles.metricHint}>{item.hint}</span>
                    </div>
                </article>
            ))}
        </section>
    );
}
