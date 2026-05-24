import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const redis = new Redis({
    port: env.redis.port,
    host: env.redis.host,
    password: env.redis.password,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('error', (err) => {
    logger.error('Redis connection error', err);
});

redis.on('connect', () => {
    logger.info('Redis connected successfully');
});

/**
 * 记录redis命令使用次数
 * @param type: string
 */
export const recordNum = async (type: string) => {
    redis.incr(type);
};

export default redis;
