// API路由：/api/posts
import { getPublishedArticles, getPublishedArticlesCount } from '@/lib/server/db';
import { normalizeTagName } from '@/lib/server/published-posts';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET请求处理器 - 获取所有已发布的文章（支持分页）
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tagName = normalizeTagName(searchParams.get('tag'));
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const skip = (page - 1) * pageSize;

        // 获取文章列表和总数
        const [articles, total] = await Promise.all([
            getPublishedArticles({ skip, take: pageSize, tagName }),
            getPublishedArticlesCount({ tagName }),
        ]);

        const hasMore = skip + articles.length < total;

        // 返回成功响应
        return NextResponse.json({
            articles,
            total,
            page,
            pageSize,
            hasMore,
        });
    } catch (error) {
        console.error('获取文章失败:', error);
        // 返回错误响应
        return NextResponse.json({ error: '获取文章时发生错误' }, { status: 500 });
    }
}
