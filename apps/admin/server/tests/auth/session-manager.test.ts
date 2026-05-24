import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'koa';
import type { AuthSessionData } from '../../src/types/auth';
import {
    clearAuthSession,
    createLoginResult,
    readAuthSessionId,
    resolveSessionUser,
    writeAuthSession,
} from '../../src/services/auth/session-manager';
import { addSession } from '../../src/utils/auth';

vi.mock('../../src/utils/auth', () => ({
    addSession: vi.fn(),
    queryKeyValue: vi.fn(),
    refreshSession: vi.fn(),
    updateSessionData: vi.fn(),
}));

const mockedGeoip = vi.hoisted(() => ({
    queryGeoIpAddress: vi.fn(() => new Promise<string>(() => undefined)),
}));

vi.mock('../../src/services/geoip', () => ({
    queryGeoIpAddress: mockedGeoip.queryGeoIpAddress,
}));

const mockedShared = vi.hoisted(() => ({
    generateHash: vi.fn(() => 'session-123'),
    getUserMachineSnapshot: vi.fn(() => ({
        ip: '8.8.8.8',
        address: '查询中',
        browser: 'Chrome 120',
        os: 'macOS 14',
    })),
    queryUserMachine: vi.fn(() => new Promise(() => undefined)),
}));

vi.mock('@blog/shared', () => ({
    generateHash: mockedShared.generateHash,
    getUserMachineSnapshot: mockedShared.getUserMachineSnapshot,
    queryUserMachine: mockedShared.queryUserMachine,
}));

const createMockContext = ({
    sid,
}: {
    sid?: string;
} = {}): Context => {
    return {
        cookies: {
            get: (name: string) => (name === 'sid' ? sid : undefined),
            set: vi.fn(),
        },
    } as unknown as Context;
};

describe('session-manager', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'unit-test-secret';
        vi.clearAllMocks();
    });

    it('should prefer sid cookie when reading auth session id', () => {
        const ctx = createMockContext({
            sid: 'sid-cookie',
        });

        expect(readAuthSessionId(ctx)).toBe('sid-cookie');
    });

    it('should return null when sid cookie is missing', () => {
        const ctx = createMockContext();

        expect(readAuthSessionId(ctx)).toBeNull();
    });

    it('should write the auth session id into sid cookie', () => {
        const ctx = createMockContext();

        writeAuthSession(ctx, 'session-123');

        expect(ctx.cookies.set).toHaveBeenCalledWith(
            'sid',
            'session-123',
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
            }),
        );
    });

    it('should clear the sid cookie when auth session is removed', () => {
        const ctx = createMockContext();

        clearAuthSession(ctx);

        expect(ctx.cookies.set).toHaveBeenCalledWith(
            'sid',
            '',
            expect.objectContaining({
                maxAge: 0,
            }),
        );
    });

    it('should resolve session user from normalized session data', () => {
        expect(
            resolveSessionUser({
                userId: 7,
                username: 'tester',
            }),
        ).toEqual({
            id: 7,
            username: 'tester',
        });
    });

    it('should reject sessions that do not contain normalized user data', () => {
        expect(resolveSessionUser(null)).toBeNull();
        expect(resolveSessionUser({} as AuthSessionData)).toBeNull();
    });

    it('should create login result without waiting for address lookup', async () => {
        const ctx = {
            request: {
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                },
                ip: '8.8.8.8',
            },
            cookies: {
                set: vi.fn(),
            },
            state: {},
        } as unknown as Context;

        const resultPromise = createLoginResult({
            ctx,
            user: {
                id: 7,
                username: 'tester',
                email: 'tester@example.com',
                roles: [],
                permissions: [],
            },
            roleCodes: ['admin'],
        });

        const result = await Promise.race([
            resultPromise,
            new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 20)),
        ]);

        expect(result).not.toBe('timeout');
        expect(addSession).toHaveBeenCalledWith(
            'session-123',
            expect.objectContaining({
                userId: 7,
                username: 'tester',
                address: '查询中',
            }),
            expect.any(Number),
        );
        expect(mockedShared.queryUserMachine).not.toHaveBeenCalled();
    });
});
