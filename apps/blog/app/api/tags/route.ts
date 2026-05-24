import { getPublishedTags } from '@/lib/server/db';
import { NextResponse } from 'next/server';

/**
 * GET请求处理器 - 获取所有标签及其文章数量
 */
export async function GET() {
    try {
        const tags = await getPublishedTags();

        return NextResponse.json(tags);
    } catch (error) {
        console.error('获取标签失败:', error);
        return NextResponse.json({ error: '获取标签时发生错误' }, { status: 500 });
    }
}
