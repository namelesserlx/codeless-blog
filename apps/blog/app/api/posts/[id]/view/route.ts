import { NextResponse, NextRequest } from 'next/server';
import { getRedisClient } from '@/lib/server/redis';
import { getActorIdFromRequest, getPostDailyUvKey } from '@/lib/shared/metrics';

interface ViewPayload {
    visitorId?: string;
}

function getTodayKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

/**
 * 文章浏览接口（UV）：每个 actorId 只记一次
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { visitorId }: ViewPayload = await req.json().catch(() => ({}) as ViewPayload);

        const { id } = await params;
        const postId = id as string;
        if (!postId) {
            return NextResponse.json({ ok: false, message: 'missing id' }, { status: 400 });
        }

        const actorId = getActorIdFromRequest({ visitorId });
        if (!actorId) {
            return NextResponse.json({ ok: false, message: 'missing visitorId' }, { status: 400 });
        }

        const redis = getRedisClient();
        if (!redis) {
            return NextResponse.json({ ok: false, message: 'metrics disabled' }, { status: 503 });
        }

        const todayKey = getTodayKey();
        const uvKey = getPostDailyUvKey(postId, todayKey);

        // 当天 UV：每个 actorId 只记一次
        await redis.sadd(uvKey, actorId);

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
