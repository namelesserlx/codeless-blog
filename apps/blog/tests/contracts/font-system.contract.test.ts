import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const appLayoutPath = fromBlogApp('app', 'layout.tsx');
const globalsCssPath = fromBlogApp('app', 'globals.css');
const heroSectionPath = fromBlogApp('app', '_components', 'home', 'HeroSection.tsx');

describe('font system', () => {
    it('applies the next/font variable in the root layout', () => {
        const source = readFileSync(appLayoutPath, 'utf8');

        expect(source.includes('ibmPlexSans.variable')).toBe(true);
    });

    it('does not duplicate local font definitions in globals.css', () => {
        const source = readFileSync(globalsCssPath, 'utf8');

        expect(source.includes('@font-face')).toBe(false);
    });

    it('declares the app font stack from the next/font CSS variable', () => {
        const source = readFileSync(globalsCssPath, 'utf8');

        expect(source.includes('var(--font-ibm-plex-sans)')).toBe(true);
    });

    it('does not reference an unloaded hero font', () => {
        const source = readFileSync(heroSectionPath, 'utf8');

        expect(source.includes('font-[Alfa_Slab_One]')).toBe(false);
    });
});
