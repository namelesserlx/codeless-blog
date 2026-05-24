import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
};

const readAllSourceFiles = (dir: string): string[] => {
    const absoluteDir = path.resolve(process.cwd(), dir);
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

    return entries.flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return readAllSourceFiles(entryPath);
        }

        return entry.name.endsWith('.ts') ? [entryPath] : [];
    });
};

describe('shared prisma entrypoint', () => {
    it('server source should not instantiate PrismaClient directly', () => {
        const sourceFiles = readAllSourceFiles('src');

        sourceFiles.forEach((filePath) => {
            const source = readSource(filePath);
            expect(source).not.toContain('new PrismaClient(');
        });
    });

    it('server source should import prisma from @blog/db instead of local lib/prisma', () => {
        const sourceFiles = readAllSourceFiles('src');

        sourceFiles.forEach((filePath) => {
            const source = readSource(filePath);
            expect(source).not.toMatch(/from ['"][^'"]*lib\/prisma['"]/);
        });
    });

    it('server source should not import prisma types directly from @prisma/client', () => {
        const sourceFiles = readAllSourceFiles('src');

        sourceFiles.forEach((filePath) => {
            const source = readSource(filePath);
            expect(source).not.toMatch(/from ['"]@prisma\/client['"]/);
        });
    });
});
