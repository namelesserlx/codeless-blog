import 'server-only';

import { publicEnv } from './public-env';

function optionalString(name: string) {
    const value = process.env[name];

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function requiredString(name: string) {
    const value = optionalString(name);

    if (!value) {
        throw new Error(`[env] Missing required environment variable: ${name}`);
    }

    return value;
}

function optionalPort(name: string, fallback: number) {
    const value = optionalString(name);

    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

export const blogServerEnv = {
    urls: publicEnv.urls,
    databaseUrl: requiredString('DATABASE_URL'),
    githubToken: optionalString('GITHUB_TOKEN'),
    redis: {
        host: optionalString('REDIS_HOST'),
        port: optionalPort('REDIS_PORT', 6379),
        password: optionalString('REDIS_PASSWORD'),
    },
    meilisearch: {
        url: optionalString('MEILI_URL'),
        searchKey: optionalString('MEILI_SEARCH_KEY'),
    },
} as const;
