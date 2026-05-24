import path from 'path';
import { loadWorkspaceEnv, resolveAppEnv } from '@blog/shared/env';

// Keep server env loading aligned with the workspace contract:
// system env > app profile env > app base env > root profile env > root base env
const DEFAULT_NODE_ENV = 'development';

let loaded = false;

function resolveNodeEnv(): string {
    const nodeEnv = process.env.NODE_ENV?.trim();

    if (nodeEnv) {
        return nodeEnv;
    }

    process.env.NODE_ENV = DEFAULT_NODE_ENV;
    return DEFAULT_NODE_ENV;
}

export function loadEnvironmentVariables(): void {
    if (loaded) {
        return;
    }

    loaded = true;

    resolveNodeEnv();
    loadWorkspaceEnv({
        appDir: path.resolve(__dirname, '..', '..'),
    });
}

loadEnvironmentVariables();

export const currentNodeEnv = process.env.NODE_ENV as string;
export const isProd = currentNodeEnv === 'production';
export const isDev = currentNodeEnv === 'development';
export const currentAppEnv = resolveAppEnv();
