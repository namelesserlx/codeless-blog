import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateHash } from '@blog/shared';
import redis from '../../src/lib/redis';
import { authConfig } from '../../src/config/auth';
import {
    clearCaptchaChallenge,
    readCaptchaId,
    readCaptchaText,
    storeCaptchaChallenge,
} from '../../src/services/auth/captcha';

vi.mock('@blog/shared', () => ({
    generateHash: vi.fn(),
}));

vi.mock('../../src/lib/redis', () => ({
    default: {
        del: vi.fn(),
        get: vi.fn(),
        setex: vi.fn(),
    },
}));

const createMockContext = (initialCookies: Record<string, string> = {}) => {
    const cookieJar = { ...initialCookies };
    const setCookie = vi.fn((name: string, value: string) => {
        if (value) {
            cookieJar[name] = value;
            return;
        }

        delete cookieJar[name];
    });

    const ctx = {
        cookies: {
            get: (name: string) => cookieJar[name],
            set: setCookie,
        },
    } as unknown as Context;

    return {
        ctx,
        cookieJar,
        setCookie,
    };
};

describe('captcha', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(generateHash).mockReturnValue('captcha-123');
    });

    it('should store captcha text in redis and issue a captcha cookie', async () => {
        const { ctx, cookieJar, setCookie } = createMockContext();

        await storeCaptchaChallenge(ctx, 'ab12');

        expect(redis.setex).toHaveBeenCalledWith(
            'auth:captcha:captcha-123',
            authConfig.captchaTtlSeconds,
            'ab12',
        );
        expect(setCookie).toHaveBeenCalledWith(
            authConfig.captchaCookieName,
            'captcha-123',
            expect.objectContaining({
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                maxAge: authConfig.captchaCookieMaxAgeMs,
            }),
        );
        expect(cookieJar[authConfig.captchaCookieName]).toBe('captcha-123');
        expect(readCaptchaId(ctx)).toBe('captcha-123');
    });

    it('should replace the previous captcha challenge when refreshing captcha', async () => {
        const { ctx } = createMockContext({
            [authConfig.captchaCookieName]: 'old-captcha',
        });
        vi.mocked(generateHash).mockReturnValue('captcha-456');

        await storeCaptchaChallenge(ctx, 'cd34');

        expect(redis.del).toHaveBeenCalledWith('auth:captcha:old-captcha');
        expect(redis.setex).toHaveBeenCalledWith(
            'auth:captcha:captcha-456',
            authConfig.captchaTtlSeconds,
            'cd34',
        );
    });

    it('should read captcha text from redis using captcha cookie', async () => {
        const { ctx } = createMockContext({
            [authConfig.captchaCookieName]: 'captcha-789',
        });
        vi.mocked(redis.get).mockResolvedValue('ef56');

        await expect(readCaptchaText(ctx)).resolves.toBe('ef56');
        expect(redis.get).toHaveBeenCalledWith('auth:captcha:captcha-789');
    });

    it('should clear the captcha challenge from redis and cookie', async () => {
        const { ctx, setCookie } = createMockContext({
            [authConfig.captchaCookieName]: 'captcha-999',
        });

        await clearCaptchaChallenge(ctx);

        expect(redis.del).toHaveBeenCalledWith('auth:captcha:captcha-999');
        expect(setCookie).toHaveBeenCalledWith(
            authConfig.captchaCookieName,
            '',
            expect.objectContaining({
                maxAge: 0,
            }),
        );
    });
});
