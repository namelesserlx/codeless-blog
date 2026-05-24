import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@blog/db';
import { getRedisClient } from '@/lib/server/redis';
import { getActorIdFromRequest, getPostDailyUvKey, getPostReadTimeKey } from '@/lib/shared/metrics';

function getTodayKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

// 文章统计接口
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const url = new URL(req.url);
        const visitorId = url.searchParams.get('visitorId') || undefined;
        const { id } = await params;
        const postId = id as string;
        if (!postId) {
            return NextResponse.json({ ok: false, message: 'missing id' }, { status: 400 });
        }

        const todayKey = getTodayKey();

        // 1. 历史总 UV：从 MySQL 读取
        const dbViews = await prisma.postViewDaily.count({ where: { postId } });

        // 2. 当天尚未 flush 到 MySQL 的 UV：从 Redis 读取
        const redis = getRedisClient();
        let pendingViews = 0;

        if (redis) {
            const uvKey = getPostDailyUvKey(postId, todayKey);
            pendingViews = await redis.scard(uvKey);
        }

        const views = dbViews + pendingViews;

        // 3. 当前用户阅读时长：MySQL 历史总时长 + Redis 中的增量
        let readSecondsForVisitor = 0;
        const actorId = getActorIdFromRequest({ visitorId });

        if (actorId) {
            const record = await prisma.postReadTime.findUnique({
                where: { postId_visitorId: { postId, visitorId: actorId } },
            });
            const baseSeconds = record?.seconds ?? 0;

            let deltaSeconds = 0;

            if (redis) {
                const deltaKey = getPostReadTimeKey(postId);
                const deltaStr = await redis.hget(deltaKey, actorId);
                deltaSeconds = deltaStr ? Number(deltaStr) || 0 : 0;
            }

            readSecondsForVisitor = baseSeconds + deltaSeconds;
        }

        return NextResponse.json({ ok: true, views, readSecondsForVisitor });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
