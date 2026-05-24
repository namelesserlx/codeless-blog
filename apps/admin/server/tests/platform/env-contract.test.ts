import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function stubRequiredServerEnv() {
    vi.stubEnv('JWT_SECRET', 'unit-test-secret');
    vi.stubEnv('DATABASE_URL', 'mysql://user:pass@127.0.0.1:3306/blog');
    vi.stubEnv('REDIS_HOST', '127.0.0.1');
    vi.stubEnv('REDIS_PORT', '6379');
    vi.stubEnv('BLOG_PUBLIC_URL', 'https://blog.example.com');
    vi.stubEnv('ADMIN_PUBLIC_URL', 'https://admin.example.com');
    vi.stubEnv('API_PUBLIC_URL', 'https://api.example.com');
}

describe('env contract', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.doMock('../../src/bootstrap/load-env', () => ({}));
    });

    afterEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    it('throws when core runtime environment variables are missing', async () => {
        process.env.JWT_SECRET = '';
        process.env.DATABASE_URL = '';
        process.env.REDIS_HOST = '';
        process.env.REDIS_PORT = '';
        process.env.BLOG_PUBLIC_URL = '';
        process.env.ADMIN_PUBLIC_URL = '';
        process.env.API_PUBLIC_URL = '';

        await expect(import('../../src/config/env')).rejects.toThrow(
            /JWT_SECRET, DATABASE_URL, REDIS_HOST, REDIS_PORT, BLOG_PUBLIC_URL, ADMIN_PUBLIC_URL, API_PUBLIC_URL/,
        );
    });

    it('does not provide development defaults for required public URLs', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('JWT_SECRET', 'unit-test-secret');
        vi.stubEnv('DATABASE_URL', 'mysql://user:pass@127.0.0.1:3306/blog');
        vi.stubEnv('REDIS_HOST', '127.0.0.1');
        vi.stubEnv('REDIS_PORT', '6379');
        process.env.BLOG_PUBLIC_URL = '';
        process.env.ADMIN_PUBLIC_URL = '';
        process.env.API_PUBLIC_URL = '';

        await expect(import('../../src/config/env')).rejects.toThrow(
            /BLOG_PUBLIC_URL, ADMIN_PUBLIC_URL, API_PUBLIC_URL/,
        );
    });

    it('warns when optional integration groups are only partially configured', async () => {
        stubRequiredServerEnv();
        vi.stubEnv('SMTP_HOST', 'smtp.example.com');
        vi.stubEnv('SMTP_USER', 'user@example.com');
        delete process.env.SMTP_PASS;

        const { logger } = await import('../../src/utils/logger');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const { validateServerEnvironment } = await import('../../src/config/env');

        validateServerEnvironment();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('环境变量组 email 配置不完整'),
            expect.objectContaining({
                missing: expect.arrayContaining(['SMTP_PASS']),
            }),
        );

        warnSpy.mockRestore();
    });

    it('does not warn when only optional email defaults are configured', async () => {
        stubRequiredServerEnv();
        vi.stubEnv('SMTP_PORT', '587');
        vi.stubEnv('SMTP_SECURE', 'false');
        vi.stubEnv('EMAIL_FROM_NAME', 'Blog Admin');

        const { logger } = await import('../../src/utils/logger');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const { validateServerEnvironment } = await import('../../src/config/env');

        validateServerEnvironment();

        expect(warnSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('环境变量组 email 配置不完整'),
            expect.anything(),
        );

        warnSpy.mockRestore();
    });

    it('does not warn when optional integration groups are fully configured', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        stubRequiredServerEnv();
        vi.stubEnv('GITHUB_CLIENT_ID', 'github-client');
        vi.stubEnv('GITHUB_CLIENT_SECRET', 'github-secret');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');

        const { logger } = await import('../../src/utils/logger');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const { validateServerEnvironment } = await import('../../src/config/env');

        validateServerEnvironment();

        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('warns when meilisearch is partially configured with only an admin key', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        stubRequiredServerEnv();
        vi.stubEnv('MEILI_ADMIN_KEY', 'meili-admin-key');
        delete process.env.MEILI_URL;

        const { logger } = await import('../../src/utils/logger');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        const { validateServerEnvironment } = await import('../../src/config/env');

        validateServerEnvironment();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('环境变量组 meilisearch 配置不完整'),
            expect.objectContaining({
                present: expect.arrayContaining(['MEILI_ADMIN_KEY']),
                missing: expect.arrayContaining(['MEILI_URL']),
            }),
        );

        warnSpy.mockRestore();
    });

    it('parses numeric, port, and list environment helpers with safe fallbacks', async () => {
        stubRequiredServerEnv();
        vi.stubEnv('METRICS_FLUSH_INTERVAL_MS', '30000');
        vi.stubEnv('PORT', '18000');
        vi.stubEnv('ADMIN_ALLOWED_ORIGINS', ' http://localhost:5173, http://127.0.0.1:5173 ');

        const { env } = await import('../../src/config/env');

        expect(env.metrics.flushIntervalMs).toBe(30000);
        expect(env.server.port).toBe(18000);
        expect(env.server.allowedOrigins).toEqual([
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]);
    });

    it('falls back for invalid numeric and port environment values', async () => {
        stubRequiredServerEnv();
        vi.stubEnv('METRICS_FLUSH_INTERVAL_MS', 'abc');
        vi.stubEnv('PORT', '70000');

        const { env } = await import('../../src/config/env');

        expect(env.metrics.flushIntervalMs).toBe(60000);
        expect(env.server.port).toBe(8000);
    });

    it('keeps optional integration values undefined when they are not configured', async () => {
        stubRequiredServerEnv();

        const { env } = await import('../../src/config/env');

        expect(env.email.smtp.user).toBeUndefined();
        expect(env.email.smtp.pass).toBeUndefined();
        expect(env.email.from.address).toBeUndefined();
        expect(env.cos.bucket).toBeUndefined();
        expect(env.cos.region).toBeUndefined();
        expect(env.cos.customDomain).toBeUndefined();
        expect(env.deepseek.apiKey).toBeUndefined();
    });
});
