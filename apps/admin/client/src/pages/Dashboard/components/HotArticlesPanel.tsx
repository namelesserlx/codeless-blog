import { TrophyOutlined } from '@ant-design/icons';
import { Col, Empty, Typography } from 'antd';
import classNames from 'classnames';
import type { HotArticleItem } from '../types';
import styles from '../index.module.less';

const { Text } = Typography;

interface HotArticlesPanelProps {
    articles: HotArticleItem[];
}

export function HotArticlesPanel({ articles }: HotArticlesPanelProps) {
    const hasArticles = articles.length > 0;

    return (
        <Col xs={24} lg={8}>
            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <TrophyOutlined />
                        <span>热门文章排行</span>
                    </div>
                    <span className={styles.panelExtra}>{hasArticles ? 'TOP 5' : '暂无数据'}</span>
                </div>

                <div className={styles.hotList}>
                    {hasArticles ? (
                        articles.map((article, index) => (
                            <div key={article.title} className={styles.hotItem}>
                                <div className={styles.hotLeft}>
                                    <span
                                        className={classNames(styles.hotIndex, {
                                            [styles.hotIndexFirst]: index === 0,
                                            [styles.hotIndexSecond]: index === 1,
                                            [styles.hotIndexThird]: index === 2,
                                        })}
                                    >
                                        {index + 1}
                                    </span>
                                    <Text className={styles.hotTitle}>{article.title}</Text>
                                </div>
                                <Text className={styles.hotViews}>{article.views}</Text>
                            </div>
                        ))
                    ) : (
                        <div className={styles.hotEmptyWrap}>
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="暂无热门文章访问数据"
                            />
                            <Text className={styles.hotEmptyHint}>
                                有文章访问记录后，这里会自动显示前 5 名排行。
                            </Text>
                        </div>
                    )}
                </div>

                <div className={styles.panelFooterLink}>
                    {hasArticles ? '查看完整排行及数据报表 →' : '暂无可查看的排行数据'}
                </div>
            </section>
        </Col>
    );
}
