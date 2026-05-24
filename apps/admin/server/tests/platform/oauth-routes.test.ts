import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/controllers/auth', () => ({
    githubOAuthController: {
        bindGithub: vi.fn(),
        unbindGithub: vi.fn(),
        githubLogin: vi.fn(),
        githubAuthorize: vi.fn(),
        githubCallback: vi.fn(),
        githubStatus: vi.fn(),
    },
    googleOAuthController: {
        bindGoogle: vi.fn(),
        unbindGoogle: vi.fn(),
        googleLogin: vi.fn(),
        googleAuthorize: vi.fn(),
        googleCallback: vi.fn(),
        googleStatus: vi.fn(),
    },
}));

function getRouteSignatures(router: { stack: Array<{ methods: string[]; path: string }> }) {
    return router.stack
        .map((layer) => ({
            methods: layer.methods.filter((method) => method !== 'HEAD'),
            path: layer.path,
        }))
        .sort((left, right) => left.path.localeCompare(right.path));
}

describe('oauth route surface', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('only keeps the github login and account-binding endpoints', async () => {
        const { authGithubRouter } = await import('../../src/routes/auth/oauth/github');
        expect(getRouteSignatures(authGithubRouter)).toEqual([
            { methods: ['POST'], path: '/oauth/github/bind' },
            { methods: ['POST'], path: '/oauth/github/login' },
            { methods: ['POST'], path: '/oauth/github/unbind' },
        ]);
    });

    it('only keeps the google login and account-binding endpoints', async () => {
        const { authGoogleRouter } = await import('../../src/routes/auth/oauth/google');
        expect(getRouteSignatures(authGoogleRouter)).toEqual([
            { methods: ['POST'], path: '/oauth/google/bind' },
            { methods: ['POST'], path: '/oauth/google/login' },
            { methods: ['POST'], path: '/oauth/google/unbind' },
        ]);
    });
});
