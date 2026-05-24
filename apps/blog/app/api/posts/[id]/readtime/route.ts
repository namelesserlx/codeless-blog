import { NextResponse, NextRequest } from 'next/server';
import { getRedisClient } from '@/lib/server/redis';
import { getActorIdFromRequest, getPostReadTimeKey } from '@/lib/shared/metrics';

interface ReadTimePayload {
    visitorId?: string;
    deltaSeconds?: number;
}

// 阅读时长增量接口
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { visitorId, deltaSeconds }: ReadTimePayload = await req
            .json()
            .catch(() => ({}) as ReadTimePayload);

        const inc = Math.max(0, Math.round(Number(deltaSeconds ?? 0)));
        if (!Number.isFinite(inc)) {
            return NextResponse.json({ ok: false, message: 'bad payload' }, { status: 400 });
        }

        const { id } = await params;
        const postId = id as string;
        if (!postId) {
            return NextResponse.json({ ok: false, message: 'missing id' }, { status: 400 });
        }

        const actorId = getActorIdFromRequest({ visitorId });
        if (!actorId) {
            return NextResponse.json({ ok: false, message: 'missing visitorId' }, { status: 400 });
        }

        // inc 为 0 时无需落入 Redis，直接返回
        if (inc === 0) {
            return NextResponse.json({ ok: true, message: 'no increment' });
        }

        const redis = getRedisClient();
        if (!redis) {
            return NextResponse.json({ ok: false, message: 'metrics disabled' }, { status: 503 });
        }

        const key = getPostReadTimeKey(postId);

        // 只在 Redis 中累加增量，真正的总时长由 worker 周期性同步到 MySQL
        await redis.hincrby(key, actorId, inc);

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
