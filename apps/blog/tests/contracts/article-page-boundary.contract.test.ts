import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const componentsDir = fromBlogApp('app', 'articles', '[id]', '_components');

function readComponentFile(fileName: string) {
    return readFileSync(path.join(componentsDir, fileName), 'utf8');
}

describe('article page component boundaries', () => {
    it('keeps ArticlePageShell server-first', () => {
        const source = readComponentFile('ArticlePageShell.tsx');

        expect(source.startsWith("'use client';")).toBe(false);
    });

    it('moves article chrome interactions into a dedicated client component', () => {
        const clientChromePath = path.join(componentsDir, 'ArticleInteractiveChrome.tsx');

        expect(existsSync(clientChromePath)).toBe(true);
        expect(readFileSync(clientChromePath, 'utf8').startsWith("'use client';")).toBe(true);
    });
});
