import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const articleActionsPath = fromBlogApp(
    'app',
    'articles',
    '[id]',
    '_components',
    'ArticleActions.tsx',
);

describe('ArticleActions data fetching', () => {
    it('does not fetch comment counts on mount anymore', () => {
        const source = readFileSync(articleActionsPath, 'utf8');

        expect(source.includes('/comment?visitorId=')).toBe(false);
    });

    it('accepts server-provided comment count as initial state', () => {
        const source = readFileSync(articleActionsPath, 'utf8');

        expect(source.includes('initialCommentCount')).toBe(true);
    });
});
