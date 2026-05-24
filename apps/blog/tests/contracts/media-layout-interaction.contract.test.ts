import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const articleCardSmallPath = fromBlogApp('app', 'articles', '_components', 'ArticleCardSmall.tsx');
const articleListPath = fromBlogApp('app', 'articles', '_components', 'ArticleList.tsx');
const photoModalPath = fromBlogApp('app', 'photos', '_components', 'PhotoModal.tsx');
const snippetMediaGridPath = fromBlogApp('app', 'snippets', '_components', 'SnippetMediaGrid.tsx');

describe('media layout and interaction contracts', () => {
    it('keeps small article cards visually even across paired desktop rows', () => {
        const source = readFileSync(articleCardSmallPath, 'utf8');

        expect(source).toContain('h-full');
        expect(source).toContain('md:items-center');
        expect(source).toContain('min-h-[3.5rem]');
        expect(source).toContain('min-h-[2.75rem]');
        expect(source).toContain('overflow-x-auto');
        expect(source).toContain('flex-nowrap');
        expect(source).toContain('[scrollbar-width:none]');
        expect(source).toContain('[&::-webkit-scrollbar]:hidden');
        expect(source).toContain('category?.map(');
        expect(source).not.toContain('max-w-28');
        expect(source).not.toContain('h-[4.5rem]');
        expect(source).not.toContain('flex-wrap');
        expect(source).not.toContain('content-start');
        expect(source).not.toContain('category?.slice(0, 4)');
    });

    it('does not apply desktop grid column spans as mobile inline styles', () => {
        const source = readFileSync(articleListPath, 'utf8');

        expect(source).not.toContain('gridColumnStyle');
        expect(source).not.toContain('style={gridColumnStyle}');
    });

    it('plays snippet videos inline instead of opening the media preview surface', () => {
        const source = readFileSync(snippetMediaGridPath, 'utf8');

        expect(source).toContain('function InlineSnippetVideo');
        expect(source).toContain('controls');
        expect(source).toContain('object-cover');
        expect(source).not.toContain('object-contain');
        expect(source).not.toContain('if (isVideo && isMobile)');
        expect(source).not.toContain('onClick={() => openPreview(index)}');
    });

    it('keeps the mobile photo detail modal scrollable without leaking scroll to the page', () => {
        const source = readFileSync(photoModalPath, 'utf8');

        expect(source).toContain("document.body.style.position = 'fixed'");
        expect(source).toContain('document.body.style.top = `-${scrollY}px`');
        expect(source).toContain('window.scrollTo(0, scrollY)');
        expect(source).toContain('h-[100dvh]');
        expect(source).toContain('min-h-[100dvh]');
        expect(source).toContain('overflow-y-auto');
        expect(source).toContain('overscroll-contain');
        expect(source).toContain('touch-pan-y');
        expect(source).toContain('[-webkit-overflow-scrolling:touch]');
        expect(source).toContain('flex-1');
        expect(source).toContain('min-h-0');
        expect(source).toContain('shrink-0');
        expect(source).toContain('rounded-t-[30px]');
        expect(source).toContain('border-t border-border/20');
        expect(source).toContain('bg-background px-5 pt-4');
        expect(source).toContain('maxHeight: `calc(100dvh - ${fixedStageSize.height}px)`');
    });
});
