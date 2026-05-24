import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const layoutClientEffectsPath = fromBlogApp('components', 'layout', 'LayoutClientEffects.tsx');
const pwaProviderPath = fromBlogApp('app', '_features', 'pwa', 'client', 'PwaProvider.tsx');
const pwaActionsPath = fromBlogApp('app', '_features', 'pwa', 'client', 'PwaActions.tsx');
const userActionPath = fromBlogApp('components', 'actions', 'user', 'UserAction.tsx');
const serviceWorkerPath = fromBlogApp('public', 'sw.js');
const nextConfigPath = fromBlogApp('next.config.ts');
const packageJsonPath = fromBlogApp('package.json');
const dockerfilePath = fromBlogApp('Dockerfile');

describe('pwa push removal contracts', () => {
    it('does not expose browser push notification subscription UI', () => {
        const sources = [
            readFileSync(layoutClientEffectsPath, 'utf8'),
            readFileSync(pwaProviderPath, 'utf8'),
            readFileSync(pwaActionsPath, 'utf8'),
            readFileSync(userActionPath, 'utf8'),
        ].join('\n');

        expect(sources).not.toContain('PushNotificationManager');
        expect(sources).not.toContain('handleNotificationToggle');
        expect(sources).not.toContain('Notification.requestPermission');
        expect(sources).not.toContain('PushManager');
        expect(sources).not.toContain('开启通知');
        expect(sources).not.toContain('订阅通知');
    });

    it('does not keep service worker or VAPID dependencies', () => {
        const nextConfigSource = readFileSync(nextConfigPath, 'utf8');
        const packageJsonSource = readFileSync(packageJsonPath, 'utf8');
        const dockerfileSource = readFileSync(dockerfilePath, 'utf8');

        expect(existsSync(serviceWorkerPath)).toBe(false);
        expect(nextConfigSource).not.toContain("source: '/sw.js'");
        expect(packageJsonSource).not.toContain('web-push');
        expect(dockerfileSource).not.toContain('VAPID');
    });

    it('removes push-only modules', () => {
        expect(
            existsSync(
                fromBlogApp('app', '_features', 'pwa', 'client', 'PushNotificationManager.tsx'),
            ),
        ).toBe(false);
        expect(
            existsSync(fromBlogApp('app', '_features', 'pwa', 'server', 'push-actions.ts')),
        ).toBe(false);
        expect(existsSync(fromBlogApp('config', 'services', 'push.ts'))).toBe(false);
    });
});
