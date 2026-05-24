import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspaceEnv, resolveAppEnv } from '../../../../../packages/shared/src/env';

function writeEnvFile(filePath: string, content: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

describe('workspace env loader', () => {
    let tempDir: string;
    let repoRoot: string;
    let appDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-env-loader-'));
        repoRoot = path.join(tempDir, 'repo');
        appDir = path.join(repoRoot, 'apps', 'demo');
        fs.mkdirSync(appDir, { recursive: true });
        vi.resetModules();
        vi.unstubAllEnvs();
        delete process.env.APP_ENV;
        delete process.env.SHARED_VALUE;
        delete process.env.APP_ONLY_VALUE;
        delete process.env.SYSTEM_ONLY_VALUE;
        delete process.env.PROFILE_ONLY_VALUE;
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        vi.unstubAllEnvs();
    });

    it('loads root profile env when app profile env is absent', () => {
        writeEnvFile(path.join(repoRoot, '.env.development'), 'SHARED_VALUE=root\n');

        loadWorkspaceEnv({
            repoRoot,
            appDir,
            appEnv: 'development',
        });

        expect(process.env.SHARED_VALUE).toBe('root');
    });

    it('loads base env files before profile env files', () => {
        writeEnvFile(path.join(repoRoot, '.env'), 'SHARED_VALUE=root-base\n');
        writeEnvFile(path.join(repoRoot, '.env.development'), 'PROFILE_ONLY_VALUE=root-profile\n');
        writeEnvFile(path.join(appDir, '.env'), 'SHARED_VALUE=app-base\nAPP_ONLY_VALUE=demo\n');

        loadWorkspaceEnv({
            repoRoot,
            appDir,
            appEnv: 'development',
        });

        expect(process.env.SHARED_VALUE).toBe('app-base');
        expect(process.env.PROFILE_ONLY_VALUE).toBe('root-profile');
        expect(process.env.APP_ONLY_VALUE).toBe('demo');
    });

    it('lets app profile env override root profile env', () => {
        writeEnvFile(path.join(repoRoot, '.env.development'), 'SHARED_VALUE=root\n');
        writeEnvFile(
            path.join(appDir, '.env.development'),
            'SHARED_VALUE=app\nAPP_ONLY_VALUE=demo\n',
        );

        loadWorkspaceEnv({
            repoRoot,
            appDir,
            appEnv: 'development',
        });

        expect(process.env.SHARED_VALUE).toBe('app');
        expect(process.env.APP_ONLY_VALUE).toBe('demo');
    });

    it('preserves system env over both root and app files', () => {
        vi.stubEnv('SHARED_VALUE', 'system');
        writeEnvFile(path.join(repoRoot, '.env.production'), 'SHARED_VALUE=root\n');
        writeEnvFile(path.join(appDir, '.env.production'), 'SHARED_VALUE=app\n');

        loadWorkspaceEnv({
            repoRoot,
            appDir,
            appEnv: 'production',
        });

        expect(process.env.SHARED_VALUE).toBe('system');
    });

    it('derives APP_ENV from NODE_ENV when APP_ENV is not provided', () => {
        vi.stubEnv('NODE_ENV', 'production');

        expect(resolveAppEnv()).toBe('production');
        expect(process.env.APP_ENV).toBe('production');
    });
});
