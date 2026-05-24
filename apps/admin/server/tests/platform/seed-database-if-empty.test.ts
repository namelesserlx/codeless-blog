import { describe, expect, it, vi } from 'vitest';

import { seedDatabaseIfNeeded } from '../../src/scripts/seed-database-if-empty';

describe('seed database if empty', () => {
    it('runs seed when there are no users in the database', async () => {
        const countUsers = vi.fn().mockResolvedValue(0);
        const runSeed = vi.fn().mockResolvedValue(undefined);
        const log = vi.fn();

        const result = await seedDatabaseIfNeeded({
            countUsers,
            runSeed,
            log,
        });

        expect(result).toBe('seeded');
        expect(countUsers).toHaveBeenCalledTimes(1);
        expect(runSeed).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith(expect.stringContaining('未检测到用户'));
    });

    it('skips seed when users already exist', async () => {
        const countUsers = vi.fn().mockResolvedValue(2);
        const runSeed = vi.fn().mockResolvedValue(undefined);
        const log = vi.fn();

        const result = await seedDatabaseIfNeeded({
            countUsers,
            runSeed,
            log,
        });

        expect(result).toBe('skipped');
        expect(countUsers).toHaveBeenCalledTimes(1);
        expect(runSeed).not.toHaveBeenCalled();
        expect(log).toHaveBeenCalledWith(expect.stringContaining('检测到已有 2 个用户'));
    });
});
