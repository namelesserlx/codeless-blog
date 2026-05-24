import { describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
    post: {
        findUnique: vi.fn(),
    },
    postLike: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
}));

const redisMock = vi.hoisted(() => ({
    scanStream: vi.fn(),
    smembers: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@blog/db', () => ({
    prisma: prismaMock,
}));

vi.mock('../../src/lib/redis', () => ({
    default: redisMock,
}));

vi.mock('../../src/config/env', () => ({
    env: {
        metrics: {
            flushIntervalMs: 60_000,
        },
    },
}));

const createScanStream = (keys: string[]) =>
    (async function* () {
        yield keys;
    })();

describe('flush metrics worker', () => {
    it('drops post like keys for posts that no longer exist', async () => {
        const { flushPostLikes } = await import('../../src/scripts/flush-metrics');

        redisMock.scanStream.mockReturnValue(createScanStream(['post:missing-post:like']));
        redisMock.smembers.mockResolvedValue(['visitor-1']);
        prismaMock.post.findUnique.mockResolvedValue(null);

        await flushPostLikes();

        expect(prismaMock.postLike.findMany).not.toHaveBeenCalled();
        expect(prismaMock.postLike.create).not.toHaveBeenCalled();
        expect(redisMock.del).toHaveBeenCalledWith('post:missing-post:like');
    });
});
