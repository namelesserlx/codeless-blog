import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@blog/db';

interface LikePayload {
    visitorId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const id = url.pathname.split('/').filter(Boolean).slice(-2, -1)[0];
        const { visitorId }: LikePayload = await req.json().catch(() => ({}) as LikePayload);
        if (!id || !visitorId) {
            return NextResponse.json(
                { ok: false, message: 'missing id or visitorId' },
                { status: 400 },
            );
        }

        const key = { snippetId_visitorId: { snippetId: id, visitorId } } as const;
        const existed = await prisma.snippetLike.findUnique({ where: key });

        if (existed) {
            await prisma.snippetLike.delete({ where: key });
        } else {
            await prisma.snippetLike.create({ data: { snippetId: id, visitorId } });
        }

        const count = await prisma.snippetLike.count({ where: { snippetId: id } });
        return NextResponse.json({ ok: true, liked: !existed, count });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
