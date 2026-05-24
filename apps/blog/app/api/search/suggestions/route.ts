import { NextRequest, NextResponse } from 'next/server';
import { getArticlesSearchIndex } from '@/lib/server/meilisearch';
import { buildPublishedPostSearchFilters } from '@/lib/server/published-posts';

/**
 * 获取搜索建议/热门文章
 * GET /api/search/suggestions?limit=5
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
        const limit = parseInt(searchParams.get('limit') || '5', 10);

        // 获取最新的已发布文章作为建议
        const result = await articlesIndex.search('', {
            limit,
            filter: buildPublishedPostSearchFilters(),
            sort: ['createdAt:desc'],
            attributesToRetrieve: ['id', 'title', 'summary', 'tags', 'createdAt'],
        });

        return NextResponse.json({
            success: true,
            data: result.hits,
        });
    } catch (error) {
        console.error('获取搜索建议失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '获取建议失败',
            },
            { status: 500 },
        );
    }
}
