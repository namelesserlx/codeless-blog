import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@blog/db';

interface ViewPayload {
    visitorId?: string;
}

function getStartOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const id = url.pathname.split('/').filter(Boolean).slice(-2, -1)[0];
        const { visitorId }: ViewPayload = await req.json().catch(() => ({}) as ViewPayload);
        if (!id || !visitorId) {
            return NextResponse.json(
                { ok: false, message: 'missing id or visitorId' },
                { status: 400 },
            );
        }

        const viewedAt = getStartOfToday();

        await prisma.snippetViewDaily.upsert({
            where: {
                snippetId_visitorId_viewedAt: {
                    snippetId: id,
                    visitorId,
                    viewedAt,
                },
            },
            create: { snippetId: id, visitorId, viewedAt },
            update: {},
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
