import type { Context } from 'koa';
import cors from '@koa/cors';
import { env } from '../config/env';
import { isProd } from '../utils/env';

/**
 * CORS 配置中间件
 * 支持多源白名单配置，允许带凭证的跨域请求
 */
export const corsMiddleware = () => {
    const allowList = env.server.allowedOrigins;

    return cors({
        /**
         * 动态判断请求源是否允许
         * @param ctx Koa 上下文
         * @returns 允许的源地址，或 undefined 表示拒绝
         */
        origin: (ctx: Context): string | undefined => {
            const requestOrigin = ctx.request.header.origin;

            // 如果没有 origin 头（如直接请求、Postman 等），拒绝
            if (!requestOrigin) {
                return undefined;
            }

            // 从环境变量获取允许的源列表
            // 检查请求源是否在白名单中
            if (allowList.includes(requestOrigin)) {
                return requestOrigin;
            }

            // 开发环境下，支持本地网络地址（localhost、127.0.0.1、192.168.x.x、10.x.x.x、172.16-31.x.x）
            if (!isProd) {
                try {
                    const url = new URL(requestOrigin);
                    const hostname = url.hostname.toLowerCase();

                    // 允许 localhost 和 127.0.0.1
                    if (hostname === 'localhost' || hostname === '127.0.0.1') {
                        return requestOrigin;
                    }

                    // 允许本地网络 IP 地址
                    // 192.168.0.0/16
                    if (hostname.startsWith('192.168.')) {
                        return requestOrigin;
                    }
                    // 10.0.0.0/8
                    if (hostname.startsWith('10.')) {
                        return requestOrigin;
                    }
                    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
                    const ipParts = hostname.split('.');
                    if (
                        ipParts.length === 4 &&
                        ipParts[0] === '172' &&
                        parseInt(ipParts[1], 10) >= 16 &&
                        parseInt(ipParts[1], 10) <= 31
                    ) {
                        return requestOrigin;
                    }
                } catch (error) {
                    // URL 解析失败，拒绝
                    return undefined;
                }
            }

            // 不在白名单中，拒绝
            return undefined;
        },
        /**
         * 允许携带凭证（cookies、authorization headers 等）
         */
        credentials: true,
        /**
         * 允许的 HTTP 方法
         */
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        /**
         * 允许的请求头
         */
        allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
        /**
         * 预检请求的缓存时间（秒）
         */
        maxAge: 86400, // 24 小时
        /**
         * 是否允许跨域携带凭证
         */
        exposeHeaders: ['Content-Length', 'Content-Type'],
    });
};
