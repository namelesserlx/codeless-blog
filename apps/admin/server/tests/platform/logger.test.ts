import { beforeEach, describe, expect, it, vi } from 'vitest';

const fsMock = vi.hoisted(() => ({
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    promises: {
        appendFile: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('fs', () => ({
    default: fsMock,
}));

describe('logger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('writes log files asynchronously instead of using appendFileSync', async () => {
        const consoleInfoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { logger } = await import('../../src/utils/logger');

        logger.info('hello logger', {
            scope: 'test',
        });
        await Promise.resolve();

        expect(fsMock.promises.appendFile).toHaveBeenCalledTimes(1);
        expect(fsMock.appendFileSync).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
    });
});
