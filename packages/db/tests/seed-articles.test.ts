import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface SeedArticle {
    title: string;
    content: {
        type: string;
        content: unknown[];
    };
}

const packageRoot = path.resolve(__dirname, '..');

function readSeedArticles(): SeedArticle[] {
    return JSON.parse(
        fs.readFileSync(path.join(packageRoot, 'prisma/seed-data/articles.json'), 'utf8'),
    ) as SeedArticle[];
}

describe('seed article fixtures', () => {
    it('stores initial article content as Tiptap JSON documents', () => {
        const articles = readSeedArticles();

        expect(articles).toHaveLength(4);
        articles.forEach((article) => {
            expect(article.content.type).toBe('doc');
            expect(Array.isArray(article.content.content)).toBe(true);
            expect(JSON.parse(JSON.stringify(article.content))).toMatchObject({
                type: 'doc',
                content: expect.any(Array),
            });
        });
    });

    it('keeps article fixture content outside the seed script', () => {
        const seedSource = fs.readFileSync(path.join(packageRoot, 'prisma/seed.ts'), 'utf8');

        expect(seedSource).toContain('seed-data/articles.json');
        expect(seedSource).not.toContain('editorJsonContent');
        expect(seedSource).not.toContain('content: `');
    });
});
