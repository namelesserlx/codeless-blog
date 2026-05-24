'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArticleCardLarge } from './ArticleCardLarge';
import { ArticleCardSmall } from './ArticleCardSmall';
import { ArticleCardProps, ArticleListItem } from '@/types';
import { CardType } from '@blog/shared';
import { transformArticleData } from '@/lib/shared/utils';
import { CheckCircle2 } from 'lucide-react';

interface ArticleListProps {
    initialArticles: ArticleCardProps[];
    initialHasMore: boolean;
    tag?: string;
}

interface ApiResponse {
    articles: ArticleListItem[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

const PAGE_SIZE = 10;

/**
 * 智能布局函数：按栅格展示顺序整理文章
 * 确保大头图独占一行，小头图必须成对显示（除非是最后一个）
 *
 * 规则：
 * 1. 大头图总是独占一行（col-span-2）
 * 2. 小头图必须成对显示在同一行（两个 col-span-1）
 * 3. 只有当没有更多文章时，才允许小头图单独占一行
 */
function processArticlesForLayout(
    articles: ArticleCardProps[],
    isLastPage: boolean,
): ArticleCardProps[] {
    const processed: ArticleCardProps[] = [];
    let pendingSmallCard: ArticleCardProps | null = null;

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const isLastArticle = i === articles.length - 1;

        if (article.cardType === CardType.LARGE_IMAGE) {
            // 遇到大头图时：
            // - 如果有待配对的小头图，且这是最后一页的最后一个文章，先输出小头图
            // - 否则，小头图继续等待，不输出
            if (pendingSmallCard && isLastPage && isLastArticle) {
                // 最后一页的最后一个文章，可以单独输出小头图
                processed.push(pendingSmallCard);
                pendingSmallCard = null;
            }
            // 大头图独占一行
            processed.push(article);
        } else {
            // 小头图
            if (pendingSmallCard) {
                // 配对成功：两个小头图在同一行
                processed.push(pendingSmallCard);
                processed.push(article);
                pendingSmallCard = null;
            } else {
                // 等待配对
                // 如果这是最后一页的最后一个文章，可以单独输出
                if (isLastPage && isLastArticle) {
                    processed.push(article);
                } else {
                    // 否则，等待配对
                    pendingSmallCard = article;
                }
            }
        }
    }

    // 处理最后一个待配对的小头图（只有在最后一页时才输出）
    // 这处理了循环结束后仍然有待配对小头图的情况
    if (pendingSmallCard && isLastPage) {
        processed.push(pendingSmallCard);
    }

    return processed;
}

export function ArticleList({ initialArticles, initialHasMore, tag }: ArticleListProps) {
    const [articles, setArticles] = useState<ArticleCardProps[]>(initialArticles);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const observerTarget = useRef<HTMLDivElement>(null);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const nextPage = page + 1;
            const params = new URLSearchParams({
                page: nextPage.toString(),
                pageSize: PAGE_SIZE.toString(),
            });
            if (tag) {
                params.append('tag', tag);
            }

            const response = await fetch(`/api/posts?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to load articles');
            }

            const data: ApiResponse = await response.json();
            const newArticles = data.articles.map(transformArticleData);

            setArticles((prev) => [...prev, ...newArticles]);
            setPage(nextPage);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('加载文章失败:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, page, tag]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            {
                rootMargin: '200px', // 提前200px开始加载
                threshold: 0.1,
            },
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [loadMore, hasMore, loading]);

    // 处理文章展示顺序：使用 useMemo 优化性能
    // 只有在没有更多文章时，才允许小头图单独占一行
    const processedArticles = useMemo(
        () => processArticlesForLayout(articles, !hasMore),
        [articles, hasMore],
    );

    return (
        <div className="w-full">
            {/* 网格布局容器 */}
            <div className="grid grid-cols-1 gap-y-6 sm:gap-6 lg:grid-cols-2">
                {processedArticles.map((article) => {
                    const commonProps: ArticleCardProps = article;

                    if (article.cardType === CardType.LARGE_IMAGE) {
                        return (
                            <div key={article.id} className="col-span-1 lg:col-span-2">
                                <ArticleCardLarge {...commonProps} />
                            </div>
                        );
                    } else {
                        return (
                            <div key={article.id} className="col-span-1">
                                <ArticleCardSmall {...commonProps} />
                            </div>
                        );
                    }
                })}
            </div>

            {/* 加载指示器和观察目标 */}
            <div ref={observerTarget} className="mt-8 py-4">
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                )}
                {!hasMore && articles.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-base font-medium">已经到底了</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground/70">
                            没有更多文章了，去看看其他内容吧
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
