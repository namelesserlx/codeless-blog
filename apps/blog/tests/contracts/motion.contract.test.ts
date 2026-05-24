import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const globalsCssPath = fromBlogApp('app', 'globals.css');
const particlesPath = fromBlogApp('app', 'about', '_components', 'Particles.tsx');
const fadeInStylesPath = fromBlogApp('components', 'animations', 'fade-in-section.module.css');
const themeToggleStylesPath = fromBlogApp('components', 'theme', 'theme-toggle.module.css');
const typewriterStylesPath = fromBlogApp(
    'app',
    '_components',
    'home',
    'typewriter-effect.module.css',
);

describe('motion contracts', () => {
    it('adds a reduced motion escape hatch to global styles', () => {
        const source = readFileSync(globalsCssPath, 'utf8');

        expect(source.includes('@media (prefers-reduced-motion: reduce)')).toBe(true);
        expect(source.includes('transition: all')).toBe(false);
    });

    it('disables decorative particles animation when the user prefers reduced motion', () => {
        const source = readFileSync(particlesPath, 'utf8');

        expect(source.includes('prefers-reduced-motion: reduce')).toBe(true);
        expect(source.includes('renderStaticParticles')).toBe(true);
    });

    it('adds reduced motion fallbacks to animated component styles', () => {
        const fadeInSource = readFileSync(fadeInStylesPath, 'utf8');
        const themeToggleSource = readFileSync(themeToggleStylesPath, 'utf8');
        const typewriterSource = readFileSync(typewriterStylesPath, 'utf8');

        expect(fadeInSource.includes('@media (prefers-reduced-motion: reduce)')).toBe(true);
        expect(themeToggleSource.includes('@media (prefers-reduced-motion: reduce)')).toBe(true);
        expect(typewriterSource.includes('@media (prefers-reduced-motion: reduce)')).toBe(true);
    });
});
