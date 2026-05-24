import { useMemo, type UIEvent } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Spin, Table, Tag } from 'antd';
import { formatDelta, formatNumber, getDeltaTone } from '../formatters';
import styles from '../index.module.less';
import type { ArticlePerformanceRow } from '../types';

interface TablePanelProps {
    articleRows: ArticlePerformanceRow[];
    articleTotal: number;
    selectedArticleId: string;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    onArticleSelect: (articleId: string) => void;
    onLoadMore: () => void;
}

function getStatusColor(status: ArticlePerformanceRow['status']) {
    if (status === '已发布') return 'green';
    if (status === '草稿') return 'gold';
    return 'blue';
}

export function TablePanel({
    articleRows,
    articleTotal,
    selectedArticleId,
    loading,
    loadingMore,
    hasMore,
    onArticleSelect,
    onLoadMore,
}: TablePanelProps) {
    const columns = useMemo<ColumnsType<ArticlePerformanceRow>>(
        () => [
            {
                title: '文章',
                dataIndex: 'title',
                key: 'title',
                width: 340,
                render: (_, record) => (
                    <div className={styles.articleCell}>
                        <div>
                            <div className={styles.articleTitle}>{record.title}</div>
                            <div className={styles.articleSummary}>{record.summary}</div>
                        </div>
                    </div>
                ),
            },
            {
                title: '作者 / 状态',
                key: 'meta',
                width: 170,
                render: (_, record) => (
                    <div className={styles.metaCell}>
                        <div className={styles.metaAuthor}>{record.author}</div>
                        <Tag color={getStatusColor(record.status)} variant="filled">
                            {record.status}
                        </Tag>
                    </div>
                ),
            },
            {
                title: '标签',
                dataIndex: 'tags',
                key: 'tags',
                width: 220,
                render: (tags: string[]) => (
                    <div className={styles.tagList}>
                        {tags.map((tag) => (
                            <Tag key={tag} variant="filled" className={styles.softTag}>
                                {tag}
                            </Tag>
                        ))}
                    </div>
                ),
            },
            {
                title: '范围 UV',
                dataIndex: 'rangeUv',
                key: 'rangeUv',
                width: 110,
                render: (value: number) => formatNumber(value),
            },
            {
                title: '评论',
                dataIndex: 'rangeComments',
                key: 'rangeComments',
                width: 90,
                render: (value: number) => formatNumber(value),
            },
            {
                title: '当前点赞',
                dataIndex: 'currentLikes',
                key: 'currentLikes',
                width: 110,
                render: (value: number) => formatNumber(value),
            },
            {
                title: 'UV 趋势',
                key: 'uvDelta',
                width: 130,
                render: (_, record) => {
                    const deltaTone = getDeltaTone(record.uvDelta, record.rangeUv);

                    return (
                        <div className={styles.deltaCell}>
                            <span
                                className={
                                    deltaTone === 'down'
                                        ? styles.deltaBadgeNegative
                                        : deltaTone === 'flat'
                                          ? styles.deltaBadgeNeutral
                                          : styles.deltaBadgePositive
                                }
                            >
                                {formatDelta(record.uvDelta, record.rangeUv)}
                            </span>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    const handleScroll = (event: UIEvent<HTMLDivElement>) => {
        if (loadingMore || !hasMore) {
            return;
        }

        const target = event.currentTarget;
        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

        if (distanceToBottom < 240) {
            onLoadMore();
        }
    };

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <div className={styles.sectionTitle}>文章表现清单</div>
                    <div className={styles.sectionHint}>
                        表格默认按范围 UV 排序，已加载 {formatNumber(articleRows.length)} /{' '}
                        {formatNumber(articleTotal)} 篇。点击行即可联动下方单篇详情。
                    </div>
                </div>
            </div>

            <div className={styles.tableWrap}>
                <Table<ArticlePerformanceRow>
                    rowKey="id"
                    columns={columns}
                    dataSource={articleRows}
                    loading={loading}
                    pagination={false}
                    virtual
                    rowClassName={(record) =>
                        record.id === selectedArticleId ? styles.selectedRow : styles.tableRow
                    }
                    onRow={(record) => ({
                        onClick: () => onArticleSelect(record.id),
                    })}
                    onScroll={handleScroll}
                    locale={{ emptyText: '没有匹配到文章，请调整筛选条件。' }}
                    scroll={{ x: 1080, y: 560 }}
                />
                <div className={styles.tableLoadState}>
                    {loadingMore ? (
                        <span className={styles.tableLoadText}>
                            <Spin size="small" /> 正在加载更多文章
                        </span>
                    ) : hasMore ? (
                        <span className={styles.tableLoadText}>继续向下滚动加载更多文章</span>
                    ) : articleRows.length > 0 ? (
                        <span className={styles.tableLoadText}>已加载全部匹配文章</span>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
