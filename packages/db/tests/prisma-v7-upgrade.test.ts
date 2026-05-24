import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(__dirname, '..');

const readFile = (relativePath: string) => {
    return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
};

const readJson = <T>(relativePath: string): T => {
    return JSON.parse(readFile(relativePath)) as T;
};

describe('prisma v7 upgrade baseline', () => {
    it('schema should use prisma-client generator with explicit output', () => {
        const schema = readFile('prisma/schema.prisma');

        expect(schema).toMatch(/provider\s*=\s*"prisma-client"/);
        expect(schema).toMatch(/output\s*=\s*".+"/);
        expect(schema).toMatch(/moduleFormat\s*=\s*"cjs"/);
    });

    it('db package should use prisma.config.ts instead of package.json prisma.seed', () => {
        const packageJson = readJson<Record<string, unknown>>('package.json');

        expect(fs.existsSync(path.join(packageRoot, 'prisma.config.ts'))).toBe(true);
        expect(packageJson.prisma).toBeUndefined();
    });

    it('db build should generate prisma client before compiling', () => {
        const packageJson = readJson<{ scripts?: Record<string, string> }>('package.json');

        expect(packageJson.scripts?.build ?? '').toMatch(/db:generate|prisma generate/);
    });

    it('db entrypoint should use generated client and Prisma 7 adapter', () => {
        const source = readFile('index.ts');

        expect(source).toMatch(/@prisma\/adapter-mariadb/);
        expect(source).toMatch(/\.\/generated\/prisma\/client/);
        expect(source).toMatch(/new PrismaClient\(\{\s*adapter:/);
    });
});
