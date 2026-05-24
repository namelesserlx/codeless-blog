import { NextResponse, NextRequest } from 'next/server';
import { getRedisClient } from '@/lib/server/redis';
import { getActorIdFromRequest, getPostLikeKey } from '@/lib/shared/metrics';

interface LikePayload {
    visitorId?: string;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const url = new URL(req.url);
        const visitorId = url.searchParams.get('visitorId') || undefined;
        const { id } = await params;
        const postId = id as string;
        if (!postId) {
            return NextResponse.json({ ok: false, message: 'missing id' }, { status: 400 });
        }

        const redis = getRedisClient();
        if (!redis) {
            return NextResponse.json({ ok: false, message: 'likes disabled' }, { status: 503 });
        }

        const key = getPostLikeKey(postId);

        const count = await redis.scard(key);
        let liked = false;
        if (visitorId) {
            const actorId = getActorIdFromRequest({ visitorId });
            if (actorId) {
                const isMember = await redis.sismember(key, actorId);
                liked = isMember === 1;
            }
        }

        return NextResponse.json({ ok: true, liked, count });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

// 点赞接口
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { visitorId }: LikePayload = await req.json().catch(() => ({}) as LikePayload);
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
            return NextResponse.json({ ok: false, message: 'likes disabled' }, { status: 503 });
        }

        const key = getPostLikeKey(postId);

        const isMember = await redis.sismember(key, actorId);

        if (isMember === 1) {
            await redis.srem(key, actorId);
        } else {
            await redis.sadd(key, actorId);
        }

        const count = await redis.scard(key);

        return NextResponse.json({ ok: true, liked: isMember !== 1, count });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
