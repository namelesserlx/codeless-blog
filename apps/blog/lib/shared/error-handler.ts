// 数据库错误处理工具

import { NextResponse } from 'next/server';

// 定义Prisma错误类型，因为直接导入可能会有问题
interface PrismaError {
    code: string;
    meta?: {
        target?: string[];
        [key: string]: unknown;
    };
    message: string;
}

/**
 * 处理数据库错误并返回适当的HTTP响应
 */
export function handleDatabaseError(error: unknown, defaultMessage = '数据库操作失败') {
    console.error('数据库错误:', error);

    // 检查是否是Prisma错误类型
    const isPrismaError = (err: unknown): err is PrismaError => {
        return (
            typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            typeof (err as unknown as PrismaError).code === 'string'
        );
    };

    if (isPrismaError(error)) {
        // 唯一性约束错误
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            return NextResponse.json(
                { error: `字段 ${target.join(', ')} 已存在，请使用其他值` },
                { status: 409 },
            );
        }

        // 记录不存在
        if (error.code === 'P2001' || error.code === 'P2018') {
            return NextResponse.json({ error: '请求的资源不存在' }, { status: 404 });
        }

        // 外键约束失败
        if (error.code === 'P2003') {
            return NextResponse.json(
                { error: '无法执行此操作，因为引用的数据不存在' },
                { status: 400 },
            );
        }

        // 字段约束失败
        if (error.code === 'P2007') {
            return NextResponse.json({ error: '提供的数据无效' }, { status: 400 });
        }
    }

    // 检查是否是验证错误
    const isValidationError = (err: unknown): boolean => {
        return err instanceof Error && err.name === 'PrismaClientValidationError';
    };

    if (isValidationError(error)) {
        return NextResponse.json({ error: '提供的数据格式不正确' }, { status: 400 });
    }

    // 默认错误响应
    return NextResponse.json({ error: defaultMessage }, { status: 500 });
}

/**
 * 用于包装API处理函数的高阶函数，提供统一的错误处理
 */
export function withErrorHandling<T>(
    handler: () => Promise<T>,
    errorMessage = '操作失败',
): Promise<T | NextResponse> {
    return handler().catch((error) => handleDatabaseError(error, errorMessage));
}

/**
 * 使用示例:
 *
 * export async function GET() {
 *   return withErrorHandling(
 *     async () => {
 *       const data = await db.post.findMany();
 *       return NextResponse.json(data);
 *     },
 *     '获取文章失败'
 *   );
 * }
 */
