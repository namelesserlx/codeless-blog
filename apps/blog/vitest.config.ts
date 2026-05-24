import path from 'node:path';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname),
            '@blog/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
        },
    },
    test: {
        environment: 'node',
    },
});
