import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const rootLayoutPath = fromBlogApp('app', 'layout.tsx');
const snippetsLayoutPath = fromBlogApp('app', 'snippets', 'layout.tsx');
const globalsCssPath = fromBlogApp('app', 'globals.css');
const layoutClientEffectsPath = fromBlogApp('components', 'layout', 'LayoutClientEffects.tsx');
const navigationPath = fromBlogApp('components', 'header', 'center', 'Navigation.tsx');
const homeBackgroundPath = fromBlogApp('app', '_components', 'home', 'HomeBackground.tsx');
const animatedTitlePath = fromBlogApp('app', '_components', 'home', 'AnimatedTitle.tsx');

describe('lcp optimization contracts', () => {
    it('keeps react-photo-view styles out of the root layout', () => {
        const source = readFileSync(rootLayoutPath, 'utf8');

        expect(source.includes("import 'react-photo-view/dist/react-photo-view.css';")).toBe(false);
    });

    it('scopes react-photo-view styles to the snippets route', () => {
        expect(existsSync(snippetsLayoutPath)).toBe(true);

        const source = readFileSync(snippetsLayoutPath, 'utf8');
        expect(source.includes("import 'react-photo-view/dist/react-photo-view.css';")).toBe(true);
    });

    it('does not keep tags and photos specific animation classes in globals.css', () => {
        const source = readFileSync(globalsCssPath, 'utf8');

        expect(source.includes('.animate-scroll-right')).toBe(false);
        expect(source.includes('.swiper-pagination')).toBe(false);
        expect(source.includes('.modal-overlay-enter')).toBe(false);
    });

    it('defers pwa overlays until after the initial page load', () => {
        const source = readFileSync(layoutClientEffectsPath, 'utf8');

        expect(source.includes('requestIdleCallback')).toBe(true);
        expect(source.includes('showDeferredPwaUi')).toBe(true);
    });

    it('measures the navigation slider after paint instead of useLayoutEffect', () => {
        const source = readFileSync(navigationPath, 'utf8');

        expect(source.includes('React.useLayoutEffect')).toBe(false);
        expect(source.includes('React.useEffect')).toBe(true);
    });

    it('removes the heaviest blurred hero background layers', () => {
        const source = readFileSync(homeBackgroundPath, 'utf8');

        expect(source.includes('blur-[120px]')).toBe(false);
        expect(source.includes('blur-[100px]')).toBe(false);
    });

    it('keeps the animated title lightweight on first paint', () => {
        const source = readFileSync(animatedTitlePath, 'utf8');

        expect(source.includes('requestIdleCallback')).toBe(true);
        expect(source.includes('setAnimationStarted(true)')).toBe(true);
    });
});
