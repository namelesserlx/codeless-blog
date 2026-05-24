import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@blog/db';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const postId = id as string;
        if (!postId)
            return NextResponse.json({ ok: false, message: 'missing id' }, { status: 400 });

        const count = await prisma.comment.count({ where: { postId, status: 'PUBLISHED' } });

        return NextResponse.json({ ok: true, count });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
