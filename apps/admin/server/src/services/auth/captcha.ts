import type { Context } from 'koa';
import { generateHash } from '@blog/shared';
import redis from '../../lib/redis';
import { authConfig } from '../../config/auth';

const CAPTCHA_KEY_PREFIX = 'auth:captcha:';

const getCaptchaCookieOptions = () => ({
    httpOnly: true,
    secure: authConfig.cookieSecure,
    sameSite: 'lax' as const,
    domain: authConfig.cookieDomain,
    path: '/',
    maxAge: authConfig.captchaCookieMaxAgeMs,
});

const getCaptchaRedisKey = (captchaId: string): string => `${CAPTCHA_KEY_PREFIX}${captchaId}`;

export const readCaptchaId = (ctx: Context): string | null =>
    ctx.cookies.get(authConfig.captchaCookieName) || null;

export const storeCaptchaChallenge = async (ctx: Context, captchaText: string): Promise<void> => {
    const previousCaptchaId = readCaptchaId(ctx);
    if (previousCaptchaId) {
        await redis.del(getCaptchaRedisKey(previousCaptchaId));
    }

    const captchaId = generateHash(16);
    await redis.setex(getCaptchaRedisKey(captchaId), authConfig.captchaTtlSeconds, captchaText);
    ctx.cookies.set(authConfig.captchaCookieName, captchaId, getCaptchaCookieOptions());
};

export const readCaptchaText = async (ctx: Context): Promise<string | null> => {
    const captchaId = readCaptchaId(ctx);
    if (!captchaId) {
        return null;
    }

    return redis.get(getCaptchaRedisKey(captchaId));
};

export const clearCaptchaChallenge = async (ctx: Context): Promise<void> => {
    const captchaId = readCaptchaId(ctx);
    if (captchaId) {
        await redis.del(getCaptchaRedisKey(captchaId));
    }

    ctx.cookies.set(authConfig.captchaCookieName, '', {
        ...getCaptchaCookieOptions(),
        maxAge: 0,
        expires: new Date(0),
    });
};
