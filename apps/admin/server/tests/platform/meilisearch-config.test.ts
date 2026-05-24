import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('server meilisearch config', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.doMock('../../src/bootstrap/load-env', () => ({}));
        delete process.env.MEILI_URL;
        delete process.env.MEILI_ADMIN_KEY;
    });

    afterEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    it('disables meilisearch when the server env is not fully configured', async () => {
        const { getArticlesSearchIndex, getMeiliClient, isMeiliSearchEnabled } =
            await import('../../src/lib/meilisearch');

        expect(isMeiliSearchEnabled()).toBe(false);
        expect(getMeiliClient()).toBeNull();
        expect(getArticlesSearchIndex()).toBeNull();
    });

    it('throws when the meili url is configured without an admin key', async () => {
        vi.stubEnv('MEILI_URL', 'http://127.0.0.1:7700');

        const { getMeiliClient } = await import('../../src/lib/meilisearch');

        expect(() => getMeiliClient()).toThrow(/MEILI_URL is set but MEILI_ADMIN_KEY is missing/);
    });

    it('throws when the admin key is configured without a meili url', async () => {
        vi.stubEnv('MEILI_ADMIN_KEY', 'server-admin-key');

        const { getMeiliClient } = await import('../../src/lib/meilisearch');

        expect(() => getMeiliClient()).toThrow(/MEILI_ADMIN_KEY is set but MEILI_URL is missing/);
    });

    it('enables meilisearch when both the url and admin key are configured', async () => {
        vi.stubEnv('MEILI_URL', 'http://127.0.0.1:7700');
        vi.stubEnv('MEILI_ADMIN_KEY', 'server-admin-key');

        const { getArticlesSearchIndex, getMeiliClient, isMeiliSearchEnabled } =
            await import('../../src/lib/meilisearch');

        expect(isMeiliSearchEnabled()).toBe(true);
        expect(getMeiliClient()).not.toBeNull();
        expect(getArticlesSearchIndex()).not.toBeNull();
    });
});
