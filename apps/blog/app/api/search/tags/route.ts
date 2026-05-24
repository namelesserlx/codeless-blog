import { NextRequest, NextResponse } from 'next/server';
import { getArticlesSearchIndex } from '@/lib/server/meilisearch';
import { buildPublishedPostSearchFilters } from '@/lib/server/published-posts';

/**
 * 按标签搜索
 * GET /api/search/tags?tag=React&limit=10
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
        const tag = searchParams.get('tag');
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        if (!tag) {
            return NextResponse.json(
                {
                    success: false,
                    error: '缺少标签参数',
                },
                { status: 400 },
            );
        }

        // 按标签过滤
        const result = await articlesIndex.search('', {
            limit,
            offset,
            filter: buildPublishedPostSearchFilters([`tagNames = "${tag}"`]),
            sort: ['createdAt:desc'],
            attributesToRetrieve: [
                'id',
                'title',
                'summary',
                'authorName',
                'authorNickname',
                'tags',
                'cardImageUrl',
                'createdAt',
            ],
        });

        return NextResponse.json({
            success: true,
            data: {
                hits: result.hits,
                total: result.estimatedTotalHits,
                tag,
            },
        });
    } catch (error) {
        console.error('按标签搜索失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '搜索失败',
            },
            { status: 500 },
        );
    }
}
