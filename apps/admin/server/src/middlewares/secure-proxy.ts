import type { Context, Next } from 'koa';
import { authConfig } from '../config/auth';

const FORWARDED_PROTO_HEADER = 'x-forwarded-proto';

const normalizeHost = (host: string): string => {
    return host.trim().toLowerCase().split(':')[0] || '';
};

const trustedProxyHosts = new Set(authConfig.cookieSecureProxyHosts.map(normalizeHost));

const isTrustedCookieProxyHost = (host: string): boolean => {
    if (trustedProxyHosts.size === 0) {
        return false;
    }

    return trustedProxyHosts.has(normalizeHost(host));
};

const readFirstForwardedProto = (ctx: Context): string => {
    return ctx.get(FORWARDED_PROTO_HEADER).split(',')[0].trim().toLowerCase();
};

/**
 * frp http tunnels may terminate the public HTTPS request before Koa sees it.
 * When the request host is explicitly trusted for secure cookies, preserve the
 * external HTTPS scheme so Koa's cookie library allows Secure cookies.
 */
export const normalizeSecureProxyHeaders = async (ctx: Context, next: Next) => {
    if (authConfig.cookieSecure && !ctx.secure && isTrustedCookieProxyHost(ctx.host)) {
        const forwardedProto = readFirstForwardedProto(ctx);

        if (!forwardedProto || forwardedProto === 'http') {
            ctx.req.headers[FORWARDED_PROTO_HEADER] = 'https';
            ctx.request.header[FORWARDED_PROTO_HEADER] = 'https';
        }
    }

    await next();
};
