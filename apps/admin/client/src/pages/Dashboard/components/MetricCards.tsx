import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import classNames from 'classnames';
import type { MetricItem } from '../types';
import styles from '../index.module.less';

interface MetricCardsProps {
    metrics: MetricItem[];
}

export function MetricCards({ metrics }: MetricCardsProps) {
    return (
        <Row gutter={[16, 16]}>
            {metrics.map((metric) => (
                <Col key={metric.key} xs={24} sm={12} lg={6}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricTop}>
                            <div>
                                <div className={styles.metricLabel}>{metric.title}</div>
                                <div className={styles.metricValueRow}>
                                    <span className={styles.metricValue}>{metric.value}</span>
                                    <span className={styles.metricSuffix}>{metric.suffix}</span>
                                </div>
                            </div>
                            <div className={styles.metricIcon} style={metric.iconStyle}>
                                {metric.icon}
                            </div>
                        </div>

                        <div className={styles.metricBottom}>
                            <span
                                className={classNames(styles.metricChange, {
                                    [styles.metricChangeUp]: metric.trendDirection === 'up',
                                    [styles.metricChangeDown]: metric.trendDirection === 'down',
                                })}
                            >
                                {metric.trendDirection === 'up' ? (
                                    <ArrowUpOutlined />
                                ) : (
                                    <ArrowDownOutlined />
                                )}
                                {metric.trend}
                            </span>
                            <span className={styles.metricHint}>{metric.hint}</span>
                        </div>
                    </div>
                </Col>
            ))}
        </Row>
    );
}
