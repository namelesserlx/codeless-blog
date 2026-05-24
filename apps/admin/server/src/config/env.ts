import '../bootstrap/load-env';
import { logger } from '../utils/logger';

export const REQUIRED_SERVER_ENV_KEYS = [
    'JWT_SECRET',
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'BLOG_PUBLIC_URL',
    'ADMIN_PUBLIC_URL',
    'API_PUBLIC_URL',
] as const;

export const OPTIONAL_SERVER_ENV_GROUPS = {
    email: {
        triggerKeys: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS'],
        requiredKeys: ['SMTP_USER', 'SMTP_PASS'],
    },
    cos: {
        triggerKeys: ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION'],
        requiredKeys: ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION'],
    },
    githubOAuth: {
        triggerKeys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
        requiredKeys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    },
    githubNextOAuth: {
        triggerKeys: ['GITHUB_NEXT_CLIENT_ID', 'GITHUB_NEXT_CLIENT_SECRET'],
        requiredKeys: ['GITHUB_NEXT_CLIENT_ID', 'GITHUB_NEXT_CLIENT_SECRET'],
    },
    googleOAuth: {
        triggerKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        requiredKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    },
    googleNextOAuth: {
        triggerKeys: ['GOOGLE_NEXT_CLIENT_ID', 'GOOGLE_NEXT_CLIENT_SECRET'],
        requiredKeys: ['GOOGLE_NEXT_CLIENT_ID', 'GOOGLE_NEXT_CLIENT_SECRET'],
    },
    meilisearch: {
        triggerKeys: ['MEILI_URL', 'MEILI_ADMIN_KEY'],
        requiredKeys: ['MEILI_URL', 'MEILI_ADMIN_KEY'],
    },
    deepseek: {
        triggerKeys: ['DEEPSEEK_API_KEY'],
        requiredKeys: ['DEEPSEEK_API_KEY'],
    },
} as const;

const TRUE_VALUES = ['true', '1', 'yes', 'on'] as const;
const FALSE_VALUES = ['false', '0', 'no', 'off'] as const;
const DEFAULT_ADMIN_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'] as const;
const DEFAULT_APP_ENV = 'development';
const DEFAULT_NODE_ENV = 'development';

function optionalString(key: string): string | undefined {
    const value = process.env[key]?.trim();
    return value ? value : undefined;
}

function collectMissing(keys: readonly string[]) {
    return keys.filter((key) => optionalString(key) === undefined);
}

function assertRequiredEnvironment(): void {
    const missing = collectMissing(REQUIRED_SERVER_ENV_KEYS);

    if (missing.length > 0) {
        throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
    }
}

function requiredString(key: string): string {
    const value = optionalString(key);

    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
}

function booleanValue(key: string): boolean | undefined {
    const value = optionalString(key);

    if (value === undefined) {
        return undefined;
    }

    const normalized = value.toLowerCase();

    if (TRUE_VALUES.includes(normalized as (typeof TRUE_VALUES)[number])) {
        return true;
    }

    if (FALSE_VALUES.includes(normalized as (typeof FALSE_VALUES)[number])) {
        return false;
    }

    return undefined;
}

function positiveInt(key: string, fallback: number): number {
    const value = optionalString(key);

    if (value === undefined) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function port(key: string, fallback: number): number {
    const resolvedPort = positiveInt(key, fallback);
    return resolvedPort <= 65535 ? resolvedPort : fallback;
}

function stringList(key: string, fallback: readonly string[] = []): string[] {
    const value = optionalString(key);

    if (!value) {
        return [...fallback];
    }

    return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/u, '');
}

function publicUrl(key: 'BLOG_PUBLIC_URL' | 'ADMIN_PUBLIC_URL' | 'API_PUBLIC_URL'): string {
    const value = requiredString(key);
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    return trimTrailingSlash(withProtocol);
}

function optionalUrl(key: string): string | undefined {
    const value = optionalString(key);

    if (value === undefined) {
        return undefined;
    }

    const normalized = trimTrailingSlash(value);
    return normalized.length > 0 ? normalized : undefined;
}

function oauthCredentials(clientIdKey: string, clientSecretKey: string, redirectUri: string) {
    return {
        clientIdKey,
        clientSecretKey,
        clientId: optionalString(clientIdKey),
        clientSecret: optionalString(clientSecretKey),
        redirectUri,
    } as const;
}

assertRequiredEnvironment();

const urls = {
    blog: publicUrl('BLOG_PUBLIC_URL'),
    admin: publicUrl('ADMIN_PUBLIC_URL'),
    api: publicUrl('API_PUBLIC_URL'),
} as const;

const currentAppEnv = optionalString('APP_ENV') ?? DEFAULT_APP_ENV;
const currentNodeEnv = optionalString('NODE_ENV') ?? DEFAULT_NODE_ENV;

const app = {
    currentAppEnv,
    currentNodeEnv,
    isDevelopment: currentNodeEnv === 'development',
    isProduction: currentNodeEnv === 'production',
} as const;

const server = {
    port: port('PORT', 8000),
    allowedOrigins: stringList('ADMIN_ALLOWED_ORIGINS', DEFAULT_ADMIN_ALLOWED_ORIGINS),
} as const;

const sessionTtlSeconds = positiveInt('SESSION_TTL_SECONDS', 7 * 24 * 60 * 60);
const captchaTtlSeconds = positiveInt('CAPTCHA_TTL_SECONDS', 5 * 60);

