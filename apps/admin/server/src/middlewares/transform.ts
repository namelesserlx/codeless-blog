import { Middleware } from 'koa';
import { isDev } from '../utils/env';

/**
 * 递归将对象中的 Date 类型字段转换为 ISO 字符串
 * @param obj 需要处理的对象
 * @returns 处理后的对象
 */
const convertDatesToStrings = (obj: any): any => {
    // 处理 null 或 undefined
    if (obj === null || obj === undefined) {
        return obj;
    }

    // 处理 Date 对象
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // 处理数组
    if (Array.isArray(obj)) {
        return obj.map(convertDatesToStrings);
    }

    // 处理普通对象
    if (typeof obj === 'object') {
        const result = { ...obj };
        for (const key of Object.keys(result)) {
            result[key] = convertDatesToStrings(result[key]);
        }
        return result;
    }

    // 其他类型直接返回
    return obj;
};

/**
 * 全局响应转换中间件
 * 自动将响应中的 Date 对象转换为 ISO 字符串
 */
export const transformDateMiddleware: Middleware = async (ctx, next) => {
    await next(); // 先执行后续中间件和路由

    // 仅处理 JSON 响应
    if (ctx.body && (ctx.response.is('json') || typeof ctx.body === 'object')) {
        // 记录开始时间（仅在开发环境）
        const startTime = isDev ? Date.now() : 0;

        // 转换日期
        ctx.body = convertDatesToStrings(ctx.body);

        // // 记录性能日志（仅在开发环境）
        // if (isDev) {
        // 	const duration = Date.now() - startTime;
        // 	if (duration > 5) {
        // 		console.log(`[Transform Middleware] Date formatting took ${duration}ms`);
        // 	}
        // }
    }
};
