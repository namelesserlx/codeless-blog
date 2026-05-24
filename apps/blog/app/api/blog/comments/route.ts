import { NextRequest, NextResponse } from 'next/server';
import { getPublishedComments } from '@/lib/server/db';
import type { ResponseData, GetCommentsResponse } from '@blog/shared';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get('postId') || undefined;
        const snippetId = searchParams.get('snippetId') || undefined;
        const page = Number(searchParams.get('page') || '1');
        const limit = Number(searchParams.get('limit') || '20');

        if (!postId && !snippetId) {
            return NextResponse.json<ResponseData<null>>(
                {
                    code: 1,
                    data: null,
                    message: '必须指定文章ID或片段ID',
                },
                { status: 400 },
            );
        }

        const result = await getPublishedComments({
            postId,
            snippetId,
            page,
            limit,
        });

        return NextResponse.json<ResponseData<GetCommentsResponse>>({
            code: 0,
            data: result,
            message: '获取评论列表成功',
        });
    } catch (error) {
        console.error('获取评论列表失败:', error);
        return NextResponse.json<ResponseData<null>>(
            {
                code: 1,
                data: null,
                message: '获取评论列表失败',
            },
            { status: 500 },
        );
    }
}