const auth = {
    jwtSecret: requiredString('JWT_SECRET'),
    accessTokenTtlSeconds: positiveInt('ACCESS_TOKEN_TTL_SECONDS', 24 * 60 * 60),
    sessionTtlSeconds,
    sessionCookieName: optionalString('AUTH_SESSION_COOKIE_NAME') ?? 'sid',
    sessionCookieMaxAgeMs: positiveInt('SESSION_COOKIE_MAX_AGE_MS', sessionTtlSeconds * 1000),
    captchaCookieName: optionalString('CAPTCHA_COOKIE_NAME') ?? 'captcha_id',
    captchaTtlSeconds,
    captchaCookieMaxAgeMs: positiveInt('CAPTCHA_COOKIE_MAX_AGE_MS', captchaTtlSeconds * 1000),
    cookieSecure: booleanValue('COOKIE_SECURE') ?? app.isProduction,
    cookieDomain: optionalString('COOKIE_DOMAIN'),
    cookieSecureProxyHosts: stringList('COOKIE_SECURE_PROXY_HOSTS'),
} as const;

const redis = {
    host: requiredString('REDIS_HOST'),
    port: port('REDIS_PORT', 6379),
    password: optionalString('REDIS_PASSWORD'),
} as const;

const smtpPort = positiveInt('SMTP_PORT', 587);

const email = {
    smtp: {
        host: optionalString('SMTP_HOST') ?? 'smtp.gmail.com',
        port: smtpPort,
        secure: booleanValue('SMTP_SECURE') ?? smtpPort === 465,
        user: optionalString('SMTP_USER'),
        pass: optionalString('SMTP_PASS'),
    },
    from: {
        name: optionalString('EMAIL_FROM_NAME') ?? '博客系统',
        address: optionalString('EMAIL_FROM_ADDRESS'),
    },
} as const;

const cos = {
    secretId: optionalString('COS_SECRET_ID'),
    secretKey: optionalString('COS_SECRET_KEY'),
    bucket: optionalString('COS_BUCKET'),
    region: optionalString('COS_REGION'),
    sliceSize: positiveInt('COS_SLICE_SIZE', 1024 * 1024 * 50),
    customDomain: optionalUrl('COS_CUSTOM_DOMAIN'),
} as const;

const oauth = {
    github: {
        admin: oauthCredentials(
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET',
            `${urls.admin}/auth/github/callback`,
        ),
        blog: oauthCredentials(
            'GITHUB_NEXT_CLIENT_ID',
            'GITHUB_NEXT_CLIENT_SECRET',
            `${urls.blog}/auth/callback`,
        ),
    },
    google: {
        admin: oauthCredentials(
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            `${urls.admin}/auth/google/callback`,
        ),
        blog: oauthCredentials(
            'GOOGLE_NEXT_CLIENT_ID',
            'GOOGLE_NEXT_CLIENT_SECRET',
            `${urls.blog}/auth/callback`,
        ),
    },
    googleProxyUrl: optionalUrl('GOOGLE_OAUTH_PROXY_URL'),
} as const;

const meilisearch = {
    host: optionalUrl('MEILI_URL'),
    adminKey: optionalString('MEILI_ADMIN_KEY'),
} as const;

const deepseek = {
    apiKey: optionalString('DEEPSEEK_API_KEY'),
    baseUrl: optionalUrl('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com/v1',
} as const;

const tracesSampleRatePercent = positiveInt('OTEL_TRACES_SAMPLE_RATE_PERCENT', 100);

const telemetry = {
    enabled: booleanValue('OTEL_ENABLED') ?? false,
    serviceName: optionalString('OTEL_SERVICE_NAME') ?? 'blog-admin-server',
    serviceVersion: optionalString('OTEL_SERVICE_VERSION'),
    environment: optionalString('OTEL_ENVIRONMENT') ?? app.currentAppEnv,
    exporterEndpoint: optionalUrl('OTEL_EXPORTER_OTLP_ENDPOINT'),
    tracesSampleRate: Math.min(Math.max(tracesSampleRatePercent / 100, 0), 1),
} as const;

const metrics = {
    flushIntervalMs: positiveInt('METRICS_FLUSH_INTERVAL_MS', 60_000),
} as const;

const dashboard = {
    pushIntervalMs: positiveInt('DASHBOARD_PUSH_INTERVAL_MS', 15_000),
} as const;

const geoip = {
    xdbPath: optionalString('IP2REGION_XDB_PATH'),
} as const;

export const env = {
    app,
    urls,
    server,
    auth,
    redis,
    email,
    cos,
    oauth,
    meilisearch,
    deepseek,
    telemetry,
    metrics,
    dashboard,
    geoip,
} as const;

export function validateServerEnvironment(): void {
    const missingRequired = collectMissing(REQUIRED_SERVER_ENV_KEYS);

    if (missingRequired.length > 0) {
        throw new Error(
            `Missing required server environment variables: ${missingRequired.join(', ')}`,
        );
    }

    for (const [groupName, contract] of Object.entries(OPTIONAL_SERVER_ENV_GROUPS)) {
        const present = contract.triggerKeys.filter((key) => optionalString(key));
        const missing = collectMissing(contract.requiredKeys);

        if (present.length > 0 && missing.length > 0) {
            logger.warn(`环境变量组 ${groupName} 配置不完整`, {
                present,
                missing,
            });
        }
    }
}
