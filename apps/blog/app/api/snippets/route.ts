import { getPublishedSnippets } from '@/lib/server/db';
import { NextRequest, NextResponse } from 'next/server';
import { serializeSnippet } from '@/app/snippets/_lib/snippet-utils';
import type { SnippetListResponse } from '@/app/snippets/_lib/snippet-types';

/**
 * GET请求处理器 - 获取所有已发布的片段
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const result = await getPublishedSnippets({
            page,
            limit,
        });

        return NextResponse.json<SnippetListResponse>({
            snippets: result.snippets.map(serializeSnippet),
            pagination: result.pagination,
        });
    } catch (error) {
        console.error('获取片段失败:', error);
        return NextResponse.json({ error: '获取片段时发生错误' }, { status: 500 });
    }
}
