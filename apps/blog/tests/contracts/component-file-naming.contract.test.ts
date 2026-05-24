import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

function getTsxFiles(directoryPath: string) {
    return readdirSync(directoryPath).filter((entry) => entry.endsWith('.tsx'));
}

function isPascalCaseComponentFile(fileName: string) {
    return /^[A-Z][A-Za-z0-9]*\.tsx$/.test(fileName);
}

describe('component file naming', () => {
    it('uses PascalCase for about route private components', () => {
        const files = getTsxFiles(fromBlogApp('app', 'about', '_components'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for home route private components', () => {
        const files = getTsxFiles(fromBlogApp('app', '_components', 'home'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for app shared shell components', () => {
        const files = getTsxFiles(fromBlogApp('app', '_components'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for app providers', () => {
        const files = getTsxFiles(fromBlogApp('app', '_providers'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for photos route private components', () => {
        const files = getTsxFiles(fromBlogApp('app', 'photos', '_components'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for snippets route private components', () => {
        const files = getTsxFiles(fromBlogApp('app', 'snippets', '_components'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for articles route private components', () => {
        const files = getTsxFiles(fromBlogApp('app', 'articles', '_components'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for article detail route private components', () => {
        const files = getTsxFiles(fromBlogApp('app', 'articles', '[id]', '_components'));
        const commentFiles = getTsxFiles(
            fromBlogApp('app', 'articles', '[id]', '_components', 'comments'),
        );

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
        expect(commentFiles.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for search components', () => {
        const files = getTsxFiles(fromBlogApp('components', 'search'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for pwa feature client components', () => {
        const files = getTsxFiles(fromBlogApp('app', '_features', 'pwa', 'client'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for layout components', () => {
        const files = getTsxFiles(fromBlogApp('components', 'layout'));

        expect(files.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for ui and animation components', () => {
        const uiFiles = getTsxFiles(fromBlogApp('components', 'ui'));
        const animationFiles = getTsxFiles(fromBlogApp('components', 'animations'));

        expect(uiFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(animationFiles.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for header components', () => {
        const headerFiles = getTsxFiles(fromBlogApp('components', 'header'));
        const centerFiles = getTsxFiles(fromBlogApp('components', 'header', 'center'));
        const leftFiles = getTsxFiles(fromBlogApp('components', 'header', 'left'));
        const rightFiles = getTsxFiles(fromBlogApp('components', 'header', 'right'));
        const mobileFiles = getTsxFiles(fromBlogApp('components', 'header', 'right', 'mobile'));
        const padFiles = getTsxFiles(fromBlogApp('components', 'header', 'right', 'pad'));
        const pcFiles = getTsxFiles(fromBlogApp('components', 'header', 'right', 'pc'));

        expect(headerFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(centerFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(leftFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(rightFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(mobileFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(padFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(pcFiles.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for login and action components', () => {
        const loginFiles = getTsxFiles(fromBlogApp('components', 'login'));
        const actionUserFiles = getTsxFiles(fromBlogApp('components', 'actions', 'user'));
        const actionGithubFiles = getTsxFiles(fromBlogApp('components', 'actions', 'github'));
        const themeFiles = getTsxFiles(fromBlogApp('components', 'theme'));

        expect(loginFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(actionUserFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(actionGithubFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(themeFiles.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses PascalCase for timeline and icon components', () => {
        const timelineFiles = getTsxFiles(fromBlogApp('components', 'timeline'));
        const iconFiles = getTsxFiles(fromBlogApp('components', 'icons'));

        expect(timelineFiles.every(isPascalCaseComponentFile)).toBe(true);
        expect(iconFiles.every(isPascalCaseComponentFile)).toBe(true);
    });

    it('uses kebab-case for general utility modules in lib', () => {
        const libFiles = readdirSync(fromBlogApp('lib', 'shared')).filter((entry) =>
            entry.endsWith('.ts'),
        );

        expect(libFiles.includes('error-handler.ts')).toBe(true);
        expect(libFiles.includes('errorHandler.ts')).toBe(false);
    });

    it('keeps shared main shell minimal after route-private extraction', () => {
        const mainFiles = getTsxFiles(fromBlogApp('components', 'main'));

        expect(mainFiles).toEqual(['Main.tsx']);
    });
});
