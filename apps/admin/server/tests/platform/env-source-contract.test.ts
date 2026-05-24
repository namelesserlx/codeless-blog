import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = path.resolve(__dirname, '../../src');

function collectTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            return collectTsFiles(fullPath);
        }

        return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
    });
}

describe('server env source contract', () => {
    it('only reads process.env from bootstrap/load-env and config/env', () => {
        const allowed = new Set([
            path.join(srcRoot, 'bootstrap/load-env.ts'),
            path.join(srcRoot, 'config/env.ts'),
        ]);

        const offenders = collectTsFiles(srcRoot)
            .filter((file) => !allowed.has(file))
            .filter((file) => fs.readFileSync(file, 'utf8').includes('process.env'));

        expect(offenders.map((file) => path.relative(srcRoot, file))).toEqual([]);
    });

    it('does not import legacy env helper modules', () => {
        const offenders = collectTsFiles(srcRoot).filter((file) => {
            const source = fs.readFileSync(file, 'utf8');
            return source.includes('config/server-env') || source.includes('config/security');
        });

        expect(offenders.map((file) => path.relative(srcRoot, file))).toEqual([]);
    });

    it('keeps config/env as an eager parsed object without getter or empty-string fallbacks', () => {
        const envSource = fs.readFileSync(path.join(srcRoot, 'config/env.ts'), 'utf8');

        expect(envSource).not.toMatch(/\bget\s+[A-Za-z_$][\w$]*\s*\(/u);
        expect(envSource).not.toContain("?? ''");
        expect(envSource).not.toContain('|| undefined');
        expect(envSource).not.toContain("|| ''");
    });
});
