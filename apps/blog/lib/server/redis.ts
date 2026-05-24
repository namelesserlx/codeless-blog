import 'server-only';

import Redis from 'ioredis';
import { redisConfig } from '@/config/services/redis';

let redisClient: Redis | null = null;

export const isRedisEnabled = () => Boolean(redisConfig.host);

/**
 * 获取 Redis 客户端（仅在服务端使用）
 */
export const getRedisClient = (): Redis | null => {
    if (!redisConfig.host) {
        return null;
    }

    if (!redisClient) {
        redisClient = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            retryStrategy(times) {
                if (times > 3) {
                    return null;
                }

                const delay = Math.min(times * 50, 200);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            console.log('[Redis] connected successfully in blog app');
        });

        redisClient.on('error', (err) => {
            console.error('[Redis] connection error in blog app:', err);
        });
    }

    return redisClient;
};
