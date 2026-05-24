import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const dbSourcePath = fromBlogApp('lib', 'server', 'db.ts');

function readGetPublishedArticlesSource() {
    const source = readFileSync(dbSourcePath, 'utf8');
    const start = source.indexOf('export async function getPublishedArticles');
    const end = source.indexOf('/**\n * 获取已发布文章的总数', start);

    return source.slice(start, end);
}

describe('article list payload contract', () => {
    it('does not fetch full post content for published article lists', () => {
        const source = readGetPublishedArticlesSource();

        expect(source).toContain(
            'prisma.post.findMany({\n        where: buildPublishedPostWhere(tagName),\n        select: {',
        );
        expect(source).not.toContain('\n        include: {');
        expect(source).not.toContain('content: true');
    });
});
