import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const nextConfigPath = fromBlogApp('next.config.ts');
const photoModalPath = fromBlogApp('app', 'photos', '_components', 'PhotoModal.tsx');
const mobilePhotoCardPath = fromBlogApp('app', 'photos', '_components', 'MobilePhotoCard.tsx');
const snippetMediaGridPath = fromBlogApp('app', 'snippets', '_components', 'SnippetMediaGrid.tsx');
const timelineNodePath = fromBlogApp('app', 'photos', '_components', 'TimelineNode.tsx');

describe('image loading contracts', () => {
    it('keeps the Next image remote config minimal and deduplicated', () => {
        const source = readFileSync(nextConfigPath, 'utf8');
        const unsplashMatches = source.split("hostname: 'images.unsplash.com'").length - 1;

        expect(source.includes('dangerouslyAllowLocalIP')).toBe(false);
        expect(unsplashMatches).toBe(1);
    });

    it('uses Next 16 preload instead of deprecated priority for key media surfaces', () => {
        const photoModalSource = readFileSync(photoModalPath, 'utf8');
        const mobilePhotoCardSource = readFileSync(mobilePhotoCardPath, 'utf8');
        const snippetMediaGridSource = readFileSync(snippetMediaGridPath, 'utf8');
        const timelineNodeSource = readFileSync(timelineNodePath, 'utf8');

        expect(photoModalSource.includes('priority=')).toBe(false);
        expect(mobilePhotoCardSource.includes('priority=')).toBe(false);
        expect(snippetMediaGridSource.includes('priority=')).toBe(false);
        expect(timelineNodeSource.includes('priority=')).toBe(false);

        expect(photoModalSource.includes('preload=')).toBe(true);
        expect(mobilePhotoCardSource.includes('preload=')).toBe(true);
        expect(snippetMediaGridSource.includes('preload=')).toBe(true);
        expect(timelineNodeSource.includes('preload=')).toBe(true);
    });
});
