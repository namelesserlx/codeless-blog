import '../bootstrap/load-env';
import { prisma } from '@blog/db';
import { env } from '../config/env';
import redis from '../lib/redis';

async function ensurePostMetricTargetExists(postId: string, key: string): Promise<boolean> {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true },
    });

    if (post) {
        return true;
    }

    console.warn('[metrics-worker] drop metric key for missing post', { postId, key });
    await redis.del(key);
    return false;
}

/**
 * 将 Redis 中的文章阅读时长增量同步到 MySQL 的 PostReadTime 表
 * key: post:{postId}:readtime:delta
 * field: actorId (userId 或 visitorId)
 * value: secondsIncrement
 */
export async function flushPostReadTime(): Promise<void> {
    const matchPattern = 'post:*:readtime:delta';
    const scanStream = redis.scanStream({ match: matchPattern, count: 100 });

    for await (const keys of scanStream) {
        for (const key of keys as string[]) {
            const parts = key.split(':'); // ['post', '{postId}', 'readtime', 'delta']
            if (parts.length < 4) continue;
            const postId = parts[1];

            if (!(await ensurePostMetricTargetExists(postId, key))) {
                continue;
            }

            const hash = await redis.hgetall(key);

            const entries = Object.entries(hash);
            if (entries.length === 0) {
                await redis.del(key);
                continue;
            }

            for (const [actorId, secondsStr] of entries) {
                const seconds = Number(secondsStr);
                if (!Number.isFinite(seconds) || seconds <= 0) continue;

                await prisma.postReadTime.upsert({
                    where: { postId_visitorId: { postId, visitorId: actorId } },
                    create: { postId, visitorId: actorId, seconds },
                    update: { seconds: { increment: seconds } },
                });
            }

            // 清理已同步的增量
            await redis.del(key);
        }
    }
}

/**
 * 将 Redis 中的文章 UV 同步到 MySQL 的 PostViewDaily 表
 * key: post:{postId}:uv:{yyyymmdd}
 * member: actorId
 */
export async function flushPostUv(): Promise<void> {
    const matchPattern = 'post:*:uv:*';
    const scanStream = redis.scanStream({ match: matchPattern, count: 100 });

    for await (const keys of scanStream) {
        for (const key of keys as string[]) {
            const parts = key.split(':'); // ['post', '{postId}', 'uv', '{yyyymmdd}']
            if (parts.length < 4) continue;
            const postId = parts[1];
            const dateStr = parts[3];

            if (!(await ensurePostMetricTargetExists(postId, key))) {
                continue;
            }

            if (dateStr.length !== 8) continue;
            const year = Number(dateStr.slice(0, 4));
            const month = Number(dateStr.slice(4, 6));
            const day = Number(dateStr.slice(6, 8));
            if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
                continue;
            }

            const viewedAt = new Date(year, month - 1, day);

            const actorIds = await redis.smembers(key);
            if (actorIds.length === 0) {
                await redis.del(key);
                continue;
            }

            for (const actorId of actorIds) {
                await prisma.postViewDaily.upsert({
                    where: {
                        postId_visitorId_viewedAt: {
                            postId,
                            visitorId: actorId,
                            viewedAt,
                        },
                    },
                    create: {
                        postId,
                        visitorId: actorId,
                        viewedAt,
                    },
                    update: {},
                });
            }

            // 清理已同步的 UV 集合
            await redis.del(key);
        }
    }
}

/**
 * 将 Redis 中的点赞 Set 同步到 MySQL 的 PostLike 表
 * key: post:{postId}:like
 * member: actorId
 *
 * Redis 视为真实数据源，MySQL 做对齐：
 * - Redis 有而 MySQL 没有 → 插入
 * - MySQL 有而 Redis 没有 → 删除
 */
export async function flushPostLikes(): Promise<void> {
    const matchPattern = 'post:*:like';
    const scanStream = redis.scanStream({ match: matchPattern, count: 100 });

    for await (const keys of scanStream) {
        for (const key of keys as string[]) {
            const parts = key.split(':'); // ['post', '{postId}', 'like']
            if (parts.length < 3) continue;
            const postId = parts[1];

            if (!(await ensurePostMetricTargetExists(postId, key))) {
                continue;
            }

            const actorIds = await redis.smembers(key);

            // 读取当前 MySQL 中的点赞记录
            const existing = await prisma.postLike.findMany({
                where: { postId },
                select: { id: true, visitorId: true },
            });

            const existingMap = new Map<string, number>();
            for (const row of existing) {
                existingMap.set(row.visitorId, row.id);
            }

            const actorSet = new Set(actorIds);

            // Redis 有而 MySQL 没有 → 插入
            for (const actorId of actorSet) {
                if (!existingMap.has(actorId)) {
                    await prisma.postLike.create({
                        data: {
                            postId,
                            visitorId: actorId,
                        },
                    });
                }
            }

            // MySQL 有而 Redis 没有 → 删除
            for (const [visitorId, id] of existingMap.entries()) {
                if (!actorSet.has(visitorId)) {
                    await prisma.postLike.delete({ where: { id } });
                }
            }
        }
    }
}

async function flushAll(): Promise<void> {
    console.log('[metrics-worker] start flushing metrics...');
    const started = Date.now();

    await flushPostReadTime();
    await flushPostUv();
    await flushPostLikes();

    console.log('[metrics-worker] flush finished in', Date.now() - started, 'ms');
}

export async function main(): Promise<void> {
    const intervalMs = env.metrics.flushIntervalMs;

    // 立即执行一次
    void flushAll().catch((err) => {
        console.error('[metrics-worker] initial flush error', err);
    });

    // 周期性执行
    setInterval(() => {
        void flushAll().catch((err) => {
            console.error('[metrics-worker] periodic flush error', err);
        });
    }, intervalMs);
}

if (require.main === module) {
    void main().catch((err) => {
        console.error('[metrics-worker] fatal error', err);
        process.exit(1);
    });
}
