import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

vi.mock('@blog/db', () => ({
    prisma: {
        user: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('../../src/config/oauth', () => ({
    getGithubOAuthConfig: vi.fn(() => ({
        clientId: 'github-client',
        clientSecret: 'github-secret',
    })),
}));

vi.mock('../../src/services/auth/profile', () => ({
    getUserRolesAndPermissions: vi.fn(),
}));

vi.mock('../../src/services/auth/session-manager', () => ({
    createLoginResult: vi.fn(),
}));

import axios from 'axios';
import { prisma } from '@blog/db';
import { githubService } from '../../src/services/auth/oauth/github';

describe('oauth error semantics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps github binding conflicts to a validation error', async () => {
        vi.mocked(axios.post).mockResolvedValue({
            data: {
                access_token: 'github-token',
            },
        } as never);

        vi.mocked(axios.get).mockResolvedValue({
            data: {
                id: 9527,
                login: 'octocat',
            },
        } as never);

        vi.mocked(prisma.user.findFirst).mockResolvedValue({
            id: 9,
            githubId: '9527',
        } as never);

        await expect(githubService.bindGithub('1', 'admin', 'code')).rejects.toMatchObject({
            name: 'ValidationError',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: '该GitHub账号已被其他用户绑定',
        });
    });
});
