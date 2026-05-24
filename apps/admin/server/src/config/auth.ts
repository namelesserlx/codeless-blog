import { env } from './env';

export const authConfig = {
    accessTokenTtlSeconds: env.auth.accessTokenTtlSeconds,
    sessionTtlSeconds: env.auth.sessionTtlSeconds,
    sessionCookieName: env.auth.sessionCookieName,
    sessionCookieMaxAgeMs: env.auth.sessionCookieMaxAgeMs,
    captchaCookieName: env.auth.captchaCookieName,
    captchaTtlSeconds: env.auth.captchaTtlSeconds,
    captchaCookieMaxAgeMs: env.auth.captchaCookieMaxAgeMs,
    cookieSecure: env.auth.cookieSecure,
    cookieDomain: env.auth.cookieDomain,
    cookieSecureProxyHosts: env.auth.cookieSecureProxyHosts,
};
