import { Spin, Tag } from 'antd';
import type { EChartsOption } from 'echarts/types/dist/option';
import { EChart } from '@/pages/Dashboard/components/EChart';
import { ARTICLE_DETAIL_LEGEND } from '../config';
import { formatNumber } from '../formatters';
import styles from '../index.module.less';
import type { ArticlePerformanceRow } from '../types';

interface DetailPanelProps {
    selectedArticle: ArticlePerformanceRow | null;
    option: EChartsOption;
    loading: boolean;
}

export function DetailPanel({ selectedArticle, option, loading }: DetailPanelProps) {
    if (!selectedArticle) return null;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <div className={styles.sectionTitle}>单篇文章详情</div>
                    <div className={styles.sectionHint}>
                        当前选中《{selectedArticle.title}
                        》，沿用顶部筛选范围查看真正有意义的单篇数据。
                    </div>
                </div>
                <Tag color="gold" variant="filled">
                    单篇视角
                </Tag>
            </div>

            <div className={styles.selectedHero}>
                <div className={styles.selectedIdentity}>
                    <span className={styles.selectedBadge}>
                        {selectedArticle.title.slice(0, 1)}
                    </span>
                    <div>
                        <div className={styles.selectedTitle}>{selectedArticle.title}</div>
                        <div className={styles.selectedMeta}>
                            {selectedArticle.author} · {selectedArticle.publishedAt} · 最近更新{' '}
                            {selectedArticle.updatedAt}
                        </div>
                    </div>
                </div>
                <div className={styles.inlineTags}>
                    {selectedArticle.tags.map((tag) => (
                        <Tag key={tag} variant="filled" className={styles.softTag}>
                            {tag}
                        </Tag>
                    ))}
                </div>
            </div>

            <div className={styles.selectedStats}>
                <div className={styles.selectedStat}>
                    <span className={styles.selectedStatLabel}>范围 UV</span>
                    <strong>{formatNumber(selectedArticle.rangeUv)}</strong>
                </div>
                <div className={styles.selectedStat}>
                    <span className={styles.selectedStatLabel}>评论数</span>
                    <strong>{formatNumber(selectedArticle.rangeComments)}</strong>
                </div>
                <div className={styles.selectedStat}>
                    <span className={styles.selectedStatLabel}>当前点赞</span>
                    <strong>{formatNumber(selectedArticle.currentLikes)}</strong>
                </div>
            </div>

            <div className={styles.chartWrap}>
                {loading ? (
                    <div className={styles.chartLoading}>
                        <Spin />
                    </div>
                ) : (
                    <EChart option={option} className={styles.chart} />
                )}
            </div>

            <div className={styles.chartLegendHints}>
                {ARTICLE_DETAIL_LEGEND.map((item) => (
                    <div key={item.key} className={styles.chartLegendItem}>
                        <span
                            className={styles.chartLegendDot}
                            style={{ background: item.color }}
                        />
                        <span className={styles.chartLegendLabel}>{item.label}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
