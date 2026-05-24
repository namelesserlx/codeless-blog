import 'server-only';

import { blogServerEnv } from '../server-env';

export const redisConfig = {
    host: blogServerEnv.redis.host,
    port: blogServerEnv.redis.port,
    password: blogServerEnv.redis.password,
} as const;
