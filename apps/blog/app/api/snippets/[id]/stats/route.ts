import { prisma } from '@blog/db';
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ ok: false, message: 'missing id' }, { status: 400 });
        }

        // 并行查询所有统计数据
        const [likeCount, viewCount, totalReadTime, commentCount] = await Promise.all([
            prisma.snippetLike.count({ where: { snippetId: id } }),
            prisma.snippetViewDaily.count({ where: { snippetId: id } }),
            prisma.snippetReadTime.aggregate({
                where: { snippetId: id },
                _sum: { seconds: true },
            }),
            prisma.comment.count({
                where: {
                    snippetId: id,
                    status: 'PUBLISHED',
                },
            }),
        ]);

        const avgReadTime =
            viewCount > 0 ? Math.round((totalReadTime._sum.seconds || 0) / viewCount) : 0;

        return NextResponse.json({
            ok: true,
            stats: {
                likes: likeCount,
                views: viewCount,
                comments: commentCount,
                totalReadTimeSeconds: totalReadTime._sum.seconds || 0,
                avgReadTimeSeconds: avgReadTime,
            },
        });
    } catch (error) {
        console.error('获取片段统计失败:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
