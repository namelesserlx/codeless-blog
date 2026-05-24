import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_APP_ENV = 'development' as const;
export const SUPPORTED_APP_ENVS = ['development', 'staging', 'production'] as const;

export type AppEnv = (typeof SUPPORTED_APP_ENVS)[number];

export interface LoadWorkspaceEnvOptions {
    repoRoot?: string;
    appDir?: string;
    appEnv?: string;
}

export interface WorkspaceEnvLoadResult {
    appEnv: AppEnv;
    appDir: string;
    repoRoot: string;
    loadedFiles: string[];
}

function isSupportedAppEnv(value: string): value is AppEnv {
    return SUPPORTED_APP_ENVS.includes(value as AppEnv);
}

export function resolveNodeEnv(explicitNodeEnv?: string): string {
    const nodeEnv = explicitNodeEnv?.trim() || process.env.NODE_ENV?.trim() || 'development';

    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = nodeEnv;
    }

    return nodeEnv;
}

export function resolveAppEnv(explicitAppEnv?: string): AppEnv {
    const appEnv =
        explicitAppEnv?.trim() ||
        process.env.APP_ENV?.trim() ||
        (resolveNodeEnv() === 'production' ? 'production' : DEFAULT_APP_ENV);

    if (!isSupportedAppEnv(appEnv)) {
        throw new Error(
            `Unsupported APP_ENV "${appEnv}". Expected one of: ${SUPPORTED_APP_ENVS.join(', ')}`,
        );
    }

    if (!process.env.APP_ENV) {
        process.env.APP_ENV = appEnv;
    }

    return appEnv;
}

function findRepoRoot(startDir: string): string {
    let currentDir = path.resolve(startDir);

    while (true) {
        if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
            return currentDir;
        }

        const parentDir = path.dirname(currentDir);

        if (parentDir === currentDir) {
            return path.resolve(startDir);
        }

        currentDir = parentDir;
    }
}

function parseEnvFile(filePath: string): Record<string, string> | null {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed: Record<string, string> = {};

    for (const rawLine of content.split(/\r?\n/u)) {
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) {
            continue;
        }

        const separatorIndex = line.indexOf('=');

        if (separatorIndex <= 0) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        parsed[key] = value.replace(/\\n/g, '\n');
    }

    return parsed;
}

function loadEnvFile(filePath: string, systemEnvKeys: Set<string>): boolean {
    const parsed = parseEnvFile(filePath);

    if (!parsed) {
        return false;
    }

    for (const [key, value] of Object.entries(parsed)) {
        if (systemEnvKeys.has(key)) {
            continue;
        }

        process.env[key] = value;
    }

    return true;
}

export function loadWorkspaceEnv(options: LoadWorkspaceEnvOptions = {}): WorkspaceEnvLoadResult {
    const appDir = path.resolve(options.appDir || process.cwd());
    const repoRoot = path.resolve(options.repoRoot || findRepoRoot(appDir));
    const appEnv = resolveAppEnv(options.appEnv);
    const systemEnvKeys = new Set(Object.keys(process.env));
    const envFiles = [
        path.join(repoRoot, '.env'),
        path.join(repoRoot, `.env.${appEnv}`),
        path.join(appDir, '.env'),
        path.join(appDir, `.env.${appEnv}`),
    ].filter((envFile, index, list) => list.indexOf(envFile) === index);
    const loadedFiles: string[] = [];

    for (const envFile of envFiles) {
        if (loadEnvFile(envFile, systemEnvKeys)) {
            loadedFiles.push(envFile);
        }
    }

    return {
        appEnv,
        appDir,
        repoRoot,
        loadedFiles,
    };
}
