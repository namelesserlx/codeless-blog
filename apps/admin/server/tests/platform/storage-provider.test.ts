import { beforeEach, describe, expect, it, vi } from 'vitest';

const cosMock = vi.hoisted(() => ({
    putObject: vi.fn(),
    deleteObject: vi.fn((_params: unknown, callback: (err?: unknown) => void) => {
        callback();
    }),
}));

vi.mock('../../src/config/cos', () => ({
    cos: cosMock,
    COS_CONFIG: {
        Bucket: 'blog-bucket',
        Region: 'ap-shanghai',
        SliceSize: 1024,
        customDomain: 'https://cdn.example.com',
    },
}));

import { CosStorageProvider } from '../../src/lib/storage/cos-provider';

describe('CosStorageProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not delete URLs outside the configured storage domains', async () => {
        const provider = new CosStorageProvider();

        await provider.delete('https://avatars.githubusercontent.com/u/123?v=4');

        expect(cosMock.deleteObject).not.toHaveBeenCalled();
    });
});
