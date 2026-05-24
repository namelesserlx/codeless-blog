import { getPublishedArticles, getPublishedArticlesCount } from '@/lib/server/db';
import { ArticleList } from './_components/ArticleList';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { ArticleCardProps } from '@/types';
import { transformArticleData } from '@/lib/shared/utils';
import { normalizeTagName } from '@/lib/server/published-posts';

interface PostsPageProps {
    searchParams: Promise<{
        tag?: string;
    }>;
}

const INITIAL_PAGE_SIZE = 10;
export const revalidate = 600;

export default async function PostsPage({ searchParams }: PostsPageProps) {
    const { tag } = await searchParams;
    const normalizedTag = normalizeTagName(tag);

    // 获取第一页文章作为初始数据
    const articles = await getPublishedArticles({
        skip: 0,
        take: INITIAL_PAGE_SIZE,
        tagName: normalizedTag,
    });
    const total = await getPublishedArticlesCount({ tagName: normalizedTag });

    // 转换文章数据格式
    const initialArticles: ArticleCardProps[] = articles.map(transformArticleData);

    // 计算是否还有更多文章
    const initialHasMore = articles.length < total;

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 space-y-4">
                <h1 className="text-3xl font-bold">博客文章</h1>
                {normalizedTag && (
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">标签筛选:</span>
                        <Badge variant="default" className="text-sm">
                            {normalizedTag}
                        </Badge>
                        <span className="text-muted-foreground">({total} 篇文章)</span>
                    </div>
                )}
            </div>

            {initialArticles.length === 0 ? (
                <Card className="py-12 text-center">
                    <CardContent className="flex flex-col items-center justify-center">
                        <Calendar className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">
                            {normalizedTag
                                ? `标签 "${normalizedTag}" 下暂无文章`
                                : '还没有任何文章'}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {normalizedTag ? '该标签下暂时没有内容' : '暂时没有文章内容'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <ArticleList
                    initialArticles={initialArticles}
                    initialHasMore={initialHasMore}
                    tag={normalizedTag}
                />
            )}
        </div>
    );
}
