import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const controllerFiles = [
    {
        path: 'src/controllers/auth/oauth/github.ts',
        expectedRouteMethods: 3,
    },
    {
        path: 'src/controllers/auth/oauth/google.ts',
        expectedRouteMethods: 3,
    },
] as const;

const serviceFiles = [
    {
        path: 'src/services/auth/login.ts',
        expectedPublicMethods: 21,
    },
    {
        path: 'src/services/blog/article/index.ts',
        expectedPublicMethods: 26,
    },
    {
        path: 'src/services/blog/photo/index.ts',
        expectedPublicMethods: 8,
    },
    {
        path: 'src/services/blog/comment/index.ts',
        expectedPublicMethods: 7,
    },
    {
        path: 'src/services/blog/snippet/index.ts',
        expectedPublicMethods: 5,
    },
    {
        path: 'src/services/email/notification.ts',
        expectedPublicMethods: 8,
    },
    {
        path: 'src/services/search/article.ts',
        expectedPublicMethods: 6,
    },
    {
        path: 'src/services/system/permission/index.ts',
        expectedPublicMethods: 10,
    },
    {
        path: 'src/services/system/role/index.ts',
        expectedPublicMethods: 13,
    },
    {
        path: 'src/services/global/index.ts',
        expectedPublicMethods: 7,
    },
] as const;

function readSource(relativePath: string) {
    return readFileSync(resolve(__dirname, '../../', relativePath), 'utf8');
}

describe('decorator coverage guardrails', () => {
    it('keeps controller route handlers wrapped with ControllerErrorHandler', () => {
        for (const file of controllerFiles) {
            const source = readSource(file.path);
            const routeCount = (source.match(/@request\(/g) || []).length;
            const decoratorCount = (source.match(/@ControllerErrorHandler/g) || []).length;

            expect(routeCount, `${file.path} route count drifted`).toBe(file.expectedRouteMethods);
            expect(decoratorCount, `${file.path} should decorate every route handler`).toBe(
                file.expectedRouteMethods,
            );
        }
    });

    it('keeps core business services wrapped with ServiceErrorHandler', () => {
        for (const file of serviceFiles) {
            const source = readSource(file.path);
            const publicAsyncMethodCount = (source.match(/^\s+async [a-zA-Z0-9_]+\(/gm) || [])
                .length;
            const decoratorCount = (source.match(/@ServiceErrorHandler/g) || []).length;

            expect(publicAsyncMethodCount, `${file.path} public async method count drifted`).toBe(
                file.expectedPublicMethods,
            );
            expect(
                decoratorCount,
                `${file.path} should decorate every public async service entry`,
            ).toBe(file.expectedPublicMethods);
        }
    });
});
