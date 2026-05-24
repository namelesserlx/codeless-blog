import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@blog/db';

interface ReadTimePayload {
    visitorId?: string;
    deltaSeconds?: number;
}

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
    try {
        const { visitorId, deltaSeconds }: ReadTimePayload = await req
            .json()
            .catch(() => ({}) as ReadTimePayload);
        const { id } = await params;
        const inc = Math.max(0, Math.round(Number(deltaSeconds ?? 0)));
        if (!visitorId || !Number.isFinite(inc)) {
            return NextResponse.json({ ok: false, message: 'bad payload' }, { status: 400 });
        }

        await prisma.snippetReadTime.upsert({
            where: { snippetId_visitorId: { snippetId: id, visitorId } },
            create: { snippetId: id, visitorId, seconds: inc },
            update: { seconds: { increment: inc } },
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
