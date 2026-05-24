import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedPhotos } from '@/lib/server/photos';

/**
 * GET请求处理器 - 获取照片（支持分页）
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const category = searchParams.get('category') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '12', 10);
        const photosResponse = await getPaginatedPhotos(category, page, limit);

        return NextResponse.json(photosResponse);
    } catch (error) {
        console.error('获取照片失败:', error);
        return NextResponse.json({ error: '获取照片时发生错误' }, { status: 500 });
    }
}
