import { NextRequest, NextResponse } from 'next/server';
import { getArticlesSearchIndex } from '@/lib/server/meilisearch';
import { buildPublishedPostSearchFilters } from '@/lib/server/published-posts';

/**
 * 搜索文章接口
 * GET /api/search?q=关键词&limit=10&offset=0&filter=published:true
 */
export async function GET(request: NextRequest) {
    try {
        const articlesIndex = getArticlesSearchIndex();
        if (!articlesIndex) {
            return NextResponse.json(
                {
                    success: false,
                    error: '搜索服务未启用',
                },
                { status: 503 },
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const onlyPublished = searchParams.get('onlyPublished') !== 'false'; // 默认只搜索已发布

        // 构建过滤条件：只搜索已发布且非草稿的文章
        const filter = onlyPublished ? buildPublishedPostSearchFilters() : undefined;

        // 执行搜索
        const searchResult = await articlesIndex.search(query, {
            limit,
            offset,
            filter,
            sort: ['createdAt:desc'],
            attributesToHighlight: ['title', 'summary', 'content'],
            highlightPreTag: '<mark>',
            highlightPostTag: '</mark>',
            attributesToCrop: ['content', 'summary'],
            cropLength: 80, // 裁剪内容为 80 个字符，更短更聚焦
            cropMarker: '...',
            showMatchesPosition: true,
            attributesToRetrieve: [
                'id',
                'title',
                'summary', // 保留 summary 用于无匹配时的展示
                // 注意：不包含 content，只使用裁剪后的 _formatted.content
                'authorName',
                'authorNickname',
                'tags',
                'cardImageUrl',
                'createdAt',
                'updatedAt',
            ],
        });

        return NextResponse.json({
            success: true,
            data: {
                hits: searchResult.hits,
                total: searchResult.estimatedTotalHits,
                limit,
                offset,
                processingTimeMs: searchResult.processingTimeMs,
            },
        });
    } catch (error) {
        console.error('搜索失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '搜索服务暂时不可用',
            },
            { status: 500 },
        );
    }
}
