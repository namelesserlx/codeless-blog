import { defineConfig, env } from 'prisma/config';
import { loadWorkspaceEnv, resolveNodeEnv } from '@blog/shared/env';

function loadPrismaEnvironment() {
    resolveNodeEnv();
    loadWorkspaceEnv({
        appDir: __dirname,
    });
}

loadPrismaEnvironment();

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});
